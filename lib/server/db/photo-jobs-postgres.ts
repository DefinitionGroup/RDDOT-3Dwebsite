import "server-only";

import { randomUUID } from "node:crypto";
import type { Kysely } from "kysely";
import { z } from "zod";
import type { ObjectStorageModule } from "@/features/object-storage/object-storage-module";
import { probeImage } from "@/features/photo-jobs/image-probe";
import type { PhotoGenerationAdapter } from "@/features/photo-jobs/photo-generation-adapter";
import type {
  CancelPhotoJobResult,
  ConfirmCaptureResult,
  PhotoJob,
  PhotoJobModule,
  RequestPhotoJobResult,
  RunPhotoJobResult
} from "@/features/photo-jobs/photo-job-module";
import { hashJson } from "@/features/projects/configuration-contract";
import type { Database } from "@/lib/server/db/database-types";
import { isPostgresErrorWithCode } from "@/lib/server/db/postgres-errors";

const uuidSchema = z.uuid();
const idempotencyKeySchema = z.string().trim().min(8).max(200);
const presetKeySchema = z.string().trim().min(1).max(64);

/** Matches the browser capture budget the prototype established. */
const MAX_CAPTURE_BYTES = 6 * 1024 * 1024;
const MIN_CAPTURE_EDGE = 320;
const MAX_CAPTURE_EDGE = 8192;
const MAX_OUTPUT_BYTES = 24 * 1024 * 1024;

/** Cheap abuse ceiling until the Phase 4 quota model lands (gap G7). */
const MAX_JOBS_PER_DAY = 25;

type JobRow = {
  id: string;
  projectId: string;
  configurationRevisionId: string;
  scenePresetKey: string;
  state: PhotoJob["state"];
  failureReason: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function mapJob(row: JobRow, generatedPhotoId: string | null = null): PhotoJob {
  return {
    id: row.id,
    projectId: row.projectId,
    revisionId: row.configurationRevisionId,
    scenePresetKey: row.scenePresetKey,
    state: row.state,
    failureReason: row.failureReason,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
    generatedPhotoId
  };
}

export type PromptBuilder = (input: {
  normalizedConfiguration: unknown;
  productDefinitionVersion: string;
  scenePresetKey: string;
}) => string;

export function createPostgresPhotoJobModule(
  database: Kysely<Database>,
  dependencies: {
    storage: ObjectStorageModule;
    adapter: PhotoGenerationAdapter;
    /**
     * Builds the prompt from the pinned revision's configuration only. Client
     * input never reaches it (gap G6).
     */
    buildPrompt: PromptBuilder;
  },
  clock: () => Date = () => new Date()
): PhotoJobModule {
  const { storage, adapter, buildPrompt } = dependencies;

  /** Single owner predicate for every read and write in this module. */
  function ownedJobs(ownerId: string) {
    return database
      .withSchema("app")
      .selectFrom("photoJob")
      .innerJoin("project", "project.id", "photoJob.projectId")
      .where("project.ownerId", "=", ownerId)
      .where("project.lifecycle", "!=", "trashed");
  }

  const jobColumns = [
    "photoJob.id",
    "photoJob.projectId",
    "photoJob.configurationRevisionId",
    "photoJob.scenePresetKey",
    "photoJob.state",
    "photoJob.failureReason",
    "photoJob.createdAt",
    "photoJob.updatedAt"
  ] as const;

  async function loadJob(ownerId: string, jobId: string) {
    const row = await ownedJobs(ownerId)
      .select([...jobColumns])
      .where("photoJob.id", "=", jobId)
      .executeTakeFirst();
    if (!row) return null;

    const photo = await database
      .withSchema("app")
      .selectFrom("generatedPhoto")
      .select("id")
      .where("photoJobId", "=", jobId)
      .executeTakeFirst();

    return mapJob(row as JobRow, photo?.id ?? null);
  }

  async function markState(
    jobId: string,
    state: PhotoJob["state"],
    extra: { failureReason?: string | null; providerReference?: string | null } = {}
  ) {
    const terminal =
      state === "succeeded" || state === "failed" || state === "canceled";
    await database
      .withSchema("app")
      .updateTable("photoJob")
      .set({
        state,
        updatedAt: clock(),
        terminalAt: terminal ? clock() : null,
        ...(extra.failureReason !== undefined
          ? { failureReason: extra.failureReason }
          : {}),
        ...(extra.providerReference !== undefined
          ? { providerReference: extra.providerReference }
          : {})
      })
      .where("id", "=", jobId)
      .execute();
  }

  return {
    async requestJob(input): Promise<RequestPhotoJobResult> {
      const ownerId = uuidSchema.parse(input.ownerId);
      const projectId = uuidSchema.parse(input.projectId);
      const expectedVersion = z.number().int().positive().parse(input.expectedVersion);
      const idempotencyKey = idempotencyKeySchema.parse(input.idempotencyKey);
      const scenePresetKey = presetKeySchema.parse(input.scenePresetKey);
      const byteSize = z
        .number()
        .int()
        .positive()
        .max(MAX_CAPTURE_BYTES)
        .parse(input.capture.byteSize);
      const contentType = z
        .enum(["image/jpeg", "image/png"])
        .parse(input.capture.contentType);
      const requestHash = hashJson({
        projectId,
        expectedVersion,
        scenePresetKey,
        contentType,
        byteSize
      });

      type Prepared =
        | { kind: "requested"; job: PhotoJob; captureKey: string }
        | { kind: "replayed"; job: PhotoJob; captureKey: string }
        | { kind: "conflict"; currentVersion: number }
        | { kind: "idempotency-conflict" }
        | { kind: "quota-exceeded"; retryAfterSeconds: number }
        | { kind: "unavailable" };

      const prepared = await database.transaction().execute(
        async (transaction): Promise<Prepared> => {
          const replay = await transaction
            .withSchema("app")
            .selectFrom("photoJob")
            .innerJoin("project", "project.id", "photoJob.projectId")
            .select([...jobColumns, "photoJob.requestHash"])
            .where("project.id", "=", projectId)
            .where("project.ownerId", "=", ownerId)
            .where("photoJob.creationIdempotencyKey", "=", idempotencyKey)
            .executeTakeFirst();

          if (replay) {
            if (replay.requestHash !== requestHash) {
              return { kind: "idempotency-conflict" };
            }
            const existingCapture = await transaction
              .withSchema("app")
              .selectFrom("sourceCapture")
              .innerJoin("photoJob", "photoJob.sourceCaptureId", "sourceCapture.id")
              .select("sourceCapture.storageKey")
              .where("photoJob.id", "=", replay.id)
              .executeTakeFirst();
            if (!existingCapture) return { kind: "unavailable" };
            return {
              kind: "replayed",
              job: mapJob(replay as JobRow),
              captureKey: existingCapture.storageKey
            };
          }

          const working = await transaction
            .withSchema("app")
            .selectFrom("workingConfiguration")
            .innerJoin("project", "project.id", "workingConfiguration.projectId")
            .select([
              "workingConfiguration.normalizedConfiguration",
              "workingConfiguration.configurationHash",
              "workingConfiguration.schemaVersion",
              "workingConfiguration.productDefinitionVersion",
              "workingConfiguration.version"
            ])
            .where("project.id", "=", projectId)
            .where("project.ownerId", "=", ownerId)
            .where("project.lifecycle", "=", "active")
            .forUpdate()
            .executeTakeFirst();

          if (!working) return { kind: "unavailable" };
          // `version` is a bigint, which the driver hands back as a string.
          const currentVersion = Number(working.version);
          if (currentVersion !== expectedVersion) {
            return { kind: "conflict", currentVersion };
          }

          const since = new Date(clock().getTime() - 24 * 60 * 60 * 1000);
          const recent = await transaction
            .withSchema("app")
            .selectFrom("photoJob")
            .innerJoin("project", "project.id", "photoJob.projectId")
            .select((expression) => expression.fn.countAll<number>().as("count"))
            .where("project.ownerId", "=", ownerId)
            .where("photoJob.createdAt", ">=", since)
            .executeTakeFirstOrThrow();
          if (Number(recent.count) >= MAX_JOBS_PER_DAY) {
            return { kind: "quota-exceeded", retryAfterSeconds: 3600 };
          }

          // The checkpoint and the job are one transaction: a job can never
          // reference a configuration that was not durably pinned first.
          const revisionId = randomUUID();
          const inserted = await transaction
            .withSchema("app")
            .insertInto("configurationRevision")
            .values({
              id: revisionId,
              projectId,
              normalizedConfiguration: working.normalizedConfiguration,
              configurationHash: working.configurationHash,
              schemaVersion: working.schemaVersion,
              productDefinitionVersion: working.productDefinitionVersion,
              displaySnapshot: {},
              trigger: "photo",
              label: null
            })
            .onConflict((conflict) =>
              conflict
                .columns([
                  "projectId",
                  "schemaVersion",
                  "productDefinitionVersion",
                  "configurationHash"
                ])
                .doNothing()
            )
            .returning("id")
            .executeTakeFirst();

          const revision =
            inserted ??
            (await transaction
              .withSchema("app")
              .selectFrom("configurationRevision")
              .select("id")
              .where("projectId", "=", projectId)
              .where("schemaVersion", "=", working.schemaVersion)
              .where(
                "productDefinitionVersion",
                "=",
                working.productDefinitionVersion
              )
              .where("configurationHash", "=", working.configurationHash)
              .executeTakeFirstOrThrow());

          const captureId = randomUUID();
          const storageKey = `captures/${captureId}.${
            contentType === "image/png" ? "png" : "jpg"
          }`;
          await transaction
            .withSchema("app")
            .insertInto("sourceCapture")
            .values({
              id: captureId,
              projectId,
              configurationRevisionId: revision.id,
              storageKey,
              contentType,
              maxByteSize: byteSize,
              byteSize: null,
              width: null,
              height: null,
              status: "reserved",
              rejectionReason: null,
              storedAt: null
            })
            .execute();

          const jobId = randomUUID();
          await transaction
            .withSchema("app")
            .insertInto("photoJob")
            .values({
              id: jobId,
              projectId,
              configurationRevisionId: revision.id,
              sourceCaptureId: captureId,
              scenePresetKey,
              state: "requested",
              creationIdempotencyKey: idempotencyKey,
              requestHash,
              providerReference: null,
              failureReason: null,
              terminalAt: null
            })
            .execute();

          const created = await transaction
            .withSchema("app")
            .selectFrom("photoJob")
            .select([
              "id",
              "projectId",
              "configurationRevisionId",
              "scenePresetKey",
              "state",
              "failureReason",
              "createdAt",
              "updatedAt"
            ])
            .where("id", "=", jobId)
            .executeTakeFirstOrThrow();

          return {
            kind: "requested",
            job: mapJob(created as JobRow),
            captureKey: storageKey
          };
        }
      );

      if (prepared.kind !== "requested" && prepared.kind !== "replayed") {
        return prepared;
      }

      // Presigned after the transaction commits: it is a network call and must
      // not be made while holding the working-configuration row lock.
      const upload = await storage.presignUpload({
        key: prepared.captureKey,
        contentType,
        byteSize
      });
      return { kind: prepared.kind, job: prepared.job, upload };
    },

    async confirmCapture(input): Promise<ConfirmCaptureResult> {
      const ownerId = uuidSchema.parse(input.ownerId);
      const jobId = uuidSchema.parse(input.jobId);

      const row = await ownedJobs(ownerId)
        .innerJoin("sourceCapture", "sourceCapture.id", "photoJob.sourceCaptureId")
        .select([
          ...jobColumns,
          "sourceCapture.id as captureId",
          "sourceCapture.storageKey as captureKey",
          "sourceCapture.contentType as captureContentType",
          "sourceCapture.maxByteSize as captureMaxBytes",
          "sourceCapture.status as captureStatus"
        ])
        .where("photoJob.id", "=", jobId)
        .executeTakeFirst();

      if (!row) return { kind: "unavailable" };
      const job = mapJob(row as JobRow);
      const captureId = row.captureId;

      if (row.captureStatus === "stored") return { kind: "ready", job };
      if (job.state !== "requested") return { kind: "unavailable" };

      async function reject(reason: string): Promise<ConfirmCaptureResult> {
        await database
          .withSchema("app")
          .updateTable("sourceCapture")
          .set({ status: "rejected", rejectionReason: reason })
          .where("id", "=", captureId)
          .execute();
        await markState(jobId, "failed", { failureReason: reason });
        return { kind: "rejected", job: { ...job, state: "failed" }, reason };
      }

      const facts = await storage.statObject(row.captureKey);
      if (!facts) return await reject("capture-missing");
      if (facts.byteSize > row.captureMaxBytes) {
        return await reject("capture-too-large");
      }

      const download = await storage.presignDownload({
        key: row.captureKey,
        expiresInSeconds: 120
      });
      const response = await fetch(download.url);
      if (!response.ok) return await reject("capture-unreadable");

      const bytes = new Uint8Array(await response.arrayBuffer());
      const probed = probeImage(bytes);
      if (!probed) return await reject("capture-not-an-image");
      if (probed.contentType !== row.captureContentType) {
        return await reject("capture-content-type-mismatch");
      }
      if (
        probed.width < MIN_CAPTURE_EDGE ||
        probed.height < MIN_CAPTURE_EDGE ||
        probed.width > MAX_CAPTURE_EDGE ||
        probed.height > MAX_CAPTURE_EDGE
      ) {
        return await reject("capture-dimensions-out-of-range");
      }

      await database
        .withSchema("app")
        .updateTable("sourceCapture")
        .set({
          status: "stored",
          byteSize: bytes.byteLength,
          width: probed.width,
          height: probed.height,
          storedAt: clock()
        })
        .where("id", "=", captureId)
        .execute();
      await markState(jobId, "capture-ready");

      return { kind: "ready", job: { ...job, state: "capture-ready" } };
    },

    async runJob(input): Promise<RunPhotoJobResult> {
      const ownerId = uuidSchema.parse(input.ownerId);
      const jobId = uuidSchema.parse(input.jobId);

      const row = await ownedJobs(ownerId)
        .innerJoin("sourceCapture", "sourceCapture.id", "photoJob.sourceCaptureId")
        .innerJoin(
          "configurationRevision",
          "configurationRevision.id",
          "photoJob.configurationRevisionId"
        )
        .select([
          ...jobColumns,
          "sourceCapture.storageKey as captureKey",
          "sourceCapture.contentType as captureContentType",
          "configurationRevision.normalizedConfiguration as pinnedConfiguration",
          "configurationRevision.productDefinitionVersion as pinnedProductVersion"
        ])
        .where("photoJob.id", "=", jobId)
        .executeTakeFirst();

      if (!row) return { kind: "unavailable" };
      const job = mapJob(row as JobRow);
      if (job.state !== "capture-ready") return { kind: "not-runnable", job };

      // Claim the job so a second call cannot start the same work twice.
      const claimed = await database
        .withSchema("app")
        .updateTable("photoJob")
        .set({ state: "submitted", updatedAt: clock() })
        .where("id", "=", jobId)
        .where("state", "=", "capture-ready")
        .executeTakeFirst();
      if (Number(claimed.numUpdatedRows ?? 0) === 0) {
        return { kind: "not-runnable", job };
      }

      async function fail(reason: string): Promise<RunPhotoJobResult> {
        await markState(jobId, "failed", { failureReason: reason });
        return { kind: "failed", job: { ...job, state: "failed" }, reason };
      }

      try {
        const captureUrl = await storage.presignDownload({
          key: row.captureKey,
          expiresInSeconds: 300
        });
        const captureResponse = await fetch(captureUrl.url);
        if (!captureResponse.ok) return await fail("capture-unreadable");
        const capture = new Uint8Array(await captureResponse.arrayBuffer());

        // Product facts come from the pinned revision, never from the client.
        const prompt = buildPrompt({
          normalizedConfiguration: row.pinnedConfiguration,
          productDefinitionVersion: row.pinnedProductVersion,
          scenePresetKey: row.scenePresetKey
        });

        await markState(jobId, "running");
        const outcome = await adapter.generate({
          capture,
          captureContentType: row.captureContentType,
          prompt,
          aspectRatio: "16:9"
        });

        if (outcome.kind === "failed") return await fail(outcome.reason);

        await markState(jobId, "validating", {
          providerReference: outcome.providerReference
        });

        if (outcome.bytes.byteLength === 0) return await fail("output-empty");
        if (outcome.bytes.byteLength > MAX_OUTPUT_BYTES) {
          return await fail("output-too-large");
        }
        const probed = probeImage(outcome.bytes);
        if (!probed) return await fail("output-not-an-image");

        // Success is declared only after the bytes are durably in EU storage.
        const photoId = randomUUID();
        const extension =
          probed.contentType === "image/png"
            ? "png"
            : probed.contentType === "image/webp"
              ? "webp"
              : "jpg";
        const storageKey = `photos/${photoId}.${extension}`;

        const upload = await storage.presignUpload({
          key: storageKey,
          contentType: probed.contentType,
          byteSize: outcome.bytes.byteLength
        });
        const body = new Uint8Array(outcome.bytes.byteLength);
        body.set(outcome.bytes);
        const put = await fetch(upload.url, {
          method: "PUT",
          headers: upload.requiredHeaders,
          body
        });
        if (!put.ok) return await fail("output-storage-failed");

        await database
          .withSchema("app")
          .insertInto("generatedPhoto")
          .values({
            id: photoId,
            photoJobId: jobId,
            projectId: job.projectId,
            configurationRevisionId: job.revisionId,
            storageKey,
            contentType: probed.contentType,
            byteSize: outcome.bytes.byteLength,
            width: probed.width,
            height: probed.height
          })
          .execute();

        await markState(jobId, "succeeded", { failureReason: null });
        return {
          kind: "succeeded",
          job: { ...job, state: "succeeded", generatedPhotoId: photoId },
          generatedPhotoId: photoId
        };
      } catch (error) {
        if (isPostgresErrorWithCode(error, "23505")) {
          // A concurrent run already produced the photo for this job.
          const existing = await loadJob(ownerId, jobId);
          if (existing?.generatedPhotoId) {
            return {
              kind: "succeeded",
              job: existing,
              generatedPhotoId: existing.generatedPhotoId
            };
          }
        }
        console.error("Photo job execution failed", error);
        return await fail("execution-error");
      }
    },

    async getJob(input) {
      return loadJob(uuidSchema.parse(input.ownerId), uuidSchema.parse(input.jobId));
    },

    async listForProject(input) {
      const ownerId = uuidSchema.parse(input.ownerId);
      const projectId = uuidSchema.parse(input.projectId);
      const limit = z.number().int().min(1).max(100).parse(input.limit ?? 20);

      const rows = await ownedJobs(ownerId)
        .leftJoin("generatedPhoto", "generatedPhoto.photoJobId", "photoJob.id")
        .select([...jobColumns, "generatedPhoto.id as generatedPhotoId"])
        .where("photoJob.projectId", "=", projectId)
        .orderBy("photoJob.createdAt", "desc")
        .limit(limit)
        .execute();

      return rows.map((row) => mapJob(row as JobRow, row.generatedPhotoId ?? null));
    },

    async cancelJob(input): Promise<CancelPhotoJobResult> {
      const ownerId = uuidSchema.parse(input.ownerId);
      const jobId = uuidSchema.parse(input.jobId);

      const job = await loadJob(ownerId, jobId);
      if (!job) return { kind: "unavailable" };
      if (
        job.state === "succeeded" ||
        job.state === "failed" ||
        job.state === "canceled"
      ) {
        return { kind: "unchanged", job };
      }

      await markState(jobId, "canceled", { failureReason: "canceled-by-owner" });
      return { kind: "canceled", job: { ...job, state: "canceled" } };
    }
  };
}
