# Map assets (ADR 0014)

Served by the application itself, so the Dealer Directory's map talks to no third party.

- `maplibre-gl-worker-<version>.mjs`: MapLibre GL JS's web worker (BSD-3-Clause), copied from
  `node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs`. The bundler cannot serve it from the
  package, so it is vendored; `features/dealers/ui/map-assets.test.ts` fails when its version
  drifts from `package.json`.
- `fonts/`: Noto Sans glyph ranges (SIL Open Font License, `fonts/OFL.txt`) from
  `protomaps/basemaps-assets`, the fonts the Protomaps basemap style names. Only the ranges
  the archive's labels use, in all three weights: Latin (0–511), general punctuation
  (8192–8447), and, found by scanning `germany-z10-20261029` (2026-11-06), Latin Extended-B
  (512–767, "Pitești"), Greek (768–1023, "Ελλάδα"), Cyrillic (1024–1279, "Львів"),
  phonetic extensions (7424–7679, road number "D 166ᴬ") and letterlike symbols (8448–8703,
  "Breschan Ⅱ"). MapLibre fetches glyphs for every label in a loaded tile, also those out
  of view, so a missing range shows as a 404 under `/map/fonts/` in the console and drops
  those characters from labels. A new archive may need more.

The tiles are not here: `/api/map/tiles` reads a PMTiles archive of OpenStreetMap data
(ODbL, © OpenStreetMap contributors) from `MAP_TILES_FILE` or EU object storage.
