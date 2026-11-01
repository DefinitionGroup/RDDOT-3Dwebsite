# Grant-checked modules and contract tests

Status: resolved
Type: task
Blocked by: 03

## Scope

- `ProjectActor` on `getWorkspace`, `listConfigurationRevisions`,
  `saveWorkingConfiguration`, `checkpointRevision`, `restoreRevision`, the sharing
  module's create/list/revoke and the Quote Request module's submit/listForProject.
- One helper for the access predicate and the grant lock.
- Trash revokes the grant; the account export lists grants.
- Dealer module: directory, grant, revoke, grants per owner, shared projects per dealer.
- Postcode table (GeoNames DE, CC BY 4.0) and distance sorting.
- Contract tests: grant, revoke, dealer read and edit, stranger refused.

## Comments
- 2026-10-30: `tests/integration/dealer-access-contract.test.ts` (10 tests) passes on a local
  Postgres 18.6, among them a revocation that waits for a dealer write holding the grant.
  The whole database suite: 98 passed, 3 failed, 1 skipped. The three failures are
  local-setup only and in files this slice does not touch: Postgres 18 reports a RESTRICT
  violation as 23001 where CI's 17.6 says 23503 (`source-capture-retention`), and the pool
  tests expect password authentication (`postgres-pool`, the throwaway trusts every login).
  Lock order everywhere: Dealer Grant, then Project and Working Configuration.
