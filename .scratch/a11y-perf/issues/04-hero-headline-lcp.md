# The homepage headline without waiting for JavaScript

Status: ready-for-agent
Audit: P1

## Scope

`blocks/hero-film/hero-film-view.tsx` renders the eyebrow, headline, summary and actions
with Motion's `initial={{ opacity: 0, y }}`: the server sends them invisible and they
appear only once the page has hydrated and the rise has run. On the phone profile (slow
4G, CPU 4×) LCP is the `h1` at 5.0 s while the page first paints at 1.4 s. Keep the rise,
but let the text be visible without JavaScript: a CSS entrance that starts with the first
paint (and respects reduced motion), or Motion with `initial={false}` on the server
render.

## Done when

Homepage LCP on the phone profile is at most 2.5 s, the hero still rises in on desktop and
phone, and reduced motion shows it at once.
