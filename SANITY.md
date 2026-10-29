# Sanity

How the rotpunkt Signature site uses Sanity, and how to work on it. What Sanity may
hold and what it may not: [ADR 0007](docs/adr/0007-use-sanity-only-for-scoped-editorial-content.md).
Why the queries are the adapter: [ADR 0013](docs/adr/0013-let-the-groq-queries-be-the-sanity-adapter.md).
Writing a Page Block: [blocks/CONTRACT.md](blocks/CONTRACT.md). The build-up, phase by
phase: `.scratch/sanity-pagebuilder/spec.md`.

## What lives in Sanity

Editorial content only, in four document types:

| Type | Localization | In the Studio |
| --- | --- | --- |
| `page` | one document per language, linked as translations (`translation.metadata`) | Seiten → Deutsch / English / Español |
| `navigation` | one fixed document per language (`navigation-de`, `-en`, `-es`) | Navigation → per language |
| `siteSettings` | one fixed document (`siteSettings`); its labels are localized per field | Website-Einstellungen |
| `redirect` | none | Weiterleitungen |

An Editorial Page is ordered Page Blocks plus its title, slug, homepage flag and SEO.
A translation that does not exist is a 404, never another language's content.

Never in Sanity: configurator rules, options and prices (`features/configurator/`,
read by blocks through `catalog.ts`), customer data, Generated Photos, production 3D
assets. Sanity assets are publicly retrievable even from a private dataset, so only
publication-ready pictures and films go in.

## Project, datasets, accounts

- Project `06g3ozu4`, owned by Martin's Google login.
- Dataset `development`: private, synthetic content only. Local development and the
  Vercel test environment read it.
- Dataset `production`: not created. It waits for the DPA and transfer review of
  ADR 0007.
- The Sanity MCP connection in Claude sessions is signed in to another account
  (`devsp1@definition.group`) and has no grant on `06g3ozu4`. Work on the project
  through the Sanity CLI instead, after `pnpm exec sanity projects list` shows
  Martin's login. A project token can stand in for one command
  (`SANITY_AUTH_TOKEN=… pnpm exec sanity …`); it is never committed.

## Environment

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | `06g3ozu4`. Unset: demo mode (below). |
| `NEXT_PUBLIC_SANITY_DATASET` | `development` |
| `NEXT_PUBLIC_SANITY_API_VERSION` | `2026-10-01` |
| `SANITY_API_READ_TOKEN` | A Viewer token. The dataset is private, so published reads need it too. In Editorial Preview the browser receives it, so it must never carry write access. |
| `SANITY_REVALIDATE_SECRET` | The publish webhook's secret. Unset: `/api/webhooks/sanity` answers 404. |

`.env.example` documents each one. Vercel has the project, the dataset and the read
token since 2026-10-15 (the API version falls back to the same date in code); the
webhook secret is not set yet.

## Demo mode

Without `NEXT_PUBLIC_SANITY_PROJECT_ID` the site renders from `content/`: the
homepage and navigation in German, English and Spanish, and the site settings, all in
the shape the queries return. `/studio` then shows a setup notice. CI builds this way.
Once a project is configured, demo content never stands in: a missing document is a
404. Keep the demo content complete; it is also the seed's source.

## How the site reads

- **Only on the server.** `sanity/lib/loaders.ts` is the one place content is fetched
  (`loadPage`, `loadSiteChrome`, `loadSiteSettings`, `loadSitemapPages`). Blocks never
  fetch.
- **Published only** for the public site, through Sanity's CDN in production builds.
- **Cached** under the `sanity` tag. Public visitors open no connection to Sanity.
  `SanityLive` mounts only in Editorial Preview and in development, because a visitor's
  IP address is personal data (ADR 0007).
- **Published edits** reach the deployed site when the signed publish webhook expires
  the `sanity` tag. Until the webhook is set up, they appear only after a redeploy.
- **Redirects** are read by `proxy.ts` into a table in memory
  (`sanity/lib/redirect-table.ts`), refreshed in the background once it is older than a
  minute. A new redirect takes up to a minute per server instance; the webhook does not
  reach that memory.
- **SEO** output is code's (`lib/page-metadata.ts`, `lib/seo.ts`, `app/sitemap.ts`,
  `app/robots.ts`); Sanity supplies only the words and the share image.

## The Studio

Embedded at `/studio` (`app/(studio)/`, own root layout without the site's CSS;
configuration in `sanity.config.ts`, structure in `sanity/structure.ts`). Every origin
that serves it needs a CORS origin with credentials in the project's API settings.

- New pages start in a language (templates `page-de`, `page-en`, `page-es`).
  Navigation and the site settings are fixed documents: no duplicate, no delete.
- Field titles and help texts are German. Product and finish fields offer only what
  the configurator knows, and validation refuses anything else.
- **Editorial Preview:** the Presentation tool opens the site in draft mode through
  `/api/draft-mode/enable`. Drafts stream in, blocks can be clicked and reordered,
  unlaunched languages are visible, and every page answers `noindex`. "Vorschau
  beenden" leaves it. `sanity/presentation/resolve.ts` maps documents to their URLs.
  Not yet tried with a real Studio login.

## Changing the schema

1. Edit `sanity/schemaTypes/` or a block's `schema.ts`.
2. `pnpm typegen`: extracts `schema.json` and regenerates `sanity.types.ts`. Commit
   both with the change; CI fails when they differ from what TypeGen produces, and
   `prebuild` runs it too.
3. `pnpm exec sanity schema validate`.
4. `pnpm exec sanity schema deploy` once the change is merged, so the dataset's
   deployed schema (used by tools outside the Studio) matches.

A renamed or removed field leaves stored content under the old name. Write a content
migration (`pnpm exec sanity migration create`), dry-run it, run it on `development`,
and only then remove the old field. Adding an optional field needs none.

## Seeding

`pnpm sanity:seed` writes `content/` into the configured dataset: uploads the files
under `/public`, creates missing pages, navigation, translation links and the site
settings, then reads everything back through the site's own queries and compares.

- Existing documents are kept, since editors may have changed them. `--replace`
  overwrites them deliberately.
- `--dry-run` prints what it would write.
- It refuses the `production` dataset unless `--allow-production` is passed. Do not
  pass it before the ADR 0007 review.

## The publish webhook (not set up yet)

Needs Martin's go-ahead for the Vercel settings. In Sanity (API → Webhooks):

- URL `https://<domain>/api/webhooks/sanity`, the deployment's dataset.
- Trigger on create, update and delete.
- Filter `_type in ["page", "navigation", "siteSettings", "redirect", "translation.metadata"]`.
- Projection `{_id, _type}`, HTTP POST, drafts and versions off.
- Secret: the same random value as `SANITY_REVALIDATE_SECRET` on Vercel.

A delivery without a valid signature answers 401; a valid one expires the `sanity`
tag at once.

## Working on Sanity as an agent

- Read and write through the CLI as described above, never through the MCP account.
- Test documents written into `development` are deleted afterwards. A draft left
  behind shows up in every editor's Studio.
- Check rendering against the dataset with a production build
  (`TRANSACTIONAL_EMAIL_PROVIDER= pnpm build`, then `next start`), not only in dev:
  CDN, cache tags and stega behave differently there.
- After a deploy, a token must not appear in `.next/static`.
