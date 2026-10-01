# Sanity pagebuilder

Status: in progress — Phase 1 done 2026-10-01; Sanity project `06g3ozu4` created by Martin
Branch: `cc/devstart-sanity` (from `cc/devstart-003` at `e4fd3e9`)
Governing decisions: [ADR 0007](../../docs/adr/0007-use-sanity-only-for-scoped-editorial-content.md),
[issue 11](../production-architecture/issues/11-define-sanity-editorial-contract.md),
[CONTEXT.md](../../CONTEXT.md) (Editorial Page, Page Block, Configurator Block, Editorial Preview)
House pattern: `dfn-studio:sanity-buildup`, exemplar `/Users/martin/DEV/dnd-rsf2026` (DD)

## Goal

Every piece of marketing content on the rotpunkt Signature website is editable in Sanity:
pages composed from a curated set of Page Blocks, navigation, footer, SEO, and editorial
media, in German, English and Spanish. The configurator stays
code-owned and joins pages as a smart block that only carries editorial presentation and a
`productKey`.

This reverses one line of STATUS.md's confirmed sequence (2026-09-02), which deferred
"Track B's locale routing and page builder". The rest of that sequence is done, so the
deferral's reason — "before the customer journey has an ending" — no longer holds.

## 1. Where we stand

| Area | Today |
| --- | --- |
| Sanity | Nothing wired: no project, dataset, Studio, schema, token, or preview |
| Homepage | `app/page.tsx` composes 8 sections from `components/sections/*`, copy in `lib/content.ts` (330 lines) |
| Header / footer | `site-header.tsx`, `site-footer.tsx` read `navItems` / `footerColumns` from `lib/content.ts` |
| Locales | German only, no `/en` or `/es`; root layout hard-codes the language |
| Configurator | Product definition in code (`RDTD_KITCHEN_PRODUCT_V2`, `productKey: "rdtdot-signature-kitchen-v1"`); `ConfiguratorShell` already takes a `locale` prop; homepage teaser and material cards deep-link with `?config=` state and show prices computed from code |
| Adapter | `features/configurator/adapters/sanity.ts` is a type stub; its `defaultState`/embedded product shape contradicts the later ADR 0007 decision and gets replaced |
| Sanity account | MCP is signed in as `1SP Website <devsp1@definition.group>`; its projects are 1SP-Website, 1sp-New-Web, dnd-rsf2026 — no rotpunkt project |
| Stack | Next 16.2.10, React 19.2, Tailwind 3.4, motion 12, TypeScript 6 |

## 2. Decisions (taken 2026-10-01)

1. **Sanity account and organisation:** Martin creates the project in the organisation of his
   choice and hands over the project ID. The MCP account (1SP) is not used to create it.
   Done 2026-10-01: project `06g3ozu4`, owned by Martin's Google login, dataset set up.
   The Sanity MCP (signed in as `devsp1@definition.group`) has no grant on it; project
   operations go through the Sanity CLI under Martin's login instead.
2. **Adapter: the queries are the adapter.** ADR 0007 says Sanity shapes stop at an
   `EditorialContent` adapter; the house pattern types blocks from TypeGen query results.
   The GROQ projection dereferences, resolves images to plain objects and coalesces locales,
   so the query-result types are plain application models; demo content satisfies the same
   types and is the "local-content adapter". The only deliberate leaks are the
   visual-editing data attributes (document id + path) in `PageBuilder` and `stegaClean`.
   Recorded as ADR 0013 amending 0007 (Phase 8). Rejected: a hand-written mapper per block,
   which doubles the work of every block for no runtime gain.
3. **Configurator in v1: teaser and deep-link blocks** — today's behaviour, made editable.
   The `inline` live-3D variant is a later slice.
4. **Languages: German, English and Spanish launch together.** Pages, navigation, SEO and
   the functional copy of configurator, account, request and share screens are all
   translated in this effort (Phase 9). `LAUNCHED_LOCALES` stays the gate while building,
   and a locale opens only when complete (ADR: no mixed-language fallbacks). Martin or a
   native reviewer signs off English and Spanish copy before launch; drafts written during
   development are synthetic content.

## 3. Target architecture

```
app/
  (site)/[locale]/layout.tsx          root layout, <html lang>, SanityLive, VisualEditing (draft only)
  (site)/[locale]/[[...slug]]/page.tsx  every Editorial Page incl. the homepage
  (site)/[locale]/configure|konto|anfrage|share/...   functional routes, moved, URLs unchanged
  (studio)/studio/[[...tool]]/page.tsx  embedded Studio, own root layout
  api/draft-mode/{enable,disable}/route.ts
  sitemap.ts, robots.ts
proxy.ts                              /x → rewrite /de/x; /de/x → 301 /x; skips api, studio, _next, files
blocks/<kebab>/{schema.ts, Component.tsx, demo.ts}
blocks/schemas.ts                     the only list of blocks
blocks/registry.tsx                   satisfies { [K in BlockType]: BlockComponent<K> }
blocks/types.ts                       BlockOf<T>, BlockProps<T> from generated query results
blocks/CONTRACT.md                    rotpunkt instance of the block contract
components/page-builder.tsx           registry lookup, data attributes, per-block error boundary
sanity/env.ts                         isSanityConfigured gate
sanity/lib/{client,live,loaders,queries,image}.ts
sanity/schemaTypes/{documents,objects}/…
sanity/structure.ts, sanity/presentation/resolve.ts
sanity.config.ts, sanity.cli.ts, sanity.types.ts (generated, committed)
content/demo.ts                       lib/content.ts reborn in resolved query shape
scripts/seed-sanity.ts                idempotent, deterministic ids, `sanity exec --with-user-token`
lib/i18n.ts                           LOCALES, DEFAULT_LOCALE, LAUNCHED_LOCALES, RESERVED_SEGMENTS
```

**Seam to ADR 0007:** `sanity/lib/loaders.ts` exports `loadPage(locale, slug)` and
`loadSiteChrome(locale)`; mode comes from `draftMode()`. Demo content only when
`isSanityConfigured === false`; when configured, `null` is a real `notFound()`.

**Locale routing:** German unprefixed at `/`, English `/en`, Spanish `/es` (1SP's proxy
rewrite, not DD's all-prefixed `/en`). One `[locale]` root layout gives a correct
`<html lang>` without making pages dynamic. Functional routes move under `[locale]` once so
Phase 9 can translate them; their German URLs do not change. A locale not in
`LAUNCHED_LOCALES` returns 404 — the gate while English and Spanish are being built.

**Documents**

| Type | Localisation | Notes |
| --- | --- | --- |
| `page` | document-level | title, language, slug (unique per language, rejects `RESERVED_SEGMENTS`), `isHomepage` (one per language), `seo`, `content[]` |
| `navigation` | document-level | header items and footer columns per language |
| `siteSettings` | field-level | singleton: brand defaults, default SEO and share image, legal footer line |
| `redirect` | — | from / to / permanent; required when a published slug changes (Phase 7) |

**Blocks** — the current homepage, one block per section, plus three generic ones:

| Block | From | Notes |
| --- | --- | --- |
| `heroFilm` | `signature-hero.tsx` | brand headline, loop video (Sanity file + poster), CTA |
| `manifest` | `manifest.tsx` | scroll-words statement |
| `promises` | `signature-promises.tsx` | items with detail cards |
| `materials` | `material-cards.tsx` | smart: each card picks a `finishKey` from the product definition; surcharge and deep link computed in code |
| `configurator` | `configurator-teaser.tsx` | smart: `productKey`, optional start preset, copy, image; price computed in code |
| `roomStory` | `room-story.tsx` | |
| `collections` | `collection-lines.tsx` | |
| `closing` | `closing-statement.tsx` | |
| `richText` | new | legal and long-form pages (Impressum, Datenschutz — open in STATUS.md) |
| `faq` | new, reuses `accordion.tsx` | |
| `media` | new | full-bleed image or film |

Further blocks only when a page needs them (AGENTS.md: no abstractions before duplication).

## 4. Configurator integration

- **Product lookup seam.** `features/configurator/catalog.ts` → `resolveProduct(productKey)`
  returns the code-owned product definition today and reads the active Release Bundle
  later. Nothing in Sanity changes when that swap happens.
- **Studio option lists come from code.** `productKey` and `finishKey` fields import their
  allowed values from the product definition, with validation, so an editor cannot pick an
  option the configurator does not know.
- **Prices never live in Sanity.** Block components compute surcharges and the
  default-configuration total from `resolveProduct()` at render, as `app/page.tsx` does now.
- **Deep links** keep using `encodeConfiguration` and `CONFIG_QUERY_PARAM`, so shared URLs
  stay backward-compatible.
- **Unknown key at runtime** (e.g. a product retired in code): the block renders its
  editorial fallback without price or link and logs; Studio validation blocks publishing.
- **Later — `inline` variant:** a live, client-only canvas (`dynamic(…, { ssr: false })`, as
  DD's `hero-3d`) with "Im Konfigurator öffnen" handing the state over via the URL. No
  autosave, Projects, or photo actions inside a marketing page.
- **Retire** the stub in `features/configurator/adapters/sanity.ts`.

## 5. Phases

Each phase ends green on `pnpm lint`, `tsc --noEmit`, `pnpm test`, `pnpm build`.
Phases 1–5 run in demo mode and need no Sanity project, so work starts before Phase 0
completes; the project ID is needed from Phase 6 on.

**Phase 0 — Project setup** (after §2.1). Create project `rotpunkt-signature`, private
`development` dataset with synthetic content only, CORS for `http://localhost:3001` with
credentials, `.env.example` entries: `NEXT_PUBLIC_SANITY_PROJECT_ID`,
`NEXT_PUBLIC_SANITY_DATASET`, `NEXT_PUBLIC_SANITY_API_VERSION`, `SANITY_API_READ_TOKEN`
(Viewer), `SANITY_REVALIDATE_SECRET`. The `production` dataset waits for the ADR 0007 DPA
and transfer review.

**Phase 1 — Locale routing, no Sanity yet.** `lib/i18n.ts`, `proxy.ts`, move routes under
`app/(site)/[locale]/`. *Exit:* every existing URL behaves as before; `/de/configure` → 301
`/configure`; `/en` → 404; build green.
*Done 2026-10-01.* `/de/…` answers 308 to the unprefixed URL. The locale gate lives in
`proxy.ts` (an unlaunched prefix is rewritten to a path that 404s), not in the layout:
`dynamicParams = false` on `[locale]` is inherited by every child segment and turned each
`notFound()` into a `NoFallbackError` with a blank page. `[...rest]` and `not-found.tsx`
keep 404s inside the site layout (German, site styles, `noindex`).

**Phase 2 — Scaffold and demo mode.** Dependencies (`sanity`, `next-sanity`, `@sanity/vision`,
`@sanity/image-url`, `@sanity/document-internationalization`,
`sanity-plugin-internationalized-array`), `sanity.config.ts`, env gate, embedded Studio,
client, live, loaders. *Exit:* app runs with no Sanity env; `/studio` shows a setup notice.

**Phase 3 — Schema skeleton and first blocks.** `page`, `navigation`, `siteSettings`, `seo`,
image and video objects, `richText`; block registry, types, `PageBuilder`; port `heroFilm`,
`manifest`, `richText`. *Exit:* homepage renders through `PageBuilder` from demo content.

**Phase 4 — Port the homepage.** Remaining sections as blocks, header and footer from
`navigation`. `lib/content.ts` is deleted, its content lives in `content/demo.ts`.
*Exit:* before/after screenshots identical on desktop and mobile, no horizontal overflow.

**Phase 5 — Configurator blocks.** Catalog seam, Studio option lists, `materials` and
`configurator` blocks wired to it. *Exit:* changing a finish in Studio changes the link and
the surcharge shown; an unknown key cannot be published.

**Phase 6 — TypeGen, Presentation, Live.** `sanity.cli.ts` typegen block, `pnpm typegen` as
`prebuild`, draft-mode routes, `resolve.ts` (German paths unprefixed), data attributes,
`stegaClean` on logic strings, `noindex` in preview. *Exit:* click-to-select and
drag-reorder work in Presentation; a draft edit streams into the preview.

**Phase 7 — Seed, structure, SEO.** Seed `development` from `content/demo.ts` (images and
the hero film uploaded), Studio structure (pages per locale, singletons, catch-all),
`sanity schema deploy`; metadata from `seo`, canonical, `hreflang` only for existing
translations, `sitemap.ts`, `robots.ts`, `redirect` enforcement in `proxy.ts`.
*Exit:* the seeded homepage from Sanity matches the demo homepage.

**Phase 8 — Docs and handoff.** `blocks/CONTRACT.md`, `SANITY.md` (listed as needed in
STATUS.md), ADR 0013, update AGENTS.md ("Sanity is not wired yet") and STATUS.md.

**Phase 9 — English and Spanish.** Two halves, owned by different systems:

- *Editorial (Sanity):* translated `page` and `navigation` documents for every German one,
  with their own slugs and SEO; `siteSettings` fields in all three. Drafts seeded into
  `development`, final copy reviewed by Martin or a native speaker.
- *Functional (code):* about 200 hard-coded German strings across `features/*/ui`,
  `components/design-system` and `app` move into typed dictionaries
  `lib/i18n/messages/{de,en,es}.ts` (en and es `satisfies` the German shape, so a missing
  key fails the build); plurals via `Intl.PluralRules`. Product labels already carry
  de/en/es in the product definition. `ConfiguratorShell` and the other screens take
  `locale` from the route. The authentication email follows the customer's locale.
- Functional route paths stay identical across locales (`/en/configure`, `/es/konto`);
  translated paths are a later nicety.
- Locale switcher in the header, linking to the translation of the current page or, when
  none exists, to that locale's homepage.

*Exit:* all three locales pass the same smoke test; no German string on an `/en` or `/es`
page; `hreflang` lists exactly the existing translations; `LAUNCHED_LOCALES` = de, en, es.

## 6. Later, separately

- `inline` configurator block (§4).
- `production` dataset and Vercel env, after the DPA review; revalidation webhook with
  signature check; daily encrypted EU exports with 30-day retention (ADR 0007).
- Product Definition Drafts in Sanity — needs the Release Candidate / Release Bundle module
  first.
- Nice-to-haves from the survey: DD's "import blocks from another page" input, 1SP's
  revalidate document action and reusable block groups.

## 7. Risks

| Risk | Mitigation |
| --- | --- |
| Moving routes under `[locale]` breaks a functional route | Phase 1 is its own commit with a URL checklist; nothing else changes in it |
| Port changes the look of the homepage | Before/after screenshots per section in Phase 4 |
| Studio bundle bloats the site | Studio in its own route group and root layout; check `scripts/verify-server-bundle.mjs` still passes |
| Viewer token reaches the browser in draft mode | Viewer role only, draft mode requires a Studio session; note it in ADR 0013 |
| Hero film bandwidth on Sanity's CDN | Video object accepts a Sanity file or an external URL; decide per asset |
| Production content before the DPA review | Only `development` with synthetic content until the review is signed |
