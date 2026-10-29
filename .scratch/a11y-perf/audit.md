# Accessibility and performance audit (2026-10-29)

Status: findings filed as issues 01–09; nothing fixed yet
Scope: the Roadmap M2 item "Accessibility audit and performance budgets" (STATUS.md)
Measured on: the test site `rddot-3-dwebsite-1ejmowgnl` (built from `1fe6086`), signed out

## Summary

The site is in good accessible shape at the level a machine and a keyboard can check:
one `h1` and a `main` landmark per page, `lang` right in all three languages, a visible
focus ring on every Tab stop, radio groups as one stop, no content past the edge at
320 px, dialogs that trap focus (since 2026-10-23), reduced motion honoured (the
statement since today). axe finds four fixable kinds of defect, all small, and one design
trade-off.

Performance is where the work is. On a slow phone the homepage's largest paint comes at
5.0 s, because the headline waits for JavaScript to fade in; the hero film costs 2.7 MB
on a phone and 8.7 MB on a desktop whatever the connection; and the configurator moves
11.2 MB in its first 15 s, 5.25 MB of them rooms nobody has opened.

## Accessibility

### Method

- axe-core 4.14 (WCAG 2.0/2.1/2.2 A and AA plus best practice), injected into every page
  after scrolling through it so that content revealed on scroll is checked as seen:
  homepage (de at 1440 and 390 px, en and es at 390 px), `/konto`, `/anfrage`, an invalid
  share link and the 404 page at 1440 and 390 px; `/configure` at 1440, 390 and 844 × 390
  px, with the photo dialog, the material overlay and the Edit Session open.
- By hand, in Chrome: landmarks, heading outline, `lang`, page titles, the first twelve
  Tab stops with their focus style, and reflow at 320 px.

### Findings

| # | Finding | WCAG | Where | Issue |
| --- | --- | --- | --- | --- |
| A1 | Accessible name does not contain the visible label: the logo link shows "r•tpunkt" (the dot replaces the o) but is named "rotpunkt Signature Startseite"; the language switch shows "DE" but is named "Sprache: Deutsch"; the Edit Session's palette shows "Hochschrank 62 cm" but is named "Hochschrank hinzufügen". Voice-control users say what they see. | 2.5.3 (A) | every page; configurator | [01](issues/01-label-in-name.md) |
| A2 | `<span aria-label="100 Grad">` in the "100 °C" counter: `aria-label` on a span without a role is ignored, and the words are German on `/en` and `/es` too. | 4.1.2 (A) | homepage | [02](issues/02-counter-label.md) |
| A3 | No skip link: keyboard users pass the logo and five navigation links before the content. | 2.4.1 (A, met by landmarks; best practice) | homepage | [03](issues/03-skip-link-titles-duplicate-logo.md) |
| A4 | The 404 page carries the homepage's title. | 2.4.2 (A) | any unknown path | [03](issues/03-skip-link-titles-duplicate-logo.md) |
| A5 | Two logo links in a row on the sign-in and request screens: one destination, two Tab stops. | best practice | `/konto`, `/anfrage` | [03](issues/03-skip-link-titles-duplicate-logo.md) |
| A6 | The statement's words fail contrast while dimmed (16 % opacity before the reader reaches them). By design: they light up as read, and reduced motion shows them lit. | 1.4.3 (AA), a trade-off | homepage | [08](issues/08-statement-contrast.md) |

Clean: the material overlay; every form field has a label; target sizes (2.5.8) pass;
nothing scrolls sideways at 320 px on the homepage, `/konto`, `/anfrage` or `/configure`.

Not covered: a screen reader read-through (VoiceOver on iOS, NVDA), the signed-in account
and its dialogs, the shared view with a real link, the 3D scene's own keyboard behaviour
(every task works without it: the smoke test runs the whole journey without WebGL).

## Performance

### Method

Chrome (Playwright, real GPU), cache off. Phone profile as Lighthouse's mobile default:
390 × 844 at DPR 3, 150 ms latency, 1.6 Mbit/s down, CPU 4× slower. Desktop: 1440 × 900,
no throttling. LCP, CLS and blocked main-thread time (long tasks beyond 50 ms) from
performance observers; bytes from Resource Timing (`encodedBodySize`, same origin) and
from `content-length` for the film and poster on Sanity's CDN.

### Numbers

| Page | Profile | FCP | LCP | CLS | Blocked |
| --- | --- | --- | --- | --- | --- |
| `/` | phone | 1.4 s | **5.0 s** (the `h1`) | 0 | 35 ms |
| `/` | desktop | 0.4 s | 1.3 s | 0 | 0 ms |
| `/configure` | phone | 1.8 s | 1.8 s | 0.03 | **1.1 s** |
| `/configure` | desktop | 0.5 s | 0.5 s | 0 | 0.2 s |

| Page | What loads, compressed | Size |
| --- | --- | --- |
| `/` | the site's own files (JavaScript 458 KB, fonts 39 KB, CSS 12 KB, images) | 0.55 MB |
| `/` | hero film from cdn.sanity.io: phone file / desktop file, autoplaying | **2.7 MB / 8.7 MB** |
| `/` | film poster, 1920 px wide on every device | 0.13 MB |
| `/configure` | first 15 s, no interaction | **11.2 MB** |
| | of which Loft outlooks (2 × 1.7 MB) and Appartement and Loft models, prefetched 1.2 s after opening | **5.25 MB** |
| | of which HDR environment 1.46 MB, floor textures 1.6 MB, walnut swatch PNG 0.69 MB | 3.75 MB |
| | of which JavaScript | 1.05 MB |
| | of which the kitchen model | 0.25 MB |

The configurator's LCP is its first paint (the HUD), so the 3D scene arrives later than LCP
says: on the phone profile the page's `load` event came at 62 s, and the room prefetch
started at 12 s, while the kitchen's own textures were still downloading.

### Findings

| # | Finding | Issue |
| --- | --- | --- |
| P1 | The homepage headline is server-rendered invisible and fades in only after hydration, so on a slow phone LCP is 5.0 s instead of about 1.5 s (good is ≤ 2.5 s). | [04](issues/04-hero-headline-lcp.md) |
| P2 | The hero film downloads in full on every visit: 2.7 MB on phones, 8.7 MB on desktop, also with Save-Data or a 2G/3G connection; the poster is 1920 px wide on phones. | [05](issues/05-hero-film-weight.md) |
| P3 | The configurator prefetches both rooms and both Loft outlooks (5.25 MB) 1.2 s after opening, competing with the kitchen's own assets on slow connections; a Studio-only visit never uses them. | [06](issues/06-room-prefetch.md) |
| P4 | Heavy textures: a 1.46 MB HDR, 1.6 MB of floor textures as JPEG, the walnut swatch as a 0.69 MB PNG loaded up front. | [07](issues/07-texture-weight.md) |
| P5 | No budget is enforced anywhere but the kitchen model's Asset Manifest. | [09](issues/09-performance-budgets-in-ci.md) |

## Proposed budgets

Checked against a production build in CI (issue 09), on the phone profile above unless noted.

| Budget | Now | Target |
| --- | --- | --- |
| Homepage LCP (phone) | 5.0 s | ≤ 2.5 s |
| CLS, every page | ≤ 0.03 | ≤ 0.1 |
| Homepage, the site's own JavaScript (compressed) | 458 KB | ≤ 500 KB |
| Homepage film, phone / desktop file | 2.7 / 8.7 MB | ≤ 3 / 9 MB, none with Save-Data |
| Configurator, first 15 s without interaction | 11.2 MB | ≤ 6 MB |
| Configurator JavaScript (compressed) | 1.05 MB | ≤ 1.1 MB |
| Configurator blocked main-thread time (phone) | 1.1 s | ≤ 1.2 s, then lower |
| Kitchen model | Asset Manifest | unchanged (bytes, triangles, draw calls) |

Frame time and GPU memory need a device lab or a real phone; they stay a manual check.
