import { INTL_LOCALE, type Locale } from "@/lib/i18n";

/** The wire shape of `GalleryPhoto`, with dates as ISO strings. */
export type SerializedGalleryPhoto = {
  id: string;
  projectId: string;
  projectName: string;
  revisionId: string;
  revisionLabel: string | null;
  width: number;
  height: number;
  byteSize: number;
  contentType: string;
  createdAt: string;
  displayUrl: string;
  displayUrlExpiresAt: string;
};

export type SerializedGalleryCursor = {
  createdAt: string;
  id: string;
};

export type GalleryResponse = {
  photos?: SerializedGalleryPhoto[];
  totalCount?: number;
  nextCursor?: SerializedGalleryCursor | null;
  code?: string;
};

export function formatGalleryDate(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(value));
}
