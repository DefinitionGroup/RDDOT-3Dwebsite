---
version: 1
slug: "app-konto-page-tsx"
primary_target: "app/konto/page.tsx"
related_targets: ["features/customer-accounts/ui/account-access.tsx", "features/customer-accounts/ui/account-workspace.tsx", "features/projects/ui/project-versions.tsx"]
---

# Account Surface Brief

## Scope and Mode

- **Surface:** `/konto`
- **Mode:** Operate
- **Audience:** German-speaking private customers who need to authenticate, resume planning, or inspect their private kitchen projects.

## Job and Primary Task

The visitor continues an existing planning relationship without facing a conventional account-registration funnel. Signed-out visitors request and verify a short-lived email code, then return to a requested saved Project when their session expired. Signed-in visitors scan their projects, open a private Project in the configurator, continue configuration from the empty state, or sign out.

## Required Content and States

- Hero-level rotpunkt Signature mark and a real kitchen image.
- Short continuity promise tied to the customer's saved planning state.
- Email entry, code verification, pending, error, and return-to-email states.
- Authenticated heading, privacy context, sign-out action, project count, empty state or a keyboard-focusable ruled project list with last-updated date and an explicit “Projekt öffnen” action, and session-expiry note.
- A safe re-authentication return only for a requested `/configure?project=<uuid>` path; other post-sign-in destinations resolve to `/konto`.
- Opening a Project hands off to its owner-scoped configurator workspace, where explicit version save, paginated immutable history, and safety-preserving restore are available; autosave status remains visually distinct from fixed versions.
- Pending, failed, retried, and completed Guest Configuration import states.
- Development email capture only outside production.

## Chosen Direction

A split composition keeps the established rotpunkt Signature world visible while giving the account task a direct, distraction-free plane. On desktop, the kitchen image is the dominant left field and the form or workspace occupies the gallery-white right field. On mobile, a shallow image plane stacks above one-column task content. The image, logo, Aspekta type, sharp geometry, near-black ink, hairlines, and a scarce signature-red action carry the brand; no decorative cards, badges, or detached overlays are introduced.

## Memorable Moment

The planning relationship is made physical: the kitchen image and hero-level wordmark hold one side of the viewport while the authentication state changes quietly in place on the other.

## Constraints

- Preserve German-first copy and truthful passwordless email-OTP behavior.
- Keep authentication and project data private; do not imply cart, payment, direct checkout, or production email-provider claims.
- Motion serves state continuity and respects reduced motion.
- Desktop and mobile must remain usable without horizontal overflow.

## Unresolved Decisions

- Production transactional-email provider selection remains open.
- Project Archive/Trash/lifecycle restoration and Shared Revision Link UI remain follow-up workflows. Opening and editing an active saved Project, explicit version checkpoints, paginated version history, and safety-preserving Configuration Revision restore are implemented in the configurator workspace.
