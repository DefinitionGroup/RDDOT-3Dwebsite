# rotpunkt Signature Status

Last reconciled: 2026-10-22 (at `0c9b45e`), against the website assessment of 2026-10-16
(`.scratch/website-assessment-2026-10-16/assessment.md`, untracked) and a recheck of the
gates and the live deployment; the guest-save fix, noindex and the `1aee72f` deploy were
added the same evening.
Working branch: `cc/devstart-sanity` — the main development branch from 2026-10-01, cut from
`cc/devstart-003` at `e4fd3e9`. `redesign/devstart`, the Vercel production branch, is
fast-forwarded to this branch and pushed when the test environment should update; last on
2026-10-28 to `4dc7cf7`. `cc/devstart-003` and the earlier
`cc/devstart-*` branches are frozen at their last commit; none is merged back and none
needs to be.

Design direction (decided 2026-09-02, rebuilt 2026-09-03 on the Sequel style from Refero):
"rotpunkt after dark" — black stage, charcoal cards, three greys, white structure, signature
red only as the dot and one filled action per view; Manrope 300/400/500 plus one Instrument
Serif word per headline; pills, glass chips over imagery, solid soot chips (`chip-solid`,
`--color-soot` 20 20 20) over the 3D scene since 2026-10-08 because frosted glass tinted
with the worktop and the wooden floor, 10 px cards; one motion curve. Canvas:
https://claude.ai/code/artifact/5fed3dc8-f9bd-4489-845d-29cfbaa07be3 (pages Website,
Konfigurator, System). Implemented 2026-09-03 across four commits: the foundation
(tokens, fonts, primitives, motion contract), the homepage with the rotpunkt film as
hero, the configurator (dark studio, glass HUDs, charcoal Datenblatt with accordions,
material overlay, bottom sheet on phones) and the account, sign-in, Anfrage and shared
states. Open on the design side: Impressum/Datenschutz pages (the footer carries no
legal column until they exist) and a dark studio render for the homepage's configurator
card (it shows the evening photo for now).

Gates at reconciliation (2026-10-22): `pnpm lint` 0 errors and 1 warning
(`components/page-builder/exit-preview.tsx`, `window.location.assign` to an internal page),
`tsc --noEmit` clean, `pnpm test` 149/149 in 28 files (covers `features` and `lib`),
production build green with the `postbuild` server-bundle check passing. `pnpm test:db` was
not rerun (its harness can migrate the remote test database); its last result is 64 passed
and 1 skipped (2026-10-15). `pnpm audit --prod` reports one high advisory with no fixed
release, in Sanity's build tooling (since 2026-10-23; see Known Warnings). The build only
passes with `TRANSACTIONAL_EMAIL_PROVIDER` **unset** — with the local `development-capture`
value it fails closed by design (ADR 0010). See Build & Verification Gates below.

## Current Goal

Deliver a German-first, branded kitchen configurator that lets a private customer move from a shareable guest configuration to a durable Project, while preserving the approved boundaries for identity, releases, future AI photos, Quote Requests, Sanity, and commerce.

Alongside it, every piece of marketing content becomes editable in Sanity, in German,
English and Spanish: [.scratch/sanity-pagebuilder/spec.md](.scratch/sanity-pagebuilder/spec.md).

## Feature Inventory (2026-10-15, reconciled 2026-10-22)

Everything the project does today, by area. **Done** works end to end and was verified in
the browser; **Gated** is built but waits on a decision, a supply or production
configuration; **Defect** is built but breaks on a path customers take; **Open** is not
built. Details for each line are under Done, Known Defects and Missing.

**Website and content (Sanity)**

| Feature | State |
| --- | --- |
| Homepage from eight Page Blocks: film hero, statement, promises with detail cards, material cards (live surcharge, deep link), configurator teaser (live price, explainer), room story, collection lines, closing | Done |
| Header and footer navigation from Sanity, full-screen menu on phones | Done |
| Embedded Studio at `/studio`, `page` and `navigation` per language, demo mode without Sanity, `pnpm sanity:seed` | Done |
| Editorial Preview: draft mode, live updates, click-to-edit markers | Done (Presentation tool not yet tried with a Studio login) |
| Locale routing: German at `/`, English `/en`, Spanish `/es`; language switch on editorial pages | Done; English and Spanish are not in `LAUNCHED_LOCALES`, but Vercel Production opens them while it serves as a test environment (`OPEN_ALL_LOCALES`) |
| English and Spanish homepage and navigation | Done; native review open |
| Site settings, SEO metadata, canonical, `hreflang`, sitemap, robots, redirects, signed publish webhook (Phase 7b) | Done; the Sanity variables are on Vercel (since 2026-10-15), the webhook is not: without `SANITY_REVALIDATE_SECRET` the route answers 404, so published edits reach the site only with a redeploy |
| Impressum, Datenschutz, `richText` / `faq` / `media` blocks | Open (needs Martin's legal texts) |

**Configurator**

| Feature | State |
| --- | --- |
| Straight kitchen line from wall modules (tall cabinet, appliance cabinet, cabinet 30): Edit Session with add, remove, move, swap, drag reorder, drag from the Datenblatt palette; width and per-type limits | Done |
| Islands: none, standard, large | Done |
| Finishes: three carcass colours, four fronts; full-size material overlay | Done |
| Itemised indicative price (sum of parts), live with every change | Done (prototype prices in code, ADR 0006); every price shown includes VAT since 2026-10-23 |
| Views: Studio, Appartement, Loft; cameras Room, Front, Detail; supersampled studio light | Done; both rooms are placeholders with no recorded licence (Release Blocker). The path-traced Rendering has no button since the Loft took its place |
| Shareable guest URL (`?c=`), older URLs upgrade | Done |
| Asset Manifest with release-gate test; poster fallback when 3D fails | Done |
| Phone layout: bottom sheet, compact HUD | Done |
| Interface in German, English, Spanish (Phase 9b) | Done; with the language switch on configurator, account and request since 2026-10-23 |

**Customer account and projects**

| Feature | State |
| --- | --- |
| Sign-in with a six-digit email code, no password, account created on first use | Gated: production needs a transactional email provider (ADR 0010) |
| Save a configuration as a Project, also by a signed-out guest through sign-in; autosave with conflict handling; browser recovery drafts | Done (the guest handoff fixed 2026-10-22) |
| Versions: save, history, restore behind a safety version; rename | Done |
| Secure share links (90 days, revocable, secret only in the URL fragment); public shared view | Done |
| Account area on the whole screen: project cards with finishes and Richtpreis, requests, visualisations, profile (salutation, name, phone, postcode, how to reach, private or professional) that fills the request form | Done (A1, A2, P1 2026-10-23; profile photo P3 2026-10-27) |
| Archive, trash, restore and duplicate Projects from the account; delete for good from the Trash unless the Project has requests | Done (A3, A4, 2026-10-23); no automatic purge by decision |
| Download my data (JSON); delete my account after a fresh sign-in unless it has requests | Done (A4, 2026-10-23) |

**AI photos**

| Feature | State |
| --- | --- |
| Photo of the current configuration in four scenes: capture, EU storage, Replicate (`qwen/qwen-image-2-pro`), validated result | Gated: off for launch by decision. The local `.env.local` sets `PHOTO_GENERATION_ENABLED=true`; Vercel sets the variable on Preview and Production, value not read (2026-10-22) |
| Governance: approved prompt and model releases, per-account quota, provider budget breaker, kill switch | Done |
| Webhook inbox, reconciliation on read, sweep endpoint | Gated: webhook URL, signing secret and sweep schedule need a deployment |
| Galleries per Project and per account, download, delete | Done |
| Output moderation, billed-cost evidence | Open |

**Requests and commerce**

| Feature | State |
| --- | --- |
| Quote Request on a pinned revision: contact with the profile's details, planning facts, consent, note, reference number, listed in the account | Done (planning facts and details since 2026-10-23, P1/P2) |
| Notifying rotpunkt about a new request | Open (waits on the email provider) |
| Catalog, cart, checkout, payment, CRM | Not planned yet; boundaries in ADR 0006 |

**Platform**

| Feature | State |
| --- | --- |
| PostgreSQL on Neon Frankfurt with migrations; private S3-compatible storage with a deletion outbox | Done; the daily storage sweep (30-day hold) waits for `CRON_SECRET` on Vercel |
| Gates: lint, types, 149 unit tests, 64 database tests, production build with server-bundle check | Done, run by hand; no CI |
| Vercel project | Production builds `redesign/devstart` from Git, at `4dc7cf7` since 2026-10-28, and serves as a test environment with noindex (see Deployment); functions run in `iad1` (US East), the database in Frankfurt |
| Dependency security: Next.js 16.4.1, React 19.3.1, patched `sharp`, `undici`, `vitest` (`a80ef42`) | Done |
| Sanity CLI advisories (dompurify, vite, uuid, braces under `sanity > @sanity/cli`) | Done 2026-10-23: `sanity` 6.20.0 plus two overrides; one `braces` advisory has no fixed release and stays (Known Warnings) |
| Browser E2E tests, analytics, accessibility audit, whole-site performance budgets (the kitchen Asset Manifest has its own) | Open |

## Done

- **Paging past items made in the same millisecond; an account page without storage
  (2026-10-29).** *Paging:* the photo gallery and the version list page newest first by
  creation time and id, but the cursor's Date keeps milliseconds while the database stamps
  to the microsecond, so an older item made in the same millisecond as a page's last one
  fell between the pages (the gallery's paging test hit it in two of nine local runs). The
  next page now starts from the cursor item's own stamp, read back by its id; the cursor's
  Date stands in only once that item is gone, so the URL's cursor is unchanged and the
  indexes still serve. The account's request list was never affected: a Quote Request's
  time comes from the application's clock, in whole milliseconds. *Storage:*
  `getObjectStorage()` read its configuration when a module took it rather than when one
  used it, so a signed-in `/konto` without the `OBJECT_STORAGE_*` variables answered with a
  server error even for an account without a photo, and the gallery logged "Gallery
  unavailable" on every visit. It now reads them on first use, and CI's smoke job runs
  without them, so a page that needs no photo cannot come to need storage unnoticed.
  Checked: lint, types, 190/190 unit tests (new: storage read on first use, presigning once
  configured), the database suite on a new database (93 passed, 1 skipped; new: three photos
  and three versions within one millisecond page in order, failing on the old code), the
  gallery suite ten times in a row, and the smoke journey against a production build without
  any storage variable (sign-in, the signed-in account, save, share, request; no storage
  error in the server log).
- **CI on every push and a browser smoke test (2026-10-29).** `.github/workflows/ci.yml`
  runs three jobs on every push and pull request: lint, types and unit tests; the
  database contract tests, each file against its own Postgres 17 container; and the
  production build followed by the browser smoke test against a throwaway Postgres
  service, with the development email capture and no Sanity variables (demo content).
  The build job also fails when `schema.json` or `sanity.types.ts` differ from what
  TypeGen produces. The smoke test (`pnpm test:smoke`, Playwright 1.64.1,
  `playwright.config.ts`, `tests/smoke/`) drives the real build at 1440 px:
  `journey.smoke.ts` goes from the homepage's call to action into the configurator, picks
  the Fenix front (Datenblatt, URL and price follow), saves the kitchen as a Project
  through sign-in with the on-screen code, reopens it with the same front and price,
  creates a share link that a second, signed-out browser opens with that front and price,
  and requests it; the request is confirmed with a reference and listed in the account.
  The journey runs without WebGL, so the configurator shows its poster and every task is
  checked to work without 3D (ADR 0009); a software-rendered scene would also hold
  several cores of a runner without a GPU for the whole journey. `scene.smoke.ts` checks
  with WebGL that the kitchen model loads and the scene builds without falling back to
  the poster (a corrupted model swaps to it within a second, checked). Any uncaught
  exception or console error fails either test. Rehearsed locally the way the workflow
  runs: a clean copy without `.env.local`, a new Postgres 17 database migrated from
  scratch, the build in demo mode, both smoke tests (18 s, three runs in a row), and all
  database tests on new databases. Getting those to pass on a local database surfaced
  three test problems, fixed: the tests' own container fallback could never have worked
  (dbmate asks for TLS unless the URL says `sslmode=disable`), the pool test read
  `sslmode=disable` as a request for TLS, and three storage-sweep tests swept in the same
  millisecond as the deletion, before its intent was due (the database stamps to the
  microsecond; a remote database's latency had hidden it). It also found a paging defect,
  fixed the same day (see Done). The first run on GitHub (d419e66) passed the database and smoke jobs
  but failed the type check: `PageProps` and `LayoutProps` are generated into `.next`,
  which only the local checkout had, so the checks job now runs `next typegen` first.
  Green on GitHub since 5e17f5c (run 40918698942): checks 42 s, database 69 s (88 passed,
  4 skipped: the live object-storage and Replicate tests need credentials CI does not
  have), build and smoke test 166 s (2 passed in 30 s).
- **Sign-in for a shared address, an early click and an expired request (2026-10-28).**
  Three fixes on the way from sign-in to a Quote Request. *Code limit:* Better Auth counts
  code requests per client address, three in ten minutes, so the fourth person in a
  showroom, an office or behind a mobile network's shared address was told "Zu viele
  Versuche". The per-client limits are now 20 code requests in ten minutes and 20
  sign-ins in five (`create-auth.ts`), and each email address gets at most three codes in
  ten minutes wherever they are asked for: a Better Auth `before` hook counts them in the
  new `app.sign_in_code_limit` table (migration `20261028120000`, one upsert per request,
  only a SHA-256 of the address stored, rows gone with their window;
  `sign-in-code-limit-postgres.ts`) and answers 429, which the form already shows as "Zu
  viele Versuche". *Early click:* a sign-in sent before the page's script had loaded went
  out as a plain form, loaded `/konto` again without its query and so dropped a pending
  save or return. Both sign-in forms are now React form actions: React holds a
  submission made before hydration and replays it after, and the actions read the
  address and code from the submitted form. *Expired request:* when submitting a request
  answers 401, the form keeps what was typed (contact, planning facts, note, consent) in
  the tab's session storage, and back from signing in again it fills itself once
  (`quote-request-draft.ts`): kept half an hour, the consent only while its wording is
  the one accepted, nothing sent anywhere. Checked: lint, types, 188/188 unit tests (new:
  the draft comes back once, per project, not after half an hour, without a changed
  consent, not from rubbish or refused storage), 15 database tests (new: three codes per
  address then the wait until the window reopens, however the address is written, kept
  apart, a new window after ten minutes, exactly three of six simultaneous requests, only
  a hash stored; through Better Auth: twenty people on one client address get codes and
  the twenty-first waits, one address gets three codes from four addresses), build. On
  the dev server in headless Chrome: with the page's scripts held back, an address typed
  and sent reaches the code step for that address once they load and keeps
  `?next=/anfrage`, where the previous form reloaded `/konto` without it; five addresses
  from one client get codes, a fourth code for one address shows "Zu viele Versuche" with
  the address kept; signed in as the QA account, a request typed with a note, a wall
  length and consent, its session cookie removed, says the session ended, and after
  signing in again through its link the form shows the note, the wall length, the consent
  and the contact, and a reload starts empty; no console errors. The migration is applied
  to the shared development database, which the test site also uses.
- **The configurator frames the kitchen on phones and tablets (2026-10-28).** There the
  controls above the scene and the sheet below it cover about 60 % of the canvas, and
  every framing was composed for the whole of it: in all nine room and camera
  combinations the kitchen showed cropped large at 390 px, and at 768 px the island
  vanished behind the sheet. The way the desktop draws its framing beside the Datenblatt
  now covers every edge: each framing is composed for a 16:10 frame and drawn into the
  largest 16:10 rectangle the uncovered part holds (`visible-frame.ts`). The camera zooms
  out to that rectangle's height and a lens shift moves the optical axis to its centre;
  three.js shifts a lens only sideways, so the scene's camera is a `ShiftedLensCamera`
  that shifts it both ways, after the zoom and the anti-aliasing jitter. On phones and
  tablets the shell measures what the controls cover (`use-covered-edges.ts`): the
  decisions above, the camera row below, or the Edit Session's bar while editing; with
  the sheet expanded the framing stays where it was. Phones now use the desktop framings
  and lenses; the phone-only framings that aimed low to lift the kitchen above the sheet
  are gone, from the scene and from the Asset Manifest's studio cameras. Desktop is
  unchanged: with the panel open at 1440 px the frame is the same 1000 × 625 px, and the
  picture matches the live site to a mean difference of 0.2 of 255. Checked: lint, types,
  181/181 unit tests (new: where the frame sits on desktop, phone, tablet and a crowded
  screen; the axis and the frame's edges land where they belong; the shift survives the
  jitter; what is drawn unprojects to the same point), build; headless Chrome on the dev
  server's real GPU: Studio, Appartement and Loft in Raum, Front and Detail at 360, 390,
  430 and 768 px show the whole kitchen between the controls and the camera row, and at
  1024 and 1440 px left of the panel; in the Edit Session at 390 px the kitchen sits above
  the edit bar and a tap selects the module under it; expanding and collapsing the sheet
  leaves the framing in place; hiding and reopening the desktop panel moves the framing
  and back; picking a front changes the picture at 1440 and 390 px; nothing past the edge,
  no console errors. The photo capture crops the same frame but was not taken in the
  browser (it needs a saved Project and photo generation). Live on the test site the same
  day (`4dc7cf7`, see Deployment). A phone held sideways keeps only a 30 px band (Known
  Defects).
- **First sign-in after a quiet period (2026-10-27).** Neon suspends the idle database and
  wakes it on the next connection. On 2026-10-22 the first code request after a quiet spell
  answered 500 (`Connection terminated due to connection timeout`): both pools gave a
  connection 5 s, and the wake-up plus every handshake round trip from `iad1` to Frankfurt
  took longer. Both pools, the app's and Better Auth's, now come from
  `lib/server/db/postgres-pool.ts`: 10 s per attempt (Neon's documented value) and one more
  attempt after about half a second when a connection fails to open — not after wrong
  credentials or a missing database, and never for a statement, since nothing ran on a
  connection that never opened. An idle connection the database closes is logged instead
  of reaching Node as an unhandled `error` event, and `attachDatabasePool` from
  `@vercel/functions` (new dependency, 3.10.1) keeps a function up until the pool has closed
  its idle connections, so none survives into a suspended function to fail after the
  database slept. Measured from here: after 7 idle minutes the first connection took 1.8 s,
  against 0.37 s awake. Checked: lint, types, 175/175 unit tests, 5 new database tests
  through a relay that holds connections the way Neon's proxy does while the database wakes
  (a plain pool fails with the 2026-10-22 error; the new pool connects on its second attempt
  through Kysely and `pool.query`, gives up after two, does not retry a wrong password, and
  survives dropped idle connections), build; on the dev server after 7 idle minutes, a
  signed-out headless Chrome requested a code as the QA account (200 in 2.9 s, wake-up
  included) and signed in. Live since 2026-10-28 (`6cf216a`, see Deployment); the checks
  there were signed out and never opened a connection, so a code request after the
  database slept has been seen on the dev server only. The function region (`iad1`) still
  adds a transatlantic round trip to every query.
- **Profile photo (P3, 2026-10-27).** "Foto" in the account's profile: upload, change,
  remove; the title row's circle shows it, the initials stay beneath while it loads and
  without one. The browser scales the picture to at most 1600 px (drawing it anew already
  leaves its EXIF behind) and posts it to `POST /api/account/avatar`; the server decodes
  it with `sharp` (now a direct dependency, 0.35.5 as Next.js already used), refuses
  anything but JPEG, PNG or WebP or a shorter edge under 200 px, turns it upright, crops the
  centre square and stores a 512 px WebP without any metadata in the private photo bucket
  under `avatars/`. `app.customer_avatar` (migration `20261027090000_create_customer_avatar.sql`,
  applied to the development database) owns the file, so replacing, removing or deleting
  the account queues it for the storage sweep. `GET /api/account/avatar` answers with a
  redirect to a two-minute URL, so the `<img>` never expires; the export embeds the photo as
  a `data:` URL. Only the owner sees it; share links follow with P4. German, English and
  Spanish. Checked: lint, types, 175/175 unit tests (new: format, size, EXIF and GPS gone,
  an asymmetric picture tagged "rotate 90°" comes out upright), 7 database tests in the avatar
  and export files (new: owner-only reads, replace, remove and account deletion queue the
  file), build; headless Chrome on the dev server, signed in as the QA account: a 150 px
  picture and text named `.jpg` are refused in German, a sideways phone photo with GPS shows
  in both circles, is stored upright as a 512 px WebP without EXIF (read back from the
  export), the editor fits 390 px, removing brings the initials back and the photo answers
  404; no console errors. Not checked: HEIC from an iPhone (the picker should hand over a
  JPEG) needs a real device.
- **Profile P1 and request P2 (2026-10-23).** The profile gains salutation and title, how
  and when to be reached (phone, email or either; mornings, afternoons, evenings or any
  time) and private or professional with company and field; choosing "Telefonisch" needs a
  phone number and "Beruflich" a company, at the form, the contract and the table, and a
  company is dropped for anyone else. The request form starts from the profile, adds the
  postcode, and asks four optional planning facts under "Ihr Vorhaben": project, timeframe,
  budget band (placeholder bands until rotpunkt names its own) and wall length (100 to
  2000 cm). A Quote Request stores its own copy of all of it (the board's "Requests carry
  the postcode" with it), the idempotency check covers it, and the export lists it.
  `formalGreeting` turns salutation, title and name into "Sehr geehrte Frau Dr. Vogel" for
  the emails to come. One migration, `20261023120000_add_contact_details_and_planning_facts.sql`,
  only adds columns with defaults, so older code and requests read "no answer"; applied
  to the development database. German, English and Spanish; choices are native selects
  (`ChoiceField`) with options short enough for a half column. Checked: lint, types,
  171/171 unit tests (new: both contracts' rules, the greeting), 17 database tests in the
  profile, request and export files (new: round trip, replay only with the same facts, the
  table's own rules), build; headless Chrome on the dev server, signed in as the QA account:
  the two rules show German messages, the profile saves and survives a reload, the request
  form starts from it, a wall length of 50 cm is refused, the submitted request (one more in
  the shared database) carries the copied details and the planning facts in the export;
  every option fits its select in all three languages at 1440 and 390 px; no console errors.
- **The desktop Datenblatt no longer covers the kitchen; the HUD reads on light walls
  (2026-10-23).** Every camera framing is composed for the whole canvas; with the panel
  open the scene now draws it into the 1000 px left of it (at 1440 px): the camera zooms
  out to the visible share of the width and a horizontal lens shift (three's `filmOffset`)
  centres the frame there (`features/configurator/engine/visible-frame.ts`). The camera
  stays where the preset put it, so orbiting, the rooms' walls and raycasting are
  unchanged; hiding the panel eases back to the full width. Temporal accumulation now
  restarts on a zoom or lens change too, and the photo capture crops the same frame, so a
  photo is composed as before. The wordmark with "Signature Küche", the Richtpreis and the
  account button sit on soot chips like the other controls over the scene; bare white type
  and graphite labels washed out on the Appartement's and the Loft's walls. Checked: lint,
  types, 163/163 tests (new: the lens shift puts the optical axis and the frame's edges
  where they belong), build; headless Chrome on the dev server's real GPU: Studio,
  Appartement and Loft in Raum, Front and Detail at 1440 px show the whole kitchen left of
  the panel and a readable HUD; hiding and reopening the panel moves the lit area from
  x ≤ 980 to 1330 and back; choosing walnut changes the picture; a click on a wall module
  in the Edit Session selects it; the capture crop is centred; at 390 px the wordmark sits
  on its chip and nothing else changed; no console errors.
- **Dialogs keep focus, segment controls take arrow keys (2026-10-23).** One hook,
  `components/design-system/use-modal-dialog.ts`, now runs every modal dialog — the
  material and promise cards (`DetailCard`), the teaser's "So funktioniert es" and the
  configurator's material sheet (`Overlay`), and the photo lightbox: focus moves to Close,
  Tab and Shift+Tab wrap inside, the rest of the page is `inert`, Escape closes and focus
  returns to what opened it. The backdrops are no longer buttons in the Tab order (a click
  outside still closes). The old effects also re-ran on every render of their parent and
  pulled focus back to Close; the teaser re-renders every 3,2 s on its stage timer, so the
  open explainer kept taking focus. `GlassSegments` (stages, view, camera, the Loft's
  outlook, the teaser's decisions) is a radio group: only the chosen segment is in the Tab
  order, arrow keys, Home and End choose another, one Tab leaves. It never controlled tab
  panels — a stage opens a Datenblatt section — so "tab" was the wrong role. Checked: lint,
  types, 158/158 tests (new: `lib/keyboard.ts`), build; headless Chrome with real key
  presses on the dev server: in the material card and the explainer, focus starts on
  Close, six Tabs and six Shift+Tabs never leave, `main` is inert, Escape closes and focus
  returns to the trigger with nothing left inert; in the configurator at 1440 and 390 px
  the view group has one Tab stop, ArrowRight, End, Home and wrap-around choose and focus,
  one Tab leaves, and ArrowRight on the stages opens Aufbau; no console errors. The photo
  lightbox was not opened in the browser (the QA account has no photos); it uses the same
  hook.
- **Every price includes VAT (2026-10-23).** The price book stays net; what customers see
  is gross, as German price law (PAngV) asks of prices for consumers and as the totals
  already were. The homepage material card said "Aufpreis 580 €" while choosing the finish
  moved the total by 690,20 €; it now says "Aufpreis 690 € inkl. MwSt." (`presetPricing`
  returns `frontSurchargeCents`, the quote's front delta with VAT). The configurator's
  "Aufstellung" and the request's configuration panel list every position with VAT, in
  whole euros that add up to the Richtpreis shown (`features/configurator/gross-prices.ts`:
  leftover euros go to the positions closest to rounding up), unit prices to the cent when
  they have cents, and end with "darin enthaltene MwSt. (19 %)" instead of a net subtotal
  and a "MwSt. Indikator". The datasheet's total reads "Richtpreis inkl. MwSt.,
  unverbindlich", the homepage teaser's note says "inkl. MwSt."; English and Spanish
  alike. The stored Price Indication on requests is unchanged (net lines, tax, total).
  Checked: lint, types, 153/153 tests (new: every configuration's positions add up to its
  total); headless Chrome on the dev server: the walnut card says 690 € and the total goes
  10.103 → 10.793 €, the walnut list's nine positions sum to 10.793 €, the English and
  Spanish lists add up, the request panel sums to 11.127 € at 1440 and 390 px with nothing
  clipped, no console errors.
- **The request confirmation says what really happens (2026-10-23).** Nothing tells rotpunkt
  about a new Quote Request yet, so `/anfrage` no longer promises an offer: the form says
  the customer sends this state to rotpunkt and that the request is not yet a quote; the
  confirmation is labelled "Anfrage gespeichert", says the request is saved with exactly
  this planning state and adds "Neue Anfragen erreichen rotpunkt noch nicht automatisch.
  Bis das eingerichtet ist, meldet sich niemand von selbst."; the price panel says the
  indication is not yet an offer. One switch, `QUOTE_REQUESTS_REACH_ROTPUNKT` in
  `features/quote-requests/quote-request-contract.ts` (false), keeps the "eingegangen …
  wir melden uns bei Ihnen unter <E-Mail>" version ready for when the
  `quote-request.submitted` consumer exists. German, English and Spanish. Checked: lint,
  types, 149/149 tests; headless Chrome on the dev server, signed in as the QA account,
  read the promise on `/anfrage`, `/en/anfrage` and `/es/anfrage`, sent two requests
  (`A-47KT THSB`, `A-G8U5 6V78`, now in the shared development database) and found the
  saved label, both sentences and the price panel's wording, nothing clipped at 390 px and
  no console errors.
- **My data: export and deletion (account management A4, 2026-10-23).** "Daten & Konto" in
  the account offers "Meine Daten herunterladen" (`GET /api/account/export`, one JSON file
  with the account, profile, Projects with their configurations and versions, share links
  without secrets, requests, photo jobs and the photo list; no storage paths, token hashes
  or idempotency keys) and "Konto löschen". Deleting uses Better Auth's own `deleteUser`,
  which demands a sign-in from the last 15 minutes (`freshAge`, otherwise
  `SESSION_EXPIRED` and the page explains how to sign in again); its `beforeDelete` hook
  deletes the application's account first (`createPostgresAccountDeletion`), so a failure
  leaves the login in place to try again. A Project in the Trash can be deleted for good
  (`DELETE /api/projects/[id]`). Martin decided (see Deferred Decisions): a Project or an
  account with Quote Requests is refused (`project-has-requests`; an account with requests
  is told rotpunkt deletes it by hand and gets no button), the Trash has no automatic purge
  (CONTEXT.md updated, the Trash now says "Im Papierkorb seit …"), and stored files leave
  storage 30 days after their row through the daily sweep, which waits for `CRON_SECRET`.
  Checked: 4 database tests (delete for good refused outside the Trash and with requests,
  account deletion with and without requests, the export without internal keys, the 30-day
  hold) next to the lifecycle tests; lint, types, 149 unit tests, build; in headless Chrome
  on the dev server: the export as an attachment with the test account's data, the
  account-with-requests message, deleting the archived copy for good with its warning,
  the refusal for the Project with requests and its restore, and a fresh throwaway account
  deleted end to end (home page, export then answers 401), no console errors. The
  `SESSION_EXPIRED` path was not exercised: it needs a sign-in older than 15 minutes.
- **Projects you can tidy (account management A3, 2026-10-23).** Each project card has a
  menu over its picture: Duplizieren, Archivieren, In den Papierkorb. Below the cards the
  account lists the Archive (restore, or move to Trash) and the Trash (restore, "Wiederherstellbar
  bis …"). The rules follow CONTEXT.md and live in one pure function
  (`features/projects/project-lifecycle.ts`): archive only from active, Trash from active or
  archived, restore from both, a repeated request counts as done. Entering Trash sets the
  30-day `deletion_due_at` the schema already demanded and revokes the Project's open share
  links for good in the same transaction (`changeProjectLifecycle`); restoring does not bring
  them back, which is why the Trash step asks once more and says so. Duplicating copies the
  working configuration into a new active Project ("… (Kopie)", without versions, links,
  photos or requests). New routes `POST /api/projects/[id]/lifecycle` and `…/duplicate`,
  error code `project-lifecycle-conflict` in all three languages. The configurator sends an
  archived or trashed Project back to `/konto#archive` or `#trash` instead of opening it.
  Not here, on purpose: deleting a Project for good and the purge after 30 days. Deleting a
  Project cascades away its Quote Requests and queues its photos for storage deletion, so
  both wait for A4's retention and deletion decisions; until then the Trash keeps Projects
  past their date. Checked: 5 unit and 3 database tests (archive, trash with date and
  revoked links, restore without them, refusals, other owners), lint, types, build; in
  headless Chrome on the dev server as a test account: the menu and Escape, duplicate,
  archive, trash with its warning, the restore date, restore, the configurator's redirect,
  nothing past the edge at 390 px, no console errors.
- **Account page and profile (account management A1 and A2, 2026-10-23).** Signed in,
  `/konto` no longer keeps the sign-in layout: `AppHeader` across the full width, a title
  row with the person's initials (`profileInitials`, no avatar upload) and name or email,
  a section column on desktop (a scrolling row on phones) for Projekte, Anfragen,
  Visualisierungen and Profil, and the sections beside it. Projects are cards in a grid: a
  material picture of the kitchen (four fronts in the front finish, joints and plinth in
  the carcass finish), layout, finishes, Richtpreis and last change
  (`features/customer-accounts/account-projects.ts`; `listProjects` now returns each
  working configuration). "Neues Projekt" is the page's one red action. Signed out, the
  sign-in keeps its photo. The profile (name, phone, postcode, each optional) lives in the
  new `app.customer_profile` (migration `20261023090000`, applied to the shared Neon
  database; deleted with the account), behind `CustomerProfileModule` and `PUT
  /api/account/profile` (`invalid-profile` in all three languages). The signed-in session
  now carries the sign-in email; the request form starts with the profile's name and
  phone and that email. Requests do not carry the postcode yet: the planning team sees it
  once the notification consumer exists. Checked: 6 new unit tests, the profile contract
  against the database (4) and the project persistence suite, lint, types, build; in
  headless Chrome on the dev server, signed in as a test account, at 1440 px, 390 px and in
  English: no photo signed in, cards with the material picture, a refused postcode
  explained, the profile saved and reloaded, initials and title following the name, the
  request form prefilled, nothing past the right edge on the phone (the first phone run
  clipped the column; a grid without `minmax(0,1fr)` let the scrolling section row widen
  it, and the scroll-width test missed it because `body` hides horizontal overflow), no
  console errors. The project card does not show a Generated Photo yet: presigned photo
  URLs expire and would need the gallery's refresh.
- **Language switch on the configurator, account and request screens (2026-10-23).** The
  editorial pages' dropdown (`LanguageSwitch`) now sits in `AppHeader` (account, request)
  and in the configurator: in the desktop top bar between price and account, on a solid
  chip, and on phones at the foot of the Datenblatt sheet, because the top row has no room
  at 375 px. Each link is the same screen in the other language and carries what the
  screen holds in its URL (`screenLanguageLinks` in `lib/language-links.ts`): the guest
  configuration or the Project in the configurator and the request, a pending save on
  `/konto`, and a `next` return address moved into the target language
  (`unlocalizePath` in `lib/i18n.ts`). The switch reads its words from the page's
  messages, so a server component can place it. It shows only where two languages are
  open, so it stays hidden in production until English and Spanish launch; the shared
  view keeps none, because a plain link would drop the secret in its URL fragment. The
  configurator's top bar moved to `z-30` so the list opens over the Datenblatt card.
  Checked in headless Chrome: on a German-only `next start` no switch on configure, konto
  and anfrage; on the dev server the links on the guest configurator, a pending save, a
  return address, a guest request and, signed in, a Project's configurator and request;
  English reopened the same configuration in English, Spanish the same Project's request;
  no overflow at 1440, 500 and 375 px, no console errors. At 375 px the request header's
  "Zur Konfiguration" wraps onto two lines.
- **Sanity updated, the dependency audit down to one unfixable advisory (2026-10-23).**
  `sanity` and `@sanity/vision` 6.17.0 → 6.20.0 brought `@sanity/cli` 8.13.0 → 8.22.1, which
  cleared the vite advisories and `sprintf-js`. Two overrides in `package.json` lift what the
  CLI still pinned: `dompurify` to 3.4.17 (the critical, a high and a low, in
  `@sanity/cli-build`) and `uuid` 10 to 11.1.1 (moderate, in `typeid-js`, which calls only
  `stringify` and `v7`, both unchanged in 11). From 12 advisories (1 critical, 3 high) to one
  high in `braces` with no fixed release (Known Warnings). Lint, types, 134 tests and the
  build pass; type generation through the new CLI produced identical `schema.json` and
  `sanity.types.ts`; on `next start` the Studio shows its sign-in screen and the homepage and
  configurator render, with no console errors. pnpm now warns that `@sanity/blueprints`
  (Sanity Functions tooling, unused here) wants `jiti` 2 and finds 1.21.7.
- **The journey to a Quote Request, browser-tested (2026-10-22).** Scripted in headless
  Chrome on the GPU against the dev server with throwaway accounts (`qa-journey-…@example.com`;
  four Quote Requests now sit in the shared development database, which nobody is notified
  about). At 1440 px: a guest's non-default kitchen saved through sign-in; the Project's
  "Konfiguration anfragen" opened `/anfrage?project=…` with those finishes and the Richtpreis
  in the summary; the request was confirmed with a reference and listed in `/konto`. The
  session cleared while the form was filled in: submitting said "Ihre Sitzung ist
  abgelaufen." with a sign-in link, the sign-in returned to the same request, and a second
  request went through with its own reference; both are listed in the account. A saved
  Project opened without a session asked for sign-in and reopened with its finishes. At
  500 px the guest save, the request and the account listing passed again without
  overflow. Nothing in the flow broke; what it found is under Known Defects (the typed
  request lost after re-sign-in, no email prefill, a submit before hydration), Known
  Warnings (one hydration mismatch) and Roadmap M2 (the sign-in code limit per address).
- **Only the launched site may be indexed (2026-10-22).** The Vercel test environment
  answered every crawler with an open `robots.txt`, a sitemap and no `noindex`. Now
  `lib/search-indexing.ts` decides once per deployment: indexing needs a production build
  with `SEARCH_INDEXING_ENABLED=true`, and is refused on every Vercel preview and on any
  deployment that still sets `OPEN_ALL_LOCALES` or the email-capture flag. Otherwise every
  response carries `X-Robots-Tag: noindex, nofollow` (`next.config.ts`, so models, film and
  images too), every page `<meta name="robots" content="noindex, nofollow">` (the
  `[locale]` layout), and `robots.txt` names no sitemap. `robots.txt` keeps letting crawlers
  in on purpose: a crawler blocked there never reads the noindex, and URLs it already knows
  can stay listed. Checked on `next start` of the normal build: the header on pages,
  `robots.txt`, the sitemap, the Studio, a GLB, the film, an image, an API route and a 404;
  the meta tag on `/`, `/configure`, `/konto`, `/anfrage`. A second build with the variable
  set had no header rule, the sitemap line back and no robots meta on the homepage. Live on
  Vercel since `1aee72f` was deployed the same evening (see Deployment).
- **A guest's save survives sign-in (2026-10-22).** "Als Projekt speichern" sends a signed-out
  guest to `/konto?intent=save&import=<key>&c=<code>`; the sign-in there returned to bare
  `/konto` afterwards, so the import never ran and the configuration was lost, and its
  "Zum Konfigurator" link opened the default kitchen. The save intent now has one URL
  contract, `features/customer-accounts/save-intent.ts` (`saveIntentPath`,
  `readSaveIntent`, unit-tested), which the configurator writes and the account page reads:
  signed out, the page returns the sign-in to that same URL, and the back link reopens
  `/configure?c=<code>`. Verified in headless Chrome on the GPU against the dev server with
  throwaway accounts: at 1440 px a guest with Porzellan carcass and Fenix Castoro Ottawa
  fronts saved, signed in with the on-screen code, landed on `/konto` with one Project and no
  import error, and the Project opened with those finishes (11.127 €); the same script
  against the old code timed out on bare `/konto` with no Project. At 500 px the bottom-sheet
  save reached the sign-in with the intent intact and the back link restored the guest's
  kitchen, no overflow (the sign-in at 500 px followed in the journey test below; the dev
  server accepts any loopback origin, so its port does not matter). After the import the
  account page still lists the Project rather than opening it in the configurator; that is
  unchanged.
- **Loft view in place of Rendering (2026-10-16).** The Ansicht control reads Studio ·
  Appartement · Loft on desktop and phones; the Rendering segment and the shell's path-tracing
  trigger are gone, the path tracer itself stays in `configurator-canvas.tsx` (an optional
  `pathTracing` prop) for a later entry point. The Loft is the 3ds Max OBJ
  "57-estancia_comedor" (160 MB, centimetres, wire colours only), prepared by
  `scripts/prepare-loft-room.py` as `public/models/loft-room.glb` (0.9 MB Draco, 168k
  triangles): the living half where the kitchen stands (sofa, carpet, coffee table,
  armchair, wall shelves) is dropped, the unfinished zone behind the back wall closed off
  with new walls and ceiling, every object given a real material by name, heavy meshes
  decimated and joined per material. The dining table, six chairs and the record sideboard
  stay. The GLB is authored in the kitchen's source metres, so `loft-room.tsx` only scales
  it by `KITCHEN_MODEL_SCALE`: the kitchen backs onto the left wall (5.3 m, the longest line
  fits) with a full-height glass facade of six windows at its side. Lit like the
  Appartement: one RectAreaLight per pair of windows square to the leaning facade, sun and
  hemisphere from the glass; the furniture casts into the AccumulativeShadows, the shell
  does not. Through the glass lies Berlin: Poly Haven's "Potsdamer Platz" (CC0, Greg Zaal),
  its tonemapped JPG cut to 4K (`public/hdri/potsdamer-platz.jpg`, 1 MB; 8K would hold
  ~170 MB of GPU memory as a cube map), set as the scene background only, turned so the
  towers stand in the facade and raised to intensity 3 so the daylight outshines the room.
  It is a street-level panorama, so the windows show the plaza and the towers' lower
  floors. A small Straße · Skyline switch under the view control (phones: under it, a row
  down) swaps in "Joburg Central Sunset" (CC0, Dimitrios Savva and Greg Zaal; 4K JPG,
  `public/hdri/johannesburg-skyline.jpg`) with warmer window light.
- **Kitchen reflections in the rooms (2026-10-16).** The probe was capturing the room, but a
  0.4 clearcoat lent the fronts under 2 % reflectance, and the panoramas are about as bright
  as the walls, so nothing showed. In the rooms (the probe's presence decides) the surfaces
  now mirror the room as their kind allows (`ROOM_FINISHES` in `kitchen-model.tsx`): satin
  fronts and the quartz worktop polished like lacquer (full coat over a near-smooth base,
  IOR 2.2), veneers under a clear varnish that keeps their grain, matt finishes (Graphit,
  Fenix) only a soft blurred sheen so they still read as matt. The probe
  (`ReflectionProbe` in `room-kitchen.tsx`, replacing drei's CubeCamera, 512 px on desktop,
  256 on phones) captures the view outside ten times brighter, as daylight is against a
  room, and again when the outlook changes. Measured against the first Loft build, in
  Detail the worktop and island sides brighten by a p95 of 24 to 36 of 255 levels where
  they face the glass; the tall Porzellan fronts carry the windows as soft streaks. The
  studio keeps its tuned look. Two headless captures came out black and did not reproduce
  in three reruns of the same sequence (no context loss); watch for it on real devices.
- **Italic serif spacing (2026-10-16).** `em` sets `letter-spacing: 0`: Instrument Serif
  is narrow already and inherited the headlines' tracking (down to -0.05em on the hero). The reflection probe
  and the room-scene preparation are shared with the Appartement in `room-kitchen.tsx`;
  `kitchen-scene.tsx` keeps one table of rooms (component, presets, camera box).
  Verified in the browser pane against the production build: desktop 1440 px (all three
  cameras, a front change re-renders the scene, no console errors) and a 390 px phone (the
  three-way control fits, no horizontal overflow; the portrait framing is as tight as the
  Appartement's).
- **Appartement exchanged for the defgrp room (2026-10-16).** The baked living room
  (`appartement2.glb`, BlendSwap #86344) and its component are gone. The Appartement is now
  the empty room with three tall mullioned windows from the defgrp-3d-configurator prototype
  (`public/models/newroom/newroom.glb` there), prepared as `public/models/apartment-room.glb`:
  plank floor, a stray candle and a coffee cup dropped, Draco-compressed, 10 MB to 1 MB
  (a one-off glTF-Transform run: drop the nodes by material, `prune` keeping attributes,
  `dedup`, `draco`). `features/configurator/engine/apartment-room.tsx` scales the room with
  the kitchen and 15 % beyond, so it reads as an old building with a 3.3 m ceiling (at true
  proportions the camera had under two metres in front of the island), turns it so the
  windows face the fronts, and backs its 5.67 m wall onto the kitchen, which the longest
  line fits. It is lit in real time: one RectAreaLight per window, sun and hemisphere from
  the window side, a warm bounce panel on the back wall in raster mode, the studio HDRI as
  fill; the kitchen keeps its cube-camera probe and the AccumulativeShadows on the shared
  wood floor. The window view shines its own picture (the export had lost its emission
  map). Cameras: a wider lens in the room (54°, 72° on phones), new presets (Detail looks
  across the island to the windows on desktop, at the island corner on phones) and a
  boundary that keeps camera and target inside the walls. Rendering fix found on the way:
  the path tracer read the camera once, when it took the scene, and otherwise waited for
  a `change` event camera-controls never sends, while the preset reached the rebuilt
  controls only on the 300 ms retry; so every Rendering came from the canvas's start-up
  camera (4.2, 2.4, 5.6), which in the room sits inside the window wall. `PathTracingSync`
  now follows the controls' `update` events and the framing effect reruns when the
  default controls change, so Rendering shows the chosen view in both scenes. Verified on
  desktop and a 375 px phone in the browser pane, and raster plus path-traced in headless
  Chrome on the GPU (Metal) against the production build. `scripts/bake-appartement2.py`
  serves no scene any more.
- **Sanity pagebuilder and locale routing (2026-10-01 to 10-08).** Plan, decisions and the
  evidence for each phase are in the [spec](.scratch/sanity-pagebuilder/spec.md); Phases
  1–7, 9a and the functional copy of 9b are done; 8 and the rest of 9b (native review,
  switch on functional screens, launch) are open (see Missing).
  - Locale routing: every page lives under `app/(site)/[locale]/`. German has no prefix —
    `proxy.ts` rewrites `/x` to `/de/x` and answers `/de/x` with 308 to `/x`. `/en` and `/es`
    open only once listed in `LAUNCHED_LOCALES` (`lib/i18n.ts`, today `["de"]`); an
    unlaunched prefix is a 404 inside the site layout. `pnpm dev` opens all three
    (`OPEN_LOCALES`), and Editorial Preview may show them (`lib/locale-gate.ts`).
  - Embedded Studio at `/studio` (`app/(studio)`, its own root layout without the site CSS;
    `sanity.config.ts`), project `06g3ozu4`, private dataset `development` with synthetic
    content only. Without `NEXT_PUBLIC_SANITY_PROJECT_ID` the site runs in demo mode from
    `content/` and the Studio shows a setup notice (`sanity/env.ts`).
  - Pagebuilder: one folder per block, `blocks/<name>/{schema.ts, Component.tsx, demo.ts}`,
    listed in `blocks/schemas.ts` and `blocks/registry.tsx`, rendered by
    `components/page-builder/page-builder.tsx` with a per-block error boundary. Eight blocks
    make up the homepage (`heroFilmBlock`, `statementBlock`, `promisesBlock`,
    `materialsBlock`, `configuratorBlock`, `roomStoryBlock`, `collectionsBlock`,
    `closingBlock`); `page` and `navigation` are localized per document. The homepage and the
    header and footer navigation come entirely from Sanity; `lib/content.ts` and
    `components/sections/` are gone. TypeGen runs as `prebuild`; `schema.json` and
    `sanity.types.ts` are committed.
  - Catalog seam `features/configurator/catalog.ts`: `resolveProduct(productKey)`, the Studio
    option lists for products and finishes, preset state and pricing. Prices never live in
    Sanity; an unknown key drops link and price instead of guessing.
  - `pnpm sanity:seed` (`scripts/seed-sanity.ts`) writes the content of `content/` into
    `development` with deterministic ids, uploads the media, reads everything back through
    the site's own queries, keeps existing documents unless `--replace` is passed and refuses
    `production` without `--allow-production`.
  - Presentation tool, draft mode (`/api/draft-mode/{enable,disable}`) and live preview.
    `<SanityLive />` mounts only in draft mode and in development, so public visitors open no
    connection to Sanity, and blocks carry `data-sanity` attributes only in preview.
  - Tailwind scans `blocks/` (`889c51d`). The move had dropped 80 of 627 selectors and
    collapsed the hero while the markup stayed identical; `lib/tailwind-content.test.ts`
    guards it, and rendering checks now compare CSS and screenshots, not only markup.
  - Language switch in the header and the phone menu (`lib/language-links.ts`,
    `components/design-system/language-switch.tsx`). It lists only locales the visitor can
    open, so it stays hidden publicly until English and Spanish launch.
  - English and Spanish homepage and navigation (Phase 9a): transcreated copy in
    `content/home/{en,es}.ts`, seeded into `development` and linked as translations; the
    interface words on editorial pages in typed dictionaries `lib/messages/{de,en,es}.ts`.
  - The configurator HUD chips sit on solid soot (`chip-solid`) instead of frosted glass
    (2026-10-08).
  - Functional screens in three languages (Phase 9b, `4611243`, 2026-10-15): configurator,
    shared view, sign-in and account, Anfrage, 404 and `AppHeader` read their words from
    `lib/messages/{de,en,es}.ts` through `LocaleProvider` / `useMessages()`. API routes
    answer `{ code }` (`lib/api-errors.ts`) and the screens word the code; links, return
    paths and share links keep the locale; the sign-in email follows the page
    (`x-site-locale`). Evidence and the remaining steps are in the spec's Phase 9 section.

- Built the first Tailwind/Next.js design system pass from the Figma directions.
- Design-system primitives (rebuilt 2026-09-03 for the dark system, `components/design-system`):
  `BrandLogo`, `SiteHeader` (frosted on scroll, full-screen menu on phones), `SiteFooter`,
  `AppHeader`, `Pill` (primary / secondary / ghost) and `RoundButton`, `Glass`, `GlassBadge`,
  `GlassSegments` (sliding highlight, red dot), `Card`, `MediaCard`, `Label`, `SectionIntro`,
  `Reveal` (the one entrance), `Overlay` (portal sheet or card, focus and scroll handling),
  `MotionProvider` (`reducedMotion="user"`). Motion constants live in `lib/motion.ts`.
- Configurator on the dark system (`features/configurator/ui`): `configurator-hud.tsx`
  (brand, stage/view/camera chips, scene actions, save state), `datasheet-panel.tsx`
  (summary rows, accordions, foot; card on desktop, sheet on phones, one mounted at a time
  via `lib/use-media.ts`), `material-overlay.tsx` (live choice, cancel restores),
  `project-save-controls.tsx` (autosave for the life of the configurator; decision
  states as a card over the scene). Studio stage darkened in `kitchen-scene.tsx`.
- Studio rendering pass (2026-09-03): temporal supersampling (`accumulation-pass.ts`,
  `temporal-accumulation.tsx`: Halton-jittered camera, 32 frames blended while still; the
  composer's multisampling is off because its depth resolve is refused on some GPUs),
  Poly Haven's "Brown Photostudio 02" HDRI (CC0, supplied 2026-09-03, downsampled to 1k as
  `public/hdri/brown-photostudio-02.hdr`) lighting both the studio and the kitchen in the
  Appartement (the baked `appartement2_pano.hdr` is retired; the bake script can regenerate
  it); Poly Haven's "Wooden Floor 01" (CC0, 2k diffuse/normal, 1k roughness in
  `public/textures/wood-floor-*.jpg`) as the studio's reflective floor and as a lit floor
  plane over the Appartement's baked one, with AccumulativeShadows in both scenes (the
  furniture casts too). Constraint learned the hard way: every RandomizedLight adds a shadow
  sampler to every lit material; a front with map, normal, roughness and environment holds
  five of the sixteen guaranteed units, so keep `amount` at six. Surface tiles from
  `scripts/generate-studio-assets.py` (`public/textures/*`), AccumulativeShadows on a
  MeshReflector floor, a rim light, AgX at exposure 1.12, world-scaled planar UVs so grain
  runs across fronts, a quartz worktop. The cube-camera probe left the studio (it only saw
  the black stage; the void wall is unlit). Finish scans wrap mirrored so their tile edges
  never draw lines across a front. Checked: a bevel pass is pointless — the prefabs already
  carry rounded edges (max face angle 20.6°). Still open: the finish scans are 325–512 px;
  2k tiles of Nussbaum Memory and the two Fenix decors from the manufacturer are the next
  visible step.
- Drag-to-place and three islands (2026-09-03): in an Edit Session the Datenblatt's Aufbau
  section shows an element palette (`element-palette.tsx`); dragging a tile into the scene
  shows the real prefab as a red, glowing wireframe ghost at the line end the pointer is
  nearer (probe in `kitchen-model.tsx`, `KitchenEditProps.drag`), letting go adds it there;
  tapping adds on the right. Islands: Ohne (0), Insel (4), Große Insel (5 — one more front
  unit; the back row `["90","60","60","90","60"]` stretches evenly to close on the right end
  panel, `getIslandBackStretchM`, `ModulePlacement.scaleX`). Sizes 2 and 6 stay valid for
  stored configurations but are no longer offered.
- Photo first (2026-09-03): a signed-in person without a Project takes a photo straight
  away — the photo card asks for a Project name, `POST /api/projects` (now accepts `name`
  and returns version/updatedAt) creates it, the shell switches to it without a reload and
  the photo continues. Projects can be renamed inline (`ProjectNameField` in the photo card
  and the Datenblatt; `PATCH /api/projects/[projectId]`, `projects.renameProject`, covered
  by the persistence contract test). Gates: `pnpm test:db` 62/62 (+1 skipped).
- Account, sign-in, Anfrage, shared-link states restyled with `components/design-system/field.tsx`
  (the one underline input) and the pill/card primitives.
- Homepage sections (built 2026-09-03 in `components/sections`, blocks under `blocks/` since
  2026-10-02): `SignatureHero` (the supplied hero film, a
  15-second silent loop transcoded with ffmpeg into `public/video/hero-1080.mp4` (8 MB,
  ≥768 px) and `hero-720.mp4` (2 MB, phones), poster `public/images/hero-poster.jpg` from
  the same film; fade from black, still for reduced motion, "Den Film ansehen" goes
  fullscreen; headline
  "Küchen, auf den Punkt." rescued from the first site), `Manifest` ("Eine
  Küche ist kein Möbel…" rescued; the one scroll-linked sequence: words light up on scroll),
  `SignaturePromises` (each promise opens a detail card that morphs out of its "+" trigger
  via a shared layoutId), `MaterialCards` (four fronts incl. Porzellan as a colour card;
  tilt toward the pointer; detail cards with facts, the real surcharge from the product
  definition and a deep link that opens the configurator with that front chosen; band on
  phones), `ConfiguratorTeaser` (living HUD, real default price, "Von 0 auf 100 °C in vier
  Klicks" spring counter, four-step explainer overlay), `RoomStory` ("Ihr Raum. Ihre Küche."
  rescued: Studio, Appartement, KI-Foto, Versionen & Links), `CollectionLines` (captions
  rescued as badges), `ClosingStatement`. The copy lived in `lib/content.ts`; it is Sanity
  content now, with the demo copy in `content/`. No Impressum/Datenschutz pages exist yet,
  so the footer carries no legal column.
- Moved navigation outside the hero and converted it to a fixed floating navbar with motion-based hide/show behavior.
- Improved hero typography animation with staggered motion.
- Added `/configure` as the first 3D configurator route.
- Built an isolated configurator feature module under `features/configurator`.
- Added a straight-line kitchen scene using React Three Fiber, drei, and Three.js.
- Loaded `public/models/kitchen-line.glb` into the configurator as the active kitchen model.
- Added heuristic GLB material mapping so cabinet/korpus and front colors affect the imported model.
- Segmented the kitchen asset into named module prefabs (`kitchen-modules.glb` + manifest) via a headless Blender pipeline: 8 wall modules, 8 island units, 2 island ends, 6 continuous elements, roles baked into mesh names. The runtime now composes the scene from prefab placements with verified exact geometric parity (per-mesh world bounds within 1e-6) against the previous monolithic model — the foundation for module-level configurability.
- Introduced Product Definition v2 (`rdtdot-signature-kitchen-v1@2`) with a Wall Module catalog, Island Sizes, sum-of-parts pricing calibrated to the historical v1 base price, and per-module finish weights. Configuration state v2 (`wallModules`, `islandSize`) flows through a discriminated-union contract, version-aware hashing (v1 hashes stay byte-compatible; v2 hashes are key-order independent), the URL codec (legacy v1 guest URLs upgrade with finishes preserved), and versioned revision display snapshots. Per the agreed posture, v1 stays parseable but unsupported: v1 revision restore returns 409, v1 shared links resolve to 410.
- Fixed two pre-existing versioning bugs: the shared-revision resolver now checks the supported-version allowlist instead of current-version equality, and shared views no longer silently fall back to the live recomputed price when a pinned display snapshot is unavailable ("Preis nicht verfügbar" instead).
- Made the 3D scene state-driven: the composition engine places module prefabs from `wallModules`/`islandSize` (variant cycling, centered lines, stretched or regenerated continuous elements including a plain worktop for non-default island sizes), verified against the as-authored default within 2mm and live in the browser with exact sum-of-parts prices.
- Added the module Edit Session: a transactional edit mode (desktop/tablet) with a real-material edit treatment (modules slightly transparent, signature-red wireframe on the selected element), click-selection in 3D and in a proportional module strip, add/remove/move/type-swap with live constraint enforcement (min 2 modules, max 5.4m, device cap), island size selection, ghost add-slots at the line ends, live price preview, and Übernehmen/Verwerfen semantics that leave the committed configuration untouched until applied.
- Added the Appartement2 visualization: a Cycles-baked living-room environment produced by a reproducible headless pipeline (`scripts/bake-appartement2.py` — per-object Smart-UV bake of combined lighting with filmic exposure compression, lampshade decimation, Draco GLB export, plus an equirectangular HDR panorama rendered at the kitchen anchor that lights the dynamic kitchen through the same reflection-probe pattern as the first Appartement). The kitchen line backs onto the painting wall, rotated into the room with the island toward the center; two full-height slat room dividers from the source scene are removed at load.
- Added stylized appliance fronts (dark glass oven panel + handle bar) generated into device cabinet niches under a dedicated appliance scene role.
- Added the itemized price presentation: an expandable "Aufstellung" in the configurator panel and full line-item breakdown in the fake checkout, both driven by the v2 sum-of-parts quote (module counts, island units, per-meter worktop, finish deltas, tax).
- Made the scene bar the editing interface during an Edit Session: the module strip and the edit controls now live in the same bar that carries the scene, so entering an Edit Session restyles the existing surface instead of opening a second competing panel.
- Added drag-and-drop module reordering with `motion/react` `Reorder`, and restyled the edit bar around it. The reorder path replaced the earlier arrow-button-only rearrangement (net −231 lines in `module-editor.tsx`).
- Added the photo artifact storage foundation (ADR 0011, PLAN.md Phases 1–2 partial): `photo_job`, `source_capture`, and `generated_photo` tables with composite foreign keys that keep every artifact inside its own Project, state constraints that forbid provider work on a job with no validated capture, and indexes for the per-Project gallery, the account-wide profile gallery, and reconciliation sweeps.
- Added the object storage boundary: a self-hosted S3-compatible RustFS deployment behind a purpose-built Interface (`features/object-storage/object-storage-module.ts`), with a server-only adapter that presigns single-use uploads bound to an exact content type and byte length, presigns short-lived reads, confirms what actually landed, and deletes idempotently. No S3 client type, bucket name, or endpoint crosses the seam. The bucket is private; no object is served from a public URL.
- Made object deletion unorphanable: a database trigger records a deletion intent in the existing outbox whenever a row owning a stored object disappears — including via `ON DELETE CASCADE` from Project trash or Customer Account deletion, where no application statement observes the row. A sweep worker drains those intents with claim-and-backoff semantics and surfaces unreconciled objects. Verified against the real database, including the cascade path.
- Added the photo gallery read path: an owner-scoped module (`features/photo-gallery/photo-gallery-module.ts`) that lists a Project's Generated Photos and the account-wide profile gallery through a single authorization predicate, resolves each row's storage key into a short-lived presigned display URL, grants owner-only downloads with an attachment filename, and deletes a photo by removing the row so the storage trigger records the object's deletion. Cursor-paginated newest-first, matching the version-history style. Exposed as `GET /api/photos`, `GET /api/projects/[projectId]/photos`, and `GET`/`DELETE /api/photos/[photoId]`, all `private, no-store`.
- Verified the storage path against the live RustFS deployment: presigned upload, stat, presigned download, exact-length rejection, and idempotent delete all pass (`tests/integration/object-storage-live.test.ts`, skipped when storage is unconfigured). An end-to-end run also confirmed a `generated_photo` row resolving to a display URL that returns the exact bytes, anonymous access to the same object being refused, and the object disappearing from the bucket after the deletion sweep.
- Added the photo gallery UI on both surfaces: the account-wide gallery in `/konto` and the per-Project gallery in the configurator panel, sharing one component. Tiles hold their intrinsic aspect ratio from the stored dimensions so nothing shifts as images arrive, a lightbox carries download and delete, and every surface carries the ADR 0008 illustrative-image disclosure. Presigned display URLs are re-minted on a timer shortly before they lapse and on image error, so a gallery left open does not decay into broken images. The first page is server-rendered — both pages are `force-dynamic`, so short-lived URLs are never cached — and later pages arrive by cursor. A `density` prop drops the configurator panel to two columns, since its width is far narrower than any viewport breakpoint can detect.
- Added the Photo Job Module (PLAN.md Phase 1 and the Phase 2 validation path): requesting a photo atomically checkpoints the Working Configuration into a `trigger = 'photo'` Configuration Revision and creates the job against it under expected-version concurrency, so a photo is always attributable to an exact immutable configuration rather than to whatever the canvas showed (gap G5). Requests are idempotent, owner-scoped, and bounded by a per-account daily ceiling.
- Added Source Capture validation: the capture is uploaded through a single-use presigned grant bound to an exact content type and byte length, then confirmed server-side by fetching the stored object and decoding its header. Dimensions and format are read from the bytes, never taken from the client, and a capture that is missing, oversized, not an image, or out of dimension range fails the job with a recorded reason (gap G4).
- Added the provider adapter seam and its Replicate implementation. SDK types, prediction identifiers, and delivery URLs stop at the adapter. Prompts are built from the pinned revision's configuration and an approved Scene Preset, never from client input (gap G6). A module-level kill switch (`PHOTO_GENERATION_ENABLED`, default off) disables generation while request, status, list and cancel keep working (gap G11).
- Photo rows are now written by the application: a run validates the provider's output by decoding it, persists the bytes to EU object storage, and only then inserts the Generated Photo and marks the job succeeded (gap G3). Jobs claim themselves before running, so two concurrent runs produce one photo. Verified end to end against the live RustFS deployment and the real database: request, presigned upload, server-side confirmation, run, and the resulting photo appearing in the gallery at its true decoded dimensions.
- Wired the configurator's photo UI onto the Photo Job API and **retired the prototype route**. `app/api/photo/route.ts` is deleted rather than gated, which closes PLAN.md Phase 0 by removal: there is no longer an unauthenticated route that can spend provider credits. The capture now travels as bytes through a single-use presigned grant instead of a data URI in a JSON body, so the old ~256KB provider limit no longer shapes capture quality.
- The photo popover enforces the ADR 0008 ownership rule in the interface: a guest configuration is offered "Als Projekt speichern" instead of a generate button, and a Project whose current version cannot be read is told to wait for the autosave rather than pinning the wrong configuration. Progress is reported per step (übertragen/geprüft, then erzeugt), and the result carries the illustrative-image disclosure and a per-request download grant.
- Added `GET /api/projects/[projectId]/configuration` returning the current Working Configuration version, so a caller that must pin an exact configuration reads it rather than guessing; a change that lands in between makes the photo request 409.
- Made the Replicate adapter diagnosable. The capture now reaches the provider as a typed Blob, which the SDK uploads through its Files API and passes to the model by URL, instead of a base64 data URI that inflated a 1.5 MB capture to ~2 MB inside the prediction body. Failures no longer collapse to a bare `provider-error`: HTTP rejections map to stable, customer-safe codes (`provider-unauthorized`, `provider-billing`, `provider-rejected-input`, `provider-rate-limited`, `provider-error`, `provider-prediction-failed`, `provider-timeout`), the provider status and message are logged as operator detail that is never persisted or shown, and the prediction id is recorded as `providerReference` on failed jobs too. The generation timeout is now an `AbortSignal`, so a prediction that overruns is canceled at the provider rather than left spending; a hard bound still abandons a run the provider refuses to cancel. Covered by unit tests with an injected client (`lib/server/photo-jobs/replicate-adapter.test.ts`).
- Repaired `.env.example`: five variables lacked their `=` and the kill switch read `PHOTO_GENERATION_ENABLED=false=`; the key set now matches `.env.local` exactly.
- **Governed Photo Jobs (PLAN.md Phase 4) and finished their customer flow (Phase 5).** Every execution is now attributable: migration `20260903100000_photo_governance.sql` adds immutable, approved `prompt_template_release` and `model_release` rows (one active per kind, enforced by partial unique indexes) and seeds Release v1 of each from the standing product decisions — the in-code prompt as the template with its four Scene Presets, and `qwen/qwen-image-2-pro` as the official-unversioned model with license, expectations, safety notes, pricing basis, a 5-cent estimate and the live runs of 2026-09-02 as evaluation evidence. A job pins both release ids, the rendered prompt and the cost estimate at submission; the prompt's product facts come from the pinned revision under its own Product Definition version, and a request for a Scene Preset the active release does not approve is refused with 400. Spend is bounded twice and independently: the per-account quota at request (default 25 per rolling 24 h) and a provider-wide breaker at submission (default 200 jobs or 20 € of estimates per rolling 24 h, overridable via `PHOTO_CUSTOMER_DAILY_JOBS`, `PHOTO_DAILY_BUDGET_JOBS`, `PHOTO_DAILY_BUDGET_CENTS`); a refused submission returns 503 with retry-after and leaves the job capture-ready. The provider's reported compute time is recorded per job. A drift test guards that the seeded presets equal the ones the configurator offers and that Release v1 renders exactly what the pre-governance code produced. On the customer side, a Project with a job in flight picks it up again after a page reload and shows its progress without a capture preview.
- **Made Photo Jobs survive the browser (PLAN.md Phase 3, step 5 of the confirmed sequence).** The provider call is now a submission: `POST /api/photo-jobs/[jobId]/submit` hands the capture-ready job to Replicate as a prediction with a webhook and returns 202; the browser polls `GET /api/photo-jobs/[jobId]`, and closing the tab loses nothing. Completion arrives through `POST /api/webhooks/replicate`, where the adapter verifies the delivery against the account's signing secret and normalises it, and the module records it in an idempotent inbox (`photo_job_provider_event`, unique on the delivery id) before applying it. Every read of an in-flight job also reconciles with the provider (throttled to one call per four seconds per job), so a lost webhook is recovered by the next poll; `POST /api/photo-jobs/sweep` (token-protected, not yet scheduled — same posture as the storage sweep) does the same across owners. A job with no terminal outcome after ten minutes is reported uncertain and after thirty is failed with a best-effort provider cancel. Success is still declared only after the validated bytes are in EU storage; a webhook and a reconciliation racing on the same job file exactly one photo (conditional claim plus the photo row's unique job reference). Evidence columns record model, submission, completion and last provider check. Migration `20260902230000_photo_job_provider_events.sql` applied to the dev database. Not yet configured anywhere: `REPLICATE_WEBHOOK_SIGNING_SECRET` and `PHOTO_WEBHOOK_URL` (locally the application is unreachable from outside, so jobs complete by reconciliation), and `PHOTO_SWEEP_TOKEN`.
- **Restructured the configurator panel around the customer's three decisions** (the critique's second P1, step 4 of the confirmed sequence). The panel now stages **Material** (Korpus, Front), **Aufbau** (the module line as a read-only strip with counts and island size, and the one button that opens the Edit Session in the scene bar) and **Prüfen** (Aufstellung open by default, project save state, versions, share links, gallery, and the guest actions) behind an accessible tablist with arrow-key navigation; one stage is visible at a time and the scene stays persistent. Entering an Edit Session lands on Aufbau. Render and the environment tabs became one labelled **Ansicht** control (Studio · Appartement · Render) with a one-line explanation of what each shows, which also starts to answer the critique's "no contextual teaching" finding. The scene bar keeps text labels on Bearbeiten and Foto at every width (icon over label below 640px, five columns at 350px without overflow). Below the desktop breakpoint the Richtpreis row and primary action are fixed to the bottom of the viewport with safe-area padding, because `main` clips overflow and a sticky foot could never reach the window there. Shared views keep their single document layout.
- **Gave the kitchen module model a real Asset Manifest (ADR 0009).** `features/configurator/modules/kitchen-asset-manifest.json` is built by `pnpm assets:manifest` from the GLB and the segmentation output: the model's SHA-256 and byte size, an explicit mapping of all 122 mesh nodes to their Semantic Scene Role, prefab and material slot, the module placements, measured budgets against declared limits (1 MB / 76,926 triangles / 122 draw calls against 2 MB / 120k / 200), approved studio cameras, the Deterministic Visual Fallback poster, compatibility and provenance. The manifest is parsed with zod at import and its invariants checked there, so a missing required role or an exceeded budget fails the build rather than the customer. The engine now resolves roles only through it — `classifyMesh` (bounding-box heuristics) and the mesh-name prefix parser are gone; an unmapped node throws, and runtime-generated meshes (appliance fronts, worktops) carry their role explicitly. A release-gate test (`asset-manifest.test.ts`, in `pnpm test`) reads the GLB on disk and fails on any drift between bytes, nodes, roles, prefabs, triangle counts, placements and the manifest. Studio camera presets come from the manifest. The canvas is wrapped in an error boundary that swaps the scene for the approved poster on any thrown error, including a failed WebGL context — the configuration panel stays usable. (Not the Canvas `fallback` prop: fiber renders that as canvas child content, which screen readers announce even while 3D works.) The boundary was exercised for real: the first wiring missed the generated oven front, the poster appeared with the panel intact, and the console named the node.
- Retired the heavy first Appartement scene (decided 2026-09-02): the 27 MB `kitchen1.glb` with its generic node names, the `qwantani_dusk_1k.hdr` it was lit with, its model component and the `optimize:apartment` script are gone, and `public/` drops from ~38 MB to ~10 MB. The baked living-room scene is now the one "Appartement" (mode key `apartment`, label without the "2" the critique flagged as prototype language); its source files keep their `appartement2` names until the placeholder asset is exchanged. Visualization is local UI state, so nothing persisted or shared had to migrate.
- **Shipped the Quote Request vertical slice (ADR 0012)** — the design critique's P0. A Quote Request Module behind the Project seams (`features/quote-requests/`, `lib/server/db/quote-requests-postgres.ts`, `lib/server/quote-requests/`) checkpoints the Working Configuration into a `trigger = 'quote'` revision under expected-version concurrency and records contact, consent version, note and a server-computed Price Indication in the same transaction, plus a `quote-request.submitted` outbox intent for the notification that waits on ADR 0010. Idempotent on the creation key, owner-scoped, capped at ten per account and day, readable references such as `A-QB68 4BCF`. API: `POST`/`GET /api/projects/[projectId]/quote-requests`, `GET /api/quote-requests`, `GET /api/quote-requests/[id]`, all private and uncached. UI: `/anfrage` (signed-in Project → labelled form with consent and live outcomes → confirmation with reference and pinned configuration; guest → save-first; signed-out → sign-in and return), an "Anfragen" section in `/konto`, and the configurator's "Konfiguration anfragen" pointing there. The cart indicator, `/checkout` and the word "Checkout" are gone; `/checkout` redirects to `/anfrage`. Migration `20260902200000_create_quote_requests.sql` applied to the dev database.
- **Generation works.** Three controlled paid runs on 2026-09-02 found and fixed the real cause of the opaque provider failures. Runs 1 and 2 (`k449ce4yphrmt0d0cc89v8msqw`, `500438hh8nrmr0d0ccaryy52mm`) failed in 2 s with `Invalid image format ''` whether the SDK uploaded an unnamed Blob or a named File: the SDK's Files API URL (`api.replicate.com/v1/files/<id>`) is a metadata endpoint that needs the account token, and this model hands its input URL to a downstream service that fetches without credentials, receives a JSON 401, and rejects the "image". Run 3 (`rpbj81t445rmw0d0ccc867s3nc`) succeeded in 17 s once the adapter received a short-lived presigned URL to the capture in the application's own storage — the same 300 s grant the module already reads the bytes through. `PhotoGenerationRequest` now carries that `captureUrl`; the File upload remains as fallback. Output was a 1024×576 PNG probed as an image. The run is reproducible by name via `tests/integration/replicate-live.test.ts` (`REPLICATE_LIVE_TEST=1` plus a capture path; it uploads to storage, presigns, generates, and cleans up) and skips otherwise. The old data-URI transport was never the cause; it was simply replaced on the way.
- Gave the application surfaces one shared header (`AppHeader`) covering the configurator, account and checkout routes: the wordmark always goes home, one contextual action is labelled with its destination, and the account entry appears wherever it is not the current page. The sign-in screen previously had a single link — the wordmark — so reaching the configurator meant going via the homepage.
- Made the configurator panel a fixed-height scroll region with a pinned foot. The panel carried `min-h-screen`, which is a floor rather than a ceiling, so it grew past the viewport and its `overflow-y-auto` never had a constrained height to scroll within. Measured before: 1.358 px of panel in a 900 px viewport with no scroll container, the Richtpreis at y=1070 and the primary action at y=1183 — both below the fold, and reaching them scrolled the 3D scene out of view. After: the page no longer overflows, the panel scrolls inside itself, and the price and primary action stay in view while finishes are compared. Mobile keeps the stacked sheet unchanged.
- Added color configuration for:
  - cabinet/korpus finish
  - front finish
- Added camera views:
  - room/signature
  - front
  - detail
- Added shareable URL state using a compact `?c=` query parameter.
- Added application-owned Customer Accounts with Better Auth email-code sign-in and server-side session resolution.
- Added the PostgreSQL Project Module, migrations, and a Project/Working Configuration persistence contract behind server-only seams.
- Connected guest “Als Projekt speichern” handoff to idempotent Project creation after sign-in.
- Saved Projects now open at `/configure?project=<uuid>` only for their owner; an expired session returns to that Project after re-authentication.
- Active saved Projects autosave the Working Configuration with expected-version optimistic concurrency. A 409 conflict leaves the remote Project unchanged and offers load-latest or save-as-new.
- Added browser-local, Project-scoped recovery drafts for unconfirmed changes, including stale-draft save-as-new handling.
- Confirmed autosaves advance the Working Configuration version and update the Project timestamp used in the account workspace.
- Added explicit “Version speichern” checkpoints for active Projects. They create or reuse an immutable Configuration Revision from the confirmed Working Configuration and remain separate from autosave.
- Added an owner-scoped, cursor-paginated Project version history with historical finish and price display snapshots resolved from the Configuration Revision's pinned Product Definition version.
- Added optimistic-concurrency-controlled version restoration. A restore first preserves the displaced Working Configuration as an immutable “Vor Wiederherstellung” safety version, then restores the selected Configuration Revision and its Product Definition identity.
- Added owner-scoped Shared Revision Links for active saved Projects. Owners can create, list, and permanently revoke 90-day links fixed to an immutable Configuration Revision.
- Shared-link secrets are generated in the browser and placed in the URL fragment. The database stores only the SHA-256 hash, and the complete link is shown only at creation time.
- Added the public `/share/[linkId]` selected-state presentation. Its POST-only resolver is private/no-store, noindex/nofollow/noarchive, and no-referrer; it exposes no Project or Customer Account data, AI-photo action, configuration mutation, or Quote Request handoff.
- Existing links remain available while a Project is archived and become unavailable when it is trashed. Public resolution currently fails closed unless the revision uses the active supported Product Definition version.
- Added `/checkout` as a fake checkout/request handoff that reads the shared configuration.
- Added a temporary product-definition contract in `features/configurator/product-definition.ts`.
- Added a Sanity adapter stub in `features/configurator/adapters/sanity.ts` (superseded: the
  queries are the adapter, see Missing).
- Updated homepage/nav CTAs to point to `/configure`.
- Added R3F-related dependencies:
  - `@react-three/fiber`
  - `@react-three/drei`
  - `three`
  - `@types/three`
  - `lz-string`
  - `lucide-react`

## Verified Previously

- The earlier configurator slice passed lint and build, rendered a nonblank 3D canvas on desktop and mobile, and showed that color and camera changes affect the imported GLB scene.
- The shareable URL flow and fake checkout handoff preserved the configuration; mobile checkout overflow was fixed.

## Current Slice Verified (Quote Requests, 2026-09-02)

- Contract tests against the real database (`tests/integration/quote-request-contract.test.ts`, 7): one-transaction checkpoint with `trigger = 'quote'` plus outbox intent; replay on the same key; refusal of the same key with different data; revision reuse for an unchanged configuration and version-drift conflict; owner scoping and refusal of archived projects; nothing written for an unsupported Product Definition; cursor pagination across the account and per project; the daily cap.
- Browser, dev server, signed in as a throwaway test account: `/anfrage` signed-out shows sign-in and returns after the code; `/anfrage?c=…` as a signed-in guest offers "Als Projekt speichern", which created the project; `/anfrage?project=…` rendered the labelled form with the live summary (10.103 €); submit was disabled until consent; `POST` returned 201 and the confirmation showed `A-QB68 4BCF`, the lower-cased email and the pinned configuration; `/konto` listed the request with reference, date, "Eingegangen" and Richtpreis; `/checkout?c=abc` redirected to `/anfrage?c=abc`; the homepage header carries no cart; the project's configurator links "Konfiguration anfragen" to `/anfrage?project=…`.
- Gates: `tsc --noEmit` clean, `pnpm lint` clean, `pnpm test` 64/64, `pnpm test:db` 47/47, production build green.

## Previous Slice Verified (module configurability, slices S1-S5)

- Geometric parity of the segmented module composition against the previous monolithic model: per-mesh world AABBs within 1e-6, close-up view pixel-identical.
- The default v2 configuration reproduces the historical total of 10.103 € to the cent; every finish combination matches its v1 total (unit-tested); layout changes reprice exactly (verified by hand and in the browser: module removal 9.722 €, compact layout 5.899 €, big/device/device/big with large island 10.470 €).
- Edit Session verified end-to-end in the production build: Verwerfen rolls back, Übernehmen commits into URL/autosave, committed-config actions hide while staged; the holo treatment, 3D selection, ghost slots, and module strip all operate; the flow also survived unscripted human interaction in the live pane.
- Appliance fronts render in device cabinet niches with the dedicated appliance role.
- `pnpm test` 39/39, `pnpm test:db` 8/8 against the Neon test database, `pnpm lint` and production build green throughout; each slice committed separately.

**Edit Session tail verified 2026-09-02** in the production build on `cc/devstart-002`:
enter via Bearbeiten, add a module through the 3D ghost slot, drag the new slot from
position 1 to position 3 in the strip (the wall geometry recomposed on the drop), Fertig
committed `big,device,small,small,small,small,small,device,big` into the URL, and the bar
morphed back to camera navigation. The pass found and fixed one real bug: a module added
from the 3D ghost slot did not appear in the strip, which kept its own stale slot list
(`features/configurator/ui/edit-slots.ts` now reconciles the strip against the draft;
unit-tested). Caveat for anyone repeating this: the Browser pane throttles
`requestAnimationFrame` to zero while hidden, so `motion` drags and bar transitions only
progress when frames are pumped (screenshots do it). A human drag in a visible pane is
still the friendlier check, but the flow is no longer unverified.

## Previous Slice Verified

- The Shared Revision Link migration was applied to the Neon QA database.
- `pnpm test` passes 14/14 unit tests, `pnpm test:db` passes 8/8 database integration tests, and `pnpm lint`, `pnpm build`, and `git diff --check` pass. The production build uses the required `TRANSACTIONAL_EMAIL_PROVIDER` environment override.
- Database coverage confirms immutable checkpointing, idempotent concurrent creation, owner scoping, secret mismatch rejection, revocation, expiry, and independence from later Working Configuration changes.
- At 1440px desktop and 390px mobile widths, the public shared-revision surface retained one nonblank canvas, had no horizontal overflow, and produced no browser-console errors.
- The Impeccable finish reviewer returned `PASS` for the public share surface.
- The current Three.js deprecation and PostgreSQL SSL forward-compatibility warnings remain known non-blockers.

## Build & Verification Gates

How to reproduce the reconciliation results:

```
pnpm lint                                  # 0 errors, 1 warning (exit-preview.tsx)
pnpm exec tsc --noEmit                     # clean; on a fresh clone run `pnpm exec next typegen` first
pnpm test                                  # 190/190
pnpm test:db                               # 93 passed, 1 skipped (TEST_DATABASE_URL, or Docker for a container per file)
TRANSACTIONAL_EMAIL_PROVIDER= pnpm build   # green; prebuild runs TypeGen, postbuild checks the server bundle
pnpm test:smoke                            # 2 passed; needs a build that runs on port 3100 (below)
```

CI (`.github/workflows/ci.yml`) runs all of these on every push and pull request, each
job against a database of its own. The smoke test needs a production build with the
development email capture (`TRANSACTIONAL_EMAIL_PROVIDER=development-capture` plus
`ALLOW_DEVELOPMENT_EMAIL_CAPTURE_IN_PRODUCTION=true`), `BETTER_AUTH_URL=http://localhost:3100`
and a migrated database; it starts `next start` on port 3100 itself unless a server already
answers there, and signs up a new `smoke-…@example.invalid` account in whatever database
that server uses. The workflow's `smoke` job lists the whole environment. Run locally against
`.env.local`, it would write into the shared development database.

With the Sanity project in `.env.local`, the build reads `06g3ozu4/development` through the
Viewer token (`SANITY_API_READ_TOKEN`); without `NEXT_PUBLIC_SANITY_PROJECT_ID` it builds in
demo mode.

The build override is required, not optional. `.env.local` sets
`TRANSACTIONAL_EMAIL_PROVIDER=development-capture`, and the development capture adapter
refuses to initialize under `NODE_ENV=production` ("Development email capture cannot run
in production"), which fails page-data collection. Unsetting the variable selects the
fail-closed `unavailableDelivery`, which builds. A plain `pnpm build` therefore fails —
by design, per ADR 0010, but it surprises anyone who has not read this note.

Since 2026-09-04 a test deployment (Vercel preview or a QA project) can keep the capture
adapter in a production build by also setting
`ALLOW_DEVELOPMENT_EMAIL_CAPTURE_IN_PRODUCTION=true`. Login then shows the six-digit code
on screen and no mail is sent. Captures live in `app.development_email_capture`
(migration `20260904120000`), because Vercel serves the send and the read-back from
different function instances; the database used by that deployment must have the
migration applied. The flag must never be set on the customer-facing production project.

Production-build defect found 2026-09-08 on the Vercel preview: every poll of a finished
photo job returned 500. The minifier (SWC via Turbopack) dropped the code after the
`switch` in the Replicate adapter's `inspect` — the download-and-return success path —
because every other case returned; dev builds run the source unminified and never showed
it. `inspect` now reaches the success path through a plain call (`readSucceeded`), the
reconcile path treats a missing outcome as "unchanged" instead of throwing, the poll route
answers with the last known state when reconciliation throws, and `postbuild`
(`scripts/verify-server-bundle.mjs`) fails any build whose server bundle lacks that path.

## Deployment

Updated 2026-10-22.

- **Vercel Production is a test environment for now** (Martin, 2026-10-16). It carries test
  settings on purpose: `TRANSACTIONAL_EMAIL_PROVIDER=development-capture`, and the Sanity
  `development` dataset (`NEXT_PUBLIC_SANITY_PROJECT_ID`, `NEXT_PUBLIC_SANITY_DATASET`). A
  production build also needs `ALLOW_DEVELOPMENT_EMAIL_CAPTURE_IN_PRODUCTION=true` (without it
  the capture adapter refuses the build) and `SANITY_API_READ_TOKEN` (the dataset is private);
  `OPEN_ALL_LOCALES=true` opens English and Spanish there too. With the capture flag, anyone
  holding the URL can sign in as any address with the on-screen code, against the database
  previews also use. **Before real customers:** remove the capture flag and
  `OPEN_ALL_LOCALES`, set a real email provider (ADR 0010), switch to the `production`
  dataset after the DPA review, and give production its own database and storage bucket.
  This is the release-gate item under Roadmap M2.
- **The test environment stays out of search engines** since `1aee72f` went live on
  2026-10-22: every response says noindex, because Production sets no
  `SEARCH_INDEXING_ENABLED` and still carries test flags (see Done). Before that, `0c9b45e`
  sent no `noindex`.
- `PHOTO_GENERATION_ENABLED` and `REPLICATE_API_TOKEN` are set on Production; the flag's
  value was not read. If it is `true`, anyone holding the URL can sign in with the on-screen
  code and spend up to the provider budget breaker (20 € per rolling 24 h by default).
- Previews: the same test settings apply to every preview branch (`OPEN_ALL_LOCALES`,
  capture sign-in, Sanity `development` with a Viewer token). Previews are public — no Vercel
  Authentication.
- The project is linked to `DefinitionGroup/RDDOT-3Dwebsite` (production branch
  `redesign/devstart`). Git builds both kinds of deployment: a push to `redesign/devstart`
  builds Production in about a minute, and a push to a feature branch builds a Git preview
  (seen 2026-10-16; the earlier note that `previewDeploymentsDisabled` stops them is
  outdated). The CLI account `sanity-mngt-definition` is a Developer: `vercel deploy` makes
  previews, but it cannot create Production deployments or change project settings.
  Settings scoped to a single branch do not reach CLI deployments at runtime, which is why
  the test settings are set for all previews. Turning Deployment Protection on needs a team
  Owner or Member.
- Production: `rddot-3-dwebsite-d9gm2g4tp`, built from `24157d1` on 2026-10-29, live about
  90 s after `redesign/devstart` was fast-forwarded from `4dc7cf7` and pushed; it brings the
  sign-in fixes: the code limit per email address, sign-in sent before the page has loaded,
  and the request draft kept through a new sign-in (the `sign_in_code_limit` table was
  created in the shared development database before the push). Checked right after, signed
  out: the avatar, profile, export, quote-request and photo endpoints answer 401
  `session-expired` with no redirect; `/`, `/konto`, `/anfrage` and `/configure` answer 200
  with noindex; `/konto` in German, English and Spanish serves the sign-in forms as React
  form actions with the replay script; at 390 px with the script chunks held back, a click
  on "Code anfordern" stays on `/konto?next=%2Fanfrage` and is queued for replay, with every
  `/api/auth/` call blocked in the browser; `/konto` asks for sign-in at 1440 and 390 px; the
  configurator renders at both widths and picking the Fenix front changes the picture and
  the URL; nothing past the edge, no console errors. One code request reached the site by
  mistake: the first run of the early-click check held only `/_next/static/chunks/`, but
  production serves `/_next/static/immutable/chunks/`, so the page hydrated and sent a code
  for `replay-check@example.invalid`. The capture adapter kept it (no email, no account);
  its row in `sign_in_code_limit` counted one request, so the per-address limit runs on the
  live deployment. The code, the capture and the counter expire on their own. The draft
  restore needs a signed-in account and was checked on the dev server only.
- The deployment before, `rddot-3-dwebsite-fbcowjqpm`, was built from `4dc7cf7` on 2026-10-28, live about
  90 s after `redesign/devstart` was fast-forwarded from `6cf216a` and pushed; it brings the
  configurator's framing on phones and tablets (no database change). Checked right after,
  signed out, in headless Chrome on the real GPU: Studio, Appartement and Loft in Raum,
  Front and Detail at 390 and 768 px show the whole kitchen between the controls and the
  camera row; in the Edit Session at 390 px the kitchen sits above the edit bar and a tap
  selects the module under it; expanding and collapsing the sheet leaves the framing in
  place; at 1440 px the kitchen sits left of the open Datenblatt as on the deployment
  before (mean difference 0.19 of 255), hiding the panel moves it to the full width and
  reopening it moves it back; `/konto` asks for sign-in at 1440 and 390 px; the
  configurator renders at both widths and picking the Fenix front changes the picture
  and the URL; nothing past the edge, no console errors.
- The deployment before, `rddot-3-dwebsite-8666zrpwe`, was built from `6cf216a` on 2026-10-28, live about
  two minutes after `redesign/devstart` was fast-forwarded from `7b79139` and pushed; it
  brings the database pools that survive the first connection after Neon suspended the
  database (no database change; new dependency `@vercel/functions`). Checked right after,
  signed out: `GET`, `POST` and `DELETE /api/account/avatar`, `PUT /api/account/profile`,
  the export, `GET /api/quote-requests` and `GET /api/photos` answer 401 `session-expired`
  with no redirect; `/`, `/konto`, `/anfrage` and `/configure` answer 200 with noindex;
  `/konto` asks for sign-in at 1440 and 390 px with no account on the page and nothing past
  the edge; the configurator renders at both widths and picking the Fenix front changes
  the picture and the URL; no console errors. Without a session cookie Better Auth answers
  before it asks the database, so none of these opened a connection: the fix itself, a
  code request after the database slept, was checked on the dev server only.
- The deployment before, `rddot-3-dwebsite-cm83hlhwa`, was built from `7b79139` on 2026-10-27, live about
  90 s after `redesign/devstart` was fast-forwarded from `8811e17` and pushed; it brings
  profile P3, the profile photo (the `customer_avatar` table was created in the shared
  development database before the push). Checked right after, signed out: `GET`, `POST` and
  `DELETE /api/account/avatar` answer 401 `session-expired` with `private, no-store` and no
  redirect; `/konto` asks for sign-in at 1440 and 390 px with no account, profile or photo
  on the page and nothing past the edge; the configurator renders at both widths and
  picking the Fenix front changes the picture and the URL; no console errors. Uploading,
  showing and removing a photo need a signed-in account, so they were checked on the dev
  server only.
- The deployment before, `rddot-3-dwebsite-l7tae03wl`, was built from `8811e17` on 2026-10-23, live about
  90 s after `redesign/devstart` was fast-forwarded from `be80de2` and pushed; it brings
  profile P1 and request P2 (the migration was applied to the shared development database
  before the push, so the previous deployment ran against the new columns unharmed).
  Checked right after, signed out: `PUT /api/account/profile`, the export, submitting and
  listing requests, lifecycle, duplicate and delete answer 401 `session-expired`;
  `/anfrage` in German, English and Spanish and `/konto` ask for sign-in with the language
  switch at 1440 and 390 px, nothing past the edge, noindex holds; the configurator renders,
  frames the kitchen left of the Datenblatt, changes with walnut and selects a module on a
  click in the Edit Session; no console errors. The new forms need a signed-in account, so
  they were checked on the dev server only.
- The deployment before, `rddot-3-dwebsite-mhl73bc78`, was built from `be80de2` on 2026-10-23, live about
  90 s after `redesign/devstart` was fast-forwarded from `fdc353d` and pushed; it brings
  dialog focus containment, the segment controls as radio groups, and the desktop framing
  left of the Datenblatt with the HUD on soot chips. Checked right after, signed out, in
  headless Chrome on the real GPU with real key presses: in the material card and the
  teaser's explainer focus starts on Close, Tab and Shift+Tab stay inside, the page is
  inert, Escape closes and focus returns; the view group has one Tab stop and ArrowRight,
  End, Home and wrap-around choose and focus at 1440 and 390 px, ArrowRight on the stages
  opens Aufbau; Studio, Appartement and Loft in Raum, Front and Detail show the whole
  kitchen left of the panel with a readable HUD; hiding and reopening the panel moves the
  frame to the full width and back; choosing walnut changes the picture; a click on a wall
  module in the Edit Session selects it; no console errors.
- The deployment before, `rddot-3-dwebsite-94l3edt1s`, was built from `fdc353d` on 2026-10-23, live about
  two minutes after `redesign/devstart` was fast-forwarded from `d4682f4` and pushed; it
  brings every price with VAT included (and the profile plan, documents only). Checked
  right after, signed out, in headless Chrome: the Nussbaum Memory card says "Aufpreis
  690 € inkl. MwSt." at 1440 and 390 px, choosing it moves the total from 10.103 to
  10.793 €, the "Aufstellung" lists nine positions with VAT that add up to 10.793 € and ends
  with "darin enthaltene MwSt. (19 %)", the English and Spanish lists add up, the teaser
  says "inkl. MwSt.", the 3D scene renders, no console errors. The request panel was
  checked on the dev server only (it needs a signed-in Project).
- The deployment before, `rddot-3-dwebsite-cuyb1zo5z`, was built from `d4682f4` on 2026-10-23, live about
  a minute after `redesign/devstart` was fast-forwarded from `edf646b` and pushed; it brings
  the request confirmation that no longer promises an offer. Checked right after, signed
  out: `/anfrage`, `/en/anfrage` and `/es/anfrage` answer 200 with noindex and ask for
  sign-in with the language switch at 1440 px (German also at 390 px), nothing past the
  edge, no console errors; the 22 scripts those pages load carry the new wording in all
  three languages and none of the old offer promises. The wording itself shows only to a
  signed-in owner of a saved Project, so it was seen on the dev server, not live.
- The deployment before, `rddot-3-dwebsite-emayyjt50`, was built from `edf646b` on 2026-10-23, live about
  90 s after `redesign/devstart` was fast-forwarded from `e1f5df0` and pushed; it brings
  account management A3 and A4 (no database change). Checked right after, signed out: the
  export, profile, lifecycle, duplicate and delete routes answer 401 `session-expired`,
  Better Auth's `delete-user` answers 401, `/api/cron/storage-sweep` answers 404 because
  `CRON_SECRET` is not set yet, noindex holds; the sign-in on `/konto` passes at 1440 and
  390 px and in English with nothing past the edge, no console errors; the configurator
  renders in Studio, the Loft and Detail at 1440 px and in Front at 500 px on
  `/en/configure`, only the `THREE.Clock` warning. The signed-in pages were checked on the
  dev server only.
- The deployment before, `rddot-3-dwebsite-pip4b4yvp`, was built from `e1f5df0` on 2026-10-23, live about
  a minute after `redesign/devstart` was fast-forwarded from `dd3560f` and pushed; it
  brings the account page on the whole screen and the profile (A1, A2; the profile table
  was already in the database). Checked right after, signed out: `PUT /api/account/profile`
  answers 401 `session-expired`, noindex holds, the sign-in on `/konto` keeps its photo and
  language switch at 1440 and 390 px and in English with nothing past the right edge (the
  edge measured per element), no console errors; the configurator renders in Studio, the
  Loft and Detail at 1440 px and in Front at 500 px on `/en/configure`, only the
  `THREE.Clock` warning. The signed-in account page was not checked live: signing in there
  would create an account on the test environment; it was checked on the dev server.
- The deployment before, `rddot-3-dwebsite-lef747166`, was built from `dd3560f` on 2026-10-23, live about
  90 s after `redesign/devstart` was fast-forwarded from `1aee72f` and pushed; it brings the
  journey-test record, Sanity 6.20 and the language switch. Checked right after, signed
  out, in headless Chrome on the GPU: noindex on pages, the Studio and a model; the language
  switch on the guest configurator, a pending save, a return address and a guest request
  keeps its state in every link, English reopens the same configuration (11.127 € →
  €11,127), the request header fits at 375 px and the phone configurator has its switch in
  the sheet, no overflow, no console errors; the configurator renders in Studio, the Loft and
  Detail at 1440 px and in Front at 500 px on `/en/configure`, only the `THREE.Clock`
  warning; the Studio shows its sign-in screen in about 2 s (the first, cold load after the
  deploy took longer than 12 s). A deployment's own URL, such as the previous one, shows
  "Connect this Studio to your project", because Sanity's CORS list names the production
  domain only.
- The previous production deployment, `rddot-3-dwebsite-53camsk2r`, was built from `1aee72f`
  on 2026-10-22, live about 70 s after `redesign/devstart` was fast-forwarded from `0c9b45e`
  and pushed (before it `rddot-3-dwebsite-5qmv3dygu`). Checked right after: `X-Robots-Tag: noindex,
  nofollow` on pages, `robots.txt`, the sitemap, the Studio, both room models, the film and a
  404; the robots meta tag on `/`, `/configure`, `/konto` and `/en`; `robots.txt` without a
  sitemap line; models at full size; the configurator renders in Studio, the Loft and the
  Detail camera at 1440 px and in the Front camera at a 500 px phone width (headless Chrome on
  the GPU), with no overflow, no fallback and only the `THREE.Clock` warning; on `/konto`
  with a pending save, "Zum Konfigurator" keeps `?c=` (the `7c99752` fix). Earlier that day,
  on `0c9b45e`: `/impressum` and `/datenschutz` answered 404, `/en` and `/es` 200, and
  `/api/webhooks/sanity` 404 (no secret).
- **Functions run in `iad1` (US East)**, Vercel's default — the repository sets no region —
  while the database is Neon Frankfurt and object storage is in the EU. Every database round
  trip crosses the Atlantic, and personal data is processed in the US. Choose the function
  region (`fra1`) before launch; it also belongs in the data-protection review.
- Variables on Vercel (names only, 2026-10-22): the Sanity four, `OPEN_ALL_LOCALES`, the
  capture flag and `TRANSACTIONAL_EMAIL_PROVIDER`, `DATABASE_URL*`, `TEST_DATABASE_URL`,
  `BETTER_AUTH_SECRET`, `REPLICATE_API_TOKEN`, `OBJECT_STORAGE_*`, `PHOTO_GENERATION_ENABLED`.
  Not set: `SANITY_REVALIDATE_SECRET`, `REPLICATE_WEBHOOK_SIGNING_SECRET`,
  `PHOTO_WEBHOOK_URL`, `PHOTO_SWEEP_TOKEN`, `BETTER_AUTH_URL`.
- GLB and HDR files are plain Git files since 2026-10-16 (about 5.8 MB in all). They were in
  Git LFS, and Vercel's Git builds served them as 132-byte pointers (Git LFS is off in the
  project), so production showed the 3D fallback. Older commits keep their LFS pointers.
- `TEST_DATABASE_URL` is also set on Production, and `DATABASE_URL*` and `OBJECT_STORAGE_*`
  are one value for Preview and Production.
- Since `f29e28b` (2026-09-04) auth follows the Vercel deployment URL when `BETTER_AUTH_URL`
  is unset: the production domain in production, the deployment URL in previews.

## Open Working Tree

The 2026-10-16 assessment and its screenshots sit untracked in
`.scratch/website-assessment-2026-10-16/`. `next-env.d.ts` may show as modified; that is the
generated-file churn under Known Warnings, not work.

## Known Defects

Found by the 2026-10-16 assessment. Items marked *rechecked* were confirmed again on
2026-10-22. The first finding, a signed-out guest's "Als Projekt speichern" losing the
configuration at sign-in, is fixed (Done, 2026-10-22).

- **Held sideways, a phone has almost no room for the scene.** At 844 × 390 px the two
  control rows, the camera row and the sheet (45 % of the height) leave a 30 px band; the
  kitchen is drawn whole but small into the fifth of the height the framing always keeps,
  where before 2026-10-28 it showed cropped large. The landscape layout needs its own
  arrangement. The upright phone framing is fixed (Done, 2026-10-28).
- **The hero film has no pause control**; "Den Film ansehen" requests fullscreen on the same
  muted loop. Reduced motion is honoured, but that does not replace a control.
- **The request consent has no privacy-policy link** (waits on the Datenschutz page).
- **Marketing promises more than the product does** (`content/home/de.ts`): "in Ihrem Raum
  gesehen" and "ein Foto in Ihrem Raum" suggest the customer's own room (the rooms and photo
  scenes are supplied); "Ein Planer … persönlich, nicht per Formular" meets an account-gated
  form; the Agile and Exclusive Line cards open the same configurator; "Vier
  Entscheidungen", "drei Entscheidungen" and "in vier Klicks" explain the same flow three
  ways.

The two defects the journey test of 2026-10-22 found (a request losing its note and
consent at a new sign-in, a sign-in sent before the script loaded) are fixed (Done,
2026-10-28).

## Deferred Decisions

**Automatic object deletion — decided 2026-10-23 (Martin), waiting on one setting.** The
2026-09-01 deferral held the storage sweep back until Project Archive/Trash/restore existed,
because the sweep removes the undo. With A3 and A4 in place it runs once a day
(`/api/cron/storage-sweep`, `vercel.json` crons at 03:30 UTC) and deletes a stored photo
or capture only 30 days after its row is gone (`STORAGE_DELETION_HOLD_MS`), a second safety
net after the row's own deletion. The route exists only when `CRON_SECRET` is set; until
Martin sets it on Vercel, deletion intents keep accumulating and account deletion still
does not reach object storage. Abandoned and finished captures that never lose their row
are a separate retention sweep, still open (Roadmap M2).

**Deleting Projects and accounts — decided 2026-10-23 (Martin).** A Project or a Customer
Account with Quote Requests is not deleted by its owner; rotpunkt deletes it by hand. The
Trash keeps Projects until restored or deleted by hand: no automatic purge after 30 days
(CONTEXT.md, Trashed Project). Before launch, have the request retention checked legally.

## Release Blockers

- **The `public` bucket on `ecomstorage.rotpunkt.ai` is world-readable.** It carries a
  `PublicReadGetObject` policy granting `s3:GetObject` to `*`, verified by fetching an
  uploaded object anonymously (HTTP 200). No customer photo may be stored there: a public
  object URL is permanent, unrevocable, and unscoped, which would undo the guarantees
  Shared Revision Links exist to provide. Photo artifacts now use the private
  `rdtdot-photos` bucket instead (anonymous GET returns 403, verified). The `public`
  bucket itself is left as found — review what it currently serves and whether that
  exposure is intended.
- The "Appartement" environment is a development placeholder: since 2026-10-16 it is `public/models/apartment-room.glb`, prepared from `newroom.glb` in the defgrp-3d-configurator prototype. That file is a Sketchfab export (its root node is `Sketchfab_model`) whose author and licence are recorded nowhere; only its floor photo is identifiable (Pexels, and dropped anyway). Establish the licence or replace the room with an owned or licensed one before any production release. Recorded here so the Production Release Gate cannot miss it.
- The "Loft" environment is a development placeholder too: `public/models/loft-room.glb` is prepared from "57-estancia_comedor_obj.zip" (a 3ds Max 2019 OBJ export, no author or licence inside). Establish its source and licence, or replace it, before any production release.

## Known Warnings

- Better Auth 1.6.27 prunes its rate-limit rows older than its default window (60 s)
  whenever some row's window resets, custom rules included: a client address's
  ten-minute count of code requests and five-minute count of sign-ins can start over
  after a minute without requests from it. The per-address code limit keeps its own
  table and holds its ten minutes (seen in `dist/api/rate-limiter`, 2026-10-28).
- `pnpm build` on Node 26 prints an `ExperimentalWarning: localStorage is not available`
  once per page-data worker: Node's experimental Web Storage warns when a dependency probes
  `localStorage` on the server. Harmless; no application code reads it on the server
  (noticed 2026-10-27).
- The dev browser logs warnings from the current Three/R3F stack:
  - `THREE.Clock` is deprecated in favor of `THREE.Timer`.
  - `PCFSoftShadowMap` is deprecated and falls back to `PCFShadowMap`.
- These warnings do not currently block rendering or production build, but they should be revisited before production hardening. On production on 2026-10-22 only the `THREE.Clock` warning appeared.
- `pnpm lint` reports one warning: `components/page-builder/exit-preview.tsx` navigates to an
  internal page with `window.location.assign`.
- `pnpm test:db` against the remote Neon test database: tests with many round trips run
  close to vitest's 5 s default, and a different few time out on each run (5, then 2 of 86
  on 2026-10-27, each at 5.0 s); none of them touches the code they were run for. A longer
  timeout for the integration run would settle it.
- One React hydration-mismatch error ("attributes of the server rendered HTML didn't match")
  appeared once during the 500 px journey on the dev server; loading each page of that
  journey directly, signed in and out, showed none.
- `pnpm audit --prod` (2026-10-23) reports one high advisory: `braces` ≤ 3.0.3, stack
  exhaustion through deeply nested patterns (GHSA-vfj7-8cjw-p6xm), with no fixed release
  published. Its only path is `sanity > @sanity/cli > @sanity/codegen > chokidar`, the file
  watcher of type generation, which sees only this repository's own patterns at build time;
  nothing a visitor sends reaches it. Recheck when `braces` or `chokidar` publishes a fix.
  The other eleven of 2026-10-22 are gone (see Done).
- `next-env.d.ts` churns between `./.next/types/routes.d.ts` and
  `./.next/dev/types/routes.d.ts` depending on whether `next build` or `next dev` ran
  last. It is a generated file marked "should not be edited"; commit `12215a5` committed
  one side of that coin-flip. Treat a diff on this file as noise, not work.
- Resolved in `a80ef42` (2026-10-15): `package.json` no longer pins anything to `latest`
  (Next 16.4.1, React 19.3.1, motion ^12.43.0, TypeScript ^6.0.3), and React 19.3.1
  satisfies `@portabletext/editor`'s React ≥ 19.2.8.

## Missing

- Sanity on Vercel: the variables are set (2026-10-15); the publish webhook of spec Phase 7b
  is not (`SANITY_REVALIDATE_SECRET` on Vercel plus the webhook in Sanity; the list is in the
  spec). Until then a deployed site shows published edits only after a rebuild; redirects
  take up to a minute per server instance.
- Sanity, spec Phase 8: ADR 0013 (the queries are the adapter, amending ADR 0007),
  `SANITY.md` and `blocks/CONTRACT.md`.
- Locales, rest of spec Phase 9b: Martin or a native speaker reviews the English and
  Spanish copy (editorial and functional); then English and Spanish join
  `LAUNCHED_LOCALES` (the switch on the functional screens is done, 2026-10-23). Until then `/en` and `/es` are 404 in
  a production build without `OPEN_ALL_LOCALES` (Vercel Production sets it while it serves
  as a test environment). Revision snapshots are still written in German; their product and finish
  names are translated on display only.
- The Presentation tool itself has not been exercised with a Studio login. Draft mode, live
  preview and the preview data attributes were verified without it.
- The hero film and its poster load straight from `cdn.sanity.io` in the visitor's browser
  (images go through `/_next/image`). An item for the ADR 0007 review, which also gates the
  `production` dataset.
- The `richText`, `faq` and `media` blocks are not built; `richText` waits for the real
  Impressum and Datenschutz text.
- The `configuratorBlock` is a teaser with a deep link; the inline live-3D variant is a
  later slice.
- The configurator's product data stays in code by design (ADR 0007); `catalog.ts` is the
  seam a Release Bundle replaces later. The pre-ADR 0007 stub
  `features/configurator/adapters/sanity.ts` is imported nowhere and still waits to be
  removed (spec §4).
- No real product catalog, SKU model, pricing engine, cart, order, CRM, or payment integration exists yet. Quote Requests are recorded and listed but nobody is notified: the `quote-request.submitted` outbox has no consumer until the email provider lands (ADR 0010). The "selected photo" named in CONTEXT.md is not yet captured on a Quote Request, and the account list shows the first ten without a load-more.
- The configurator's remaining ADR 0009 gaps: no measured Quality Profiles (fidelity still keys off viewport width), no deterministic reference renders (CI's scene test checks that the scene builds, not what it draws), no engine-upgrade guard for historical manifests, and the Appartement and Loft scenes have no manifest of their own (both are placeholders awaiting an owned source). The kitchen model itself is now manifest-validated and content-hashed.
- The AI photo feature is application-owned and asynchronous (Photo Job Module, EU object storage, owner scoping, kill switch, webhook inbox, reconciliation), but no webhook has yet been received from the real provider — that needs a public HTTPS URL, which only a deployment has — and the sweep is not scheduled. The browser's submit-and-poll flow has been exercised only against the module tests, not with generation enabled in a live pane. PLAN.md Phases 4–6 remain, plus the output moderation gate and cost evidence from Phase 3.
- No analytics/event tracking exists for configurator interactions.
- No accessibility audit has been formalized.
- Performance budgets exist only for the kitchen model (the Asset Manifest's bytes,
  triangles and draw calls). Nothing measures the whole experience: device profiles, frame
  time, GPU memory, Core Web Vitals, the hero film (8.3 MB and 2.6 MB files). The
  configurator prefetches both rooms and both Loft outlooks 1.2 s after it opens
  (`configurator-shell.tsx`), about 5.4 MB that a Studio-only visit never uses.
- The browser smoke test covers one desktop journey (Done, 2026-10-29). The phone layout,
  the Edit Session, versions, photos, the account's other sections and the rendered picture
  are still checked by hand each slice.

## Architecture Direction

- Keep the site single-channel for now.
- Treat German as the default locale and URL root.
- Use document-level localization for page-builder pages (`page`, `navigation`).
- Use field-level localized labels for small shared configuration metadata.
- Keep the configurator isolated as a smart component inside the Next.js app.
- The configurator joins pages as `configuratorBlock`, which carries editorial presentation
  and a `productKey`; rules and prices stay in code.
- Keep product definitions portable:
  - Sanity can own the editorial/product metadata first.
  - The same product definition should be exportable as JSON later.
  - Pricing should stay replaceable by a real commerce service.
- Do not copy the `defgrp-3d-configurator` implementation directly; use it as interaction and camera inspiration only.
- Keep the first prototype limited to one straight-line kitchen with cabinet/front color options.

## Roadmap (from 2026-10-15, M0 to M2 revised 2026-10-22)

This section is the plan. Each milestone lists engineering work (a Claude session can
take it) and what only Martin can supply or decide. Earlier sequences — the 2026-09-02
"confirmed sequence", the photo storage track, PLAN.md Phases 0–5 — are done or folded
in below; their history is in git and in the Done section.

### M0 — Next (from the 2026-10-22 reconciliation)

The dependency upgrade (`a80ef42`) is done. Nothing is in flight.

- The journey from a guest kitchen through sign-in to a Quote Request, with sessions
  expiring on the way, is fixed and browser-tested (2026-10-22, see Done); the Playwright
  smoke test has walked it in CI since 2026-10-29.
- Noindex on every deployment but the launched site is live (2026-10-22, `1aee72f`), and the
  test environment runs it. *Martin:* confirm `PHOTO_GENERATION_ENABLED` on Production is
  `false` (or accept the budget breaker as the bound).
- `sanity` is updated and the audit cleared down to one advisory without a fix (2026-10-23).
- The language switch on the functional screens is done (2026-10-23).
- Moved up from M2 on 2026-10-23, in this order: the request confirmation that matches
  the real follow-up, one VAT basis for prices, dialog focus containment and the
  configurator's tab semantics, and the configurator's framing and HUD contrast over the
  rooms on desktop (all four done the same day, see Done). The phone and tablet framing
  followed on 2026-10-28 (see Done).
- Then the profile, Slice P of the [account spec](.scratch/account-management/spec.md)
  (decided 2026-10-23): salutation, how to reach me and private or professional, copied
  into each request with the postcode (P1), and planning facts on the request (P2), both
  done the same day (see Done), and the profile photo in the account (P3, 2026-10-27);
  next the photo and first name on share links, opt-in, once Martin decides how a photo is
  checked before strangers see it (P4). Newsletter consent (P5) waits for the email provider in M2.

### M1 — A reviewable preview

- Production already builds `cc/devstart-sanity`'s commit with the Sanity `development`
  variables and the on-screen login code (see Deployment). Still missing:
  `SANITY_REVALIDATE_SECRET` and its webhook (spec 7b). Changing Vercel settings needs
  Martin's go-ahead.
- Spec Phase 8: ADR 0013, `SANITY.md`, `blocks/CONTRACT.md`; delete the unused
  `features/configurator/adapters/sanity.ts` stub.
- Try the Presentation tool with a Studio login.
- *Martin:* review the preview; review the English and Spanish copy.

### M2 — German production launch (the Production Release Gate)

Engineering:
- Transactional email provider adapter once chosen (ADR 0010), then the outbox consumer
  that tells rotpunkt about each Quote Request. The same change sets
  `QUOTE_REQUESTS_REACH_ROTPUNKT` to true, which brings back the confirmation that
  promises a reply. With it, newsletter consent with double opt-in (profile P5) once a
  newsletter tool is chosen.
- `richText` block, Impressum and Datenschutz pages, legal column in the footer.
- Licence or replace the Appartement and Loft rooms (see Release Blockers) and give them
  manifests; until then they cannot ship.
- Data protection: the storage sweep is built and scheduled in `vercel.json` (A4); it runs
  once `CRON_SECRET` is set on Vercel. Still open: the retention sweep for abandoned and
  finished captures.
- Photos, if they launch: webhook URL, signing secret and a scheduled sweep on Vercel; the
  output moderation gate; billed cost against the estimate; then switch generation on.
- The customer-facing items under Known Defects not taken into M0: a pause control for
  the hero film, the privacy link on the request consent, marketing copy that matches the
  offer, the configurator on a phone held sideways.
- CI on every push and the Playwright smoke path (homepage → configurator → change → save
  → share → request) are done (2026-10-29, see Done). Next for it: the same journey at
  phone width.
- Production Vercel environment: it runs as a test environment until then (see
  Deployment). Remove `TEST_DATABASE_URL`, the capture flag, `OPEN_ALL_LOCALES` and the
  `development` dataset settings; set the production domain and the function region
  (`iad1` today), then `SEARCH_INDEXING_ENABLED=true` so search engines may index it (it
  stays noindex while any test flag remains). Give production its own database and its own storage bucket
  and least-privilege key: today `DATABASE_URL*` and every `OBJECT_STORAGE_*` variable is one
  value shared by Preview and Production, which ADR 0011 rules out.
- Storage operations from ADR 0011: backup path and a restore drill for the RustFS
  deployment, encryption at rest and credential rotation recorded.
- Accessibility audit and performance budgets for the 3D scene and the homepage film.
- Account management, Slice A ([spec](.scratch/account-management/spec.md)) is done:
  A1 to A4 on 2026-10-23 (see Done). Slice B follows after launch (Later).

*Martin:* `CRON_SECRET` on Vercel, so the daily storage sweep runs; a legal check of keeping
Quote Requests when the customer wants an account deleted; Impressum and Datenschutz texts
(they need to describe the profile, the export and the deletion rules); the email provider choice; owned or licensed
Appartement and Loft scenes; the DPA and transfer reviews (Sanity, Replicate, and Vercel
functions outside the EU) that open the `production` dataset; a decision on the
world-readable `public` bucket; residency evidence for `ecomstorage.rotpunkt.ai`; whether
AI photos are part of the launch (CONTEXT.md's First Production Release includes them; this
roadmap leaves it open); who answers Quote Requests and how fast; how a profile photo is
checked before it shows on share links (profile P4); the budget bands on the request
form (P2); what sends newsletters (P5).

### M3 — English and Spanish launch

- Native review signed off, then `LAUNCHED_LOCALES` = de, en, es (`hreflang`, sitemap and
  robots follow it) and a smoke test of all three.
- Store revision snapshots language-neutral (keys, not labels) if historical versions must
  read fully in the visitor's language.

### Later

- Inline live-3D `configuratorBlock` variant; `faq` and `media` blocks.
- Account management, Slice B: all share links in the account, a page per request, change
  of sign-in email, devices and sign out everywhere, preferred email language.
- The selected photo on a Quote Request; load-more for older requests in the account.
- Analytics for configurator interactions.
- Product Definition Drafts and Release Bundles; a real catalog, pricing service, cart,
  order, payment and CRM behind the ADR 0006 boundaries.
- Further kitchen layouts beyond the straight line.
- The Three.js deprecations (`THREE.Clock`, `PCFSoftShadowMap`).

## Docs Still Needed

- `README.md`: how to run, build, verify, and understand the project at a glance.
- `ARCHITECTURE.md`: app architecture, route strategy, feature boundaries, Sanity/page-builder strategy, and commerce escape hatches.
- `SANITY.md`: Studio setup, dataset strategy, schema ownership, preview/live editing, agentic workflow notes, and migration rules (spec Phase 8, with `blocks/CONTRACT.md`).
- `CONTENT_MODEL.md`: page-builder block model, page fields, product definition fields, localization approach, and editor rules.
- `LOCALIZATION.md`: supported locales, default locale behavior, slug rules, fallback rules, and copy workflow.
- `CONFIGURATOR_CONTRACT.md`: product definition shape, URL state shape, pricing assumptions, validation rules, and future JSON export contract.
- `COMMERCE_ROADMAP.md`: Quote Requests now, cart/quote/order/payment later, and boundaries between Sanity and commerce systems.
- `3D_PIPELINE.md`: model formats, asset optimization, camera presets, material naming, performance budgets, and QA procedure.
- `QA.md`: manual QA checklist plus automated Playwright coverage plan.
- `ACCESSIBILITY.md`: keyboard behavior, focus states, reduced motion, contrast, forms, and configurator-specific a11y decisions.
- `PERFORMANCE.md`: Core Web Vitals targets, 3D budgets, image budgets, lazy loading, and monitoring.
- `DECISIONS.md` or `docs/adr/*`: short architecture decision records for key choices.
