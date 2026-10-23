# Account management

Status: accepted 2026-10-23 — Slice A done (A1–A4); Slice P (profile) Next up, decided 2026-10-23; Slice B after launch
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

**A1 Account page layout.** Done 2026-10-23 (see STATUS); the card shows the material
picture, not yet a Generated Photo, because presigned photo URLs expire and would need the
gallery's refresh. The signed-in workspace as described above, desktop and phone.
No new data: projects show finishes and Richtpreis from their working configuration (the
account list loads only names and dates today, so the list query grows); the picture is
the latest Generated Photo when there is one, otherwise the finish swatches.

**A2 Profile basics.** Done 2026-10-23 (see STATUS); requests do not carry the postcode
yet. Name, phone and postcode (each optional), stored application-side in a new
`app.customer_profile` (ADR 0001: the Customer Account, not the auth provider, owns it).
Shown on the account; offered on the request form, which also takes the sign-in email
(the open board item "Offer the account's email on the request form" becomes part of this).
A request still copies its contact at submission, so later profile edits do not rewrite
history.

**A3 Projects you can tidy.** Done 2026-10-23 without "delete for good" and without rename
in the list (rename stays in the configurator): deleting a Project cascades away its Quote
Requests and queues its photos for storage deletion, so it moves to A4 with the 30-day purge. Archive, move to trash, restore, delete for good from the
trash; duplicate; rename where the list is. The lifecycle exists; this adds the module
operations, API and UI. A trashed Project's share links stop working on their own (the
sharing boundary already treats them as unavailable). Moves the board's "Project archive,
trash and restore" from Later to here.

**A4 My data.** Done 2026-10-23 (see STATUS) with Martin's decisions: Projects and accounts
with Quote Requests are not deleted by their owner, the Trash has no automatic purge, and
stored files leave storage 30 days after their row through a daily sweep that waits for
`CRON_SECRET` on Vercel. Also takes over from A3: deleting a Project for good from the Trash and
the purge of Projects past their 30 days, both decided together with what happens to a
deleted Project's Quote Requests and photos. "Download my data" (Projects, versions, requests, share links and photo
list as one JSON file; photos as links) and "Delete my account" (confirmation by a fresh
code, `status = pending-deletion`, sessions revoked, database cascade). Deletion reaching
object storage needs the deletion sweep scheduled or a signed retention policy — the
Deferred Decision in STATUS; A4 is where it gets decided. Without A4 a launch with
accounts cannot answer an access or erasure request except by hand.

## Slice P — the profile (Next up, after vat, focus and framing)

Decided 2026-10-23 (decisions 5 to 8). What rotpunkt's follow-up needs to know about the
person — how to address them, how to reach them, whether they plan privately or for a
client — plus a photo that makes the account and shared views personal. Facts about one
kitchen go on its request, not on the person.

**P1 Who I am and how to reach me.** The profile gains, each optional:
- Salutation: Frau, Herr, divers or no answer, plus a title (Dr., Prof.; free text, up
  to 40 characters). One function, `formalGreeting(profile, locale)` with tests, turns it
  into "Sehr geehrte Frau Dr. Vogel" or, for divers and no answer, "Guten Tag Alex Vogel";
  emails and offers use it once they exist. English and Spanish get their own forms.
- How to reach me: channel (phone, email, either) and time (mornings, afternoons,
  evenings, any time). Choosing phone requires a phone number.
- Private or professional: professional adds the company (then required) and a role
  (architecture or interior design, developer, kitchen trade, other).

Columns on `app.customer_profile` with CHECK constraints like A2, one migration; in the
export, gone with the account. The request form offers them as it offers name and phone,
and a Quote Request copies them at submission together with the postcode (the board's
"Requests carry the postcode" ships here), so a later profile edit never rewrites a
request.

**P2 Planning facts on the request.** Optional fields on the request form, stored on the
Quote Request: the project (new build, renovation, move, other), the timeframe (within 3
months, 3–6, 6–12, later, open), a budget band and the room (wall length in cm). They
differ per kitchen, which is why they are not in the profile. Part of the request's
idempotency check, the export and, later, the notification to rotpunkt. The budget bands
are rotpunkt's call; until they name them the form ships with bands around the Richtpreis
(up to 10.000 €, 10–15.000 €, 15–25.000 €, over 25.000 €, no answer).

**P3 Profile photo in the account.** Upload and remove in the profile section; the
account's title row shows it, the initials stay as fallback (no photo, still loading).
The header's account button keeps its icon, so no page but the account has to look up a
photo. The browser scales the picture to at most 1600 px and posts it to
`POST /api/account/avatar`, under Vercel's 4.5 MB request limit. The server decodes it
(`sharp` as a direct dependency; it is in the tree through Next.js), refuses anything that
is not a JPEG, PNG or WebP image or is under 200 px, crops the centre square and
re-encodes a 512 px WebP — which drops all metadata, including a phone's GPS position —
then stores it in the private photo bucket under `avatars/`. A new `app.customer_avatar`
row (one per account) owns the object, so the existing deletion trigger queues the file
when the row goes (replace, remove, account deletion) and the daily sweep deletes it 30
days later like every stored file. Reads are short-lived presigned URLs minted after the
ownership check. The export embeds the 512 px picture as a data URL, so it needs no link
that expires. iPhone photos (HEIC) need a check on a device: the browser may hand over a
JPEG or the upload must say which formats work.

**P4 Photo and first name on share links.** Off by default (data protection by default,
DSGVO Art. 25): a switch in the profile, "Foto und Vornamen auf geteilten Ansichten
zeigen". When on, the shared view shows "Geteilt von Mara" with the photo; the
shared-revision API mints the photo URL only after it has checked the link, so a revoked
or expired link shows nothing. Strangers then see an uploaded picture on a rotpunkt page,
so a photo needs a check before it appears there. **Open decision (Martin):** (a) an
automatic image-moderation service — a new processor with a DPA review, and the same gate
AI photos need (board "AI photo operations"); (b) rotpunkt approves each photo by hand —
needs a staff side that does not exist; (c) no check, relying on the switch — rotpunkt
cannot take down someone else's link today. Recommended: (a). P4 waits on this; P1 to P3
do not.

**P5 Newsletter consent.** A switch, "Neuigkeiten von rotpunkt per E-Mail". Ticking it
sends a confirmation email and only the click makes the consent active (double opt-in;
without it consent cannot be proven, UWG § 7 and DSGVO Art. 7). Stored: requested,
confirmed, withdrawn, and the version of the consent text. Unticking withdraws at once;
every newsletter carries an unsubscribe link. Waits on the email provider (ADR 0010) and
on the choice of what sends newsletters — a newsletter tool would be another processor
for the Datenschutz text. Until then the switch does not appear.

Data protection: P1 to P5 add salutation and title, company and role, contact
preferences, a photo, planning facts and the newsletter consent. Each needs a line in the
Datenschutz text, lands in the export and leaves with the account (requests keep their own
copy, as decided for A4).

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
- **Avatar upload.** First proposed against: a circle with the initials does the job, and
  an upload means storage, moderation and deletion duties for a picture nobody else sees
  (decision 3). Reversed the same day once A4 had built storage deletion and the export;
  see Slice P.
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
3. Avatar: initials only; no upload. *Superseded by decision 5.*
4. How account deletion reaches stored photos (the sweep or a retention policy) is decided
   with A4.

Second round, the same day:

5. Customers upload a profile photo, and it also shows on their share links (P3, P4).
6. The profile gains how and when to reach the person, the salutation, private or
   professional, and newsletter consent (P1, P5).
7. Planning facts (project, timeframe, budget, room) go on the Quote Request, not the
   profile (P2).
8. Slice P is Next up, after vat, focus and framing.

## Order of work once decided

A1 and A2 together (one visible step, small data change), then A3, then A4 with the sweep
decision. Slice P: P1 and P2 together (both grow the request contract and form), then
P3, then P4 once the moderation decision is made, P5 with the email provider. Each slice gets its own issue file under `issues/` when it starts.
