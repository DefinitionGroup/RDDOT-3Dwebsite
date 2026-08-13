---
status: accepted
---

# Keep Photo Jobs application-owned with a scoped Replicate exception

rotpunkt Signature will replace its synchronous, browser-memory-only Replicate prototype with a durable application-owned Photo Job Module. A Photo Job is created against an immutable Configuration Revision before external work begins, survives browser closure, and becomes successful only after validated output is safely stored as an application-owned Generated Photo in EU object storage.

Replicate is the initial production Photo Generation Adapter by explicit exception to the otherwise strict EU-member-state-only processing rule. Its published subprocessor list identifies United States locations and no public material establishes an EU-only inference and storage commitment. This decision accepts a scoped international-processing risk; it does not redefine Replicate as EU-hosted or weaken the residency rule for Customer Accounts, Projects, application storage, or other providers.

## Consequences

Only the Project owner may request or access a Photo Job. The request atomically checkpoints the expected Working Configuration version, creates or reuses its Configuration Revision, and persists internal work before a provider call. Product facts come from its pinned Release Bundle; customers select curated Scene Presets rather than submitting free-form prompts.

The Photo Job Module has a small Interface for request, status retrieval, Project photo listing, and cancellation. A provider Adapter handles submission, execution-fact retrieval, and best-effort cancellation; a separate ingress Adapter verifies webhooks. Provider types, states, identifiers, error shapes, and delivery URLs remain internal. Idempotent inbox/outbox processing plus scheduled reconciliation handles missing, duplicated, delayed, out-of-order, and uncertain provider events.

Browser Source Captures are untrusted inputs uploaded through single-use URLs to EU object storage. The application validates inputs and outputs, applies safety and configuration-integrity checks, and persists output before reporting success. Provider URLs are temporary transport only. A deterministic renderer may later replace browser capture behind the same Module Interface.

Every production execution uses approved immutable Prompt Template and Model Releases. Each provider attempt preserves operational, provenance, and cost evidence while distinguishing estimates from reconciled billing. Automatic retry is limited to classified transient failures; cancellation and uncertain submission are reconciled rather than assumed.

Generated Photos remain illustrative and may not establish product or commercial truth. Customer quotas and provider-wide budgets are independently enforced. Source Captures and Generated Photos follow explicit retention and deletion rules, and staff access is exceptional, time-limited, purpose-bound, and audited.

Replicate production activation requires an executed and approved DPA and transfer mechanism, current subprocessor and retention review, approved customer disclosure and lawful basis, exact model/license approval, least-data configuration, and verified webhook, reconciliation, cancellation, moderation, cost, deletion, and kill-switch controls. A failed or later-withdrawn exception disables new generation while existing Photo Jobs continue through reconciliation and deletion workflows. Application-owned EU storage and the Photo Generation Interface preserve the provider exit path.
