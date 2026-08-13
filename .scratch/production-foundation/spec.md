# Production foundation

Build the approved production architecture incrementally without interrupting the working configurator. The first tracer bullet establishes portable PostgreSQL migrations, application-owned Customer Accounts, a deep Project Module, optimistic Working Configuration saves, immutable revision checkpoints, and a transactional outbox.

The first slice deliberately does not add account screens, Project screens, email delivery, provider calls, or commerce. Those callers should consume the foundation after its database contract is proven locally and against a Neon preview branch.

## Acceptance gates

- A fresh PostgreSQL database migrates from zero using repository-owned SQL.
- Better Auth subjects map to application-owned Customer Account UUIDs.
- A stale Working Configuration save returns an explicit conflict and never overwrites current data.
- Checkpointing a revision and writing its outbox message is one transaction and is idempotent.
- The same contract tests can target local PostgreSQL and a disposable Neon preview database.
- Lint, tests, and the production Next.js build pass.
