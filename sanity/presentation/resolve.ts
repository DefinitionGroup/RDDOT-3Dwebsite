import { defineDocuments, defineLocations, type PresentationPluginOptions } from "sanity/presentation";
import { DEFAULT_LOCALE, LOCALE_TITLES, LOCALES, localizePath, type Locale } from "@/lib/i18n";

/*
 * URL ↔ document mapping for the Presentation tool. It mirrors the routes in
 * app/(site)/[locale] and proxy.ts: German unprefixed, other locales under
 * their prefix. Change one, change the other.
 */

const prefixed = LOCALES.filter((locale) => locale !== DEFAULT_LOCALE);

export const resolve: PresentationPluginOptions["resolve"] = {
  mainDocuments: defineDocuments([
    ...prefixed.flatMap((locale) => [
      { route: `/${locale}`, filter: `_type == "page" && language == "${locale}" && isHomepage == true` },
      { route: `/${locale}/:slug`, filter: `_type == "page" && language == "${locale}" && slug.current == $slug` }
    ]),
    { route: "/", filter: `_type == "page" && language == "${DEFAULT_LOCALE}" && isHomepage == true` },
    { route: "/:slug", filter: `_type == "page" && language == "${DEFAULT_LOCALE}" && slug.current == $slug` }
  ]),
  locations: {
    page: defineLocations({
      select: { title: "title", slug: "slug.current", language: "language", isHomepage: "isHomepage" },
      resolve: (doc) =>
        doc?.language && (doc.isHomepage || doc.slug)
          ? {
              locations: [
                {
                  title: doc.title || "Ohne Titel",
                  href: localizePath(doc.language as Locale, doc.isHomepage ? "/" : `/${doc.slug}`)
                }
              ]
            }
          : null
    }),
    navigation: defineLocations({
      select: { language: "language" },
      resolve: (doc) =>
        doc?.language
          ? {
              message: "Die Navigation erscheint auf jeder Seite dieser Sprache.",
              tone: "caution",
              locations: [
                {
                  title: `Startseite · ${LOCALE_TITLES[doc.language as Locale] ?? doc.language}`,
                  href: localizePath(doc.language as Locale, "/")
                }
              ]
            }
          : null
    })
  }
};
