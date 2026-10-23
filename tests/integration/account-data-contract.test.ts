import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { ObjectStorageModule } from "@/features/object-storage/object-storage-module";
import { createPostgresAccountDeletion } from "@/lib/server/db/account-deletion-postgres";
import { exportCustomerAccount } from "@/lib/server/db/account-export-postgres";
import { createPostgresIdentityAdapter } from "@/lib/server/db/identity-postgres";
import { createPostgresProjectModule } from "@/lib/server/db/project-postgres";
import {
  type ConfigurationDescriber,
  createPostgresQuoteRequestModule
} from "@/lib/server/db/quote-requests-postgres";
import { createPostgresSharingModule } from "@/lib/server/db/sharing-postgres";
import {
  STORAGE_DELETION_HOLD_MS,
  STORAGE_DELETION_TOPIC,
  sweepStorageDeletions
} from "@/lib/server/object-storage/storage-deletion-worker";
import {
  startPostgresTestContext,
  type PostgresTestContext
} from "@/tests/integration/postgres-test-context";

const configuration = {
  schemaVersion: 2,
  productKey: "rdtdot-signature-kitchen-v1",
  layout: "straight-line",
  cabinetColorKey: "graphite",
  frontColorKey: "porcelain",
  wallModules: ["big", "device", "big"],
  islandSize: 4
} as const;

const describing: ConfigurationDescriber = ({ productDefinitionVersion, now }) => ({
  displaySnapshot: { kind: "test", productDefinitionVersion },
  priceIndication: { totalCents: 1010300, computedAt: now.toISOString() }
});

describe("account data: delete for good, delete the account, export, storage hold", { timeout: 30_000 }, () => {
  let context: PostgresTestContext;

  beforeAll(async () => {
    context = await startPostgresTestContext();
  }, 120_000);

  afterAll(async () => {
    await context?.stop();
  });

  async function newOwner() {
    const subject = `account-data-${crypto.randomUUID()}`;
    const ownerId = await createPostgresIdentityAdapter(context.database).resolveCustomerAccount({
      provider: "better-auth",
      providerSubject: subject
    });
    return { ownerId, subject };
  }

  async function newProject(ownerId: string) {
    const workspace = await createPostgresProjectModule(context.database).createProject({
      ownerId,
      idempotencyKey: `create-${crypto.randomUUID()}`,
      name: "Daten",
      configuration,
      productDefinitionVersion: "rdtdot-signature-kitchen-v1@2"
    });
    return workspace.id;
  }

  async function request(ownerId: string, projectId: string) {
    const result = await createPostgresQuoteRequestModule(context.database, { describeConfiguration: describing }).submit({
      ownerId,
      projectId,
      expectedVersion: 1,
      idempotencyKey: crypto.randomUUID(),
      contact: { name: "Mara Vogel", email: "mara@example.com", phone: "" },
      note: "",
      consent: { version: "anfrage-datenschutz-2026-09" }
    });
    expect(result.kind).toBe("submitted");
  }

  it("deletes a Project for good only from Trash and only without requests", async () => {
    const projects = createPostgresProjectModule(context.database);
    const { ownerId } = await newOwner();
    const plain = await newProject(ownerId);
    const requested = await newProject(ownerId);
    await request(ownerId, requested);

    await expect(projects.deleteProject({ ownerId, projectId: plain })).resolves.toEqual({ kind: "not-trashed" });

    await projects.changeProjectLifecycle({ ownerId, projectId: plain, action: "trash" });
    await projects.changeProjectLifecycle({ ownerId, projectId: requested, action: "trash" });
    await expect(projects.deleteProject({ ownerId, projectId: requested })).resolves.toEqual({ kind: "has-requests" });
    await expect(projects.deleteProject({ ownerId, projectId: plain })).resolves.toEqual({ kind: "deleted" });

    await expect(projects.getWorkspace({ ownerId, projectId: plain })).resolves.toBeNull();
    await expect(projects.getWorkspace({ ownerId, projectId: requested })).resolves.not.toBeNull();
    const stranger = await newOwner();
    await expect(projects.deleteProject({ ownerId: stranger.ownerId, projectId: requested })).resolves.toEqual({
      kind: "unavailable"
    });
  });

  it("deletes an account without requests with everything it owns, and keeps one with requests", async () => {
    const deletion = createPostgresAccountDeletion(context.database);
    const free = await newOwner();
    const freeProject = await newProject(free.ownerId);
    const busy = await newOwner();
    await request(busy.ownerId, await newProject(busy.ownerId));

    await expect(deletion.deleteAccount({ provider: "better-auth", providerSubject: busy.subject })).resolves.toEqual({
      kind: "has-requests"
    });
    await expect(deletion.deleteAccount({ provider: "better-auth", providerSubject: free.subject })).resolves.toEqual({
      kind: "deleted"
    });
    await expect(deletion.deleteAccount({ provider: "better-auth", providerSubject: free.subject })).resolves.toEqual({
      kind: "not-found"
    });

    const app = context.database.withSchema("app");
    expect(await app.selectFrom("customerAccount").select("id").where("id", "=", free.ownerId).execute()).toEqual([]);
    expect(await app.selectFrom("project").select("id").where("id", "=", freeProject).execute()).toEqual([]);
    expect(await app.selectFrom("customerAccount").select("id").where("id", "=", busy.ownerId).execute()).toHaveLength(1);
  });

  it("exports the account's data without internal keys", async () => {
    const { ownerId } = await newOwner();
    const projectId = await newProject(ownerId);
    await createPostgresSharingModule(context.database).createLink({
      ownerId,
      projectId,
      expectedVersion: 1,
      idempotencyKey: `share-${crypto.randomUUID()}`,
      token: `${crypto.randomUUID().replaceAll("-", "")}${crypto.randomUUID().replaceAll("-", "")}`.slice(0, 43),
      displaySnapshot: { cabinetFinish: "Graphit", frontFinish: "Porzellan" }
    });
    await request(ownerId, projectId);

    const data = await exportCustomerAccount(context.database, {
      ownerId,
      email: "export@example.com",
      profile: { name: "Export", phone: "", postalCode: "10115" }
    });
    expect(data.account.email).toBe("export@example.com");
    expect(data.profile.postalCode).toBe("10115");
    expect(data.projects).toHaveLength(1);
    expect(data.projects[0].workingConfiguration.configuration).toMatchObject({ cabinetColorKey: "graphite" });
    expect(data.projects[0].shareLinks).toHaveLength(1);
    expect(data.projects[0].quoteRequests[0].contact.email).toBe("mara@example.com");
    // The link and the request pin the same version: the configuration did not change in between.
    expect(data.projects[0].versions).toHaveLength(1);
    expect(data.projects[0].quoteRequests[0].versionId).toBe(data.projects[0].versions[0].id);

    const text = JSON.stringify(data);
    for (const internal of ["tokenHash", "storageKey", "idempotencyKey", "requestHash"]) {
      expect(text).not.toContain(internal);
    }
  });

  it("holds a stored file for 30 days after its row is gone", async () => {
    const storageKey = `test/hold/${crypto.randomUUID()}.png`;
    const deleted: string[] = [];
    const storage = { deleteObject: async (key: string) => void deleted.push(key) } as unknown as ObjectStorageModule;
    const occurredAt = new Date();
    await context.database
      .withSchema("app")
      .insertInto("outboxMessage")
      .values({
        id: crypto.randomUUID(),
        topic: STORAGE_DELETION_TOPIC,
        aggregateType: "generated-photo",
        aggregateId: crypto.randomUUID(),
        idempotencyKey: storageKey,
        requestHash: "a".repeat(64),
        payload: { storageKey },
        occurredAt,
        availableAt: occurredAt
      })
      .execute();

    const day = 24 * 60 * 60 * 1000;
    await sweepStorageDeletions(context.database, storage, {
      batchSize: 1000,
      clock: () => new Date(occurredAt.getTime() + 29 * day),
      minimumAgeMs: STORAGE_DELETION_HOLD_MS
    });
    expect(deleted).not.toContain(storageKey);

    await sweepStorageDeletions(context.database, storage, {
      batchSize: 1000,
      clock: () => new Date(occurredAt.getTime() + 31 * day),
      minimumAgeMs: STORAGE_DELETION_HOLD_MS
    });
    expect(deleted).toContain(storageKey);
  });
});
