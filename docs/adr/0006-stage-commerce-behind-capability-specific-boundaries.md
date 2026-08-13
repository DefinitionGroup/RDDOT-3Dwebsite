---
status: accepted
---

# Stage commerce behind capability-specific boundaries

rotpunkt Signature will not install or abstract a commerce platform in the First Production Release. That release ends at application-owned Quote Requests. Its fake checkout route will become a German-first request flow, and no cart, payment, Order, provider SDK, commerce-customer synchronization, `NoCommerceGateway`, or universal `CommerceGateway` will be introduced.

The first paid extension, when its commercial and operational gates pass, will use Stripe only for a deposit or payment against an accepted Authoritative Quote. Payment starts from an immutable Payment Handoff Snapshot, and the application durably creates an idempotent Payment Attempt plus transactional outbox message before invoking a server-only Stripe Adapter through the narrow `AcceptedQuotePayment` Module Interface.

## Consequences

A controlled CRM, ERP, commerce system, or audited internal sales workflow must issue and track Authoritative Quotes before payment can launch. Live Project, configuration, or pricing state cannot reprice an accepted payment handoff. Provider types remain inside the Adapter, and provider-issued identifiers remain opaque.

Verified webhooks use a separate ingress and idempotent inbox. Provider retrieval and scheduled reconciliation establish Payment Status and repair missing, duplicate, delayed, or out-of-order events. A browser redirect never proves success. The payment provider remains financially authoritative; the application stores only the handoff, operational linkage, safe references, and reconciled status needed for customer experience and support.

Disabling payment stops new attempts but leaves webhook ingestion, reconciliation, refunds, disputes, and status display running for existing obligations. Quote Request mode therefore remains the operational fallback without corrupting in-flight payment state.

Direct retail remains a separate future capability. Shopify may back a `RetailCommerce` Module when approved Standardized Products or merchant-operated catalog, cart, inventory, Order, fulfillment, and returns workflows justify it. Medusa requires a separately funded custom-commerce case. Neither module may replace application-owned Customer Accounts, Projects, Configuration Revisions, Product Definition Releases, or historical Release Bundles.
