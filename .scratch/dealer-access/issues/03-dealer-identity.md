# Dealer identity

Status: ready-for-agent
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
