/**
 * Sign-in codes per email address: at most three in ten minutes, wherever they
 * are requested from. Better Auth's own limit counts per client address
 * (create-auth.ts) and is set high enough for a showroom's tablets or an office
 * behind one address; this one keeps a single inbox from being flooded with
 * codes and caps the codes, and so the guesses, an address gets.
 */
export const SIGN_IN_CODES_PER_EMAIL = 3;
export const SIGN_IN_CODE_WINDOW_SECONDS = 600;

export type SignInCodeVerdict = { allowed: true } | { allowed: false; retryAfterSeconds: number };

export type SignInCodeLimit = {
  /** Counts one code request for the address and says whether it may be sent. */
  consume(email: string): Promise<SignInCodeVerdict>;
};

/** Better Auth lower-cases the address it sends to; the limit counts the same one. */
export function normalizeSignInEmail(email: string) {
  return email.trim().toLowerCase();
}
