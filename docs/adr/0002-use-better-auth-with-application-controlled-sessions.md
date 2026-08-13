---
status: accepted
---

# Use Better Auth with application-controlled sessions

rotpunkt Signature will self-host Better Auth for Customer Account authentication in the First Production Release. Better Auth will use email OTP and database-backed opaque sessions stored on the managed EU-hosted Postgres platform selected for application data. Protected application routes will validate the database session rather than authorize from stateless or cookie-cached session data.

This choice favors control, exact EU data placement, and a credible provider exit over a managed identity control plane. It builds on [Keep Customer Accounts application-owned](0001-application-owned-customer-identity.md): Better Auth identities grant access, while the application-owned `CustomerAccount.id` remains the only owner identifier used by Projects and commercial records.

## Consequences

Better Auth is isolated behind a server-only Identity Adapter, and its tables live in a dedicated namespace separate from domain tables. Auth schema changes are inspectable migrations in the repository; Better Auth types and identifiers do not cross into domain repositories or the 3D/configurator engine. Guest Configurations do not create anonymous auth identities.

The application team owns OTP delivery and abuse controls, session revocation, secrets, dependency and schema upgrades, monitoring, incident response, backup/restore, and the account-deletion workflow. Production readiness therefore requires explicit release gates for secure cookies, hashed OTPs, recent reauthentication, throttling, audit logging, restore tests, mail delivery, and rapid security patching.

A future migration treats sessions as disposable. The application retains `CustomerAccount` and `AuthIdentity` mappings, asks people to complete a fresh email OTP at the replacement provider, and changes only the Identity Adapter. Hosted Better Auth add-ons are not part of this decision and require a separate EU-processing review before adoption.
