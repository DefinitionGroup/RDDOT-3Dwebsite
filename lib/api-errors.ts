/**
 * What an API route answers when it refuses a request: `{ code }`, never a
 * sentence. The screens turn the code into words in the visitor's language
 * (`apiErrors` in `lib/messages`), so the API stays the same for every locale
 * and a code without a translation fails the build.
 */
export const API_ERROR_CODES = [
  "session-expired",
  "signed-out",
  "sign-in-to-save",
  "invalid-request",
  "invalid-cursor",
  "invalid-project",
  "invalid-project-request",
  "invalid-save-request",
  "invalid-project-name",
  "invalid-name",
  "invalid-profile",
  "avatar-not-an-image",
  "avatar-too-small",
  "avatar-too-large",
  "avatar-storage-failed",
  "invalid-revision",
  "invalid-link",
  "invalid-job",
  "invalid-photo",
  "invalid-delivery",
  "email-required",
  "not-found",
  "photo-not-found",
  "link-not-found",
  "quote-request-not-found",
  "project-not-editable",
  "project-not-shareable",
  "project-not-requestable",
  "project-conflict",
  "project-lifecycle-conflict",
  "project-not-trashed",
  "project-has-requests",
  "unreadable-configuration",
  "product-version-retired",
  "working-version-retired",
  "product-version-not-shareable",
  "historical-version-unavailable",
  "historical-version-not-restorable",
  "revision-not-usable",
  "save-key-reused",
  "share-key-reused",
  "request-key-reused",
  "quote-key-reused",
  "token-conflict",
  "shared-revision-unavailable",
  "shared-revision-gone",
  "quote-details-required",
  "quote-daily-limit",
  "photo-daily-limit",
  "photo-budget-exhausted",
  "scene-not-offered",
  "capture-rejected",
  "job-not-ready",
  "generation-not-started"
] as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

export function isApiErrorCode(value: unknown): value is ApiErrorCode {
  return typeof value === "string" && (API_ERROR_CODES as readonly string[]).includes(value);
}
