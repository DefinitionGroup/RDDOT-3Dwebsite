---
status: accepted
---

# Use portable SQL on Neon Frankfurt

rotpunkt Signature will store application-owned transactional state and self-hosted Better Auth data in Neon Postgres on AWS Frankfurt. Application queries use Kysely over the standard `pg` driver, while timestamped plain SQL migrations managed by dbmate remain the authoritative schema history.

Neon is selected for its serverless connection pooling, Frankfurt placement, and isolated preview branching. Kysely is selected over a generated-client ORM because the important data behavior lives in explicit PostgreSQL transactions, constraints, optimistic updates, JSONB snapshots, idempotency, and an outbox. Plain SQL preserves reviewability and a practical migration path to ordinary Postgres or Crunchy Bridge.

## Consequences

Neon is used only as managed Postgres. Runtime processes use pooled least-privilege roles; migrations, exports, and administrative work use direct connections and separate credentials. Production and non-production are separate projects, and preview branches contain synthetic data only.

Better Auth tables live in `auth` and application-owned tables live in `app`, with separate runtime roles and pools. Better Auth-generated schema changes are reviewed and incorporated into the same repository migration history. Domain ownership continues to use `CustomerAccount.id`, never an auth-table identifier.

Kysely and generated database types remain inside server-only Postgres Adapters. Application Modules consume purpose-built repository Interfaces and explicit outcomes rather than generic repositories or query builders. Real Postgres contract tests verify constraints, concurrency, transactions, JSONB, migrations, and authorization predicates.

The team owns SQL migration design, online expand/contract releases, pool sizing, backup exports, and restore drills. Production requires RPO of at most five minutes, RTO of at most four hours, at least seven days of PITR, daily encrypted off-account EU logical exports retained for 30 days, and a proven restore path to ordinary Postgres. Failure to meet those gates triggers a Neon plan change or migration to Crunchy Bridge.
