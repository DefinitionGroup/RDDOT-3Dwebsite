# Dealer identity

Status: resolved
Type: task
Blocked by: 02

## Scope

- The Identity Adapter resolves a Better Auth identity to a Dealer User first (linked
  identity or, on first sign-in, the provisioned email), else to a Customer Account.
- A disabled Dealer User or inactive Dealer resolves to nobody.
- `customerSessions` returns nothing for a dealer; `dealerSessions` and
  `projectActors` are added.
- Contract tests: provisioned email links; disabled resolves to nobody; customers
  unaffected.

## Comments
- 2026-10-30: `tests/integration/dealer-identity-contract.test.ts` (4 tests) passes on the
  local throwaway Postgres, with the existing persistence contract unchanged.
