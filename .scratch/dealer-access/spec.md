# Dealer access: a customer shares a Project with a Dealer

Status: accepted 2026-10-30 — implemented on `cc/feature/user-dealer` (not merged)
Created: 2026-10-30
Decision record: [ADR 0014](../../docs/adr/0014-give-dealers-grant-checked-access-to-customer-projects.md)

A customer who has saved a Project picks a dealer from rotpunkt's Dealer Directory —
nearest first, on a map — and gives that dealer access. Every active user of the dealer
can then open the Project, change it, save and restore versions, make share links and
send a Quote Request with their own contact. The Project stays the customer's; they can
end the access at any time, and the dealer never acts through the customer's account.

## What exists today (2026-10-30, at `e6ef10a`)

- One kind of signed-in person: a Customer Account, created on the first email-code
  sign-in (`lib/server/db/identity-postgres.ts`). No roles.
- Every Project operation takes `ownerId` and compares it with `project.owner_id`; the
  predicate is repeated in `project-postgres.ts`, `sharing-postgres.ts`,
  `quote-requests-postgres.ts`, `photo-jobs-postgres.ts`, `photo-gallery-postgres.ts`.
- The only way to show a Project to someone else is a Shared Revision Link: anonymous,
  read-only, fixed to one revision.
- No dealer data, no map, no postcode geodata.

## Decisions (Martin, 2026-10-30)

| Question | Decision |
| --- | --- |
| What is "the address list"? | A directory of dealers (name, street, postcode, city, phone, location) the customer picks from, sorted nearest-first from their profile postcode, with a search box and an OpenStreetMap **map** |
| Map source | Self-hosted vector tiles (PMTiles); no map provider at runtime |
| How does a dealer get an account? | rotpunkt provisions Dealer Users by email; they sign in with the same six-digit code; no self-registration |
| Who receives the grant? | The dealer: all its active users. One dealer per Project at a time |
| What may a dealer do? | View and edit the Working Configuration, save versions, restore versions, submit Quote Requests, create share links |
| Can the customer revoke? | Yes, at any time (and Trash revokes) |
| What does the customer see of the dealer's work? | Nothing extra: which dealer has access and since when, and a way to end it |
| Whose contact is on a dealer's Quote Request? | The dealer's own contact and consent; the request belongs to the customer's Project |
| What does the dealer see of the customer? | Name, email, phone — stated in the share dialog; revoking hides it |

## Access model

See ADR 0014 for the reasoning. In short:

- A Better Auth identity resolves to a Customer Account **or** a Dealer User. A
  provisioned email links to its Dealer User on first sign-in; a disabled user or an
  inactive dealer signs in to nobody.
- `ProjectActor = { kind: "owner", customerAccountId } | { kind: "dealer", dealerUserId }`
  replaces `ownerId` on the operations a dealer may perform: `getWorkspace`,
  `listConfigurationRevisions`, `saveWorkingConfiguration`, `checkpointRevision`,
  `restoreRevision`; `sharing.createLink/listLinks/revokeLink`;
  `quoteRequests.submit/listForProject`. Everything else keeps `ownerId`.
- Reads evaluate the open-grant predicate in the same statement; writes lock the open
  grant `FOR SHARE` in their transaction, so a revoke and a write never interleave.
- One open grant per Project; switching dealers replaces it atomically; Trash revokes
  for good; an archived Project is listed for the dealer but cannot be opened.
- The grant stores a copy of the customer's name, email and phone, taken on the server.
- Share links and Quote Requests made by a dealer record the Dealer User; a dealer
  sees and revokes only its own dealer's links and sees only its own dealer's requests;
  its requests count against its own daily limit.

## Data model (migration `20261030120000_create_dealer_access`)

- `app.dealer` — name, street, postcode, city, country, phone, email, website,
  latitude, longitude, status (`active`/`inactive`).
- `app.dealer_user` — dealer, email (lowercase, unique), name, phone, status
  (`active`/`disabled`).
- `app.dealer_user_identity` — Better Auth subject linked to a Dealer User.
- `app.project_dealer_grant` — project, dealer, customer contact copy, creation key,
  granted and revoked time; one open grant per project.
- `shared_revision_link.created_by_dealer_user_id`,
  `quote_request.submitted_by_dealer_user_id`.

Synthetic demo dealers live in `db/seeds/demo-dealers.json`; `pnpm dealers:provision`
writes them (or another file) into a database. It refuses Neon hosts unless told
otherwise: the shared development database gets them only with Martin's OK.

## Surfaces

**Customer (`/konto`).** The project menu offers "Mit Händler teilen" (or "Händler
wechseln") and "Freigabe beenden"; a shared project card says "Geteilt mit … · seit …".
The share dialog shows the map and the list side by side on a desktop, stacked on a
phone, a search box, the distance of each dealer, and exactly what the dealer will see
of the customer. The configurator's project section links to the same dialog.

**Dealer (`/haendler`).** Sign-in with the email code; then the Projects shared with the
dealer: name, finishes and Richtpreis, last change, shared since, the customer's name,
email and phone, "Öffnen". Archived Projects are listed apart and cannot be opened.
`/konto` sends a dealer here.

**Configurator as dealer.** Same editor without rename, photos and "save as new"; versions,
restore, share links and the Anfrage stay.

**Anfrage as dealer.** The form starts from the Dealer User and Dealer (company, professional,
trade); the consent is the dealer's.

## Map

- Tiles: a Germany extract of the Protomaps daily build (OpenStreetMap, ODbL) as one
  PMTiles archive, served tile by tile from `/api/map/tiles/{z}/{x}/{y}`. The server
  reads it from `MAP_TILES_FILE` (a local path; `.data/map/` is ignored by git) or from
  EU object storage under `MAP_TILES_OBJECT_KEY`.
- Style: `@protomaps/basemaps`, black flavour, without icon layers; glyphs (Noto Sans,
  OFL) served from `public/map/fonts/`.
- Without tiles the map says so quietly and the list keeps working (CI, previews).
- Customer position: the profile postcode through a table built from GeoNames DE postal
  codes (CC BY 4.0), with the three- and two-digit prefix as fallback.

## Data protection

- The customer's name, email and phone go to a dealer, a separate controller, when the
  customer shares. The dialog shows the values before sharing. The wording and the legal
  basis need review together with the Datenschutz page before launch.
- Dealer Users' own data (email, name, phone) is provisioned by rotpunkt.
- The customer's data export lists their grants; deleting a Project or the account deletes
  its grants.
- The map loads nothing from third parties; tiles, glyphs and the postcode table are the
  application's own copies with their attributions.

## Not in this slice

- Notifying a dealer when a Project is shared, or the customer when it changes (waits on the
  email provider, ADR 0010).
- Self-registration or invitations for dealers; an admin screen for the directory.
- Real dealer data; dealers outside Germany.
- Attribution of autosaves and versions, an activity log, real-time co-editing.
- A dealer's own Projects.

## Slices

| # | Issue | State |
| --- | --- | --- |
| 01 | [Docs: spec, ADR 0014, CONTEXT](issues/01-docs.md) | Done |
| 02 | [Schema and provisioning](issues/02-schema-and-provisioning.md) | Done |
| 03 | [Dealer identity](issues/03-dealer-identity.md) | Done |
| 04 | [Grant-checked modules and contract tests](issues/04-grant-checked-modules.md) | Done |
| 05 | [Routes and pages](issues/05-routes-and-pages.md) | Done |
| 06 | [Share dialog, map and Dealer Workspace](issues/06-share-dialog-map-dealer-workspace.md) | Done |
| 07 | [Smoke test, STATUS, verification](issues/07-smoke-status-verification.md) | Done |

## Open for Martin

- Apply `20261029120000` and `20261030120000` to the shared development database and
  provision the demo dealers there.
- Upload the tile archive to EU object storage and set `MAP_TILES_OBJECT_KEY` on Vercel.
- The real dealer list, and who at rotpunkt provisions and disables Dealer Users.
