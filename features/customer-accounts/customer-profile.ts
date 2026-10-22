import { z } from "zod";
import type { CustomerAccountId } from "@/features/projects/project-module";
import { QUOTE_REQUEST_LIMITS } from "@/features/quote-requests/quote-request-contract";

/**
 * What a person keeps about themselves in their account. Every field may stay
 * empty; the request form offers what is filled in. Name and phone share the
 * request contact's limits, so a profile always fits a request.
 */
export const CUSTOMER_PROFILE_LIMITS = {
  nameMax: QUOTE_REQUEST_LIMITS.nameMax,
  phoneMin: QUOTE_REQUEST_LIMITS.phoneMin,
  phoneMax: QUOTE_REQUEST_LIMITS.phoneMax,
  postalCodeMax: 10
} as const;

/** Letters, digits, spaces and hyphens, 3 to 10 characters: German and European postcodes. */
const POSTAL_CODE = /^[A-Z0-9](?:[A-Z0-9 -]{1,8})[A-Z0-9]$/;

export const customerProfileSchema = z.object({
  name: z.string().trim().max(CUSTOMER_PROFILE_LIMITS.nameMax),
  phone: z
    .string()
    .trim()
    .max(CUSTOMER_PROFILE_LIMITS.phoneMax)
    .refine((value) => value === "" || value.length >= CUSTOMER_PROFILE_LIMITS.phoneMin),
  postalCode: z
    .string()
    .trim()
    .toUpperCase()
    .refine((value) => value === "" || POSTAL_CODE.test(value))
});

export type CustomerProfile = z.infer<typeof customerProfileSchema>;

export const EMPTY_CUSTOMER_PROFILE: CustomerProfile = { name: "", phone: "", postalCode: "" };

export type CustomerProfileModule = {
  /** The owner's profile; empty fields when nothing has been saved yet. */
  getProfile(input: { ownerId: CustomerAccountId }): Promise<CustomerProfile>;
  /** Replaces the whole profile and returns it as stored. */
  saveProfile(input: { ownerId: CustomerAccountId; profile: CustomerProfile }): Promise<CustomerProfile>;
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
