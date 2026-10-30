# Grant-checked modules and contract tests

Status: ready-for-agent
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
