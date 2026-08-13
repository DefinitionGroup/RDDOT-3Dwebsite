---
name: rotpunkt Signature
description: A sharp, gallery-like kitchen system where real spaces, disciplined type, and one red point carry the brand.
colors:
  signature-red: "#E30613"
  gallery-canvas: "#FAFAF9"
  paper-white: "#FFFFFF"
  material-mist: "#F0EFED"
  porcelain: "#F5F4F2"
  near-black-ink: "#1A1917"
  graphite: "#6C6863"
  ash: "#A8A39D"
  hairline: "#E2E0DD"
typography:
  display:
    fontFamily: "var(--font-sans), Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(2.75rem, 7vw, 7rem)"
    fontWeight: 200
    lineHeight: 1
    letterSpacing: "-0.03em"
  account-headline:
    fontFamily: "var(--font-sans), Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(2.65rem, 6vw, 4.8rem)"
    fontWeight: 200
    lineHeight: 0.96
    letterSpacing: "-0.03em"
  lead:
    fontFamily: "var(--font-sans), Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(1.25rem, 2vw, 1.75rem)"
    fontWeight: 400
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  body:
    fontFamily: "var(--font-sans), Helvetica Neue, Arial, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.7
    letterSpacing: "0"
rounded:
  sharp: "0px"
  circle: "9999px"
spacing:
  "3": "0.75rem"
  "5": "1.25rem"
  "6": "1.5rem"
  "8": "2rem"
  "10": "2.5rem"
  "12": "3rem"
  "14": "3.5rem"
  "16": "4rem"
  "20": "5rem"
  "24": "6rem"
components:
  button-solid:
    backgroundColor: "{colors.near-black-ink}"
    textColor: "{colors.paper-white}"
    typography: "{typography.body}"
    rounded: "{rounded.sharp}"
    padding: "12px 24px"
    height: "44px"
  button-solid-hover:
    backgroundColor: "transparent"
    textColor: "{colors.near-black-ink}"
  button-light:
    backgroundColor: "transparent"
    textColor: "{colors.near-black-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.sharp}"
    padding: "12px 24px"
    height: "44px"
  button-light-hover:
    backgroundColor: "{colors.near-black-ink}"
    textColor: "{colors.paper-white}"
  button-signature:
    backgroundColor: "{colors.signature-red}"
    textColor: "{colors.paper-white}"
    typography: "{typography.body}"
    rounded: "{rounded.sharp}"
    padding: "12px 24px"
    height: "48px"
  button-signature-hover:
    backgroundColor: "{colors.near-black-ink}"
  input-underline:
    backgroundColor: "transparent"
    textColor: "{colors.near-black-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.sharp}"
    padding: "0"
    height: "56px"
---

# Design System: rotpunkt Signature

## Overview

**Creative North Star: "The Signature Gallery"**

rotpunkt Signature treats the interface as an architectural gallery for real kitchens. Warm white space, fine rules, precise type, and restrained controls recede around full-scale product imagery; the visual authority comes from the room, material, and planning state rather than decorative UI.

The system is premium without ornament. Aspekta Variable moves from unusually light, close-set statements to calm regular-weight utility copy. Near-black ink provides structure, gallery neutrals create quiet tonal separation, and signature red appears as a deliberately scarce point of identity or action.

**Key Characteristics:**

- Real kitchen imagery is the dominant visual material.
- Sharp planes, square controls, and hairline rules replace soft containers.
- One type family carries display, editorial, and operational roles.
- Signature red punctuates; it does not flood the composition.
- Motion is slow enough to create presence and short enough to preserve continuity.

## Colors

The palette is a warm-neutral gallery field anchored by near-black ink and one saturated brand red.

### Primary

- **Signature Red** (#E30613): The rotpunkt point, trailing punctuation, decisive actions, focus changes, live errors, and compact selected-state marks.

### Neutral

- **Gallery Canvas** (#FAFAF9): The default page field; subtly warmer than pure white.
- **Paper White** (#FFFFFF): Text over imagery and the cleanest foreground plane.
- **Material Mist** (#F0EFED): Image placeholders and quiet material-backed regions.
- **Porcelain** (#F5F4F2): A slightly denser neutral available for secondary surfaces.
- **Near-Black Ink** (#1A1917): Primary copy, structural borders, and solid actions.
- **Graphite** (#6C6863): Supporting copy, labels, metadata, and subdued icon states.
- **Ash** (#A8A39D): Low-emphasis captions and deliberately distant text.
- **Hairline** (#E2E0DD): Dividers, inactive boundaries, and understated underlines.

### Named Rules

**The One Red Point Rule.** Signature red marks the brand's point, the primary continuation, focus, or error. It never becomes a broad decorative field.

**The Warm White Rule.** Use Gallery Canvas for the page field and reserve Paper White for contrast over imagery or a consciously cleaner plane; do not collapse the palette into generic pure white and black.

## Typography

**Display Font:** Aspekta Variable (with Helvetica Neue, Arial, and sans-serif fallbacks)  
**Body Font:** Aspekta Variable (with Helvetica Neue, Arial, and sans-serif fallbacks)

**Character:** A single precise grotesk creates continuity between brand expression and task UI. Hierarchy comes from scale, spacing, color, and a light display axis—not from accumulating bold weights.

### Hierarchy

- **Display** (200, clamp(2.75rem, 7vw, 7rem), 1): Large campaign and section statements; light, close-set, and balanced over a short measure.
- **Account Headline** (200, clamp(2.65rem, 6vw, 4.8rem), 0.96): A bounded display role for task surfaces, preserving the light brand voice without overwhelming the form.
- **Lead** (400, clamp(1.25rem, 2vw, 1.75rem), 1.3): Editorial supporting copy, project names, and compact section titles.
- **Body** (400, 0.9375rem, 1.7): Navigation, form labels, buttons, captions, and explanatory copy; readable measures usually stop between 40 and 42 characters on task surfaces.

### Named Rules

**The One-Family Rule.** Keep Aspekta Variable across brand and operational UI; distinguish roles through scale and space before weight.

**The Light Statement Rule.** Display statements use the light axis, while body, labels, links, and emphasized inline text remain regular weight.

## Layout

The global content frame is centered at a maximum width of 82rem, with 1.25rem side gutters below tablet and 3rem gutters from 768px upward. Marketing sections use generous vertical intervals, asymmetric image-to-copy grids, and occasional sticky editorial copy; they avoid nested shells.

Task surfaces use shallower measures, stable action geometry, and direct one-column reading order when narrow. Surface-specific compositions belong in their Impeccable surface briefs rather than becoming global layout rules.

Spacing follows Tailwind's 4px base rhythm, but the implemented cadence favors 12, 20, 24, 32, 40, 48, 56, 64, 80, and 96px intervals. Small gaps organize controls; large intervals separate narrative jobs.

**The One-Plane Rule.** A section reads as one composition. Do not subdivide it into decorative cards, stat strips, or floating callouts.

## Elevation & Depth

The system is flat by default and uses no ambient card-shadow vocabulary. Depth comes from dominant photography, controlled crops, tonal separation, image overlays where text needs contrast, fine borders, and sticky or fixed spatial behavior. The configurator alone retains a dark translucent, blurred surface when controls must sit over the 3D scene.

**The Flat-by-Default Rule.** Surfaces rest on the page plane. Add translucency only when content must remain legible over a live visual scene, never as decorative glass.

## Shapes

The dominant form language is rectilinear: images, buttons, inputs, panels, and task planes have square corners. Fine one-pixel rules define boundaries; underlined fields preserve open space instead of creating boxes. Full circles are reserved for intrinsically circular brand dots, count indicators, and selected-state markers.

**The Architectural Edge Rule.** A control or container stays square unless its meaning is itself circular.

## Components

### Brand Mark

The wordmark is constructed in type: the red point replaces the “o” in rotpunkt, while “Signature” sits behind a fine vertical divider at reduced opacity. On image planes it switches to white but keeps the red point. The point expands subtly on hover.

### Buttons

- **Shape:** Square, compact, and at least 44px high, with horizontal space rather than oversized weight.
- **Solid:** Near-black ink with Paper White type and a one-pixel ink border; hover reverses to the page field while preserving the structural border.
- **Light:** Transparent with an ink border; hover fills with ink.
- **Signature:** Reserved for the decisive continuation in task flows; red at rest, near-black on hover.
- **Glass:** Transparent with a white translucent border over imagery; hover turns white with dark text.
- **Motion:** Color transitions run for 300ms on the signature easing curve. Arrow glyphs move two pixels up and right on hover.

### Inputs / Fields

- **Style:** Transparent, square, and open; a single ink underline carries the field boundary.
- **Focus:** The underline changes to Signature Red without adding a box, glow, or filled shell.
- **Code Entry:** The one-time code increases in size and uses wide tracking while keeping the same underline grammar.
- **Error / Disabled:** Error copy appears in Signature Red in an `aria-live` region; disabled actions shift to Graphite and retain a wait cursor.

### Navigation

The fixed marketing header uses a translucent Gallery Canvas plane with a light backdrop blur. A hairline appears only after scrolling. Text links are Graphite at rest and Ink on hover; icon actions occupy 44px square targets and reduce opacity rather than gaining a container.

### Image Panels

Kitchen imagery sits in unclipped rectangular planes with responsive aspect ratios and no radius. Entrance motion combines a 14px rise and opacity reveal; the image itself settles from a slight 1.06 scale. Captions remain quiet and external to the image.

### Task State Transitions

Task states replace one another in place with opacity and a short vertical shift; the account authentication flow adds a temporary 4px blur on the established signature easing curve. Ruled lists preserve information density without becoming cards.

## Do's and Don'ts

### Do:

- **Do** let real kitchen imagery, material, or a rendered planning state anchor branded compositions.
- **Do** use Signature Red for the point, decisive action, focus, selected state, or error—then let neutrals carry the rest.
- **Do** preserve square geometry and hairline structure across new controls and surfaces.
- **Do** keep motion tied to hierarchy, state continuity, image settling, and direct feedback.
- **Do** collapse multi-plane compositions to a direct reading order on mobile and verify there is no horizontal overflow.

### Don't:

- **Don't** introduce decorative cards, rounded media shells, floating badges, or detached hero overlays.
- **Don't** substitute generic gradients or abstract decoration for real kitchen or configurator imagery.
- **Don't** add bold-weight ladders, a second display family, or tracked uppercase copy at paragraph scale.
- **Don't** default to auxiliary labels above headings; use a direct heading and spatial hierarchy.
- **Don't** use broad red backgrounds, generic purple accents, or a default dark-mode palette.
- **Don't** add ambient shadows or glass effects where a border, tonal shift, or open plane already explains the hierarchy.
