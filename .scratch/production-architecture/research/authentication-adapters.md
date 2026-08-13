# Customer Account authentication adapter comparison

Date: 2026-08-11

## Question

How do Clerk, Auth.js, Supabase Auth, and Shopify Customer Accounts compare for a Next.js App Router system that needs verified-email passwordless sign-in, secure sessions, account deletion, Guest Configuration claiming, application-owned Project data, EU operation, and a future but non-authoritative commerce adapter?

## Answer first

**Supabase Auth is the strongest candidate for the First Production Release, provided the later database decision also selects Supabase Postgres.** It has an official Next.js App Router path, email OTP and magic-link login, selectable European project regions, server-side user deletion, and a documented anonymous-to-permanent user flow that directly matches Guest Configuration claiming. Its Auth user ID can protect application-owned Project rows with Postgres Row Level Security, while a separate application `CustomerAccount.id` preserves an exit path.

**Clerk is the strongest turnkey authentication product, but it conflicts with a strict EU data-residency requirement.** Clerk has first-class App Router integration, polished email OTP/magic-link flows, managed session controls, and a user-deletion API. Clerk's own current material says it does not offer regional residency or region selection; its DPA permits processing wherever Clerk or its subprocessors maintain facilities and provides transfer mechanisms for EU data. Clerk remains a valid runner-up only if “EU operation” means GDPR-compatible transfers rather than EU-only storage.

**Do not choose Auth.js for a new production implementation in 2026.** Although its architecture is provider-neutral and self-hostable in an EU region, the official Next.js installation still uses `next-auth@beta`; its security page says most `@auth/*` packages are not considered production-ready; and its own migration guide strongly recommends Better Auth for new projects. If self-hosted auth remains desirable, Better Auth needs a separate comparison rather than treating Auth.js as the safe current choice.

**Do not make Shopify Customer Accounts the primary identity provider while Shopify itself is still an open commerce decision.** Shopify provides secure hosted passwordless customer login and strong checkout/order continuity, but it makes customer identity store- and commerce-scoped. It cannot deactivate an individual customer account permanently, and connecting a separate OIDC identity provider is Shopify Plus-only. Shopify should remain a later commerce identity link or downstream customer record, not the owner of Projects.

This recommendation is provisional: the final adapter decision should wait for the Customer Account contract and EU Postgres platform decision.

## Decision matrix

| Criterion | Clerk | Auth.js | Supabase Auth | Shopify Customer Accounts |
| --- | --- | --- | --- | --- |
| Next.js App Router | Excellent, first-party SDK with server helpers, Route Handlers, Server Actions, and middleware | Native App Router Route Handler and `auth()` pattern, but current install is beta | Official App Router quickstart and cookie-based SSR pattern | Framework-neutral OAuth/OIDC and GraphQL; more integration work in a non-Hydrogen Next.js app |
| Verified-email passwordless | Email OTP and magic link | Built-in email magic link; database required for verification tokens | Email OTP and magic link | Hosted six-digit email code |
| Session model | Managed short-lived JWT in cookie; configurable inactivity and maximum lifetime | Encrypted JWT in `HttpOnly` cookie or database session in `HttpOnly` cookie | Short-lived JWT plus one-time refresh-token rotation; configurable lifetime controls | OAuth 2.0 authorization-code flow; PKCE for public clients; access, refresh, and ID tokens |
| Account deletion | Backend `deleteUser()` API; app-owned data still needs its own deletion workflow | Adapter exposes `deleteUser`, but official docs say core does not invoke it; application must implement deletion | Server-only admin deletion API; app tables/storage must be cleaned; an issued JWT remains valid until expiry | Merchant can delete/redact customer data, but individual accounts cannot be deactivated and signing in again recreates a profile |
| Guest Configuration claiming | Application-owned implementation | Application-owned implementation | Best fit: anonymous users can later link a verified email/OAuth identity and retain the same user ID; existing-account conflicts still need app logic | Application-owned implementation |
| Application-owned Projects | Good if only Clerk subject ID is stored as an identity link | Good; same database can hold auth and domain data | Excellent; public application tables, foreign keys, and RLS are documented | Technically possible externally, but identity remains tied to the Shopify customer/store |
| EU operation | GDPR transfer mechanisms, but no EU residency/region selection | Can be hosted entirely on selected EU infrastructure; operator owns all security and mail delivery | European project regions are selectable; verify the precise legal scope of project, backup, support, and control-plane residency before contract | EMEA contracting entity and GDPR mechanisms, but global subprocessors process platform data; not evidence of EU-only residency |
| Future commerce neutrality | High | High | High | Low as primary auth; high commerce affinity by design |
| Operational burden | Low | High | Medium | Low for hosted login, medium/high for headless integration and coupling management |
| 2026 production posture | Viable if US transfer is acceptable | Reject for new build; evaluate Better Auth separately if needed | Preferred candidate | Keep as later commerce adapter, not primary identity |

## Evidence by adapter

### Clerk

- Clerk documents first-class Next.js App Router support, including `auth()`, server helpers, Route Handlers, and Server Actions. [Clerk Next.js SDK overview](https://clerk.com/docs/reference/nextjs/overview)
- Clerk supports both email OTP and email-link passwordless flows. Its email-link documentation also enables same-device/browser protection by default, which reduces link-forwarding and mail-scanner attack scenarios at the cost of cross-device convenience. [Email/phone OTP flow](https://clerk.com/docs/guides/development/custom-flows/authentication/email-sms-otp), [email-link flow](https://clerk.com/docs/nextjs/guides/development/custom-flows/authentication/email-links), [email-link protection](https://clerk.com/docs/guides/secure/best-practices/protect-email-links)
- Clerk uses short-lived signed session JWTs in cookies and exposes inactivity and maximum-lifetime controls. Session-fixation protection invalidates the old token when sign-in or sign-out resets the session. [Session tokens](https://clerk.com/docs/guides/sessions/session-tokens), [session options](https://clerk.com/docs/guides/secure/session-options), [fixation protection](https://clerk.com/docs/security/fixation-protection)
- A protected Next.js server route can delete the current Clerk user through `clerkClient.users.deleteUser(userId)`. [Delete user](https://clerk.com/docs/reference/backend/user/delete-user)
- Clerk recommends keeping application-specific data in the application's database and indexing it by Clerk user ID. Its webhook documentation warns that webhook delivery is eventually consistent and not guaranteed, including for `user.deleted`. Therefore a deletion request must synchronously orchestrate application-data cleanup; a Clerk webhook can only be a retry/reconciliation signal. [Syncing Clerk data](https://clerk.com/docs/guides/development/webhooks/syncing)
- Clerk does not currently offer regional residency or region selection. Its DPA allows data to be stored and processed wherever Clerk or its subprocessors maintain facilities and relies on the Data Privacy Framework/SCCs for covered transfers. That may be GDPR-compatible, but it is not EU-only storage. [Clerk data-residency statement](https://clerk.com/articles/clerk-security-how-we-protect-your-users), [Clerk DPA](https://clerk.com/legal/dpa)

**Assessment:** Best developer and customer-authentication experience of the four, but disqualified if EU data residency is a hard requirement. It remains easy to isolate behind an identity adapter because Projects stay in the application database.

### Auth.js

- Auth.js integrates into Next.js with an App Router Route Handler and exports `auth()`, `signIn()`, and `signOut()`. However, the official Next.js installation currently installs `next-auth@beta`. [Auth.js installation](https://authjs.dev/getting-started/installation?framework=next-js)
- Its email provider implements a 24-hour verification-token magic link and requires a database even when JWT sessions are selected. Sending mail and operating the database remain application responsibilities. [Auth.js email provider](https://authjs.dev/getting-started/authentication/email)
- Sessions can use an encrypted JWT in an `HttpOnly` cookie or an opaque database session ID in an `HttpOnly` cookie. Database sessions allow immediate server-side revocation but add a database round trip. [Auth.js session strategies](https://authjs.dev/concepts/session-strategies)
- The adapter interface can create, update, and delete users and sessions, but the documented `deleteUser()` method is optional and “currently not invoked yet.” Account deletion and cascading Project deletion must therefore be custom application behavior. [Auth.js adapter interface](https://authjs.dev/reference/core/adapters)
- The critical 2026 issue is product posture: the Auth.js security page states that `@auth/*` packages other than database adapters are under development and generally not production-ready. The official migration guide says existing working installations can remain, but strongly recommends Better Auth for new projects. [Auth.js security policy](https://authjs.dev/security), [migration to Better Auth](https://authjs.dev/getting-started/migrate-to-better-auth)

**Assessment:** Architecturally neutral and capable of EU-only self-hosting, but not an appropriate new production dependency under its own current guidance. Self-hosting also makes the project responsible for mail delivery, abuse controls, session operations, deletion, monitoring, and security upgrades.

### Supabase Auth

- Supabase has an official Next.js App Router quickstart using cookie-based auth and a dedicated SSR setup for refreshing tokens through `Set-Cookie`. [Next.js quickstart](https://supabase.com/docs/guides/auth/quickstarts/nextjs), [Next.js SSR client setup](https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs&queryGroups=framework)
- It supports one-time email codes and one-time magic links. Its email-template documentation explicitly identifies email-link prefetching by security scanners and recommends OTP as one mitigation. Production use requires a custom SMTP provider. [Passwordless email login](https://supabase.com/docs/guides/auth/auth-email-passwordless?language=js&queryGroups=language), [email-template security caveats](https://supabase.com/docs/guides/auth/auth-email-templates), [production SMTP](https://supabase.com/docs/guides/auth/auth-smtp)
- Sessions use short-lived JWT access tokens and single-use refresh tokens. Supabase documents refresh-token reuse detection, configurable fixed/inactivity/single-session controls, and the delayed effect of revocation until a JWT expires unless the application checks the session record for sensitive actions. [Supabase sessions](https://supabase.com/docs/guides/auth/sessions)
- European project regions include Frankfurt, Ireland, Paris, Zurich, Stockholm, and London. This establishes selectable project placement; legal review must still confirm whether the intended “EU residency” requirement includes backups, support access, email delivery, and platform control-plane data. [Supabase regions](https://supabase.com/docs/guides/platform/regions)
- Auth data lives in a dedicated Postgres schema. Supabase explicitly recommends application-owned public tables linked to the Auth user primary key, protected by RLS, and documents `on delete cascade` for profile-like rows. [User-data management](https://supabase.com/docs/guides/auth/managing-user-data), [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- The server-only admin API deletes Auth users and supports hard or irreversible soft deletion. Deletion does not automatically invalidate an already-issued JWT until it expires, and Storage objects owned by the user must be removed or reassigned first. [Delete user API](https://supabase.com/docs/reference/javascript/auth-admin-deleteuser), [user-data deletion caveats](https://supabase.com/docs/guides/auth/managing-user-data#deleting-users)
- Anonymous sign-in is a direct fit for guest configuration: an anonymous user has a stable user ID and can later link a verified email or OAuth identity; the ID and its associated rows remain. Supabase also documents the conflict case where the email already belongs to another account and application entities must be reassigned or merged. Anonymous-user creation needs CAPTCHA/rate limits and a cleanup policy. [Anonymous sign-ins](https://supabase.com/docs/guides/auth/auth-anonymous)

**Assessment:** Best match to the approved requirements if Supabase Postgres also wins the data-platform decision. The main architectural risk is accidental coupling to Supabase-specific RLS and Auth schema. Isolate it through application services and retain a separate domain-owned customer ID.

### Shopify Customer Accounts

- Shopify's current customer accounts use a hosted, passwordless six-digit email verification code. [Shopify customer accounts](https://help.shopify.com/en/manual/customers/customer-accounts/new-customer-accounts)
- The Customer Account API uses OAuth 2.0 authorization-code flow; public clients use PKCE, and the flow includes `state`, optional `nonce`, access tokens, refresh tokens, ID tokens, and logout discovery. It is designed as the primary source for customer-scoped Shopify data and authenticated customer actions. [Customer Account API authentication](https://shopify.dev/docs/api/customer/latest)
- The API gives a headless storefront authenticated access to customer profiles, orders, payments, fulfillment, discounts, refunds, and metafields. That is excellent commerce continuity, but it is broader and more commerce-authoritative than this release's identity boundary requires. [Building with the Customer Account API](https://shopify.dev/docs/storefronts/headless/building-with-the-customer-account-api)
- Shopify states that an individual new customer account cannot be deactivated. A merchant can delete a customer profile, but signing in again with the same email creates a profile again. Shopify's compliance flow can send `customers/redact` to apps, and order history can delay redaction. [Managing customer accounts](https://help.shopify.com/en/manual/customers/customer-accounts/manage), [privacy-law compliance](https://shopify.dev/docs/apps/build/compliance/privacy-law-compliance)
- Shopify Plus can delegate customer authentication to a separate OIDC identity provider. Shopify then uses verified `email` and `sub` claims to create or resume the Shopify customer. This is the clean future bridge from an application-owned identity to Shopify, but it is Plus-only. [Third-party customer authentication](https://shopify.dev/docs/api/customer-authentication/index), [ID-token claim import](https://shopify.dev/docs/api/customer-authentication/claim-import)
- Shopify has an Irish contracting entity for EMEA and GDPR transfer mechanisms, but its subprocessor list includes global entities and says AWS, Cloudflare, and Google Cloud Canada can process all platform data. This does not establish EU-only residency. [Shopify contracting entities](https://help.shopify.com/en/manual/privacy-and-security/privacy/international-data-transfers/contracting-entities), [Shopify subprocessors](https://help.shopify.com/en/manual/privacy-and-security/privacy/subprocessors)

**Assessment:** Appropriate when Shopify is already the committed commerce and customer-account system. It is the wrong dependency direction while commerce is deliberately optional and non-authoritative.

## Provider-neutral architecture required regardless of choice

The application must not use a provider subject ID as the primary key of Project or commerce data. Use an internal model similar to:

```text
CustomerAccount
  id: application UUID
  status: active | deletion_pending | deleted

AuthIdentity
  provider: supabase | clerk | ...
  subject: provider-issued immutable user ID
  customerAccountId: application UUID
  verifiedEmailAtLink: audit-only snapshot
  unique(provider, subject)

Project
  ownerCustomerAccountId: application UUID

CommerceCustomerLink
  provider: shopify | ...
  externalCustomerId
  customerAccountId: application UUID
```

The authentication adapter should expose only a small contract: verify a request and return an immutable provider subject, start/complete verified-email sign-in, revoke sessions, and delete the provider identity. Domain authorization looks up the internal `CustomerAccount`; it never authorizes Project access by email address.

### Guest Configuration claim

Guest claiming is principally a domain transaction, not an authentication-provider feature:

1. Create the Guest Configuration with an opaque, high-entropy claim secret stored separately from the public read-only share token; persist only its hash and expiry.
2. After verified sign-in, resolve or create the internal Customer Account from `(provider, subject)`.
3. In one idempotent database transaction, claim the configuration only when it is still unowned and the secret verifies, then record the claimant and audit event.
4. If the customer already has a Project, apply an explicit merge policy; never infer ownership from matching email alone.

Supabase's anonymous-user conversion can make the happy path simpler because the user ID can remain stable, but the domain-level transaction is still required for existing-account conflicts, provider migration, shared links, and auditability.

### Account deletion

Account deletion must be an application-owned workflow:

1. Require recent authentication and explicit confirmation.
2. Mark the Customer Account `deletion_pending` and block new generation/quote operations.
3. Delete or anonymize Projects, Configuration Revisions, AI images, and personal profile data; apply a separately documented legal-retention policy to quotes and future orders.
4. Delete/revoke the provider identity and active sessions.
5. Complete through an outbox/retry process, then retain only the minimum non-personal audit evidence.

This orchestration cannot be delegated to provider webhooks: Clerk describes them as eventually consistent and not guaranteed; Auth.js does not invoke its adapter's `deleteUser`; Supabase JWTs can survive deletion until expiry; and Shopify deletion is merchant/redaction-oriented and can be delayed by order retention.

## Recommendation for the decision ticket

Advance **Supabase Auth in an EU project region** as the default candidate, conditional on the application-data platform decision. Configure verified email OTP rather than magic link for the first release, use a production SMTP provider chosen for EU requirements, and keep `CustomerAccount.id` independent from `auth.users.id`.

Keep **Clerk** as the fallback only if the stakeholder explicitly relaxes strict EU residency to GDPR-compliant international transfer. Exclude **Auth.js** from a new build under its current official production posture, and reserve **Shopify Customer Accounts** for the later commerce integration. If Shopify Plus is eventually selected, connect the application's chosen OIDC-compatible identity provider to Shopify rather than migrating Project ownership into Shopify.
