# AI Photo Feature — Plan

Turn the live 3D configurator scene into a hyperrealistic "photo" using
`qwen/qwen-image-2-pro` on Replicate, shown in a popover.

## Flow

1. **Photo button** in the camera view bar (Raum / Front / Detail / **Foto**).
2. Popover opens with 4 **scene presets** (chips). User picks one, hits "Foto aufnehmen".
3. Client captures the WebGL canvas (with AO + tone mapping), downscales to
   **1280×720 JPEG** on an offscreen 2D canvas (crop-cover to 16:9, quality
   stepped down until < 250 KB so it fits Replicate's data-URI limit).
4. `POST /api/photo` with `{ image: dataUrl, presetKey, cabinetColorKey, frontColorKey }`.
5. Route builds the prompt server-side from the product definition
   (finish labels + materials) + preset scene text + "keep the perspective
   and the angle", then `await replicate.run("qwen/qwen-image-2-pro", ...)`
   with `aspect_ratio: "16:9"`, `enable_prompt_expansion: true`.
   `export const maxDuration = 120`.
6. Route fetches the generated image and returns it as a data URL
   (Replicate CDN links expire after ~1 h — this keeps everything ephemeral
   with no storage, and dodges CORS for the download button).
7. Popover shows progress state (~10–30 s), then the image with
   **Download** and **Nochmal** (regenerate) actions.

## Scene presets (initial)

| Key | Scene |
| --- | --- |
| `beach-villa` | Bankirai terrace of a Gran Canaria beach villa, glass + stone, sunset 19:00, mountains behind the beach |
| `urban-loft` | Industrial loft, concrete + steel windows, city dusk |
| `nordic-morning` | Scandinavian home, soft morning light, fjord view |
| `mediterranean-patio` | Mediterranean courtyard, warm afternoon, olive trees |

All presets share the base template: describe finishes from the current
configuration, fill in sink/ovens/microwave, keep perspective and angle,
hyperrealistic and cinematic.

## Files

- `app/api/photo/route.ts` — blocking Replicate route (validates payload size, no auth for now)
- `features/configurator/photo/photo-presets.ts` — preset definitions + prompt template
- `features/configurator/photo/photo-popover.tsx` — popover UI (idle → generating → result/error)
- `features/configurator/photo/use-scene-capture.ts` — canvas capture + downscale helper
- `features/configurator/engine/configurator-canvas.tsx` — `preserveDrawingBuffer: true`, capture bridge (exposes a capture callback via ref)
- `features/configurator/ui/configurator-shell.tsx` — Foto button + popover wiring
- `.env.example` — `REPLICATE_API_TOKEN=` (real token goes in `.env.local`, never committed)

## Prerequisite

- [ ] `REPLICATE_API_TOKEN` in `.env.local` (create at replicate.com/account/api-tokens)

## Later hardening (deliberately skipped for the prototype)

- [ ] **Rate limiting** — per-IP limiter on `/api/photo` (e.g. 5 generations/hour); in-memory is fine single-instance, use Upstash/Redis if horizontally scaled
- [ ] **Auth** — gate the route behind a session (Clerk like RDDOT-dfn-AI-IMAGEGEN, or Supabase Auth) before the site goes public
- [ ] **Persistence** — store generated images (Replicate URLs expire ~1 h): MinIO upload + Supabase `images` table, reuse `lib/minioClient` pattern from RDDOT-dfn-AI-IMAGEGEN
- [ ] **Cost guardrails** — Replicate spend alerts, per-user quota once auth exists
- [ ] **Queue/polling upgrade** — if hosting caps response time or generations get slower, switch to the start + poll pattern from RDDOT-dfn-AI-IMAGEGEN (`app/api/replicate/route.ts` + `status/route.ts`)
- [ ] **Share** — shareable URL for a generated photo (needs persistence first)
