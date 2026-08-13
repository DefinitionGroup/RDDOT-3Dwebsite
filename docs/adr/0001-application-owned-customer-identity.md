---
status: accepted
---

# Keep Customer Accounts application-owned

rotpunkt Signature will identify each Customer Account with an application UUID and link provider-issued Authentication Identities to it. Projects and commercial records reference the application identity, never an authentication-provider subject or email address, because authentication, database, and future commerce providers remain replaceable and have different deletion and residency trade-offs.

## Consequences

Every authenticated request must resolve an Authentication Identity to a Customer Account before authorization. This adds a small mapping and lifecycle workflow, but makes provider migration, account deletion, guest import, and later commerce linkage possible without changing Project ownership.
