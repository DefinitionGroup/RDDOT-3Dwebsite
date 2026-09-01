---
status: accepted
---

# Store photo artifacts in self-hosted EU object storage

rotpunkt Signature will store Source Captures and Generated Photos in a self-hosted, S3-compatible RustFS deployment at `ecomstorage.rotpunkt.ai`, reached over the S3 protocol with path-style addressing. This is the production object storage, not a development placeholder. It satisfies the ADR 0008 requirement that photo artifacts live in application-owned EU object storage and keeps them under the same operational control as the Neon Frankfurt database of ADR 0004.

Self-hosting is chosen over a managed provider because it removes a second processor from the photo path. ADR 0008 already accepts one scoped non-EU exception for the generation provider; adding a managed storage vendor would widen that exposure for no product benefit. The S3 protocol is retained as the interface so the deployment stays replaceable.

## Residency

The bucket's contents are personal data associated with a Customer Account and are subject to the same EU-residency posture as the database. The `us-east-1` region string in configuration is a SigV4 signing-scope literal, not a location: RustFS does not use it to place data, and it must merely match between client and server or signature validation fails. It is therefore not residency evidence and must never be read as such. Residency evidence is the recorded physical location of the servers hosting `ecomstorage.rotpunkt.ai`, which the Release Owner confirms as part of the Production Release Gate. Until that confirmation is on file, this ADR's residency claim is asserted rather than evidenced.

## Access

The bucket is private in its entirety. No object is ever served from a public or unauthenticated URL, and bucket URLs are never a user-facing identity. Every read and write is authorized by the application first and then performed directly against storage through a presigned URL with a short expiry. Uploads are additionally bound to a content type and a byte ceiling, and are single-use.

This preserves the sharing model rather than competing with it. A public object URL would be permanent, unrevocable, unscoped, and leakable through referrers, caches, and link unfurling, which would silently undo the guarantees that Shared Revision Links exist to provide. Presigning keeps the browser fetching bytes directly from storage without surrendering control of who may do so or for how long.

Photo artifacts remain excluded from the Shared Revision View. Extending sharing to Generated Photos would reverse a deliberate decision recorded in CONTEXT.md and ADR 0008, and requires amending both before implementation. If it is later adopted, it reuses the existing Shared Revision Link mechanism — client-generated secret in the URL fragment, SHA-256 hash at rest, 90-day expiry, owner revocation — and does not introduce a second sharing path.

## Deletion and retention

Stored objects are owned by the application, never orphaned, and always reachable from a database row that records their key, so every object has a deletion path.

A Source Capture is deleted once its Photo Job reaches a terminal state and a short grace window has elapsed; it is an input, not a customer artifact. A Generated Photo persists with the Configuration Revision that produced it and is deleted when its owner deletes it individually, when its Project is deleted after the Trash retention period, or when the Customer Account is deleted. Account deletion cascades into storage; a photo surviving account deletion is a data-protection failure, not untidiness.

Because object deletion cannot participate in the database transaction, deletion is recorded as intent in the database and carried out through the existing outbox, with a reconciliation sweep for objects whose deletion was recorded but not confirmed. Deletion is idempotent and treats a missing object as success.

## Consequences

The team owns availability, capacity, patching, encryption at rest, credential rotation, backup, and restore drills for this deployment, and the Production Release Gate covers them as it does the database. Loss of the bucket loses Generated Photos permanently unless a backup path exists, so a restore drill is required before the gate passes.

Credentials are server-only and never reach the client bundle. Non-production and production use separate credentials and separate buckets. Runtime uses a least-privilege key limited to the object operations the application performs; administrative keys are not used at runtime.

Storage access is confined to a server-only Adapter behind a purpose-built Interface, in the same style as the Postgres Adapters of ADR 0004. Application Modules never receive S3 client types, bucket names, endpoints, or provider URLs. Object keys are opaque to the client and are never derived from customer-supplied input.
