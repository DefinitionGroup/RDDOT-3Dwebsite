/**
 * Headlines carry exactly one serif word. Editors mark it with asterisks —
 * `Küchen, auf den *Punkt*.` — and these helpers turn that into segments the
 * components render with `<em>`.
 */
export type EmphasisSegment = { text: string; serif: boolean };

export function parseEmphasis(text: string): EmphasisSegment[] {
  return text
    .split("*")
    .map((part, index) => ({ text: part, serif: index % 2 === 1 }))
    .filter((segment) => segment.text.length > 0);
}

/** The headline without its markers, for alt texts, titles and validation. */
export function plainEmphasis(text: string) {
  return text.replaceAll("*", "");
}

/** How many serif words a headline marks (a pair of asterisks is one). */
export function countEmphasis(text: string) {
  return Math.floor((text.match(/\*/g)?.length ?? 0) / 2);
}

/**
 * Words for word-by-word reveals. A word may mix plain and serif parts, as in
 * `*Punkt*.`, so the period stays glued to its word.
 */
export function emphasisWords(text: string): EmphasisSegment[][] {
  const words: EmphasisSegment[][] = [];
  let current: EmphasisSegment[] = [];
  for (const segment of parseEmphasis(text)) {
    const pieces = segment.text.split(/(\s+)/);
    for (const piece of pieces) {
      if (piece.length === 0) continue;
      if (/^\s+$/.test(piece)) {
        if (current.length) words.push(current);
        current = [];
      } else {
        current.push({ text: piece, serif: segment.serif });
      }
    }
  }
  if (current.length) words.push(current);
  return words;
}
