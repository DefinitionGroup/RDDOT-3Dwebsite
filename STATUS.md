# RDTDOT Ecom Prototype Status

Last updated: 2026-06-23  
Branch: `3dapp`

## Current Goal

Create the first modular ecommerce foundation for a Sanity-managed rotpunkt Signature site, with a reusable page component path toward a 3D configurator, multilingual content, and later commerce.

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
- Added a simple straight-line kitchen scene using React Three Fiber, drei, and Three.js.
- Added color configuration for:
  - cabinet/korpus finish
  - front finish
- Added camera views:
  - room/signature
  - front
  - detail
- Added shareable URL state using a compact `?c=` query parameter.
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

## Verified

- `npm run lint` passes.
- `npm run build` passes.
- `/configure` renders on desktop and mobile.
- The 3D canvas is nonblank.
- Screenshot pixel checks confirmed color changes and camera changes affect the rendered scene.
- `/checkout` preserves configuration through the shared URL.
- Mobile checkout overflow was found and fixed.
- Next.js runtime diagnostics reported no config or session errors.
- Browser console had no errors during final verification.

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
- The 3D model is still a box-based prototype; there are no production 3D assets.
- There is no saved configuration persistence beyond the shareable URL.
- No analytics/event tracking exists for configurator interactions.
- No automated Playwright test suite exists yet.
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

1. Add locale route structure for `/`, `/en`, and `/es`.
2. Define the Sanity schema set:
   - site settings
   - page
   - localized slug
   - page-builder blocks
   - product definition
   - configurator block
3. Add a Sanity client layer and typed query boundary.
4. Replace `lib/content.ts` homepage content with Sanity-ready data shapes.
5. Add the configurator smart component as a page-builder block renderer.
6. Add a JSON schema or Zod schema for product definitions and URL configuration state.
7. Add basic Playwright flows:
   - homepage to configurator
   - color change updates URL
   - share URL restores state
   - checkout summary matches state
8. Replace the box prototype with the first production-ready 3D asset pipeline.

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

