# EU-hosted Customer Account authentication adapters

Date: 2026-08-11

## Question and hard gates

Which production-ready authentication approach can support a Next.js App Router application with:

- identity and session data hosted in an EU member-state region;
- passwordless sign-in by a code sent to a verified email address;
- secure cookies or an equally defensible server-side session, plus targeted and global revocation;
- recent reauthentication before account deletion and other sensitive operations;
- account deletion and safe identity linking;
- an application-owned `CustomerAccount.id` that owns Projects and later commerce records; and
- a credible exit to another identity provider?

For this report, an SCC, Data Privacy Framework certification, or other GDPR transfer mechanism does **not** satisfy the location gate by itself. A candidate passes only when current first-party material establishes that the identity/session store can be placed in an EU member state, or when the software can be self-hosted entirely on infrastructure selected by the application operator.

## Answer first

There is no single winner without choosing between managed operational safety and maximum data/control portability. The production shortlist is:

1. **Logto Cloud in Europe (Netherlands)** is the recommended managed default for this project. It has an exact EU data region, an official App Router SDK, email verification-code sign-in, encrypted application-session cookies, user/admin session revocation, ten-minute verification records for sensitive changes, user deletion, social identity linking, and an open-source self-hosted edition. Its main exit caveat is important: Cloud-to-OSS migration and a complete export are currently support-assisted, not self-service. ([tenant region and export caveat](https://docs.logto.io/logto-cloud/tenant-settings), [Next.js App Router](https://docs.logto.io/quick-starts/next-app-router), [session management](https://docs.logto.io/sessions/manage-user-sessions))
2. **Better Auth with database-backed sessions on Neon Postgres in AWS Frankfurt** is the recommended control-and-portability alternative. The auth records and revocable sessions remain ordinary application-controlled Postgres rows, the Next.js integration is direct, and the project can use email OTP. This gives the cleanest provider exit and matches the separate Postgres research. It also makes this team the authentication operator: mail delivery, abuse protection, security upgrades, logs, incident response, backup/restore, and availability are application responsibilities. ([Postgres adapter](https://better-auth.com/docs/adapters/postgresql), [Next.js integration](https://better-auth.com/docs/integrations/next), [email OTP](https://better-auth.com/docs/plugins/email-otp), [sessions](https://better-auth.com/docs/concepts/session-management))
3. **Amazon Cognito User Pools in `eu-central-1` (Frankfurt, Germany)** is the strongest additional candidate discovered in the broad scan. AWS explicitly says a user pool stores user-profile data only in its selected region, and Cognito now supports native email OTP passwordless sign-in on Essentials or Plus. It has mature revocation, deletion, provider linking, and regional operations. It ranks behind Logto for this project because passwordless OTP requires a custom SDK/API flow—the managed login page always requires passwords—and because its token, IAM, SES, linking, and Next.js integration model is substantially more complex. ([regional data considerations](https://docs.aws.amazon.com/cognito/latest/developerguide/security-cognito-regional-data-considerations.html), [Frankfurt is Germany](https://docs.aws.amazon.com/global-infrastructure/latest/regions/aws-regions.html), [passwordless OTP](https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-authentication-flow-methods.html))
4. **Supabase Auth in an exact EU project region** remains a strong consolidated alternative only if the database decision changes from Neon to Supabase Postgres. It is a poor fit as a standalone identity service beside Neon because Auth's source-of-truth tables and session rows live in the Supabase project's Postgres database. ([regions](https://supabase.com/docs/guides/platform/regions), [Auth architecture](https://supabase.com/docs/guides/auth), [sessions](https://supabase.com/docs/guides/auth/sessions))
5. **Descope Growth or Enterprise in Frankfurt** is the managed enterprise alternative. Descope documents that user and project data are stored exclusively in the selected region and offers a strong Next.js, OTP, step-up, revocation, linking, and deletion surface. The exact-region capability is tied to higher plans, and current public pricing starts at $799/month for Growth, making it disproportionate for the first production release unless its flow builder, SLA, and support replace meaningful internal work. ([multi-region setting](https://docs.descope.com/management/project-settings/multi-regional), [regional architecture](https://docs.descope.com/how-to-deploy-to-production/multi-region-architecture), [pricing](https://www.descope.com/pricing))

**Recommended decision:** run two short implementation spikes before locking the adapter: Logto Cloud EU as the default and Better Auth on the selected EU Postgres as the portability/control alternative. Choose Logto if the team wants a managed identity control plane and can accept support-assisted export. Choose Better Auth only if someone explicitly owns authentication operations and the production checklist in this report. Keep Cognito as the mature managed fallback if AWS-native operations or contractual control becomes more important than developer ergonomics.

The authentication provider must never own Projects, Configuration Revisions, quotes, orders, or commerce customers. Those records reference the application's UUID, not a provider subject or email address.

## Broad eligibility scan

“Pass” below means the location gate is established for at least one usable deployment model. It does not mean the candidate is recommended.

| Candidate | EU member-state hosting evidence | Email passwordless OTP | Gate result and reason |
| --- | --- | --- | --- |
| **Better Auth** | Self-hosted library; Postgres auth/session rows can live in the chosen EU database. | Native email OTP plugin. | **Pass, self-operated.** Best database portability; the application owns the security and availability burden. |
| **Supabase Auth** | Exact project regions include Frankfurt, Ireland, Paris, and Stockholm. | Native email OTP or magic link. | **Pass, managed.** Best only with Supabase Postgres, not beside Neon. |
| **Auth0** | Public Cloud exposes a “Europe” locality but current public documentation does not name the member-state location. Private Cloud explicitly offers France, Germany, and Ireland. | Native email OTP. | **Conditional.** Private Cloud passes but is an enterprise deployment. Public Cloud needs written member-state confirmation before it can pass this strict gate. |
| **WorkOS AuthKit** | Its DPA describes Customer Personal Data transfers outside the EEA, including to the US, on a continuous basis; no EU-resident backend or self-hosted identity store was found. | Native six-digit code. | **Fail.** Strong product features do not overcome the location gate. Self-hosting AuthKit UI is not self-hosting the identity/session backend. |
| **Descope** | Growth/Enterprise can select EU/Frankfurt; Descope says user and project data are stored exclusively in that region. | Native email OTP. | **Pass, managed.** Strong, but current region-capable tier is expensive for this release. |
| **Ory** | Ory Network describes a Europe “super region,” while its current DPA lists Customer Personal Data processing in the USA, Belgium, and Germany. Ory Kratos can be self-hosted in an EU region. | Kratos supports login codes, but the integration surface is lower-level. | **Pass only self-hosted; managed fails this gate.** Operationally much heavier than Better Auth for the current scope. |
| **ZITADEL** | Self-hosting can be placed on EU infrastructure. Cloud offers a broad “Europe” region, but its DPA says Customer Data may be processed outside the EU/EEA. | Email OTP is clearly documented as an MFA/session challenge; a simple native email-code-only first factor was not established. | **Pass only self-hosted, but reject for this use case.** The required sign-in flow is not a clear built-in fit and operations are heavy. |
| **FusionAuth** | Managed cloud regions include Germany, Ireland, and Sweden; Community can also be self-hosted in the EU. | Native magic link or manually entered one-time code. | **Pass.** Capable and exit-friendly, but it adds a dedicated identity service and a heavier OIDC/Next.js integration than the top choices. |
| **Keycloak** | Can be self-hosted on EU infrastructure. | Built-in passwordless is WebAuthn; built-in OTP is TOTP/HOTP. Email-code first-factor login needs a custom Authenticator SPI/extension. | **Location pass, functional reject.** Custom auth extension plus cluster operations is excessive here. |
| **Logto** | Cloud tenant region explicitly lists Europe (Netherlands); OSS can be self-hosted. | Native email verification-code sign-in. | **Pass, managed or self-hosted. Recommended managed default.** |
| **Clerk** | Current DPA identifies Clerk, Inc. in the US and says personal data is transferred to the US under DPF/SCCs on a continuous basis; no regional identity store is offered. | Excellent native OTP. | **Fail.** GDPR transfer compliance is not EU hosting. |
| **Amazon Cognito** *(added)* | AWS says each user pool stores profile data only in its selected region; `eu-central-1` is Frankfurt, Germany. | Native email OTP on Essentials/Plus. | **Pass, managed.** Strong maturity and exact region; custom-flow and AWS integration complexity keep it third. |

Primary location evidence: [Supabase regions](https://supabase.com/docs/guides/platform/regions), [Auth0 tenant localities](https://auth0.com/docs/get-started/auth0-overview/create-tenants), [Auth0 Private Cloud countries](https://auth0.com/docs/deploy-monitor/deploy-private-cloud/private-cloud-on-aws), [WorkOS DPA](https://workos.com/legal/data-processing-addendum), [Descope multi-region](https://docs.descope.com/management/project-settings/multi-regional), [Ory DPA](https://www.ory.com/legal/Ory_Network_DPA_%28with_SCC%29_20250324.pdf), [ZITADEL DPA](https://zitadel.com/docs/legal/data-processing-agreement), [FusionAuth Cloud regions](https://fusionauth.io/docs/get-started/run-in-the-cloud/cloud), [Keycloak production hosting](https://www.keycloak.org/server/configuration-production), [Logto tenant region](https://docs.logto.io/logto-cloud/tenant-settings), [Clerk DPA](https://clerk.com/legal/dpa), [Cognito regional data](https://docs.aws.amazon.com/cognito/latest/developerguide/security-cognito-regional-data-considerations.html).

## Deep comparison of viable finalists

| Criterion | Logto Cloud EU | Better Auth + EU Postgres | Amazon Cognito Frankfurt | Supabase Auth EU | Descope Frankfurt |
| --- | --- | --- | --- | --- | --- |
| **Next.js App Router** | First-party `@logto/next` App Router guide, Route Handler callback, Server Actions/RSC helpers. | Direct App Router catch-all Route Handler and server helpers. | Framework-neutral AWS SDK or OIDC. Amplify supports Next.js SSR, but no equally simple first-party App Router/passwordless recipe was found. | First-party App Router SSR/cookie quickstart. | First-party Next.js SDK and App Router examples. |
| **Verified-email passwordless OTP** | Email identifier + verification code; production email connector required. | Email OTP plugin; application supplies `sendVerificationOTP`; hash or encrypt OTP storage. | Native `EMAIL_OTP`; Essentials/Plus and Amazon SES are required. Managed login cannot perform passwordless sign-up/sign-in. | Native email OTP; production custom SMTP required. | Native email OTP; use Descope delivery or custom SMTP/SES/SendGrid connector. |
| **Application cookie/session** | OIDC provider session plus encrypted session data in the Next.js cookie by default; external store is optional. | Opaque session token in secure, `HttpOnly`, `SameSite=Lax` cookie backed by a DB session row. | ID/access/refresh JWTs. The application must choose a secure server-side cookie/BFF implementation. | Access JWT plus single-use refresh token in cookies through `@supabase/ssr`; tokens are intentionally available to browser code in its rich-client model. | Short-lived session JWT plus refresh JWT; web SDK can use secure `HttpOnly` cookies. |
| **Revocation** | Users/admins can list and revoke individual sessions. A local application cookie/token may remain usable until validation/refresh detects revocation or its contained access token expires. | List/revoke one, other, or all DB sessions. Without cookie caching, every protected request can observe deletion immediately. | Revoke one refresh-token family or global sign-out. AWS warns an offline JWT verifier still accepts a revoked JWT until expiry. | Revoke refresh/session rows; issued access JWT remains valid until expiry unless the app also checks the session row. | Individual/global session invalidation is supported; access/session JWT lifetime still bounds offline validation. |
| **Recent reauthentication** | Ten-minute verification record obtained with password, email code, or SMS before sensitive Account API operations. | `freshAge`/fresh-session checks support sensitive operations; the app must apply that requirement to its deletion endpoint. | `prompt=login` forces reauthentication in managed OIDC login. For the custom passwordless API flow, the app should run a new `EMAIL_OTP` challenge and verify new token `auth_time`. | `reauthenticate()` sends a nonce for sensitive account changes; app deletion still needs its own recent-auth policy. | First-class step-up flows can issue a step-up result/claim using OTP or another method. |
| **Delete identity** | Management API/admin UI can permanently delete users. The application deletion workflow should revoke sessions before deleting the identity. | `deleteUser` can be enabled; the application must delete domain data and sessions transactionally/outbox-style. | Self-service `DeleteUser` and admin `AdminDeleteUser`; disabling a user immediately invalidates authenticated sessions. | Server-only admin deletion; app tables and storage need separate cleanup; JWT can outlive deletion until expiry. | Management API deletes users; domain data remains an app concern. |
| **Identity linking** | Account API links/unlinks social identities after a ten-minute verification record; verified-email social linking policies are configurable. | Account linking is configurable and can require email verification/trusted providers; app must avoid linking on unverified email. | Admin links an external IdP identity to a local profile, ideally before first federated sign-in; this is powerful but awkward and security-sensitive. | Manual identity linking is supported; automatic linking behavior is configurable. | User-management APIs and flows support merging/linking identities. |
| **Mail responsibility** | Configure an email connector (SMTP, a supported provider, or custom HTTP). | Entirely application responsibility unless optional Better Auth Infrastructure mail is used. | Cognito uses SES for email OTP; keep SES in the EU region and configure production sending. | Configure custom SMTP for production; built-in service is not a production mail plan. | Vendor delivery is available; custom connector can keep mail transport under application control. |
| **EU-location caveat** | Tenant data is stored in Netherlands, but Logto also advertises global edge routing. Confirm support, telemetry, mail connector, and backup scope in the contract. | Auth/session rows are wherever Postgres and app backups are placed. Runtime logs, email, analytics, and optional Better Auth Infrastructure must be separately constrained. | User profile stays in the selected region, but optional features can move data: AWS explicitly warns that unsupported Pinpoint analytics routes events to `us-east-1`. Do not enable it; keep SES and logs in the approved EU region. | Exact project region is selectable. Contract review must still cover support/control plane, backups, SMTP, and subprocessors. | User/project data are documented as exclusive to selected region; confirm logs, support access, connectors, and contract terms. Region cannot later be changed. |
| **Operational/security posture** | Managed identity service; Enterprise offers SLA. Pro is inexpensive but does not advertise the enterprise SLA. Open-source implementation provides transparency/exit. | Framework includes CSRF/origin checks, secure cookies, rate limits, revocation, secret rotation, and security guidance. The team owns uptime, configuration, monitoring, updates, and incident response. Fast-moving releases and recent breaking changes increase upgrade discipline. | Mature regional AWS service, AWS IAM/CloudTrail/WAF integration, encryption, and a documented 99.9% SLA. More components and configuration create more integration risk. | Managed platform with mature Auth operations; production hardening still requires correct SSR cookie/cache handling and short access tokens. | Mature managed CIAM, strong flow/risk/step-up tooling, 99.99% SLA on Growth according to pricing. |
| **Current cost posture** | Free production tenant or Pro from $24/month; usage is token-based after included quota. Enterprise/SLA is custom. | Framework is free/open source. Optional Infrastructure Pro is $20/month; database, mail, logs, backups, on-call, and engineering time are additional. | Essentials has 10,000 direct/social MAU free, then currently $0.015/MAU in the shown tier; SES is separate. | Pro starts at $25/month and includes 100,000 MAU, then $0.00325/MAU; this also purchases the Supabase database/backend bundle. | Free exists, Pro $249/month, Growth $799/month; exact multi-region is Growth/Enterprise. |
| **Exit path** | Standard OIDC integration and OSS edition are helpful, but full Cloud-to-OSS migration/export currently requires Logto support. | Strongest: auth and session data are already in ordinary app-owned Postgres tables. No password hashes are involved for OTP-only users. | User attributes can be exported; password hashes cannot. With OTP-only accounts, migrate profile/identity links and require a fresh OTP at the new provider. | Auth tables are in Postgres, but the `auth` schema is platform-managed and not a supported portable application contract. Export app identity mapping and re-enroll. | Export users/identity mappings through management APIs; provider configuration and sessions are not portable as-is. |
| **Neon / standard Postgres fit** | Excellent as external OIDC provider: store only `(issuer, subject)` links in Neon. Logto's own directory is separate. | Excellent: use Neon directly; a Supabase Postgres connection also works. | Excellent as external OIDC/API provider; Neon stores only app identity links. | Poor with Neon because it requires a separate Supabase project/database. Excellent if Supabase Postgres becomes the app DB. | Excellent as external provider; Neon stores app identity links. |

Pricing sources are observations on the research date, not quotations: [Logto pricing](https://logto.io/pricing), [Better Auth pricing](https://better-auth.com/pricing), [Cognito pricing](https://aws.amazon.com/cognito/pricing/), [Supabase pricing](https://supabase.com/pricing), [Descope pricing](https://www.descope.com/pricing).

## Evidence and assessment by finalist

### 1. Logto Cloud EU — recommended managed default

**Verified facts**

- A Logto Cloud tenant chooses where tenant data is stored. The exact European option is **Europe (Netherlands)** and cannot be changed after tenant creation. The same page says complete Cloud/OSS migration is not self-service and that customers should contact Logto for a complete export. ([tenant settings](https://docs.logto.io/logto-cloud/tenant-settings))
- The official Next.js App Router guide uses `@logto/next`, a Route Handler for the callback, Server Actions/RSC helpers, OIDC redirect sign-in, and encrypted cookie session data by default. External session storage is optional. ([App Router guide](https://docs.logto.io/quick-starts/next-app-router))
- Email can be the sign-in identifier and “verification code” the only authentication factor. ([email verification-code sign-in](https://docs.logto.io/end-user-flows/sign-up-and-sign-in/sign-in))
- Users and admins can list and revoke individual sessions. Sensitive session management itself requires fresh verification. ([session management](https://docs.logto.io/sessions/manage-user-sessions))
- The Account API can require a password, existing-email code, or SMS code to produce a verification record with a ten-minute TTL before changing identifiers, linking social accounts, or managing sessions. ([Account API verification](https://docs.logto.io/end-user-flows/account-settings/by-account-api))
- Production mail is configured through email connectors, including SMTP and custom HTTP connectors. ([email connectors](https://docs.logto.io/connectors/email-connectors))
- Logto supports user deletion through management tooling and supports linking/unlinking social identities; the application still owns deletion of its Neon records. ([user management](https://docs.logto.io/user-management/manage-users), [social sign-in/linking](https://docs.logto.io/end-user-flows/sign-up-and-sign-in/social-sign-in))

**Assessment / inference**

Logto is the best balance for a small team because it removes the auth-server operations burden without forcing the application database or commerce model into the provider. Its standard OIDC boundary fits a small `IdentityAdapter`, and the Netherlands placement passes the storage gate. The two concerns to resolve in contract/spike are global-edge/support processing and the support-assisted exit. Because the application uses passwordless OTP, an exit does not need portable passwords: export verified identities, preserve the internal `CustomerAccount.id`, switch issuer configuration, and require an OTP at first login with the replacement provider.

### 2. Better Auth on Neon Frankfurt — recommended portability/control alternative

**Verified facts**

- Better Auth connects directly to Postgres through `pg`/Kysely and supports placing auth tables in a non-default schema. This works with normal Postgres, including Neon or Supabase Postgres. ([Postgres adapter](https://better-auth.com/docs/adapters/postgresql), [database concepts](https://better-auth.com/docs/concepts/database))
- Its Next.js integration exposes a catch-all App Router Route Handler and server helpers. The documentation warns that cookie presence alone is not authentication and that server code must validate the session. ([Next.js integration](https://better-auth.com/docs/integrations/next))
- The email OTP plugin supplies code generation/verification and requires an application callback to send mail. The default expiry is five minutes and storage can be configured as hashed or encrypted instead of plaintext. ([email OTP](https://better-auth.com/docs/plugins/email-otp))
- The recommended traditional session is a database row referenced by an opaque cookie token. Better Auth supports session freshness plus list/revoke current, other, or all sessions. Stateless cookie-only sessions are harder to invalidate and should not be used here. ([session management](https://better-auth.com/docs/concepts/session-management))
- Production cookies are `HttpOnly`, secure, and `SameSite=Lax`; the framework also documents origin/CSRF checks, rate limiting, secret rotation, and proxy-header hardening. ([cookies](https://better-auth.com/docs/concepts/cookies), [security](https://better-auth.com/docs/reference/security), [rate limits](https://better-auth.com/docs/concepts/rate-limit))
- User deletion and account linking are configurable features. ([options](https://better-auth.com/docs/reference/options), [users and accounts](https://better-auth.com/docs/concepts/users-accounts))
- The framework is free and open source. Optional Better Auth Infrastructure pricing currently starts at $20/month for production features such as audit/security events and mail. ([pricing](https://better-auth.com/pricing))

**Assessment / inference**

This is the cleanest architecture if the team is prepared to operate authentication. It keeps identity and session source-of-truth rows in the same EU Postgres recovery regime as the internal identity links and makes provider exit a database/schema migration rather than a vendor export. That benefit is real, but “self-hosted” does not make the security work disappear. The release history is active and includes breaking changes and security-relevant fixes, so production must pin versions, review release notes, test migrations, and maintain a rapid patch path. ([official releases](https://github.com/better-auth/better-auth/releases))

Do not enable cookie-cached/stateless sessions for authorization-sensitive routes. Hash OTP records, explicitly set production `baseURL` and `trustedOrigins`, trust only the actual proxy's IP headers, and keep mail, logs, backups, and optional Better Auth Infrastructure inside the approved data boundary or formally outside the residency claim.

### 3. Amazon Cognito Frankfurt — mature managed fallback

**Verified facts**

- Cognito user pools are regional; AWS says each pool stores user-profile data **only** in its selected AWS region. `eu-central-1` is Europe (Frankfurt), Germany. Optional features can route data elsewhere; Pinpoint analytics can fall back to US East. ([regional data](https://docs.aws.amazon.com/cognito/latest/developerguide/security-cognito-regional-data-considerations.html), [AWS region geography](https://docs.aws.amazon.com/global-infrastructure/latest/regions/aws-regions.html))
- Essentials/Plus can enable `EMAIL_OTP` as a first authentication factor. A successful code completes authentication and verifies possession of the email. Email OTP requires SES. ([passwordless flow](https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-authentication-flow-methods.html), [email settings](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-email.html))
- The hosted/managed login page always requires passwords for sign-up; a passwordless experience must be built with AWS SDK authentication calls. ([sign-up conditions](https://docs.aws.amazon.com/cognito/latest/developerguide/signing-up-users-in-your-app.html))
- Refresh-token-family revocation, global user/admin sign-out, self-service deletion, admin deletion, and account disable are supported. AWS explicitly warns that a revoked JWT still passes ordinary offline signature/expiry verification, so short access-token lifetime or online checks are required for sensitive operations. ([token revocation](https://docs.aws.amazon.com/cognito/latest/developerguide/token-revocation.html), [delete/disable users](https://docs.aws.amazon.com/cognito/latest/developerguide/how-to-manage-user-accounts.html))
- `prompt=login` forces reauthentication in the OIDC authorization flow. Federated identities can be linked to a local user, but AWS warns to link only trusted provider identifiers, and previously created federated profiles complicate linking. ([reauthentication](https://docs.aws.amazon.com/cognito/latest/developerguide/authorization-endpoint.html), [provider linking](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-identity-federation-consolidate-users.html))
- The Essentials plan currently includes 10,000 direct/social MAU per month and lists $0.015/MAU above the free tier in its example; SES is billed separately. ([pricing](https://aws.amazon.com/cognito/pricing/))

**Assessment / inference**

Cognito is the strongest “boring infrastructure” option and should replace Auth0 as the mature managed fallback under the strict location gate. It is not the first recommendation because the application must build the passwordless challenge UI and secure server/BFF token-cookie handling, configure SES/IAM/CloudTrail, and translate AWS's JWT revocation semantics into domain safety. A production adapter must check `auth_time`/a newly completed OTP before deletion, use short access tokens, and never accept a provider `sub` as the Project owner ID.

### 4. Supabase Auth EU — only if Supabase also owns application Postgres

**Verified facts**

- Supabase offers exact EU project regions including Frankfurt, Ireland, Paris, and Stockholm. ([regions](https://supabase.com/docs/guides/platform/regions))
- Auth is backed by the project's Postgres `auth` schema and has an official App Router/cookie SSR path. ([Auth architecture](https://supabase.com/docs/guides/auth), [Next.js quickstart](https://supabase.com/docs/guides/auth/quickstarts/nextjs))
- Email OTP is built in; production should use custom SMTP. ([passwordless email](https://supabase.com/docs/guides/auth/auth-email-passwordless), [production SMTP](https://supabase.com/docs/guides/auth/auth-smtp))
- Sessions are access JWTs plus single-use refresh tokens. Session rows can be terminated, but access JWTs normally remain valid until expiry unless the application performs an additional session check. ([sessions](https://supabase.com/docs/guides/auth/sessions))
- Manual identity linking, user deletion, and reauthentication are documented. ([identities](https://supabase.com/docs/guides/auth/identities), [users](https://supabase.com/docs/guides/auth/users), [password security and reauthentication](https://supabase.com/docs/guides/auth/password-security))

**Assessment / inference**

Supabase Auth is coherent when Auth, application tables, RLS, and backups are all one consciously selected Supabase platform. With the separate database research currently favoring Neon, using Supabase only for Auth creates two Postgres control planes, two recovery/region reviews, and a provider-specific auth schema without reducing the external-provider boundary. Logto or Cognito is cleaner beside Neon; Better Auth is cleaner inside Neon.

### 5. Descope Frankfurt — enterprise managed option

**Verified facts**

- Growth/Enterprise projects can select EU/Frankfurt, and Descope says user/project data are stored and maintained exclusively in the selected region. A project's region cannot be moved later. ([multi-region project setting](https://docs.descope.com/management/project-settings/multi-regional), [architecture](https://docs.descope.com/how-to-deploy-to-production/multi-region-architecture))
- Descope has an official Next.js integration, email OTP with configurable expiry and delivery connectors, secure cookie-based session support, refresh/session invalidation, and first-class step-up flows. ([Next.js](https://docs.descope.com/getting-started/nextjs), [OTP](https://docs.descope.com/auth-methods/otp/settings), [sessions](https://docs.descope.com/sessions), [step-up](https://docs.descope.com/mfa-and-step-up/step-up))
- User-management APIs support deletion, identity management/merging, and session logout. ([user management API](https://docs.descope.com/api/management/users), [user management](https://docs.descope.com/management/user-management))
- Current public pricing lists Pro at $249/month and Growth at $799/month; Growth advertises 99.99% SLA and the multi-region capability is documented for Growth/Enterprise. ([pricing](https://www.descope.com/pricing))

**Assessment / inference**

Descope is technically one of the strongest candidates. It is not cost-proportionate for the initial German-first consumer account feature unless the team deliberately buys the flow builder, SLA, risk tooling, and support instead of building/operating those capabilities. If enterprise security requirements arrive early, re-open Descope before expanding a home-grown auth surface.

## Viable but not shortlisted

### FusionAuth

FusionAuth Cloud can be placed in Germany, Ireland, or Sweden, and the free Community edition can be self-hosted. Current FusionAuth supports manually entered email OTP through the `FormField` passwordless strategy, plus refresh-token/session revocation, `prompt`/`auth_time`, user deletion, and provider links. It also has an official Next.js App Router quickstart, but that path adds an Auth.js/NextAuth application-session layer on top of FusionAuth. ([regions and exit to self-hosting](https://fusionauth.io/docs/get-started/run-in-the-cloud/cloud), [email OTP](https://fusionauth.io/docs/lifecycle/authenticate-users/passwordless/magic-links), [passwordless API](https://fusionauth.io/docs/apis/passwordless), [Next.js quickstart](https://fusionauth.io/docs/get-started/quickstarts/web/quickstart-javascript-nextjs-web))

It is a credible fallback where a dedicated, self-hostable CIAM service is required. For this project it has more service and integration weight than Better Auth and less managed simplicity than Logto. Current hosted Starter pricing begins around $162/month billed annually, while higher support/HA tiers rise sharply. ([pricing](https://fusionauth.io/pricing))

### Auth0

Auth0 is mature and functionally complete: official Next.js SDK support, passwordless email OTP, encrypted application session cookies, targeted session/refresh revocation, `max_age`/`auth_time` reauthentication, deletion, and account linking. ([Next.js](https://dev.auth0.com/docs/quickstart/webapp/nextjs/interactive), [email OTP](https://auth0.com/docs/authenticate/passwordless/authentication-methods/email-otp), [session revocation](https://auth0.com/docs/api/management/v2/sessions/revoke-session), [reauthentication](https://auth0.com/docs/authenticate/login/max-age-reauthentication), [linking](https://auth0.com/docs/manage-users/user-accounts/user-account-linking/link-user-accounts))

The public-cloud documentation calls the locality “Europe” and says that locality controls where data is hosted, but it does not identify a member state on the current tenant page. Under this report's strict evidence rule, that is insufficient. Auth0 Private Cloud explicitly offers Germany, France, and Ireland and therefore passes technically, but it is an enterprise deployment rather than a realistic first-release option. ([public tenant localities](https://auth0.com/docs/get-started/auth0-overview/create-tenants), [Private Cloud regions](https://auth0.com/docs/deploy-monitor/deploy-private-cloud/private-cloud-on-aws))

If Auth0 supplies contractual public-cloud evidence naming an EU member-state primary and failover location, it can re-enter beside Cognito. Exit is possible by bulk export/Management API, but password hashes require a support request and tenant-to-tenant transfer is not provided. OTP-only accounts reduce that exit problem. ([export policy](https://auth0.com/docs/troubleshoot/customer-support/operational-policies/data-export-and-transfer-policy))

### Ory, ZITADEL, and Keycloak self-hosted

All three can be operated on EU infrastructure, but none improves this project's risk/cost balance:

- **Ory Kratos** offers a serious open-source identity service and a compatible managed/self-host boundary, but self-hosting is a multi-service operations commitment. Ory Network does not pass because its DPA lists Customer Personal Data processing in the US as well as Belgium and Germany. ([Ory Network](https://www.ory.com/network), [DPA](https://www.ory.com/legal/Ory_Network_DPA_%28with_SCC%29_20250324.pdf))
- **ZITADEL self-hosted** is production-capable on Postgres and has strong audit/OIDC capabilities. ZITADEL Cloud does not pass because the current DPA allows Customer Data processing outside the EU/EEA, and the product documentation did not establish email-code-only login as a simple first factor rather than MFA/session challenge. ([production self-hosting](https://zitadel.com/docs/self-hosting/manage/production), [Postgres](https://zitadel.com/docs/self-hosting/manage/database), [DPA](https://zitadel.com/docs/legal/data-processing-agreement))
- **Keycloak** is mature self-hosted IAM, but its built-in passwordless path is WebAuthn and its built-in OTP is TOTP/HOTP. Email OTP login needs a custom Authenticator SPI. Owning a Keycloak cluster and a security-sensitive extension is not justified for this scope. ([server administration](https://www.keycloak.org/docs/latest/server_admin/), [Authenticator SPI](https://www.keycloak.org/docs/latest/server_development/index.html), [production configuration](https://www.keycloak.org/server/configuration-production))

## Hard eliminations

### Clerk

Clerk is still a strong usability baseline, but it fails the stated gate. Its DPA identifies the data importer as Clerk, Inc. in the United States, describes DPF/SCC transfer mechanisms, and says the transfer occurs on a continuous basis. Those controls may support GDPR compliance; they are not evidence that the identity/session store is hosted in an EU member state. ([Clerk DPA](https://clerk.com/legal/dpa))

### WorkOS AuthKit

AuthKit meets almost every functional criterion: six-digit Magic Auth codes, revocable sessions, recent-authentication `auth_time`/`max_age`, identity linking, user deletion, and custom email. ([Magic Auth](https://workos.com/docs/authkit/magic-auth), [sessions](https://workos.com/docs/authkit/sessions), [reauthentication](https://workos.com/docs/authkit/reauthentication), [identity linking](https://workos.com/docs/authkit/identity-linking))

It still fails the location gate. WorkOS's DPA states that personal data is transferred outside the EEA, including the US, on a continuous basis. No first-party evidence was found for an EU-resident AuthKit identity/session backend or a self-hosted backend. ([WorkOS DPA](https://workos.com/legal/data-processing-addendum))

## Provider-neutral application architecture

The application identity model is invariant across all candidates:

```text
CustomerAccount
  id: UUID                         # application-owned and permanent
  status: active | deletion_pending | deleted
  createdAt

AuthIdentity
  id: UUID
  customerAccountId: UUID          # FK -> CustomerAccount.id
  issuer: string                   # exact provider/tenant issuer
  subject: string                  # immutable provider subject
  verifiedEmailSnapshot?: string   # audit/display only, never authorization
  linkedAt
  unique(issuer, subject)

Project
  ownerCustomerAccountId: UUID     # never provider subject/email

CommerceCustomerLink
  customerAccountId: UUID
  provider: shopify | commercetools | ...
  externalCustomerId: string
  unique(provider, externalCustomerId)
```

The runtime adapter should be deliberately small:

```ts
interface IdentityAdapter {
  verifyRequest(request: Request): Promise<{
    issuer: string;
    subject: string;
    authenticatedAt: Date;
  } | null>;

  requireRecentAuthentication(
    request: Request,
    maxAgeSeconds: number,
  ): Promise<{ issuer: string; subject: string }>;

  revokeSession(sessionId: string): Promise<void>;
  revokeAllSessions(subject: string): Promise<void>;
  deleteIdentity(subject: string): Promise<void>;
}
```

Starting and completing an email OTP flow may be provider-specific UI or redirect behavior and does not need to contaminate domain services. Domain authorization begins only after `(issuer, subject)` resolves through `AuthIdentity` to `CustomerAccount.id`.

### Identity-linking rule

Never merge accounts merely because two providers return the same email string. Link only after one of these controlled paths:

1. the already authenticated user completes recent reauthentication and proves the new provider identity; or
2. an administrator follows an audited recovery procedure with equivalent proof.

Provider-side automatic linking must require a verified email claim and must still map to one application `CustomerAccount`. A conflicting existing mapping is a recoverable support case, not a reason to silently merge Projects.

### Deletion rule

Deletion is an application saga, not a provider webhook:

1. require a new OTP/recent-auth proof with a short maximum age;
2. mark `CustomerAccount.status = deletion_pending` and block new Project/quote operations;
3. revoke sessions;
4. delete or anonymize Projects, generated images, configuration revisions, profile data, and identity links according to the documented retention policy;
5. retain legally required commerce/order records separately and minimize them;
6. delete the provider identity;
7. complete through a transactional outbox/retry worker and record non-personal audit evidence.

Short-lived provider JWTs may remain cryptographically valid after revocation/deletion. Every adapter must define the exact maximum window and use online session/introspection checks for deletion, account linking, quote acceptance, and future payment-account operations.

## Production gates for the two recommended spikes

### Logto Cloud EU spike

The spike passes only when it demonstrates:

1. a production-type tenant created in **Europe (Netherlands)**;
2. German-first hosted/custom sign-in with email verification code only;
3. an EU-compatible transactional email connector and rate-limit/abuse behavior;
4. encrypted, secure, `HttpOnly`, same-site application cookies with a documented token lifetime;
5. logout current session, revoke another session, revoke all sessions, and verify the maximum residual access-token window;
6. a ten-minute email re-verification before application account deletion;
7. create/resolve `CustomerAccount` from `(issuer, subject)` without authorizing by email;
8. a test user export obtained or contractually confirmed, including fields, turnaround, and deletion/backup behavior;
9. DPA/subprocessor review covering tenant data, backups, global edge, support, telemetry, and email connector; and
10. failure tests for provider outage, callback replay/state mismatch, duplicate account, and deleted/disabled identity.

### Better Auth on EU Postgres spike

The spike passes only when it demonstrates:

1. auth tables in a dedicated `auth` schema on the chosen Frankfurt Postgres;
2. database-backed opaque sessions with stateless/cookie caching disabled on protected routes;
3. hashed OTP storage, five-minute or shorter expiry, attempt limits, resend throttling, enumeration-safe responses, and an EU mail provider;
4. explicit `baseURL`, exact `trustedOrigins`, secure `HttpOnly` host-only cookies, and correct production proxy/IP configuration;
5. list/revoke current/other/all sessions and immediate denial after DB-session deletion;
6. `freshAge` enforcement plus a new OTP before account deletion/linking;
7. backup/restore of auth rows and a tested rollback/forward migration for the pinned Better Auth version;
8. security/audit logs that do not leak OTPs, session tokens, or unnecessary PII;
9. monitoring for OTP send/verify failures, brute force, DB latency, session validation errors, and deletion saga failures; and
10. named ownership for dependency security updates, incident response, key rotation, mail reputation, and on-call recovery.

## Ranked recommendation

1. **Logto Cloud EU (Netherlands)** — choose for the first production release unless export terms or processing-boundary review fails.
2. **Better Auth + Neon Frankfurt** — choose when app-owned data/control and easy exit outweigh the explicit auth-operations burden.
3. **Amazon Cognito Frankfurt** — choose when mature regional infrastructure/AWS governance outweigh custom passwordless UX and integration complexity.
4. **Supabase Auth EU** — choose only together with Supabase Postgres as a deliberate platform bundle.
5. **Descope Frankfurt** — choose when enterprise CIAM support, flow tooling, SLA, and security features justify the Growth/Enterprise cost.
6. **FusionAuth Germany/Ireland/Sweden** — credible dedicated/self-hostable CIAM fallback, but too heavy for the current release.

Auth0 can re-enter only with exact public-cloud member-state evidence or a justified Private Cloud contract. Ory, ZITADEL, and Keycloak are self-hostable escape hatches, not sensible first-release choices. Clerk and WorkOS remain excluded while the strict EU hosting gate stands.

## Decision that can safely be deferred

The architecture and `IdentityAdapter` boundary should be approved now; the final vendor can be chosen after the two spikes and contract review. No configurator, Project, quote, or commerce implementation needs to wait. The only non-deferrable rule is that all domain records use `CustomerAccount.id`, while provider subjects stay in `AuthIdentity`.
