# Define the Customer Account and identity contract

Type: grilling
Status: resolved
Blocked by: none
Map: ../map.md

## Question

What lifecycle, ownership, security, recovery, deletion, consent, guest-claiming, and future-role rules must the Customer Account interface guarantee independently of any authentication provider?

## Answer

The Customer Account is application-owned and identified by an internal UUID. One or more Authentication Identities may grant access, but provider subjects and email addresses never own Projects, Generated Photos, Quote Requests, or later commerce records. Each Project has exactly one Customer Account owner; transfer, shared editing, household accounts, dealer access, and internal-staff roles are outside the First Production Release.

A Guest Configuration is imported as a copy after verified sign-in rather than exclusively claimed. The import is idempotent, preserves the current configuration, and cannot merge Customer Accounts based only on matching email. Shared Revision Links remain read-only and cannot authorize Project mutations.

The interface must guarantee verified email before persistent account creation; secure HTTP-only sessions; server-side authorization on every owned resource; session revocation on sign-out, suspension, deletion, or security events; recent reauthentication for email change, deletion, or sensitive export; and rate-limited, auditable identity-sensitive actions.

Email changes require recent authentication and verification of the new address, notify the old address, and never trigger automatic account merging. Recovery remains provider-managed, with no manual support bypass in the First Production Release.

Deletion immediately suspends sensitive actions, enters a seven-day reversible window, then removes Projects, Configuration Revisions, Generated Photos, profile data, active sessions, and the Authentication Identity. Quote Requests are deleted or irreversibly anonymized unless a documented legal-retention rule applies. The workflow is retryable and auditable, retaining only minimal non-personal operational evidence.

Privacy/terms acceptance is versioned. Marketing consent is separate, optional, timestamped, and revocable. AI-photo processing consent is recorded on first use. Consent to contact someone about a Quote Request does not grant general marketing permission.

The authentication adapter remains replaceable and is responsible only for authentication concerns. The domain resolves its provider subject to the internal Customer Account before any authorization decision. See [ADR: Keep Customer Accounts application-owned](../../../docs/adr/0001-application-owned-customer-identity.md).
