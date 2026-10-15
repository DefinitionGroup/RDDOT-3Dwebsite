import { isApiErrorCode } from "@/lib/api-errors";
import type { Locale } from "@/lib/i18n";
import { de, type Messages } from "./de";
import { en } from "./en";
import { es } from "./es";

export type { Messages };

const MESSAGES: Record<Locale, Messages> = { de, en, es };

/** The interface words of one locale. Small and plain, so client components may import it too. */
export function getMessages(locale: Locale): Messages {
  return MESSAGES[locale];
}

/**
 * The words for an API refusal: the response's `code` in this locale, or the
 * caller's own fallback when the body carries no known code.
 */
export function apiErrorMessage(messages: Messages, payload: unknown, fallback: string) {
  const code = (payload as { code?: unknown } | null)?.code;
  return isApiErrorCode(code) ? messages.apiErrors[code] : fallback;
}
