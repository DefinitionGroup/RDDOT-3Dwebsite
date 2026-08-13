# Persistence foundation development

The first production tracer bullet keeps PostgreSQL details behind two server-only seams:

- the Identity Adapter maps a Better Auth subject to an application-owned Customer Account UUID;
- the Project Module owns Project creation, Working Configuration saves, revision checkpoints, and transactional outbox insertion.

Neither interface exposes Kysely, `pg`, database rows, or transaction objects.

## Connections

Use separate connection strings and roles:

- `DATABASE_URL`: pooled, least-privilege application runtime connection;
- `DATABASE_URL_AUTH`: pooled `better_auth_runtime` connection with the `auth` schema fixed at role level;
- `DATABASE_URL_DIRECT`: direct migration and schema-generation connection;
- `TEST_DATABASE_URL`: optional disposable local or Neon-preview database used by the PostgreSQL contract suite.

Never put these values in client-visible environment variables. Production and preview credentials belong in the deployment secret store, not Git.

## Commands

```bash
pnpm db:migrate
pnpm db:schema
pnpm test
pnpm test:db
```

`pnpm test:db` uses `TEST_DATABASE_URL` when provided. Otherwise it starts `postgres:17.6-alpine` through Testcontainers. The database must be disposable because the suite applies the complete migration history.

The Better Auth SQL must be generated from the pinned version while connected to a disposable PostgreSQL database, reviewed, and copied into a new repository migration:

```bash
DATABASE_URL_AUTH="$TEST_DATABASE_URL" pnpm exec auth generate \
  --config lib/server/auth/auth.cli.ts \
  --output /tmp/rddot-better-auth.sql \
  --yes
```

Do not use `auth migrate` against production. dbmate is the only production migration executor.

## Current environment gate

The repository includes the application migration and the contract suite. Running it locally requires either a Docker-compatible container runtime or a disposable `TEST_DATABASE_URL`. The Better Auth CLI likewise requires a reachable PostgreSQL database even when generating SQL because it introspects the target schema first.
