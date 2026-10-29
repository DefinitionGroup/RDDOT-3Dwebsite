# The configurator's room prefetch

Status: done (2026-10-30)
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

## Done

A room loads on intent: pointer over, focus on or a finger down on its segment
(`GlassSegments` `onIntent`). The Loft loads with the outlook it opens on; the other
outlook loads on intent in the outlook switch. Only where Chromium reports at least 5
Mbit/s and no Save-Data do both rooms (and the Loft's current outlook) load ahead, once
the kitchen's files have loaded and the browser is idle; other browsers do not report the
connection and load on intent. On a local production build: staying in the Studio fetched
no room and no outlook in 20 s on either profile; on an emulated 50 Mbit/s line the rooms
loaded at 1.6 s; the configurator's first 15 s came to 6.75 MB, about 6.0 MB once Vercel
compresses the HDR and the kitchen model as it did in the audit. The rest of the weight is
issue 07.
