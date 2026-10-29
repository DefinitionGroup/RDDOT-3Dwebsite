# The hero film's weight

Status: needs-triage
Audit: P2

## Scope

The film autoplays on every visit: 2.7 MB on phones, 8.7 MB on desktop, also with
Save-Data on or a 2G/3G connection; the poster is 1920 px wide on phones too.

Proposal: with `navigator.connection.saveData` or an `effectiveType` below 4g, show the
poster and let the pause control's play start the film; serve the poster at about 1080 px
on phones. Re-encoding the desktop film (8.7 MB for a short loop) is the bigger saving and
an editorial step: the file lives in Sanity.

## Needs

A decision from Martin: is a still on slow connections acceptable for the brand film?
