# rotpunkt Signature — "Galerie" Design System

A boutique, gallery-minimal system: one typeface, one weight, three sizes, one accent.

## Principles

- **Gallery white.** Flat off-white field (`canvas`), near-black `ink`, hairline gray structure. No gradients, no glass, no shadows on the landing page.
- **One accent.** Red exists only as the rotpunkt dot: the logo, the feature markers, and the trailing full stop of every headline (`RedStop`).
- **One typeface, one weight.** Hanken Grotesk (variable, via `next/font`), weight controlled by a single token: `--font-weight-base` in `app/globals.css` (also exposed as Tailwind `font-base`). Change 400 → 300/500 in one line.
- **Three sizes.** `text-display` (monumental headlines, clamps to 7rem), `text-lead` (supporting statements), `text-body` (everything else: copy, nav, buttons, captions).
- **Sharp geometry.** 0px radius everywhere; structure drawn with 1px `hairline` borders.
- **Framed photography.** Images sit inside the content grid with captions below, like plates in a monograph. Never full-bleed.
- **Quiet cinema.** One shared easing (`ease-signature`), fades and 12–16px rises, plus a slow 1.8–2.4s scale-in on images. No blur, no 3D rotations, no long staggers.

## Tokens

- Colors: `canvas`, `paper`, `mist`, `ink`, `graphite`, `ash`, `porcelain`, `hairline`, `signature` (red). `ember` is aliased to `signature` for legacy configurator styles.
- Type: `text-display` / `text-lead` / `text-body`, `font-base` weight token.
- Radius tokens `rounded-hero`/`rounded-soft` resolve to 0.

## Components

- `BrandLogo` — rotpunkt • Signature lockup, one weight, hairline divider.
- `SiteHeader` — wordmark, three single-word links, cart; hairline bottom border appears on scroll.
- `SignatureButton` — sharp 1px-border button, tones `solid` / `light` / `glass` (dark grounds).
- `SectionHeading` + `RedStop` — display headlines with the red-dot full stop.
- `ImagePanel` — framed image plate with caption and slow scale-in.
- `FeatureList` — hairline-divided rows with red dot markers.
- `SiteFooter` — hairline top, wordmark, links, copyright.

## Notes

- The configurator (`features/configurator`) and checkout still use legacy tokens (`glass-surface`, `porcelain`, etc.) — kept defined for compatibility; restyle them next to match Galerie.
- No mobile nav menu yet (links hidden below `md`).
