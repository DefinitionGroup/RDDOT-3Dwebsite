import { z } from "zod";
import {
  BUDGET_BANDS,
  contactDetailsShape,
  PROJECT_KINDS,
  QUOTE_REQUEST_CONSENT_VERSION,
  QUOTE_REQUEST_LIMITS,
  TIMEFRAMES
} from "@/features/quote-requests/quote-request-contract";

/**
 * What a person had typed into the request form when their session expired.
 * The form keeps it in the tab's session storage while they sign in again and
 * fills itself from it once, on return; nothing leaves the browser. A draft is
 * kept for half an hour, and the consent only if its wording is still the one
 * they accepted.
 */
export const QUOTE_REQUEST_DRAFT_LIFETIME_MS = 30 * 60 * 1000;

const KEY_PREFIX = "signature-quote-request-draft:";

const text = (max: number) => z.string().max(max);
const choice = <const T extends readonly [string, ...string[]]>(values: T) =>
  z.union([z.literal(""), z.enum(values)]);

const draftSchema = z.object({
  schemaVersion: z.literal(1),
  projectId: z.string().min(1),
  savedAt: z.iso.datetime(),
  contact: z.object({
    name: text(QUOTE_REQUEST_LIMITS.nameMax),
    email: text(QUOTE_REQUEST_LIMITS.emailMax),
    phone: text(QUOTE_REQUEST_LIMITS.phoneMax),
    postalCode: text(QUOTE_REQUEST_LIMITS.postalCodeMax),
    ...contactDetailsShape
  }),
  planning: z.object({
    projectKind: choice(PROJECT_KINDS),
    timeframe: choice(TIMEFRAMES),
    budgetBand: choice(BUDGET_BANDS)
  }),
  wallLength: text(8),
  note: text(QUOTE_REQUEST_LIMITS.noteMax),
  /** The consent wording version the person accepted, or null without consent. */
  consentVersion: z.string().nullable()
});

export type QuoteRequestDraft = z.output<typeof draftSchema>;

/** The form as typed, without the bookkeeping the draft adds. */
export type QuoteRequestDraftFields = Omit<QuoteRequestDraft, "schemaVersion" | "projectId" | "savedAt" | "consentVersion"> & {
  consent: boolean;
};

type DraftStorage = Pick<Storage, "getItem" | "removeItem" | "setItem">;

export function keepQuoteRequestDraft(
  storage: DraftStorage,
  projectId: string,
  fields: QuoteRequestDraftFields,
  now = new Date()
) {
  const { consent, ...rest } = fields;
  const draft: QuoteRequestDraft = {
    schemaVersion: 1,
    projectId,
    savedAt: now.toISOString(),
    ...rest,
    consentVersion: consent ? QUOTE_REQUEST_CONSENT_VERSION : null
  };
  try {
    storage.setItem(`${KEY_PREFIX}${projectId}`, JSON.stringify(draft));
    return true;
  } catch {
    return false;
  }
}

/** Takes the project's draft out of storage: it fills the form once. */
export function takeQuoteRequestDraft(
  storage: DraftStorage,
  projectId: string,
  now = new Date()
): QuoteRequestDraftFields | null {
  try {
    const key = `${KEY_PREFIX}${projectId}`;
    const stored = storage.getItem(key);
    if (stored === null) return null;
    storage.removeItem(key);

    const parsed = draftSchema.safeParse(JSON.parse(stored));
    if (!parsed.success || parsed.data.projectId !== projectId) return null;
    const age = now.getTime() - Date.parse(parsed.data.savedAt);
    if (age < 0 || age > QUOTE_REQUEST_DRAFT_LIFETIME_MS) return null;

    const { contact, planning, wallLength, note, consentVersion } = parsed.data;
    return {
      contact,
      planning,
      wallLength,
      note,
      consent: consentVersion === QUOTE_REQUEST_CONSENT_VERSION
    };
  } catch {
    return null;
  }
}
