import { defineQuery } from "next-sanity";

/*
 * The GROQ projections are the Sanity adapter (ADR 0013): they dereference
 * assets and translations so the generated result types are plain
 * application models. Every query is a top-level, uniquely named defineQuery;
 * TypeGen cannot see inline or duplicated ones.
 */

/** An image with its asset resolved: url, dimensions and the blur placeholder. */
const imageFragment = /* groq */ `{
  ...,
  asset->{ _id, url, "lqip": metadata.lqip, "dimensions": metadata.dimensions }
}`;

const fileFragment = /* groq */ `asset->{ _id, url, mimeType }`;

const pageContentFragment = /* groq */ `content[]{
  ...,
  _type == "heroFilmBlock" => {
    ...,
    film{ "desktop": desktop.${fileFragment}, "mobile": mobile.${fileFragment}, poster ${imageFragment} }
  },
  _type == "statementBlock" => { ..., image ${imageFragment} },
  _type == "materialsBlock" => { ..., items[]{ ..., image ${imageFragment} } },
  _type == "configuratorBlock" => { ..., image ${imageFragment} },
  _type == "roomStoryBlock" => { ..., image ${imageFragment} },
  _type == "collectionsBlock" => { ..., items[]{ ..., image ${imageFragment} } }
}`;

/** The page's linked translations that exist in the current perspective. */
const translationsFragment = /* groq */ `"translations": *[_type == "translation.metadata" && references(^._id)][0]
    .translations[]{ "language": value->language, "slug": value->slug.current, "isHomepage": value->isHomepage }
    [defined(language)]`;

const pageProjection = /* groq */ `{
  _id,
  title,
  "slug": slug.current,
  language,
  isHomepage,
  seo{ title, description, image ${imageFragment} },
  ${translationsFragment},
  ${pageContentFragment}
}`;

export const HOME_PAGE_QUERY = defineQuery(
  `*[_type == "page" && language == $locale && isHomepage == true][0]${pageProjection}`
);

/** Header and footer links for one locale. */
export const NAVIGATION_QUERY = defineQuery(
  `*[_type == "navigation" && language == $locale][0]{
    items[]{ _key, label, href, quiet },
    cta,
    footerColumns[]{ _key, title, links[]{ _key, label, href } },
    footerNote
  }`
);

/** A page by its slug in one locale. Never falls back to another language (ADR 0007). */
export const PAGE_QUERY = defineQuery(
  `*[_type == "page" && language == $locale && slug.current == $slug && isHomepage != true][0]${pageProjection}`
);

/**
 * Site-wide defaults in one locale. A label missing in that locale is null and
 * the code default applies; another language never stands in (ADR 0007).
 */
export const SITE_SETTINGS_QUERY = defineQuery(
  `*[_type == "siteSettings" && _id == "siteSettings"][0]{
    brandName,
    "seoTitle": seoTitle[language == $locale][0].value,
    "seoDescription": seoDescription[language == $locale][0].value,
    shareImage ${imageFragment},
    "legalLine": legalLine[language == $locale][0].value
  }`
);

/** Every addressable page in the given locales, for the sitemap. */
export const SITEMAP_QUERY = defineQuery(
  `*[_type == "page" && language in $locales && (isHomepage == true || defined(slug.current))]
    | order(language asc, isHomepage desc, slug.current asc){
    language,
    "slug": slug.current,
    isHomepage,
    _updatedAt,
    ${translationsFragment}
  }`
);

/** Every published redirect; proxy.ts builds its lookup table from them. */
export const REDIRECTS_QUERY = defineQuery(
  `*[_type == "redirect" && defined(from) && defined(to)] | order(_createdAt asc){ from, to, permanent }`
);
