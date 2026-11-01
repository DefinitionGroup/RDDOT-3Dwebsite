# Share dialog, map and Dealer Workspace

Status: resolved
Type: task
Blocked by: 05

## Scope

- Project menu and card on `/konto`; the share dialog with map, search and list; the
  disclosure of the customer's contact; revoke.
- Self-hosted PMTiles behind `/api/map/tiles`, MapLibre with the Protomaps black
  flavour, self-hosted glyphs, a fallback without tiles.
- `/haendler` workspace; the configurator and the Anfrage in dealer mode.
- German, English, Spanish.

## Comments
- 2026-10-30: the map is a Germany extract of the Protomaps build of 2026-10-29 at zoom
  0–10 (187 MB, `.data/map/`; zoom 11 would be 431 MB), held to its bounds from zoom 5 so
  the world's low-zoom labels, in scripts the self-hosted Latin glyphs lack, stay out of
  view. MapLibre's worker is vendored in `public/map/` (the bundler cannot serve it from
  the package). Without tiles (204 from `/api/map/tiles`) or without WebGL the dialog says
  so and the list carries on. Checked in headless Chrome on the GPU at 1440 and 390 px:
  the map draws, the nearest dealers frame it, a chosen dealer is followed; a dealer's
  front change redraws the kitchen and autosaves through the grant.
