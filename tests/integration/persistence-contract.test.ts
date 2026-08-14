import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { Pool } from "pg";
import { createAuth } from "@/lib/server/auth/create-auth";
import { createBetterAuthCustomerSessionResolver } from "@/lib/server/auth/customer-session-better-auth";
import { createPostgresIdentityAdapter } from "@/lib/server/db/identity-postgres";
import { createPostgresProjectModule } from "@/lib/server/db/project-postgres";
import {
  startPostgresTestContext,
  type PostgresTestContext
} from "@/tests/integration/postgres-test-context";

const initialConfiguration = {
  schemaVersion: 1,
  productKey: "signature-line",
  layout: "straight-line",
  cabinetColorKey: "carbon",
  frontColorKey: "clay"
} as const;

describe("PostgreSQL persistence contract", () => {
  let context: PostgresTestContext;

  beforeAll(async () => {
    context = await startPostgresTestContext();
  }, 120_000);

  afterAll(async () => {
    await context?.stop();
  });

  it("maps concurrent Better Auth subjects to one application account", async () => {
    const identity = createPostgresIdentityAdapter(context.database);
    const subject = `auth-user-${crypto.randomUUID()}`;

    const accountIds = await Promise.all(
      Array.from({ length: 4 }, () =>
        identity.resolveCustomerAccount({
          provider: "better-auth",
          providerSubject: subject
        })
      )
    );

    expect(new Set(accountIds).size).toBe(1);
  });

  it("resolves a database-backed Better Auth session to a Customer Account", async () => {
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
    const email = `integration-${crypto.randomUUID()}@example.invalid`;

    try {
      const sendResponse = await auth.handler(
        new Request(
          "http://localhost:3000/api/auth/email-otp/send-verification-otp",
          {
            method: "POST",
            headers: {
              "content-type": "application/json",
              origin: "http://localhost:3000"
            },
            body: JSON.stringify({ email, type: "sign-in" })
          }
        )
      );
      expect(sendResponse.status).toBe(200);
      expect(deliveredOtp).toMatch(/^\d{6}$/);

      const signInResponse = await auth.handler(
        new Request("http://localhost:3000/api/auth/sign-in/email-otp", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            origin: "http://localhost:3000"
          },
          body: JSON.stringify({
            email,
            otp: deliveredOtp,
            name: "Integration Test"
          })
        })
      );
      expect(signInResponse.status).toBe(200);

      const cookie = signInResponse.headers
        .getSetCookie()
        .map((value) => value.split(";", 1)[0])
        .join("; ");
      expect(cookie).toContain("better-auth.session_token=");

      const identities = createPostgresIdentityAdapter(context.database);
      const sessions = createBetterAuthCustomerSessionResolver({
        auth,
        identities
      });
      const customerSession = await sessions.resolve(
        new Headers({ cookie })
      );

      expect(customerSession?.customerAccountId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f-]{27}$/
      );
      expect(customerSession?.sessionId).toBeTruthy();
      expect(customerSession?.expiresAt.getTime()).toBeGreaterThan(Date.now());
    } finally {
      const authUser = await authPool.query<{ id: string }>(
        'SELECT id FROM auth."user" WHERE email = $1',
        [email]
      );
      const providerSubject = authUser.rows[0]?.id;

      if (providerSubject) {
        await context.database
          .withSchema("app")
          .deleteFrom("customerAccount")
          .where("id", "in", (query) =>
            query
              .selectFrom("authIdentity")
              .select("customerAccountId")
              .where("provider", "=", "better-auth")
              .where("providerSubject", "=", providerSubject)
          )
          .execute();
      }

      await authPool.query('DELETE FROM auth."user" WHERE email = $1', [email]);
      await authPool.end();
    }
  });

  it("rate limits repeated OTP delivery requests in shared database state", async () => {
    const authUrl = new URL(context.connectionString);
    authUrl.searchParams.set("options", "-c search_path=auth");
    const authPool = new Pool({ connectionString: authUrl.toString(), max: 2 });
    const delivered = vi.fn().mockResolvedValue(undefined);
    const auth = createAuth({
      database: authPool,
      secret: "integration-test-secret-that-is-longer-than-thirty-two-characters",
      baseURL: "http://localhost:3000",
      sendAuthenticationOtp: delivered
    });
    const email = `rate-limit-${crypto.randomUUID()}@example.invalid`;
    const ip = `10.${Math.floor(Math.random() * 200) + 1}.${Math.floor(Math.random() * 200) + 1}.${Math.floor(Math.random() * 200) + 1}`;

    try {
      const statuses: number[] = [];

      for (let attempt = 0; attempt < 4; attempt += 1) {
        const response = await auth.handler(
          new Request(
            "http://localhost:3000/api/auth/email-otp/send-verification-otp",
            {
              method: "POST",
              headers: {
                "content-type": "application/json",
                origin: "http://localhost:3000",
                "x-forwarded-for": ip
              },
              body: JSON.stringify({ email, type: "sign-in" })
            }
          )
        );
        statuses.push(response.status);
      }

      expect(statuses).toEqual([200, 200, 200, 429]);
      expect(delivered).toHaveBeenCalledTimes(3);
    } finally {
      await authPool.query(
        'DELETE FROM auth."verification" WHERE identifier LIKE $1',
        [`${email}:%`]
      );
      await authPool.query('DELETE FROM auth."rateLimit" WHERE "key" LIKE $1', [
        `%${ip}%`
      ]);
      await authPool.end();
    }
  });

  it("keeps one winner when two autosaves use the same expected version", async () => {
    const identity = createPostgresIdentityAdapter(context.database);
    const projects = createPostgresProjectModule(context.database);
    const ownerId = await identity.resolveCustomerAccount({
      provider: "better-auth",
      providerSubject: `auth-user-${crypto.randomUUID()}`
    });
    const workspace = await projects.createProject({
      ownerId,
      idempotencyKey: `create-${crypto.randomUUID()}`,
      name: "Meine Küche",
      configuration: initialConfiguration,
      productDefinitionVersion: "signature-line@1"
    });

    const results = await Promise.all([
      projects.saveWorkingConfiguration({
        ownerId,
        projectId: workspace.id,
        expectedVersion: 1,
        configuration: {
          ...initialConfiguration,
          cabinetColorKey: "oak"
        },
        productDefinitionVersion: "signature-line@1"
      }),
      projects.saveWorkingConfiguration({
        ownerId,
        projectId: workspace.id,
        expectedVersion: 1,
        configuration: {
          ...initialConfiguration,
          frontColorKey: "sand"
        },
        productDefinitionVersion: "signature-line@1"
      })
    ]);

    expect(results.map((result) => result.kind).sort()).toEqual([
      "conflict",
      "saved"
    ]);
    expect(
      results.find((result) => result.kind === "conflict")
    ).toMatchObject({ currentVersion: 2 });
    const saved = results.find((result) => result.kind === "saved");
    expect(saved?.kind).toBe("saved");

    const ownerProjects = await projects.listProjects({ ownerId });
    expect(ownerProjects).toEqual([
      expect.objectContaining({
        id: workspace.id,
        name: "Meine Küche",
        lifecycle: "active"
      })
    ]);
    if (saved?.kind === "saved") {
      expect(ownerProjects[0].updatedAt).toEqual(saved.updatedAt);
    }
  });

  it("deduplicates checkpoints and rejects changed idempotent requests", async () => {
    const identity = createPostgresIdentityAdapter(context.database);
    const projects = createPostgresProjectModule(context.database);
    const ownerId = await identity.resolveCustomerAccount({
      provider: "better-auth",
      providerSubject: `auth-user-${crypto.randomUUID()}`
    });
    const workspace = await projects.createProject({
      ownerId,
      idempotencyKey: `create-${crypto.randomUUID()}`,
      name: "Checkpoint Küche",
      configuration: initialConfiguration,
      productDefinitionVersion: "signature-line@1"
    });
    const idempotencyKey = `photo-${crypto.randomUUID()}`;
    const command = {
      ownerId,
      projectId: workspace.id,
      expectedVersion: 1,
      trigger: "photo" as const,
      displaySnapshot: { title: "Signature Line" },
      intent: {
        idempotencyKey,
        topic: "photo.requested",
        payload: { preset: "warm-evening" }
      }
    };

    const first = await projects.checkpointRevision(command);
    const replay = await projects.checkpointRevision(command);
    const mismatch = await projects.checkpointRevision({
      ...command,
      intent: {
        ...command.intent,
        payload: { preset: "cool-morning" }
      }
    });

    expect(first).toMatchObject({ kind: "checkpointed" });
    expect(replay).toEqual(first);
    expect(mismatch).toEqual({ kind: "idempotency-conflict" });
  });

  it("lists immutable versions and safely restores an earlier Configuration", async () => {
    const identity = createPostgresIdentityAdapter(context.database);
    const projects = createPostgresProjectModule(context.database);
    const ownerId = await identity.resolveCustomerAccount({
      provider: "better-auth",
      providerSubject: `auth-user-${crypto.randomUUID()}`
    });
    const workspace = await projects.createProject({
      ownerId,
      idempotencyKey: `create-${crypto.randomUUID()}`,
      name: "Versionsküche",
      configuration: initialConfiguration,
      productDefinitionVersion: "signature-line@1"
    });
    const checkpoint = await projects.checkpointRevision({
      ownerId,
      projectId: workspace.id,
      expectedVersion: 1,
      trigger: "version-save",
      displaySnapshot: { cabinetFinish: "Graphit", frontFinish: "Porzellan" },
      intent: {
        idempotencyKey: `version-${crypto.randomUUID()}`,
        topic: "project.version-saved",
        payload: { projectId: workspace.id }
      }
    });
    expect(checkpoint).toMatchObject({ kind: "checkpointed", created: true });
    if (checkpoint.kind !== "checkpointed") return;

    const changed = await projects.saveWorkingConfiguration({
      ownerId,
      projectId: workspace.id,
      expectedVersion: 1,
      configuration: { ...initialConfiguration, cabinetColorKey: "oak" },
      productDefinitionVersion: "signature-line@1"
    });
    expect(changed).toMatchObject({ kind: "saved", version: 2 });

    const restored = await projects.restoreRevision({
      ownerId,
      projectId: workspace.id,
      revisionId: checkpoint.revisionId,
      expectedVersion: 2,
      safetyDisplaySnapshot: {
        cabinetFinish: "Eiche warm",
        frontFinish: "Porzellan"
      },
      supportedProductDefinitionVersions: ["signature-line@1"]
    });
    expect(restored).toMatchObject({
      kind: "restored",
      configuration: initialConfiguration,
      version: 3
    });

    const revisions = await projects.listConfigurationRevisions({
      ownerId,
      projectId: workspace.id
    });
    expect(revisions.totalCount).toBe(2);
    expect(revisions.nextCursor).toBeNull();
    expect(revisions.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: checkpoint.revisionId }),
        expect.objectContaining({ label: "Vor Wiederherstellung" })
      ])
    );

    const firstPage = await projects.listConfigurationRevisions({
      ownerId,
      projectId: workspace.id,
      limit: 1
    });
    expect(firstPage).toMatchObject({ totalCount: 2 });
    expect(firstPage.items).toHaveLength(1);
    expect(firstPage.nextCursor).not.toBeNull();
    const secondPage = await projects.listConfigurationRevisions({
      ownerId,
      projectId: workspace.id,
      limit: 1,
      cursor: firstPage.nextCursor!
    });
    expect(secondPage.items).toHaveLength(1);
    expect(secondPage.items[0]?.id).not.toBe(firstPage.items[0]?.id);
    expect(secondPage.nextCursor).toBeNull();

    await expect(
      projects.restoreRevision({
        ownerId,
        projectId: workspace.id,
        revisionId: checkpoint.revisionId,
        expectedVersion: 3,
        safetyDisplaySnapshot: {},
        supportedProductDefinitionVersions: ["signature-line@1"]
      })
    ).resolves.toMatchObject({ kind: "unchanged", version: 3 });

    await expect(
      projects.restoreRevision({
        ownerId,
        projectId: workspace.id,
        revisionId: checkpoint.revisionId,
        expectedVersion: 2,
        safetyDisplaySnapshot: {},
        supportedProductDefinitionVersions: ["signature-line@1"]
      })
    ).resolves.toEqual({ kind: "conflict", currentVersion: 3 });
  });

  it("restores the Product Definition identity even when selections match", async () => {
    const identity = createPostgresIdentityAdapter(context.database);
    const projects = createPostgresProjectModule(context.database);
    const ownerId = await identity.resolveCustomerAccount({
      provider: "better-auth",
      providerSubject: `auth-user-${crypto.randomUUID()}`
    });
    const workspace = await projects.createProject({
      ownerId,
      idempotencyKey: `create-${crypto.randomUUID()}`,
      name: "Definitionswechsel",
      configuration: initialConfiguration,
      productDefinitionVersion: "signature-line@1"
    });
    const checkpoint = await projects.checkpointRevision({
      ownerId,
      projectId: workspace.id,
      expectedVersion: 1,
      trigger: "version-save",
      displaySnapshot: {},
      intent: {
        idempotencyKey: `version-${crypto.randomUUID()}`,
        topic: "project.version-saved",
        payload: { projectId: workspace.id }
      }
    });
    expect(checkpoint.kind).toBe("checkpointed");
    if (checkpoint.kind !== "checkpointed") return;

    await expect(
      projects.saveWorkingConfiguration({
        ownerId,
        projectId: workspace.id,
        expectedVersion: 1,
        configuration: initialConfiguration,
        productDefinitionVersion: "signature-line@2"
      })
    ).resolves.toMatchObject({ kind: "saved", version: 2 });

    await expect(
      projects.restoreRevision({
        ownerId,
        projectId: workspace.id,
        revisionId: checkpoint.revisionId,
        expectedVersion: 2,
        safetyDisplaySnapshot: {},
        supportedProductDefinitionVersions: ["signature-line@2"]
      })
    ).resolves.toEqual({
      kind: "unsupported-product-definition",
      productDefinitionVersion: "signature-line@1"
    });

    await expect(
      projects.restoreRevision({
        ownerId,
        projectId: workspace.id,
        revisionId: checkpoint.revisionId,
        expectedVersion: 2,
        safetyDisplaySnapshot: {},
        supportedProductDefinitionVersions: ["signature-line@1"]
      })
    ).resolves.toMatchObject({ kind: "restored", version: 3 });

    await expect(
      projects.getWorkspace({ ownerId, projectId: workspace.id })
    ).resolves.toMatchObject({
      workingConfiguration: { productDefinitionVersion: "signature-line@1" }
    });
  });
});
