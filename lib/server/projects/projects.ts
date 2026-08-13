import "server-only";

import { getDatabase } from "@/lib/server/db/database";
import { createPostgresProjectModule } from "@/lib/server/db/project-postgres";

export const projects = createPostgresProjectModule(getDatabase());
