import "server-only";
import { demoPages, getDemoChrome, getDemoPage, getDemoSettings } from "@/content/demo";
import type { Locale } from "@/lib/i18n";
import type {
  HOME_PAGE_QUERY_RESULT,
  NAVIGATION_QUERY_RESULT,
  PAGE_QUERY_RESULT,
  SITE_SETTINGS_QUERY_RESULT,
  SITEMAP_QUERY_RESULT
} from "@/sanity.types";
import { isSanityConfigured } from "@/sanity/env";
import { sanityFetch } from "./live";
import { HOME_PAGE_QUERY, NAVIGATION_QUERY, PAGE_QUERY, SITE_SETTINGS_QUERY, SITEMAP_QUERY } from "./queries";

/*
 * The EditorialContent seam of ADR 0007: the only place editorial content is
 * fetched. Demo content answers ONLY when Sanity is not configured; once it
 * is, a missing document is a real 404 and is never masked by demo data.
 *
 * Every read also carries the "sanity" cache tag: public visitors get no live
 * connection to Sanity, so the publish webhook (app/api/webhooks/sanity)
 * revalidates that tag instead.
 */
export const SANITY_CACHE_TAG = "sanity";
const CACHE_TAGS = [SANITY_CACHE_TAG];

/**
 * `stega: false` for anything that is not rendered copy — titles, meta tags,
 * the sitemap — so Editorial Preview never writes invisible edit markers
 * into them. Undefined leaves it to draft mode.
 */
type ReadOptions = { stega?: false };

/** An Editorial Page in one locale; `slug: null` is that locale's homepage. */
export async function loadPage(
  locale: Locale,
  slug: string | null,
  { stega }: ReadOptions = {}
): Promise<PAGE_QUERY_RESULT> {
  if (!isSanityConfigured) return getDemoPage(locale, slug);
  if (slug === null) {
    const { data } = await sanityFetch({ query: HOME_PAGE_QUERY, params: { locale }, stega, tags: CACHE_TAGS });
    return data as HOME_PAGE_QUERY_RESULT;
  }
  const { data } = await sanityFetch({ query: PAGE_QUERY, params: { locale, slug }, stega, tags: CACHE_TAGS });
  return data as PAGE_QUERY_RESULT;
}

/** Header and footer links of one locale; null renders a header without links. */
export async function loadSiteChrome(locale: Locale): Promise<NAVIGATION_QUERY_RESULT> {
  if (!isSanityConfigured) return getDemoChrome(locale);
  const { data } = await sanityFetch({ query: NAVIGATION_QUERY, params: { locale }, tags: CACHE_TAGS });
  return data as NAVIGATION_QUERY_RESULT;
}

/** Site-wide defaults in one locale; null means the code defaults apply. */
export async function loadSiteSettings(locale: Locale, { stega }: ReadOptions = {}): Promise<SITE_SETTINGS_QUERY_RESULT> {
  if (!isSanityConfigured) return getDemoSettings(locale);
  const { data } = await sanityFetch({ query: SITE_SETTINGS_QUERY, params: { locale }, stega, tags: CACHE_TAGS });
  return data as SITE_SETTINGS_QUERY_RESULT;
}

/** Every published, addressable page in the given locales, for the sitemap. Never drafts. */
export async function loadSitemapPages(locales: readonly Locale[]): Promise<SITEMAP_QUERY_RESULT> {
  if (!isSanityConfigured) {
    return demoPages
      .filter((page) => locales.includes(page.language))
      .map(({ language, slug, isHomepage, translations }) => ({
        language,
        slug,
        isHomepage,
        _updatedAt: "",
        translations
      }));
  }
  const { data } = await sanityFetch({
    query: SITEMAP_QUERY,
    params: { locales: [...locales] },
    perspective: "published",
    stega: false,
    tags: CACHE_TAGS
  });
  return data as SITEMAP_QUERY_RESULT;
}
