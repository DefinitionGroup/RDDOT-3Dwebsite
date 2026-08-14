# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The First Production Release serves private customers planning their own kitchen. Guests can browse, configure, and share; a Customer Account is required to save Projects, generate AI photos, submit Quote Requests, and view private history. Sanity editors and future internal sales or planning staff use separate identities.

## Product Purpose

rotpunkt Signature combines a branded kitchen website with a shareable 3D configurator and a private planning workspace. Success means a customer can move from exploration to a persistent Project and Quote Request without losing the exact configuration they evaluated.

## Positioning

The product keeps visual configuration, immutable planning milestones, AI visualization, and commercial handoff connected through an application-owned Project while keeping authentication, content, AI, and future commerce providers replaceable.

## Operating Context

Customers typically browse and configure across desktop and mobile, may begin as guests, and later authenticate by email OTP to preserve work privately. German is the first-release language; English and Spanish follow later. The First Production Release ends at a Quote Request, not direct purchase.

## Capabilities and Constraints

- Next.js App Router with Tailwind CSS, Motion, React Three Fiber, drei, and Three.js.
- Self-hosted Better Auth with hashed, short-lived email OTPs and database-backed sessions on Neon Postgres in Frankfurt.
- Application-owned Customer Account UUIDs; authentication-provider subjects never own Projects or commercial data.
- Guest Configurations import as copies after sign-in instead of becoming anonymous accounts.
- Projects are private by default; Shared Revision Links expose one immutable Configuration Revision and remain revocable.
- A signed-in customer opens only their own saved Project at `/configure?project=<uuid>`; an expired session returns through the email-code flow to that Project.
- Active Project edits autosave with an expected Working Configuration version. A conflicting write is never overwritten, and the browser retains an unconfirmed local draft for recovery or saving as a new Project.
- A confirmed Working Configuration save updates both its version and the Project's workspace timestamp.
- “Version speichern” explicitly creates or reuses an immutable Configuration Revision from the confirmed Working Configuration; autosave never creates history entries.
- A Project's owner can page through its immutable version history. Each entry's historical display snapshot is created from the Product Definition version pinned to that Configuration Revision rather than today's active definition.
- Restoring a Configuration Revision requires the expected Working Configuration version. Before replacement, the application preserves the current state as a safety revision and then restores both the selected configuration and its Product Definition identity.
- The current configurator supports one straight-line kitchen, cabinet color, and front color.
- Sanity editorial content and future ecommerce remain behind replaceable adapters.
- Production transactional email provider selection is deliberately open. Development email capture must never be active in production.
- The First Production Release has no cart, payment, Order, or direct checkout.

## Brand Commitments

The product name is rotpunkt Signature. Preserve the existing rotpunkt logo, German-first voice, premium kitchen imagery, sharp geometry, restrained gallery-like presentation, and signature red accent. The current website implementation is the visual authority unless the user requests a redesign.

## Evidence on Hand

- Existing branded homepage and configurator implementation.
- rotpunkt logo component and local Aspekta variable font.
- Kitchen imagery under `public/images/` and 3D assets under `public/models/`.
- Approved architecture language in `CONTEXT.md` and decisions in `docs/adr/`.
- No customer testimonials, production commerce claims, or verified transactional-email provider relationship may be invented.

## Product Principles

1. Preserve a customer's configuration meaning across every handoff.
2. Keep customer identity and private work application-owned.
3. Let guests explore freely, then make authentication a clear continuation rather than a reset.
4. Keep provider choices replaceable and fail closed when a production dependency is unavailable.
5. Treat German-first quality as complete work, not a temporary translation layer.

## Accessibility & Inclusion

Customer-facing flows must be keyboard usable, provide visible focus, expose form errors in text, respect reduced motion, work without horizontal overflow, and remain understandable when the 3D canvas or external services are unavailable.
