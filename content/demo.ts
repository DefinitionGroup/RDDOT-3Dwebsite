/**
 * Demo content, used ONLY when Sanity is not configured (sanity/lib/loaders.ts).
 * It is ADR 0007's temporary local-content adapter, written in the shape the
 * queries return, and the seed script's source. Each locale has its own
 * complete copy; pages that share a group (the part of the id after the
 * locale) are linked as translations, like translation.metadata in Sanity.
 *
 * German comes first: demo keys are numbered in import order, and the seeded
 * German documents carry those keys.
 */
import type { PageDocument, SiteChrome, SiteSettings } from "@/blocks/types";
import type { Locale } from "@/lib/i18n";
import { chromeDe, homeDe } from "./home/de";
import { chromeEn, homeEn } from "./home/en";
import { chromeEs, homeEs } from "./home/es";
import { demoSettings } from "./settings";

export { demoSettings };

/** "demo-page-en-home" → "home": pages with the same group are translations of each other. */
export function translationGroup(page: PageDocument) {
  return page._id.replace(/^demo-page-[a-z]{2}-/, "");
}

function linkTranslations(pages: PageDocument[]): PageDocument[] {
  return pages.map((page) => {
    const siblings = pages.filter((other) => translationGroup(other) === translationGroup(page));
    return {
      ...page,
      translations:
        siblings.length > 1
          ? siblings.map(({ language, slug, isHomepage }) => ({ language, slug, isHomepage }))
          : null
    };
  });
}

/** Every demo page; the seed script writes them to Sanity. */
export const demoPages: PageDocument[] = linkTranslations([homeDe, homeEn, homeEs]);

/** Navigation per locale; the seed script writes one document each. */
export const demoChrome: Partial<Record<Locale, SiteChrome>> = { de: chromeDe, en: chromeEn, es: chromeEs };

export function getDemoPage(locale: Locale, slug: string | null): PageDocument | null {
  return (
    demoPages.find((page) => page.language === locale && (slug === null ? page.isHomepage : page.slug === slug)) ??
    null
  );
}

export function getDemoChrome(locale: Locale): SiteChrome | null {
  return demoChrome[locale] ?? null;
}

export function getDemoSettings(locale: Locale): SiteSettings {
  return demoSettings[locale];
}
