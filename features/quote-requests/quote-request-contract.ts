import { z } from "zod";

/**
 * One source of truth for what a submission may contain. The API route, the
 * module boundary and the form's native constraints all derive from it.
 */
export const QUOTE_REQUEST_LIMITS = {
  nameMax: 120,
  emailMax: 254,
  phoneMin: 3,
  phoneMax: 40,
  noteMax: 2000
} as const;

/**
 * Identifies the consent wording the person accepted. Bump it whenever the
 * wording changes so a stored request always names what was agreed to.
 */
export const QUOTE_REQUEST_CONSENT_VERSION = "anfrage-datenschutz-2026-09";

export const quoteRequestContactSchema = z.object({
  name: z.string().trim().min(1).max(QUOTE_REQUEST_LIMITS.nameMax),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(QUOTE_REQUEST_LIMITS.emailMax)
    .pipe(z.email()),
  phone: z
    .string()
    .trim()
    .transform((value) => (value.length === 0 ? null : value))
    .pipe(
      z
        .string()
        .min(QUOTE_REQUEST_LIMITS.phoneMin)
        .max(QUOTE_REQUEST_LIMITS.phoneMax)
        .nullable()
    )
    .nullable()
    .default(null)
});

export const quoteRequestNoteSchema = z
  .string()
  .trim()
  .max(QUOTE_REQUEST_LIMITS.noteMax)
  .default("");

/** The body a browser sends to submit a Quote Request. */
export const quoteRequestSubmissionSchema = z.object({
  expectedVersion: z.number().int().positive(),
  idempotencyKey: z.uuid(),
  contact: quoteRequestContactSchema,
  note: quoteRequestNoteSchema,
  /** Must be true; the accepted wording version is recorded server-side. */
  consent: z.literal(true)
});

export type QuoteRequestSubmission = z.infer<typeof quoteRequestSubmissionSchema>;
