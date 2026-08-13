# Define the transactional email delivery contract

Type: grilling
Status: open
Blocked by: 03, 11, 14
Map: ../map.md

## Question

What delivery, localization, template-versioning, consent, abuse prevention, retry, bounce, observability, EU-processing, and provider-responsibility rules must authentication emails, account-security notices, Quote Request confirmations, and operational messages guarantee?

## Comments

- 2026-08-11: Better Auth is selected as a self-hosted framework. This contract must therefore assign production responsibility for `sendVerificationOTP`, hashed short-lived OTP records, attempt and resend limits, enumeration-safe responses, EU-compatible mail processing, and authentication-mail observability.
- 2026-08-13: Provider research identifies AWS SES `eu-central-1` as the strongest strict-gate candidate and Mailjet as the simpler conditional candidate, but the production provider decision is explicitly deferred. Current development keeps only German versioned OTP templates, database-backed Better Auth resend/attempt limits, a provider-neutral delivery interface, and a development-only capture adapter. This ticket remains open until provider selection, outbox/inbox, bounce/complaint and suppression flow, provisioning/legal gates, remaining locales, and the production delivery matrix are complete.
