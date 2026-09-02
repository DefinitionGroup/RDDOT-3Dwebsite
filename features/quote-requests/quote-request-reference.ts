/**
 * Customer-facing reference for a Quote Request: `A-` plus eight symbols from
 * an alphabet without 0/O and 1/I, so it can be read over the phone. Forty
 * bits of randomness; uniqueness is still enforced by the database, and the
 * writer retries on the rare collision.
 */
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export const QUOTE_REQUEST_REFERENCE_PATTERN = /^A-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{8}$/;

export function createQuoteRequestReference(
  randomBytes: (length: number) => Uint8Array = (length) =>
    crypto.getRandomValues(new Uint8Array(length))
) {
  const bytes = randomBytes(8);
  let body = "";
  for (const byte of bytes) {
    // 256 is a multiple of 32, so the modulo introduces no bias.
    body += ALPHABET[byte % ALPHABET.length];
  }
  return `A-${body}`;
}

/** `A-7K3M9Q2X` → `A-7K3M 9Q2X`, easier to read on a confirmation. */
export function formatQuoteRequestReference(reference: string) {
  return QUOTE_REQUEST_REFERENCE_PATTERN.test(reference)
    ? `${reference.slice(0, 6)} ${reference.slice(6)}`
    : reference;
}
