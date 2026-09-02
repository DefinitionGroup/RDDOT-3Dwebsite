# rotpunkt Signature Status

Last reconciled: 2026-09-02
Working branch: `cc/devstart-002` — the main development branch from 2026-09-02, cut from
`cc/devstart-001` at `6640d45` (23 commits ahead of `redesign/devstart`). `cc/devstart-001`
is frozen at that commit; it is not merged back and does not need to be.

Gates at reconciliation: `pnpm test` 54/54 (now covers `features` and `lib`), `pnpm test:db`
40/40 (Neon), `pnpm lint` clean, `tsc --noEmit` clean, production build green. The build only passes with `TRANSACTIONAL_EMAIL_PROVIDER`
**unset** — with the local `development-capture` value it fails closed by design
(ADR 0010). See Build & Verification Gates below.

## Current Goal

Deliver a German-first, branded kitchen configurator that lets a private customer move from a shareable guest configuration to a durable Project, while preserving the approved boundaries for identity, releases, future AI photos, Quote Requests, Sanity, and commerce.

## Done

- Built the first Tailwind/Next.js design system pass from the Figma directions.
- Added reusable design-system components:
  - `BrandLogo`
  - `SiteHeader`
  - `SignatureButton`
  - `CartIndicator`
  - `CollectionStep`
  - `ImagePanel`
  - `SectionHeading`
  - `FeatureList`
- Built homepage sections:
  - `SignatureHero`
  - `CollectionCompare`
  - `MaterialRhythm`
  - `ProductStory`
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

## Current Slice Verified (module configurability, slices S1-S5)

- Geometric parity of the segmented module composition against the previous monolithic model: per-mesh world AABBs within 1e-6, close-up view pixel-identical.
- The default v2 configuration reproduces the historical total of 10.103 € to the cent; every finish combination matches its v1 total (unit-tested); layout changes reprice exactly (verified by hand and in the browser: module removal 9.722 €, compact layout 5.899 €, big/device/device/big with large island 10.470 €).
- Edit Session verified end-to-end in the production build: Verwerfen rolls back, Übernehmen commits into URL/autosave, committed-config actions hide while staged; the holo treatment, 3D selection, ghost slots, and module strip all operate; the flow also survived unscripted human interaction in the live pane.
- Appliance fronts render in device cabinet niches with the dedicated appliance role.
- `pnpm test` 39/39, `pnpm test:db` 8/8 against the Neon test database, `pnpm lint` and production build green throughout; each slice committed separately.

**Partially covered:** the scene bar as the Edit Session interface (`913b27d`) and
drag-and-drop module reordering (`bf727e3`) were exercised in the production build with
scripted pointer events (a drag across three slots committed the layout
`device,small,big,small,small,small,device,big` into the URL and the geometry followed),
but not by a human hand in a live pane, and the earlier arrow-button rearrangement they
replaced is gone. A hands-on pass is still owed before merging to `redesign/devstart`.

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
- The Appartement2 environment is a development placeholder: the source scene is BlendSwap asset #86344 ("Living-room."), CC0 but marked Fan Art with commercial use prohibited. The bake pipeline (`scripts/bake-appartement2.py`) is asset-agnostic — swap in an owned or licensed .blend and re-bake before any production release. Recorded here so the Production Release Gate cannot miss it.

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
- No real product catalog, SKU model, pricing engine, cart, checkout, order, CRM, or payment integration exists yet.
- The checkout page is a visual fake checkout only and performs no submission.
- The configurator assets are still prototype-grade under ADR 0009. `kitchen-modules.glb` carries semantic roles as baked mesh-name conventions, not as an immutable, content-hashed Asset Manifest with explicit role-to-node mappings, checksums, budgets, approved cameras, and declared fallbacks. Missing required roles are not yet a release-blocking validation. This is the gap between the working prototype and the production 3D baseline.
- The AI photo feature is application-owned (Photo Job Module, EU object storage, owner scoping, kill switch) but still calls the provider synchronously from `POST /api/photo-jobs/[jobId]/run`, so a job does not survive browser closure and holds the request open for the duration of generation. PLAN.md Phase 3 (predictions + webhook + reconciliation) and Phases 4–6 remain. No generation has yet been observed end to end with the flag on; the data-URI transport that was the leading suspect for provider rejections is gone, but the fix is unconfirmed until one controlled paid run.
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

1. **Hands-on verify the Edit Session tail** — scene bar interface and drag reorder — in a
   live pane. Decided 2026-09-02: development continues on `cc/devstart-002` rather than
   merging back into `redesign/devstart`.
2. **One controlled paid generation** with `PHOTO_GENERATION_ENABLED=true` to confirm that
   the Blob upload resolves the provider failures. Enabling the flag spends credits and is
   an explicit decision; the adapter now records enough (reason code, prediction id, logged
   provider detail) that a single run is diagnostic either way.
3. **Act on the design critique** (`.impeccable/critique/2026-09-02T14-39-10Z__app-page-tsx.md`,
   23/40): its P0 is the inert `/checkout` — a submit-looking endpoint with no submission,
   reachable without a Project, labelled "Fake Checkout". Either gate it or build the quote
   vertical slice (labelled fields, consent, validation, authenticated Project + immutable
   revision, success and error states). Cheapest credibility win: drop the cart metaphor now.

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
7. PLAN.md Phase 3: replace the synchronous provider call with predictions plus
   webhook, an idempotent inbox, and reconciliation. Until then a job does not survive
   browser closure (gap G2), and `POST /api/photo-jobs/[jobId]/run` holds the request
   open for the duration of generation.

### Then choose one track

The repo currently carries two roadmaps that do not reference each other: the platform/
content track below and PLAN.md's AI-photo Phases 1–6. They compete for the same time.
**Recommended: finish the configurator/3D arc first** — momentum is there, the Edit
Session just landed, and ADR 0009 already specifies what production assets must satisfy.
Sanity is a large new surface (schema, client layer, localization routing, page-builder
blocks) that will stall the configurator once opened. Note that AI-photo Phase 6 is
calendar-driven (DPA and transfer-mechanism review), so the legal thread is worth
starting in parallel with whichever engineering track wins — it costs no engineering time.

**Track A — configurator to the ADR 0009 production baseline**

1. Replace mesh-name role conventions with a real Asset Manifest: explicit role-to-node
   and material-slot mappings, content hashes, transfer/GPU/triangle/draw-call budgets,
   approved cameras, declared fallbacks. Missing required roles must block release rather
   than fall back heuristically.
2. Add the Deterministic Visual Fallback path for unsupported or unstable sessions.
3. Replace the Appartement2 placeholder asset (see Release Blockers) and re-bake.
4. Add a Zod schema for product definitions and URL configuration state.
5. Add performance budgets and capability-based Quality Profiles.

**Track B — platform and content**

1. Remaining Project lifecycle: Archive, Trash, restore, and the relevant UI.
2. Locale route structure for `/`, `/en`, `/es`.
3. Sanity schema set: site settings, page, localized slug, page-builder blocks, product
   definition, configurator block.
4. Sanity client layer and typed query boundary.
5. Replace `lib/content.ts` homepage content with Sanity-ready data shapes.
6. Add the configurator smart component as a page-builder block renderer.

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
