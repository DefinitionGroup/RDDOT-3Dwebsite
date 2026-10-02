import type { StructureResolver } from "sanity/structure";
import { LOCALE_TITLES, LOCALES } from "@/lib/i18n";

/** Types this structure places itself; everything else lands in the catch-all below. */
const PLACED_TYPES = new Set(["page", "navigation", "translation.metadata"]);

/**
 * The Studio's left column: pages and navigation per language, then any other
 * document type so nothing silently disappears when the schema grows.
 */
export const structure: StructureResolver = (S) =>
  S.list()
    .title("Inhalte")
    .items([
      S.listItem()
        .id("pages")
        .title("Seiten")
        .child(
          S.list()
            .title("Seiten")
            .items(
              LOCALES.map((locale) =>
                S.listItem()
                  .id(`pages-${locale}`)
                  .title(LOCALE_TITLES[locale])
                  .schemaType("page")
                  .child(
                    S.documentList()
                      .id(`pages-${locale}`)
                      .title(`Seiten · ${LOCALE_TITLES[locale]}`)
                      .schemaType("page")
                      .apiVersion("2026-10-01")
                      .filter('_type == "page" && language == $locale')
                      .params({ locale })
                      .defaultOrdering([
                        { field: "isHomepage", direction: "desc" },
                        { field: "title", direction: "asc" }
                      ])
                      .initialValueTemplates([S.initialValueTemplateItem(`page-${locale}`)])
                  )
              )
            )
        ),
      S.listItem()
        .id("navigation")
        .title("Navigation")
        .child(
          S.list()
            .title("Navigation")
            .items(
              LOCALES.map((locale) =>
                S.listItem()
                  .id(`navigation-${locale}`)
                  .title(LOCALE_TITLES[locale])
                  .schemaType("navigation")
                  .child(
                    S.document()
                      .schemaType("navigation")
                      .documentId(`navigation-${locale}`)
                      .initialValueTemplate("navigation-by-language", { language: locale })
                      .title(`Navigation · ${LOCALE_TITLES[locale]}`)
                  )
              )
            )
        ),
      ...S.documentTypeListItems().filter((item) => !PLACED_TYPES.has(item.getId() ?? ""))
    ]);
