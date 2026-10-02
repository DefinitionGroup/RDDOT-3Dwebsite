import "server-only";
import { draftMode } from "next/headers";
import { isLaunchedLocale, isLocale, LAUNCHED_LOCALES, LOCALES, type Locale } from "./i18n";

/** Locales this request may switch to: the launched ones, or all of them in Editorial Preview. */
export async function visibleLocales(): Promise<readonly Locale[]> {
  return (await draftMode()).isEnabled ? LOCALES : LAUNCHED_LOCALES;
}

/**
 * The locale if this request may show it: launched locales always, the
 * others only in Editorial Preview, so translations can be checked before
 * they launch. Draft mode is read only for unlaunched locales, which keeps
 * the launched pages static.
 */
export async function visibleLocale(locale: string): Promise<Locale | null> {
  if (isLaunchedLocale(locale)) return locale;
  if (isLocale(locale) && (await draftMode()).isEnabled) return locale;
  return null;
}
