import { LOCALES, localizePath, type Locale } from "./i18n";

export type LanguageLink = { locale: Locale; href: string; current: boolean };

type Translation = { language: string | null; slug: string | null; isHomepage: boolean | null };

type CurrentPage = {
  locale: Locale;
  isHomepage: boolean | null;
  slug: string | null;
  /** The page's linked translations, as the page query projects them. */
  translations: Translation[] | null;
};

/** A page's public path in its locale: `/` for the homepage, `/en/kitchens` for a slug. */
export const pagePath = (locale: Locale, page: { isHomepage: boolean | null; slug: string | null }) =>
  localizePath(locale, page.isHomepage || !page.slug ? "/" : `/${page.slug}`);

/**
 * The language switcher's links for one page: each visible locale points at
 * this page's translation, or at that locale's homepage when there is none.
 * Translations are never mixed in (ADR 0007), so a missing one leads home
 * rather than to a German page. Fewer than two visible locales: no switcher.
 */
export function languageLinks(page: CurrentPage, visible: readonly Locale[]): LanguageLink[] {
  const locales = LOCALES.filter((locale) => visible.includes(locale));
  if (locales.length < 2) return [];
  return locales.map((locale) => {
    if (locale === page.locale) return { locale, href: pagePath(locale, page), current: true };
    const translation = page.translations?.find((entry) => entry.language === locale);
    return { locale, href: translation ? pagePath(locale, translation) : localizePath(locale, "/"), current: false };
  });
}
