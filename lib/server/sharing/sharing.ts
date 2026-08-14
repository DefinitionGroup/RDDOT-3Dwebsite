import "server-only";

import { createPostgresSharingModule } from "@/lib/server/db/sharing-postgres";
import { getDatabase } from "@/lib/server/db/database";

export const sharing = createPostgresSharingModule(getDatabase());
