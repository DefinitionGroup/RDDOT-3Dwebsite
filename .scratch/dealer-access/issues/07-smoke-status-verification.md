# Smoke test, STATUS, verification

Status: resolved
Type: task
Blocked by: 06

## Scope

- `tests/smoke/dealer.smoke.ts` on desktop and phone, against a throwaway database only.
- All gates; browser checks at 1440 and 390 px.
- STATUS.md: inventory, Done, gates, Missing, Release Blockers.

## Comments
- 2026-10-30: gates on the branch: lint 0 errors (the known warning), `tsc` clean, unit
  200/200, `pnpm test:db` 111 passed and 1 skipped on a throwaway Postgres 17 with password
  authentication, `TRANSACTIONAL_EMAIL_PROVIDER= pnpm build` green, `pnpm test:smoke` 6/6
  against a build on a throwaway Postgres 18 (journeys, dealer at desktop and phone,
  scene). Browser checks at 1440 and 390 px on the dev server against a throwaway
  database; map and 3D proofs in headless Chrome on the GPU. STATUS updated.
