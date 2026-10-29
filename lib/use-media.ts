"use client";

import { useSyncExternalStore } from "react";

const DESKTOP_QUERY = "(min-width: 1024px)";
/** A phone held sideways: wide enough for a side card, too short for a sheet below the scene. */
const SHORT_LANDSCAPE_QUERY = "(orientation: landscape) and (max-height: 500px)";

function watch(query: string) {
  return {
    subscribe(onChange: () => void) {
      const media = window.matchMedia(query);
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    },
    read: () => window.matchMedia(query).matches
  };
}

const desktop = watch(DESKTOP_QUERY);
const shortLandscape = watch(SHORT_LANDSCAPE_QUERY);

/**
 * Whether the viewport is at the desktop breakpoint (Tailwind `lg`). The
 * server assumes desktop; the client corrects on hydration without a mismatch,
 * so only one of two layouts is ever mounted instead of both hidden by CSS.
 */
export function useIsDesktop() {
  return useSyncExternalStore(desktop.subscribe, desktop.read, () => true);
}

/** Whether a phone is held sideways (see SHORT_LANDSCAPE_QUERY). The server assumes not. */
export function useIsShortLandscape() {
  return useSyncExternalStore(shortLandscape.subscribe, shortLandscape.read, () => false);
}
