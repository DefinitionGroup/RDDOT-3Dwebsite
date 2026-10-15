import type { Locale } from "@/lib/i18n";
import type { NAVIGATION_QUERY_RESULT, PAGE_QUERY_RESULT, SITE_SETTINGS_QUERY_RESULT } from "@/sanity.types";

/*
 * Block types come from the generated query results, never from stored
 * document shapes: the projection is the adapter (ADR 0013), and the demo
 * content satisfies the same types.
 */

/** A resolved Editorial Page, as the page queries return it. */
export type PageDocument = NonNullable<PAGE_QUERY_RESULT>;
export type PageBlock = NonNullable<PageDocument["content"]>[number];
export type BlockType = PageBlock["_type"];
export type BlockOf<T extends BlockType> = Extract<PageBlock, { _type: T }>;

/** Header and footer links of one locale (the navigation document, resolved). */
export type SiteChrome = NonNullable<NAVIGATION_QUERY_RESULT>;

/** Site-wide defaults in one locale (the siteSettings document, resolved). */
export type SiteSettings = NonNullable<SITE_SETTINGS_QUERY_RESULT>;

/** An image as `imageFragment` projects it: asset resolved, editor alt text alongside. */
export type ResolvedImage = BlockOf<"statementBlock">["image"];

/** A file as `fileFragment` projects it. */
export type ResolvedFile = NonNullable<BlockOf<"heroFilmBlock">["film"]["desktop"]>;

export type BlockProps<T extends BlockType> = {
  block: BlockOf<T>;
  locale: Locale;
  /** Position on the page; the first block may own the page's h1 and load eagerly. */
  index: number;
};

export type BlockComponent<T extends BlockType> = (
  props: BlockProps<T>
) => React.ReactNode | Promise<React.ReactNode>;
