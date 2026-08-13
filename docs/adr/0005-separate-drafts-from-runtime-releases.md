---
status: accepted
---

# Separate editable drafts from immutable runtime releases

rotpunkt Signature will separate mutable Sanity authoring from the immutable data used by the configurator. Sanity editors may prepare Product Definition Drafts, but a privileged publication Module validates and promotes them into portable Product Definition Releases stored by the application. A Product Definition Release activates atomically with a compatible Asset Manifest and, when numeric pricing is enabled, a commercially approved Price Book Release.

This avoids letting an editorial publish mutate an in-progress customer configuration, invalidate a historical share, change a Quote Request, or silently alter a Price Indication. It also keeps executable validation behavior, customer data, and commercial truth outside Sanity while preserving an editor-friendly workflow.

## Consequences

Kitchen Configurations carry immutable release identifiers and remain pinned to one Release Bundle until explicit migration. Configuration Revisions preserve those identifiers plus sufficient historical display data. Existing sessions and Projects do not switch when a new bundle activates.

Sanity owns editorial content and drafts; code owns schemas, rule evaluation, validation, normalization, and renderers; Postgres owns runtime releases and customer state; approved object storage/CDN owns immutable production files; and a future commerce or ERP Adapter may supply commercial data without becoming the Project or configurator model.

Release publication requires validation and distinct product/commercial approval. Runtime never falls back from a missing release to mutable Sanity data or local defaults. Legacy URL state resolves only through an explicit compatibility map, and an unsafe legacy configuration fails visibly.

Retired or emergency-withdrawn releases remain available for referenced history. Artifacts may be garbage-collected only after reference checks prove that no retained revision, share, photo, or Quote Request depends on them. This increases storage and publication complexity in exchange for reproducibility, safe rollouts, and provider-independent ownership.
