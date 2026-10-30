# Give Dealers grant-checked access to customer-owned Projects

- Status: accepted
- Date: 2026-10-30
- Deciders: Martin (product), Claude (implementation)
- Related: ADR 0001 (customer identity), ADR 0002 (Better Auth), ADR 0003 (revisions and share links), ADR 0012 (Quote Requests), CONTEXT.md "Dealer Grant"

## Context

A kitchen is rarely planned alone: rotpunkt sells through dealers, and a customer
who has saved a Project wants their dealer to look at it and change it with them.
Until now a Project had exactly one key, `project.owner_id`, compared with the
caller's Customer Account in every Postgres adapter. The only way to show a Project
to someone else was a Shared Revision Link: anonymous, read-only and fixed to one
revision. The vocabulary even warned against "shared project" and "collaboration
link", because nothing of the kind existed.

Martin decided the product shape on 2026-10-30:

- rotpunkt keeps a directory of dealers with their addresses; the customer picks one,
  nearest first from the postcode in their profile, on a map;
- rotpunkt provisions the dealers' users, who sign in with the same six-digit email
  code as customers; there is no self-registration;
- a Project is shared with a dealer, so every active user of that dealer can open it,
  and with one dealer at a time;
- the dealer can view and edit the Working Configuration, save and restore versions,
  create share links and submit Quote Requests;
- a dealer's Quote Request carries the dealer's own contact and consent;
- the dealer sees the customer's name, email address and phone number;
- the customer sees nothing of the dealer's work beyond which dealer has access and
  since when, and can end the access at any time.

The constraint that shapes everything else: ownership stays with the customer, and a
dealer never acts through the customer's identity.

## Decision

1. **A Dealer User is a separate identity.** `app.dealer` and `app.dealer_user` are
   application-owned records that rotpunkt provisions. A Better Auth identity resolves
   to either a Customer Account or a Dealer User, never both: the Identity Adapter
   looks for a Dealer User first, through `app.dealer_user_identity` or, on the first
   sign-in, by the verified email it was provisioned with. A disabled Dealer User or
   an inactive Dealer resolves to nobody; it does not fall through to a new Customer
   Account. Session code keeps a typed principal (`CustomerSession` or
   `DealerSession`), so a route that asks for a customer gets nothing for a dealer.

2. **Ownership never moves.** `project.owner_id` stays the customer's. A dealer cannot
   list, create, rename, archive, trash, delete or duplicate Projects, start Photo
   Jobs, or read the customer's profile, gallery or other Projects.

3. **Access is one explicit Dealer Grant.** `app.project_dealer_grant` holds at most
   one open grant per Project (a partial unique index on `project_id` where
   `revoked_at` is null). The owner grants it, switches it to another dealer (the old
   grant is revoked in the same transaction) and revokes it. Entering Trash revokes it
   for good, like the Project's share links; restoring does not bring it back. An
   archived Project stays listed for the dealer but cannot be opened.

4. **The check happens in the database, inside the operation.** The Project, Sharing
   and Quote Request modules take a `ProjectActor` —
   `{ kind: "owner", customerAccountId }` or `{ kind: "dealer", dealerUserId }` — for
   the operations a dealer may perform. A read evaluates the grant predicate (open
   grant for the Project, active Dealer, active Dealer User) in the same statement as
   the read. A write first locks the open grant row `FOR SHARE` in its transaction: a
   revocation that commits first makes the write find no grant, and one that comes
   second waits until the write has committed. No route constructs an owner actor for
   a dealer and there is no "act as owner" path.

5. **Dealer rights are narrow.** Dealers list and revoke only the share links their
   own dealer created, and see only the Quote Requests their dealer submitted. A
   dealer's requests count against the Dealer User's daily limit, not the customer's.

6. **The customer's contact travels as a copy.** Granting stores the customer's name,
   email and phone on the grant, taken on the server from the session and the
   profile, never from the request body — the same pattern as a Quote Request's
   contact. The share dialog states exactly what the dealer will see; revoking hides
   it again because a dealer reads only open grants.

7. **Only what leaves the Project is attributed.** A share link records
   `created_by_dealer_user_id`, a Quote Request `submitted_by_dealer_user_id`.
   Autosaves and versions record nobody: the customer sees no dealer activity
   (Martin, 2026-10-30), and recording it would only serve a log nobody reads.

8. **The directory is located without third parties.** Dealers carry coordinates. The
   customer's position comes from their profile postcode through a bundled postcode
   table (GeoNames, CC BY 4.0). The map draws OpenStreetMap vector tiles from a
   PMTiles archive the application serves itself, so the visitor's browser talks to
   no map provider.

## Consequences

- Every adapter that a dealer reaches carries a second branch of its access
  predicate. The predicate and the grant lock live in one helper
  (`lib/server/db/project-access-postgres.ts`); contract tests cover grant, revoke,
  dealer reads and writes, and refusal of strangers for each operation.
- Dealer Users are disabled, never deleted, because share links and Quote Requests
  refer to them.
- A provisioned dealer email that already belongs to a Customer Account signs in as
  the Dealer User from then on; that Customer Account stays untouched but unreachable
  until the Dealer User is disabled. Provisioning is rotpunkt's job and should avoid
  customer addresses.
- Sharing customer contact data with a dealer is a disclosure to another controller.
  The dialog's wording and the legal basis need review before launch, alongside the
  Datenschutz page.
- Nobody is notified when a Project is shared or changed; the dealer sees new grants at
  the next sign-in. Notification waits on the email provider (ADR 0010).
- The tile archive is a deployable artifact: production needs the file in EU object
  storage and the server variable pointing at it. Without it the map shows a calm
  fallback and the list still works.
- Customer and dealer edit the same Working Configuration under the existing
  optimistic concurrency; the second writer sees the conflict and reloads. Real-time
  co-editing is out of scope.
