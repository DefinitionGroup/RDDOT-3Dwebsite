# The configurator's room prefetch

Status: ready-for-agent
Audit: P3

## Scope

`features/configurator/ui/configurator-shell.tsx` calls `preloadApartmentRoom()` and
`preloadLoftRoom()` 1.2 s after the configurator opens: 1.97 MB of models and 3.41 MB of
Loft outlooks (`/hdri/potsdamer-platz.jpg`, `/hdri/johannesburg-skyline.jpg`), whether or
not anyone switches rooms, and on a slow connection while the kitchen's own textures are
still loading. Prefetch a room on intent instead (pointer over, focus on or touch of its
segment in the view control), and the Loft's outlooks only once the Loft is chosen; keep
an idle prefetch only on a fast connection without Save-Data, after the scene has drawn.

## Done when

Opening `/configure` and staying in the Studio loads no room model and no outlook; a room
still opens without a visible wait on a desktop connection; the configurator's first 15 s
stay under 6 MB.
