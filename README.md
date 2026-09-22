# Haunt Map 2026

Interactive map of haunted attractions within about an hour's drive of ZIP 19805 (Wilmington, DE) for the 2026 season, plus a few "worth the drive" haunts such as Field of Screams.

Static site: no build step, no dependencies to install. Leaflet is loaded from a CDN.

## Run locally

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

(Opening `index.html` directly from disk also works.)

## Files

- `index.html` / `styles.css` / `app.js` - the map UI: search, max-drive slider, scare-level chips, "open this weekend" filter, sorting, a details panel per haunt, a "Plan a night" multi-stop route (opens in Google Maps) and shareable URLs (all state lives in the `#hash`).
- `haunts.js` - the data (20 haunts). Each entry has a routed drive time and distance from 19805 (`driveMin`, `miles` - typical OSRM route, no traffic), a scare level (`extreme | scary | moderate | family`), a `season` date range used by the weekend filter, and the 2026 dates/prices as published in September 2026. Entries with `coordsApprox: true` were pinned from the road/town rather than an exact geocode.

## Deploy

Pushes to `main` publish to GitHub Pages via `.github/workflows/pages.yml`
(Settings -> Pages -> Source must be set to "GitHub Actions").

## Adding a haunt

Append an object to `window.HAUNTS` in `haunts.js` (copy an existing entry; `id` must be unique). Dates and prices change every season - confirm on the attraction's own site before you go.
