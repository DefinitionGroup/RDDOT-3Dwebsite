# Accessible names that contain the visible label

Status: done (2026-10-30)
Audit: A1 (WCAG 2.5.3 Label in Name, level A)

## Scope

- The logo link (`components/design-system/brand-logo.tsx`): the wordmark reads
  "r•tpunkt", the red dot standing for the o, so its visible text is "rtpunkt" while the
  link is named "rotpunkt Signature Startseite". Name the wordmark as one image
  ("rotpunkt") instead of an `aria-label` on the link, so the link's name comes from its
  content and contains everything visible.
- The language switch (`components/design-system/language-switch.tsx`): shows "DE",
  named "Sprache: Deutsch". The name has to contain "DE", e.g. "Sprache: Deutsch (DE)",
  in all three dictionaries.
- The Edit Session's palette (`features/configurator/ui/element-palette.tsx`): shows
  "Hochschrank 62 cm", named "Hochschrank hinzufügen". Name it "Hochschrank 62 cm
  hinzufügen".

## Done when

axe's `label-content-name-mismatch` reports nothing on the pages and configurator states
of the audit, in de, en and es, and the smoke test still passes.

## Done

The wordmark is one image named "rotpunkt" and the logo link takes its name from its
content: "rotpunkt Signature" plus visually hidden "Startseite" / "home page" / "página
de inicio" (`header.home` now holds only that word). The language switch reads "Sprache
DE: Deutsch" (axe drops parentheses, so not "(DE)"); the palette "Hochschrank 62 cm
hinzufügen", with a space between label and width so the visible text reads as two words.
axe on a local production build: no `label-content-name-mismatch` anywhere.
