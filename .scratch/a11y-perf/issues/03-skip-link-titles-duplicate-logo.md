# Skip link, the 404 title, one logo link on the account screens

Status: ready-for-agent
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
