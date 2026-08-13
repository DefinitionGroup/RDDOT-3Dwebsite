---
status: accepted
---

# Use Sanity only for scoped editorial content

rotpunkt Signature will use Sanity conditionally as an editorial authoring system for non-personal Editorial Content and Product Definition Drafts. It will not use Sanity as the runtime source of configurator rules, numeric pricing, production assets, customer or transactional data, nor as authorization for Release Bundle activation.

The condition is material: Sanity's current subprocessor disclosure lists Google Cloud processing in Belgium as primary and in the United States, alongside other non-EU processing. Before provisioning production Sanity, the organization must explicitly approve its DPA, transfer-impact assessment, subprocessors, and the restricted data classification. If policy requires zero United States processing for any project information, Sanity is disqualified and an EU-hosted CMS must satisfy the same `EditorialContent` Module Interface.

## Consequences

The `EditorialContent` Module Interface returns application-owned Editorial Page and site-chrome models. Sanity document and query shapes remain inside a Sanity Adapter; local content is a temporary migration Adapter. Public runtime reads only the published perspective. Authorized Editorial Preview reads drafts without caching and disables external/customer side effects. Release Candidate Preview and activation remain application-owned workflows backed by Postgres.

Editorial Pages use document-level localization. The page builder exposes only curated, versioned Page Blocks. A Configurator Block carries editorial presentation and a stable `productKey`, not executable rules, pricing, or asset locations. The application owns routing, locale prefixes, redirects, canonical output, sitemap eligibility, block renderers, validation, accessibility, and responsive behavior.

Production and development use separate private datasets; development contains synthetic content. Staging normally reads published production content rather than relying on a manually synchronized dataset. Built-in Contributor and Editor roles govern editorial drafting and publication, while a separately authenticated Release Manager activates Release Bundles. Distinct server-only credentials cover published reads, draft preview, optional status writeback, and webhook verification.

Only publication-ready editorial assets enter Sanity because Sanity assets remain publicly retrievable even when their dataset is private. Customer uploads, Generated Photos, confidential product files, and production 3D assets stay in their designated EU object storage.

Known public pages serve last known-good cached models during a Sanity outage, while uncached pages and preview fail visibly. Schemas and transformations remain in Git. Daily encrypted EU exports with 30-day retention and quarterly restore/import rehearsals provide portability and an operational exit path.
