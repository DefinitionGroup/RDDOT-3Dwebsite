import "server-only";

import type { IdentityAdapter } from "@/features/customer-accounts/identity-adapter";
import type { CustomerSessionResolver } from "@/features/customer-accounts/customer-session";
import type { createAuth } from "@/lib/server/auth/create-auth";

type BetterAuthInstance = ReturnType<typeof createAuth>;

export function createBetterAuthCustomerSessionResolver(input: {
  auth: BetterAuthInstance;
  identities: IdentityAdapter;
}): CustomerSessionResolver {
  return {
    async resolve(headers) {
      const session = await input.auth.api.getSession({
        headers,
        query: {
          disableCookieCache: true
        }
      });

      if (!session) return null;

      const customerAccountId = await input.identities.resolveCustomerAccount({
        provider: "better-auth",
        providerSubject: session.user.id
      });

      return {
        customerAccountId,
        sessionId: session.session.id,
        expiresAt: new Date(session.session.expiresAt)
      };
    }
  };
}
