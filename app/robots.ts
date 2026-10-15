import type { MetadataRoute } from "next";
import { LAUNCHED_LOCALES, localizePath } from "@/lib/i18n";
import { absoluteUrl } from "@/lib/site";

/** Private and transactional screens: an account, a request, a shared link. */
const PRIVATE_PATHS = ["/konto", "/anfrage", "/share/"];

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
    sitemap: absoluteUrl("/sitemap.xml")
  };
}
