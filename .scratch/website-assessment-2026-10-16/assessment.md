rotpunkt Signature website assessment
16 October 2026 · Branch `cc/devstart-sanity` · Commit `0c9b45e`

**Overall assessment**

The website is an advanced functional prototype with a coherent visual identity and substantial application infrastructure. It is suitable for supervised product and design review. The First Production Release remains blocked by conversion-flow defects, incomplete operational delivery, missing legal content and unresolved asset and environment gates.

The strongest work is the modular configurator and the separation of editorial content, customer data, revision history and future commerce. The weakest point is continuity from an anonymous kitchen configuration into a saved Project and an actionable request. Visual polish is ahead of the service customers are promised.

This assessment compares the current checkout with STATUS.md, CONTEXT.md, the Sanity plan, the production architecture map, relevant ADRs and implementation files. Browser observations cover desktop at 1440 × 1000 and mobile at 390 × 844, plus a production-build configurator capture at 1280 × 720. “Browser verified” means exercised in this run; “implemented” means source inspected; “documented” means recorded in the repository and not independently reverified against the deployed service.

**Where the product stands**

| Area | Current implementation | Assessment |
| --- | --- | --- |
| Marketing website | Eight Sanity Page Blocks, film hero, materials, brand story, collection cards, configurator teaser, closing, editable navigation and footer | Visually coherent and reviewable. Several promises exceed current capability. |
| Content management | Embedded Studio; document-localized pages/navigation; settings; typed queries; draft preview; signed publish webhook; demo fallback when Sanity is unconfigured | Strong foundation. Editor handoff, missing blocks, production dataset and deployment wiring remain incomplete. |
| Kitchen configuration | One modular straight line, three wall-module types, three cabinet finishes, four fronts, island presets, add/remove/reorder/swap, width/type constraints | Real functionality. Material changes and adding a module were browser verified. It is not yet a manufacturing or room-planning system. |
| 3D presentation | Studio, Appartement and Loft; camera presets; Loft outlook choices; reflections; semantic kitchen manifest and fallback | Studio and Loft render. Panel overlap and framing need refinement. Room licences and manifests remain launch gates. |
| Price indication | Itemized calculation from module quantities and finish weights, plus VAT | Implemented prototype calculation. Surcharge presentation is inconsistent with gross totals. Commercial approval and authoritative pricing are later boundaries. |
| Guest URLs | Compressed `?c=` state, normalization and older-state handling | Material deep linking and URL updates work. Sign-in handoff does not preserve the import intent correctly. |
| Authentication | Better Auth email OTP; application-owned identity; database sessions/rate limits; development capture | Implemented for testing. A real production delivery adapter is absent. |
| Projects | Creation/import, autosave, optimistic conflict checks, browser recovery, rename | Substantial code and contract coverage. Fresh guest import has a source-confirmed redirect defect; do not call the whole journey complete. |
| Versions | Immutable checkpoints, history, restore with a safety checkpoint | Implemented; authenticated lifecycle was not rerun in this browser audit. |
| Sharing | Public guest URLs; private Project revision links with hashed secret, expiry and revocation | Implemented with a thoughtful privacy boundary. New secure-link creation/resolution was not rerun here. |
| AI photos | Capture/upload/job submission, provider adapter, reconciliation, galleries, download/delete, quotas, budget limits and kill switch | Substantial implementation; production activation remains conditional. Local generation flag is ON, contrary to the inventory. No paid generation was triggered. |
| Quote Requests | Owner-scoped request against a revision; server-calculated indication; contact/consent/note; idempotency; reference; account history | Record creation is implemented. Business notification has no consumer, so the commercial service is incomplete. |
| Languages | German, English and Spanish dictionaries/editorial content; locale-preserving links | German is the only launched locale. English homepage → configurator was browser verified in development. Functional screens lack the language switch. |
| Commerce | No catalog/SKU operations, cart, payment, Order or CRM integration | Intentional per ADR 0006. The First Production Release ends at Quote Requests; checkout should not be added merely to “complete ecommerce.” |
| Operations | Database migrations, private object-storage adapter, deletion outbox, manual checks | CI, automatic browser regression coverage, scheduled workers and launch evidence are unfinished. |

Sources: [STATUS.md](/Users/martin/DEV/RDDOT-3Dwebsite/STATUS.md:39), [commerce decision](/Users/martin/DEV/RDDOT-3Dwebsite/docs/adr/0006-stage-commerce-behind-capability-specific-boundaries.md), [product definition](/Users/martin/DEV/RDDOT-3Dwebsite/features/configurator/product-definition.ts:138), [asset manifest contract](/Users/martin/DEV/RDDOT-3Dwebsite/features/configurator/modules/asset-manifest.ts:5), [Quote Request decision](/Users/martin/DEV/RDDOT-3Dwebsite/docs/adr/0012-application-owned-quote-requests.md).

**Highest-priority findings**

1. **High — Guest saving loses its import context at sign-in.** The configurator sends `intent=save&import=<id>&c=<configuration>` to the account page. The unauthenticated account page derives `returnTo` only from `next`, defaults to bare `/konto`, and the OTP success handler replaces the URL with that destination. The import code subsequently needs the discarded parameters. The visible “Zum Konfigurator” back link also goes to bare `/configure`, which opens the default kitchen. Preserve a validated save intent through authentication and return to the saved Project or original request. Verify with a fresh guest session and a distinctive non-default configuration. Browser verified: entry URL contains the parameters and back link omits them. Source-confirmed: success redirect discards them. A full OTP sign-in was not performed.

   Evidence: [save action](/Users/martin/DEV/RDDOT-3Dwebsite/features/configurator/ui/configurator-shell.tsx:436), [account return routing](/Users/martin/DEV/RDDOT-3Dwebsite/app/(site)/[locale]/konto/page.tsx:28), [import and authentication branches](/Users/martin/DEV/RDDOT-3Dwebsite/app/(site)/[locale]/konto/page.tsx:97), [OTP success redirect](/Users/martin/DEV/RDDOT-3Dwebsite/features/customer-accounts/ui/account-access.tsx:107). Screens 8–9.

2. **High — A successful request does not yet reach an operating sales workflow.** Submission writes a durable `quote-request.submitted` outbox entry, but there is no consumer to notify rotpunkt. The confirmation says the planning team will review and contact the customer. The record exists, but the promised response is not operationally delivered by this application. Implement delivery, retries and failure visibility, and identify who processes requests. Keep confirmation wording aligned with that actual process.

   Evidence: [outbox write](/Users/martin/DEV/RDDOT-3Dwebsite/lib/server/db/quote-requests-postgres.ts:315), [customer promise](/Users/martin/DEV/RDDOT-3Dwebsite/lib/messages/de.ts:357), [documented gap](/Users/martin/DEV/RDDOT-3Dwebsite/STATUS.md:573). Request entry is screen 10; authenticated confirmation was reviewed in code.

3. **High for launch — Real authentication delivery and isolated customer environments are missing.** The email composition root supports only development capture or unavailable delivery. STATUS.md records public test previews and shared Preview/Production database/storage settings, with Vercel Production intentionally treated as a test environment. That is a documented testing decision, not evidence of readiness for real customers. A customer launch needs a real mail provider, capture and locale test overrides removed, separate production resources, and verified access/retention/restore arrangements. Deployed settings were not queried in this assessment.

   Evidence: [email composition](/Users/martin/DEV/RDDOT-3Dwebsite/lib/server/transactional-email/delivery.ts), [deployment facts and release conditions](/Users/martin/DEV/RDDOT-3Dwebsite/STATUS.md:456), [ADR 0010](/Users/martin/DEV/RDDOT-3Dwebsite/docs/adr/0010-defer-transactional-email-provider.md).

4. **Medium — Material surcharges use a different tax basis from the displayed total.** “Nussbaum Memory” advertises €580 extra. The default total is €10,103.10; with that finish it is €10,793.30, an increase of €690.20. The material card formats the raw pre-tax delta while the configurator adds 19% VAT. Use one customer-facing basis and make layout-dependent surcharges clear. The issue is presentation consistency; this is not a legal assessment.

   Evidence: [material-card price](/Users/martin/DEV/RDDOT-3Dwebsite/blocks/materials/Component.tsx:41), [catalog pricing](/Users/martin/DEV/RDDOT-3Dwebsite/features/configurator/catalog.ts:69), [VAT calculation](/Users/martin/DEV/RDDOT-3Dwebsite/features/configurator/product-definition.ts:490). Screens 2–3 and 14.

5. **Medium — Marketing describes capabilities the current journey does not provide.** “In Ihrem Raum” suggests the customer's own room, but current views and photo choices are supplied environments; no customer-room upload or spatial measurement workflow was found. “Ein Planer … persönlich, nicht per Formular” conflicts with an account-gated form and the missing notification path. Agile and Exclusive Line both lead to the same configurator without a selected line. Three planning stages, “four decisions” and “four clicks” also compete as explanations. Align these promises around the actual offer: explore a kitchen, save a Project, request a review.

   Evidence: homepage DOM captured this run, [photo scene presets](/Users/martin/DEV/RDDOT-3Dwebsite/features/configurator/photo/photo-presets.ts), [single-product catalog](/Users/martin/DEV/RDDOT-3Dwebsite/features/configurator/catalog.ts:17), [request entry](/Users/martin/DEV/RDDOT-3Dwebsite/app/(site)/[locale]/anfrage/page.tsx). Screens 1, 10–11.

6. **Medium — Modal focus is not contained.** In the material detail dialog, Shift+Tab moved from Close to the backdrop and then outside the modal while it remained open. DetailCard and Overlay focus Close and handle Escape, but implement neither a focus loop nor background inertness. GlassSegments also declares tabs without arrow-key/roving-tabindex behavior. Add reliable dialog focus containment/restoration and use complete tab semantics, or use an appropriate button-group pattern.

   Evidence: [DetailCard focus handling](/Users/martin/DEV/RDDOT-3Dwebsite/components/design-system/detail-card.tsx:101), [Overlay](/Users/martin/DEV/RDDOT-3Dwebsite/components/design-system/overlay.tsx:61), [segmented controls](/Users/martin/DEV/RDDOT-3Dwebsite/components/design-system/glass.tsx:70). Screen 2. Full screen-reader and keyboard coverage remains open.

7. **Medium — The canvas composition does not consistently protect the product view from UI.** The desktop panel obscures a substantial part of the kitchen in tested views, while controls occupy multiple corners. Loft's light walls reduce the legibility of the white wordmark and top-right price. Mobile has no horizontal overflow, but the sheet takes roughly the lower 45% of the viewport and room/camera controls consume more of the remaining scene. Frame the kitchen against the available unobstructed area; ensure a clear overall view before detail views; give over-scene text a dependable contrast treatment. This is a visual assessment of the captured states, not a claim that camera controls fail.

   Evidence: screens 3–7, 13–14; [camera presets and viewport selection](/Users/martin/DEV/RDDOT-3Dwebsite/features/configurator/engine/kitchen-scene.tsx:162), [configurator composition](/Users/martin/DEV/RDDOT-3Dwebsite/features/configurator/ui/configurator-shell.tsx). Production screen 14 confirms panel occlusion without the development toolbar.

8. **Medium — Trust and accessibility content remains incomplete.** `/impressum` and `/datenschutz` both return 404 in the local production build. The footer has no legal column, and request consent is plain text without a privacy-policy link. The background film plays without a visible pause control; the “watch film” action requests fullscreen on the same muted video. Reduced-motion handling exists, but it does not replace user playback controls. Review muted text and labels against changing film/room backgrounds and test zoom, keyboard navigation and assistive technology.

   Evidence: production route checks; [consent markup](/Users/martin/DEV/RDDOT-3Dwebsite/features/quote-requests/ui/quote-request-form.tsx:226), [hero film behavior](/Users/martin/DEV/RDDOT-3Dwebsite/blocks/hero-film/hero-film-view.tsx:68). Screens 1, 6, 11. No WCAG compliance conclusion is claimed.

**UI and UX assessment**

The established “rotpunkt after dark” direction is worth preserving. Full-bleed kitchen imagery gives the homepage a clear visual anchor. Manrope and Instrument Serif create a consistent hierarchy, red focuses the main actions, and the material details connect editorial information to an actual configured state. Motion has identifiable jobs: staged entrances, expanding details and selected-state feedback.

The brand itself is still largely confined to the header. The hero's largest signal is “Küchen, auf den Punkt.” If the navigation were removed, the composition could represent another premium kitchen brand. Strengthen the rotpunkt Signature presence within the existing composition. This is a refinement of the approved direction, not a reason for a redesign.

Material exploration is the clearest part of the experience: understandable options, selected states, immediate rendering changes and linked pricing. The live model, however, looks more like a configurable prototype than the finished photographed kitchens: empty appliance/sink areas and simplified geometry create a fidelity gap. Ensure imagery, descriptions and any future orderable specification agree.

Planning stages provide useful structure, but their relationship to the data-sheet accordions is indirect: “Prüfen” relates to price and project actions, “Aufbau” is separate from “Aufstellung,” and saving is nested under “Speichern & Teilen” while requesting is always prominent. Make the next step explicit for a first-time guest. The request route currently begins with generic sign-in copy; it does not first show what kitchen is being requested or explain the remaining steps.

The mobile adaptation is real, not simply a compressed desktop. The bottom sheet, full-screen menu and large primary actions work. Tested homepage, configurator and sign-in widths had no horizontal overflow. Remaining work is visibility and continuity: enough scene exposed during decisions, no disappearing guest configuration, clear copy about account requirements, and a language control on functional screens.

**Code and architecture assessment**

The application has meaningful depth beyond UI components. Projects use optimistic versions and recovery drafts; revision checkpoints preserve historical configuration; sharing uses a fragment secret rather than embedding account access; Quote Requests pin an immutable revision and calculate price context on the server. These are appropriate foundations for the intended product.

Editorial blocks, localized dictionaries and application modules are sensibly separated. Sanity queries adapt documents into component data, and pricing remains outside the CMS. The code also includes useful failure behavior: explicit API error codes, per-block boundaries, scene fallback, unsupported-version refusals and photo reconciliation.

The main engineering weakness is verification across module boundaries. Unit and database contracts cannot establish that a guest reaches a saved Project after authentication. The large configurator shell coordinates editing, rendering, URLs, persistence, sharing and AI operations; this makes a browser journey test particularly valuable. Prefer narrowly extracting behavior when it has a stable responsibility rather than restructuring the whole application.

The kitchen manifest already enforces asset hashes, semantic roles and transfer/triangle/draw-call limits. Therefore “there are no performance budgets” is too broad. The missing layer is measured whole-experience performance: device capability profiles, frame-time and GPU memory targets, room assets, film transfer, Core Web Vitals and real-device evidence. Local hero files are approximately 8.3 MB and 2.6 MB; local room GLBs are approximately 0.9–1.2 MB and the kitchen modules about 1.4 MB. Those file sizes do not establish runtime performance.

Sources: [autosave](/Users/martin/DEV/RDDOT-3Dwebsite/features/projects/ui/use-project-autosave.ts), [sharing persistence](/Users/martin/DEV/RDDOT-3Dwebsite/lib/server/db/sharing-postgres.ts), [request transaction](/Users/martin/DEV/RDDOT-3Dwebsite/lib/server/db/quote-requests-postgres.ts:243), [CMS loaders](/Users/martin/DEV/RDDOT-3Dwebsite/sanity/lib/loaders.ts), [asset release tests](/Users/martin/DEV/RDDOT-3Dwebsite/features/configurator/modules/asset-manifest.test.ts), [render pipeline](/Users/martin/DEV/RDDOT-3Dwebsite/features/configurator/engine/configurator-canvas.tsx).

**Documentation reconciliation**

| Existing statement | Current evidence |
| --- | --- |
| AGENTS.md describes `kitchen-line.glb`, shared-material heuristics and mostly color changes | Runtime uses `kitchen-modules.glb`, a semantic manifest and modular layout editing. Guidance understates current functionality. |
| AGENTS.md describes a fake checkout | `/checkout` redirects to `/anfrage`; a persisted Quote Request module exists. |
| STATUS inventory reports Next 16.2.10 and a critical upgrade in progress | package.json and the build use Next 16.4.1. React is 19.3.1. The old warning is stale. |
| STATUS says dependencies use `latest` | Current package declarations use specific versions/ranges. |
| Test counts vary between 100, 106 and 125 across notes | Current `pnpm test`: 128 passing tests in 23 files. |
| Phase 9b is described as open in an older Done paragraph | Functional dictionaries are implemented. Native copy review and functional language switching remain open. |
| Inventory says photo generation is off | Current local environment sets `PHOTO_GENERATION_ENABLED=true`. Webhook URL and signing secret are unset locally. Remote activation is not inferred from this. |
| Inventory says no Sanity variables on Vercel | The newer Deployment section records Sanity development settings and a 15 October preview. Those remote facts need a live refresh before deployment decisions. |
| “No performance budgets” | The kitchen manifest has budgets; whole-site and runtime performance gates remain missing. |
| Production foundation ticket is “claimed” | Persistence, migrations and later customer flows are already implemented. Ticket status has not caught up. |
| First Production Release includes AI photos in CONTEXT.md | The later launch roadmap asks whether photos are included. Resolve the launch scope explicitly. |
| Sanity Phases 1–7, 9a and functional 9b have implementation evidence | Phase 8 handoff documents, native review and launch configuration remain unfinished. |

Treat STATUS.md as an implementation history that needs reconciliation, not a single authoritative completion checklist. CONTEXT.md and ADRs describe both delivered concepts and target architecture; a defined Release Bundle, Quality Profile or lifecycle is not proof that its full operational system exists.

Still missing or incomplete: README/onboarding, architecture overview, Sanity handoff, Page Block contract, ADR 0013, operational QA/accessibility/performance guides and release procedures. Architecture tickets 14–17 and 19 remain open. The existing 12 ADRs provide useful decisions, so the need is consolidation and closure rather than starting the architecture documentation again.

Sources: [STATUS.md](/Users/martin/DEV/RDDOT-3Dwebsite/STATUS.md:416), [Sanity implementation plan](/Users/martin/DEV/RDDOT-3Dwebsite/.scratch/sanity-pagebuilder/spec.md), [architecture map](/Users/martin/DEV/RDDOT-3Dwebsite/.scratch/production-architecture/map.md), [domain contract](/Users/martin/DEV/RDDOT-3Dwebsite/CONTEXT.md), [package.json](/Users/martin/DEV/RDDOT-3Dwebsite/package.json).

**Verification completed**

| Check | Result |
| --- | --- |
| `pnpm lint` | Pass: 0 errors, 1 warning in `exit-preview.tsx` about internal navigation with `window.location.assign`. |
| `pnpm exec tsc --noEmit` | Pass. |
| `pnpm test` | Pass: 128 tests, 23 files. |
| `TRANSACTIONAL_EMAIL_PROVIDER= pnpm build` | Pass: schema extraction, TypeGen, optimized compilation, types, prerendering and photo-adapter server-bundle check. |
| `pnpm audit --prod` | 0 critical, 1 high, 2 moderate advisories. All reported paths run through Sanity CLI dependencies. |
| Production HTTP smoke | `/`, `/configure`, robots and sitemap 200; `/en` and `/es` 404; `/de/configure` 308 to `/configure`; `/checkout` 307 to `/anfrage`; both legal pages 404. |
| Browser interactions | Material deep link, finish and price changes, front camera selection, module addition/commit, Loft rendering, photo guest restriction, save entry, mobile menu and English handoff exercised. |
| Browser layout | Nonblank 3D; no horizontal overflow at the measured desktop/mobile states; no console errors in inspected logs; known THREE.Clock warning. |

Dependency findings: [braces high advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), [uuid moderate advisory](https://github.com/advisories/GHSA-w5hq-g745-h8pq), [sprintf-js moderate advisory](https://github.com/advisories/GHSA-hp3w-g68c-fv3c). Assess reachability before assigning website exploit severity; the package audit is not a penetration test.

Database integration tests were not rerun: their harness can migrate the configured remote test database. The prior 64-pass/1-skip result remains historical documentation. This run did not create an account, submit a request, create/revoke a secure share link, run a paid photo job, publish CMS content or deploy. Authenticated galleries/versions, Studio Presentation, real-device GPU performance, reduced-motion emulation and screen-reader behavior remain outside live verification. The production screenshot and route checks concern a local production build, not the current Vercel deployment.

**Recommended order of work**

1. Repair and browser-test guest configuration → sign-in → saved Project → request continuity. Include back navigation, retries and return from an expired session.
2. Make the request service operational: real OTP email, business notification delivery, ownership, response process and truthful confirmation copy.
3. Close the German launch gates: legal pages, room-asset licences, environment separation, retention/deletion and restore evidence; confirm whether AI photos are in scope.
4. Refine the existing UI: gross/net consistency, available-space camera framing, contrast over rooms/video, dialog focus, video pause and stage/action wording.
5. Add CI and one meaningful end-to-end path, then failure/recovery cases. Establish real-device rendering and page-performance targets.
6. Reconcile documentation against the deployed commit and finish editor/developer handoff. Review EN/ES copy, add functional language switching, then launch those locales.

The next milestone should be a demonstrably reliable browse → configure → save → request journey. More room variants, a new design system or a payment integration would not resolve the current readiness gaps.

**Captured journey and visual evidence**

| Step | Surface | Health |
| --- | --- | --- |
| 1 | Homepage desktop/mobile | Strong visual foundation; brand prominence, promise accuracy and media controls need work. |
| 2 | Material detail → configured kitchen | Functional; surcharge consistency and dialog keyboard access need work. |
| 3 | Finish/camera/module editing | Functional changes verified; product framing and prototype geometry need refinement. |
| 4 | Loft and mobile scene | Nonblank and responsive; HUD contrast and unobstructed product visibility need work. |
| 5 | AI photo entry | Guest restriction works; full generation and production readiness not verified. |
| 6 | Save → sign-in | Entry works; source-confirmed continuation defect and state-dropping back link. |
| 7 | Quote Request entry | Account gate works; completed submission not rerun, business notification absent in code. |
| 8 | Mobile navigation → English configurator | Works in development; functional language switch absent, launch remains gated. |
| 9 | Local production configurator | Loads and renders; desktop data sheet obscures part of the kitchen. |

Step 1 — Desktop homepage. The composition has a strong image and restrained action hierarchy, but the brand sits mainly in navigation.

![Desktop homepage](/Users/martin/DEV/RDDOT-3Dwebsite/.scratch/website-assessment-2026-10-16/screenshots/01-home-desktop.jpg)

Step 2 — Material detail. Clear product explanation and a working preset link; €580 is the pre-tax surcharge, and keyboard focus can leave the dialog.

![Material detail](/Users/martin/DEV/RDDOT-3Dwebsite/.scratch/website-assessment-2026-10-16/screenshots/02-material-detail.jpg)

Step 3 — Nussbaum preset loaded in the configurator.

![Desktop configurator](/Users/martin/DEV/RDDOT-3Dwebsite/.scratch/website-assessment-2026-10-16/screenshots/03-configurator-desktop.jpg)

Step 3 — Green finish and Front camera selected. This capture illustrates tight framing; it is not used as a camera-performance measurement.

![Front finish change](/Users/martin/DEV/RDDOT-3Dwebsite/.scratch/website-assessment-2026-10-16/screenshots/04-front-green.jpg)

Step 3 — Added Schrank 30 and committed: nine modules, 4.02 m, displayed total €11,138.

![Committed module edit](/Users/martin/DEV/RDDOT-3Dwebsite/.scratch/website-assessment-2026-10-16/screenshots/05-configurator-edited.jpg)

Step 4 — Loft renders with daylight and an outlook. The top text loses contrast against the room and the data sheet covers the right side of the kitchen.

![Desktop Loft](/Users/martin/DEV/RDDOT-3Dwebsite/.scratch/website-assessment-2026-10-16/screenshots/06-loft-desktop.jpg)

Step 4 — Mobile Loft at 390 × 844. No horizontal overflow; the sheet and HUD leave a limited product-viewing area.

![Mobile Loft](/Users/martin/DEV/RDDOT-3Dwebsite/.scratch/website-assessment-2026-10-16/screenshots/07-configurator-mobile.jpg)

Step 5 — “Foto aufnehmen” as a guest shows the saved-Project requirement and “Als Projekt speichern.” This restriction was verified in the local production build. No capture was uploaded and no paid generation was triggered.

![Photo guest gate](/Users/martin/DEV/RDDOT-3Dwebsite/.scratch/website-assessment-2026-10-16/screenshots/15-photo-guest-gate.jpg)

Step 6 — Mobile save/sign-in handoff. The current URL carries the import, but the visible back link points at the default configurator.

![Mobile save sign-in](/Users/martin/DEV/RDDOT-3Dwebsite/.scratch/website-assessment-2026-10-16/screenshots/08-save-signin-mobile.jpg)

Step 6 — Desktop sign-in. Clear, restrained form; it should explain the pending save and preserve it through completion.

![Desktop save sign-in](/Users/martin/DEV/RDDOT-3Dwebsite/.scratch/website-assessment-2026-10-16/screenshots/09-save-signin-desktop.jpg)

Step 7 — Direct request entry shows generic sign-in, with no configuration summary yet.

![Guest request gate](/Users/martin/DEV/RDDOT-3Dwebsite/.scratch/website-assessment-2026-10-16/screenshots/10-request-guest.jpg)

Step 1 — Mobile homepage. Strong image-led layout and large actions; body-copy contrast changes with the film.

![Mobile homepage](/Users/martin/DEV/RDDOT-3Dwebsite/.scratch/website-assessment-2026-10-16/screenshots/11-home-mobile.jpg)

Step 8 — Full-screen menu. Clear navigation hierarchy and a clear language entry.

![Mobile menu](/Users/martin/DEV/RDDOT-3Dwebsite/.scratch/website-assessment-2026-10-16/screenshots/12-mobile-menu.jpg)

Step 8 — English mobile configurator. Copy and onward request URL remain English; language switching is absent here.

![English mobile configurator](/Users/martin/DEV/RDDOT-3Dwebsite/.scratch/website-assessment-2026-10-16/screenshots/13-english-configurator-mobile.jpg)

Step 9 — Local production build at 1280 × 720. The canvas works, but the open data sheet obscures the right portion of the default kitchen.

![Production configurator](/Users/martin/DEV/RDDOT-3Dwebsite/.scratch/website-assessment-2026-10-16/screenshots/14-production-configurator.jpg)

