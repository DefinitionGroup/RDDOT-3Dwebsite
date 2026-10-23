import { z } from "zod";
import type { CustomerAccountId } from "@/features/projects/project-module";
import {
  contactDetailsIssues,
  contactDetailsShape,
  normalizeContactDetails,
  postalCodeSchema,
  QUOTE_REQUEST_LIMITS
} from "@/features/quote-requests/quote-request-contract";

/**
 * What a person keeps about themselves in their account. Every field may stay
 * empty; the request form offers what is filled in. The fields share the
 * request contact's limits and choices, so a profile always fits a request.
 */
export const CUSTOMER_PROFILE_LIMITS = QUOTE_REQUEST_LIMITS;

export const customerProfileSchema = z
  .object({
    name: z.string().trim().max(CUSTOMER_PROFILE_LIMITS.nameMax),
    phone: z
      .string()
      .trim()
      .max(CUSTOMER_PROFILE_LIMITS.phoneMax)
      .refine((value) => value === "" || value.length >= CUSTOMER_PROFILE_LIMITS.phoneMin),
    postalCode: postalCodeSchema,
    ...contactDetailsShape
  })
  .transform(normalizeContactDetails)
  .superRefine((profile, context) => {
    for (const issue of contactDetailsIssues(profile, profile.phone !== "")) {
      context.addIssue({ code: "custom", message: issue });
    }
  });

export type CustomerProfile = z.output<typeof customerProfileSchema>;
/** What a caller may hand in: missing choices read as no answer. */
export type CustomerProfileInput = z.input<typeof customerProfileSchema>;

export const EMPTY_CUSTOMER_PROFILE: CustomerProfile = {
  name: "",
  phone: "",
  postalCode: "",
  salutation: "",
  title: "",
  contactChannel: "",
  contactTime: "",
  customerType: "",
  company: "",
  professionalRole: ""
};

export type CustomerProfileModule = {
  /** The owner's profile; empty fields when nothing has been saved yet. */
  getProfile(input: { ownerId: CustomerAccountId }): Promise<CustomerProfile>;
  /** Replaces the whole profile and returns it as stored. */
  saveProfile(input: { ownerId: CustomerAccountId; profile: CustomerProfileInput }): Promise<CustomerProfile>;
};

/** Up to two letters for the account's circle: first and last word of the name, else the email. */
export function profileInitials(name: string, email: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const source = words.length > 0 ? [words[0], words.length > 1 ? words[words.length - 1] : ""] : [email.trim(), ""];
  return source
    .map((word) => [...word][0] ?? "")
    .join("")
    .toLocaleUpperCase();
}
