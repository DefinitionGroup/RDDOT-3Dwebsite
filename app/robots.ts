import type { MetadataRoute } from "next";
import { LAUNCHED_LOCALES, localizePath } from "@/lib/i18n";
import { SEARCH_INDEXING } from "@/lib/search-indexing";
import { absoluteUrl } from "@/lib/site";

/** Private and transactional screens: an account, a request, a shared link. */
const PRIVATE_PATHS = ["/konto", "/anfrage", "/share/"];

/**
 * A deployment that must stay out of search engines keeps the same crawl
 * rules but names no sitemap: its pages answer noindex, and a crawler has to
 * be let in to read that, or URLs it already knows can stay listed.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/studio",
        ...LAUNCHED_LOCALES.flatMap((locale) => PRIVATE_PATHS.map((path) => localizePath(locale, path)))
      ]
    },
    ...(SEARCH_INDEXING ? { sitemap: absoluteUrl("/sitemap.xml") } : {})
  };
}
