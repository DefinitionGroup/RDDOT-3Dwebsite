# Headless commerce options for hybrid sales

Research date: 2026-08-11

## Question and constraints

This report compares Shopify headless, Medusa, and a focused Stripe-backed commerce module for a later hybrid sales model:

- Customer Accounts and Projects remain owned by this application.
- A configured kitchen remains a versioned Project/Configuration Revision and is normally quote- or deposit-led.
- Standardized products may later use a conventional cart and direct checkout.
- The first launch is German; additional locales come later.
- Commerce must enter incrementally rather than forcing a platform migration before the first paid Sales Mode is known.

This is a platform-boundary comparison, not a recommendation to put Product Definitions, Projects, or Customer Accounts into a commerce provider.

## Executive conclusion

Do **not** install Shopify, Medusa, or a Stripe payment flow for the first account/project release. Establish a provider-neutral commerce boundary and ship Quote Requests as application-owned workflow records first. The application should initially use a `NoCommerceGateway`; adding a provider becomes a later migration step tied to an approved paid Sales Mode.

When a paid mode is approved:

1. **Choose Shopify headless** if rotpunkt needs a merchant-operated catalog, inventory, discounts, managed checkout, orders, fulfillment/returns tooling, and localized market operations. It is the strongest operational commerce platform of the three and its Draft Orders can represent custom items, invoices, pre-orders, payment terms, and deposits. Its main architectural risk is customer/account coupling: connecting the application's own OpenID Connect provider to Shopify customer accounts is a Shopify Plus capability. Without Plus, keep checkout guest-oriented and project/order history application-owned, or accept a second Shopify-managed authentication domain.
2. **Choose a focused Stripe-backed module** if the first paid scope is only a kitchen deposit, payment of an accepted quote, or a small direct-sale assortment whose inventory and fulfillment can stay in existing operational systems. Stripe gives the cleanest account separation and lowest incremental infrastructure cost, but this application must own the cart/order/fulfillment/refund state machine around it. It stops being the low-complexity choice once a real retail catalog and merchant operations are required.
3. **Choose Medusa** if custom commerce workflows themselves are strategically important and the team deliberately accepts owning or buying the operation of another application, admin, Postgres/Redis infrastructure, and worker. It provides broad commerce modules and the most code-level control, but quote management is an extension recipe rather than a core turnkey feature, and its production topology is materially larger than a focused Stripe integration.

For the currently stated release, the evidence favors **defer platform selection, design the boundary now, then use Stripe for a narrow paid mode or Shopify for an actual retail operation**. Medusa should stay on the shortlist only if the forthcoming commerce requirements prove too custom for Shopify and too broad to build safely around Stripe.

## The boundary all three options must respect

The application should remain authoritative for:

- `CustomerAccountId` and the authentication-provider subject.
- Project ownership and Project access.
- Configuration working state and immutable Configuration Revisions.
- Quote Requests and their sales/CRM lifecycle.
- The selected Sales Mode for a product/configuration.
- The link table between application records and provider records.

A later provider may become authoritative only for the commerce records it creates: its catalog/SKU projection, cart, checkout/payment, and provider order. The application should store provider references and project a customer-safe status view; it should not duplicate mutable provider order totals as another source of truth.

A small interface is sufficient initially:

```ts
interface CommerceGateway {
  createDirectCart(input: DirectCartInput): Promise<ExternalCartRef>
  createDepositCheckout(input: DepositCheckoutInput): Promise<ExternalCheckoutRef>
  createPaymentForAcceptedQuote(input: AcceptedQuotePaymentInput): Promise<ExternalCheckoutRef>
  getTransactionStatus(ref: ExternalTransactionRef): Promise<TransactionStatus>
}
```

`QuoteRequest` creation does not belong in this interface: it is an application workflow that can exist with no commerce provider. Provider webhooks must enter through an idempotent inbox and map external IDs to immutable Configuration Revisions, never to mutable working state.

## Capability comparison

| Area | Shopify headless | Medusa | Focused Stripe-backed module |
| --- | --- | --- | --- |
| Catalog and pricing | Full product/variant catalog with SKUs, inventory, pricing, fulfillment and sales-channel relationships. Do not explode kitchen option combinations into variants; use variants for standardized products and a custom Draft Order line/configuration reference for kitchens. | Product, Pricing, Inventory, Sales Channel, Region and related modules are available out of the box and can be extended. | Products and immutable Prices are payment/billing resources. They can cover a small catalog, but the application must own sellability, stock, merchandising and configuration rules. |
| Cart | Storefront API Cart has lines, buyer identity, discounts, delivery, estimated costs and a `checkoutUrl`. | Cart module manages lines, addresses, shipping, promotions, taxes, region, sales channel and customer scoping. | A Checkout Session is a payment attempt, not the application's durable shopping cart. Build cart persistence and price validation in Postgres, then create a fresh session for payment. |
| Checkout and payment | Managed Shopify web checkout reached from the cart. Draft Orders can send secure invoice links and support deposits/payment terms. | Storefront checkout and order workflows are supplied, with pluggable payment providers including Stripe; the storefront remains separately built/hosted. | Stripe-hosted or embedded Checkout is low-code and supports one-time payments, many local payment methods, address collection and tax. Visual customization is intentionally limited. |
| Quote/deposit fit | Strong managed primitives: Draft Orders support custom items, invoices, pre-orders, custom prices, deposits and amounts due now/later. The Project Quote Request should still remain application-owned until sales accepts it. | Draft Orders and multiple payment sessions/payments support custom flows and instalments. Medusa documents quote management as a customization built with a custom model, workflows and Admin UI, not a ready-made core workflow. | Best for taking a deposit or paying an already accepted application quote. Stripe Quotes convert to invoices, but the product-specific request/review/counter-offer workflow remains application code. |
| Orders and fulfillment | Full order and fulfillment model plus merchant Admin. | Full order, fulfillment, returns/payment concepts plus Medusa Admin. | Payment success is not a complete retail order. The application must create and operate its own Order/Fulfillment records and trigger them from verified webhooks. |
| Tax and Germany | Shopify Tax supports EU/UK VAT calculation and VAT invoices, subject to registration/configuration and documented regional caveats. | Tax regions, inclusive pricing/tax lines and replaceable tax providers are available; the operator owns configuration and any third-party provider. | Stripe Tax can calculate German VAT for Checkout and supports tax-ID collection, but registration, product tax codes and filing obligations remain merchant responsibilities. |
| Localization | Storefront API contextual queries support localized product text and country/currency context; Shopify Markets and checkout localization are mature. | Carts and orders carry BCP-47 locale and translated item data; the current Translation Module is marked beta. Sanity can remain the presentation-content source, reducing this risk. | Checkout can select locale from the browser or an explicit session locale. All storefront/catalog translation outside Checkout remains in this application/Sanity. |
| Webhooks/events | Broad webhooks with HMAC verification and deduplication. Shopify explicitly says delivery and ordering are not guaranteed, so reconciliation jobs are required. | Core commerce events have in-process subscribers; production guidance uses the Redis event module and separate worker. Payment providers also deliver webhooks to Medusa. | Verified webhooks are required for reliable fulfillment; handlers must be idempotent and tolerate retries/delay. |
| Extensibility | APIs, metafields, Functions and checkout/customer-account extensions, but changes remain inside Shopify's platform and plan constraints. | Highest code-level control: isolated commerce modules, custom modules and workflows. This flexibility is paid for in implementation and operations. | Maximum local control because the commerce state machine is application code, but every missing commerce capability becomes this team's maintenance responsibility. |
| Customer-account coupling | Shopify Customer Account API uses Shopify's OAuth/OIDC session. Bringing an existing third-party OIDC identity provider into Shopify customer accounts is Plus-only. Avoid making Shopify Customer the Project owner. | Medusa has Customer and Auth modules. Custom/third-party auth providers are supported, but the external identity still has to be linked to a Medusa customer actor. Keep the application customer canonical and store the mapping. | Cleanest separation. Stripe explicitly supports an internal customer ID in Customer metadata and `client_reference_id` on Checkout Sessions for reconciliation. Stripe Customer is a billing/payment profile, not the login or Project owner. |
| Hosting and operations | Shopify operates the commerce platform and checkout; this team hosts the Next.js storefront and integration/webhook layer. Lowest backend commerce operations burden. | Either use Medusa Cloud or operate a Node server/Admin, Postgres, Redis, production providers, and separate server/worker processes; storefront deployment is separate. Highest operational surface. | Stripe operates payment/Checkout; this team operates only the existing Next.js/Postgres service plus webhook processing. Low initial surface, rising with every custom cart/order/operations capability. |
| Incremental adoption | Add when a real standardized catalog or merchant OMS is approved. Integration includes product projection, checkout, customer strategy and webhook reconciliation. | Best adopted as an explicit commerce subsystem project, not slipped into the current app as a payment library. | Easiest paid tracer bullet: accepted quote or deposit -> server-created Checkout Session -> verified webhook -> local transaction status. |

## Option analysis

### Shopify headless

Shopify's Storefront API gives a headless frontend conventional catalog/cart primitives while redirecting buyers to Shopify's managed checkout. A Cart contains merchandise, costs, discounts, delivery and buyer identity, and exposes the checkout URL ([Shopify Cart API](https://shopify.dev/docs/api/storefront/latest/objects/cart)). Product Variants connect pricing, inventory, SKUs, fulfillment and sales channels ([Shopify ProductVariant API](https://shopify.dev/docs/api/admin-graphql/latest/objects/ProductVariant)). This is the broadest merchant-ready operational capability in the comparison.

The hybrid-sales fit is better than a cart-only reading suggests. Shopify Draft Orders support custom items, overridden/custom pricing, secure invoice links, pre-orders, payment terms and a deposit split between amount due now and later ([Shopify DraftOrder API](https://shopify.dev/docs/api/admin-graphql/latest/objects/draftorder)). A configured kitchen could therefore remain an immutable application Configuration Revision while Shopify receives a custom commercial line plus a revision reference after sales approval. Standardized products can use normal Shopify variants and carts.

German-first localization is strong. Storefront queries can be contextualized for language/country and prices, while carts use buyer identity for international pricing ([Shopify contextual queries](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/in-context)). Shopify Tax currently documents EU VAT calculations and VAT invoices, although tax registration and exceptions still require merchant/legal ownership ([Shopify Tax for EU and UK](https://help.shopify.com/en/manual/taxes/shopify-tax/shopify-tax-eu)).

The primary constraint is identity. Shopify's Customer Account API provides Shopify-hosted passwordless authentication and customer-scoped order/profile data ([Shopify Customer Account API](https://shopify.dev/docs/storefronts/headless/building-with-the-customer-account-api)). Connecting this application's own OIDC identity provider into Shopify customer accounts is explicitly limited to Shopify Plus ([Shopify customer authentication](https://shopify.dev/docs/api/customer-authentication/index)). Therefore a non-Plus implementation must choose one of three explicit designs:

- keep application accounts canonical and use guest-oriented Shopify checkout, projecting paid order status back through webhooks;
- accept separate Shopify customer authentication for commerce-facing account functions; or
- choose Plus and bridge the application's OIDC identity provider.

Do not quietly synchronize two account systems by email and call them one identity.

Shopify webhooks provide broad operational events, but Shopify states that event ordering and delivery are not guaranteed and recommends reconciliation jobs ([Shopify webhooks](https://shopify.dev/docs/apps/build/webhooks)). The integration therefore still needs an idempotent webhook inbox, periodic reconciliation and provider-ID mappings.

**Best fit:** a genuine merchant-operated direct-commerce channel, especially when catalog, inventory, discounts, tax, order handling and fulfillment matter more than owning every workflow in code.

**Poor fit:** introducing it now solely to store Projects or collect an occasional deposit.

### Medusa

Medusa supplies isolated modules for Product, Pricing, Cart, Customer, Order, Payment, Fulfillment, Inventory, Region, Sales Channel, Tax and more ([Medusa Commerce Modules](https://docs.medusajs.com/resources/commerce-modules)). Its module/workflow model provides the most freedom to implement a kitchen-specific sales lifecycle without forcing the Project model into a vendor schema ([Medusa modules](https://docs.medusajs.com/learn/fundamentals/modules)).

It has appropriate lower-level primitives for hybrid sales: Draft Orders, order edits and payment collections with multiple sessions/payments, including incremental payments ([Medusa Draft Orders](https://docs.medusajs.com/resources/commerce-modules/order/draft-orders), [Medusa Payment Collection](https://docs.medusajs.com/resources/commerce-modules/payment/payment-collection)). However, quote management is documented as a custom implementation that adds its own model, workflows, API routes and Admin UI; it is not a zero-configuration core workflow ([Medusa quote-management guide](https://docs.medusajs.com/resources/examples/guides/quote-management)). That is a good match only if the team wants to own and differentiate the workflow.

Medusa can integrate Stripe or another payment provider and handles authorization, capture and refunds through its Payment module ([Medusa Payment module](https://docs.medusajs.com/resources/commerce-modules/payment)). Its customer authentication is extensible through custom Auth Module Providers, but an external identity still maps to a Medusa customer actor ([Medusa Auth Module Provider](https://docs.medusajs.com/resources/commerce-modules/auth/auth-providers)). That mapping is manageable, yet it is another customer projection to govern.

Localization is usable but less turnkey than Shopify: carts/orders retain a BCP-47 locale and translated line-item content, while the current documentation marks the Translation Module beta ([Medusa storefront translations](https://docs.medusajs.com/resources/commerce-modules/translation/storefront)). Because Sanity already owns presentation content, this is not disqualifying; it is a reason not to move editorial localization into Medusa.

Production operation is the largest cost. Medusa documents a server/Admin application backed by Postgres and Redis, plus separate server and worker instances for production; Cloud can manage that stack ([Medusa deployment overview](https://docs.medusajs.com/learn/deployment)). Production subscribers use a Redis event module rather than the local event emitter ([Medusa events and subscribers](https://docs.medusajs.com/learn/fundamentals/events-and-subscribers)). This creates a second application lifecycle alongside the existing Next.js application even if the database vendor is shared.

**Best fit:** commerce workflows are a product capability, the team needs control unavailable in Shopify, and it accepts a dedicated commerce service and operational ownership.

**Poor fit:** adding only accounts/projects, a quote form, or one deposit payment.

### Focused Stripe-backed commerce module

Stripe Checkout provides a hosted or embedded low-code checkout for one-time payments and local payment methods, with limited visual customization ([Stripe Checkout](https://docs.stripe.com/payments/checkout)). Stripe Products and Prices can model a small standardized catalog or one-off line prices, but they are primarily reusable payment/billing resources, not an inventory and fulfillment platform ([Stripe products and prices](https://docs.stripe.com/products-prices/how-products-and-prices-work)).

This option preserves account ownership most cleanly. Stripe recommends storing the application's internal customer ID in Stripe Customer metadata and the Stripe ID on the application's customer, and Checkout `client_reference_id` can reconcile a session with an internal customer or cart ([Stripe customer model](https://docs.stripe.com/billing/customer), [Stripe Checkout Session API](https://docs.stripe.com/api/checkout/sessions/create)). A Stripe Customer should therefore be created lazily as a billing profile, never treated as the login identity.

Stripe is a strong narrow fit for a deposit or payment of an accepted quote. The application freezes an accepted Quote/Configuration Revision, calculates the authoritative payable amount on the server, creates a Checkout Session with internal references, and transitions its own Payment Transaction only after a verified event. Stripe states that webhooks are required for reliable fulfillment because customers may never reach the success page ([Stripe fulfillment](https://docs.stripe.com/checkout/fulfillment)).

German checkout and VAT are supported: Checkout can select a browser locale or receive an explicit locale, and Stripe Tax documents German VAT calculation for registered sellers ([Stripe Checkout appearance/locales](https://docs.stripe.com/payments/checkout/customization/appearance), [Stripe Tax in the EU](https://docs.stripe.com/tax/supported-countries/european-union/collect-tax?tax-jurisdiction-european-union=germany)). Tax registration, tax codes and filing remain merchant responsibilities.

The boundary of the option is equally important: Stripe payment success does not supply a complete retail order-management system. Inventory reservation, a durable cart, product availability, order edits, returns/fulfillment, merchant workflows and customer-facing order history must be built or integrated. Stripe's own comparison notes that lower-level payment flows require the merchant to build and maintain checkout lifecycle features; Checkout Sessions reduce payment complexity but do not turn the application into a commerce platform ([Stripe Checkout Sessions versus Payment Intents](https://docs.stripe.com/payments/checkout-sessions-and-payment-intents-comparison)).

**Best fit:** a deposit, accepted-quote payment, or deliberately small direct-sale scope with application-owned workflow and external operational fulfillment.

**Poor fit:** using Stripe as an excuse to custom-build a full retail platform once catalog, promotions, inventory, fulfillment, returns and merchant tooling become requirements.

## Migration timing and decision triggers

### Phase 0 — now: no commerce provider

- Introduce `SalesMode = quote_request | deposit | direct_purchase`, but enable only `quote_request`.
- Implement application-owned Customer Accounts, Projects, Configuration Revisions and Quote Requests.
- Define `CommerceGateway` and use a no-op adapter.
- Keep prototype prices explicitly non-authoritative.
- Record immutable configuration/product-definition versions on every Quote Request.

### Phase 1 — choose only when the first paid mode is approved

Choose **Stripe** when all of these remain true:

- payment means deposit or accepted-quote payment, or only a small SKU set;
- inventory/fulfillment is handled elsewhere or is intentionally simple;
- the merchant does not need a full commerce Admin for day-to-day operation;
- the application team accepts owning the Order/Transaction state machine.

Choose **Shopify** when any of these become central:

- non-technical staff must manage a meaningful catalog, prices, promotions, stock, orders or fulfillment;
- standardized products need a conventional direct-purchase channel;
- managed tax/checkout/returns operations outweigh maximum workflow freedom;
- Draft Orders and deposit/payment terms can represent the assisted kitchen sale.

Before choosing Shopify, decide whether guest commerce is acceptable, whether Shopify customer accounts are required, and whether Shopify Plus is commercially justified for external-IDP SSO.

Choose **Medusa** only when all of these are explicit decisions:

- custom quote/order/payment workflows are strategic and cannot be represented cleanly by Shopify Draft Orders plus the application Project model;
- the team wants source-level control over commerce services and Admin extensions;
- a dedicated Medusa deployment/upgrade/monitoring owner and budget exist;
- Postgres/Redis/server/worker operations or Medusa Cloud are accepted.

### Phase 2 — direct commerce activation

Regardless of provider:

- create provider records from immutable server-side commercial snapshots;
- use idempotency keys and an append-only webhook inbox;
- verify webhook signatures and reconcile missed events;
- keep provider API versions explicit;
- expose a normalized order/payment status to Projects;
- test German VAT-inclusive display, invoices, cancellations, refunds and deletion/export behavior before launch.

## Recommended decision for the next Wayfinder ticket

Adopt the following direction unless subsequent business facts contradict it:

> Keep commerce outside the first production slice. Build a provider-neutral boundary and application-owned Quote Request flow. For the first paid tracer bullet, prefer Stripe Checkout if the scope is only a deposit or accepted-quote payment. Select Shopify headless instead when standardized direct sales and merchant order operations are committed. Do not select Medusa without an explicit requirement for custom commerce workflows and an owner for its additional production stack.

This preserves an incremental path without pretending that Stripe is a commerce platform or introducing Shopify/Medusa before their operational value is needed.

## Primary sources

- [Shopify Storefront Cart API](https://shopify.dev/docs/api/storefront/latest/objects/cart)
- [Shopify ProductVariant API](https://shopify.dev/docs/api/admin-graphql/latest/objects/ProductVariant)
- [Shopify DraftOrder API](https://shopify.dev/docs/api/admin-graphql/latest/objects/draftorder)
- [Shopify contextual Storefront queries](https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/in-context)
- [Shopify Customer Account API](https://shopify.dev/docs/storefronts/headless/building-with-the-customer-account-api)
- [Shopify third-party customer authentication](https://shopify.dev/docs/api/customer-authentication/index)
- [Shopify webhooks](https://shopify.dev/docs/apps/build/webhooks)
- [Shopify Tax for EU and UK](https://help.shopify.com/en/manual/taxes/shopify-tax/shopify-tax-eu)
- [Medusa Commerce Modules](https://docs.medusajs.com/resources/commerce-modules)
- [Medusa Draft Orders](https://docs.medusajs.com/resources/commerce-modules/order/draft-orders)
- [Medusa Payment Collection](https://docs.medusajs.com/resources/commerce-modules/payment/payment-collection)
- [Medusa quote-management implementation](https://docs.medusajs.com/resources/examples/guides/quote-management)
- [Medusa Auth Module Provider](https://docs.medusajs.com/resources/commerce-modules/auth/auth-providers)
- [Medusa storefront translations](https://docs.medusajs.com/resources/commerce-modules/translation/storefront)
- [Medusa deployment overview](https://docs.medusajs.com/learn/deployment)
- [Medusa events and subscribers](https://docs.medusajs.com/learn/fundamentals/events-and-subscribers)
- [Stripe Checkout](https://docs.stripe.com/payments/checkout)
- [Stripe products and prices](https://docs.stripe.com/products-prices/how-products-and-prices-work)
- [Stripe customer model](https://docs.stripe.com/billing/customer)
- [Stripe Checkout Session API](https://docs.stripe.com/api/checkout/sessions/create)
- [Stripe fulfillment and webhooks](https://docs.stripe.com/checkout/fulfillment)
- [Stripe Tax in Germany/EU](https://docs.stripe.com/tax/supported-countries/european-union/collect-tax?tax-jurisdiction-european-union=germany)
