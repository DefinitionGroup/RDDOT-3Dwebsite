import type { LocaleCode } from "@/features/configurator/types";

/**
 * The one list of site locales. German is the default and lives unprefixed at
 * `/`; every other locale lives under its own prefix (`/en`, `/es`).
 */
export const LOCALES = ["de", "en", "es"] as const satisfies readonly LocaleCode[];

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "de";

export const LOCALE_TITLES: Record<Locale, string> = {
  de: "Deutsch",
  en: "English",
  es: "Español"
};

/** The language list in the shape both Sanity localization plugins expect. */
export const sanityLanguages = LOCALES.map((id) => ({ id, title: LOCALE_TITLES[id] }));

/**
 * Locales the public site serves. A locale opens only once its pages,
 * navigation and functional copy are complete; until then its prefix is a 404
 * rather than a page that borrows German text.
 */
export const LAUNCHED_LOCALES: readonly Locale[] = ["de"];

/**
 * First path segments the application owns. Editorial pages may not take
 * these as slugs, and the proxy leaves `api` and `studio` alone.
 */
export const RESERVED_SEGMENTS = [
  ...LOCALES,
  "api",
  "studio",
  "configure",
  "konto",
  "anfrage",
  "share",
  "checkout"
] as const;

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

export function isLaunchedLocale(value: string): value is Locale {
  return isLocale(value) && LAUNCHED_LOCALES.includes(value);
}

/** The public path of `path` in `locale`: `/` stays `/` in German, `/en` in English. */
export function localizePath(locale: Locale, path: string) {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (locale === DEFAULT_LOCALE) return normalized;
  return normalized === "/" ? `/${locale}` : `/${locale}${normalized}`;
}
