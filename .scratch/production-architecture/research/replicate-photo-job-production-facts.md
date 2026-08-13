# Replicate production facts for the AI Photo Job contract

Research date: 2026-08-13  
Scope: Replicate's public prediction API, webhooks, file handling, model/version behavior, billing, rate limits, safety controls, and published legal/data-location material.  
Source policy: official Replicate documentation and legal pages only.

## Answer first

**Replicate is not compatible with a literal EU-member-state-only processing rule on the published evidence.** Replicate's official subprocessor list places AWS, CoreWeave, Fly.io, GCP, Cloudflare, its Postgres provider, and the other listed subprocessors in the United States. The public enterprise page advertises support for data processing agreements, but neither that page nor the public documentation reviewed here offers an EU processing region or an EU-only residency guarantee. A DPA may govern transfers; it does not by itself turn US processing into EU-only processing. ([subprocessors](https://replicate.com/docs/topics/site-policy/subprocessors), [enterprise](https://replicate.com/enterprise), [privacy policy](https://replicate.com/privacy))

If the project's hard gate remains “no processing outside an EU member state,” Replicate must be rejected for customer kitchen photos. If legal approves a scoped non-EU processor exception, use Replicate as a short-lived execution provider: keep the authoritative Photo Job and assets in application-owned EU storage, pin or record the exact model version, accept only signed idempotent callbacks, reconcile by polling, and copy successful output before Replicate's one-hour expiry.

The public facts below are current as of the research date and are operational evidence, not a legal opinion. Pricing, limits, subprocessors, policies, and model behavior are change-sensitive and must be rechecked before procurement and launch.

## Verified facts and contract implications

### 1. Asynchronous lifecycle and statuses

**Facts**

- Asynchronous mode is the API default. Creation returns immediately with a prediction ID and an incomplete prediction object. Applications can monitor with polling, webhooks, or server-sent events. ([create a prediction](https://replicate.com/docs/topics/predictions/create-a-prediction/), [webhooks overview](https://replicate.com/docs/topics/webhooks/))
- The current lifecycle page lists `starting`, `processing`, `succeeded`, `failed`, `canceled`, and `aborted`. `aborted` means a deadline elapsed before execution began; `canceled` includes user cancellation and deadline expiry after execution began. ([prediction lifecycle](https://replicate.com/docs/topics/predictions/lifecycle/))
- Replicate documents a 30-minute running timeout and says customers needing longer must contact it. A caller can also send `Cancel-After`; the creation guide documents values from 5 seconds to 24 hours. The public docs do not clearly explain how a caller-supplied deadline over 30 minutes interacts with the default 30-minute timeout. ([prediction lifecycle](https://replicate.com/docs/topics/predictions/lifecycle/), [create a prediction](https://replicate.com/docs/topics/predictions/create-a-prediction/))
- A finished prediction includes timestamps, `error` on failure, and metrics including `predict_time` and `total_time`. `predict_time` excludes time spent waiting to start. ([HTTP API](https://replicate.com/docs/reference/http/))

**Inference for ticket 12**

Use an application-owned state machine rather than exposing provider states directly. At minimum distinguish `queued`, `submitted`, `running`, `succeeded`, `failed`, `cancel_requested`, `canceled`, and `expired/aborted`. Store the Replicate prediction ID immediately. Treat local submission uncertainty separately so a retry cannot create an untracked second paid prediction.

There is a documentation mismatch to design around: the lifecycle page includes `aborted`, while the webhook documentation defines `completed` only as `succeeded`, `canceled`, or `failed`. Do not assume an `aborted` webhook will arrive; schedule API reconciliation for every nonterminal local job.

### 2. Webhook authenticity, retries, ordering, and idempotency

**Facts**

- Replicate signs every webhook with a user- or organization-specific secret. Deliveries include `webhook-id`, `webhook-timestamp`, and `webhook-signature`. Verification uses the raw body plus ID and timestamp, HMAC-SHA256, a constant-time comparison, and a caller-chosen timestamp tolerance to resist replay. The signing key is retrievable from `GET /v1/webhooks/default/secret` and Replicate recommends caching it. ([verify webhooks](https://replicate.com/docs/topics/webhooks/verify-webhook/))
- A receiver should return 2xx within a few seconds. For terminal `succeeded`, `failed`, or `canceled` callbacks, network failures and 4xx/5xx responses are retried several times with exponential backoff; the final retry is about one minute after completion. Intermediate callbacks are not retried. ([receive webhooks](https://replicate.com/docs/topics/webhooks/receive-webhook/))
- Duplicate and out-of-order deliveries can occur. Replicate explicitly requires idempotent handlers and recommends rejecting regressions after a terminal event. A retried delivery keeps the same `webhook-id`. ([receive webhooks](https://replicate.com/docs/topics/webhooks/receive-webhook/), [verify webhooks](https://replicate.com/docs/topics/webhooks/verify-webhook/))

**Inference for ticket 12**

Request only `completed` events for this workflow. Verify the raw body before JSON parsing; enforce a short timestamp tolerance; persist `webhook-id` in a unique inbox; lock/update by provider prediction ID; allow only monotonic transitions; acknowledge quickly; and move file copying and downstream notifications to an internal outbox/worker. Polling is required both for the undocumented `aborted` callback case and for terminal delivery failure after Replicate's short retry window.

### 3. Cancellation and billing consequences

**Facts**

- `POST /v1/predictions/{prediction_id}/cancel` cancels a prediction “currently running.” The public reference does not document a provider idempotency key, the response/race semantics for an already-terminal prediction, or a guarantee that a cancel request prevents a nearly completed output. ([HTTP API](https://replicate.com/docs/reference/http/))
- Deadline expiry before start produces `aborted` and is not charged; expiry after start produces `canceled` and is charged for compute already used. ([prediction lifecycle](https://replicate.com/docs/topics/predictions/lifecycle/))
- Replicate's billing page says failed public-model runs are generally not charged, canceled official-model runs may still be charged, time-priced models are charged until cancellation, and private models/deployments bill active instance time for failed and canceled runs. It separately says a model that invokes downstream models can incur downstream and root-model costs even if the root run fails. Do not encode “failed equals free” as a universal accounting rule. ([billing](https://replicate.com/docs/topics/billing))

**Inference for ticket 12**

Record `cancel_requested_at` independently from provider `canceled_at`. Cancellation is best effort and race-prone. A user cancel must stop local publication/notification even if a late success arrives, while the immutable provider event and any incurred cost remain auditable. Do not automatically retry a failed or canceled prediction without a new application attempt record, quota check, and idempotency decision.

### 4. Input/output URLs, retention, and deletion

**Facts**

- For API predictions, Replicate automatically removes input parameters, output values, output files, and logs after one hour by default. The prediction record can remain, with `data_removed: true` and `output: null`. API clients must persist needed files before deletion. Predictions made in the web UI are kept indefinitely. ([data retention](https://replicate.com/docs/topics/predictions/data-retention/), [HTTP API](https://replicate.com/docs/reference/http/))
- Output file URLs use `replicate.delivery` or a subdomain and expire after one hour. Current client libraries expose `FileOutput` streams and URLs. ([output files](https://replicate.com/docs/topics/predictions/output-files))
- Replicate accepts input files as a hosted URL, a local `Blob`/`File`/`Buffer` uploaded by the client library (up to 100 MB), or a data URI. The input-files guide recommends a data URI only below 1 MB, while the HTTP reference uses a stricter 256 KB boundary and says Replicate will not store a data-URL file. The docs do not explain the separate lifecycle of SDK-uploaded temporary files beyond the general one-hour API-input cleanup. ([input files](https://replicate.com/docs/topics/predictions/input-files/), [HTTP API](https://replicate.com/docs/reference/http/))
- A prediction can be deleted manually in Replicate's web dashboard, including associated output data/files. The public HTTP API documents prediction create/get/list/cancel but no prediction-delete endpoint. Model-version deletion is a different operation with ownership restrictions and must not be treated as per-job deletion. ([data retention](https://replicate.com/docs/topics/predictions/data-retention/), [HTTP API](https://replicate.com/docs/reference/http/))
- Replicate's privacy policy separately allows longer retention of personal information where necessary for the service, legal obligations, abuse prevention, or claims, and notes limited-period backup copies. The one-hour prediction cleanup therefore must not be represented as a contractual guarantee that every provider-side personal-data trace is erased within exactly one hour. ([privacy policy](https://replicate.com/privacy))

**Inference for ticket 12**

Use a short-lived signed URL from application-owned EU object storage for normal kitchen-photo inputs, expiring shortly after the maximum job window. The selected input mechanism does not change Replicate's non-EU processing location; data URLs are unsuitable for normal photo sizes despite the reference saying the embedded file is not stored. Copy successful output into EU object storage before marking the application job durable/succeeded, verify content type/size, hash it, and never store Replicate delivery URLs as the customer-facing asset reference. On Project deletion, delete the application's input/output objects under the local retention contract; Replicate API copies will age out under its documented default because there is no public per-prediction delete API.

### 5. Data processing, DPA, and EU-only placement

**Facts**

- Replicate's official subprocessor table labels all listed locations “United States,” including its cloud infrastructure/data-hosting providers AWS, CoreWeave, Fly.io, and GCP, plus Cloudflare, database, telemetry, invoicing, and support services. ([subprocessors](https://replicate.com/docs/topics/site-policy/subprocessors))
- The subprocessor page does not define whether its `Location` column means corporate location, processing location, or data-center location, and it does not map prediction inputs, outputs, logs, or backups to particular subprocessors. It therefore cannot establish a finer-grained data-flow or residency claim. ([subprocessors](https://replicate.com/docs/topics/site-policy/subprocessors))
- Replicate's privacy policy says it acts as a processor/service provider for customer personal information and describes vendor disclosure, security, retention, and data-subject requests. ([privacy policy](https://replicate.com/privacy))
- The enterprise page advertises compliance support through data processing agreements. No public page found in this review supplies a selectable EU inference/storage region, an EU-only processing commitment, or the operative DPA text. ([enterprise](https://replicate.com/enterprise))
- The terms place responsibility on the customer for submitted data, required notices/rights/consents, lawful inputs, authorized-user behavior, model licenses/third-party terms, and generated content. They also permit Replicate to use aggregated/de-identified “Resultant Data” for service and product purposes under the privacy policy. ([terms of service](https://replicate.com/terms))

**Inference for ticket 12**

Replicate fails the current hard EU-member-state processing gate on public evidence. Do not send customer photos, prompts containing personal information, or identifiable room imagery until legal/procurement has either approved a documented non-EU transfer exception and signed DPA or selected a different provider with an explicit EU-only deployment contract. A DPA and short file retention reduce risk but do not establish EU-only processing.

### 6. Model/version pinning and reproducibility

**Facts**

- Community/custom model predictions can name an exact 64-character version ID. Replicate says versions exist so model changes do not disrupt older versions and calls versioning essential for reproducibility. Prediction records return the version actually used. ([model versions](https://replicate.com/docs/topics/models/versions), [HTTP API](https://replicate.com/docs/reference/http/))
- A deployment is created against an exact model version and exposes a stable endpoint; releases record their version and deployments support controlled updates/rollbacks. ([HTTP API](https://replicate.com/docs/reference/http/), [deployments](https://replicate.com/docs/topics/deployments/))
- Official models use the versionless `/models/{owner}/{name}/predictions` endpoint. Replicate promises a stable input/output API and says official models are kept up to date with the latest model version; that is not a promise of byte-identical or behavior-identical output over time. ([official models](https://replicate.com/docs/topics/models/official-models))
- A community model owner can make a public model private, immediately removing other users' access. Replicate recommends deployments when a community model needs production control. ([private and public models](https://replicate.com/docs/topics/models/private-models/), [community models](https://replicate.com/docs/topics/models/community-models/))

**Inference for ticket 12**

For every attempt, persist provider, endpoint kind, owner/name, exact returned version ID, deployment release if used, normalized input, prompt/template version, Product Definition/Configuration Revision IDs, safety-policy version, and output hashes. If repeatability is mandatory, use an exact-version community/private model or pinned deployment after license review; a versionless official-model call only provides API-shape stability.

### 7. Pricing and cost evidence

**Facts**

- Official models use predictable unit pricing such as output images, video seconds, or tokens. Other public models are generally priced by hardware/run time; private models and deployments also bill setup/idle/active instance time according to their configuration. Current price is displayed on each model's pricing section and is model-specific. ([official models](https://replicate.com/docs/topics/models/official-models), [billing](https://replicate.com/docs/topics/billing))
- Prediction API examples expose timing metrics but the published prediction object/reference does not document a currency-denominated `cost` field. Replicate's dashboard/invoice surfaces provide usage/cost reporting, but that is not the same as a per-prediction cost value in the completion webhook. ([HTTP API](https://replicate.com/docs/reference/http/), [billing](https://replicate.com/docs/topics/billing))

**Inference for ticket 12**

Store `predict_time`, `total_time`, unit counts when a chosen model returns them, model/version, and the pricing basis/snapshot used for the preflight estimate. Keep `estimated_cost` distinct from `billed_cost`; reconcile actual spend from Replicate billing/invoice evidence. Quotas should reserve estimated cost before submission and settle the reservation after terminal reconciliation rather than trusting status alone.

### 8. Rate limits and capacity

**Facts**

- Default API request limits are 600 prediction creations per minute and 3,000 requests per minute for other endpoints. Replicate returns HTTP 429 when throttled and offers higher limits by request. Limits can become stricter as credit runs low; accounts using granted credit without a payment method can be limited to one request per second and six per minute. ([rate limits](https://replicate.com/docs/topics/predictions/rate-limits))
- These request limits are not a completion-throughput guarantee. Public/community models use shared queues and can experience cold boots or scaling limits. Deployments provide dedicated queues and configurable min/max instances; their dashboard exposes queue depth and throughput. ([billing](https://replicate.com/docs/topics/billing), [monitor a deployment](https://replicate.com/docs/topics/deployments/monitor-a-deployment))

**Inference for ticket 12**

Enforce much lower application quotas per Customer Account and Project, bound concurrent submissions, retry 429/5xx with capped jitter only when a provider prediction ID is known not to exist, and use a reconciliation worker for uncertain submissions. Provider RPM must never be treated as the customer quota or capacity promise.

### 9. Safety, moderation, consent, and responsibility

**Facts**

- Replicate enables a safety checker for web predictions on SDXL/Flux base models and derivative fine-tunes, but the checker can be disabled for API use. Replicate presents that flexibility so API customers can use their own checker or third-party safety service. This is model/family-specific, not a platform-wide moderation guarantee. ([safety checking](https://replicate.com/docs/topics/predictions/safety-checking/))
- The Acceptable Use Policy prohibits illegal, abusive, harmful, and security-compromising use. The terms make the customer responsible for lawful inputs/outputs, user conduct, disclosures, rights, consents, permissions, applicable model licenses, and third-party terms. They also state that Replicate does not undertake to monitor or police Customer Data or third-party-model outputs and require customers to delete/quarantine inappropriate output and prevent its dissemination. ([Acceptable Use Policy](https://replicate.com/acceptable-use-policy), [terms of service](https://replicate.com/terms))

**Inference for ticket 12**

The application must own consent and rights confirmation for uploaded room photos, reject unsupported personal/biometric/sensitive content, run input and output moderation appropriate to the selected model, preserve moderation decision codes without retaining prohibited imagery longer than necessary, and provide an abuse/reporting path. Provider safety settings are defense in depth, not the Product's policy enforcement.

## Unresolved procurement questions

The public documentation is insufficient to close these production questions. Obtain written answers before any exception-based adoption:

1. Can Replicate contractually restrict inference, storage, logs, backups, telemetry, support access, and subprocessors to named EU member-state regions for this workload?
2. Obtain and review the operative DPA, transfer mechanism, security annex, deletion/backup terms, subprocessor-notice process, breach notification terms, and audit evidence.
3. Does `webhook_events_filter: ["completed"]` deliver `aborted` predictions, despite `aborted` being absent from the webhook page's terminal-status list?
4. What are the exact cancellation race/response semantics and provider idempotency guarantees for prediction creation?
5. Is an exact per-prediction billed-cost export or API available for the chosen commercial plan/model, and how are official-model cancellations and downstream model calls itemized?
6. Confirm the selected model's license, API safety behavior, version retention/access policy, price unit, throughput, maximum input size, and content restrictions immediately before release.

## Date sensitivity

The Terms and Privacy Policy state that they were last updated on 2026-04-01. The operational documentation and subprocessor page show no visible effective date. Re-verify them immediately before procurement and launch; obtain the executed DPA, current subprocessor schedule, deletion SLA, backup-retention window, regional architecture, chosen-model version/access policy, and live pricing in writing.

## Primary sources

- [Prediction lifecycle](https://replicate.com/docs/topics/predictions/lifecycle/)
- [Create a prediction](https://replicate.com/docs/topics/predictions/create-a-prediction/)
- [HTTP API](https://replicate.com/docs/reference/http/)
- [Receive webhooks](https://replicate.com/docs/topics/webhooks/receive-webhook/)
- [Verify webhooks](https://replicate.com/docs/topics/webhooks/verify-webhook/)
- [Data retention](https://replicate.com/docs/topics/predictions/data-retention/)
- [Input files](https://replicate.com/docs/topics/predictions/input-files/)
- [Output files](https://replicate.com/docs/topics/predictions/output-files)
- [Model versions](https://replicate.com/docs/topics/models/versions)
- [Official models](https://replicate.com/docs/topics/models/official-models)
- [Community models](https://replicate.com/docs/topics/models/community-models/)
- [Private and public models](https://replicate.com/docs/topics/models/private-models/)
- [Deployments](https://replicate.com/docs/topics/deployments/)
- [Monitor a deployment](https://replicate.com/docs/topics/deployments/monitor-a-deployment)
- [Billing](https://replicate.com/docs/topics/billing)
- [Rate limits](https://replicate.com/docs/topics/predictions/rate-limits)
- [Safety checking](https://replicate.com/docs/topics/predictions/safety-checking/)
- [Subprocessors](https://replicate.com/docs/topics/site-policy/subprocessors)
- [Enterprise](https://replicate.com/enterprise)
- [Privacy policy](https://replicate.com/privacy)
- [Terms of service](https://replicate.com/terms)
- [Acceptable Use Policy](https://replicate.com/acceptable-use-policy)
