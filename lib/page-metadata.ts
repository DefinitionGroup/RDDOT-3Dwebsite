import type { Metadata } from "next";
import type { PageDocument, SiteSettings } from "@/blocks/types";
import { imageUrl, type ImageSource } from "@/sanity/lib/image";
import { INTL_LOCALE, LAUNCHED_LOCALES, type Locale } from "./i18n";
import { pagePath } from "./language-links";
import { getMessages } from "./messages";
import { hreflangAlternates } from "./seo";
import { absoluteUrl, BRAND_NAME, DEFAULT_SHARE_IMAGE, SITE_ORIGIN } from "./site";

/*
 * Code owns the SEO output (ADR 0007): Sanity supplies words and images, this
 * file decides titles, canonical, hreflang and Open Graph. Pass settings and
 * pages read with `stega: false`.
 */

const SHARE_SIZE = { width: 1200, height: 630 };

/** `de_DE`, `en_GB`, `es_ES` — Open Graph spells locales with an underscore. */
const ogLocale = (locale: Locale) => INTL_LOCALE[locale].replace("-", "_");

/** A Sanity image cut to 1200 × 630 around its focal point; a local file as it is. */
function shareImage(source: ImageSource) {
  const url = imageUrl(source, SHARE_SIZE);
  if (!url) return null;
  return url.startsWith("/") ? { url } : { url, ...SHARE_SIZE };
}

/** The defaults every route in a locale starts from: functional screens keep them, pages override. */
export function siteMetadata(locale: Locale, settings: SiteSettings | null): Metadata {
  const brand = settings?.brandName || BRAND_NAME;
  const title = settings?.seoTitle || brand;
  const description = settings?.seoDescription || getMessages(locale).meta.siteDescription;
  const image = shareImage(settings?.shareImage) ?? { url: DEFAULT_SHARE_IMAGE };
  return {
    metadataBase: new URL(SITE_ORIGIN),
    title,
    description,
    applicationName: brand,
    openGraph: { type: "website", siteName: brand, locale: ogLocale(locale), title, description, images: [image] },
    twitter: { card: "summary_large_image", title, description, images: [image.url] }
  };
}

/**
 * An Editorial Page's metadata. Title: the page's SEO title, else the
 * default title on the homepage, else "Page | Brand". Description and share
 * image fall back from the page to the site settings to the code defaults.
 * Canonical is the page's own public address; hreflang lists only the
 * translations that exist and have launched.
 */
export function pageMetadata(page: PageDocument, locale: Locale, settings: SiteSettings | null): Metadata {
  const brand = settings?.brandName || BRAND_NAME;
  const title =
    page.seo?.title || (page.isHomepage ? settings?.seoTitle || brand : `${page.title} | ${brand}`);
  const description =
    page.seo?.description || settings?.seoDescription || getMessages(locale).meta.siteDescription;
  const image = shareImage(page.seo?.image) ?? shareImage(settings?.shareImage) ?? { url: DEFAULT_SHARE_IMAGE };

  const canonical = absoluteUrl(pagePath(locale, page));
  const hreflang = hreflangAlternates({ ...page, locale }, LAUNCHED_LOCALES);
  const languages = hreflang
    ? Object.fromEntries(Object.entries(hreflang).map(([language, path]) => [language, absoluteUrl(path)]))
    : undefined;
  const alternateLocales = hreflang
    ? LAUNCHED_LOCALES.filter((other) => other !== locale && hreflang[other]).map(ogLocale)
    : [];

  return {
    title: { absolute: title },
    description,
    alternates: { canonical, languages },
    openGraph: {
      type: "website",
      siteName: brand,
      url: canonical,
      locale: ogLocale(locale),
      alternateLocale: alternateLocales,
      title,
      description,
      images: [image]
    },
    twitter: { card: "summary_large_image", title, description, images: [image.url] }
  };
}
