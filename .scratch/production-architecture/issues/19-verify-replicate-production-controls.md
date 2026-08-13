# Verify Replicate production controls

Type: task
Status: open
Blocked by: 12
Map: ../map.md

## Question

Has Replicate passed every legal, privacy, security, model, operational, and rollback gate required by the approved scoped non-EU processing exception before production customer inputs are enabled?

## Comments

- 2026-08-13: Replicate was explicitly selected as the initial production Photo Generation Adapter despite public evidence not establishing EU-member-state-only processing. This ticket must verify the exception rather than repeat the provider selection.
- 2026-08-13: Required evidence includes an executed DPA and transfer mechanism; current subprocessor, support-access, log, backup, retention, deletion, and breach terms; approved lawful basis and customer disclosure; exact model/version and license; pricing and budget controls; signed-webhook and reconciliation tests; cancellation races; moderation; output ingestion; deletion; and tested disable-new-generation rollback. Failure keeps generation disabled while the rest of the First Production Release may proceed.
