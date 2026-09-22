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

- `index.html` / `styles.css` / `app.js` - the map UI (filters by drive time, scare level, search; popups with dates, hours, prices, website and directions links)
- `haunts.js` - the data. Each entry has an approximate drive time from 19805 (`driveMin`), a scare level (`extreme | scary | moderate | family`), and the 2026 dates/prices as published in September 2026. Entries with `coordsApprox: true` were pinned from the road/town rather than an exact geocode.

## Deploy

Pushes to `main` publish to GitHub Pages via `.github/workflows/pages.yml`
(Settings -> Pages -> Source must be set to "GitHub Actions").

## Adding a haunt

Append an object to `window.HAUNTS` in `haunts.js`. Dates and prices change every season - confirm on the attraction's own site before you go.
