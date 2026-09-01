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
  error?: string;
};

export const PHOTO_DISCLOSURE =
  "Illustrative KI-Ansicht. Sie kann keine Produktwahrheit begründen.";

export function formatGalleryDate(value: string) {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(value));
}
