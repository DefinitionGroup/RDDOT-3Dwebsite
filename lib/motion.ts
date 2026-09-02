/**
 * The motion contract: one curve, four durations, one stagger.
 * CSS mirrors these as --ease-signature and --duration-* in globals.css.
 */
export const SIGNATURE_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export const DURATION = {
  /** Hover, press, focus, chip switches. */
  state: 0.16,
  /** Accordions opening and closing. */
  accordion: 0.24,
  /** Overlays and sheets: slide plus fade. */
  overlay: 0.42,
  /** Entrances on scroll or mount. */
  reveal: 0.6
} as const;

/** Delay between sibling entrances. */
export const STAGGER = 0.06;

/** Entrances rise this far; overlays slide this far. */
export const REVEAL_RISE = 12;
export const OVERLAY_SLIDE = 24;
