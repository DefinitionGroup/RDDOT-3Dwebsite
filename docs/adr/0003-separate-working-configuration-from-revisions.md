---
status: accepted
---

# Separate mutable Project work from immutable revisions

rotpunkt Signature will store one mutable Working Configuration per Project and separate immutable Configuration Revisions for meaningful milestones. Autosave updates only the Working Configuration with optimistic version checking. Explicit version saves, sharing, AI-photo generation, and Quote Requests create or reuse a revision from the current normalized configuration.

This avoids producing a noisy revision for every configurator interaction while ensuring every externally observed artifact refers to an exact historical state. It also avoids event sourcing: the application needs durable milestones and conflict detection, not reconstruction of every control interaction.

## Consequences

The Project Module owns Project creation/import, metadata, Working Configuration, concurrency, revisions, Archive, Trash, restoration, and deletion behind one small Interface. Sharing, Photo Job, and Quote Request Modules reference immutable revision IDs and do not read mutable configurator state directly.

Actions that share, generate, or submit must checkpoint the expected Working Configuration version and durably create their internal record or outbox entry before any provider call. Stale writes fail visibly rather than using last-write-wins. Configuration Revisions are deduplicated by normalized hash and retain the schema, Product Definition version, and minimal display snapshot necessary for historical rendering.

Historical snapshots duplicate some descriptive data and cannot be edited or individually deleted in the First Production Release. This storage cost buys stable sharing, reproducible photo inputs, immutable Quote Requests, and explicit migration when a Product Definition changes.

## Implemented Project-version slice

The active-Project configurator now exposes an explicit version-save action and a cursor-paginated historical list. Version save checkpoints the caller's expected Working Configuration version, creates or reuses the immutable revision identified by Project, schema version, Product Definition version, and normalized configuration hash, and records the outbox intent transactionally. It does not advance the Working Configuration version and repeated saves of the same state do not create duplicate history entries.

Historical display snapshots are built from the Product Definition version pinned to the Configuration Revision. If that definition is unavailable, the checkpoint fails instead of presenting current labels or prices as historical truth.

Revision listing and restoration are owner-scoped. Restore locks and checks the expected Working Configuration version, rejects stale callers, and restores the revision's configuration together with its Product Definition identity. Before replacing a different current state, it creates or reuses a labeled safety revision so the displaced work remains recoverable; restoring an already active revision is a no-op.
