# Compare EU-hosted Customer Account authentication adapters

Type: research
Status: resolved
Blocked by: none
Map: ../map.md

## Question

Using current primary documentation, which production-ready authentication adapters can keep identity and session data hosted in an EU member-state region while supporting Next.js App Router, verified-email passwordless sign-in, secure revocable sessions, account deletion, recent reauthentication, an application-owned Customer Account UUID, and a credible provider exit path?

Start with Better Auth, Supabase Auth, Auth0, WorkOS AuthKit, Descope, Ory, ZITADEL, FusionAuth, Keycloak, and Logto; retain Clerk as an elimination baseline and add any materially stronger candidate discovered during the scan. Distinguish exact EU-hosting evidence from GDPR transfer compliance, eliminate candidates that fail hard gates, and recommend a short list without allowing the authentication provider to own Projects or future commerce records.

## Answer

[The expanded primary-source comparison](../research/eu-hosted-authentication-adapters.md) recommends Logto Cloud in its Netherlands region as the managed default and Better Auth with database-backed sessions on Neon Frankfurt as the control-and-portability alternative. Amazon Cognito Frankfurt is the mature managed fallback; Supabase Auth should be selected only with Supabase Postgres, and Descope Frankfurt only when its enterprise cost is justified. Clerk, WorkOS, and several broadly hosted managed offerings fail the strict EU-hosting gate.
