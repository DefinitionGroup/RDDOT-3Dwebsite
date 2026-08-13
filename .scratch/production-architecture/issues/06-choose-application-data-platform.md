# Choose the application data platform and access layer

Type: grilling
Status: resolved
Blocked by: 01, 04, 05
Map: ../map.md

## Question

Which managed Postgres platform, schema-migration approach, and application data-access interface should own first-party transactional state while preserving local testability, EU operation, backup recovery, and provider portability?

## Comments

- 2026-08-12: The user approved Neon on AWS Frankfurt as the managed Postgres platform, with Crunchy Bridge retained as the documented provider-migration fallback.
- 2026-08-12: Neon is used strictly as standard managed Postgres. Neon Auth, Data API, and provider-specific domain features may not become architecture dependencies; application schema and migrations remain repository-owned.
- 2026-08-12: Production and non-production use separate Neon projects. Staging, preview branches, and deterministic seeds contain synthetic data only; previews never branch production customer data and are automatically deleted.
- 2026-08-12: Runtime processes use pooled, least-privilege database roles. Migrations, backup, and restore use direct connections and separate controlled credentials. Browsers, React, 3D, Sanity, and third-party providers never connect directly to Postgres.
- 2026-08-12: The launch recovery targets are at most five minutes of transactional data loss and restoration within four hours, at least seven days of PITR, daily encrypted logical exports retained for 30 days in a separate EU account, a pre-launch restore rehearsal, and quarterly restore drills. The production plan must change or Crunchy Bridge replaces Neon if these targets cannot be met.
- 2026-08-12: The user approved Kysely over the standard `pg` driver for application repositories, with parameterized direct SQL retained only as an internal escape hatch.
- 2026-08-12: The user approved dbmate-managed timestamped plain SQL migrations and a committed `db/schema.sql`. CI is the only migration executor, uses the direct connection, and application processes never migrate on startup.
- 2026-08-12: Better Auth uses its built-in PostgreSQL adapter, database sessions, a separate `auth` schema, role, and pool. Reviewed Better Auth-generated SQL enters the same repository-owned migration history.
- 2026-08-12: Purpose-built repository Interfaces expose domain operations and minimal DTOs only. Kysely types, generated database types, rows, transaction objects, and SQL errors may not cross the persistence seam.
- 2026-08-12: A narrow persistence spike must verify fresh migrations, Better Auth identity mapping, concurrent autosave conflicts, revision/outbox atomicity, local/Neon contract-test parity, and restore into ordinary Postgres before dependency versions are locked.

## Answer

Use **Neon managed Postgres in AWS Frankfurt (`eu-central-1`)** for application-owned transactional data and self-hosted Better Auth. Use Neon only as standard Postgres: do not adopt Neon Auth, its Data API, provider-specific domain features, or any extension that would materially obstruct migration to ordinary Postgres. **Crunchy Bridge** remains the documented fallback if Neon cannot meet the production recovery, contractual, or operational gates.

Production and non-production use separate Neon projects. Production data may never be branched into development or preview environments. Staging contains synthetic data; preview deployments receive short-lived branches derived from synthetic staging, apply the complete migration history and deterministic seeds, and are automatically removed. Local development and repository integration tests use real local Postgres pinned to the selected production major.

Next.js Node-runtime processes and workers connect through Neon's pooled endpoint with small, measured pools and least-privilege roles. Better Auth uses a separate pool and `auth_runtime` role; application repositories use an `app_runtime` role. Migrations, schema generation, logical exports, and restore operations use the direct endpoint and separate controlled credentials. Browser code, React Client Components, the 3D engine, Sanity, AI providers, and future commerce providers never receive database credentials or connect directly.

For application persistence, use **Kysely over `pg`**. Kysely is an infrastructure Adapter only; generated database types, query builders, transaction objects, rows, and SQL errors remain inside the server-only persistence implementation. Domain and application Modules depend on purpose-built repository Interfaces such as saving a versioned Working Configuration, checkpointing a revision, importing a Guest Configuration, or trashing a Project. They accept domain identifiers, enforce owner predicates, return minimal DTOs or explicit outcomes, and never expose a generic repository or arbitrary query Interface. Parameterized direct SQL through Kysely or `pg` remains an internal escape hatch for exceptional queries and operational scripts, not a second public query style.

Use **dbmate** with timestamped, plain PostgreSQL migrations under `db/migrations/` and commit a regenerated `db/schema.sql`. SQL in Git is authoritative. Never rewrite an applied migration or make production-only dashboard changes. CI/CD runs exactly one migration job through the direct connection before compatible application rollout; application instances never mutate schema on boot. Material changes use expand/backfill/contract releases, and non-transactional operations such as concurrent indexes are explicit, reviewable exceptions.

Better Auth uses its built-in PostgreSQL adapter, database-backed opaque sessions, and a separate `auth` schema. Its generated schema is not permitted to mutate production directly: pin Better Auth, generate and review its SQL during upgrades, incorporate that SQL into the same migration history, and run identity/session integration tests. Domain tables live in `app`; Projects reference `app.customer_account.id`, never Better Auth's user ID. Fixed roles/default schema configuration or explicit qualification replaces request-time `search_path` changes, which are unsafe through transaction pooling.

The launch recovery objectives are **RPO <= 5 minutes** and **RTO <= 4 hours**. Enable a Neon plan with at least seven days of point-in-time recovery and add daily encrypted logical exports retained for 30 days in a separate EU account. Complete a documented restore rehearsal before launch and quarterly thereafter. If the chosen Neon plan or operating model cannot prove those outcomes, upgrade it or move to Crunchy Bridge before production rather than weakening the objectives.

Before locking exact dependency and Postgres versions, complete a narrow persistence spike that proves: zero-to-current migrations over a direct connection; Better Auth session-to-`CustomerAccount.id` resolution; two-writer optimistic conflict behavior; atomic revision, job/request, and outbox creation; the same repository contract suite against Testcontainers and a Neon preview branch; and restore of the schema/logical export into ordinary local Postgres. Runtime JSON snapshots still require explicit application validation because TypeScript/Kysely types are not runtime validation.

See [the primary-source access-layer comparison](../research/postgres-access-layer.md), [the managed Postgres comparison](../research/eu-postgres-platforms.md), and [ADR: Use portable SQL on Neon Frankfurt](../../../docs/adr/0004-use-portable-sql-on-neon-frankfurt.md).
