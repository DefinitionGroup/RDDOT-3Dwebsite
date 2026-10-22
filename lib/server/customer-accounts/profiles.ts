import "server-only";

import { createPostgresCustomerProfileModule } from "@/lib/server/db/customer-profile-postgres";
import { getDatabase } from "@/lib/server/db/database";

export const customerProfiles = createPostgresCustomerProfileModule(getDatabase());
