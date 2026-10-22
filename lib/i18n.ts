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

/**
 * The `Intl` locale each site locale formats dates and numbers with. English
 * is British: the site sells from Germany into Europe, so dates read
 * day-month-year.
 */
export const INTL_LOCALE: Record<Locale, string> = {
  de: "de-DE",
  en: "en-GB",
  es: "es-ES"
};

/**
 * The header a browser request names its page's locale in, where the server
 * has to write in that language but sees no locale in the URL: the sign-in
 * code email.
 */
export const LOCALE_HEADER = "x-site-locale";

/** The language list in the shape both Sanity localization plugins expect. */
export const sanityLanguages = LOCALES.map((id) => ({ id, title: LOCALE_TITLES[id] }));

/**
 * Locales the public site serves. A locale opens only once its pages,
 * navigation and functional copy are complete; until then its prefix is a 404
 * rather than a page that borrows German text.
 */
export const LAUNCHED_LOCALES: readonly Locale[] = ["de"];

/**
 * Whether this deployment opens every locale before launch: a developer's
 * machine always, any other deployment only when it sets
 * `OPEN_ALL_LOCALES=true` so translations can be reviewed there. Vercel's
 * Production is a test environment for now (STATUS.md, Deployment), so the
 * flag counts there too; it must be removed before real customers arrive.
 */
export function opensAllLocales(
  env: { NODE_ENV?: string; OPEN_ALL_LOCALES?: string } = {
    NODE_ENV: process.env.NODE_ENV,
    OPEN_ALL_LOCALES: process.env.OPEN_ALL_LOCALES
  }
) {
  if (env.NODE_ENV === "development") return true;
  return env.OPEN_ALL_LOCALES === "true";
}

/**
 * Locales a request may open without Editorial Preview: the launched ones in
 * production, all of them where `opensAllLocales()` says so.
 */
export const OPEN_LOCALES: readonly Locale[] = opensAllLocales() ? LOCALES : LAUNCHED_LOCALES;

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

export function isOpenLocale(value: string): value is Locale {
  return isLocale(value) && OPEN_LOCALES.includes(value);
}

/** The public path of `path` in `locale`: `/` stays `/` in German, `/en` in English. */
export function localizePath(locale: Locale, path: string) {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (locale === DEFAULT_LOCALE) return normalized;
  return normalized === "/" ? `/${locale}` : `/${locale}${normalized}`;
}

/** `localizePath` undone: `/en/anfrage?project=…` → `/anfrage?project=…`, `/en` → `/`. */
export function unlocalizePath(path: string) {
  const match = /^\/([a-z]{2})(?=[/?#]|$)/.exec(path);
  if (!match || !isLocale(match[1]) || match[1] === DEFAULT_LOCALE) return path;
  const rest = path.slice(match[0].length);
  return rest.startsWith("/") ? rest : `/${rest}`;
}
