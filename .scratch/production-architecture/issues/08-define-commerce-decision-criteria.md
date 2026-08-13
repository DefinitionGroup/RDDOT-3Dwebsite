# Define future commerce decision criteria

Type: grilling
Status: resolved
Blocked by: none
Map: ../map.md

## Question

What future catalog, deposit, direct-purchase, checkout, tax, payment, Order, CRM, localization, and operating requirements must a commerce module support under the approved hybrid Sales Mode model?

## Comments

- 2026-08-12: The first paid Sales Mode is a deposit or payment against an accepted Authoritative Quote. A configured kitchen may not be purchased directly from a nonbinding Price Indication.
- 2026-08-12: Commerce adoption requires an approved sellable offer, merchant-of-record entity, named operational owners, German tax/invoice review, payment/refund policy, fulfillment and support processes, and a measured business case. It is triggered by operational readiness, not a target date.
- 2026-08-12: Product Definition Releases remain the configurable-kitchen catalog. Kitchen combinations are not exploded into commerce variants; an approved Configuration Revision becomes a custom commercial line. Only standardized independently purchasable products receive commerce SKUs/variants.
- 2026-08-12: `CustomerAccount.id` remains canonical. Commerce customer/billing profiles are created lazily and linked by opaque provider references; accounts are never merged by email and Shopify authentication may not gate Project access.
- 2026-08-12: The first paid implementation is German/EUR only, uses tax-inclusive customer prices, and requires approved German VAT/invoice, payment, deposit/refund, privacy, support, and accessibility behavior. New markets, currencies, and commercial terms require separate readiness approval.
- 2026-08-12: Payment launch requires named owners for catalog/pricing approval, tax, reconciliation, fraud/disputes, refunds, fulfillment, returns, support, and incidents, plus verified idempotent webhooks, reconciliation, and manual recovery procedures.
- 2026-08-13: Customer Accounts, Projects, configurations, and application commercial snapshots remain EU-hosted. A payment or commerce provider may process minimized payment data internationally only after DPA, subprocessor, transfer, and legal review; card data is never stored by the application.
- 2026-08-13: The payment provider is authoritative for transaction, capture, refund, chargeback, and payout facts. A future commerce platform may own Order totals and fulfillment; the application stores immutable handoff evidence, opaque references, and a reconciled status rather than a parallel financial ledger.
- 2026-08-13: Stripe fits a narrow deposit, accepted-quote payment, or very small standardized assortment; Shopify fits merchant-operated catalog and order operations; Medusa requires strategically differentiating custom workflows and funded ownership of a dedicated commerce system.
- 2026-08-13: Payment against a quote requires a designated CRM, ERP, or controlled sales workflow to issue an Authoritative Quote and record acceptance, amount, tax context, expiry, and Configuration Revision. A Quote Request cannot initiate payment.
- 2026-08-13: Browser redirects never prove payment success. Verified webhooks and provider retrieval establish status; processing states, idempotent inbox handling, reconciliation jobs, and manual recovery protect against delayed, duplicate, missing, or out-of-order events.
- 2026-08-13: Provider adoption requires exportability, stable external-ID mappings, SDK isolation behind an Adapter, sandbox contract and webhook-replay tests, refund/dispute and finance-reconciliation exercises, accessibility review, and a limited live pilot that can roll back to quote-only operation.

## Answer

Commerce is introduced only for an approved **Sellable Offer** with demonstrated operational readiness. The first paid Sales Mode should be a deposit or payment against an accepted Authoritative Quote. A configured kitchen may not be purchased directly from its nonbinding Price Indication. Direct purchase is reserved for a Standardized Product with deterministic SKU, authoritative price, availability, tax, delivery, fulfillment, refund, and returns behavior.

Before adding a commerce provider, rotpunkt must identify the merchant-of-record entity and approve the business case, offer, German VAT/invoice treatment, payment methods, deposit and refund terms, fulfillment process, customer support, privacy handling, and accessibility. Named owners must exist for catalog and pricing approval, tax, payment reconciliation, fraud and disputes, refunds, fulfillment, returns, support, and incident response. A provider is not adopted merely because ecommerce may be useful later or because a delivery date arrives.

Product Definition Releases remain authoritative for configurable-kitchen behavior. Kitchen combinations are not exploded into commerce SKUs or variants. After sales review, an immutable Configuration Revision and its accepted Authoritative Quote may enter commerce as a custom commercial line. Only independently purchasable Standardized Products are projected into a provider catalog as SKUs or variants.

`CustomerAccount.id` remains the canonical customer identity. A provider customer or billing profile is created only when needed and linked through an opaque external reference. It never owns Projects, and accounts are never linked or merged solely by matching email. Shopify customer authentication cannot become a prerequisite for accessing the application account or Project history.

The first paid scope is Germany and EUR only, with tax-inclusive customer prices and approved German VAT, invoice, deposit, refund, privacy, payment, support, and accessibility behavior. Each additional country, currency, tax regime, payment mix, fulfillment route, or localized set of commercial terms requires a separate readiness decision.

The strict EU-hosting gate continues to apply to application-owned Customer Account, Project, configuration, and commercial snapshot data. A payment or commerce provider may process the minimum necessary payment data outside the EU only after documented DPA, subprocessor, international-transfer, security, and legal review. The application never stores card data and minimizes personal data sent to the provider.

Financial authority remains with the system that executes the transaction. The payment provider owns payment intent, authorization, capture, refund, chargeback, and payout facts. A future commerce platform may own authoritative Order totals, tax, fulfillment, and returns. The application records the immutable handoff snapshot, opaque provider references, and a reconciled customer-facing status; it does not create a second mutable financial or Order ledger.

Payment against an accepted quote cannot begin from a Quote Request. A designated CRM, ERP, or controlled sales workflow must first issue an Authoritative Quote and record its Configuration Revision, accepted amount, currency, tax context, validity/expiry, terms, and customer acceptance. The payment Adapter then receives that immutable accepted-quote snapshot and an idempotency key.

Provider fit is capability-driven:

- use **Stripe** when the first paid scope is limited to deposits, accepted-quote payments, or a very small Standardized Product assortment whose stock and fulfillment remain elsewhere;
- use **Shopify** when rotpunkt needs a merchant-operated catalog, inventory, discounts, managed checkout, tax, Orders, fulfillment, and returns;
- use **Medusa** only when custom commerce workflows are strategically differentiating and the organization explicitly funds the development and operation of a separate commerce application and its infrastructure.

No browser redirect is evidence of payment success. Verified webhooks plus provider retrieval establish financial state. Webhook ingestion is authenticated, idempotent, durable, tolerant of duplicates and reordering, and mapped to immutable internal handoff records. Missing or delayed facts remain `processing`; reconciliation jobs and documented manual recovery repair drift without mutating Projects or Quote Requests.

Before adoption, the selected provider must prove exportable catalog/customer/order records, stable external identifiers, SDK isolation behind a Commerce Adapter, sandbox contract tests, webhook replay and outage tests, refund and dispute exercises, finance reconciliation, accessibility, data minimization, and operational runbooks. A limited live pilot launches first and must be reversible to the quote-only flow without migrating or damaging Customer Accounts, Projects, or Release Bundles.
