import "server-only";

import { auth } from "@/lib/server/auth/auth";
import { createBetterAuthCustomerSessionResolver } from "@/lib/server/auth/customer-session-better-auth";
import { getDatabase } from "@/lib/server/db/database";
import { createPostgresIdentityAdapter } from "@/lib/server/db/identity-postgres";

export const customerSessions = createBetterAuthCustomerSessionResolver({
  auth,
  identities: createPostgresIdentityAdapter(getDatabase())
});
