import "server-only";

import { createPostgresCustomerAvatarModule } from "@/lib/server/db/customer-avatar-postgres";
import { getDatabase } from "@/lib/server/db/database";
import { getObjectStorage } from "@/lib/server/object-storage/object-storage";

/** Resolved on use, like the photo gallery: storage configuration is read when a photo is touched. */
export function getCustomerAvatars() {
  return createPostgresCustomerAvatarModule(getDatabase(), getObjectStorage());
}
