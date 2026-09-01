import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { ObjectStorageModule } from "@/features/object-storage/object-storage-module";
import {
  findUnreconciledDeletions,
  STORAGE_DELETION_TOPIC,
  sweepStorageDeletions
} from "@/lib/server/object-storage/storage-deletion-worker";
import {
  startPostgresTestContext,
  type PostgresTestContext
} from "@/tests/integration/postgres-test-context";

type Fixture = {
  accountId: string;
  projectId: string;
  revisionId: string;
  jobId: string;
  captureId: string;
  photoId: string;
  captureKey: string;
  photoKey: string;
};

function fakeStorage(
  behavior: { failFor?: Set<string> } = {}
): ObjectStorageModule & { deleted: string[] } {
  const deleted: string[] = [];
  return {
    deleted,
    async presignUpload() {
      throw new Error("not used");
    },
    async presignDownload() {
      throw new Error("not used");
    },
    async statObject() {
      return null;
    },
    async deleteObject(key) {
      if (behavior.failFor?.has(key)) throw new Error("storage unavailable");
      deleted.push(key);
    }
  };
}

describe("photo artifact storage contract", () => {
  let context: PostgresTestContext;

  beforeAll(async () => {
    context = await startPostgresTestContext();
  }, 120_000);

  afterAll(async () => {
    await context?.stop();
  });

  async function seed(): Promise<Fixture> {
    const fixture: Fixture = {
      accountId: crypto.randomUUID(),
      projectId: crypto.randomUUID(),
      revisionId: crypto.randomUUID(),
      jobId: crypto.randomUUID(),
      captureId: crypto.randomUUID(),
      photoId: crypto.randomUUID(),
      captureKey: "",
      photoKey: ""
    };
    fixture.captureKey = `captures/${fixture.captureId}.jpg`;
    fixture.photoKey = `photos/${fixture.photoId}.webp`;

    const db = context.database.withSchema("app");

    await db
      .insertInto("customerAccount")
      .values({ id: fixture.accountId, status: "active" })
      .execute();
    await db
      .insertInto("project")
      .values({
        id: fixture.projectId,
        ownerId: fixture.accountId,
        creationIdempotencyKey: `key-${fixture.projectId}`,
        name: "Photo storage fixture",
        privateNotes: "",
        lifecycle: "active"
      })
      .execute();
    await db
      .insertInto("configurationRevision")
      .values({
        id: fixture.revisionId,
        projectId: fixture.projectId,
        normalizedConfiguration: {},
        configurationHash: "a".repeat(64),
        schemaVersion: 2,
        productDefinitionVersion: "rdtdot-signature-kitchen-v1@2",
        displaySnapshot: {},
        trigger: "photo",
        label: null
      })
      .execute();
    await db
      .insertInto("sourceCapture")
      .values({
        id: fixture.captureId,
        projectId: fixture.projectId,
        configurationRevisionId: fixture.revisionId,
        storageKey: fixture.captureKey,
        contentType: "image/jpeg",
        maxByteSize: 400_000,
        byteSize: 123_456,
        width: 1280,
        height: 720,
        status: "stored",
        rejectionReason: null,
        storedAt: new Date()
      })
      .execute();
    await db
      .insertInto("photoJob")
      .values({
        id: fixture.jobId,
        projectId: fixture.projectId,
        configurationRevisionId: fixture.revisionId,
        sourceCaptureId: fixture.captureId,
        scenePresetKey: "studio",
        state: "succeeded",
        creationIdempotencyKey: `job-${fixture.jobId}`,
        requestHash: "b".repeat(64),
        providerReference: null,
        failureReason: null,
        terminalAt: new Date()
      })
      .execute();
    await db
      .insertInto("generatedPhoto")
      .values({
        id: fixture.photoId,
        photoJobId: fixture.jobId,
        projectId: fixture.projectId,
        configurationRevisionId: fixture.revisionId,
        storageKey: fixture.photoKey,
        contentType: "image/webp",
        byteSize: 234_567,
        width: 1920,
        height: 1080
      })
      .execute();

    return fixture;
  }

  async function deletionIntents(keys: string[]) {
    return context.database
      .withSchema("app")
      .selectFrom("outboxMessage")
      .select(["idempotencyKey", "aggregateType", "processedAt"])
      .where("topic", "=", STORAGE_DELETION_TOPIC)
      .where("idempotencyKey", "in", keys)
      .execute();
  }

  it("enqueues object deletion when a Generated Photo is deleted directly", async () => {
    const fixture = await seed();

    await context.database
      .withSchema("app")
      .deleteFrom("generatedPhoto")
      .where("id", "=", fixture.photoId)
      .execute();

    const intents = await deletionIntents([fixture.photoKey]);
    expect(intents).toHaveLength(1);
    expect(intents[0].aggregateType).toBe("generated-photo");
  });

  it("enqueues object deletion for artifacts removed by Project cascade", async () => {
    const fixture = await seed();

    // Nothing names the photo or the capture: they go by ON DELETE CASCADE.
    // Without the trigger their objects would be orphaned in the bucket.
    await context.database
      .withSchema("app")
      .deleteFrom("project")
      .where("id", "=", fixture.projectId)
      .execute();

    const intents = await deletionIntents([fixture.photoKey, fixture.captureKey]);
    expect(intents.map((intent) => intent.aggregateType).sort()).toEqual([
      "generated-photo",
      "source-capture"
    ]);
  });

  it("enqueues object deletion for artifacts removed by Customer Account deletion", async () => {
    const fixture = await seed();

    await context.database
      .withSchema("app")
      .deleteFrom("customerAccount")
      .where("id", "=", fixture.accountId)
      .execute();

    const intents = await deletionIntents([fixture.photoKey, fixture.captureKey]);
    expect(intents).toHaveLength(2);
  });

  it("deletes the objects and marks the intents processed", async () => {
    const fixture = await seed();
    await context.database
      .withSchema("app")
      .deleteFrom("project")
      .where("id", "=", fixture.projectId)
      .execute();

    const storage = fakeStorage();
    await sweepStorageDeletions(context.database, storage, { batchSize: 500 });

    expect(storage.deleted).toEqual(
      expect.arrayContaining([fixture.photoKey, fixture.captureKey])
    );

    const intents = await deletionIntents([fixture.photoKey, fixture.captureKey]);
    expect(intents.every((intent) => intent.processedAt !== null)).toBe(true);
  });

  it("leaves the intent unprocessed and retryable when storage fails", async () => {
    const fixture = await seed();
    await context.database
      .withSchema("app")
      .deleteFrom("project")
      .where("id", "=", fixture.projectId)
      .execute();

    const failing = fakeStorage({ failFor: new Set([fixture.photoKey]) });
    await sweepStorageDeletions(context.database, failing, { batchSize: 500 });

    const [photoIntent] = await deletionIntents([fixture.photoKey]);
    expect(photoIntent.processedAt).toBeNull();

    // A later sweep against healthy storage completes it.
    const healthy = fakeStorage();
    await sweepStorageDeletions(context.database, healthy, {
      batchSize: 500,
      clock: () => new Date(Date.now() + 60 * 60 * 1000)
    });

    const [retried] = await deletionIntents([fixture.photoKey]);
    expect(retried.processedAt).not.toBeNull();
    expect(healthy.deleted).toContain(fixture.photoKey);
  });

  it("treats an already-missing object as a successful deletion", async () => {
    const fixture = await seed();
    await context.database
      .withSchema("app")
      .deleteFrom("generatedPhoto")
      .where("id", "=", fixture.photoId)
      .execute();

    const storage = fakeStorage();
    const result = await sweepStorageDeletions(context.database, storage, {
      batchSize: 500
    });

    expect(result.deleted).toBeGreaterThan(0);
    expect(await findUnreconciledDeletions(context.database)).toHaveLength(0);
  });

  it("records the deletion intent exactly once per object", async () => {
    const fixture = await seed();

    await context.database
      .withSchema("app")
      .deleteFrom("generatedPhoto")
      .where("id", "=", fixture.photoId)
      .execute();
    await context.database
      .withSchema("app")
      .deleteFrom("project")
      .where("id", "=", fixture.projectId)
      .execute();

    const intents = await deletionIntents([fixture.photoKey]);
    expect(intents).toHaveLength(1);
  });
});
