import "server-only";

import {
  serializeGalleryPage,
  type SerializedGalleryPage
} from "@/features/photo-gallery/serialize-gallery";
import { getPhotoGallery } from "@/lib/server/photo-gallery/photo-gallery";

const EMPTY: SerializedGalleryPage = {
  photos: [],
  totalCount: 0,
  nextCursor: null
};

/**
 * First gallery page for a server-rendered surface. Storage being unconfigured
 * or unreachable degrades the gallery to empty rather than failing the whole
 * page — an account workspace must still render when object storage is down.
 */
export async function loadInitialGallery(
  input: { ownerId: string; projectId?: string }
): Promise<SerializedGalleryPage> {
  try {
    const gallery = getPhotoGallery();
    const page = input.projectId
      ? await gallery.listForProject({
          ownerId: input.ownerId,
          projectId: input.projectId
        })
      : await gallery.listForAccount({ ownerId: input.ownerId });
    return serializeGalleryPage(page);
  } catch (error) {
    console.error("Gallery unavailable", error);
    return EMPTY;
  }
}
