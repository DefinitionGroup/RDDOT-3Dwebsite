# Block contract

A Page Block (CONTEXT.md) is one editorial composition an editor can place on an
Editorial Page. Editors own its words and pictures; the code owns how it renders,
moves, responds and reads to a screenreader. Each block is a self-contained folder.
Why the types come from the queries: [ADR 0013](../docs/adr/0013-let-the-groq-queries-be-the-sanity-adapter.md).
The wider Sanity setup: [SANITY.md](../SANITY.md).

## The folder

`blocks/<kebab-name>/`, block type `<camelName>Block` (`hero-film/` → `heroFilmBlock`).

| File | Exports | Notes |
| --- | --- | --- |
| `schema.ts` | `schema` (`defineType`, `type: "object"`) | German titles and descriptions: editors read them. Shared fields from `sanity/schemaTypes/fields.ts` (below). |
| `Component.tsx` | default `function XBlock(props: BlockProps<"xBlock">)` | A server component. It resolves everything server-side (image URLs, configurator links, prices, interface words) and hands plain props to a view. |
| `*-view.tsx` | the view, when the block needs state or motion | `"use client"`, props only: no Sanity types, no fetching. See `hero-film/`, `materials/`, `configurator/`. |
| `demo.ts` | `xDemo(input): BlockOf<"xBlock">` | One block in the *resolved* query shape, built with `key`, `image`, `decorativeImage`, `file` and `link` from `content/demo-helpers.ts`. Every field of the generated type is present. |

`BlockProps<T>` is `{ block, locale, index }`: the block as the page query returns
it, the page's locale, and its position on the page.

## Adding a block

1. The folder with its three files.
2. One line in `blocks/schemas.ts`, the only list of blocks: the schema index and
   the page's content array, and with it the Studio's insert menu, derive from it.
3. One line in `blocks/registry.tsx`. Its `satisfies` clause turns a schema without
   a component into a build error.
4. If the block has images or files: a `_type == "xBlock" => { … }` branch in
   `pageContentFragment` (`sanity/lib/queries.ts`) that resolves them with
   `imageFragment` / `fileFragment`. Without it the block gets bare asset
   references and its type says so.
5. `pnpm typegen`, then commit `schema.json` and `sanity.types.ts` with the block.
6. If it should show without Sanity: add it to the demo pages in
   `content/home/{de,en,es}.ts`, all three languages.
7. `sanity schema deploy` and `pnpm sanity:seed` when the dataset should have it
   (SANITY.md).

## Shared schema fields

From `sanity/schemaTypes/fields.ts`, so every block validates the same way:

- `headlineField()`: the one serif word between asterisks (`Küchen, auf den *Punkt*.`),
  at most one. Render it with `Emphasized` (`components/design-system/emphasized.tsx`)
  or `ScrollWords`, never as raw text.
- `imageField()`: hotspot on, `alt` required. The editor's alt text travels with the image.
- `productKeyField` and `finishKeyField()`: the choices come from the configurator's
  catalog, and validation refuses a key it does not know.
- `anchorField`: an optional `#anchor`; `PageBuilder` already cleans its stega markers.
- Objects: `linkField` (label and a `/`, `#`, `https://`, `mailto:` or `tel:` target),
  `videoLoop` (desktop film, optional phone film, poster).

Renaming or removing a field orphans what editors stored under the old name. It
needs a content migration, not just a schema edit.

## Rendering

- **Images:** `<SanityImage image={block.image} sizes="…" />` (`components/sanity-image.tsx`),
  or `imageUrl`, `imageFocus` and `imageDimensions` from `sanity/lib/image.ts` for a
  raw URL, a CSS focal point or a poster. Both serve demo assets from `/public` unchanged.
- **Interface words** (button labels, "Aufpreis …", "Richtpreis …") come from
  `getMessages(locale).blocks` (`lib/messages/{de,en,es}.ts`), never hard-coded German.
  Editor copy comes from the block.
- **Links** to the site's own routes go through `localizePath(locale, "/configure")`.
- **Stega:** in Editorial Preview every string carries invisible edit markers. Call
  `stegaClean` (from `next-sanity`) on any string used as logic: keys, variants,
  comparisons, class maps. Never on copy.
- **Headings:** one `h1` per page. Today the hero film owns it as the first block;
  every other block's headline is an `h2`, usually through `SectionIntro` (label over
  headline, `components/design-system/label.tsx`), and items within it are `h3`.
  `index` is there for a block that needs to know it comes first.
- **Look:** the existing tokens and primitives (`DESIGN_SYSTEM.md`,
  `components/design-system/`: `Reveal`, `Label`, `Pill`, `ScrollWords`, `DetailCard`,
  `Accordion`), sections inside `signature-container`, and the design rules in
  `AGENTS.md`: one job, one headline and one supporting sentence per section.
  Tailwind scans `blocks/`, and `lib/tailwind-content.test.ts` keeps it that way.
- **Motion:** `motion/react` through the primitives. The site's `MotionProvider`
  sets `reducedMotion="user"`; a block that drives motion from scroll or time itself
  checks `useReducedMotion()`, as `ScrollWords` does.

## Smart blocks: the configurator

A block that names a product or a finish (`configuratorBlock`, `materialsBlock`)
stores keys, never rules or prices (ADR 0007). Its component resolves them at
render through `features/configurator/catalog.ts`:

- `presetState(productKey, preset)` gives the configuration for a deep link, encoded
  with `encodeConfiguration` under `CONFIG_QUERY_PARAM` (`state-codec.ts`), so shared
  URLs stay compatible.
- `presetPricing(productKey, preset)` gives the surcharge and total, formatted with
  `formatCurrency(cents, locale)`.
- A key the configurator does not know keeps the block's copy and drops its link and
  price, with a `console.warn`. Never a guessed fallback.

## When a block fails

`PageBuilder` renders each block inside `BlockBoundary`. A block that throws
disappears from the page and the error is logged; the rest of the page stands. A
block type this build does not know (content ahead of the code) renders nothing.
Studio validation is the real guard: what it refuses cannot be published.

## Never

- Fetch content or import the Sanity client inside a block. Content arrives through
  the page query.
- Use the stored document types from `sanity.types.ts`; use `BlockOf` and `BlockProps`.
- Put a price, a rule or an asset location of the configurator into a schema.

## Checking a block

`pnpm typegen`, `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm test`, then the page in a
browser at 1440 and 390 px. Compare the rendered page, not only the markup: identical
HTML once hid classes Tailwind had not generated (spec Phase 3).
