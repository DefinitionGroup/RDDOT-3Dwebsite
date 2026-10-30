import "server-only";

import {
  projectActorOf,
  type CustomerSessionResolver
} from "@/features/customer-accounts/customer-session";
import type { DealerSession } from "@/features/dealers/dealer-session";
import type { ProjectActor } from "@/features/projects/project-module";
import { auth } from "@/lib/server/auth/auth";
import { createBetterAuthSessionResolver } from "@/lib/server/auth/customer-session-better-auth";
import { getDatabase } from "@/lib/server/db/database";
import { createPostgresIdentityAdapter } from "@/lib/server/db/identity-postgres";

/** Whoever is signed in: a customer or a Dealer User (ADR 0014). */
export const sessionPrincipals = createBetterAuthSessionResolver({
  auth,
  identities: createPostgresIdentityAdapter(getDatabase())
});

/** The signed-in customer; a Dealer User is nobody here. */
export const customerSessions: CustomerSessionResolver = {
  async resolve(headers) {
    const principal = await sessionPrincipals.resolve(headers);
    return principal?.kind === "customer" ? principal.session : null;
  }
};

/** The signed-in Dealer User; a customer is nobody here. */
export const dealerSessions = {
  async resolve(headers: Headers): Promise<DealerSession | null> {
    const principal = await sessionPrincipals.resolve(headers);
    return principal?.kind === "dealer" ? principal.session : null;
  }
};

/**
 * Who acts on a Project in this request: the signed-in customer as owner, or
 * the signed-in Dealer User, whose access the Project adapters check against
 * the open Dealer Grant inside each operation.
 */
export const projectActors = {
  async resolve(headers: Headers): Promise<ProjectActor | null> {
    const principal = await sessionPrincipals.resolve(headers);
    return principal ? projectActorOf(principal) : null;
  }
};
