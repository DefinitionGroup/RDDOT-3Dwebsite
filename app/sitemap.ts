import type { MetadataRoute } from "next";
import { LAUNCHED_LOCALES } from "@/lib/i18n";
import { pagePath } from "@/lib/language-links";
import { hreflangAlternates } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site";
import { loadSitemapPages } from "@/sanity/lib/loaders";

const absolute = (paths: Record<string, string> | null) =>
  paths ? Object.fromEntries(Object.entries(paths).map(([language, path]) => [language, absoluteUrl(path)])) : undefined;

/**
 * Every published Editorial Page and the configurator, in launched locales
 * only, each with the hreflang list its page carries. Regenerated when the
 * publish webhook revalidates the "sanity" tag.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = await loadSitemapPages(LAUNCHED_LOCALES);
  const editorial = pages.map((page) => ({
    url: absoluteUrl(pagePath(page.language, page)),
    ...(page._updatedAt ? { lastModified: new Date(page._updatedAt) } : {}),
    changeFrequency: page.isHomepage ? ("weekly" as const) : ("monthly" as const),
    priority: page.isHomepage ? 1 : 0.7,
    alternates: { languages: absolute(hreflangAlternates({ ...page, locale: page.language }, LAUNCHED_LOCALES)) }
  }));

  // The configurator has the same path in every locale, so it reads like a
  // page translated everywhere under one slug.
  const configureEverywhere = LAUNCHED_LOCALES.map((language) => ({ language, slug: "configure", isHomepage: false }));
  const configurator = LAUNCHED_LOCALES.map((locale) => {
    const route = { locale, slug: "configure", isHomepage: false, translations: configureEverywhere };
    return {
      url: absoluteUrl(pagePath(locale, route)),
      changeFrequency: "monthly" as const,
      priority: 0.9,
      alternates: { languages: absolute(hreflangAlternates(route, LAUNCHED_LOCALES)) }
    };
  });

  return [...editorial, ...configurator];
}
