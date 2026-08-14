---
version: 1
slug: "app-share-linkid-page-tsx"
primary_target: "app/share/[linkId]/page.tsx"
related_targets: ["features/sharing/ui/shared-revision-page.tsx", "features/configurator/ui/configurator-shell.tsx"]
---

# Shared Revision Surface Brief

## Scope and Mode

- **Surface:** `/share/[linkId]#<secret>`
- **Mode:** Operate
- **Audience:** A recipient who received a secure rotpunkt Signature link and needs to inspect one fixed kitchen state without an account.

## Job and Primary Task

The visitor verifies the exact selected configuration that was shared, explores its visual presentation through the available camera and studio/apartment views, and may start a separate configuration of their own. The shared Configuration Revision itself remains immutable.

## Required Content and States

- Loading, unavailable, and ready states in German-first copy.
- Hero-level rotpunkt Signature mark in loading and unavailable states.
- One nonblank 3D canvas in the ready state, with the shared kitchen state as the dominant visual plane.
- Selected-only historical details for product, layout, cabinet finish, front finish, price indication, and link expiry.
- Camera and presentation controls may change only the recipient's view; no configuration choices or shared revision data may mutate.
- One secondary exit to configure a separate kitchen.
- No Project Metadata, Customer Account data, AI-photo action, save/history/restore/share management, configuration request, or Quote Request action.
- Missing, malformed, expired, revoked, and trashed-Project links resolve to the same restrained unavailable experience without leaking which condition applied. A recipient with an otherwise valid link may receive a restrained compatibility message when its historical Product Definition cannot currently be rendered.

## Chosen Direction

The established configurator becomes a public gallery view rather than a second editor. The kitchen canvas remains full-bleed and dominant, while one sharp gallery-white detail plane names the immutable selection and expiry. Existing Aspekta typography, warm neutrals, hairlines, square controls, and scarce signature red preserve the rotpunkt Signature world without adding cards, badges, or security theater.

## Memorable Moment

The recipient lands directly inside the exact kitchen state: the same spatial canvas is present, but editable swatches and private workflow controls have resolved into a quiet, fixed material specification.

## Constraints

- Read the 32-byte secret only from the URL fragment and resolve it through the POST-only public endpoint; never place it in server-rendered markup, query parameters, logs, referrers, or persistent client UI.
- Preserve private/no-store, noindex/nofollow/noarchive, and no-referrer behavior.
- Archived Projects may remain viewable; trashed Projects and incompatible Product Definition versions fail closed.
- Keep motion purposeful and reduced-motion compatible.
- Desktop and mobile must retain one nonblank canvas, no horizontal overflow, and no console errors.

## Unresolved Decisions

- Historical public rendering beyond the active Product Definition version requires a future compatible Product Definition release loader.
- Link renewal is an approved lifecycle concept but is not part of the current create/list/revoke interface.
