import "server-only";

import { getDatabase } from "@/lib/server/db/database";
import { createPostgresPhotoGalleryModule } from "@/lib/server/db/photo-gallery-postgres";
import { getObjectStorage } from "@/lib/server/object-storage/object-storage";

export function getPhotoGallery() {
  return createPostgresPhotoGalleryModule(getDatabase(), getObjectStorage());
}
