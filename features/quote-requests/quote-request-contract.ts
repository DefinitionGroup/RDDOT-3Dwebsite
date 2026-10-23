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
  titleMax: 40,
  companyMax: 120,
  postalCodeMax: 10,
  wallLengthMinCm: 100,
  wallLengthMaxCm: 2000,
  noteMax: 2000
} as const;

/** Letters, digits, spaces and hyphens, 3 to 10 characters: German and European postcodes. */
export const POSTAL_CODE_PATTERN = /^[A-Z0-9](?:[A-Z0-9 -]{1,8})[A-Z0-9]$/;

// The choices a profile and a request offer. "" is no answer for each.
export const SALUTATIONS = ["frau", "herr", "divers"] as const;
export const CONTACT_CHANNELS = ["phone", "email", "either"] as const;
export const CONTACT_TIMES = ["morning", "afternoon", "evening", "anytime"] as const;
export const CUSTOMER_TYPES = ["private", "professional"] as const;
export const PROFESSIONAL_ROLES = ["architecture", "developer", "trade", "other"] as const;
export const PROJECT_KINDS = ["new-build", "renovation", "move", "other"] as const;
export const TIMEFRAMES = ["within-3-months", "3-6-months", "6-12-months", "later", "open"] as const;
/** Placeholder bands around the Richtpreis until rotpunkt names its own. */
export const BUDGET_BANDS = ["up-to-10k", "10-15k", "15-25k", "over-25k"] as const;

function choice<const T extends readonly [string, ...string[]]>(values: T) {
  return z.union([z.literal(""), z.enum(values)]).default("");
}

export const postalCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .refine((value) => value === "" || POSTAL_CODE_PATTERN.test(value))
  .default("");

/**
 * How to address and reach a person, and whether they plan privately or for a
 * client. The profile keeps them; a request copies them at submission.
 */
export const contactDetailsShape = {
  salutation: choice(SALUTATIONS),
  title: z.string().trim().max(QUOTE_REQUEST_LIMITS.titleMax).default(""),
  contactChannel: choice(CONTACT_CHANNELS),
  contactTime: choice(CONTACT_TIMES),
  customerType: choice(CUSTOMER_TYPES),
  company: z.string().trim().max(QUOTE_REQUEST_LIMITS.companyMax).default(""),
  professionalRole: choice(PROFESSIONAL_ROLES)
};

export type ContactDetails = z.output<z.ZodObject<typeof contactDetailsShape>>;

/** A company and a role belong to professionals; for anyone else they are dropped. */
export function normalizeContactDetails<T extends ContactDetails>(details: T): T {
  return details.customerType === "professional" ? details : { ...details, company: "", professionalRole: "" };
}

/** What contact details must add up to: a number to be called on, a company for professionals. */
export function contactDetailsIssues(details: ContactDetails, hasPhone: boolean) {
  const issues: ("phone-for-calls" | "company-for-professionals")[] = [];
  if (details.contactChannel === "phone" && !hasPhone) issues.push("phone-for-calls");
  if (details.customerType === "professional" && details.company === "") issues.push("company-for-professionals");
  return issues;
}

/**
 * Identifies the consent wording the person accepted. Bump it whenever the
 * wording changes so a stored request always names what was agreed to.
 */
export const QUOTE_REQUEST_CONSENT_VERSION = "anfrage-datenschutz-2026-09";

/**
 * Whether a submitted Quote Request reaches rotpunkt. False until the
 * `quote-request.submitted` outbox has a consumer (ADR 0010; the board's "Real
 * sign-in emails and request notifications"): the confirmation then says the
 * request is saved instead of promising a reply nobody is told about. The work
 * that delivers requests switches it on.
 */
export const QUOTE_REQUESTS_REACH_ROTPUNKT = false;

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
    .default(null),
  postalCode: postalCodeSchema,
  ...contactDetailsShape
})
  .transform(normalizeContactDetails)
  .superRefine((contact, context) => {
    for (const issue of contactDetailsIssues(contact, contact.phone !== null)) {
      context.addIssue({ code: "custom", message: issue });
    }
  });

export type QuoteRequestContact = z.output<typeof quoteRequestContactSchema>;

/** P2: what this one kitchen is about. Every fact is optional. */
export const quoteRequestPlanningSchema = z
  .object({
    projectKind: choice(PROJECT_KINDS),
    timeframe: choice(TIMEFRAMES),
    budgetBand: choice(BUDGET_BANDS),
    wallLengthCm: z
      .number()
      .int()
      .min(QUOTE_REQUEST_LIMITS.wallLengthMinCm)
      .max(QUOTE_REQUEST_LIMITS.wallLengthMaxCm)
      .nullable()
      .default(null)
  })
  .prefault({});

export type QuoteRequestPlanning = z.output<typeof quoteRequestPlanningSchema>;

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
  planning: quoteRequestPlanningSchema,
  note: quoteRequestNoteSchema,
  /** Must be true; the accepted wording version is recorded server-side. */
  consent: z.literal(true)
});

export type QuoteRequestSubmission = z.infer<typeof quoteRequestSubmissionSchema>;
