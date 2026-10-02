import "server-only";
import { draftMode } from "next/headers";
import { isLocale, isOpenLocale, LOCALES, OPEN_LOCALES, type Locale } from "./i18n";

/** Locales this request may switch to: the open ones, or all of them in Editorial Preview. */
export async function visibleLocales(): Promise<readonly Locale[]> {
  if (OPEN_LOCALES.length === LOCALES.length) return LOCALES;
  return (await draftMode()).isEnabled ? LOCALES : OPEN_LOCALES;
}

/**
 * The locale if this request may show it: open locales always (launched, or
 * every locale in development), the others only in Editorial Preview, so
 * translations can be checked before they launch. Draft mode is read only for
 * closed locales, which keeps the launched pages static.
 */
export async function visibleLocale(locale: string): Promise<Locale | null> {
  if (isOpenLocale(locale)) return locale;
  if (isLocale(locale) && (await draftMode()).isEnabled) return locale;
  return null;
}
