# rotpunkt Signature Status

Last reconciled: 2026-08-14
Working branch: `redesign/devstart`

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

## Current Slice Verified

- `pnpm test`, `pnpm test:db`, `pnpm lint`, and `pnpm build` pass.
- Unit coverage includes browser-recovery parsing, stale-version classification, and the in-flight-save/newer-draft race. Database integration coverage confirms one winner for concurrent expected-version writes and synchronized Project timestamps.
- Live browser checks confirmed owner-scoped Project opening, successful autosave and reload persistence, a deliberate 200/409 two-tab conflict, explicit load-latest recovery, a nonblank 3D canvas, no horizontal overflow at desktop and mobile widths, and no new console errors.
- The current Three.js deprecation and PostgreSQL SSL forward-compatibility warnings remain known non-blockers.

## Known Warnings

- The dev browser logs warnings from the current Three/R3F stack:
  - `THREE.Clock` is deprecated in favor of `THREE.Timer`.
  - `PCFSoftShadowMap` is deprecated and falls back to `PCFShadowMap`.
- These warnings do not currently block rendering or production build, but they should be revisited before production hardening.
- `npm install` reported two moderate vulnerabilities. No audit fix was applied yet.

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
- The configurator now loads `kitchen-line.glb`, but the asset uses generic mesh names and one shared material.
- The current GLB color mapping is heuristic. A production asset should expose named nodes/material slots for cabinet bodies, fronts, handles, countertop, appliances, and room surfaces.
- No analytics/event tracking exists for configurator interactions.
- The current Project workflow has unit/integration coverage, but no automated end-to-end browser coverage yet.
- No accessibility audit has been formalized.
- No performance budgets exist for 3D, images, or page-builder pages.

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

1. Implement the next Project lifecycle and checkpoint workflows: explicit version save, Shared Revision Links, Archive/Trash/restore, and the relevant UI.
2. Add locale route structure for `/`, `/en`, and `/es`.
3. Define the Sanity schema set:
   - site settings
   - page
   - localized slug
   - page-builder blocks
   - product definition
   - configurator block
4. Add a Sanity client layer and typed query boundary.
5. Replace `lib/content.ts` homepage content with Sanity-ready data shapes.
6. Add the configurator smart component as a page-builder block renderer.
7. Add a JSON schema or Zod schema for product definitions and URL configuration state.
8. Add basic Playwright flows:
   - homepage to configurator
   - color change updates URL
   - share URL restores state
   - checkout summary matches state
   - owner-only saved Project open, re-auth return, autosave/conflict recovery, and local recovery-draft decisions
9. Replace the box prototype with the first production-ready 3D asset pipeline.

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
