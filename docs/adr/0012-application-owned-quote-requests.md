# Keep Quote Requests application-owned and pinned to revisions

- Status: accepted
- Date: 2026-09-02
- Deciders: Martin (product), Claude (implementation)
- Related: ADR 0003 (revisions), ADR 0006 (commerce boundaries), ADR 0010 (email provider), CONTEXT.md "Quote Request"

## Context

The First Production Release ends at an application-owned Quote Request (ADR
0006). Until now the only commercial endpoint was a prototype "Fake Checkout":
a cart icon in the marketing header, a route reachable without a Project, a
form with placeholder-only fields, and a primary button with no handler. The
design critique of 2026-09-02 rated it the single P0: a submit-looking
affordance that does nothing, at the point where the customer journey ends.

The domain language already defined the replacement. A Quote Request is "a
person's immutable, idempotently submitted request for commercial review of one
Configuration Revision, including the contact, consent, note, selected photo,
and nonbinding price context captured at submission" (CONTEXT.md), and ADR 0003
requires actions that submit to checkpoint the expected Working Configuration
version and durably create their record before anything else happens.

Two constraints shaped the first slice. The transactional email provider is
deferred and fails closed in production (ADR 0010), so the business cannot be
notified by email yet. And no CRM, ERP or commerce system exists to hand the
request to (ADR 0006), so the application is the system of record.

## Decision

1. **A Quote Request Module behind the same seams as Projects and Photo Jobs.**
   Interface in `features/quote-requests/`, Postgres implementation in
   `lib/server/db/`, composition root in `lib/server/quote-requests/`. Product
   knowledge (display snapshot, Price Indication) is injected by the
   composition root; the Postgres module knows nothing about kitchens.

2. **Submission is one transaction with the checkpoint.** The Working
   Configuration row is locked, the expected version checked, a
   `trigger = 'quote'` Configuration Revision created or reused, and the request
   inserted against it — exactly the Photo Job pattern. A request can never
   reference a configuration that was not durably pinned first.

3. **The record captures what was agreed.** Contact (name, email, optional
   phone), note, the consent wording version and time, and the Price Indication
   computed server-side from the pinned configuration under its Product
   Definition version. The client's price never reaches the record. An
   unsupported Product Definition version writes nothing.

4. **Idempotent and bounded.** Replay on the creation idempotency key; the same
   key with different data is refused; ten requests per account and day.

5. **A durable notification intent, no notification yet.** Every submission
   writes a `quote-request.submitted` outbox message. When the email provider
   is chosen (ADR 0010), a consumer drains it; nothing submitted in between is
   lost. Until then the request is visible in the account and in the database.

6. **A readable reference.** `A-` plus eight symbols without 0/O or 1/I, unique,
   shown on the confirmation and in the account history.

7. **The customer surface is a document, not a cart.** `/anfrage` requires a
   signed-in person and an active Project; a guest is asked to save first. The
   form has real labels, native constraints, explicit consent and one live
   region for outcomes. Version drift is reported as such with a reload path.
   The account lists the person's requests newest first. The cart indicator,
   the `/checkout` route and the word "Checkout" are gone; the old path
   redirects to `/anfrage`.

## Consequences

- Trashing or deleting a Project cascades to its Quote Requests, consistent
  with Photo Jobs and with account-deletion obligations. Retaining requests
  for commercial reasons beyond the customer's data is a future decision that
  must be taken with the CRM/ERP handoff, not here.
- The "selected photo" named in CONTEXT.md is not yet captured; adding a
  nullable reference later is a small migration.
- The business is not notified until a provider lands. The outbox makes this a
  gap in delivery, not in the record.
- `state` accepts `in-review`, `answered` and `withdrawn` so a review workflow
  can arrive without a migration; only `submitted` is written today.
