/**
 * Deleting a Customer Account by its owner (account management A4). Everything
 * the account owns goes with it by cascade; stored files follow through the
 * deletion outbox 30 days later. An account with Quote Requests is not deleted
 * here: rotpunkt does that by hand (Martin, 2026-10-23).
 */
export type AccountDeletionResult = { kind: "deleted" } | { kind: "has-requests" } | { kind: "not-found" };

export type AccountDeletion = {
  deleteAccount(input: { provider: string; providerSubject: string }): Promise<AccountDeletionResult>;
};

/** The code Better Auth's deleteUser answers with when the account has Quote Requests. */
export const ACCOUNT_HAS_REQUESTS = "ACCOUNT_HAS_REQUESTS";

/** How recent a sign-in must be to delete the account (Better Auth's session freshAge). */
export const ACCOUNT_DELETION_FRESH_SECONDS = 15 * 60;
