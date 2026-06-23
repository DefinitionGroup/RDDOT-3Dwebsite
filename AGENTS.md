# AGENTS.md

Project-specific instructions for agents working in this repository.

## Project Context

This is a modular ecommerce prototype for a rotpunkt Signature kitchen website.

The current direction is:

- Next.js App Router.
- Tailwind CSS design system.
- motion.dev for UI motion and interactions.
- React Three Fiber, drei, and Three.js for the configurator.
- Sanity-managed content later.
- Single-channel ecommerce first.
- Multilingual from the start:
  - German default at `/`
  - English at `/en`
  - Spanish at `/es`
- Ecommerce will be added later, so avoid hard-coding decisions that block cart, quote, order, checkout, or pricing integration.

## Working Rules

- Preserve the existing visual direction unless the user explicitly asks for a redesign.
- Keep changes scoped to the requested feature or bug.
- Prefer reusable components where the same UI or behavior appears more than once.
- Do not introduce broad abstractions before there is real duplication or a clear page-builder contract.
- Use `rg` for search.
- Use `apply_patch` for file edits.
- Do not revert user changes or unrelated files.
- Run `npm run lint` after code changes.
- Run `npm run build` after route, server/client boundary, or TypeScript-heavy changes.
- For 3D/frontend visual changes, verify in a browser on desktop and mobile.

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
- Page sections live in `components/sections`.
- Configurator code lives in `features/configurator`.
- Shared static content currently lives in `lib/content.ts`.
- The configurator should stay isolated enough to become a Sanity page-builder block.
- Do not make page-builder or Sanity assumptions inside the 3D engine layer.

## Configurator Rules

- Keep the current prototype limited to:
  - one straight-line kitchen layout
  - cabinet/korpus color
  - front color
- The current 3D scene is a box-based prototype, not final production geometry.
- Product metadata belongs in the product-definition contract first.
- URL state must remain shareable and backward-compatible where possible.
- If the URL state shape changes, add normalization/fallback logic.
- Do not store source-of-truth prices in the client long term; current prices are prototype indicators.
- Keep camera behavior inspired by `defgrp-3d-configurator`, but do not copy its architecture blindly.

## Sanity Direction

- Sanity is not wired yet.
- When adding Sanity, use the newest stable Sanity/next-sanity approach available at implementation time.
- Use document-level localization for page-builder pages.
- Use field-level localized objects for small shared labels and product metadata.
- Keep a clean adapter boundary between Sanity documents and app-level component props.
- The product definition should remain portable to JSON or another storage backend later.
- The configurator should be represented as a smart page-builder block.

## Commerce Direction

- Current checkout is fake and only validates the handoff from configuration to request/order intent.
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
npm run dev -- -p 3001
npm run lint
npm run build
```

## Important Files

- `STATUS.md`: current implementation status and missing work.
- `DESIGN_SYSTEM.md`: first design-system summary.
- `features/configurator/product-definition.ts`: temporary product definition and pricing contract.
- `features/configurator/state-codec.ts`: shareable URL state.
- `features/configurator/adapters/sanity.ts`: Sanity adapter boundary.
- `features/configurator/ui/configurator-shell.tsx`: configurator UI shell.
- `features/configurator/engine/kitchen-scene.tsx`: 3D scene.
- `app/configure/page.tsx`: configurator route.
- `app/checkout/page.tsx`: fake checkout route.

