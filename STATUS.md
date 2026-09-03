# rotpunkt Signature Status

Last reconciled: 2026-09-03
Working branch: `cc/devstart-003` — the main development branch from 2026-09-03, cut from
`cc/devstart-002` at `957698f` (36 commits ahead of `redesign/devstart`). Earlier
`cc/devstart-*` branches are frozen at their last commit; none is merged back and none
needs to be.

Design direction (decided 2026-09-02, rebuilt 2026-09-03 on the Sequel style from Refero):
"rotpunkt after dark" — black stage, charcoal cards, three greys, white structure, signature
red only as the dot and one filled action per view; Manrope 300/400/500 plus one Instrument
Serif word per headline; pills, glass HUD chips, 10 px cards; one motion curve. Canvas:
https://claude.ai/code/artifact/5fed3dc8-f9bd-4489-845d-29cfbaa07be3 (pages Website,
Konfigurator, System). Implemented 2026-09-03 across four commits: the foundation
(tokens, fonts, primitives, motion contract), the homepage with the rotpunkt film as
hero, the configurator (dark studio, glass HUDs, charcoal Datenblatt with accordions,
material overlay, bottom sheet on phones) and the account, sign-in, Anfrage and shared
states. Open on the design side: Impressum/Datenschutz pages (the footer carries no
legal column until they exist) and a dark studio render for the homepage's configurator
card (it shows the evening photo for now).

Gates at reconciliation: `pnpm test` 76/76 (covers `features` and `lib`), `pnpm test:db`
61/61 (Neon), `pnpm lint` clean, `tsc --noEmit` clean, production build green. The build only passes with `TRANSACTIONAL_EMAIL_PROVIDER`
**unset** — with the local `development-capture` value it fails closed by design
(ADR 0010). See Build & Verification Gates below.

## Current Goal

Deliver a German-first, branded kitchen configurator that lets a private customer move from a shareable guest configuration to a durable Project, while preserving the approved boundaries for identity, releases, future AI photos, Quote Requests, Sanity, and commerce.

## Done

- Built the first Tailwind/Next.js design system pass from the Figma directions.
- Design-system primitives (rebuilt 2026-09-03 for the dark system, `components/design-system`):
  `BrandLogo`, `SiteHeader` (frosted on scroll, full-screen menu on phones), `SiteFooter`,
  `AppHeader`, `Pill` (primary / secondary / ghost) and `RoundButton`, `Glass`, `GlassBadge`,
  `GlassSegments` (sliding highlight, red dot), `Card`, `MediaCard`, `Label`, `SectionIntro`,
  `Reveal` (the one entrance), `Overlay` (portal sheet or card, focus and scroll handling),
  `MotionProvider` (`reducedMotion="user"`). Motion constants live in `lib/motion.ts`.
- Configurator on the dark system (`features/configurator/ui`): `configurator-hud.tsx`
  (brand, stage/view/camera chips, scene actions, save state), `datasheet-panel.tsx`
  (summary rows, accordions, foot; card on desktop, sheet on phones, one mounted at a time
  via `lib/use-media.ts`), `material-overlay.tsx` (live choice, cancel restores),
  `project-save-controls.tsx` (autosave for the life of the configurator; decision
  states as a card over the scene). Studio stage darkened in `kitchen-scene.tsx`.
- Studio rendering pass (2026-09-03): temporal supersampling (`accumulation-pass.ts`,
  `temporal-accumulation.tsx`: Halton-jittered camera, 32 frames blended while still; the
  composer's multisampling is off because its depth resolve is refused on some GPUs),
  Poly Haven's "Studio Small 09" HDRI (CC0, fetched 2026-09-03, downsampled to 1k as
  `public/hdri/studio-small-09.hdr`; an authored fallback stays in
  `scripts/generate-studio-assets.py --with-hdri`), surface tiles from the same script
  (`public/textures/*`), AccumulativeShadows on a
  MeshReflector floor, a rim light, AgX at exposure 1.12, world-scaled planar UVs so grain
  runs across fronts, a quartz worktop. The cube-camera probe left the studio (it only saw
  the black stage; the void wall is unlit). Finish scans wrap mirrored so their tile edges
  never draw lines across a front. Checked: a bevel pass is pointless — the prefabs already
  carry rounded edges (max face angle 20.6°). Still open: the finish scans are 325–512 px;
  2k tiles of Nussbaum Memory and the two Fenix decors from the manufacturer are the next
  visible step.
- Drag-to-place and three islands (2026-09-03): in an Edit Session the Datenblatt's Aufbau
  section shows an element palette (`element-palette.tsx`); dragging a tile into the scene
  shows the real prefab as a red, glowing wireframe ghost at the line end the pointer is
  nearer (probe in `kitchen-model.tsx`, `KitchenEditProps.drag`), letting go adds it there;
  tapping adds on the right. Islands: Ohne (0), Insel (4), Große Insel (5 — one more front
  unit; the back row `["90","60","60","90","60"]` stretches evenly to close on the right end
  panel, `getIslandBackStretchM`, `ModulePlacement.scaleX`). Sizes 2 and 6 stay valid for
  stored configurations but are no longer offered.
- Photo first (2026-09-03): a signed-in person without a Project takes a photo straight
  away — the photo card asks for a Project name, `POST /api/projects` (now accepts `name`
  and returns version/updatedAt) creates it, the shell switches to it without a reload and
  the photo continues. Projects can be renamed inline (`ProjectNameField` in the photo card
  and the Datenblatt; `PATCH /api/projects/[projectId]`, `projects.renameProject`, covered
  by the persistence contract test). Gates: `pnpm test:db` 62/62 (+1 skipped).
- Account, sign-in, Anfrage, shared-link states restyled with `components/design-system/field.tsx`
  (the one underline input) and the pill/card primitives.
- Homepage sections (`components/sections`): `SignatureHero` (the rotpunkt film, muted loop,
  fade from black, still for reduced motion, "Den Film ansehen" goes fullscreen; headline
  "Küchen, auf den Punkt." rescued from the first site), `Manifest` ("Eine
  Küche ist kein Möbel…" rescued; the one scroll-linked sequence: words light up on scroll),
  `SignaturePromises` (each promise opens a detail card that morphs out of its "+" trigger
  via a shared layoutId), `MaterialCards` (four fronts incl. Porzellan as a colour card;
  tilt toward the pointer; detail cards with facts, the real surcharge from the product
  definition and a deep link that opens the configurator with that front chosen; band on
  phones), `ConfiguratorTeaser` (living HUD, real default price, "Von 0 auf 100 °C in vier
  Klicks" spring counter, four-step explainer overlay), `RoomStory` ("Ihr Raum. Ihre Küche."
  rescued: Studio, Appartement, KI-Foto, Versionen & Links), `CollectionLines` (captions
  rescued as badges), `ClosingStatement`. Copy lives in `lib/content.ts`. No
  Impressum/Datenschutz pages exist yet, so the footer carries no legal column.
- Moved navigation outside the hero and converted it to a fixed floating navbar with motion-based hide/show behavior.
- Improved hero typography animation with staggered motion.
- Added `/configure` as the first 3D configurator route.
- Built an isolated configurator feature module under `features/configurator`.
- Added a straight-line kitchen scene using React Three Fiber, drei, and Three.js.
- Loaded `public/models/kitchen-line.glb` into the configurator as the active kitchen model.
- Added heuristic GLB material mapping so cabinet/korpus and front colors affect the imported model.
- Segmented the kitchen asset into named module prefabs (`kitchen-modules.glb` + manifest) via a headless Blender pipeline: 8 wall modules, 8 island units, 2 island ends, 6 continuous elements, roles baked into mesh names. The runtime now composes the scene from prefab placements with verified exact geometric parity (per-mesh world bounds within 1e-6) against the previous monolithic model — the foundation for module-level configurability.
- Introduced Product Definition v2 (`rdtdot-signature-kitchen-v1@2`) with a Wall Module catalog, Island Sizes, sum-of-parts pricing calibrated to the historical v1 base price, and per-module finish weights. Configuration state v2 (`wallModules`, `islandSize`) flows through a discriminated-union contract, version-aware hashing (v1 hashes stay byte-compatible; v2 hashes are key-order independent), the URL codec (legacy v1 guest URLs upgrade with finishes preserved), and versioned revision display snapshots. Per the agreed posture, v1 stays parseable but unsupported: v1 revision restore returns 409, v1 shared links resolve to 410.
- Fixed two pre-existing versioning bugs: the shared-revision resolver now checks the supported-version allowlist instead of current-version equality, and shared views no longer silently fall back to the live recomputed price when a pinned display snapshot is unavailable ("Preis nicht verfügbar" instead).
- Made the 3D scene state-driven: the composition engine places module prefabs from `wallModules`/`islandSize` (variant cycling, centered lines, stretched or regenerated continuous elements including a plain worktop for non-default island sizes), verified against the as-authored default within 2mm and live in the browser with exact sum-of-parts prices.
- Added the module Edit Session: a transactional edit mode (desktop/tablet) with a real-material edit treatment (modules slightly transparent, signature-red wireframe on the selected element), click-selection in 3D and in a proportional module strip, add/remove/move/type-swap with live constraint enforcement (min 2 modules, max 5.4m, device cap), island size selection, ghost add-slots at the line ends, live price preview, and Übernehmen/Verwerfen semantics that leave the committed configuration untouched until applied.
- Added the Appartement2 visualization: a Cycles-baked living-room environment produced by a reproducible headless pipeline (`scripts/bake-appartement2.py` — per-object Smart-UV bake of combined lighting with filmic exposure compression, lampshade decimation, Draco GLB export, plus an equirectangular HDR panorama rendered at the kitchen anchor that lights the dynamic kitchen through the same reflection-probe pattern as the first Appartement). The kitchen line backs onto the painting wall, rotated into the room with the island toward the center; two full-height slat room dividers from the source scene are removed at load.
- Added stylized appliance fronts (dark glass oven panel + handle bar) generated into device cabinet niches under a dedicated appliance scene role.
- Added the itemized price presentation: an expandable "Aufstellung" in the configurator panel and full line-item breakdown in the fake checkout, both driven by the v2 sum-of-parts quote (module counts, island units, per-meter worktop, finish deltas, tax).
- Made the scene bar the editing interface during an Edit Session: the module strip and the edit controls now live in the same bar that carries the scene, so entering an Edit Session restyles the existing surface instead of opening a second competing panel.
- Added drag-and-drop module reordering with `motion/react` `Reorder`, and restyled the edit bar around it. The reorder path replaced the earlier arrow-button-only rearrangement (net −231 lines in `module-editor.tsx`).
- Added the photo artifact storage foundation (ADR 0011, PLAN.md Phases 1–2 partial): `photo_job`, `source_capture`, and `generated_photo` tables with composite foreign keys that keep every artifact inside its own Project, state constraints that forbid provider work on a job with no validated capture, and indexes for the per-Project gallery, the account-wide profile gallery, and reconciliation sweeps.
- Added the object storage boundary: a self-hosted S3-compatible RustFS deployment behind a purpose-built Interface (`features/object-storage/object-storage-module.ts`), with a server-only adapter that presigns single-use uploads bound to an exact content type and byte length, presigns short-lived reads, confirms what actually landed, and deletes idempotently. No S3 client type, bucket name, or endpoint crosses the seam. The bucket is private; no object is served from a public URL.
- Made object deletion unorphanable: a database trigger records a deletion intent in the existing outbox whenever a row owning a stored object disappears — including via `ON DELETE CASCADE` from Project trash or Customer Account deletion, where no application statement observes the row. A sweep worker drains those intents with claim-and-backoff semantics and surfaces unreconciled objects. Verified against the real database, including the cascade path.
- Added the photo gallery read path: an owner-scoped module (`features/photo-gallery/photo-gallery-module.ts`) that lists a Project's Generated Photos and the account-wide profile gallery through a single authorization predicate, resolves each row's storage key into a short-lived presigned display URL, grants owner-only downloads with an attachment filename, and deletes a photo by removing the row so the storage trigger records the object's deletion. Cursor-paginated newest-first, matching the version-history style. Exposed as `GET /api/photos`, `GET /api/projects/[projectId]/photos`, and `GET`/`DELETE /api/photos/[photoId]`, all `private, no-store`.
- Verified the storage path against the live RustFS deployment: presigned upload, stat, presigned download, exact-length rejection, and idempotent delete all pass (`tests/integration/object-storage-live.test.ts`, skipped when storage is unconfigured). An end-to-end run also confirmed a `generated_photo` row resolving to a display URL that returns the exact bytes, anonymous access to the same object being refused, and the object disappearing from the bucket after the deletion sweep.
- Added the photo gallery UI on both surfaces: the account-wide gallery in `/konto` and the per-Project gallery in the configurator panel, sharing one component. Tiles hold their intrinsic aspect ratio from the stored dimensions so nothing shifts as images arrive, a lightbox carries download and delete, and every surface carries the ADR 0008 illustrative-image disclosure. Presigned display URLs are re-minted on a timer shortly before they lapse and on image error, so a gallery left open does not decay into broken images. The first page is server-rendered — both pages are `force-dynamic`, so short-lived URLs are never cached — and later pages arrive by cursor. A `density` prop drops the configurator panel to two columns, since its width is far narrower than any viewport breakpoint can detect.
- Added the Photo Job Module (PLAN.md Phase 1 and the Phase 2 validation path): requesting a photo atomically checkpoints the Working Configuration into a `trigger = 'photo'` Configuration Revision and creates the job against it under expected-version concurrency, so a photo is always attributable to an exact immutable configuration rather than to whatever the canvas showed (gap G5). Requests are idempotent, owner-scoped, and bounded by a per-account daily ceiling.
- Added Source Capture validation: the capture is uploaded through a single-use presigned grant bound to an exact content type and byte length, then confirmed server-side by fetching the stored object and decoding its header. Dimensions and format are read from the bytes, never taken from the client, and a capture that is missing, oversized, not an image, or out of dimension range fails the job with a recorded reason (gap G4).
- Added the provider adapter seam and its Replicate implementation. SDK types, prediction identifiers, and delivery URLs stop at the adapter. Prompts are built from the pinned revision's configuration and an approved Scene Preset, never from client input (gap G6). A module-level kill switch (`PHOTO_GENERATION_ENABLED`, default off) disables generation while request, status, list and cancel keep working (gap G11).
- Photo rows are now written by the application: a run validates the provider's output by decoding it, persists the bytes to EU object storage, and only then inserts the Generated Photo and marks the job succeeded (gap G3). Jobs claim themselves before running, so two concurrent runs produce one photo. Verified end to end against the live RustFS deployment and the real database: request, presigned upload, server-side confirmation, run, and the resulting photo appearing in the gallery at its true decoded dimensions.
- Wired the configurator's photo UI onto the Photo Job API and **retired the prototype route**. `app/api/photo/route.ts` is deleted rather than gated, which closes PLAN.md Phase 0 by removal: there is no longer an unauthenticated route that can spend provider credits. The capture now travels as bytes through a single-use presigned grant instead of a data URI in a JSON body, so the old ~256KB provider limit no longer shapes capture quality.
- The photo popover enforces the ADR 0008 ownership rule in the interface: a guest configuration is offered "Als Projekt speichern" instead of a generate button, and a Project whose current version cannot be read is told to wait for the autosave rather than pinning the wrong configuration. Progress is reported per step (übertragen/geprüft, then erzeugt), and the result carries the illustrative-image disclosure and a per-request download grant.
- Added `GET /api/projects/[projectId]/configuration` returning the current Working Configuration version, so a caller that must pin an exact configuration reads it rather than guessing; a change that lands in between makes the photo request 409.
- Made the Replicate adapter diagnosable. The capture now reaches the provider as a typed Blob, which the SDK uploads through its Files API and passes to the model by URL, instead of a base64 data URI that inflated a 1.5 MB capture to ~2 MB inside the prediction body. Failures no longer collapse to a bare `provider-error`: HTTP rejections map to stable, customer-safe codes (`provider-unauthorized`, `provider-billing`, `provider-rejected-input`, `provider-rate-limited`, `provider-error`, `provider-prediction-failed`, `provider-timeout`), the provider status and message are logged as operator detail that is never persisted or shown, and the prediction id is recorded as `providerReference` on failed jobs too. The generation timeout is now an `AbortSignal`, so a prediction that overruns is canceled at the provider rather than left spending; a hard bound still abandons a run the provider refuses to cancel. Covered by unit tests with an injected client (`lib/server/photo-jobs/replicate-adapter.test.ts`).
- Repaired `.env.example`: five variables lacked their `=` and the kill switch read `PHOTO_GENERATION_ENABLED=false=`; the key set now matches `.env.local` exactly.
- **Governed Photo Jobs (PLAN.md Phase 4) and finished their customer flow (Phase 5).** Every execution is now attributable: migration `20260903100000_photo_governance.sql` adds immutable, approved `prompt_template_release` and `model_release` rows (one active per kind, enforced by partial unique indexes) and seeds Release v1 of each from the standing product decisions — the in-code prompt as the template with its four Scene Presets, and `qwen/qwen-image-2-pro` as the official-unversioned model with license, expectations, safety notes, pricing basis, a 5-cent estimate and the live runs of 2026-09-02 as evaluation evidence. A job pins both release ids, the rendered prompt and the cost estimate at submission; the prompt's product facts come from the pinned revision under its own Product Definition version, and a request for a Scene Preset the active release does not approve is refused with 400. Spend is bounded twice and independently: the per-account quota at request (default 25 per rolling 24 h) and a provider-wide breaker at submission (default 200 jobs or 20 € of estimates per rolling 24 h, overridable via `PHOTO_CUSTOMER_DAILY_JOBS`, `PHOTO_DAILY_BUDGET_JOBS`, `PHOTO_DAILY_BUDGET_CENTS`); a refused submission returns 503 with retry-after and leaves the job capture-ready. The provider's reported compute time is recorded per job. A drift test guards that the seeded presets equal the ones the configurator offers and that Release v1 renders exactly what the pre-governance code produced. On the customer side, a Project with a job in flight picks it up again after a page reload and shows its progress without a capture preview.
- **Made Photo Jobs survive the browser (PLAN.md Phase 3, step 5 of the confirmed sequence).** The provider call is now a submission: `POST /api/photo-jobs/[jobId]/submit` hands the capture-ready job to Replicate as a prediction with a webhook and returns 202; the browser polls `GET /api/photo-jobs/[jobId]`, and closing the tab loses nothing. Completion arrives through `POST /api/webhooks/replicate`, where the adapter verifies the delivery against the account's signing secret and normalises it, and the module records it in an idempotent inbox (`photo_job_provider_event`, unique on the delivery id) before applying it. Every read of an in-flight job also reconciles with the provider (throttled to one call per four seconds per job), so a lost webhook is recovered by the next poll; `POST /api/photo-jobs/sweep` (token-protected, not yet scheduled — same posture as the storage sweep) does the same across owners. A job with no terminal outcome after ten minutes is reported uncertain and after thirty is failed with a best-effort provider cancel. Success is still declared only after the validated bytes are in EU storage; a webhook and a reconciliation racing on the same job file exactly one photo (conditional claim plus the photo row's unique job reference). Evidence columns record model, submission, completion and last provider check. Migration `20260902230000_photo_job_provider_events.sql` applied to the dev database. Not yet configured anywhere: `REPLICATE_WEBHOOK_SIGNING_SECRET` and `PHOTO_WEBHOOK_URL` (locally the application is unreachable from outside, so jobs complete by reconciliation), and `PHOTO_SWEEP_TOKEN`.
- **Restructured the configurator panel around the customer's three decisions** (the critique's second P1, step 4 of the confirmed sequence). The panel now stages **Material** (Korpus, Front), **Aufbau** (the module line as a read-only strip with counts and island size, and the one button that opens the Edit Session in the scene bar) and **Prüfen** (Aufstellung open by default, project save state, versions, share links, gallery, and the guest actions) behind an accessible tablist with arrow-key navigation; one stage is visible at a time and the scene stays persistent. Entering an Edit Session lands on Aufbau. Render and the environment tabs became one labelled **Ansicht** control (Studio · Appartement · Render) with a one-line explanation of what each shows, which also starts to answer the critique's "no contextual teaching" finding. The scene bar keeps text labels on Bearbeiten and Foto at every width (icon over label below 640px, five columns at 350px without overflow). Below the desktop breakpoint the Richtpreis row and primary action are fixed to the bottom of the viewport with safe-area padding, because `main` clips overflow and a sticky foot could never reach the window there. Shared views keep their single document layout.
- **Gave the kitchen module model a real Asset Manifest (ADR 0009).** `features/configurator/modules/kitchen-asset-manifest.json` is built by `pnpm assets:manifest` from the GLB and the segmentation output: the model's SHA-256 and byte size, an explicit mapping of all 122 mesh nodes to their Semantic Scene Role, prefab and material slot, the module placements, measured budgets against declared limits (1 MB / 76,926 triangles / 122 draw calls against 2 MB / 120k / 200), approved studio cameras, the Deterministic Visual Fallback poster, compatibility and provenance. The manifest is parsed with zod at import and its invariants checked there, so a missing required role or an exceeded budget fails the build rather than the customer. The engine now resolves roles only through it — `classifyMesh` (bounding-box heuristics) and the mesh-name prefix parser are gone; an unmapped node throws, and runtime-generated meshes (appliance fronts, worktops) carry their role explicitly. A release-gate test (`asset-manifest.test.ts`, in `pnpm test`) reads the GLB on disk and fails on any drift between bytes, nodes, roles, prefabs, triangle counts, placements and the manifest. Studio camera presets come from the manifest. The canvas is wrapped in an error boundary that swaps the scene for the approved poster on any thrown error, including a failed WebGL context — the configuration panel stays usable. (Not the Canvas `fallback` prop: fiber renders that as canvas child content, which screen readers announce even while 3D works.) The boundary was exercised for real: the first wiring missed the generated oven front, the poster appeared with the panel intact, and the console named the node.
- Retired the heavy first Appartement scene (decided 2026-09-02): the 27 MB `kitchen1.glb` with its generic node names, the `qwantani_dusk_1k.hdr` it was lit with, its model component and the `optimize:apartment` script are gone, and `public/` drops from ~38 MB to ~10 MB. The baked living-room scene is now the one "Appartement" (mode key `apartment`, label without the "2" the critique flagged as prototype language); its source files keep their `appartement2` names until the placeholder asset is exchanged. Visualization is local UI state, so nothing persisted or shared had to migrate.
- **Shipped the Quote Request vertical slice (ADR 0012)** — the design critique's P0. A Quote Request Module behind the Project seams (`features/quote-requests/`, `lib/server/db/quote-requests-postgres.ts`, `lib/server/quote-requests/`) checkpoints the Working Configuration into a `trigger = 'quote'` revision under expected-version concurrency and records contact, consent version, note and a server-computed Price Indication in the same transaction, plus a `quote-request.submitted` outbox intent for the notification that waits on ADR 0010. Idempotent on the creation key, owner-scoped, capped at ten per account and day, readable references such as `A-QB68 4BCF`. API: `POST`/`GET /api/projects/[projectId]/quote-requests`, `GET /api/quote-requests`, `GET /api/quote-requests/[id]`, all private and uncached. UI: `/anfrage` (signed-in Project → labelled form with consent and live outcomes → confirmation with reference and pinned configuration; guest → save-first; signed-out → sign-in and return), an "Anfragen" section in `/konto`, and the configurator's "Konfiguration anfragen" pointing there. The cart indicator, `/checkout` and the word "Checkout" are gone; `/checkout` redirects to `/anfrage`. Migration `20260902200000_create_quote_requests.sql` applied to the dev database.
- **Generation works.** Three controlled paid runs on 2026-09-02 found and fixed the real cause of the opaque provider failures. Runs 1 and 2 (`k449ce4yphrmt0d0cc89v8msqw`, `500438hh8nrmr0d0ccaryy52mm`) failed in 2 s with `Invalid image format ''` whether the SDK uploaded an unnamed Blob or a named File: the SDK's Files API URL (`api.replicate.com/v1/files/<id>`) is a metadata endpoint that needs the account token, and this model hands its input URL to a downstream service that fetches without credentials, receives a JSON 401, and rejects the "image". Run 3 (`rpbj81t445rmw0d0ccc867s3nc`) succeeded in 17 s once the adapter received a short-lived presigned URL to the capture in the application's own storage — the same 300 s grant the module already reads the bytes through. `PhotoGenerationRequest` now carries that `captureUrl`; the File upload remains as fallback. Output was a 1024×576 PNG probed as an image. The run is reproducible by name via `tests/integration/replicate-live.test.ts` (`REPLICATE_LIVE_TEST=1` plus a capture path; it uploads to storage, presigns, generates, and cleans up) and skips otherwise. The old data-URI transport was never the cause; it was simply replaced on the way.
- Gave the application surfaces one shared header (`AppHeader`) covering the configurator, account and checkout routes: the wordmark always goes home, one contextual action is labelled with its destination, and the account entry appears wherever it is not the current page. The sign-in screen previously had a single link — the wordmark — so reaching the configurator meant going via the homepage.
- Made the configurator panel a fixed-height scroll region with a pinned foot. The panel carried `min-h-screen`, which is a floor rather than a ceiling, so it grew past the viewport and its `overflow-y-auto` never had a constrained height to scroll within. Measured before: 1.358 px of panel in a 900 px viewport with no scroll container, the Richtpreis at y=1070 and the primary action at y=1183 — both below the fold, and reaching them scrolled the 3D scene out of view. After: the page no longer overflows, the panel scrolls inside itself, and the price and primary action stay in view while finishes are compared. Mobile keeps the stacked sheet unchanged.
- Added color configuration for:
  - cabinet/korpus finish
  - front finish
- Added camera views:
  - room/signature
  - front
  - detail
- Added shareable URL state using a compact `?c=` query parameter.
- Added application-owned Customer Accounts with Better Auth email-code sign-in and server-side session resolution.
- Added the PostgreSQL Project Module, migrations, and a Project/Working Configuration persistence contract behind server-only seams.
- Connected guest “Als Projekt speichern” handoff to idempotent Project creation after sign-in.
- Saved Projects now open at `/configure?project=<uuid>` only for their owner; an expired session returns to that Project after re-authentication.
- Active saved Projects autosave the Working Configuration with expected-version optimistic concurrency. A 409 conflict leaves the remote Project unchanged and offers load-latest or save-as-new.
- Added browser-local, Project-scoped recovery drafts for unconfirmed changes, including stale-draft save-as-new handling.
- Confirmed autosaves advance the Working Configuration version and update the Project timestamp used in the account workspace.
- Added explicit “Version speichern” checkpoints for active Projects. They create or reuse an immutable Configuration Revision from the confirmed Working Configuration and remain separate from autosave.
- Added an owner-scoped, cursor-paginated Project version history with historical finish and price display snapshots resolved from the Configuration Revision's pinned Product Definition version.
- Added optimistic-concurrency-controlled version restoration. A restore first preserves the displaced Working Configuration as an immutable “Vor Wiederherstellung” safety version, then restores the selected Configuration Revision and its Product Definition identity.
- Added owner-scoped Shared Revision Links for active saved Projects. Owners can create, list, and permanently revoke 90-day links fixed to an immutable Configuration Revision.
- Shared-link secrets are generated in the browser and placed in the URL fragment. The database stores only the SHA-256 hash, and the complete link is shown only at creation time.
- Added the public `/share/[linkId]` selected-state presentation. Its POST-only resolver is private/no-store, noindex/nofollow/noarchive, and no-referrer; it exposes no Project or Customer Account data, AI-photo action, configuration mutation, or Quote Request handoff.
- Existing links remain available while a Project is archived and become unavailable when it is trashed. Public resolution currently fails closed unless the revision uses the active supported Product Definition version.
- Added `/checkout` as a fake checkout/request handoff that reads the shared configuration.
- Added a temporary product-definition contract in `features/configurator/product-definition.ts`.
- Added a Sanity adapter boundary in `features/configurator/adapters/sanity.ts`.
- Updated homepage/nav CTAs to point to `/configure`.
- Added R3F-related dependencies:
  - `@react-three/fiber`
  - `@react-three/drei`
  - `three`
  - `@types/three`
  - `lz-string`
  - `lucide-react`

## Verified Previously

- The earlier configurator slice passed lint and build, rendered a nonblank 3D canvas on desktop and mobile, and showed that color and camera changes affect the imported GLB scene.
- The shareable URL flow and fake checkout handoff preserved the configuration; mobile checkout overflow was fixed.

## Current Slice Verified (Quote Requests, 2026-09-02)

- Contract tests against the real database (`tests/integration/quote-request-contract.test.ts`, 7): one-transaction checkpoint with `trigger = 'quote'` plus outbox intent; replay on the same key; refusal of the same key with different data; revision reuse for an unchanged configuration and version-drift conflict; owner scoping and refusal of archived projects; nothing written for an unsupported Product Definition; cursor pagination across the account and per project; the daily cap.
- Browser, dev server, signed in as a throwaway test account: `/anfrage` signed-out shows sign-in and returns after the code; `/anfrage?c=…` as a signed-in guest offers "Als Projekt speichern", which created the project; `/anfrage?project=…` rendered the labelled form with the live summary (10.103 €); submit was disabled until consent; `POST` returned 201 and the confirmation showed `A-QB68 4BCF`, the lower-cased email and the pinned configuration; `/konto` listed the request with reference, date, "Eingegangen" and Richtpreis; `/checkout?c=abc` redirected to `/anfrage?c=abc`; the homepage header carries no cart; the project's configurator links "Konfiguration anfragen" to `/anfrage?project=…`.
- Gates: `tsc --noEmit` clean, `pnpm lint` clean, `pnpm test` 64/64, `pnpm test:db` 47/47, production build green.

## Previous Slice Verified (module configurability, slices S1-S5)

- Geometric parity of the segmented module composition against the previous monolithic model: per-mesh world AABBs within 1e-6, close-up view pixel-identical.
- The default v2 configuration reproduces the historical total of 10.103 € to the cent; every finish combination matches its v1 total (unit-tested); layout changes reprice exactly (verified by hand and in the browser: module removal 9.722 €, compact layout 5.899 €, big/device/device/big with large island 10.470 €).
- Edit Session verified end-to-end in the production build: Verwerfen rolls back, Übernehmen commits into URL/autosave, committed-config actions hide while staged; the holo treatment, 3D selection, ghost slots, and module strip all operate; the flow also survived unscripted human interaction in the live pane.
- Appliance fronts render in device cabinet niches with the dedicated appliance role.
- `pnpm test` 39/39, `pnpm test:db` 8/8 against the Neon test database, `pnpm lint` and production build green throughout; each slice committed separately.

**Edit Session tail verified 2026-09-02** in the production build on `cc/devstart-002`:
enter via Bearbeiten, add a module through the 3D ghost slot, drag the new slot from
position 1 to position 3 in the strip (the wall geometry recomposed on the drop), Fertig
committed `big,device,small,small,small,small,small,device,big` into the URL, and the bar
morphed back to camera navigation. The pass found and fixed one real bug: a module added
from the 3D ghost slot did not appear in the strip, which kept its own stale slot list
(`features/configurator/ui/edit-slots.ts` now reconciles the strip against the draft;
unit-tested). Caveat for anyone repeating this: the Browser pane throttles
`requestAnimationFrame` to zero while hidden, so `motion` drags and bar transitions only
progress when frames are pumped (screenshots do it). A human drag in a visible pane is
still the friendlier check, but the flow is no longer unverified.

## Previous Slice Verified

- The Shared Revision Link migration was applied to the Neon QA database.
- `pnpm test` passes 14/14 unit tests, `pnpm test:db` passes 8/8 database integration tests, and `pnpm lint`, `pnpm build`, and `git diff --check` pass. The production build uses the required `TRANSACTIONAL_EMAIL_PROVIDER` environment override.
- Database coverage confirms immutable checkpointing, idempotent concurrent creation, owner scoping, secret mismatch rejection, revocation, expiry, and independence from later Working Configuration changes.
- At 1440px desktop and 390px mobile widths, the public shared-revision surface retained one nonblank canvas, had no horizontal overflow, and produced no browser-console errors.
- The Impeccable finish reviewer returned `PASS` for the public share surface.
- The current Three.js deprecation and PostgreSQL SSL forward-compatibility warnings remain known non-blockers.

## Build & Verification Gates

How to reproduce the reconciliation results:

```
pnpm lint                                  # clean
pnpm test                                  # 47/47
pnpm test:db                               # 40/40 (needs TEST_DATABASE_URL or Docker)
TRANSACTIONAL_EMAIL_PROVIDER= pnpm build   # green
```

The build override is required, not optional. `.env.local` sets
`TRANSACTIONAL_EMAIL_PROVIDER=development-capture`, and the development capture adapter
refuses to initialize under `NODE_ENV=production` ("Development email capture cannot run
in production"), which fails page-data collection. Unsetting the variable selects the
fail-closed `unavailableDelivery`, which builds. A plain `pnpm build` therefore fails —
by design, per ADR 0010, but it surprises anyone who has not read this note.

## Open Working Tree

None beyond this reconciliation itself. The development-only loopback `trustedOrigins`
fix listed here previously landed as `56f2b37`.

## Deferred Decisions

**Automatic object deletion is deliberately not scheduled** (decided 2026-09-01).
`sweepStorageDeletions` is implemented and tested, but nothing calls it periodically,
so deletion intents accumulate in the outbox until a sweep is run by hand.

The reason is recovery, not caution about the sweep's behaviour: the sweep only ever
deletes objects whose database row is already gone, so it cannot remove a photo a
customer still has. What it does remove is the undo. While a row is deleted but its
object is not, a wrongly deleted photo is recoverable by restoring the row. Project
Archive/Trash/restore is still unimplemented, so making byte-level deletion automatic
before that lifecycle is settled would turn a recoverable mistake into a permanent one.

**The consequence being accepted:** Customer Account deletion does not currently reach
object storage. The cascade clears the database and stops at the queue, so Generated
Photos and Source Captures outlive the account that owned them. ADR 0011 requires that
cascade, and the EU-residency posture makes it a data-protection obligation rather than
housekeeping. This is a Production Release Gate item and must be closed before any
production release — by scheduling the sweep, or by an explicit retention policy that
the Release Owner signs.

Revisit when Project Archive/Trash/restore lands.

## Release Blockers

- **The `public` bucket on `ecomstorage.rotpunkt.ai` is world-readable.** It carries a
  `PublicReadGetObject` policy granting `s3:GetObject` to `*`, verified by fetching an
  uploaded object anonymously (HTTP 200). No customer photo may be stored there: a public
  object URL is permanent, unrevocable, and unscoped, which would undo the guarantees
  Shared Revision Links exist to provide. Photo artifacts now use the private
  `rdtdot-photos` bucket instead (anonymous GET returns 403, verified). The `public`
  bucket itself is left as found — review what it currently serves and whether that
  exposure is intended.
- The "Appartement" environment (source files still named `appartement2`) is a development placeholder: the source scene is BlendSwap asset #86344 ("Living-room."), CC0 but marked Fan Art with commercial use prohibited. Decided 2026-09-02 to keep it in the configurator until Martin supplies an owned or licensed .blend; the bake pipeline (`scripts/bake-appartement2.py`) is asset-agnostic — swap the scene in and re-bake before any production release. Recorded here so the Production Release Gate cannot miss it.

## Known Warnings

- The dev browser logs warnings from the current Three/R3F stack:
  - `THREE.Clock` is deprecated in favor of `THREE.Timer`.
  - `PCFSoftShadowMap` is deprecated and falls back to `PCFShadowMap`.
- These warnings do not currently block rendering or production build, but they should be revisited before production hardening.
- `npm install` reported two moderate vulnerabilities. No audit fix was applied yet.
- `next-env.d.ts` churns between `./.next/types/routes.d.ts` and
  `./.next/dev/types/routes.d.ts` depending on whether `next build` or `next dev` ran
  last. It is a generated file marked "should not be edited"; commit `12215a5` committed
  one side of that coin-flip. Treat a diff on this file as noise, not work.

## Missing

- No real Sanity Studio is wired yet.
- No Sanity project ID, dataset, API version, token handling, preview mode, or live content setup exists yet.
- No page builder schema exists in this repo yet.
- No document-level localization routing is implemented yet.
- Locale routes are not implemented yet:
  - default German at `/`
  - English at `/en`
  - Spanish at `/es`
- The homepage still uses local static content from `lib/content.ts`.
- The configurator product data is local TypeScript, not fetched from Sanity.
- The Sanity adapter is a contract boundary only; it is not connected to a real query.
- No Studio page-builder block exists yet for dropping the configurator into a page.
- No real product catalog, SKU model, pricing engine, cart, order, CRM, or payment integration exists yet. Quote Requests are recorded and listed but nobody is notified: the `quote-request.submitted` outbox has no consumer until the email provider lands (ADR 0010). The "selected photo" named in CONTEXT.md is not yet captured on a Quote Request, and the account list shows the first ten without a load-more.
- The configurator's remaining ADR 0009 gaps: no measured Quality Profiles (fidelity still keys off viewport width), no deterministic reference renders or browser render smoke test in CI, no engine-upgrade guard for historical manifests, and the Appartement scene has no manifest of its own (it is a placeholder awaiting an owned source). The kitchen model itself is now manifest-validated and content-hashed.
- The AI photo feature is application-owned and asynchronous (Photo Job Module, EU object storage, owner scoping, kill switch, webhook inbox, reconciliation), but no webhook has yet been received from the real provider — that needs a public HTTPS URL, which only a deployment has — and the sweep is not scheduled. The browser's submit-and-poll flow has been exercised only against the module tests, not with generation enabled in a live pane. PLAN.md Phases 4–6 remain, plus the output moderation gate and cost evidence from Phase 3.
- No analytics/event tracking exists for configurator interactions.
- The current Project workflow has unit/integration coverage, but no automated end-to-end browser coverage yet.
- Project Archive/Trash/lifecycle restoration is not implemented yet. The sharing persistence boundary already treats archived links as available and trashed links as unavailable.
- No accessibility audit has been formalized.
- No performance budgets exist for 3D, images, or page-builder pages.
- No automated browser/E2E coverage exists at all: the configurator, the Edit Session, the Project workflows, and the share surface are verified by hand each slice.
- No CI pipeline runs the gates. Lint, types, unit, DB, and build are run locally and by convention.

## Architecture Direction

- Keep the site single-channel for now.
- Treat German as the default locale and URL root.
- Use document-level localization for page-builder pages when Sanity is added.
- Use field-level localized labels for small shared configuration metadata.
- Keep the configurator isolated as a smart component inside the Next.js app.
- Make the configurator page-builder compliant so Sanity editors can drop it into pages later.
- Keep product definitions portable:
  - Sanity can own the editorial/product metadata first.
  - The same product definition should be exportable as JSON later.
  - Pricing should stay replaceable by a real commerce service.
- Do not copy the `defgrp-3d-configurator` implementation directly; use it as interaction and camera inspiration only.
- Keep the first prototype limited to one straight-line kitchen with cabinet/front color options.

## Recommended Next Implementation Steps

### Immediate (do these before starting any new track)

1. ~~Verify the Edit Session tail~~ — done 2026-09-02 (see Current Slice Verified); one
   bug found and fixed. Development continues on `cc/devstart-002` rather than merging back
   into `redesign/devstart`.
2. ~~Controlled paid generation~~ — done 2026-09-02, succeeded on the third run (see Done).
   Step 1 of the confirmed sequence is closed. `PHOTO_GENERATION_ENABLED` stays off in
   `.env.local` until the customer-facing path is wanted; turning it on is still a
   deliberate decision.
3. ~~Act on the design critique's P0~~ — done 2026-09-02 with the Quote Request slice
   (ADR 0012). The remaining critique items are steps 3 and 4 of the confirmed sequence.

### Photo storage track (in progress)

ADR 0011 is accepted and the storage foundation is in place. What remains before
the galleries can ship:

1. ~~Photo Job module seam~~ — done (Phase 1, gap G5).
2. ~~Source Capture upload flow~~ — done (Phase 2 validation path, gap G4).
3. Retention sweep for reserved-but-never-uploaded captures and for captures whose
   job has reached a terminal state.
4. Confirm the physical location of `ecomstorage.rotpunkt.ai` and record it as
   residency evidence — ADR 0011's residency claim is asserted, not yet evidenced.
5. Object deletion stays manual **by decision, not oversight** (2026-09-01). See
   Deferred Decisions.
6. Turn on generation. `PHOTO_GENERATION_ENABLED` is off, so every run currently
   fails as `provider-disabled` by design. Enabling it spends Replicate credits and is
   a deliberate decision, not a default. See Immediate step 2.
7. ~~PLAN.md Phase 3~~ — done 2026-09-02. Before production: set
   `REPLICATE_WEBHOOK_SIGNING_SECRET` (from the provider's default-webhook secret
   endpoint) and `PHOTO_WEBHOOK_URL`, and schedule `POST /api/photo-jobs/sweep` with
   `PHOTO_SWEEP_TOKEN`. Until then jobs still complete through reconciliation on read.

### Confirmed sequence (decided 2026-09-02)

The repo carried five overlapping plans (PLAN.md photo Phases 3–6, Track A, Track B, the
Impeccable critique's priorities, and an external Sanity-first assessment). They are
collapsed into one order below. This section is the roadmap; PLAN.md remains the photo
sub-plan it references.

1. ~~**Close the branch.**~~ Done 2026-09-02: Edit Session pass (one bug fixed) and a
   successful paid generation, both recorded under Done and Current Slice Verified.
2. ~~**Quote vertical slice.**~~ Done 2026-09-02 (ADR 0012, see Done). Left open by
   design: the business notification (outbox consumer, waits on ADR 0010), the selected
   photo on a request, and load-more in the account list.
3. **Production 3D baseline, Track A.** ~~Retire the 27 MB `kitchen1.glb`~~ (done
   2026-09-02), ~~turn mesh-name conventions into a real Asset Manifest~~ (done 2026-09-02,
   with the Deterministic Visual Fallback path), replace the Fan-Art Appartement scene and
   re-bake (decided 2026-09-02: the placeholder stays in the configurator for now; Martin
   exchanges the source scene later), then make the best environment the default — only
   once that scene is owned.
4. ~~**Configurator workbench restructure.**~~ Done 2026-09-02 (see Done): Material → Aufbau →
   Prüfen stages, the Ansicht control, labelled mobile actions, fixed price row on mobile.
5. ~~**PLAN.md Phase 3, then Phases 4–5.**~~ Done 2026-09-02 (see Done). Left for Phase 6
   and its evidence list: the output moderation gate (G10), billed cost against the
   estimate (G8), browser E2E coverage, and the production configuration of webhook,
   signing secret and sweep schedule.

**In parallel, off the engineering path:** Sanity for homepage and navigation only, and
the Phase 6 legal thread (DPA, transfer mechanism). Both are decisions and procurement.

**Explicitly deferred:** the Sanity-first ordering, Track B's locale routing and page
builder, and Product Definition Drafts in Sanity. They open a large new surface before the
customer journey has an ending.

### Cross-cutting, currently unowned

- Playwright coverage: homepage to configurator, color change updates URL, share URL
  restores state, checkout summary matches state, owner-only Project open, re-auth
  return, autosave/conflict recovery, recovery-draft decisions, version save and
  deduplication, paginated history, safe restore.
- CI that runs lint, types, unit, DB, and build on every push.
- Accessibility audit and performance budgets (both listed under Missing, neither
  scheduled).

## Docs Still Needed

- `README.md`: how to run, build, verify, and understand the project at a glance.
- `ARCHITECTURE.md`: app architecture, route strategy, feature boundaries, Sanity/page-builder strategy, and commerce escape hatches.
- `SANITY.md`: Studio setup, dataset strategy, schema ownership, preview/live editing, agentic workflow notes, and migration rules.
- `CONTENT_MODEL.md`: page-builder block model, page fields, product definition fields, localization approach, and editor rules.
- `LOCALIZATION.md`: supported locales, default locale behavior, slug rules, fallback rules, and copy workflow.
- `CONFIGURATOR_CONTRACT.md`: product definition shape, URL state shape, pricing assumptions, validation rules, and future JSON export contract.
- `COMMERCE_ROADMAP.md`: fake checkout now, cart/quote/order/payment later, and boundaries between Sanity and commerce systems.
- `3D_PIPELINE.md`: model formats, asset optimization, camera presets, material naming, performance budgets, and QA procedure.
- `QA.md`: manual QA checklist plus automated Playwright coverage plan.
- `ACCESSIBILITY.md`: keyboard behavior, focus states, reduced motion, contrast, forms, and configurator-specific a11y decisions.
- `PERFORMANCE.md`: Core Web Vitals targets, 3D budgets, image budgets, lazy loading, and monitoring.
- `DECISIONS.md` or `docs/adr/*`: short architecture decision records for key choices.
