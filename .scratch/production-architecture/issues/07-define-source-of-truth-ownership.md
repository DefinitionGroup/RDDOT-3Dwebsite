# Define product, content, configuration, and pricing ownership

Type: grilling
Status: resolved
Blocked by: none
Map: ../map.md

## Question

Which system is authoritative for editorial content, Product Definitions, configuration rules, price indications, authoritative quotes, 3D asset manifests, and later catalog data, and which version identifiers must cross those seams?

## Comments

- 2026-08-12: Sanity owns published pages, navigation, SEO, localized editorial copy, marketing-media selection, and presentation. Code owns schemas and renderers. Sanity may not own accounts, customer configurations, prices, quotes, jobs, or Orders.
- 2026-08-12: Sanity may hold an editable Product Definition Draft, but a validation/publication Module creates an immutable portable Product Definition Release stored in Postgres. Configurators and Configuration Revisions consume the release rather than a mutable Sanity document.
- 2026-08-12: Code owns the versioned rule schema, validation, normalization, and evaluation behavior. Product Definition Releases contain declarative options and compatibility data, never executable editor-authored rules.
- 2026-08-12: Guest Configuration remains normalized browser/URL state. Postgres owns Working Configurations and immutable Configuration Revisions; Sanity, AI, CRM, and future commerce systems do not own customer configuration state.
- 2026-08-12: Immutable hash-addressed models and textures live in object storage/CDN. A versioned Asset Manifest identifies named nodes, material slots, cameras, checksums, and performance metadata; Product Definition Releases reference only approved manifest versions.
- 2026-08-12: Sanity may not own numeric prices. An application-owned immutable Price Book Release and server-only Pricing Module produce nonbinding Price Indications. Every displayed indication and Quote Request records the Price Book Release; a future ERP or commerce provider synchronizes through an Adapter rather than becoming the Project model.
- 2026-08-12: Sanity editors prepare drafts, while a privileged Release Manager promotes Product Definition Releases only after automated schema, compatibility, asset, localization, and render-smoke validation. Price Book Releases additionally require a designated commercial owner.
- 2026-08-12: Cross-system records use stable `productKey`, immutable `productDefinitionReleaseId`, `configurationSchemaVersion`, `assetManifestReleaseId`, and, when priced, `priceBookReleaseId`, plus content hashes. Sanity document IDs and human labels are not integration identifiers.
- 2026-08-12: New configurations use the active release. Previous releases remain readable for retained history; existing Working Configurations migrate only through explicit preview. Emergency withdrawal blocks new commercial actions without destroying historical interpretation.
- 2026-08-12: Editorial pages may use their last valid cached publication during Sanity failure. Runtime releases never fall back to Sanity drafts or local TypeScript defaults. Without a valid Price Book Release, configuration/save/share continue, while Price Indication and Quote Request submission fail closed.
- 2026-08-12: The First Production Release has Price Indications and Quote Requests but no Authoritative Quote. A future approved CRM, ERP, or commerce platform owns sellable SKUs, Authoritative Quotes, inventory, tax, Orders, and fulfillment; the application keeps immutable handoff snapshots and opaque external references.
- 2026-08-12: Product Definition, compatible Asset Manifest, and, when enabled, Price Book releases activate as one atomic Release Bundle only after every referenced artifact exists and validates.
- 2026-08-12: Guest and Working Configurations remain pinned to the Release Bundle on which they started. New activation never changes options, visuals, or Price Indications mid-session; migration is explicit.
- 2026-08-12: Legacy `?c=` payloads remain decodable. A versioned compatibility mapping may resolve a missing release ID; unsafe or unknown state fails visibly instead of silently applying current defaults.
- 2026-08-12: Releases and assets referenced by retained revisions, shares, photos, or Quote Requests cannot be deleted. Only unreferenced retired artifacts may be garbage-collected after a defined cooling period; emergency withdrawal blocks new use but preserves history.

## Answer

Ownership is deliberately split between editable authoring systems and immutable runtime authorities.

**Sanity** owns published editorial pages, navigation, SEO, localized marketing copy, approved marketing-media selection, and editorial presentation. Application code owns Sanity schemas, validation adapters, and page/block renderers. Sanity never owns Customer Accounts, Projects, Working Configurations, Configuration Revisions, Generated Photos, Price Book Releases, Quote Requests, jobs, or Orders.

Sanity may expose an editor-friendly **Product Definition Draft**, but the public configurator never consumes that mutable document directly. A privileged Release Manager promotes a draft through a server-only publication Module. Promotion validates the configuration schema, declarative compatibility data, stable keys, required localization, referenced Asset Manifest, runtime budgets, and render smoke tests, then stores an immutable portable **Product Definition Release** in Postgres. Editors cannot publish executable rules or arbitrary runtime URLs. Code owns the versioned rule schema, validator, normalizer, evaluator, and migration behavior.

Immutable, hash-addressed production models and textures live in approved object storage/CDN. An immutable **Asset Manifest** names models, texture/material slots, scene roles, cameras, checksums, compatibility data, and runtime characteristics. Sanity may select only approved manifest versions. It does not become an asset registry, and a Product Definition Release never references an unvalidated arbitrary URL.

Numeric pricing is not editorial content. An application-owned, immutable and commercially approved **Price Book Release** supplies the server-only Pricing Module. Initially its inputs enter through a controlled repository/operations workflow; later an ERP or commerce Adapter may synchronize them without changing the application contract. Sanity owns localized price labels and disclaimers only. A **Price Indication** is explicitly nonbinding and records the Price Book Release used; every Quote Request preserves the exact displayed breakdown and pricing context.

A Product Definition Release, its compatible Asset Manifest, and, when pricing is available, its Price Book Release activate as one atomic **Release Bundle**. The active pointer changes only after all artifacts exist and pass validation. Product Definition and price approval remain separate responsibilities: Sanity editors prepare drafts, a Release Manager promotes product/asset releases, and a designated commercial owner approves Price Book Releases. Editing or publishing a Sanity document cannot mutate an active runtime release.

Every Kitchen Configuration carries a stable `productKey`, immutable `productDefinitionReleaseId`, `configurationSchemaVersion`, `assetManifestReleaseId`, and, once calculated, `priceBookReleaseId`, plus relevant content hashes. Sanity IDs, document revisions, filenames, URLs, labels, and future provider IDs are never the application integration key. Guest Configuration remains normalized browser/URL state; Postgres owns Working Configurations and Configuration Revisions. AI, CRM, Sanity, and future commerce systems only receive snapshots or opaque references required by their Adapter.

New configurations start on the active Release Bundle and remain pinned to it for the session and Project. Activating another bundle does not change selections, visuals, rules, or Price Indications in an open configuration. Previous releases may be retired from new use while remaining readable for Projects, revisions, shares, photos, and Quote Requests. Working Configuration migration requires a compatibility result and explicit customer preview/acceptance, and creates a new revision. Emergency withdrawal blocks new configuration or commercial actions as appropriate but preserves a minimal historically renderable snapshot.

Current shareable `?c=` URLs remain backward-compatible. The decoder reads old schema versions; when a legacy payload lacks a release identifier, a versioned compatibility mapping may select one explicitly designated compatible bundle. On the next share it emits the release-aware shape. If mapping or validation is unsafe, the application shows a migration/unavailable state rather than substituting current defaults.

Published editorial pages may serve their last valid cached Sanity publication during a Sanity outage. Configurator runtime releases load from the application release store/cache and never fall back to a draft or the prototype's local TypeScript constants. If no valid Price Book Release is available, browsing, configuring, saving, and sharing may continue without numeric amounts, but Price Indication and Quote Request submission fail closed with a clear message.

The First Production Release has no Authoritative Quote. A future approved CRM, ERP, or commerce system may own sellable SKUs, inventory, tax, Authoritative Quotes, Orders, payments, fulfillment, and returns. The application preserves immutable handoff snapshots and opaque external references, while Product Definition Releases remain authoritative for configurator behavior and historical interpretation.

Release and asset retention follows references, not editor visibility. Artifacts referenced by retained Configuration Revisions, Shared Revision Links, Generated Photos, or Quote Requests cannot be deleted. Only unreferenced retired artifacts may be garbage-collected after an operationally defined cooling period and verification. See [ADR: Separate editable drafts from immutable runtime releases](../../../docs/adr/0005-separate-drafts-from-runtime-releases.md).
