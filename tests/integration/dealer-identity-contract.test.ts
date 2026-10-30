import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAuth } from "@/lib/server/auth/create-auth";
import {
  createBetterAuthCustomerSessionResolver,
  createBetterAuthSessionResolver
} from "@/lib/server/auth/customer-session-better-auth";
import { createPostgresIdentityAdapter } from "@/lib/server/db/identity-postgres";
import {
  createDealer,
  createDealerUser,
  setDealerStatus,
  setDealerUserStatus
} from "@/tests/integration/dealer-fixtures";
import {
  startPostgresTestContext,
  type PostgresTestContext
} from "@/tests/integration/postgres-test-context";

describe("Dealer identity (ADR 0014)", { timeout: 30_000 }, () => {
  let context: PostgresTestContext;

  beforeAll(async () => {
    context = await startPostgresTestContext();
  }, 120_000);

  afterAll(async () => {
    await context?.stop();
  });

  function subject() {
    return `auth-user-${crypto.randomUUID()}`;
  }

  async function customerAccountsFor(providerSubject: string) {
    const rows = await context.database
      .withSchema("app")
      .selectFrom("authIdentity")
      .select("customerAccountId")
      .where("providerSubject", "=", providerSubject)
      .execute();
    return rows.length;
  }

  it("links a provisioned email on first sign-in and keeps the link", async () => {
    const identities = createPostgresIdentityAdapter(context.database);
    const dealerId = await createDealer(context.database, { name: "Küchen am Markt" });
    const user = await createDealerUser(context.database, dealerId);
    const providerSubject = subject();

    const first = await identities.resolveDealerUser({
      provider: "better-auth",
      providerSubject,
      email: user.email.toUpperCase()
    });
    expect(first).toEqual({
      kind: "dealer",
      dealer: expect.objectContaining({
        dealerUserId: user.id,
        dealerId,
        dealerName: "Küchen am Markt",
        email: user.email
      })
    });

    // Once linked, the identity finds its Dealer User even under another address.
    const again = await identities.resolveDealerUser({
      provider: "better-auth",
      providerSubject,
      email: "someone-else@example.invalid"
    });
    expect(again.kind === "dealer" && again.dealer.dealerUserId).toBe(user.id);
    expect(await customerAccountsFor(providerSubject)).toBe(0);
  });

  it("blocks a disabled Dealer User and an inactive Dealer instead of making a customer", async () => {
    const identities = createPostgresIdentityAdapter(context.database);
    const dealerId = await createDealer(context.database);
    const linkedUser = await createDealerUser(context.database, dealerId);
    const linkedSubject = subject();
    await identities.resolveDealerUser({
      provider: "better-auth",
      providerSubject: linkedSubject,
      email: linkedUser.email
    });

    await setDealerUserStatus(context.database, linkedUser.id, "disabled");
    expect(
      await identities.resolveDealerUser({
        provider: "better-auth",
        providerSubject: linkedSubject,
        email: linkedUser.email
      })
    ).toEqual({ kind: "blocked" });

    const disabledUser = await createDealerUser(context.database, dealerId, {
      status: "disabled"
    });
    expect(
      await identities.resolveDealerUser({
        provider: "better-auth",
        providerSubject: subject(),
        email: disabledUser.email
      })
    ).toEqual({ kind: "blocked" });

    const closedDealer = await createDealer(context.database);
    const closedUser = await createDealerUser(context.database, closedDealer);
    await setDealerStatus(context.database, closedDealer, "inactive");
    expect(
      await identities.resolveDealerUser({
        provider: "better-auth",
        providerSubject: subject(),
        email: closedUser.email
      })
    ).toEqual({ kind: "blocked" });
  });

  it("leaves customers to the Customer Account path", async () => {
    const identities = createPostgresIdentityAdapter(context.database);
    expect(
      await identities.resolveDealerUser({
        provider: "better-auth",
        providerSubject: subject(),
        email: `customer-${crypto.randomUUID()}@example.invalid`
      })
    ).toEqual({ kind: "none" });
  });

  it("resolves a Better Auth session to a Dealer User, never to a Customer Account", async () => {
    const authUrl = new URL(context.connectionString);
    authUrl.searchParams.set("options", "-c search_path=auth");
    const authPool = new Pool({ connectionString: authUrl.toString(), max: 2 });
    let deliveredOtp: string | undefined;
    const auth = createAuth({
      database: authPool,
      secret: "integration-test-secret-that-is-longer-than-thirty-two-characters",
      baseURL: "http://localhost:3000",
      rateLimitEnabled: false,
      async sendAuthenticationOtp(message) {
        deliveredOtp = message.otp;
      }
    });
    const dealerId = await createDealer(context.database);
    const user = await createDealerUser(context.database, dealerId);

    async function signIn(email: string) {
      const post = (path: string, body: object) =>
        auth.handler(
          new Request(`http://localhost:3000/api/auth${path}`, {
            method: "POST",
            headers: { "content-type": "application/json", origin: "http://localhost:3000" },
            body: JSON.stringify(body)
          })
        );
      expect((await post("/email-otp/send-verification-otp", { email, type: "sign-in" })).status).toBe(200);
      const response = await post("/sign-in/email-otp", { email, otp: deliveredOtp });
      expect(response.status).toBe(200);
      return new Headers({
        cookie: response.headers
          .getSetCookie()
          .map((value) => value.split(";", 1)[0])
          .join("; ")
      });
    }

    try {
      const identities = createPostgresIdentityAdapter(context.database);
      const principals = createBetterAuthSessionResolver({ auth, identities });
      const customers = createBetterAuthCustomerSessionResolver({ auth, identities });
      const headers = await signIn(user.email);

      const principal = await principals.resolve(headers);
      expect(principal?.kind).toBe("dealer");
      expect(principal?.kind === "dealer" && principal.session.dealerUserId).toBe(user.id);
      expect(await customers.resolve(headers)).toBeNull();

      const authUser = await authPool.query<{ id: string }>(
        'SELECT id FROM auth."user" WHERE email = $1',
        [user.email]
      );
      expect(await customerAccountsFor(authUser.rows[0].id)).toBe(0);

      // Disabling the Dealer User ends the access of the session already open.
      await setDealerUserStatus(context.database, user.id, "disabled");
      expect(await principals.resolve(headers)).toBeNull();
      expect(await customers.resolve(headers)).toBeNull();
    } finally {
      await authPool.query('DELETE FROM auth."user" WHERE email = $1', [user.email]);
      await authPool.end();
    }
  });
});
