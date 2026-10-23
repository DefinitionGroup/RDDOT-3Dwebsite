/**
 * Where an arrow, Home or End key moves in a row of `count` options, wrapping
 * at the ends; null for any other key.
 */
export function arrowTarget(key: string, index: number, count: number): number | null {
  if (count === 0) return null;
  switch (key) {
    case "ArrowRight":
    case "ArrowDown":
      return (index + 1) % count;
    case "ArrowLeft":
    case "ArrowUp":
      return (index - 1 + count) % count;
    case "Home":
      return 0;
    case "End":
      return count - 1;
    default:
      return null;
  }
}

/**
 * Where Tab (or Shift+Tab) goes among a dialog's `count` focusable elements
 * when focus is at `activeIndex` (-1: not inside). Past either end it wraps;
 * null lets the browser move to the neighbour.
 */
export function tabTarget(activeIndex: number, count: number, shift: boolean): number | null {
  if (count === 0) return null;
  if (shift) return activeIndex <= 0 ? count - 1 : null;
  return activeIndex === -1 || activeIndex === count - 1 ? 0 : null;
}
