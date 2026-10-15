import { DEFAULT_LOCALE, LOCALES, type Locale } from "./i18n";
import { pagePath } from "./language-links";

type Translation = { language: string | null; slug: string | null; isHomepage: boolean | null };

type SeoPage = {
  locale: Locale;
  isHomepage: boolean | null;
  slug: string | null;
  /** The page's linked translations, as the page query projects them. */
  translations: Translation[] | null;
};

/**
 * The hreflang list of a page: the page itself and each linked translation
 * that exists and whose locale is public, in the site's locale order, plus
 * `x-default` → the German page when there is one. Search engines are never
 * pointed at a locale that answers 404, nor at a homepage standing in for a
 * missing translation. Null when fewer than two languages remain: a page
 * alone needs no alternates.
 */
export function hreflangAlternates(page: SeoPage, publicLocales: readonly Locale[]): Record<string, string> | null {
  if (!publicLocales.includes(page.locale)) return null;
  const paths = new Map<Locale, string>();
  for (const locale of LOCALES) {
    if (!publicLocales.includes(locale)) continue;
    if (locale === page.locale) {
      paths.set(locale, pagePath(locale, page));
      continue;
    }
    const translation = page.translations?.find((entry) => entry.language === locale);
    if (translation && (translation.isHomepage || translation.slug)) paths.set(locale, pagePath(locale, translation));
  }
  if (paths.size < 2) return null;
  const languages: Record<string, string> = Object.fromEntries(paths);
  const fallback = paths.get(DEFAULT_LOCALE);
  if (fallback) languages["x-default"] = fallback;
  return languages;
}
