(function () {
  "use strict";
  const HOME = window.HOME;
  const HAUNTS = window.HAUNTS;
  const SCARE_RANK = { extreme: 4, scary: 3, moderate: 2, family: 1 };
  const SCARE_LABEL = { extreme: "Extreme", scary: "Scary", moderate: "Moderate", family: "Family-friendly" };
  const $ = (id) => document.getElementById(id);

  // ---------- state (mirrored into the URL hash so views are shareable) ----------
  const state = {
    q: "",
    maxDrive: 60,
    scares: new Set(["extreme", "scary", "moderate", "family"]),
    weekend: false,
    sort: "drive",
    active: null,
    plan: [],
  };

  function readHash() {
    const p = new URLSearchParams(location.hash.slice(1));
    if (p.has("q")) state.q = p.get("q");
    if (p.has("drive")) state.maxDrive = clamp(Number(p.get("drive")) || 60, 15, 90);
    if (p.has("scare")) state.scares = new Set(p.get("scare").split(",").filter((s) => SCARE_RANK[s]));
    if (p.has("weekend")) state.weekend = p.get("weekend") === "1";
    if (p.has("sort") && ["drive", "name", "scare"].includes(p.get("sort"))) state.sort = p.get("sort");
    if (p.has("plan")) state.plan = p.get("plan").split(",").filter((id) => HAUNTS.some((h) => h.id === id));
    if (p.has("h") && HAUNTS.some((h) => h.id === p.get("h"))) state.active = p.get("h");
  }
  function writeHash() {
    const p = new URLSearchParams();
    if (state.q) p.set("q", state.q);
    if (state.maxDrive !== 60) p.set("drive", state.maxDrive);
    if (state.scares.size !== 4) p.set("scare", [...state.scares].join(","));
    if (state.weekend) p.set("weekend", "1");
    if (state.sort !== "drive") p.set("sort", state.sort);
    if (state.plan.length) p.set("plan", state.plan.join(","));
    if (state.active) p.set("h", state.active);
    const s = p.toString();
    history.replaceState(null, "", s ? "#" + s : location.pathname);
  }
  function clamp(n, a, b) { return Math.min(b, Math.max(a, n)); }

  // ---------- helpers ----------
  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function directionsUrl(h) {
    return "https://www.google.com/maps/dir/?api=1&origin=19805&destination=" + encodeURIComponent(h.address);
  }
  function driveText(h) { return "~" + h.driveMin + " min · " + h.miles + " mi"; }
  function byId(id) { return HAUNTS.find((h) => h.id === id); }

  // next Fri-Sun window relative to "now" (season check only; nightly schedules vary)
  function weekendWindow() {
    const now = new Date();
    const day = now.getDay(); // 0 Sun .. 6 Sat
    const offset = day === 6 ? -1 : day === 0 ? -2 : (5 - day + 7) % 7;
    const fri = new Date(now); fri.setHours(0, 0, 0, 0);
    fri.setDate(now.getDate() + offset);
    const sun = new Date(fri); sun.setDate(fri.getDate() + 2); sun.setHours(23, 59, 59, 999);
    return [fri, sun];
  }
  function openThisWeekend(h) {
    if (!h.season) return true;
    const [fri, sun] = weekendWindow();
    const start = new Date(h.season[0] + "T00:00:00");
    const end = new Date(h.season[1] + "T23:59:59");
    return start <= sun && end >= fri;
  }
  function seasonStatus(h) {
    if (!h.season) return null;
    const now = new Date();
    const start = new Date(h.season[0] + "T00:00:00");
    const end = new Date(h.season[1] + "T23:59:59");
    if (now < start) {
      const d = Math.ceil((start - now) / 864e5);
      return { cls: "soon", text: d <= 1 ? "opens tomorrow" : "opens in " + d + " days" };
    }
    if (now > end) return { cls: "closed", text: "season over" };
    return { cls: "open", text: "open now" };
  }

  // ---------- map ----------
  const map = L.map("map", { zoomControl: false, attributionControl: true }).setView([39.85, -75.45], 9);
  L.control.zoom({ position: "bottomright" }).addTo(map);

  L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}", {
    maxZoom: 16, attribution: "Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ",
  }).addTo(map);
  L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}", {
    maxZoom: 16, pane: "shadowPane", opacity: 0.9,
  }).addTo(map);

  // drive-time rings: very rough straight-line equivalents of 30 / 60 min on these roads
  [[30, 36000], [60, 72000]].forEach(([min, r]) => {
    L.circle([HOME.lat, HOME.lng], {
      radius: r, color: "#ff7a1a", weight: 1, opacity: 0.55, dashArray: "6 8", fillColor: "#ff7a1a", fillOpacity: 0.025, interactive: false,
    }).addTo(map);
    L.marker([HOME.lat + r / 111320, HOME.lng], {
      icon: L.divIcon({ className: "ring-label", html: "~" + min + " min", iconSize: [64, 18], iconAnchor: [32, 9] }),
      interactive: false,
    }).addTo(map);
  });

  L.marker([HOME.lat, HOME.lng], {
    icon: L.divIcon({ className: "", html: '<div class="home-pin"><span></span></div>', iconSize: [22, 22], iconAnchor: [11, 11] }),
    zIndexOffset: 900, interactive: true,
  }).addTo(map).bindTooltip("Home · 19805", { direction: "top", offset: [0, -10] });

  const legend = L.control({ position: "topright" });
  legend.onAdd = function () {
    const div = L.DomUtil.create("div", "legend");
    div.innerHTML =
      "<b>Scare level</b>" +
      Object.keys(SCARE_RANK).map((s) => '<span><i class="dot ' + s + '"></i>' + SCARE_LABEL[s] + "</span>").join("") +
      '<span><i class="dot star"></i>Requested (Field of Screams)</span>' +
      '<span><i class="dot home"></i>Home · 19805</span>';
    return div;
  };
  legend.addTo(map);

  const markers = {};
  function pinHtml(h) {
    return '<div class="pin ' + h.scare + (h.featured ? " featured" : "") + '">' +
      '<svg viewBox="0 0 24 34" aria-hidden="true"><path d="M12 33s10-11.5 10-20A10 10 0 0 0 2 13c0 8.5 10 20 10 20z"/></svg>' +
      '<span class="pin-glyph">' + (h.featured ? "&#9733;" : "") + "</span></div>";
  }
  HAUNTS.forEach((h) => {
    const m = L.marker([h.lat, h.lng], {
      icon: L.divIcon({ className: "pin-wrap", html: pinHtml(h), iconSize: [30, 42], iconAnchor: [15, 40], tooltipAnchor: [0, -36] }),
      title: h.name, riseOnHover: true, zIndexOffset: h.featured ? 500 : 0,
    });
    m.bindTooltip('<b>' + esc(h.name) + "</b><br>" + driveText(h), { direction: "top", className: "pin-tip", opacity: 1 });
    m.on("click", () => setActive(h.id, { fly: false }));
    m.on("mouseover", () => highlightCard(h.id, true));
    m.on("mouseout", () => highlightCard(h.id, false));
    markers[h.id] = m;
  });

  // ---------- filtering / rendering ----------
  function visible() {
    const q = state.q.trim().toLowerCase();
    return HAUNTS.filter((h) => {
      if (h.driveMin > state.maxDrive && !(h.featured && state.maxDrive >= 60)) return false;
      if (!state.scares.has(h.scare)) return false;
      if (state.weekend && !openThisWeekend(h)) return false;
      if (q) {
        const hay = [h.name, h.city, h.address, h.type, h.blurb, SCARE_LABEL[h.scare]].join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    }).sort((a, b) => {
      if (state.sort === "name") return a.name.localeCompare(b.name);
      if (state.sort === "scare") return SCARE_RANK[b.scare] - SCARE_RANK[a.scare] || a.driveMin - b.driveMin;
      return a.driveMin - b.driveMin || a.name.localeCompare(b.name);
    });
  }

  const list = $("list");
  function cardHtml(h) {
    const st = seasonStatus(h);
    const inPlan = state.plan.includes(h.id);
    return (
      '<div class="card-top">' +
        '<div class="card-title">' + (h.featured ? '<span class="star" title="Requested">&#9733;</span>' : "") + esc(h.name) + "</div>" +
        '<span class="drive-pill">' + h.driveMin + "<small>min</small></span>" +
      "</div>" +
      '<div class="card-meta">' +
        '<span class="tag ' + h.scare + '">' + SCARE_LABEL[h.scare] + "</span>" +
        "<span>" + esc(h.city) + "</span>" +
        (st ? '<span class="status ' + st.cls + '">' + st.text + "</span>" : "") +
      "</div>" +
      '<div class="card-type">' + esc(h.type) + "</div>" +
      '<div class="card-dates">' + esc(h.dates) + "</div>" +
      '<div class="card-actions">' +
        '<button type="button" class="mini plan-btn' + (inPlan ? " in" : "") + '" data-plan="' + h.id + '">' + (inPlan ? "&#10003; In your night" : "+ Add to night") + "</button>" +
        '<a class="mini" href="' + esc(h.url) + '" target="_blank" rel="noopener" data-stop>Website</a>' +
        '<a class="mini" href="' + esc(directionsUrl(h)) + '" target="_blank" rel="noopener" data-stop>Directions</a>' +
      "</div>"
    );
  }

  function render() {
    const vis = visible();
    const ids = new Set(vis.map((h) => h.id));
    HAUNTS.forEach((h) => {
      const m = markers[h.id];
      if (ids.has(h.id)) { if (!map.hasLayer(m)) m.addTo(map); }
      else if (map.hasLayer(m)) map.removeLayer(m);
      m.getElement() && m.getElement().classList.toggle("active", state.active === h.id);
    });

    list.innerHTML = "";
    if (!vis.length) {
      list.innerHTML = '<li class="empty"><b>Nothing matches.</b><br>Widen the drive time, turn scare levels back on, or clear the search.</li>';
    }
    vis.forEach((h) => {
      const li = document.createElement("li");
      li.className = "card " + h.scare + (state.active === h.id ? " active" : "") + (h.featured ? " featured" : "");
      li.dataset.id = h.id;
      li.tabIndex = 0;
      li.innerHTML = cardHtml(h);
      li.addEventListener("click", (e) => {
        if (e.target.closest("[data-stop]")) return;
        const pb = e.target.closest("[data-plan]");
        if (pb) { togglePlan(pb.dataset.plan); return; }
        setActive(h.id, { fly: true });
      });
      li.addEventListener("keydown", (e) => { if (e.key === "Enter") setActive(h.id, { fly: true }); });
      li.addEventListener("mouseenter", () => markers[h.id].getElement() && markers[h.id].getElement().classList.add("hover"));
      li.addEventListener("mouseleave", () => markers[h.id].getElement() && markers[h.id].getElement().classList.remove("hover"));
      list.appendChild(li);
    });

    $("count").textContent = vis.length + " of " + HAUNTS.length + " haunts";
    $("drive-label").textContent = state.maxDrive >= 90 ? "any distance" : state.maxDrive + " min";
    const within = HAUNTS.filter((h) => h.driveMin <= 60).length;
    $("stats").innerHTML =
      "<span><b>" + HAUNTS.length + "</b> haunts</span>" +
      "<span><b>" + within + "</b> within an hour</span>" +
      "<span><b>" + HAUNTS.filter((h) => seasonStatus(h) && seasonStatus(h).cls === "open").length + "</b> open now</span>";
    renderPlan();
    writeHash();
  }

  function highlightCard(id, on) {
    const li = list.querySelector('li[data-id="' + id + '"]');
    if (li) li.classList.toggle("hover", on);
  }

  // ---------- detail panel ----------
  const detail = $("detail");
  function showDetail(h) {
    const st = seasonStatus(h);
    const inPlan = state.plan.includes(h.id);
    detail.innerHTML =
      '<button class="close" id="detail-close" type="button" aria-label="Close">&times;</button>' +
      '<div class="detail-head ' + h.scare + '">' +
        '<span class="tag ' + h.scare + '">' + SCARE_LABEL[h.scare] + "</span>" +
        (h.featured ? '<span class="tag star">&#9733; Requested</span>' : "") +
        (st ? '<span class="status ' + st.cls + '">' + st.text + "</span>" : "") +
        "<h2>" + esc(h.name) + "</h2>" +
        '<div class="detail-sub">' + esc(h.type) + " &middot; " + esc(h.city) + "</div>" +
      "</div>" +
      '<dl class="facts">' +
        "<div><dt>Drive</dt><dd>" + driveText(h) + " from 19805</dd></div>" +
        "<div><dt>Dates</dt><dd>" + esc(h.dates) + "</dd></div>" +
        "<div><dt>Hours</dt><dd>" + esc(h.hours) + "</dd></div>" +
        "<div><dt>Tickets</dt><dd>" + esc(h.price) + "</dd></div>" +
        "<div><dt>Address</dt><dd>" + esc(h.address) + (h.coordsApprox ? ' <span class="approx" title="Pin placed from the road/town, not an exact geocode">pin approx.</span>' : "") + "</dd></div>" +
      "</dl>" +
      "<p>" + esc(h.blurb) + "</p>" +
      '<div class="detail-actions">' +
        '<a class="btn primary" href="' + esc(h.url) + '" target="_blank" rel="noopener">Official site &rarr;</a>' +
        '<a class="btn" href="' + esc(directionsUrl(h)) + '" target="_blank" rel="noopener">Directions</a>' +
        '<button type="button" class="btn' + (inPlan ? " in" : "") + '" data-plan="' + h.id + '">' + (inPlan ? "&#10003; In your night" : "+ Add to night") + "</button>" +
      "</div>";
    detail.hidden = false;
    detail.querySelector("#detail-close").onclick = () => setActive(null);
    detail.querySelector("[data-plan]").onclick = (e) => togglePlan(e.currentTarget.dataset.plan);
  }

  function setActive(id, opts) {
    opts = opts || {};
    state.active = id;
    const h = id ? byId(id) : null;
    list.querySelectorAll("li").forEach((li) => li.classList.toggle("active", li.dataset.id === id));
    Object.keys(markers).forEach((k) => { const el = markers[k].getElement(); if (el) el.classList.toggle("active", k === id); });
    if (!h) { detail.hidden = true; writeHash(); return; }
    const li = list.querySelector('li[data-id="' + id + '"]');
    if (li) li.scrollIntoView({ block: "nearest", behavior: "smooth" });
    showDetail(h);
    if (opts.fly) {
      const target = map.getSize().x > 760 ? [h.lat - 0.02, h.lng] : [h.lat, h.lng];
      map.flyTo(target, Math.max(map.getZoom(), 12), { duration: 0.9 });
    }
    writeHash();
  }

  // ---------- plan a night ----------
  const plan = $("plan");
  function togglePlan(id) {
    const i = state.plan.indexOf(id);
    if (i >= 0) state.plan.splice(i, 1); else state.plan.push(id);
    render();
    if (state.active) showDetail(byId(state.active));
    if (i < 0) { plan.hidden = false; toast(byId(id).name + " added to your night"); }
  }
  function renderPlan() {
    const items = state.plan.map(byId).filter(Boolean);
    $("plan-count").textContent = items.length;
    $("plan-count").classList.toggle("hot", items.length > 0);
    $("plan-empty").hidden = items.length > 0;
    $("plan-go").hidden = $("plan-clear").hidden = items.length === 0;
    const ol = $("plan-list");
    ol.innerHTML = items.map((h, i) =>
      '<li><span class="n">' + (i + 1) + "</span><div><b>" + esc(h.name) + "</b><small>" + esc(h.city) + " · " + driveText(h) + "</small></div>" +
      '<button type="button" class="link" data-rm="' + h.id + '" aria-label="Remove">&times;</button></li>'
    ).join("");
    ol.querySelectorAll("[data-rm]").forEach((b) => b.onclick = () => togglePlan(b.dataset.rm));
    if (items.length) {
      const far = Math.max(...items.map((h) => h.driveMin));
      $("plan-summary").textContent = items.length + " stop" + (items.length > 1 ? "s" : "") + " · farthest ~" + far + " min out";
      const wp = items.slice(0, -1).map((h) => encodeURIComponent(h.address)).join("|");
      $("plan-go").href = "https://www.google.com/maps/dir/?api=1&origin=19805&destination=" +
        encodeURIComponent(items[items.length - 1].address) + (wp ? "&waypoints=" + wp : "") + "&travelmode=driving";
    } else {
      $("plan-summary").textContent = "";
    }
    if (routeLine) { map.removeLayer(routeLine); routeLine = null; }
    if (items.length) {
      routeLine = L.polyline([[HOME.lat, HOME.lng]].concat(items.map((h) => [h.lat, h.lng])), {
        color: "#ff7a1a", weight: 2.5, dashArray: "2 8", opacity: 0.8, interactive: false,
      }).addTo(map);
    }
  }
  let routeLine = null;

  let toastTimer;
  function toast(msg) {
    const t = $("toast");
    t.textContent = msg; t.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 2200);
  }

  // ---------- wire controls ----------
  function fitVisible() {
    const pts = visible().map((h) => [h.lat, h.lng]).concat([[HOME.lat, HOME.lng]]);
    map.fitBounds(L.latLngBounds(pts), { padding: [40, 40], maxZoom: 12 });
  }

  $("search").value = state.q;
  $("search").addEventListener("input", (e) => { state.q = e.target.value; render(); });
  $("drive").value = state.maxDrive;
  $("drive").addEventListener("input", (e) => { state.maxDrive = Number(e.target.value); render(); });
  $("drive").addEventListener("change", fitVisible);
  $("sort").value = state.sort;
  $("sort").addEventListener("change", (e) => { state.sort = e.target.value; render(); });
  $("open-tonight").checked = state.weekend;
  $("open-tonight").addEventListener("change", (e) => { state.weekend = e.target.checked; render(); });
  document.querySelectorAll("#scare-chips .chip").forEach((b) => b.classList.toggle("on", state.scares.has(b.dataset.scare)));
  $("scare-chips").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-scare]");
    if (!b) return;
    const s = b.dataset.scare;
    if (state.scares.has(s)) state.scares.delete(s); else state.scares.add(s);
    b.classList.toggle("on", state.scares.has(s));
    render();
  });
  $("scare-all").addEventListener("click", () => {
    state.scares = new Set(Object.keys(SCARE_RANK));
    document.querySelectorAll("#scare-chips .chip").forEach((b) => b.classList.add("on"));
    render();
  });
  $("plan-toggle").addEventListener("click", () => { plan.hidden = !plan.hidden; });
  $("plan-close").addEventListener("click", () => { plan.hidden = true; });
  $("plan-clear").addEventListener("click", () => { state.plan = []; render(); });
  $("share").addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(location.href); toast("Link copied"); }
    catch (e) { prompt("Copy this link:", location.href); }
  });
  map.on("click", () => { if (state.active) setActive(null); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") { setActive(null); plan.hidden = true; } });

  // ---------- boot ----------
  readHash();
  render();
  fitVisible();
  if (state.active) setActive(state.active, { fly: true });
  if (state.plan.length) plan.hidden = false;
})();
