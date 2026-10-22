# Account management

Status: accepted 2026-10-23 — Slice A in M2, Slice B after launch; A1 and A2 in progress
Created: 2026-10-23

Turn `/konto` from a sign-in screen with lists beside a photo into the customer's own
workspace: who they are, their projects with real actions, their requests, what they have
shared, and control over their data. Two slices: what a German launch with real customer
accounts needs (M2), and what makes the account pleasant afterwards (Later).

## What exists today

- Sign-in by a six-digit email code; no password by design (ADR 0002). Better Auth's
  `auth."user"` has `name` and `image` columns nothing writes or shows.
- `app.customer_account` holds `id`, `status` (`active` or `pending-deletion`) and dates —
  no profile. The status already anticipates deletion; nothing sets it.
- `/konto` signed in (`features/customer-accounts/ui/account-workspace.tsx`): "Mein
  Bereich", Abmelden, Projects (name, last change, Öffnen), Requests (first ten, rows are
  not links), Visualisierungen (gallery), session expiry line.
- Projects carry `lifecycle: active | archived | trashed` in the schema and the API
  respects it, but nothing archives, trashes or restores (STATUS, Deferred Decisions:
  the storage deletion sweep waits for exactly this).
- Rename lives in the configurator. Share links are created, listed and revoked per Project
  in the configurator's "Versionen & Freigaben"; the account shows none.
- A Quote Request stores its own contact (name, email, phone); the form starts empty.
- There are no Orders: the First Production Release ends at Quote Requests (CONTEXT.md,
  ADR 0006). "Ordering" in the account means the requests until commerce exists.

## Design review of `/konto` (2026-10-23, 1440 px and 500 px)

- The signed-in page keeps the sign-in layout: a decorative photo takes 54 % of the width
  and the workspace sits in a 37 rem column on the right, about 460 px wide at 1440 px.
  Most of the screen holds nothing the customer can use.
- The wordmark appears twice (on the photo and in the header); on phones the photo band
  takes the first 280 px before the header.
- Nothing says who is signed in: no email, no name.
- A project is a name and a date. No picture of the kitchen, no finishes or price, no
  actions besides opening it.
- Requests show reference, date, status and price but lead nowhere.
- "Abmelden" sits beside the page title like a primary action.
- What works and stays: the dark system, the serif-word headline, section labels with
  counts, the empty-state copy.

Direction: keep the split photo for the signed-out sign-in, where it sets the mood. Signed
in, use the full width: `AppHeader` across the top, a slim title row with the person's name
or email, then the workspace. Desktop: a left column of sections (Projekte, Anfragen,
Freigaben, Visualisierungen, Profil, Daten & Konto) and the content beside it; projects as
a grid of cards with a picture, finishes, Richtpreis and a menu. Phones: the same sections
as a segmented row under the title, no photo band. One filled red action per view (Neues
Projekt).

## Slice A — needed before real customers (Roadmap M2)

**A1 Account page layout.** The signed-in workspace as described above, desktop and phone.
No new data: projects show finishes and Richtpreis from their working configuration (the
account list loads only names and dates today, so the list query grows); the picture is
the latest Generated Photo when there is one, otherwise the finish swatches.

**A2 Profile basics.** Name, phone and postcode (each optional), stored application-side in a new
`app.customer_profile` (ADR 0001: the Customer Account, not the auth provider, owns it).
Shown on the account; offered on the request form, which also takes the sign-in email
(the open board item "Offer the account's email on the request form" becomes part of this).
A request still copies its contact at submission, so later profile edits do not rewrite
history.

**A3 Projects you can tidy.** Archive, move to trash, restore, delete for good from the
trash; duplicate; rename where the list is. The lifecycle exists; this adds the module
operations, API and UI. A trashed Project's share links stop working on their own (the
sharing boundary already treats them as unavailable). Moves the board's "Project archive,
trash and restore" from Later to here.

**A4 My data.** "Download my data" (Projects, versions, requests, share links and photo
list as one JSON file; photos as links) and "Delete my account" (confirmation by a fresh
code, `status = pending-deletion`, sessions revoked, database cascade). Deletion reaching
object storage needs the deletion sweep scheduled or a signed retention policy — the
Deferred Decision in STATUS; A4 is where it gets decided. Without A4 a launch with
accounts cannot answer an access or erasure request except by hand.

## Slice B — after launch (Later)

**B1 Sharing overview.** Every active share link across Projects, with its version,
expiry and revoke, in one place.

**B2 Request detail.** `/konto/anfragen/<id>`: the pinned configuration, contact, note and
status. Status changes need rotpunkt's side (CRM or the notification consumer), so this
is mostly read-only until then.

**B3 Sign-in and devices.** Change the sign-in email (code to the new address); list
signed-in devices; sign out everywhere (the Identity Adapter already revokes sessions).

**B4 Preferred language** for emails, once English and Spanish launch.

## Not proposed

- **Password.** Sign-in by code is a decision (ADR 0002): no password to leak, reset or
  rotate. If a second factor is ever wanted, passkeys rather than passwords.
- **Avatar upload.** A circle with the initials does the job. An upload means storage,
  moderation and deletion duties for a picture nobody else sees.
- **Full postal address.** Only needed once there is something to deliver or an on-site
  appointment, which is the commerce stage (ADR 0006). Until then at most a postcode, to
  tell the planning team the region (decision below).
- **Order history.** Arrives with orders. Until then the requests are the history.

## Data protection

A2 adds name and phone (and maybe postcode) to the account. They need a line in the
Datenschutz text, must be in the A4 export and gone after A4 deletion, and should not be
copied anywhere else (requests copy contact by design and are covered by A4 too).

## Decisions (Martin, 2026-10-23)

1. Placement: Slice A in M2 (the launch gate), Slice B after launch.
2. Postcode in the profile for the planning region: yes. A2 stores name, phone and
   postcode.
3. Avatar: initials only; no upload.
4. How account deletion reaches stored photos (the sweep or a retention policy) is decided
   with A4.

## Order of work once decided

A1 and A2 together (one visible step, small data change), then A3, then A4 with the sweep
decision. Each slice gets its own issue file under `issues/` when it starts.
