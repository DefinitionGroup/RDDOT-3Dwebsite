import "server-only";

import { getDatabase } from "@/lib/server/db/database";
import { createPostgresDealerModule } from "@/lib/server/db/dealer-postgres";

export const dealers = createPostgresDealerModule(getDatabase());
