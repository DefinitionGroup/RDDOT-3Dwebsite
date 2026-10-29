# Skip link, the 404 title, one logo link on the account screens

Status: done (2026-10-30)
Audit: A3, A4, A5

## Scope

- A "Zum Inhalt springen" link (en "Skip to content", es "Saltar al contenido") as the
  first focusable element of the site frame, visible on focus, targeting `main`.
- The 404 page's own title ("Seite nicht gefunden | rotpunkt Signature" and its
  translations) instead of the homepage's.
- `/konto` and `/anfrage` render two logo links in a row; keep one in the tab order.

## Done when

Tab from the top of the homepage reaches the skip link first and it moves focus to the
content; an unknown path has its own title; the sign-in and request screens have one logo
stop.

## Done

`SiteFrame` opens with "Zum Inhalt springen" / "Skip to content" / "Saltar al
contenido", a 44 px pill at the top left while focused; Enter moves focus to `main#inhalt`
and the next Tab reaches the hero's call to action. The 404 page renders its own `<title>`
("Seite nicht gefunden | rotpunkt Signature"), which React places ahead of the locale's
default. The sign-in panel on `/konto` shows the wordmark without a link (`BrandLogo
href={null}`); `/anfrage` already had one logo stop, the audit had counted the Tab cycle
wrapping round.
