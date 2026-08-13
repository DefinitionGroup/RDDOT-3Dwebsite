# PostgreSQL access layer for the production architecture

Research date: 2026-08-12  
Scope: application-owned transactional data for the Next.js App Router system described by [ADR 0001](../../../docs/adr/0001-application-owned-customer-identity.md), [ADR 0002](../../../docs/adr/0002-use-better-auth-with-application-controlled-sessions.md), and [ADR 0003](../../../docs/adr/0003-separate-working-configuration-from-revisions.md).

## Answer first

Use **Kysely over `pg`/node-postgres for application queries, plain PostgreSQL migrations managed by dbmate, and the built-in Better Auth PostgreSQL adapter in a separate `auth` schema**.

This is the best fit for the approved architecture because it keeps PostgreSQL—not an ORM model language—as the durable contract; gives repositories type-checked queries, multi-statement transactions, `ON CONFLICT`, `RETURNING`, schema qualification, and safe raw-SQL escape hatches; produces no generated runtime client; and remains ordinary Postgres when moving from Neon to Crunchy Bridge. Kysely describes itself as a thin, predictable SQL abstraction, ships an official PostgreSQL dialect, has zero runtime dependencies, and recommends `kysely-codegen` when the database should be the source of query types. Its current repository shows a stable `0.29.2` release from May 2026. ([Kysely overview](https://www.kysely.dev/), [Kysely repository and releases](https://github.com/kysely-org/kysely))

Use **Neon AWS Frankfurt** as already researched, with:

- a pooled runtime URL for the Next.js application and workers;
- a direct URL for migrations, schema dumps, type generation, and administrative jobs;
- the Node.js runtime for every database-touching route/action/worker;
- real local PostgreSQL, pinned to the same major version as production, for repository and migration tests.

Neon uses PgBouncer in transaction mode. It preserves a backend connection for a transaction but does not preserve session state between transactions; Neon therefore recommends direct connections for migrations and `pg_dump`. Runtime code must not depend on session `SET`, temporary tables, session advisory locks, `LISTEN`, or other session-scoped behavior through the pooled URL. ([Neon connection pooling](https://neon.com/docs/connect/connection-pooling), [Neon serverless driver](https://neon.com/docs/serverless/serverless-driver))

**Drizzle ORM/Kit is the runner-up, not the production default today.** Its capabilities fit well, and Better Auth has an official Drizzle adapter, but Drizzle's current v1 line is still a release candidate and has recent documented breaking changes. The latest stable release shown by the project is `0.45.2`, while the current v1 release stream is marked pre-release. Adopting it now means either taking an RC into production or planning a near-term ORM/Kit migration. ([Drizzle releases](https://github.com/drizzle-team/drizzle-orm/releases), [Drizzle PostgreSQL setup](https://orm.drizzle.team/docs/get-started-postgresql))

**Prisma ORM is production-capable but unnecessarily broad for this domain.** Prisma 7 is GA, Rust-binary-free by default, supports Neon and Better Auth, and generates inspectable SQL migrations. However, it still requires a generated client and driver adapter, some PostgreSQL constraints cannot be represented in Prisma Schema Language, and its TypedSQL feature remains Preview. Those are avoidable layers for a small, PostgreSQL-specific transactional core whose important behavior lives in constraints and explicit transactions. ([Prisma ORM overview](https://docs.prisma.io/docs/orm), [Prisma engines](https://docs.prisma.io/docs/orm/v6/more/internals/engines), [database feature matrix](https://www.prisma.io/docs/orm/reference/database-features), [TypedSQL](https://www.prisma.io/docs/orm/prisma-client/using-raw-sql/typedsql))

**Thin direct SQL with `pg` is viable but not the default.** It is the portability baseline and should remain available for exceptional queries, but making every repository hand-write result types, mapping, and transaction plumbing adds repeatable failure modes without a corresponding benefit. node-postgres explicitly requires every statement in a transaction to use the same checked-out client and warns that `pool.query` cannot be used for transactions. Kysely removes that footgun while staying close to the SQL. ([node-postgres transactions](https://node-postgres.com/features/transactions), [node-postgres queries](https://node-postgres.com/features/queries))

## Facts versus architecture inferences

The comparison below marks conclusions deliberately:

- **Verified fact** means the behavior is stated in a first-party project or platform source.
- **Architecture inference** means the recommendation follows from those facts plus this repository's approved contracts.
- **Release gate** means it still needs a spike or operational proof before production.

### Verified facts

1. Kysely's official PostgreSQL dialect accepts a `pg`-compatible pool, its transaction callback pins all callback queries to the transaction and commits or rolls back as a unit, and its `sql` tag parameterizes substitutions. It also supports schema-qualified query building and PostgreSQL `ON CONFLICT`. ([Postgres dialect configuration](https://kysely-org.github.io/kysely-apidoc/interfaces/PostgresDialectConfig.html), [transactions](https://kysely-org.github.io/kysely-apidoc/classes/Kysely.html), [`sql` tag](https://kysely-org.github.io/kysely-apidoc/interfaces/Sql.html), [`withSchema`](https://kysely-org.github.io/kysely-apidoc/classes/QueryCreator.html), [`ON CONFLICT`](https://kysely-org.github.io/kysely-apidoc/classes/OnConflictBuilder.html))
2. Better Auth's built-in PostgreSQL adapter takes a `pg.Pool`, is implemented through its Kysely adapter, supports schema generation and migration, and supports non-default PostgreSQL schemas. Better Auth can generate a SQL schema file for this built-in adapter. ([Better Auth PostgreSQL](https://better-auth.com/docs/adapters/postgresql), [database management](https://better-auth.com/docs/concepts/database), [CLI](https://better-auth.com/docs/concepts/cli))
3. Better Auth stores sessions in the database by default when a database is configured. Cookie caching can permit a revoked session to remain usable until cache expiry, so database validation is the appropriate setting for the previously approved immediate-revocation posture. ([Better Auth session management](https://better-auth.com/docs/concepts/session-management))
4. PostgreSQL transactions make the checkpoint/revision/outbox write all-or-nothing. PostgreSQL unique constraints plus `INSERT ... ON CONFLICT` provide the database-enforced basis for idempotency under concurrency. ([PostgreSQL transactions](https://www.postgresql.org/docs/current/tutorial-transactions.html), [`INSERT ... ON CONFLICT`](https://www.postgresql.org/docs/current/sql-insert.html), [constraints](https://www.postgresql.org/docs/current/ddl-constraints.html))
5. Next.js recommends a server-only Data Access Layer for new applications, with authorization close to the data source and minimal DTOs returned to the rendering layer. The default Node.js runtime has Node API access; the Edge runtime has a restricted API surface. ([Next.js data security](https://nextjs.org/docs/app/guides/data-security), [Next.js runtimes](https://nextjs.org/docs/app/api-reference/edge))
6. dbmate uses timestamped plain-SQL migration files, runs migrations atomically in a transaction by default, can opt individual migrations out of a transaction, can write a complete `schema.sql`, and is installable as a project dev dependency. ([dbmate repository and documentation](https://github.com/amacneil/dbmate))
7. A real disposable PostgreSQL instance can be started per test suite with the official Testcontainers Node PostgreSQL module. ([Testcontainers PostgreSQL module](https://node.testcontainers.org/modules/postgresql/))

### Architecture inferences

1. Because the application already needs exact PostgreSQL behavior—optimistic conditional updates, immutable-revision constraints, JSONB snapshots, idempotency keys, and transactional outbox writes—the durable schema should be SQL, not a lowest-common-denominator ORM schema.
2. Because Better Auth's built-in PostgreSQL adapter already uses Kysely internally, Kysely for application repositories minimizes conceptual and driver diversity without coupling application ownership to Better Auth tables.
3. Because the application owns `CustomerAccount.id`, Better Auth's `auth.user.id` must remain only an authentication subject mapped through `app.auth_identity`; it must never become a Project foreign key.
4. Because the migration source is portable SQL and runtime access is the standard PostgreSQL protocol, a future Neon-to-Crunchy migration changes connection/operations code, not domain repositories or schema ownership.
5. Because configuration snapshots are untrusted at system boundaries and Kysely's TypeScript types do not perform runtime validation, normalized Kitchen Configuration payloads still need application-level runtime parsing before being stored or returned.

## Exact recommended stack

| Concern | Recommendation | Why |
| --- | --- | --- |
| Managed database | Neon, AWS Frankfurt (`eu-central-1`) | Best current fit for serverless Next.js, preview branches, and EU primary-data placement; retain Crunchy Bridge as exit target. |
| Production PostgreSQL major | Pin one Neon-supported non-preview major and use the same major locally | Avoid version-skew surprises. At research time Neon lists PostgreSQL 14–17 as supported and 18 as preview. ([Neon compatibility](https://neon.com/docs/reference/compatibility)) |
| Runtime driver | `pg` `Pool` through Kysely `PostgresDialect` | Standard wire protocol, interactive transactions, no vendor-specific query API. |
| Runtime connection | Pooled `DATABASE_URL` | Designed for transient/concurrent application traffic. Keep a deliberately small application pool and measure it under the selected deployment host. Neon pooling is not unlimited database concurrency. ([Neon pooling](https://neon.com/docs/connect/connection-pooling), [node-postgres pool sizing](https://node-postgres.com/guides/pool-sizing)) |
| Migration/admin connection | Direct `DATABASE_URL_DIRECT` | Migrations, `pg_dump`, advisory locks, and session-dependent admin operations should bypass transaction pooling. |
| Query layer | Kysely, pinned exact version | Type-safe SQL-shaped queries and transactions without a generated runtime client. |
| Schema migrations | dbmate plain SQL in `db/migrations/`; commit `db/schema.sql` | SQL is reviewable, executable outside TypeScript, and portable to ordinary PostgreSQL. Do not use dashboard schema changes or `db push`-style production mutation. |
| Database query types | Generate infrastructure-only Kysely types from a migrated disposable database with pinned `kysely-codegen`; fail CI on drift | Kysely's official site recommends codegen when the database is the type source. Generated types remain an adapter detail. ([Kysely overview](https://www.kysely.dev/)) |
| Authentication storage | Better Auth built-in PostgreSQL adapter with a separate pool/role and `auth` schema | First-party adapter, repo-owned generated SQL, database sessions, and an explicit identity boundary. |
| Local integration tests | Testcontainers using the same PostgreSQL major | Tests real constraints, JSONB, transaction behavior, and migrations; SQLite/PGlite is not a substitute for repository contract tests. |
| Next.js runtime | Node.js only for DB-touching code; `import 'server-only'` at the persistence root | Prevent database packages, credentials, and row shapes from entering client/3D bundles. |

### Connection topology

```text
Next.js Node runtime / worker
    -> small pg Pool
    -> Neon pooled endpoint
    -> app_runtime role
    -> app schema

Better Auth server module
    -> separate pg Pool
    -> Neon pooled endpoint
    -> auth_runtime role with default search_path=auth
    -> auth schema

CI migration / backup / codegen job
    -> direct endpoint
    -> migration role
    -> auth + app schemas
```

The separate auth pool is intentional. Better Auth documents a connection-string `search_path` and a role-level default as supported options. Neon warns that session `SET search_path` does not persist through transaction pooling. A dedicated auth role with `ALTER ROLE ... SET search_path TO auth` avoids relying on a per-request session mutation; it also prevents application repositories from casually querying Better Auth internals. ([Better Auth non-default schema](https://better-auth.com/docs/adapters/postgresql), [Neon pooling limitations](https://neon.com/docs/connect/connection-pooling))

## Candidate comparison for this architecture

| Criterion | Kysely + dbmate | Drizzle ORM + Kit | Prisma ORM | Thin `pg` + dbmate |
| --- | --- | --- | --- | --- |
| Neon compatibility | Official Postgres dialect over `pg`; Neon pooled endpoint is standard PostgreSQL. | Official Drizzle/Neon support; Node `pg`, Neon HTTP, and WebSocket choices. | Official Neon connector/driver-adapter documentation. | Native baseline; Neon documents node-postgres-compatible Pool/Client behavior. |
| Multi-statement transactions | First-class callback/controlled transactions; same connection is managed. | First-class transactions, nesting/savepoints, isolation options. | Interactive/sequential transactions and isolation options. | Correct but manual `BEGIN`/`COMMIT`/`ROLLBACK`; same-client discipline is the caller's responsibility. |
| SQL/schema control | Plain SQL is source; Kysely has safe raw SQL and schema qualification. | Rich Postgres schema declarations plus custom SQL migration files. | SQL migrations are editable, but CHECK and several advanced features are not fully represented in PSL. | Complete SQL control. |
| Repo-owned migrations | Plain `.sql`, atomic by default, full schema dump. | Generated `.sql` plus snapshots; custom SQL supported. | Generated editable `.sql`; shadow database used in development. | Plain `.sql`, same as Kysely option. |
| Runtime artifact | Small query builder; no generated client. | Schema and query runtime, no Prisma-style generated client. | Generated Prisma Client plus mandatory driver adapter in Prisma 7. | Driver only. |
| Better Auth | Built-in PostgreSQL adapter is Kysely-backed; SQL generation/migration supported. | Official adapter; Better Auth generates Drizzle schema, then Kit owns migrations. | Official adapter; Better Auth generates Prisma schema, then Prisma Migrate owns migrations. | Built-in PostgreSQL adapter can use its own `pg.Pool`; application queries stay manual. |
| JSON snapshot typing | Compile-time infrastructure type; runtime validation remains required. | Typed JSONB declaration; runtime validation remains required. | `Json` supported; runtime validation remains required. | Driver parses JSON/JSONB, but result typing/validation is manual. |
| Local real-Postgres tests | Straightforward with Testcontainers. | Straightforward with node-postgres-backed Drizzle. | Works, but Prisma generate/migration/shadow-DB lifecycle adds setup. | Straightforward, but repository helpers must be built. |
| Portability | High: SQL + standard `pg`; avoid provider dialects. | High at DB level, medium at application level because schema/query APIs are Drizzle-specific. | Database is portable, but application and build pipeline depend heavily on generated Prisma APIs. | Highest DB portability, lowest application ergonomics. |
| Current adoption risk | Low-to-moderate; stable package, but codegen and SQL migrations require discipline. | Moderate today because v1 remains RC and includes breaking API changes. | Moderate: GA and mature, but Prisma 7 is a recent architecture shift and Prisma Next is already Early Access. | Low dependency risk, higher correctness/maintenance risk in application code. |
| Recommendation | **Choose** | Re-evaluate after Drizzle v1 GA or if the team strongly values TS schema declarations | Do not choose for this narrow core | Retain as escape hatch, not default repository API |

## Detailed findings

### Kysely with dbmate

**Verified strengths**

- Kysely is a query builder rather than an active-record/data-mapper framework. Its API mirrors SQL, infers result types, supports an official PostgreSQL dialect, and permits parameterized raw SQL when the structured API is insufficient. ([Kysely overview](https://www.kysely.dev/), [`sql` tag](https://kysely-org.github.io/kysely-apidoc/interfaces/Sql.html))
- A Kysely transaction callback receives a transaction-scoped Kysely instance; an exception rolls it back and a successful callback commits it. This directly fits “checkpoint Working Configuration, create/reuse revision, create share/photo/quote record, and write outbox entry atomically.” ([Kysely transactions](https://kysely-org.github.io/kysely-apidoc/classes/Kysely.html))
- `PostgresDialect` accepts a `pg` pool. This works against local PostgreSQL, Neon's pooled standard endpoint, and Crunchy Bridge without changing query code. ([Kysely PostgreSQL dialect](https://kysely-org.github.io/kysely-apidoc/interfaces/PostgresDialectConfig.html))
- dbmate keeps timestamp-versioned SQL migrations in Git, runs each migration transactionally by default, supports `transaction:false` for operations such as concurrent index work, and can materialize `schema.sql` for review. ([dbmate](https://github.com/amacneil/dbmate))

**Limitations and controls**

- Kysely types describe what code believes the database returns; they do not validate runtime values. Generate DB types from a freshly migrated test database, and parse JSON configuration snapshots at repository input/output boundaries.
- SQL migrations and generated query types create two artifacts. Make SQL authoritative, regenerate types in CI, and fail if the generated diff is non-empty.
- dbmate is another toolchain binary/package. Pin its version, checksum/review upgrades, and run only through a repository script.
- Kysely has no identity map, lazy loading, or automatic aggregate persistence. That is beneficial here: repository methods should express explicit domain operations rather than expose arbitrary relational traversal.
- Do not expose `Kysely<Database>`, generated table interfaces, expression builders, or transaction objects outside the infrastructure module.

### Drizzle ORM and Drizzle Kit

**Verified strengths**

- Drizzle supports `pg`, Neon HTTP, and Neon WebSocket integrations. Its HTTP integration is optimized for one-shot/non-interactive work, while WebSocket or node-postgres is the appropriate option when sessions or interactive transactions are needed. ([Drizzle with Neon](https://orm.drizzle.team/docs/get-started/neon-new), [Drizzle PostgreSQL](https://orm.drizzle.team/docs/get-started-postgresql))
- Drizzle provides transactions, nested savepoints, PostgreSQL isolation configuration, schemas, JSONB, constraints, indexes, and generated SQL migrations. Custom SQL migrations cover unsupported DDL and data changes. ([transactions](https://orm.drizzle.team/docs/transactions), [indexes and constraints](https://orm.drizzle.team/docs/indexes-constraints), [migrations](https://orm.drizzle.team/docs/migrations), [custom migrations](https://orm.drizzle.team/docs/kit-custom-migrations))
- Better Auth has a first-party Drizzle adapter and can generate the required Drizzle auth schema; Drizzle Kit then owns applying migrations. ([Better Auth Drizzle adapter](https://better-auth.com/docs/adapters/drizzle))

**Why it is not the recommendation now**

- Drizzle's official current docs show the v1 upgrade path and install examples using release-candidate packages; the release page marks the v1 series as pre-release and documents breaking changes. Stable `0.45.2` is available, but selecting it creates a known future upgrade boundary. ([Drizzle releases](https://github.com/drizzle-team/drizzle-orm/releases), [PostgreSQL setup](https://orm.drizzle.team/docs/get-started-postgresql))
- The schema-as-TypeScript model is convenient, but the system's most important integrity rules still deserve explicit review in generated/custom SQL. The convenience gain over Kysely is modest once all persistence sits behind repositories.
- Using Drizzle's Better Auth adapter would make auth schema upgrades depend on both Better Auth generation and Drizzle Kit. The built-in PostgreSQL adapter has a smaller upgrade path for the selected Better Auth architecture.

**Reconsideration gate:** run a new comparison after Drizzle v1 reaches GA and has at least one settled minor release, or earlier if repository implementation shows that maintaining SQL plus generated Kysely types is materially slowing the team.

### Prisma ORM

**Verified strengths**

- Prisma 7 is the current GA line, uses a TypeScript query compiler without Rust engine binaries by default, and requires a database driver adapter. It supports both ordinary PostgreSQL and Neon's serverless driver. ([Prisma ORM](https://docs.prisma.io/docs/orm), [engines](https://docs.prisma.io/docs/orm/v6/more/internals/engines), [database drivers](https://www.prisma.io/docs/orm/core-concepts/supported-databases/database-drivers), [Neon](https://docs.prisma.io/docs/orm/v6/overview/databases/neon))
- Prisma provides interactive transactions with configurable isolation and documents optimistic concurrency through a version field. It supports JSON and multiple PostgreSQL schemas. ([transactions/OCC](https://www.prisma.io/docs/orm/v6/prisma-client/queries/transactions), [multi-schema](https://docs.prisma.io/docs/orm/v6/prisma-schema/data-model/multi-schema))
- Prisma Migrate produces customizable SQL files, and Better Auth has an official Prisma adapter with schema generation. ([Prisma Migrate](https://docs.prisma.io/docs/orm/prisma-migrate), [unsupported-feature customization](https://docs.prisma.io/docs/orm/prisma-migrate/workflows/unsupported-database-features), [Better Auth Prisma adapter](https://better-auth.com/docs/adapters/prisma))

**Why it is not the recommendation**

- Prisma's database feature matrix says PostgreSQL CHECK constraints are not representable in Prisma Schema Language or Prisma Migrate's model generation, while expression indexes, index includes, and views also have representation limitations. Custom migration SQL works, but the Prisma schema then ceases to be the full database contract. ([Prisma feature matrix](https://www.prisma.io/docs/orm/reference/database-features))
- Prisma requires generated client output and a generation step after schema/query changes. TypedSQL can recover SQL expressiveness but remains a Preview feature and needs an active database connection during generation. ([client generation](https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/generating-prisma-client), [TypedSQL limitations](https://www.prisma.io/docs/orm/prisma-client/using-raw-sql/typedsql))
- The application does not currently benefit from Prisma's relation-centric model enough to justify that build/runtime surface. Its domain Modules should expose purposeful operations, not a generic generated data client.

### Thin direct SQL with node-postgres

**Verified strengths**

- `pg` is the standard low-level Node PostgreSQL driver. It supports pools, parameterized queries, prepared queries, and JSON/JSONB serialization/parsing. ([pooling](https://node-postgres.com/features/pooling), [queries](https://node-postgres.com/features/queries), [types](https://node-postgres.com/features/types))
- It has the fewest abstractions and is the most direct portability baseline. Better Auth can independently use the same driver through its built-in PostgreSQL adapter.

**Why it is not the default**

- Transactions require manually checking out one client, executing `BEGIN`, every statement, `COMMIT`/`ROLLBACK`, and releasing the client. The official documentation explicitly warns not to use `pool.query` in a transaction. ([transactions](https://node-postgres.com/features/transactions))
- Every repository must manually declare and maintain result-row types, selected-column aliases, mapping, and error translation. The exact same SQL remains available through Kysely's parameterized `sql` tag, so dropping Kysely entirely saves little while increasing repeated correctness work.

Use direct `pg` only inside the persistence adapter for a measured query that Kysely cannot express cleanly, a bulk-copy/admin path, or an operational script. It must not become a second general query style.

## Persistence patterns required by the approved contracts

These are architecture inferences expressed as PostgreSQL patterns. They are not a final physical schema.

### 1. Application-owned identity

- `app.customer_account.id` is the owner key referenced by Project and future commerce records.
- `app.auth_identity` has its own ID and a unique provider key such as `(provider, provider_subject)`; for Better Auth, `provider_subject` contains the Better Auth user ID.
- No Project table references `auth.user` directly.
- Better Auth tables live under `auth`; the runtime application role has no general write access to them.

This preserves the provider exit established in ADR 0001/0002 even though auth and domain data share a PostgreSQL cluster.

### 2. Optimistic Working Configuration writes

Use one conditional statement, conceptually:

```sql
UPDATE app.working_configuration
SET normalized_configuration = $configuration::jsonb,
    configuration_hash = $hash,
    version = version + 1,
    updated_at = now()
WHERE project_id = $project_id
  AND version = $expected_version
RETURNING version, updated_at;
```

Zero returned rows means a concurrency conflict. Do not follow with a blind retry or last-write-wins update. Authorization/ownership belongs in the same repository/application-service operation, not in the UI.

### 3. Immutable and deduplicated revisions

- Treat Configuration Revisions as insert-only from application code.
- Enforce a unique constraint at the database level for the approved deduplication scope, such as `(project_id, schema_version, product_definition_version, configuration_hash)`.
- Use `INSERT ... ON CONFLICT ... DO NOTHING/UPDATE ... RETURNING` or a CTE to create-or-retrieve under concurrency. PostgreSQL documents `ON CONFLICT DO UPDATE` as an atomic insert-or-update outcome. ([PostgreSQL `ON CONFLICT`](https://www.postgresql.org/docs/current/sql-insert.html))
- Store normalized snapshot JSONB plus explicit indexed metadata columns. JSONB is appropriate for the versioned configuration payload, but IDs, ownership, state, timestamps, hashes, and foreign keys should remain ordinary typed columns. PostgreSQL documents that `jsonb` is stored in a decomposed form and supports indexing. ([PostgreSQL JSON types](https://www.postgresql.org/docs/current/datatype-json.html))

### 4. Idempotent imports and external actions

- Every retriable command crossing a request/job boundary carries an idempotency key.
- Put a unique constraint on the correct business scope, not only an application pre-check: for example `(customer_account_id, operation_kind, idempotency_key)`.
- Store the original request hash and resulting internal record ID. A reused key with a different request hash is a conflict, not a replay.
- Quote submission, photo creation, and share creation checkpoint the expected Working Configuration version and create their record in the same database transaction.

### 5. Transactional outbox

- The transaction that creates a Photo Job, Quote Request, or transactional-email intent also inserts its outbox message.
- The transaction never calls Replicate, email, CRM, or commerce APIs.
- A worker claims committed outbox rows, delivers them with an external idempotency key, and records attempts/results.
- Use short transactions through the pooled endpoint. Do not use session advisory locks or `LISTEN/NOTIFY` as the only delivery guarantee because Neon transaction pooling does not preserve session features. ([Neon pooling limitations](https://neon.com/docs/connect/connection-pooling))

## Module, Interface, and Adapter seams

Kysely is an infrastructure Adapter, not the application's architecture.

```text
React/3D/configurator UI
    -> commands and public DTOs
Application services
    -> verify Better Auth session
    -> map AuthIdentity -> CustomerAccountId
    -> authorize command
    -> call domain Interface
Domain Interfaces
    -> ProjectRepository
    -> SharedRevisionRepository
    -> PhotoJobRepository
    -> QuoteRequestRepository
    -> TransactionRunner / UnitOfWork (server-internal only)
PostgreSQL Adapters
    -> Kysely implementation
    -> row mappers + error translation
    -> pooled pg connection
```

### Interface rules

1. **Domain/UI types never import Kysely or generated database types.** Public types are `ProjectId`, `CustomerAccountId`, `WorkingConfiguration`, `ConfigurationRevision`, commands, and minimal DTOs.
2. **Do not create a generic `Repository<T>` or expose arbitrary query builders.** Use operations matching the contract, such as `saveWorkingConfiguration(expectedVersion, configuration)`, `checkpointRevision(...)`, `importGuestConfiguration(...)`, `trashProject(...)`, and `purgeProject(...)`.
3. **Keep transaction composition server-internal.** A small `TransactionRunner.run(fn)` may pass transaction-bound repository ports to an application service. It must not expose a Kysely transaction object across the seam.
4. **Authorization is close to data access.** Every owner-scoped operation receives the verified `CustomerAccountId` and includes it in the database predicate. Next.js recommends this DAL/DTO model for new applications. ([Next.js data security](https://nextjs.org/docs/app/guides/data-security))
5. **Map database errors once.** Unique violations become explicit domain outcomes such as `IdempotencyConflict`; failed optimistic updates become `WorkingConfigurationConflict`; unknown foreign keys and raw SQL errors do not reach React.
6. **Return minimal DTOs.** No `SELECT *` results, auth rows, private notes, idempotency payloads, or outbox data cross into Client Components or the 3D engine.
7. **Mark the persistence root `server-only`.** Next.js makes client imports of such modules a build-time error. ([Next.js server-only guidance](https://nextjs.org/docs/app/getting-started/server-and-client-components))

Suggested physical ownership, without introducing a broad framework:

```text
lib/server/db/
  pool.ts                 # pg pools and runtime config
  database-types.ts       # generated; infrastructure-only
  transaction-runner.ts
  errors.ts
  repositories/
    project-postgres.ts
    shared-revision-postgres.ts
    photo-job-postgres.ts
    quote-request-postgres.ts

features/<module>/domain/
  ...                     # no SQL/Kysely imports
features/<module>/application/
  ...                     # commands, authorization, Interfaces

db/migrations/
db/schema.sql
```

The exact folder names can follow the eventual codebase conventions; the dependency direction is the important decision.

## Migration and release policy

1. **SQL in Git is authoritative.** Every schema change is a new migration. Never rewrite an applied migration and never make production-only dashboard changes.
2. **One migration executor.** CI/CD runs dbmate once over `DATABASE_URL_DIRECT` before application rollout. Application instances never migrate on boot.
3. **Better Auth upgrades are reviewed migrations.** Run `auth generate` against the pinned Better Auth version, inspect the generated SQL/diff, translate it into the next repo migration under the `auth` schema, and test it. Do not allow `auth migrate` to mutate production ad hoc, even though the official adapter supports it. ([Better Auth CLI](https://better-auth.com/docs/concepts/cli))
4. **Expand/contract for zero-downtime changes.** Add nullable/new structures first, deploy code that supports both shapes, backfill in bounded jobs, enforce constraints later, then remove obsolete structures in a separate release.
5. **Concurrent indexes are explicit.** A migration using `CREATE INDEX CONCURRENTLY` must opt out of the migration transaction and be designed so retrying is safe; dbmate supports a per-migration transaction option. ([dbmate migration options](https://github.com/amacneil/dbmate))
6. **Previews start without production PII.** Apply all migrations to an empty/schema-only Neon branch and seed synthetic fixtures.
7. **Schema/type drift fails CI.** From an empty real PostgreSQL container: apply all migrations, generate Kysely types and `schema.sql`, run repository tests, and assert no generated diff.
8. **Test upgrades, not only fresh installs.** Keep a sanitized previous-release schema/fixture and apply pending migrations to it before production.

## Test strategy

Use Testcontainers with the production PostgreSQL major for:

- a fresh migration test from an empty database;
- Better Auth schema and database-session integration;
- `CustomerAccount`/`AuthIdentity` mapping and deletion;
- two-client optimistic-concurrency races;
- concurrent revision deduplication;
- idempotent guest import and Quote Request submission;
- checkpoint plus outbox atomic rollback;
- Archive/Trash/Purge cascades and retained-record detachment;
- JSON snapshot round trips and runtime validation;
- repository authorization predicates;
- migration forward-compatibility from the prior release.

Do not replace these tests with SQLite. The contract depends on PostgreSQL JSONB, constraints, `ON CONFLICT`, transaction isolation, schemas, and concurrent writers. The Docker Official Image and Testcontainers both provide a practical local path to real PostgreSQL. ([PostgreSQL Docker Official Image](https://hub.docker.com/_/postgres/), [Testcontainers PostgreSQL](https://node.testcontainers.org/modules/postgresql/))

## Important limitations and migration risks

1. **Kysely compile-time types are not a security boundary.** Validate request data and JSONB snapshots at runtime, and return purpose-built DTOs.
2. **The built-in Better Auth adapter is still Better Auth-owned behavior.** Pin Better Auth, review generated SQL on every upgrade, run auth integration tests, and keep `AuthIdentity` as the replaceable seam.
3. **Pooled and direct URLs are operationally different.** Accidentally running migrations on the pooler can fail around session state/locks; accidentally using the direct endpoint in autoscaling runtime can exhaust direct connections.
4. **Schema `search_path` can be dangerous if treated as request state.** Use fixed roles/defaults or explicit schema qualification. Never derive schema names from user input.
5. **`kysely-codegen` is a development dependency, not the runtime contract.** If it becomes unmaintained, handwritten infrastructure types are a viable fallback; SQL migrations and repositories survive.
6. **dbmate does not design online migrations.** It only executes them. Review locks, table rewrites, backfills, and concurrent index behavior for every material production migration.
7. **Neon portability is high but not absolute.** Avoid Neon Auth, the Neon Data API, provider-only extensions, and runtime reliance on branching. Periodically exercise `pg_dump`/restore against ordinary PostgreSQL or Crunchy Bridge.
8. **Short serverless transactions still need load testing.** Verify pool sizing, cold starts, timeouts, retries, and the deployment host's process reuse before launch.

## Production release gates

Before treating this choice as production-ready, complete one narrow persistence spike proving:

1. Next.js Node runtime -> Kysely -> `pg` -> Neon pooled Frankfurt connection.
2. A direct dbmate migration creates `auth` and `app` schemas from zero.
3. Better Auth email-OTP session creation/validation works in `auth` without cookie-cache authorization for protected operations.
4. `AuthIdentity` maps the Better Auth subject to an application-owned `CustomerAccount.id`.
5. Two concurrent autosaves produce one success and one explicit optimistic conflict.
6. One transaction checkpoints configuration, creates/reuses a revision, creates a Photo Job/Quote Request, and inserts an outbox row; forced failure leaves none of them partially committed.
7. A disposable local PostgreSQL test and a Neon preview branch pass the same repository contract suite.
8. The schema restores into ordinary local PostgreSQL from `db/schema.sql`/logical export, demonstrating the basic provider-exit path.

If this spike exposes no blocking driver or migration issue, lock the stack for the First Production Release. Revisit the access layer only after measured friction, Drizzle v1 GA maturity, or a genuine cross-database requirement—not merely because another ORM offers a shorter CRUD example.
