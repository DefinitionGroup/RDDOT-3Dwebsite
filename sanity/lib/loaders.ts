import "server-only";
import { getDemoChrome, getDemoPage } from "@/content/demo";
import type { Locale } from "@/lib/i18n";
import type { HOME_PAGE_QUERY_RESULT, NAVIGATION_QUERY_RESULT, PAGE_QUERY_RESULT } from "@/sanity.types";
import { isSanityConfigured } from "@/sanity/env";
import { sanityFetch } from "./live";
import { HOME_PAGE_QUERY, NAVIGATION_QUERY, PAGE_QUERY } from "./queries";

/*
 * The EditorialContent seam of ADR 0007: the only place editorial content is
 * fetched. Demo content answers ONLY when Sanity is not configured; once it
 * is, a missing document is a real 404 and is never masked by demo data.
 */

/** An Editorial Page in one locale; `slug: null` is that locale's homepage. */
export async function loadPage(locale: Locale, slug: string | null): Promise<PAGE_QUERY_RESULT> {
  if (!isSanityConfigured) return getDemoPage(locale, slug);
  if (slug === null) {
    const { data } = await sanityFetch({ query: HOME_PAGE_QUERY, params: { locale } });
    return data as HOME_PAGE_QUERY_RESULT;
  }
  const { data } = await sanityFetch({ query: PAGE_QUERY, params: { locale, slug } });
  return data as PAGE_QUERY_RESULT;
}

/** Header and footer links of one locale; null renders a header without links. */
export async function loadSiteChrome(locale: Locale): Promise<NAVIGATION_QUERY_RESULT> {
  if (!isSanityConfigured) return getDemoChrome(locale);
  const { data } = await sanityFetch({ query: NAVIGATION_QUERY, params: { locale } });
  return data as NAVIGATION_QUERY_RESULT;
}
