# Production Architecture Wayfinder

Label: wayfinder:map
Status: open

## Destination

Produce an approved, decision-complete production architecture and incremental migration specification for rotpunkt Signature that is ready to collapse into a buildable spec and implementation tickets.

The First Production Release is German-first and lets customers browse, configure, save and share Projects, generate persistent AI photos, use Customer Accounts, and submit Quote Requests. Direct cart, payment, and ordering remain later capabilities but must fit without replacing the configurator or customer-data model.

## Notes

- Planning only: this map resolves decisions and does not implement application features.
- Preserve and incrementally harden the current Next.js, TypeScript, Tailwind, Motion, React Three Fiber, Three.js, and Sanity direction.
- Treat database, authentication, commerce, hosting, queue, object storage, monitoring, and AI-provider choices as open until their tickets resolve.
- Keep Sanity editorial, transactional data application-owned, and provider integrations replaceable.
- First-release Customer Accounts are for private customers; Sanity editors and future internal sales or planning staff are separate identities.
- Guests may browse, configure, and share. Customer Accounts are required to save Projects, generate AI photos, submit Quote Requests, and view their history.
- Projects are private by default. Shared Revision Links are revocable, read-only, and expose one Configuration Revision only.
- Use managed EU-hosted infrastructure and adaptive 3D quality, with stable raster rendering and a deterministic fallback as the purchase-critical baseline.
- Every grilling ticket uses `/grilling` and `/domain-modeling`; interface-shape decisions also use `/codebase-design`.
- Research tickets use primary sources and save their evidence under `research/`.

## Decisions so far

<!-- Closed-ticket pointers are appended here. -->

- [Define the Customer Account and identity contract](issues/01-define-customer-account-identity-contract.md) — Customer Accounts are application-owned, provider identities only authenticate, Guest Configurations import as copies, and ownership, security, recovery, consent, and deletion rules are provider-neutral.
- [Compare Customer Account authentication adapters](issues/02-compare-authentication-adapters.md) — Supabase Auth is the conditional EU-oriented front-runner; Clerk requires relaxing EU-only residency, Auth.js is unsuitable for a new 2026 build, and Shopify must not own identity before commerce is chosen.
- [Compare managed EU Postgres application-data platforms](issues/05-compare-eu-postgres-platforms.md) — Neon Frankfurt best fits serverless Next.js and preview branching, while Crunchy Bridge is the stronger portability and backup-oriented alternative.
- [Compare headless commerce options for hybrid sales](issues/09-compare-headless-commerce-options.md) — Defer platform selection; use Stripe for narrow payments, Shopify for committed retail operations, and Medusa only when custom commerce workflows justify its operational weight.
- [Compare EU-hosted Customer Account authentication adapters](issues/18-compare-eu-hosted-authentication-adapters.md) — Logto Netherlands is the managed default, Better Auth on EU Postgres is the control alternative, Cognito Frankfurt is the mature fallback, and Clerk and WorkOS fail the strict EU-hosting gate.
- [Choose the Customer Account authentication adapter](issues/03-choose-authentication-adapter.md) — Use self-hosted Better Auth with database-backed sessions on the selected EU Postgres, email OTP, application-owned identity mapping, and explicit in-house security operations.
- [Define the Project persistence and revision contract](issues/04-define-project-persistence-contract.md) — Projects autosave one optimistic-versioned Working Configuration, preserve immutable historical revisions for shares/photos/quotes, and enforce explicit import, lifecycle, retention, and module seams.
- [Choose the application data platform and access layer](issues/06-choose-application-data-platform.md) — Use Neon Frankfurt as standard Postgres with Kysely/`pg`, dbmate SQL migrations, isolated auth/application schemas, synthetic previews, and tested recovery and portability gates.
- [Define product, content, configuration, and pricing ownership](issues/07-define-source-of-truth-ownership.md) — Sanity authors editorial content and product drafts, while atomic immutable release bundles govern configurator rules, approved assets, nonbinding pricing, history, and future commerce seams.
- [Define future commerce decision criteria](issues/08-define-commerce-decision-criteria.md) — Introduce commerce only for an operationally ready Sellable Offer, starting with accepted-quote payment and selecting Stripe, Shopify, or Medusa by required business capability and operating ownership.
- [Choose the future commerce boundary and adoption timing](issues/10-choose-commerce-boundary-and-timing.md) — Keep the First Production Release quote-only, add Stripe later through a narrow accepted-quote payment boundary, and treat Shopify-backed retail as a separate capability introduced only for approved Standardized Products and merchant operations.
- [Define the Sanity editorial and localization contract](issues/11-define-sanity-editorial-contract.md) — Use Sanity conditionally for non-personal localized Editorial Content behind an application-owned Adapter, keep product release activation and all customer data outside it, and preserve a tested CMS exit path.
- [Define the AI-photo job and retention contract](issues/12-define-ai-photo-job-contract.md) — Make Photo Jobs durable, revision-pinned, moderated, EU-stored, quota-controlled, provider-isolated, and illustrative only; use Replicate initially through an explicit scoped non-EU processing exception and verified production-control gate.
- [Define the 3D production runtime and asset contract](issues/13-define-3d-production-contract.md) — Use semantic immutable assets and stable raster rendering as the canonical baseline, adapt fidelity without changing product meaning, and preserve every workflow through validated deterministic fallback.

## Not yet specified

- Exact deployment topology, environment model, observability stack, backup/restore procedure, and incident ownership depend on the identity, data, commerce, AI, 3D, and quality decisions.
- Migration waves, data migrations, compatibility windows, rollout gates, and rollback procedures depend on the target modules and provider choices.
- CRM selection and internal sales workflow remain unknown; the architecture needs an adapter and email fallback until rotpunkt identifies the destination system.
- English and Spanish rollout sequencing, translation operations, and localized commerce behavior come after the German-first model is stable.
- Direct-retail tax, fulfillment, returns, and Order lifecycle details depend on which later Standardized Products are approved for the Retail Commerce Module.
- Internal planner, dealer, and multi-user collaboration roles are future scope that may require a separate identity and authorization map.
- Replicate production activation is blocked on its [legal and operational control gate](issues/19-verify-replicate-production-controls.md); its public evidence still does not satisfy the normal EU-member-state-only processing rule, so the exception must remain explicit and revocable.

## Out of scope

- Direct cart, payment, and Order creation in the First Production Release.
- Multi-region or microservice architecture before demonstrated scale requires it.
- Multi-user Project collaboration, invitations, dealer portals, and internal planning tools in the First Production Release.
- Allowing Sanity, the browser, or an AI provider to become the authoritative source for prices, Customer Accounts, Projects, Quote Requests, or Orders.
