# Choose the future commerce boundary and adoption timing

Type: grilling
Status: resolved
Blocked by: 07, 08, 09
Map: ../map.md

## Question

Which commerce approach should eventually own catalog, cart, payment, and Order behavior, when should it enter the migration, and what interface lets the First Production Release remain quote-oriented without a later rewrite?

## Comments

- 2026-08-12: Product Definition Releases remain authoritative for configurator behavior. Future commerce may own sellable SKUs, inventory, tax, Authoritative Quotes, Orders, payments, fulfillment, and returns. Integration uses immutable configuration/price handoff snapshots and opaque external references; it may not replace `CustomerAccount.id`, Project ownership, or historical Release Bundles.
- 2026-08-13: The provider choice must follow the approved capability gates: Stripe for narrow deposit/accepted-quote payment, Shopify for merchant-operated retail operations, and Medusa only for funded strategically custom commerce. Adoption requires an accepted-quote or Standardized Product pilot, verified reconciliation, exportability, operational ownership, and rollback to quote-only operation.
- 2026-08-13: Q73-Q78 approved. The First Production Release ends at an application-owned Quote Request and contains no cart, payment, Order, provider SDK, or commerce-customer synchronization. It will not implement a speculative `NoCommerceGateway` or universal commerce interface. The current fake checkout must become a German-first Quote Request experience, with a compatibility redirect that preserves the shared configuration parameter.
- 2026-08-13: The preferred first paid extension is Stripe for payment against an accepted Authoritative Quote, subject to every approved commercial and operational gate. That extension introduces a narrow `AcceptedQuotePayment` Module Interface and separate verified webhook ingress; cart, inventory, SKU, and direct-purchase capabilities stay absent. Payment remains blocked until a controlled CRM, ERP, commerce system, or audited internal sales workflow can issue and track Authoritative Quotes.
- 2026-08-13: Q79-Q85 approved. An Accepted Quote Payment starts from an immutable Payment Handoff Snapshot and a durable local Payment Attempt created with its transactional outbox before the Stripe Adapter is called. Provider returns are `processing` until verified provider retrieval or idempotently consumed webhook events establish a reconciled Payment Status.
- 2026-08-13: A kill switch stops new Payment Attempts but cannot disable webhook ingestion, reconciliation, refunds, disputes, or status display for existing attempts. The account area may show only a read-only reconciled Payment Status and safe reference. A future `RetailCommerce` Module remains separate from `AcceptedQuotePayment`; Shopify enters only for approved Standardized Products or merchant-operated retail, while Medusa requires a separately funded custom-commerce case.

## Answer

Commerce enters in three deliberate stages rather than as infrastructure installed ahead of a business workflow.

The First Production Release is quote-only. It owns Project Revisions, nonbinding Price Indications, and immutable Quote Requests, but has no cart, payment, Order creation, provider SDK, or commerce-customer synchronization. The fake `/checkout` experience becomes a German-first Quote Request flow; a temporary compatibility redirect preserves its shared configuration parameter. The application implements neither a `NoCommerceGateway` nor a universal `CommerceGateway` at this stage because one hypothetical Adapter is not a useful abstraction.

The first paid stage is a controlled Stripe pilot for a deposit or payment against an accepted Authoritative Quote. It cannot begin until a designated CRM, ERP, commerce system, or audited internal sales workflow issues and tracks the Authoritative Quote and all commercial, legal, tax, refund, support, reconciliation, and ownership gates from ticket 08 pass. Payment begins from an immutable Payment Handoff Snapshot containing the exact approved quote revision, Configuration Revision reference, amount, currency, tax context, expiry, payment purpose, Customer Account reference, and provenance; live Project or pricing data cannot silently change it.

The application durably creates an idempotent Payment Attempt and transactional outbox message before invoking a server-only Stripe Adapter through the narrow `AcceptedQuotePayment` Module Interface. Provider types do not escape the Adapter. Verified webhooks enter through a separate authenticated ingress and an idempotent inbox; explicit retrieval and scheduled reconciliation repair missing, delayed, duplicate, or out-of-order events. The provider remains financially authoritative, while the application keeps opaque external references and a read-only reconciled Payment Status rather than a parallel ledger.

Payment rollback means disabling new initiation, not abandoning existing obligations. Webhook processing, reconciliation, refunds, disputes, and customer-visible status continue for every existing Payment Attempt. If initiation is unavailable, the product remains operational in Quote Request mode.

Direct retail is a separate later decision. A future `RetailCommerce` Module may use Shopify to own merchant-operated catalog, inventory, cart, checkout, retail Orders, fulfillment, and returns for approved Standardized Products. It does not replace application-owned Customer Accounts, Projects, Configuration Revisions, or Release Bundles. Medusa remains an alternative only when strategically custom workflows justify funding and operating a second commerce application. The architecture deliberately keeps `AcceptedQuotePayment` and `RetailCommerce` as capability-specific Module Interfaces rather than forcing them behind one provider-neutral commerce facade.
