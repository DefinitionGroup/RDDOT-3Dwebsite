# Let the GROQ queries be the Sanity adapter

- Status: accepted
- Date: 2026-10-01 (decided), 2026-10-29 (recorded)
- Deciders: Martin (product), Claude (implementation)
- Amends: ADR 0007 (scoped editorial content)
- Related: `.scratch/sanity-pagebuilder/spec.md` §2.2, `blocks/CONTRACT.md`, `SANITY.md`

## Context

ADR 0007 keeps Sanity behind an `EditorialContent` Module Interface: it returns
application-owned Editorial Page and site-chrome models, Sanity document and
query shapes stay inside a Sanity Adapter, and local content is a temporary
migration Adapter. It does not say what that Adapter is made of.

The usual reading is a mapper per Page Block: fetch the stored document, then
convert each block into a hand-written application type. The house pattern for
Sanity sites (`dfn-studio:sanity-buildup`) does something else: GROQ
projections resolve references, assets and locales on Sanity's side, and
Sanity TypeGen generates the result types the components consume. The page
builder was built that way (spec Phases 3 to 7), so the two had to be
reconciled before anyone added a block under the wrong assumption.

## Decision

1. **The projections are the adapter.** The queries in `sanity/lib/queries.ts`
   select only what the site renders. They resolve image and file assets to
   plain objects (URL, dimensions, blur placeholder), follow translation
   links, and pick a field-level localized value for the requested locale. A
   missing value stays null; another language never stands in. So the result
   is already an application model, not a stored document.

2. **The generated result types are the application models.** `pnpm typegen`
   writes them to `sanity.types.ts`. `blocks/types.ts` names them for the
   application: `PageDocument`, `PageBlock`, `BlockOf<T>`, `BlockProps<T>`,
   `SiteChrome`, `SiteSettings`, `ResolvedImage`. Components import these,
   never `sanity.types.ts` document types, never the client.

3. **The loaders are the `EditorialContent` Module Interface.**
   `sanity/lib/loaders.ts` is the only place editorial content is fetched:
   `loadPage`, `loadSiteChrome`, `loadSiteSettings`, `loadSitemapPages`.
   Redirects have their own reader for the proxy
   (`sanity/lib/redirect-table.ts`). Every read is server-side and carries the
   `sanity` cache tag.

4. **Demo content is the local-content adapter.** `content/` holds the site's
   content in the shape the queries return. The loaders answer from it only
   when no Sanity project is configured. Once one is, a missing document is a
   real 404, never masked by demo data. Because the demo content type-checks
   against the generated types, a query change that the demo content no longer
   satisfies fails the build. `pnpm sanity:seed` inverts the demo content into
   stored documents and reads them back through the same queries.

5. **Three Sanity traits reach the components on purpose:**
   - In Editorial Preview, `PageBuilder` wraps each block in a `data-sanity`
     attribute (document id and array path) and strings carry stega markers.
     Strings used as logic (anchors, product and finish keys) go through
     `stegaClean`. Public pages carry neither.
   - Images keep their asset `_id`, crop and hotspot. Blocks turn them into
     URLs and focal points only through `sanity/lib/image.ts` and
     `components/sanity-image.tsx`.
   - Blocks keep `_key` and `_type`, which the page builder needs for order and
     dispatch.

Rejected: a hand-written mapper per block from stored shape to a separate
application type. It doubles the work of every block, gives no runtime gain,
and its types would drift from the queries unchecked, while TypeGen's cannot.

## Consequences

Every schema or query change ends with `pnpm typegen` and a commit of
`schema.json` and `sanity.types.ts`. `prebuild` runs TypeGen, and CI fails when
the committed files differ from what it generates. Queries must be top-level,
uniquely named `defineQuery` calls; TypeGen does not see inline or duplicated
ones.

Configurator rules and prices still never travel through these queries (ADR
0007). A Configurator Block carries a `productKey` and finish keys. Its
component resolves them through `features/configurator/catalog.ts` at render
and drops the link and price, keeping the copy, for a key the configurator
does not know.

Leaving Sanity, as ADR 0007 requires to stay possible, means another source
producing the same result shapes behind the same loaders. The demo content
already does this. The real cost is naming: the types are generated from
Sanity's queries today, so a replacement would first have to own them by hand.

In Editorial Preview the browser receives the Viewer token so drafts can
stream in (`sanity/lib/live.ts`). It must stay a read-only Viewer token. Draft
mode is entered only through `/api/draft-mode/enable` with the Presentation
tool's secret, and public visitors never receive the token: `SanityLive` mounts
only in draft mode and in development.
