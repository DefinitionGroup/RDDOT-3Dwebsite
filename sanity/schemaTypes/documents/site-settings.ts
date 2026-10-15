import { defineField, defineType, type Rule } from "sanity";
import { LAUNCHED_LOCALES, LOCALE_TITLES, LOCALES, type Locale } from "@/lib/i18n";

/** The one siteSettings document; the structure opens it by this id. */
export const SITE_SETTINGS_ID = "siteSettings";

type LocalizedItems = { language?: string; value?: unknown }[] | undefined;

const missingIn = (value: LocalizedItems, locales: readonly Locale[]) =>
  locales.filter(
    (locale) => !value?.some((item) => item.language === locale && typeof item.value === "string" && item.value.trim())
  );

const missingMessage = (missing: Locale[]) => `Fehlt noch: ${missing.map((locale) => LOCALE_TITLES[locale]).join(", ")}.`;

/**
 * Every launched language is required, the others are a reminder: a locale
 * opens only once it is complete, and the site never borrows another
 * language's words (ADR 0007).
 */
function localizedRules(rule: Rule) {
  return [
    rule.custom((value: LocalizedItems) => {
      const missing = missingIn(value, LAUNCHED_LOCALES);
      return missing.length === 0 || missingMessage(missing);
    }),
    rule.custom((value: LocalizedItems) => {
      const missing = missingIn(value, LOCALES.filter((locale) => !LAUNCHED_LOCALES.includes(locale)));
      return missing.length === 0 || missingMessage(missing);
    }).warning()
  ];
}

/**
 * Site-wide defaults, one document for every language. Small labels are
 * localized per field; pages and navigation are localized per document.
 * Code owns the output (titles, canonical, hreflang, robots); these are the
 * words and the image it falls back to when a page sets none.
 */
export const siteSettings = defineType({
  name: "siteSettings",
  title: "Website-Einstellungen",
  type: "document",
  groups: [
    { name: "brand", title: "Marke", default: true },
    { name: "seo", title: "SEO" }
  ],
  fields: [
    defineField({
      name: "brandName",
      title: "Markenname",
      type: "string",
      group: "brand",
      description: "Hinter jedem Seitentitel und als Name der Website beim Teilen.",
      initialValue: "rotpunkt Signature",
      validation: (Rule) => Rule.required()
    }),
    defineField({
      name: "legalLine",
      title: "Rechtliche Zeile in der Fußzeile",
      type: "internationalizedArrayString",
      group: "brand",
      description: "Zum Beispiel: © 2026 rotpunkt Signature.",
      validation: localizedRules
    }),
    defineField({
      name: "seoTitle",
      title: "Standard-Seitentitel",
      type: "internationalizedArrayString",
      group: "seo",
      description: "Titel der Startseite und jeder Seite ohne eigenen SEO-Titel.",
      validation: (Rule) => [
        ...localizedRules(Rule),
        Rule.custom((value: LocalizedItems) =>
          value?.some((item) => typeof item.value === "string" && item.value.length > 70)
            ? "Suchmaschinen kürzen nach etwa 60–70 Zeichen."
            : true
        ).warning()
      ]
    }),
    defineField({
      name: "seoDescription",
      title: "Standard-Beschreibung",
      type: "internationalizedArrayText",
      group: "seo",
      description: "Für Suchergebnisse und geteilte Links, wenn eine Seite keine eigene hat.",
      validation: localizedRules
    }),
    defineField({
      name: "shareImage",
      title: "Vorschaubild zum Teilen",
      type: "image",
      group: "seo",
      description: "1200 × 630 px. Für jede Seite ohne eigenes Vorschaubild.",
      options: { hotspot: true }
    })
  ],
  preview: { prepare: () => ({ title: "Website-Einstellungen" }) }
});
