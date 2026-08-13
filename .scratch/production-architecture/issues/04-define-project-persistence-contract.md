# Define the Project persistence and revision contract

Type: grilling
Status: resolved
Blocked by: none
Map: ../map.md

## Question

What invariants, ownership rules, autosave behavior, Configuration Revision triggers, Shared Revision Link semantics, retention rules, and Quote Request snapshots must the Project module guarantee?

## Comments

- 2026-08-12: The user approved multiple Projects per Customer Account, created only by an explicit save/import after sign-in.
- 2026-08-12: The user approved debounced server autosave of Working Configuration with optimistic concurrency, rejection of stale writes, and configuration-only browser crash recovery rather than full offline operation.
- 2026-08-12: The user approved immutable Configuration Revisions for explicit version saves, sharing, AI-photo generation, and Quote Requests, with identical normalized snapshots reused by hash.
- 2026-08-12: Each deliberate Guest Configuration import creates a new Project, while an idempotency key prevents retry or refresh duplicates.
- 2026-08-12: Project lifecycle includes reversible Archive and 30-day Trash, plus confirmed immediate permanent deletion. Customer Account deletion overrides Project retention after its seven-day reversible window.
- 2026-08-12: Each Shared Revision Link is independently revocable, defaults to 90-day expiry, remains fixed to one Configuration Revision, and exposes no Project metadata, account data, or Quote Requests.
- 2026-08-12: Configuration Revisions remain immutable for the Project lifetime and may carry an optional label and trigger, but cannot be individually deleted in the First Production Release.
- 2026-08-12: A Quote Request freezes its revision, Product Definition version, normalized configuration/hash, displayed nonbinding price context, locale, contact data, submitted note/photo, consent versions, and timestamp; retries are idempotent and later edits cannot change it.
- 2026-08-12: Historical revisions retain their configuration schema, Product Definition version, and required display snapshot. Working Configuration migration is explicit, previewed, and creates a new revision rather than silently applying current defaults.
- 2026-08-12: Editable Project name and private notes are mutable metadata outside Kitchen Configuration, revision hashes, and shared links.
- 2026-08-12: The user approved a deep Project Module that owns persistence lifecycle but not sharing, photo execution, Quote Requests, CRM, email, AI, or commerce integrations.
- 2026-08-12: Share, photo, and quote actions must checkpoint the expected Working Configuration version atomically with their internal record or outbox entry; stale conflicts create no side effect.
- 2026-08-12: Archived Projects are read-only until restored and retain active shared links. Trash blocks activity, permanently revokes shared links, and cancels queued photo jobs; restoration does not recreate links.
- 2026-08-12: Permanent Project deletion purges all Project-owned data. Submitted Quote Requests survive only under a documented retention rule and must then be detached or irreversibly anonymized and minimized.

## Answer

Each Customer Account may own multiple Projects, while each Project has exactly one owner and exactly one mutable Working Configuration. A Project is created only through an explicit save or Configuration Import after verified sign-in. Import always creates a new Project, copies rather than claims Guest Configuration state, and is idempotent per import operation so retries cannot create duplicates. Project name and private notes are mutable Project Metadata outside the Kitchen Configuration.

Valid Working Configuration changes are debounced and persisted with an expected version. A stale update is rejected rather than silently overwriting another tab or device; the customer may load the latest state or save their state as a new Project. A short-lived browser recovery draft may contain normalized configuration state only. Private notes, contact data, photos, and full offline-first behavior are excluded.

Autosave never creates Configuration Revisions. The Project Module creates or reuses an immutable revision when the customer explicitly saves a version or initiates sharing, AI-photo generation, or a Quote Request. Revisions are deduplicated by normalized configuration hash, may carry an optional label and trigger, and cannot be edited or individually deleted in the First Production Release. Each preserves its configuration schema version, Product Definition version, normalized payload, and the minimal display snapshot required for historical rendering. Old revisions are never silently re-normalized through current defaults; migrating a Working Configuration is explicit, previewed, and produces a new revision.

Each Shared Revision Link uses an independently revocable, unguessable token fixed to one Configuration Revision, expires after 90 days unless renewed, and never follows later Project edits. It exposes only the product/configuration snapshot—never Project Metadata, Customer Account data, or Quote Requests. Shared links cannot authorize mutations. Tokens are stored and handled as secrets, shared pages are not indexed, and the application prevents token leakage through referrers or routine logs.

A Quote Request is an immutable, idempotently submitted snapshot containing its Configuration Revision, Product Definition version, normalized configuration/hash, displayed nonbinding price breakdown and currency/tax context, locale, contact snapshot, deliberately submitted note and selected Generated Photo, consent versions, and submission timestamp. Later Project changes cannot alter it.

The deep Project Module owns creation/import, Project Metadata, Working Configuration, optimistic versioning, revisions, Archive, Trash, restoration, and deletion. Separate sharing, Photo Job, and Quote Request Modules consume revision IDs. Their use-case Modules checkpoint the expected working version and create/reuse the revision together with the internal share/job/request record or transactional outbox entry. Conflicts or validation failures create no external side effect; provider calls occur after the durable internal transaction.

Archive removes a Project from the active workspace and makes it read-only until restored; existing shared links remain live. Trash starts a 30-day recovery window, blocks Project activity, permanently revokes its shared links, and cancels queued photo work. Restoring a Trashed Project does not recreate revoked links. Confirmed permanent deletion purges its Working Configuration, revisions, metadata, photos, jobs, and share records. A submitted Quote Request remains only when a documented legal or contractual retention rule requires it; otherwise it is deleted, and any retained record is detached or irreversibly anonymized and minimized. Customer Account deletion overrides Project Trash after the approved seven-day account-deletion window.

See [ADR: Separate mutable Project work from immutable revisions](../../../docs/adr/0003-separate-working-configuration-from-revisions.md).
