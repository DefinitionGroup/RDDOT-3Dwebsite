# Map assets (ADR 0014)

Served by the application itself, so the Dealer Directory's map talks to no third party.

- `maplibre-gl-worker-<version>.mjs`: MapLibre GL JS's web worker (BSD-3-Clause), copied from
  `node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs`. The bundler cannot serve it from the
  package, so it is vendored; `features/dealers/ui/map-assets.test.ts` fails when its version
  drifts from `package.json`.
- `fonts/`: Noto Sans glyph ranges (SIL Open Font License, `fonts/OFL.txt`) from
  `protomaps/basemaps-assets`, the fonts the Protomaps basemap style names.

The tiles are not here: `/api/map/tiles` reads a PMTiles archive of OpenStreetMap data
(ODbL, © OpenStreetMap contributors) from `MAP_TILES_FILE` or EU object storage.
