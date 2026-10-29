import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PhotoJobTable } from "@/lib/server/db/database-types";
import { STORAGE_DELETION_TOPIC } from "@/lib/server/object-storage/storage-deletion-worker";
import { retireSourceCaptures } from "@/lib/server/photo-jobs/source-capture-retention";
import {
  startPostgresTestContext,
  type PostgresTestContext
} from "@/tests/integration/postgres-test-context";

const HOUR = 60 * 60 * 1000;
/**
 * Every row here is stamped in January and every sweep runs then, so a sweep
 * never reaches the rows other test files leave in a shared database.
 */
const start = new Date("2026-01-10T03:30:00.000Z");
const at = (hours: number) => () => new Date(start.getTime() + hours * HOUR);

describe("Source Capture retention", () => {
  let context: PostgresTestContext;

  beforeAll(async () => {
    context = await startPostgresTestContext();
  }, 120_000);

  afterAll(async () => {
    await context?.stop();
  });

  async function seedProject() {
    const db = context.database.withSchema("app");
    const accountId = crypto.randomUUID();
    const projectId = crypto.randomUUID();
    const revisionId = crypto.randomUUID();
    await db.insertInto("customerAccount").values({ id: accountId, status: "active" }).execute();
    await db
      .insertInto("project")
      .values({
        id: projectId,
        ownerId: accountId,
        creationIdempotencyKey: `key-${projectId}`,
        name: "Retention fixture",
        privateNotes: "",
        lifecycle: "active"
      })
      .execute();
    await db
      .insertInto("configurationRevision")
      .values({
        id: revisionId,
        projectId,
        normalizedConfiguration: {},
        configurationHash: "a".repeat(64),
        schemaVersion: 2,
        productDefinitionVersion: "rdtdot-signature-kitchen-v1@2",
        displaySnapshot: {},
        trigger: "photo",
        label: null
      })
      .execute();
    return { projectId, revisionId };
  }

  /** One job and its own capture, the way the Photo Job Module creates them. */
  async function seedJob(
    project: { projectId: string; revisionId: string },
    job: { state: PhotoJobTable["state"]; createdAt: Date; terminalAt?: Date }
  ) {
    const db = context.database.withSchema("app");
    const captureId = crypto.randomUUID();
    const jobId = crypto.randomUUID();
    const captureKey = `captures/${captureId}.jpg`;
    const stored = job.state !== "requested";
    await db
      .insertInto("sourceCapture")
      .values({
        id: captureId,
        projectId: project.projectId,
        configurationRevisionId: project.revisionId,
        storageKey: captureKey,
        contentType: "image/jpeg",
        maxByteSize: 400_000,
        byteSize: stored ? 123_456 : null,
        width: stored ? 1280 : null,
        height: stored ? 720 : null,
        status: stored ? "stored" : "reserved",
        rejectionReason: null,
        storedAt: stored ? job.createdAt : null,
        createdAt: job.createdAt
      })
      .execute();
    await db
      .insertInto("photoJob")
      .values({
        id: jobId,
        projectId: project.projectId,
        configurationRevisionId: project.revisionId,
        sourceCaptureId: captureId,
        scenePresetKey: "studio",
        state: job.state,
        creationIdempotencyKey: `job-${jobId}`,
        requestHash: "b".repeat(64),
        // None, so the in-flight sweep of another test file never asks a provider about it.
        providerReference: null,
        failureReason: null,
        terminalAt: job.terminalAt ?? null,
        createdAt: job.createdAt
      })
      .execute();
    return { jobId, captureId, captureKey };
  }

  async function capture(id: string) {
    return context.database
      .withSchema("app")
      .selectFrom("sourceCapture")
      .select("id")
      .where("id", "=", id)
      .executeTakeFirst();
  }

  async function job(id: string) {
    return context.database
      .withSchema("app")
      .selectFrom("photoJob")
      .select(["state", "failureReason", "sourceCaptureId", "terminalAt"])
      .where("id", "=", id)
      .executeTakeFirstOrThrow();
  }

  it("retires a finished job's capture after the grace window and records its deletion", async () => {
    const project = await seedProject();
    const finished = await seedJob(project, {
      state: "succeeded",
      createdAt: start,
      terminalAt: start
    });

    await retireSourceCaptures(context.database, { clock: at(23) });
    expect(await capture(finished.captureId)).toBeDefined();

    await retireSourceCaptures(context.database, { clock: at(25) });
    expect(await capture(finished.captureId)).toBeUndefined();
    expect(await job(finished.jobId)).toMatchObject({
      state: "succeeded",
      sourceCaptureId: null
    });

    const intents = await context.database
      .withSchema("app")
      .selectFrom("outboxMessage")
      .select(["aggregateType", "processedAt"])
      .where("topic", "=", STORAGE_DELETION_TOPIC)
      .where("idempotencyKey", "=", finished.captureKey)
      .execute();
    expect(intents).toEqual([{ aggregateType: "source-capture", processedAt: null }]);
  });

  it("fails a job abandoned before upload or submission, then retires its capture", async () => {
    const project = await seedProject();
    const neverUploaded = await seedJob(project, { state: "requested", createdAt: start });
    const neverSubmitted = await seedJob(project, { state: "capture-ready", createdAt: start });

    const first = await retireSourceCaptures(context.database, { clock: at(25) });
    expect(first.abandonedJobs).toBeGreaterThanOrEqual(2);
    for (const abandoned of [neverUploaded, neverSubmitted]) {
      expect(await job(abandoned.jobId)).toMatchObject({
        state: "failed",
        failureReason: "abandoned",
        terminalAt: at(25)()
      });
      // The grace window starts when the job is failed.
      expect(await capture(abandoned.captureId)).toBeDefined();
    }

    await retireSourceCaptures(context.database, { clock: at(50) });
    expect(await capture(neverUploaded.captureId)).toBeUndefined();
    expect(await capture(neverSubmitted.captureId)).toBeUndefined();
  });

  it("keeps the capture of a job the provider is still working on", async () => {
    const project = await seedProject();
    const working = await seedJob(project, { state: "submitted", createdAt: start });

    await retireSourceCaptures(context.database, { clock: at(72) });

    expect(await capture(working.captureId)).toBeDefined();
    expect(await job(working.jobId)).toMatchObject({
      state: "submitted",
      sourceCaptureId: working.captureId
    });
  });

  it("refuses to take a capture away from a job still at work", async () => {
    const project = await seedProject();
    const working = await seedJob(project, { state: "submitted", createdAt: start });
    const db = context.database.withSchema("app");

    await expect(
      db
        .updateTable("photoJob")
        .set({ sourceCaptureId: null })
        .where("id", "=", working.jobId)
        .execute()
    ).rejects.toMatchObject({ code: "23514" });
    await expect(
      db.deleteFrom("sourceCapture").where("id", "=", working.captureId).execute()
    ).rejects.toMatchObject({ code: "23503" });
  });
});
