# rotpunkt Signature Status

Last reconciled: 2026-10-15 (at `76558b3`); Phase 9b, the feature inventory and the roadmap
added the same day at `4611243`
Working branch: `cc/devstart-sanity` — the main development branch from 2026-10-01, cut from
`cc/devstart-003` at `e4fd3e9` (67 commits ahead of `redesign/devstart`). `cc/devstart-003`
and the earlier `cc/devstart-*` branches are frozen at their last commit; none is merged
back and none needs to be.

Design direction (decided 2026-09-02, rebuilt 2026-09-03 on the Sequel style from Refero):
"rotpunkt after dark" — black stage, charcoal cards, three greys, white structure, signature
red only as the dot and one filled action per view; Manrope 300/400/500 plus one Instrument
Serif word per headline; pills, glass chips over imagery, solid soot chips (`chip-solid`,
`--color-soot` 20 20 20) over the 3D scene since 2026-10-08 because frosted glass tinted
with the worktop and the wooden floor, 10 px cards; one motion curve. Canvas:
https://claude.ai/code/artifact/5fed3dc8-f9bd-4489-845d-29cfbaa07be3 (pages Website,
Konfigurator, System). Implemented 2026-09-03 across four commits: the foundation
(tokens, fonts, primitives, motion contract), the homepage with the rotpunkt film as
hero, the configurator (dark studio, glass HUDs, charcoal Datenblatt with accordions,
material overlay, bottom sheet on phones) and the account, sign-in, Anfrage and shared
states. Open on the design side: Impressum/Datenschutz pages (the footer carries no
legal column until they exist) and a dark studio render for the homepage's configurator
card (it shows the evening photo for now).

Gates at reconciliation (2026-10-15): `pnpm lint` clean, `tsc --noEmit` clean, `pnpm test`
106/106 after Phase 9b (covers `features` and `lib`), `pnpm test:db` 64 passed and 1 skipped (Neon),
production build green with the `postbuild` server-bundle check passing; the site worked in
the browser. The build only passes with `TRANSACTIONAL_EMAIL_PROVIDER`
**unset** — with the local `development-capture` value it fails closed by design
(ADR 0010). See Build & Verification Gates below.

## Current Goal

Deliver a German-first, branded kitchen configurator that lets a private customer move from a shareable guest configuration to a durable Project, while preserving the approved boundaries for identity, releases, future AI photos, Quote Requests, Sanity, and commerce.

Alongside it, every piece of marketing content becomes editable in Sanity, in German,
English and Spanish: [.scratch/sanity-pagebuilder/spec.md](.scratch/sanity-pagebuilder/spec.md).

## Feature Inventory (2026-10-15)

Everything the project does today, by area. **Done** works end to end and was verified in
the browser; **Gated** is built but waits on a decision, a supply or production
configuration; **Open** is not built. Details for each line are under Done and Missing.

**Website and content (Sanity)**

| Feature | State |
| --- | --- |
| Homepage from eight Page Blocks: film hero, statement, promises with detail cards, material cards (live surcharge, deep link), configurator teaser (live price, explainer), room story, collection lines, closing | Done |
| Header and footer navigation from Sanity, full-screen menu on phones | Done |
| Embedded Studio at `/studio`, `page` and `navigation` per language, demo mode without Sanity, `pnpm sanity:seed` | Done |
| Editorial Preview: draft mode, live updates, click-to-edit markers | Done (Presentation tool not yet tried with a Studio login) |
| Locale routing: German at `/`, English `/en`, Spanish `/es`; language switch on editorial pages | Done; English and Spanish closed in production (`LAUNCHED_LOCALES`) |
| English and Spanish homepage and navigation | Done; native review open |
| Site settings, SEO metadata, canonical, `hreflang`, sitemap, robots, redirects, signed publish webhook (Phase 7b) | Done; webhook and Sanity variables not yet on Vercel |
| Impressum, Datenschutz, `richText` / `faq` / `media` blocks | Open (needs Martin's legal texts) |

**Configurator**

| Feature | State |
| --- | --- |
| Straight kitchen line from wall modules (tall cabinet, appliance cabinet, cabinet 30): Edit Session with add, remove, move, swap, drag reorder, drag from the Datenblatt palette; width and per-type limits | Done |
| Islands: none, standard, large | Done |
| Finishes: three carcass colours, four fronts; full-size material overlay | Done |
| Itemised indicative price (sum of parts), live with every change | Done (prototype prices in code, ADR 0006) |
| Views: Studio, Appartement, path-traced Rendering; cameras Room, Front, Detail; supersampled studio light | Done; the Appartement scene is an unlicensed placeholder (Release Blocker) |
| Shareable guest URL (`?c=`), older URLs upgrade | Done |
| Asset Manifest with release-gate test; poster fallback when 3D fails | Done |
| Phone layout: bottom sheet, compact HUD | Done |
| Interface in German, English, Spanish (Phase 9b) | Done; language switch on functional screens open |

**Customer account and projects**

| Feature | State |
| --- | --- |
| Sign-in with a six-digit email code, no password, account created on first use | Gated: production needs a transactional email provider (ADR 0010) |
| Save a configuration as a Project; autosave with conflict handling; browser recovery drafts | Done |
| Versions: save, history, restore behind a safety version; rename | Done |
| Secure share links (90 days, revocable, secret only in the URL fragment); public shared view | Done |
| Account area: projects, requests, visualisations | Done |
| Archive, trash and restore of Projects | Open |

**AI photos**

| Feature | State |
| --- | --- |
| Photo of the current configuration in four scenes: capture, EU storage, Replicate (`qwen/qwen-image-2-pro`), validated result | Gated: `PHOTO_GENERATION_ENABLED` is off by decision |
| Governance: approved prompt and model releases, per-account quota, provider budget breaker, kill switch | Done |
| Webhook inbox, reconciliation on read, sweep endpoint | Gated: webhook URL, signing secret and sweep schedule need a deployment |
| Galleries per Project and per account, download, delete | Done |
| Output moderation, billed-cost evidence | Open |

**Requests and commerce**

| Feature | State |
| --- | --- |
| Quote Request on a pinned revision: contact, consent, note, reference number, listed in the account | Done |
| Notifying rotpunkt about a new request | Open (waits on the email provider) |
| Catalog, cart, checkout, payment, CRM | Not planned yet; boundaries in ADR 0006 |

**Platform**

| Feature | State |
| --- | --- |
| PostgreSQL on Neon Frankfurt with migrations; private S3-compatible storage with a deletion outbox | Done; object deletion sweep unscheduled by decision |
| Gates: lint, types, 106 unit tests, 64 database tests, production build with server-bundle check | Done, run by hand; no CI |
| Vercel project | Last deployment about five weeks old; no Sanity variables |
| Dependency security: Next.js 16.2.10 has critical advisories (fixed in 16.3.6) | In progress |
| Browser E2E tests, analytics, accessibility audit, performance budgets | Open |

## Done

- **Sanity pagebuilder and locale routing (2026-10-01 to 10-08).** Plan, decisions and the
  evidence for each phase are in the [spec](.scratch/sanity-pagebuilder/spec.md); Phases
  1–7 and 9a are done, 8 and 9b are open (see Missing).
  - Locale routing: every page lives under `app/(site)/[locale]/`. German has no prefix —
    `proxy.ts` rewrites `/x` to `/de/x` and answers `/de/x` with 308 to `/x`. `/en` and `/es`
    open only once listed in `LAUNCHED_LOCALES` (`lib/i18n.ts`, today `["de"]`); an
    unlaunched prefix is a 404 inside the site layout. `pnpm dev` opens all three
    (`OPEN_LOCALES`), and Editorial Preview may show them (`lib/locale-gate.ts`).
  - Embedded Studio at `/studio` (`app/(studio)`, its own root layout without the site CSS;
    `sanity.config.ts`), project `06g3ozu4`, private dataset `development` with synthetic
    content only. Without `NEXT_PUBLIC_SANITY_PROJECT_ID` the site runs in demo mode from
    `content/` and the Studio shows a setup notice (`sanity/env.ts`).
  - Pagebuilder: one folder per block, `blocks/<name>/{schema.ts, Component.tsx, demo.ts}`,
    listed in `blocks/schemas.ts` and `blocks/registry.tsx`, rendered by
    `components/page-builder/page-builder.tsx` with a per-block error boundary. Eight blocks
    make up the homepage (`heroFilmBlock`, `statementBlock`, `promisesBlock`,
    `materialsBlock`, `configuratorBlock`, `roomStoryBlock`, `collectionsBlock`,
    `closingBlock`); `page` and `navigation` are localized per document. The homepage and the
    header and footer navigation come entirely from Sanity; `lib/content.ts` and
    `components/sections/` are gone. TypeGen runs as `prebuild`; `schema.json` and
    `sanity.types.ts` are committed.
  - Catalog seam `features/configurator/catalog.ts`: `resolveProduct(productKey)`, the Studio
    option lists for products and finishes, preset state and pricing. Prices never live in
    Sanity; an unknown key drops link and price instead of guessing.
  - `pnpm sanity:seed` (`scripts/seed-sanity.ts`) writes the content of `content/` into
    `development` with deterministic ids, uploads the media, reads everything back through
    the site's own queries, keeps existing documents unless `--replace` is passed and refuses
    `production` without `--allow-production`.
  - Presentation tool, draft mode (`/api/draft-mode/{enable,disable}`) and live preview.
    `<SanityLive />` mounts only in draft mode and in development, so public visitors open no
    connection to Sanity, and blocks carry `data-sanity` attributes only in preview.
  - Tailwind scans `blocks/` (`889c51d`). The move had dropped 80 of 627 selectors and
    collapsed the hero while the markup stayed identical; `lib/tailwind-content.test.ts`
    guards it, and rendering checks now compare CSS and screenshots, not only markup.
  - Language switch in the header and the phone menu (`lib/language-links.ts`,
    `components/design-system/language-switch.tsx`). It lists only locales the visitor can
    open, so it stays hidden publicly until English and Spanish launch.
  - English and Spanish homepage and navigation (Phase 9a): transcreated copy in
    `content/home/{en,es}.ts`, seeded into `development` and linked as translations; the
    interface words on editorial pages in typed dictionaries `lib/messages/{de,en,es}.ts`.
  - The configurator HUD chips sit on solid soot (`chip-solid`) instead of frosted glass
    (2026-10-08).
  - Functional screens in three languages (Phase 9b, `4611243`, 2026-10-15): configurator,
    shared view, sign-in and account, Anfrage, 404 and `AppHeader` read their words from
    `lib/messages/{de,en,es}.ts` through `LocaleProvider` / `useMessages()`. API routes
    answer `{ code }` (`lib/api-errors.ts`) and the screens word the code; links, return
    paths and share links keep the locale; the sign-in email follows the page
    (`x-site-locale`). Evidence and the remaining steps are in the spec's Phase 9 section.

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
  Poly Haven's "Brown Photostudio 02" HDRI (CC0, supplied 2026-09-03, downsampled to 1k as
  `public/hdri/brown-photostudio-02.hdr`) lighting both the studio and the kitchen in the
  Appartement (the baked `appartement2_pano.hdr` is retired; the bake script can regenerate
  it); Poly Haven's "Wooden Floor 01" (CC0, 2k diffuse/normal, 1k roughness in
  `public/textures/wood-floor-*.jpg`) as the studio's reflective floor and as a lit floor
  plane over the Appartement's baked one, with AccumulativeShadows in both scenes (the
  furniture casts too). Constraint learned the hard way: every RandomizedLight adds a shadow
  sampler to every lit material; a front with map, normal, roughness and environment holds
  five of the sixteen guaranteed units, so keep `amount` at six. Surface tiles from
  `scripts/generate-studio-assets.py` (`public/textures/*`), AccumulativeShadows on a
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
- Homepage sections (built 2026-09-03 in `components/sections`, blocks under `blocks/` since
  2026-10-02): `SignatureHero` (the supplied hero film, a
  15-second silent loop transcoded with ffmpeg into `public/video/hero-1080.mp4` (8 MB,
  ≥768 px) and `hero-720.mp4` (2 MB, phones), poster `public/images/hero-poster.jpg` from
  the same film; fade from black, still for reduced motion, "Den Film ansehen" goes
  fullscreen; headline
  "Küchen, auf den Punkt." rescued from the first site), `Manifest` ("Eine
  Küche ist kein Möbel…" rescued; the one scroll-linked sequence: words light up on scroll),
  `SignaturePromises` (each promise opens a detail card that morphs out of its "+" trigger
  via a shared layoutId), `MaterialCards` (four fronts incl. Porzellan as a colour card;
  tilt toward the pointer; detail cards with facts, the real surcharge from the product
  definition and a deep link that opens the configurator with that front chosen; band on
  phones), `ConfiguratorTeaser` (living HUD, real default price, "Von 0 auf 100 °C in vier
  Klicks" spring counter, four-step explainer overlay), `RoomStory` ("Ihr Raum. Ihre Küche."
  rescued: Studio, Appartement, KI-Foto, Versionen & Links), `CollectionLines` (captions
  rescued as badges), `ClosingStatement`. The copy lived in `lib/content.ts`; it is Sanity
  content now, with the demo copy in `content/`. No Impressum/Datenschutz pages exist yet,
  so the footer carries no legal column.
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
- Added a Sanity adapter stub in `features/configurator/adapters/sanity.ts` (superseded: the
  queries are the adapter, see Missing).
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
pnpm exec tsc --noEmit                     # clean
pnpm test                                  # 100/100
pnpm test:db                               # 64 passed, 1 skipped (needs TEST_DATABASE_URL or Docker)
TRANSACTIONAL_EMAIL_PROVIDER= pnpm build   # green; prebuild runs TypeGen, postbuild checks the server bundle
```

With the Sanity project in `.env.local`, the build reads `06g3ozu4/development` through the
Viewer token (`SANITY_API_READ_TOKEN`); without `NEXT_PUBLIC_SANITY_PROJECT_ID` it builds in
demo mode.

The build override is required, not optional. `.env.local` sets
`TRANSACTIONAL_EMAIL_PROVIDER=development-capture`, and the development capture adapter
refuses to initialize under `NODE_ENV=production` ("Development email capture cannot run
in production"), which fails page-data collection. Unsetting the variable selects the
fail-closed `unavailableDelivery`, which builds. A plain `pnpm build` therefore fails —
by design, per ADR 0010, but it surprises anyone who has not read this note.

Since 2026-09-04 a test deployment (Vercel preview or a QA project) can keep the capture
adapter in a production build by also setting
`ALLOW_DEVELOPMENT_EMAIL_CAPTURE_IN_PRODUCTION=true`. Login then shows the six-digit code
on screen and no mail is sent. Captures live in `app.development_email_capture`
(migration `20260904120000`), because Vercel serves the send and the read-back from
different function instances; the database used by that deployment must have the
migration applied. The flag must never be set on the customer-facing production project.

Production-build defect found 2026-09-08 on the Vercel preview: every poll of a finished
photo job returned 500. The minifier (SWC via Turbopack) dropped the code after the
`switch` in the Replicate adapter's `inspect` — the download-and-return success path —
because every other case returned; dev builds run the source unminified and never showed
it. `inspect` now reaches the success path through a plain call (`readSucceeded`), the
reconcile path treats a missing outcome as "unchanged" instead of throwing, the poll route
answers with the last known state when reconciliation throws, and `postbuild`
(`scripts/verify-server-bundle.mjs`) fails any build whose server bundle lacks that path.

## Deployment

Updated 2026-10-16.

- **Vercel Production is a test environment for now** (Martin, 2026-10-16). It carries test
  settings on purpose: `TRANSACTIONAL_EMAIL_PROVIDER=development-capture`, and the Sanity
  `development` dataset (`NEXT_PUBLIC_SANITY_PROJECT_ID`, `NEXT_PUBLIC_SANITY_DATASET`). A
  production build also needs `ALLOW_DEVELOPMENT_EMAIL_CAPTURE_IN_PRODUCTION=true` (without it
  the capture adapter refuses the build) and `SANITY_API_READ_TOKEN` (the dataset is private);
  `OPEN_ALL_LOCALES=true` opens English and Spanish there too. With the capture flag, anyone
  holding the URL can sign in as any address with the on-screen code, against the database
  previews also use. **Before real customers:** remove the capture flag and
  `OPEN_ALL_LOCALES`, set a real email provider (ADR 0010), switch to the `production`
  dataset after the DPA review, and give production its own database and storage bucket.
  This is the release-gate item under Roadmap M2.
- Previews: the same test settings apply to every preview branch (`OPEN_ALL_LOCALES`,
  capture sign-in, Sanity `development` with a Viewer token). Previews are public — no Vercel
  Authentication.
- The project is linked to `DefinitionGroup/RDDOT-3Dwebsite` (production branch
  `redesign/devstart`), but **Git preview deployments are switched off**
  (`previewDeploymentsDisabled`), so pushes to feature branches build nothing. Deploy with
  `vercel deploy` from a clean checkout of the commit. Settings scoped to a single branch do
  not reach CLI deployments at runtime, which is why the test settings are set for all
  previews. Turning Git previews and Deployment Protection on needs a team Owner or Member;
  the CLI account `sanity-mngt-definition` is a Developer.
- Latest preview: https://rddot-3-dwebsite-hlzrjxfmv-definitiongroup.vercel.app (`917f5b3`,
  2026-10-15): sign-in with the on-screen code, `/en` and `/es` from Sanity, the language
  dropdown and the configurator verified. Production still serves the September deployment.
- `TEST_DATABASE_URL` is also set on Production, and `DATABASE_URL*` and `OBJECT_STORAGE_*`
  are one value for Preview and Production.
- Since `f29e28b` (2026-09-04) auth follows the Vercel deployment URL when `BETTER_AUTH_URL`
  is unset: the production domain in production, the deployment URL in previews.

## Open Working Tree

None. `next-env.d.ts` may show as modified; that is the generated-file churn under Known
Warnings, not work.

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
- `package.json` pins `next`, `react`, `react-dom` and `motion` to `latest` (and, among the
  dev dependencies, `typescript`, `@types/node`, `@types/react`, `@types/react-dom` and
  `eslint-config-next`). Only `pnpm-lock.yaml` holds them (today Next 16.2.10, React 19.2.7,
  motion 12.42.2), so a lockfile refresh can move a major version without a visible diff.
  Pin real ranges before production hardening.
- `@portabletext/editor` (pulled in by `sanity`) asks for React ≥ 19.2.8 while the repo
  resolves 19.2.7. Harmless so far; revisit if the rich-text input misbehaves.

## Missing

- Sanity on Vercel: the variables and the publish webhook of spec Phase 7b (the list is in
  the spec). Until the webhook is configured, a deployed site shows published edits only
  after a rebuild; redirects take up to a minute per server instance.
- Sanity, spec Phase 8: ADR 0013 (the queries are the adapter, amending ADR 0007),
  `SANITY.md` and `blocks/CONTRACT.md`.
- Locales, rest of spec Phase 9b: Martin or a native speaker reviews the English and
  Spanish copy (editorial and functional); the language switch joins the functional screens;
  then English and Spanish join `LAUNCHED_LOCALES`. Until then `/en` and `/es` are 404 in
  production. Revision snapshots are still written in German; their product and finish
  names are translated on display only.
- The Presentation tool itself has not been exercised with a Studio login. Draft mode, live
  preview and the preview data attributes were verified without it.
- The hero film and its poster load straight from `cdn.sanity.io` in the visitor's browser
  (images go through `/_next/image`). An item for the ADR 0007 review, which also gates the
  `production` dataset.
- The `richText`, `faq` and `media` blocks are not built; `richText` waits for the real
  Impressum and Datenschutz text.
- The `configuratorBlock` is a teaser with a deep link; the inline live-3D variant is a
  later slice.
- The configurator's product data stays in code by design (ADR 0007); `catalog.ts` is the
  seam a Release Bundle replaces later. The pre-ADR 0007 stub
  `features/configurator/adapters/sanity.ts` is imported nowhere and still waits to be
  removed (spec §4).
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
- Use document-level localization for page-builder pages (`page`, `navigation`).
- Use field-level localized labels for small shared configuration metadata.
- Keep the configurator isolated as a smart component inside the Next.js app.
- The configurator joins pages as `configuratorBlock`, which carries editorial presentation
  and a `productKey`; rules and prices stay in code.
- Keep product definitions portable:
  - Sanity can own the editorial/product metadata first.
  - The same product definition should be exportable as JSON later.
  - Pricing should stay replaceable by a real commerce service.
- Do not copy the `defgrp-3d-configurator` implementation directly; use it as interaction and camera inspiration only.
- Keep the first prototype limited to one straight-line kitchen with cabinet/front color options.

## Roadmap (from 2026-10-15)

This section is the plan. Each milestone lists engineering work (a Claude session can
take it) and what only Martin can supply or decide. Earlier sequences — the 2026-09-02
"confirmed sequence", the photo storage track, PLAN.md Phases 0–5 — are done or folded
in below; their history is in git and in the Done section.

### M0 — In flight

- Dependency security: Next.js to a patched 16.x, `sharp`, `undici`, `vitest`; real version
  ranges instead of `latest`. (Session running.)
- Language switch on the functional screens (configure, konto, anfrage). (Proposed.)

### M1 — A reviewable preview

- Merge M0, run every gate, then deploy a Vercel preview of `cc/devstart-sanity` with the
  Sanity variables for `development`, `SANITY_REVALIDATE_SECRET` and its webhook (spec 7b),
  and the on-screen login code for this branch. Changing Vercel settings needs Martin's
  go-ahead.
- Spec Phase 8: ADR 0013, `SANITY.md`, `blocks/CONTRACT.md`; delete the unused
  `features/configurator/adapters/sanity.ts` stub.
- Try the Presentation tool with a Studio login.
- *Martin:* review the preview; review the English and Spanish copy.

### M2 — German production launch (the Production Release Gate)

Engineering:
- Transactional email provider adapter once chosen (ADR 0010), then the outbox consumer
  that tells rotpunkt about each Quote Request.
- `richText` block, Impressum and Datenschutz pages, legal column in the footer.
- Re-bake the Appartement from an owned scene (`scripts/bake-appartement2.py`) and give it
  a manifest; until then it cannot ship.
- Data protection: schedule the object deletion sweep or sign a retention policy so account
  deletion reaches storage; the retention sweep for abandoned and finished captures.
- Photos, if they launch: webhook URL, signing secret and a scheduled sweep on Vercel; the
  output moderation gate; billed cost against the estimate; then switch generation on.
- CI on every push (lint, types, unit, DB, build) and a Playwright smoke path: homepage →
  configurator → change → save → share → request.
- Production Vercel environment: it runs as a test environment until then (see
  Deployment). Remove `TEST_DATABASE_URL`, the capture flag, `OPEN_ALL_LOCALES` and the
  `development` dataset settings; set the production domain. Give production its own database and its own storage bucket
  and least-privilege key: today `DATABASE_URL*` and every `OBJECT_STORAGE_*` variable is one
  value shared by Preview and Production, which ADR 0011 rules out.
- Storage operations from ADR 0011: backup path and a restore drill for the RustFS
  deployment, encryption at rest and credential rotation recorded.
- Accessibility audit and performance budgets for the 3D scene and the homepage film.

*Martin:* Impressum and Datenschutz texts; the email provider choice; an owned or licensed
Appartement scene; the DPA and transfer reviews (Sanity, Replicate) that open the
`production` dataset; a decision on the world-readable `public` bucket; residency evidence
for `ecomstorage.rotpunkt.ai`; whether AI photos are part of the launch.

### M3 — English and Spanish launch

- Native review signed off, then `LAUNCHED_LOCALES` = de, en, es (`hreflang`, sitemap and
  robots follow it) and a smoke test of all three.
- Store revision snapshots language-neutral (keys, not labels) if historical versions must
  read fully in the visitor's language.

### Later

- Inline live-3D `configuratorBlock` variant; `faq` and `media` blocks.
- Project archive, trash and restore (then revisit automatic object deletion).
- The selected photo on a Quote Request; load-more for older requests in the account.
- Analytics for configurator interactions.
- Product Definition Drafts and Release Bundles; a real catalog, pricing service, cart,
  order, payment and CRM behind the ADR 0006 boundaries.
- Further kitchen layouts beyond the straight line.
- The Three.js deprecations (`THREE.Clock`, `PCFSoftShadowMap`).

## Docs Still Needed

- `README.md`: how to run, build, verify, and understand the project at a glance.
- `ARCHITECTURE.md`: app architecture, route strategy, feature boundaries, Sanity/page-builder strategy, and commerce escape hatches.
- `SANITY.md`: Studio setup, dataset strategy, schema ownership, preview/live editing, agentic workflow notes, and migration rules (spec Phase 8, with `blocks/CONTRACT.md`).
- `CONTENT_MODEL.md`: page-builder block model, page fields, product definition fields, localization approach, and editor rules.
- `LOCALIZATION.md`: supported locales, default locale behavior, slug rules, fallback rules, and copy workflow.
- `CONFIGURATOR_CONTRACT.md`: product definition shape, URL state shape, pricing assumptions, validation rules, and future JSON export contract.
- `COMMERCE_ROADMAP.md`: fake checkout now, cart/quote/order/payment later, and boundaries between Sanity and commerce systems.
- `3D_PIPELINE.md`: model formats, asset optimization, camera presets, material naming, performance budgets, and QA procedure.
- `QA.md`: manual QA checklist plus automated Playwright coverage plan.
- `ACCESSIBILITY.md`: keyboard behavior, focus states, reduced motion, contrast, forms, and configurator-specific a11y decisions.
- `PERFORMANCE.md`: Core Web Vitals targets, 3D budgets, image budgets, lazy loading, and monitoring.
- `DECISIONS.md` or `docs/adr/*`: short architecture decision records for key choices.
