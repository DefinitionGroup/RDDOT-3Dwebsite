import { z } from "zod";
import type { GalleryPage } from "@/features/photo-gallery/photo-gallery-module";

export const galleryCursorSchema = z.object({
  createdAt: z.coerce.date(),
  id: z.uuid()
});

export function readGalleryCursor(url: URL) {
  if (!url.searchParams.has("cursorCreatedAt")) return { ok: true, cursor: null } as const;

  const parsed = galleryCursorSchema.safeParse({
    createdAt: url.searchParams.get("cursorCreatedAt"),
    id: url.searchParams.get("cursorId")
  });

  return parsed.success
    ? ({ ok: true, cursor: parsed.data } as const)
    : ({ ok: false, cursor: null } as const);
}

/**
 * Display URLs are presigned and short-lived, so the expiry travels with them:
 * a client that keeps a page open past `displayUrlExpiresAt` must refetch
 * rather than assume the URL still works (ADR 0011).
 */
export type SerializedGalleryPage = ReturnType<typeof serializeGalleryPage>;

export function serializeGalleryPage(page: GalleryPage) {
  return {
    photos: page.items.map((photo) => ({
      ...photo,
      createdAt: photo.createdAt.toISOString(),
      displayUrlExpiresAt: photo.displayUrlExpiresAt.toISOString()
    })),
    totalCount: page.totalCount,
    nextCursor: page.nextCursor
      ? {
          createdAt: page.nextCursor.createdAt.toISOString(),
          id: page.nextCursor.id
        }
      : null
  };
}

/**
 * Identity of a rendered gallery page, for use as a React `key`.
 *
 * `PhotoGallery` seeds its state from these props, and `useState` reads its
 * initial value only on mount. Without a key that moves when the server data
 * moves, a gallery already on screen would keep showing a stale page after a
 * new photo is created elsewhere on the same route.
 */
export function galleryPageKey(scope: string, page: SerializedGalleryPage) {
  return `${scope}:${page.totalCount}:${page.photos[0]?.id ?? "empty"}`;
}
