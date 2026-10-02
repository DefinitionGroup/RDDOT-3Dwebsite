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

const pageProjection = /* groq */ `{
  _id,
  title,
  "slug": slug.current,
  language,
  isHomepage,
  seo{ title, description, image ${imageFragment} },
  "translations": *[_type == "translation.metadata" && references(^._id)][0]
    .translations[]{ "language": value->language, "slug": value->slug.current, "isHomepage": value->isHomepage }
    [defined(language)],
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
