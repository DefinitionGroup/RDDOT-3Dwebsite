"use client";

import { useSyncExternalStore } from "react";

const DESKTOP_QUERY = "(min-width: 1024px)";

function subscribe(onChange: () => void) {
  const media = window.matchMedia(DESKTOP_QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

/**
 * Whether the viewport is at the desktop breakpoint (Tailwind `lg`). The
 * server assumes desktop; the client corrects on hydration without a mismatch,
 * so only one of two layouts is ever mounted instead of both hidden by CSS.
 */
export function useIsDesktop() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(DESKTOP_QUERY).matches,
    () => true
  );
}
