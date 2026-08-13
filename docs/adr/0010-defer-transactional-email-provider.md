---
status: accepted
---

# Defer the transactional email provider selection

rotpunkt Signature will defer the production transactional email provider selection until production authentication delivery is being provisioned. Neon remains the Postgres platform and Better Auth remains the application-controlled authentication framework; neither choice requires a particular mail provider.

The application owns versioned localized templates and exposes a provider-neutral delivery Interface. Development uses an explicit local capture adapter. Production fails closed while no approved provider is configured.

AWS SES Frankfurt is the strongest currently researched candidate for the strict EU-processing gate, while Mailjet is the simpler operational candidate subject to written processing-location confirmation. Neither is an activated dependency or an approved production provider.

## Consequences

No production email SDK or provider credential is required during current development. The local capture adapter is rejected when `NODE_ENV=production` and must never become a delivery fallback.

German code-owned subject, HTML, and plain-text templates ship first. English and Spanish variants are added as reviewed versions before those locales can send authentication mail. Provider-side templates cannot become an editable source of production truth.

Before production activation, the provider decision must be reopened against current contracts, subprocessors, EU-processing evidence, operational ownership, domain configuration, bounce and complaint ingestion, suppression handling, retry and idempotency behavior, deliverability, and exit requirements. Leaving `TRANSACTIONAL_EMAIL_PROVIDER` unset continues to fail closed.
