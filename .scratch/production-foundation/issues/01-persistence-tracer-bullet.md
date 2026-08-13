# Build the persistence tracer bullet

Status: claimed

## Scope

Add the first repository-owned SQL migration and the server-only Customer Account and Project persistence implementations. Keep Kysely and PostgreSQL types behind the persistence seam. Verify identity mapping, optimistic conflicts, revision deduplication, and transactional outbox behavior through module interfaces.

## Out of scope

- Customer-facing authentication or Project UI
- Transactional email provider selection
- Photo, quote, sharing, or commerce provider execution
- Production credentials or infrastructure provisioning

## Comments

- 2026-08-13: Started on `redesign/devstart` after the user approved beginning development.
- 2026-08-13: Application migration, pinned tooling, Identity Adapter, Project Module, unit tests, and PostgreSQL contract suite are implemented. Unit tests, lint, build, frozen install, and diff checks pass. The database suite and Better Auth SQL generation require either a Docker-compatible runtime or a disposable `TEST_DATABASE_URL`; neither is available in the current environment, so this ticket remains claimed rather than resolved.
- 2026-08-13: Applied migration `20260813120000` successfully to the Neon Frankfurt development database. Verified six `app` tables, an intentionally empty `auth` schema, and the dbmate migration record. The saved `DATABASE_URL_DIRECT` is still a pooled URL and must be replaced with its non-`-pooler` Neon URL. Generating `db/schema.sql` additionally requires `pg_dump`, which is not installed locally.
- 2026-08-13: Generated the official Better Auth 1.6.27 email-OTP schema, reviewed and schema-qualified it in migration `20260813123000`, applied it to Neon, and confirmed the generator then reported no drift. Installed Homebrew `libpq`, generated `db/schema.sql`, and passed all three persistence contract tests against the Neon development database. The full Better Auth session-to-Customer Account integration test remains for the next auth runtime slice.
- 2026-08-13: Provisioned and verified `app_runtime`: pooled connection, `app` search path, application read/write, and denied `auth` access. Generated the local Better Auth secret. Added and passed a fourth live Neon contract test covering email OTP, database session cookie validation, and Better Auth user-to-Customer Account mapping. Neon already contained an independently owned `auth_runtime` role, so `neondb_owner` cannot reset it or set its search path; its pooled connection must be recovered/reset in Neon before the runtime auth route is enabled.
- 2026-08-13: The Neon-managed `auth_runtime` role was unsuitable because it inherited `neon_superuser` and could access `app`. Left it unused and provisioned `better_auth_runtime` instead: no superuser/CREATEROLE/CREATEDB, fixed `auth` search path, auth-table access, and denied `app` access. Mounted the Node-runtime Better Auth route and provider-neutral Customer Session resolver. OTP delivery intentionally fails closed until the transactional-email adapter is selected.
- 2026-08-13: Verified the live Next.js auth handler at `/api/auth/get-session`: HTTP 200, no-store, and `null` without a session. The dev server emitted `EMFILE: too many open files` watcher warnings after becoming ready; the request and production build were unaffected, but local watcher limits should be addressed if this recurs during interactive development.
