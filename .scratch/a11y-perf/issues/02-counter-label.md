# The "100 °C" counter's label

Status: ready-for-agent
Audit: A2 (WCAG 4.1.2, level A)

## Scope

`components/design-system/counter.tsx` puts `aria-label="100 Grad"` on a `span`: ignored
by screen readers on an element without a role, and German on `/en` and `/es`. Hide the
counting digits from assistive technology and give the final value as visually hidden
text from the page's dictionary (or the block's own copy), so it reads "100 °C" / "100
Grad" in each language.

## Done when

axe's `aria-prohibited-attr` reports nothing on the homepage in de, en and es.
