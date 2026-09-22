(function () {
  const HOME = window.HOME;
  const HAUNTS = window.HAUNTS;

  const map = L.map("map", { zoomControl: true }).setView([39.85, -75.55], 9);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    className: "basemap",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);

  // ~60 min of driving from 19805 is very roughly a 45-mile radius (72 km) on these roads.
  L.circle([HOME.lat, HOME.lng], {
    radius: 72000, color: "#ff7a1a", weight: 1, dashArray: "6 6", fillOpacity: 0.03,
  }).addTo(map).bindTooltip("~1 hour drive (approx.)", { sticky: true });

  L.marker([HOME.lat, HOME.lng], {
    icon: L.divIcon({ className: "", html: '<div class="pin home"></div>', iconSize: [16, 16], iconAnchor: [8, 8] }),
    zIndexOffset: 1000,
  }).addTo(map).bindTooltip("Home - 19805");

  const legend = L.control({ position: "bottomright" });
  legend.onAdd = function () {
    const div = L.DomUtil.create("div", "legend");
    div.innerHTML =
      '<i style="background:#d7263d"></i>Extreme<br>' +
      '<i style="background:#ff7a1a"></i>Scary<br>' +
      '<i style="background:#e6b422"></i>Moderate<br>' +
      '<i style="background:#3fb950"></i>Family-friendly<br>' +
      '<i style="background:#fff;border:2px solid #ff7a1a"></i>Home (19805)';
    return div;
  };
  legend.addTo(map);

  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function directionsUrl(h) {
    return "https://www.google.com/maps/dir/?api=1&origin=" + encodeURIComponent("19805") +
      "&destination=" + encodeURIComponent(h.address);
  }

  function popupHtml(h) {
    return (
      '<div class="popup">' +
      "<h3>" + esc(h.name) + (h.featured ? ' <span class="badge">Requested</span>' : "") + "</h3>" +
      '<div class="type">' + esc(h.type) + " &middot; " + esc(h.city) + "</div>" +
      "<dl>" +
      "<dt>Drive</dt><dd>~" + h.driveMin + " min from 19805</dd>" +
      "<dt>Dates</dt><dd>" + esc(h.dates) + "</dd>" +
      "<dt>Hours</dt><dd>" + esc(h.hours) + "</dd>" +
      "<dt>Price</dt><dd>" + esc(h.price) + "</dd>" +
      "<dt>Address</dt><dd>" + esc(h.address) + (h.coordsApprox ? ' <span class="badge">pin approx.</span>' : "") + "</dd>" +
      "</dl>" +
      "<p>" + esc(h.blurb) + "</p>" +
      '<div class="links">' +
      '<a href="' + esc(h.url) + '" target="_blank" rel="noopener">Website &rarr;</a>' +
      '<a href="' + esc(directionsUrl(h)) + '" target="_blank" rel="noopener">Directions &rarr;</a>' +
      "</div></div>"
    );
  }

  const markers = {};
  HAUNTS.forEach((h) => {
    const icon = L.divIcon({
      className: "",
      html: '<div class="pin ' + h.scare + (h.featured ? " featured" : "") + '"></div>',
      iconSize: h.featured ? [22, 22] : [16, 16],
      iconAnchor: h.featured ? [11, 11] : [8, 8],
    });
    const m = L.marker([h.lat, h.lng], { icon, title: h.name });
    m.bindPopup(popupHtml(h), { maxWidth: 320 });
    m.on("click", () => setActive(h.id, false));
    markers[h.id] = m;
  });

  const state = {
    q: "",
    maxDrive: 60,
    scares: new Set(["extreme", "scary", "moderate", "family"]),
    sort: "drive",
    active: null,
  };

  const $ = (id) => document.getElementById(id);
  const list = $("list");

  function visible() {
    const q = state.q.trim().toLowerCase();
    return HAUNTS.filter((h) => {
      if (h.driveMin > state.maxDrive && !(state.maxDrive === 60 && h.featured)) return false;
      if (!state.scares.has(h.scare)) return false;
      if (q && !(h.name + " " + h.city + " " + h.address + " " + h.type).toLowerCase().includes(q)) return false;
      return true;
    }).sort((a, b) =>
      state.sort === "name" ? a.name.localeCompare(b.name) : a.driveMin - b.driveMin || a.name.localeCompare(b.name)
    );
  }

  function render() {
    const vis = visible();
    const ids = new Set(vis.map((h) => h.id));
    HAUNTS.forEach((h) => {
      const m = markers[h.id];
      if (ids.has(h.id)) { if (!map.hasLayer(m)) m.addTo(map); }
      else if (map.hasLayer(m)) map.removeLayer(m);
    });

    list.innerHTML = "";
    if (!vis.length) {
      list.innerHTML = '<li class="empty">No haunts match - widen the drive time or scare filters.</li>';
    }
    vis.forEach((h) => {
      const li = document.createElement("li");
      li.className = h.scare + (state.active === h.id ? " active" : "");
      li.dataset.id = h.id;
      li.innerHTML =
        '<div class="name"><span>' + (h.featured ? '<span class="star">&#9733;</span> ' : "") + esc(h.name) +
        '</span><span class="drive">~' + h.driveMin + " min</span></div>" +
        '<div class="meta">' + esc(h.city) + " &middot; " + esc(h.dates) + "</div>";
      li.addEventListener("click", () => setActive(h.id, true));
      list.appendChild(li);
    });
    $("count").textContent = vis.length + " of " + HAUNTS.length;
  }

  function setActive(id, fly) {
    state.active = id;
    const h = HAUNTS.find((x) => x.id === id);
    list.querySelectorAll("li").forEach((li) => li.classList.toggle("active", li.dataset.id === id));
    const li = list.querySelector('li[data-id="' + id + '"]');
    if (li) li.scrollIntoView({ block: "nearest" });
    if (h && fly) {
      map.flyTo([h.lat, h.lng], Math.max(map.getZoom(), 12), { duration: 0.8 });
      map.once("moveend", () => markers[id].openPopup());
    }
  }

  $("search").addEventListener("input", (e) => { state.q = e.target.value; render(); });
  $("drive").addEventListener("change", (e) => {
    state.maxDrive = Number(e.target.value);
    render();
    const vis = visible();
    if (vis.length) map.fitBounds(L.latLngBounds(vis.map((h) => [h.lat, h.lng]).concat([[HOME.lat, HOME.lng]])), { padding: [30, 30] });
  });
  $("sort").addEventListener("change", (e) => { state.sort = e.target.value; render(); });
  $("scare-chips").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-scare]");
    if (!b) return;
    const s = b.dataset.scare;
    if (state.scares.has(s)) state.scares.delete(s); else state.scares.add(s);
    b.classList.toggle("on", state.scares.has(s));
    render();
  });

  render();
  map.fitBounds(L.latLngBounds(visible().map((h) => [h.lat, h.lng]).concat([[HOME.lat, HOME.lng]])), { padding: [30, 30] });
})();
