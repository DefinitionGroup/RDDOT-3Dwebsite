# Choose the Customer Account authentication adapter

Type: grilling
Status: resolved
Blocked by: 01, 02, 18
Map: ../map.md

## Question

Which authentication adapter should satisfy the approved Customer Account contract for the First Production Release, and what exit strategy prevents provider identity from owning Project or commerce data?

## Comments

- 2026-08-11: The user confirmed that authentication identity data must be EU-hosted. GDPR-compatible international transfers alone are not sufficient.
- 2026-08-11: The user approved a primary-source comparison of Better Auth and other credible candidates before the adapter is selected.

## Answer

Use **self-hosted Better Auth** for the First Production Release, backed by the managed EU-hosted Postgres platform selected by the application-data decision. Use Better Auth's email-OTP capability and database-backed opaque sessions; do not use stateless session mode or cookie-cached authorization on protected routes. The production implementation must keep auth tables in a dedicated namespace, pin and deliberately upgrade Better Auth, hash stored OTPs, use short expiries and attempt/resend limits, and deliver authentication mail through the separately approved EU-compatible transactional-email contract.

Better Auth remains behind a small server-only Identity Adapter. An authenticated Better Auth subject resolves through `AuthIdentity(issuer, subject)` to the application-owned `CustomerAccount.id` before authorization. Projects, Configuration Revisions, Generated Photos, Quote Requests, and later commerce links reference only `CustomerAccount.id`; no domain table references a Better Auth user ID or email. Guest Configurations remain browser/URL state and are imported only after verified sign-in, so anonymous auth users are unnecessary.

The application explicitly accepts responsibility for authentication operations: session availability and revocation, OTP abuse protection, mail reputation, secret rotation, dependency security updates, schema migrations, monitoring, incident response, backup/restore, and deletion retries. Better Auth Infrastructure or any other hosted add-on is excluded until its processing locations independently satisfy the EU-hosting gate.

The exit path is ordinary Postgres data plus an application-owned identity map: keep auth migrations inspectable in the repository, isolate Better Auth tables from domain repositories, expose no Better Auth types beyond the Identity Adapter, and treat sessions as disposable during migration. Because sign-in is OTP-only, a future provider migration can carry verified identity mappings and require fresh OTP enrollment rather than migrating password hashes. See [ADR: Use Better Auth with application-controlled sessions](../../../docs/adr/0002-use-better-auth-with-application-controlled-sessions.md) and the [expanded provider research](../research/eu-hosted-authentication-adapters.md).
