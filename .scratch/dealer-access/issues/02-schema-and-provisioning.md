# Schema and provisioning

Status: resolved
Type: task
Blocked by: 01

## Scope

- Migration `20261030120000_create_dealer_access.sql`: `dealer`, `dealer_user`,
  `dealer_user_identity`, `project_dealer_grant` (one open grant per project), and the
  dealer attribution columns on `shared_revision_link` and `quote_request`.
- `db/schema.sql` regenerated from a throwaway Postgres 18.
- `db/seeds/demo-dealers.json` (synthetic) and `pnpm dealers:provision`, idempotent,
  refusing Neon hosts unless `--allow-remote`.

## Out of scope

- Applying the migration or the seed to the shared development database (Martin's OK).

## Comments
- 2026-10-30: migration applied, rolled back and reapplied on a throwaway Postgres 18.6;
  `db/schema.sql` patched with the before/after dump diff only (the local dump otherwise
  differs in its header and Neon's `playing_with_neon` table). Provisioning twice leaves 14
  dealers and 14 users; a Neon host is refused.
