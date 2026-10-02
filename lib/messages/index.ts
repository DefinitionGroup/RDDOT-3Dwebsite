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
