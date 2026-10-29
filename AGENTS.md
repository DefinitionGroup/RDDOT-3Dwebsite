# AGENTS.md

Project-specific instructions for agents working in this repository.

## Project Context

This is a modular ecommerce prototype for a rotpunkt Signature kitchen website.

The current direction is:

- Next.js App Router.
- Tailwind CSS design system.
- motion.dev for UI motion and interactions.
- React Three Fiber, drei, and Three.js for the configurator.
- Sanity-managed marketing content through a pagebuilder.
- Single-channel ecommerce first.
- Multilingual from the start:
  - German default at `/`
  - English at `/en`
  - Spanish at `/es`
  - `/en` and `/es` stay 404 in production until listed in `LAUNCHED_LOCALES` (`lib/i18n.ts`). `OPEN_ALL_LOCALES=true` opens them anyway; Vercel Production and previews set it while Production serves as a test environment.
- Ecommerce will be added later, so avoid hard-coding decisions that block cart, quote, order, checkout, or pricing integration.

## Working Rules

- Preserve the existing visual direction unless the user explicitly asks for a redesign.
- Keep changes scoped to the requested feature or bug.
- Prefer reusable components where the same UI or behavior appears more than once.
- Do not introduce broad abstractions before there is real duplication or a clear page-builder contract.
- Use `rg` for search.
- Use `apply_patch` for file edits.
- Do not revert user changes or unrelated files.
- Run `pnpm lint` after code changes.
- Run `pnpm build` after route, server/client boundary, or TypeScript-heavy changes.
- For 3D/frontend visual changes, verify in a browser on desktop and mobile.
- Pushing `redesign/devstart` deploys Vercel Production through Git; feature branches build Git previews. Production is a public test environment for now (`STATUS.md` → Deployment).

## Frontend Design Rules

- Avoid generic SaaS/dashboard layouts for promotional pages.
- The first viewport must read as one composition, not a dashboard.
- Brand/product name must be a hero-level signal on branded pages.
- Do not let generic headlines overpower the brand.
- Use purposeful typography and the existing font tokens.
- Do not rely on flat single-color backgrounds for branded surfaces.
- Prefer dominant full-bleed visual planes for landing/promotional heroes.
- Do not add cards to the hero.
- Avoid card-heavy layouts unless the card is the container for an actual interaction.
- Each section should have one job, one main headline, and one short supporting sentence.
- Use real visual anchors: product, material, spatial atmosphere, or configurator state.
- Avoid pill clusters, stat strips, icon rows, detached badges, and floating hero labels.
- Use motion to create hierarchy and presence, not noise.
- Keep dominant palettes away from generic purple/default dark-mode styling.
- Make sure desktop and mobile both load and remain free of horizontal overflow.

## Component Boundaries

- Design-system primitives live in `components/design-system`.
- Page-builder blocks live in `blocks/<name>/` (`schema.ts`, `Component.tsx`, `demo.ts`).
- Sanity schema, client, queries and loaders live in `sanity/`; the embedded Studio in `app/(studio)`.
- Demo content, in the shape the queries return, lives in `content/`.
- Locales are defined once in `lib/i18n.ts`; `proxy.ts` routes them.
- Configurator code lives in `features/configurator`.
- The configurator should stay isolated enough to become a Sanity page-builder block.
- Do not make page-builder or Sanity assumptions inside the 3D engine layer.

## Configurator Rules

- Keep the current prototype limited to:
  - one straight-line kitchen built from wall modules (tall cabinet, appliance cabinet, cabinet 30) with an optional island (standard or large)
  - cabinet/korpus finish
  - front finish
- The kitchen loads `public/models/kitchen-modules.glb`, segmented prefabs composed from module placements. Each mesh node's role, prefab and material slot come from the Asset Manifest `features/configurator/modules/kitchen-asset-manifest.json` (ADR 0009); an unmapped node throws. Rebuild it with `pnpm assets:manifest`; `asset-manifest.test.ts` fails on any drift from the GLB.
- The Appartement and Loft rooms (`public/models/apartment-room.glb`, `loft-room.glb`) are placeholders with no recorded licence (`STATUS.md` → Release Blockers).
- Prefer production GLB assets with named nodes/material slots for cabinet bodies, fronts, handles, countertop, appliances, and room surfaces.
- Product metadata belongs in the product-definition contract first.
- URL state must remain shareable and backward-compatible where possible.
- If the URL state shape changes, add normalization/fallback logic.
- Do not store source-of-truth prices in the client long term; current prices are prototype indicators.
- Keep camera behavior inspired by `defgrp-3d-configurator`, but do not copy its architecture blindly.

## Sanity Direction

- Sanity is wired: project `06g3ozu4`, private dataset `development` with synthetic content only. The `production` dataset waits for the ADR 0007 DPA review.
- The Studio is embedded at `/studio` (`sanity.config.ts`, structure in `sanity/structure.ts`).
- Without `NEXT_PUBLIC_SANITY_PROJECT_ID` the site runs in demo mode from `content/` (`sanity/env.ts`). Keep demo content working.
- Each block is a self-contained folder in `blocks/`. Adding one: its folder, one line in `blocks/schemas.ts`, one in `blocks/registry.tsx`, a projection in `sanity/lib/queries.ts` if it resolves images or files, then `pnpm typegen`.
- Block props are typed from TypeGen query results. `pnpm typegen` runs as `prebuild`; commit `schema.json` and `sanity.types.ts` with any schema or query change.
- The GROQ queries are the adapter: they resolve references, images and locales into plain application models (ADR 0013, still to be written).
- `pnpm sanity:seed` writes `content/` into `development`. It keeps existing documents unless `--replace` is passed and refuses `production`.
- Plan and phase status: `.scratch/sanity-pagebuilder/spec.md`.
- When changing the Sanity setup, use the newest stable Sanity/next-sanity approach available at implementation time.
- Use document-level localization for page-builder pages (`page`, `navigation`).
- Use field-level localized objects for small shared labels and product metadata.
- Keep a clean adapter boundary between Sanity documents and app-level component props.
- The product definition should remain portable to JSON or another storage backend later.
- Prices and product rules never live in Sanity; blocks read them through `features/configurator/catalog.ts`.
- Public visitors never connect to Sanity: reads are server-side and cached under the `sanity` tag, which the signed publish webhook (`app/api/webhooks/sanity`, `SANITY_REVALIDATE_SECRET`) expires.
- Code owns SEO output (`lib/page-metadata.ts`, `lib/seo.ts`, `app/sitemap.ts`, `app/robots.ts`); `siteSettings` and each page's `seo` only supply words and images. Only a deployment with `SEARCH_INDEXING_ENABLED=true` and no test flags may be indexed (`lib/search-indexing.ts`); every other one answers noindex. `redirect` documents are enforced in `proxy.ts` from an in-memory table (`sanity/lib/redirect-table.ts`).
- The configurator is the smart `configuratorBlock`: editorial presentation plus a `productKey`.

## Commerce Direction

- There is no checkout. A saved Project ends in a Quote Request (`/anfrage`, ADR 0012) pinned to an immutable revision with a server-computed Price Indication; `/checkout` redirects there. Nothing notifies rotpunkt of a request yet: the outbox entry waits on the email provider (ADR 0010).
- Future commerce should support:
  - product catalog
  - price calculation
  - quote/cart handoff
  - order creation
  - checkout/payment
  - CRM or lead capture
- Keep commerce logic replaceable. Do not bind the configurator directly to one payment provider.

## Motion Rules

- Use `motion/react`.
- Keep motion purposeful:
  - stagger typography where it improves hierarchy
  - animate control entry/exit
  - use hover/tap feedback for clear controls
- Respect reduced-motion requirements when adding larger motion systems.

## 3D QA Requirements

For Three.js/R3F changes:

- Verify the canvas is nonblank.
- Verify the scene is framed correctly on desktop.
- Verify the scene is framed and usable on mobile.
- Verify interactions change the rendered output.
- Check for horizontal overflow.
- Check browser console errors.
- Run lint/build before handoff.

## Known Current Warnings

The current Three/R3F stack emits dev warnings about deprecated internal Three APIs:

- `THREE.Clock`
- `PCFSoftShadowMap`

These warnings are not build blockers right now, but should be revisited before production hardening.

## Useful Commands

```bash
pnpm exec next dev -p 3001
pnpm lint
pnpm exec tsc --noEmit
pnpm test
TRANSACTIONAL_EMAIL_PROVIDER= pnpm build
```

A plain `pnpm build` fails locally: `.env.local` selects the development email capture, which refuses to run in a production build (ADR 0010). `pnpm test:db` can migrate the configured remote test database.

CI (`.github/workflows/ci.yml`) runs lint, types, unit and database tests, the build and `pnpm test:smoke` (Playwright, `tests/smoke/`) on every push, each against a throwaway database. Run the smoke test locally only against a throwaway database too: it signs up an account and sends a Quote Request in whatever database the server uses (`STATUS.md` → Build & Verification Gates).

## Important Files

- `STATUS.md`: current implementation status and missing work.
- `DESIGN_SYSTEM.md`: first design-system summary.
- `features/configurator/product-definition.ts`: temporary product definition and pricing contract.
- `features/configurator/state-codec.ts`: shareable URL state.
- `features/configurator/catalog.ts`: product lookup seam for blocks and Studio option lists.
- `features/configurator/ui/configurator-shell.tsx`: configurator UI shell.
- `features/configurator/engine/kitchen-scene.tsx`: 3D scene and its table of rooms.
- `features/configurator/modules/kitchen-asset-manifest.json`: kitchen Asset Manifest.
- `lib/i18n.ts`: locales, `LAUNCHED_LOCALES`, reserved slugs.
- `proxy.ts`: locale routing (German unprefixed, unlaunched locales 404).
- `blocks/schemas.ts` and `blocks/registry.tsx`: the one list of Page Blocks and their components.
- `sanity/env.ts`: Sanity config and the demo-mode gate.
- `sanity/lib/queries.ts` and `sanity/lib/loaders.ts`: GROQ queries and the page and site-chrome loaders.
- `.scratch/sanity-pagebuilder/spec.md`: Sanity pagebuilder plan and phase status.
- `app/(site)/[locale]/configure/page.tsx`: configurator route.
- `app/(site)/[locale]/anfrage/page.tsx`: Quote Request route (`/checkout` redirects here).

## Agent skills

### Issue tracker

Issues and specs are tracked as local Markdown files under `.scratch/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Use the default canonical triage labels. See `docs/agents/triage-labels.md`.

### Domain docs

This is a single-context repository using a root `CONTEXT.md` and `docs/adr/`. See `docs/agents/domain.md`.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
