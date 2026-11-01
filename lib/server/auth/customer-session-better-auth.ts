import "server-only";

import type { IdentityAdapter } from "@/features/customer-accounts/identity-adapter";
import type {
  CustomerSessionResolver,
  SessionPrincipalResolver
} from "@/features/customer-accounts/customer-session";
import type { createAuth } from "@/lib/server/auth/create-auth";

type BetterAuthInstance = ReturnType<typeof createAuth>;

/**
 * Resolves a database-backed Better Auth session to the person behind it: a
 * Dealer User when the identity belongs to one, otherwise a Customer Account
 * (ADR 0014). A blocked Dealer User resolves to nobody.
 */
export function createBetterAuthSessionResolver(input: {
  auth: BetterAuthInstance;
  identities: IdentityAdapter;
}): SessionPrincipalResolver {
  return {
    async resolve(headers) {
      const session = await input.auth.api.getSession({
        headers,
        query: {
          disableCookieCache: true
        }
      });

      if (!session) return null;

      const sessionFacts = {
        sessionId: session.session.id,
        expiresAt: new Date(session.session.expiresAt)
      };

      const dealer = await input.identities.resolveDealerUser({
        provider: "better-auth",
        providerSubject: session.user.id,
        email: session.user.email
      });
      if (dealer.kind === "blocked") return null;
      if (dealer.kind === "dealer") {
        return { kind: "dealer", session: { ...dealer.dealer, ...sessionFacts } };
      }

      const customerAccountId = await input.identities.resolveCustomerAccount({
        provider: "better-auth",
        providerSubject: session.user.id
      });

      return {
        kind: "customer",
        session: { customerAccountId, ...sessionFacts, email: session.user.email }
      };
    }
  };
}

/** The customer behind a session, or nobody for a Dealer User. */
export function createBetterAuthCustomerSessionResolver(input: {
  auth: BetterAuthInstance;
  identities: IdentityAdapter;
}): CustomerSessionResolver {
  const principals = createBetterAuthSessionResolver(input);
  return {
    async resolve(headers) {
      const principal = await principals.resolve(headers);
      return principal?.kind === "customer" ? principal.session : null;
    }
  };
}
