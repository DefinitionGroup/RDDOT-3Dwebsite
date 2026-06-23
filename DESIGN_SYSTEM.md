# rotpunkt Signature Design System

This first pass turns the two Figma versions into a modular Tailwind and Next.js foundation.

## Direction

- Use version 2 as the primary ecommerce direction: one immersive image-led hero, brand/navigation integrated into the scene, and a compact collection action rail.
- Keep version 1 as a module library source: image panels, collection compare blocks, editorial text rhythm, glass labels, and red/amber accent details.
- Improvement applied: the first viewport elevates `rotpunkt Signature` as the hero-level product signal, while the Figma line `Von 0 auf 100°C in 4 Klicks.` becomes supporting copy.

## Tailwind Tokens

- Colors are defined as CSS RGB variables in `app/globals.css` and mapped in `tailwind.config.ts`.
- Core tokens: `canvas`, `paper`, `mist`, `ink`, `graphite`, `ash`, `porcelain`, `signature`, `ember`.
- Type tokens: `font-brand`, `font-sans`, `font-editorial`.
- Shape tokens: `rounded-hero` for the immersive first viewport and `rounded-soft` for small controls.
- Motion tokens: `ease-signature`, `animate-ambient-pan`, and `animate-soft-reveal`.

## Components

- `BrandLogo`: reusable `rotpunkt | Signature` lockup with light/dark variants.
- `SiteHeader`: image-overlay navigation with collection/config/process links and cart indicator.
- `SignatureButton`: reusable CTA using motion.dev hover/tap interactions and Figma arrow asset.
- `CollectionStep`: reusable hero rail item for collection or process steps.
- `ImagePanel`: reusable image module with optional glass caption and CTA.
- `SectionHeading`: consistent editorial section heading.
- `FeatureList`: reusable red-dot narrative list.

## Next Ecom Steps

- Connect collection modules to real product or CMS data.
- Add PDP-level components: finish swatches, dimension selector, price/lead-time panel, and configurator entry.
- Add Storybook or a component docs route once product states and variants are known.
- Add accessibility QA for final copy and contrast after brand content replaces prototype text.
