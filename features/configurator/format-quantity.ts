import type { LocaleCode } from "@/features/configurator/types";
import { INTL_LOCALE } from "@/lib/i18n";

/**
 * A price line's quantity: metres of worktop, or a count of units. Plain, so
 * the request summary can format on the server what the panel formats in the
 * browser.
 */
export function formatQuantity(key: string, quantity: number, locale: LocaleCode) {
  if (key === "island-worktop") {
    return `${quantity.toLocaleString(INTL_LOCALE[locale], { maximumFractionDigits: 1 })} m`;
  }
  return `${quantity} ×`;
}
