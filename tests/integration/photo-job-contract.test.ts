import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { ObjectStorageModule } from "@/features/object-storage/object-storage-module";
import type { PhotoGenerationAdapter } from "@/features/photo-jobs/photo-generation-adapter";
import { createPostgresPhotoJobModule } from "@/lib/server/db/photo-jobs-postgres";
import {
  startPostgresTestContext,
  type PostgresTestContext
} from "@/tests/integration/postgres-test-context";

function jpegBytes(width: number, height: number) {
  return new Uint8Array([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10,
    0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00,
    0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
    0xff, 0xc0, 0x00, 0x11, 0x08,
    (height >> 8) & 0xff, height & 0xff,
    (width >> 8) & 0xff, width & 0xff,
    0x03, 0x01, 0x22, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01,
    0xff, 0xd9
  ]);
}

/** Every fixture header is the same length, so one constant covers all of them. */
const CAPTURE_BYTE_SIZE = jpegBytes(1280, 720).byteLength;

/**
 * In-memory storage with real presign semantics: reads come back through a URL
 * the module must actually fetch, so the fetch-and-validate path is exercised
 * rather than stubbed away.
 */
function memoryStorage() {
  const objects = new Map<string, { bytes: Uint8Array; contentType: string }>();

  const storage: ObjectStorageModule = {
    async presignUpload({ key, contentType, byteSize }) {
      return {
        key,
        url: `https://storage.test/${key}?sig=1&size=${byteSize}&type=${contentType}`,
        method: "PUT",
        requiredHeaders: {
          "content-type": contentType,
          "content-length": String(byteSize)
        },
        expiresAt: new Date(Date.now() + 300_000)
      };
    },
    async presignDownload({ key }) {
      return {
        key,
        url: `https://storage.test/${key}?sig=1`,
        expiresAt: new Date(Date.now() + 300_000)
      };
    },
    async statObject(key) {
      const object = objects.get(key);
      return object
        ? { key, byteSize: object.bytes.byteLength, contentType: object.contentType }
        : null;
    },
    async deleteObject(key) {
      objects.delete(key);
    }
  };

  return { storage, objects };
}

describe("photo job contract", () => {
  let context: PostgresTestContext;
  let objects: Map<string, { bytes: Uint8Array; contentType: string }>;
  let storage: ObjectStorageModule;

  beforeAll(async () => {
    context = await startPostgresTestContext();
  }, 120_000);

  afterAll(async () => {
    vi.unstubAllGlobals();
    await context?.stop();
  });

  beforeEach(() => {
    const created = memoryStorage();
    storage = created.storage;
    objects = created.objects;

    // Routes storage traffic to the in-memory map; anything else is a bug.
    vi.stubGlobal("fetch", async (input: string | URL | Request, init?: RequestInit) => {
      const url = new URL(typeof input === "string" ? input : input.toString());
      if (url.host !== "storage.test") throw new Error(`unexpected fetch ${url.host}`);
      const key = decodeURIComponent(url.pathname.slice(1));

      if (init?.method === "PUT") {
        const body = init.body as Uint8Array;
        objects.set(key, {
          bytes: body,
          contentType: String(
            (init.headers as Record<string, string>)["content-type"]
          )
        });
        return new Response(null, { status: 200 });
      }

      const object = objects.get(key);
      if (!object) return new Response(null, { status: 404 });
      return new Response(object.bytes as BodyInit, { status: 200 });
    });
  });

  function moduleWith(adapter: PhotoGenerationAdapter) {
    return createPostgresPhotoJobModule(context.database, {
      storage,
      adapter,
      buildPrompt: ({ scenePresetKey }) => `prompt for ${scenePresetKey}`
    });
  }

  const generatingAdapter: PhotoGenerationAdapter = {
    async generate() {
      return {
        kind: "generated",
        bytes: jpegBytes(1920, 1080),
        declaredContentType: "image/jpeg",
        modelIdentifier: "test/model",
        providerReference: "pred_123"
      };
    }
  };

  async function seedProject() {
    const ownerId = crypto.randomUUID();
    const projectId = crypto.randomUUID();
    const db = context.database.withSchema("app");

    await db.insertInto("customerAccount").values({ id: ownerId, status: "active" }).execute();
    await db
      .insertInto("project")
      .values({
        id: projectId,
        ownerId,
        creationIdempotencyKey: `k-${projectId}`,
        name: "Küche",
        privateNotes: "",
        lifecycle: "active"
      })
      .execute();
    await db
      .insertInto("workingConfiguration")
      .values({
        projectId,
        normalizedConfiguration: {
          schemaVersion: 2,
          productKey: "signature-line",
          layout: "straight-line",
          cabinetColorKey: "carbon",
          frontColorKey: "clay",
          wallModules: ["big", "device", "big"],
          islandSize: 4
        },
        configurationHash: crypto.randomUUID().replaceAll("-", "").padEnd(64, "a").slice(0, 64),
        schemaVersion: 2,
        productDefinitionVersion: "rdtdot-signature-kitchen-v1@2"
      })
      .execute();

    return { ownerId, projectId };
  }

  async function requestJob(photoJobs = moduleWith(generatingAdapter)) {
    const { ownerId, projectId } = await seedProject();
    const result = await photoJobs.requestJob({
      ownerId,
      projectId,
      expectedVersion: 1,
      idempotencyKey: crypto.randomUUID(),
      scenePresetKey: "urban-loft",
      capture: { contentType: "image/jpeg", byteSize: CAPTURE_BYTE_SIZE }
    });
    return { ownerId, projectId, result };
  }

  it("checkpoints a photo-triggered revision atomically with the job", async () => {
    const { projectId, result } = await requestJob();
    expect(result.kind).toBe("requested");
    if (result.kind !== "requested") return;

    const revision = await context.database
      .withSchema("app")
      .selectFrom("configurationRevision")
      .select(["id", "trigger"])
      .where("projectId", "=", projectId)
      .executeTakeFirstOrThrow();

    expect(revision.trigger).toBe("photo");
    expect(result.job.revisionId).toBe(revision.id);
    expect(result.job.state).toBe("requested");
    expect(result.upload.url).toContain("captures/");
  });

  it("replays an identical request instead of creating a second job", async () => {
    const photoJobs = moduleWith(generatingAdapter);
    const { ownerId, projectId } = await seedProject();
    const input = {
      ownerId,
      projectId,
      expectedVersion: 1,
      idempotencyKey: crypto.randomUUID(),
      scenePresetKey: "urban-loft",
      capture: { contentType: "image/jpeg" as const, byteSize: CAPTURE_BYTE_SIZE }
    };

    const first = await photoJobs.requestJob(input);
    const second = await photoJobs.requestJob(input);

    expect(first.kind).toBe("requested");
    expect(second.kind).toBe("replayed");
    if (first.kind !== "requested" || second.kind !== "replayed") return;
    expect(second.job.id).toBe(first.job.id);
  });

  it("rejects a request that raced another change to the configuration", async () => {
    const photoJobs = moduleWith(generatingAdapter);
    const { ownerId, projectId } = await seedProject();
    const result = await photoJobs.requestJob({
      ownerId,
      projectId,
      expectedVersion: 99,
      idempotencyKey: crypto.randomUUID(),
      scenePresetKey: "urban-loft",
      capture: { contentType: "image/jpeg", byteSize: CAPTURE_BYTE_SIZE }
    });
    expect(result.kind).toBe("conflict");
  });

  it("shows another customer nothing", async () => {
    const photoJobs = moduleWith(generatingAdapter);
    const { result } = await requestJob(photoJobs);
    if (result.kind !== "requested") throw new Error("setup failed");
    const stranger = crypto.randomUUID();

    expect(
      await photoJobs.getJob({ ownerId: stranger, jobId: result.job.id })
    ).toBeNull();
  });

  it("rejects a capture that was never uploaded", async () => {
    const photoJobs = moduleWith(generatingAdapter);
    const { ownerId, result } = await requestJob(photoJobs);
    if (result.kind !== "requested") throw new Error("setup failed");

    const confirmed = await photoJobs.confirmCapture({ ownerId, jobId: result.job.id });
    expect(confirmed.kind).toBe("rejected");
    if (confirmed.kind !== "rejected") return;
    expect(confirmed.reason).toBe("capture-missing");
    expect(confirmed.job.state).toBe("failed");
  });

  it("rejects an upload that is not an image, whatever it claims", async () => {
    const photoJobs = moduleWith(generatingAdapter);
    const { ownerId, result } = await requestJob(photoJobs);
    if (result.kind !== "requested") throw new Error("setup failed");

    objects.set(result.upload.key, {
      bytes: new TextEncoder().encode("<script>not an image</script>"),
      contentType: "image/jpeg"
    });

    const confirmed = await photoJobs.confirmCapture({ ownerId, jobId: result.job.id });
    expect(confirmed.kind).toBe("rejected");
    if (confirmed.kind !== "rejected") return;
    expect(confirmed.reason).toBe("capture-not-an-image");
  });

  it("rejects a capture whose dimensions are out of range", async () => {
    const photoJobs = moduleWith(generatingAdapter);
    const { ownerId, result } = await requestJob(photoJobs);
    if (result.kind !== "requested") throw new Error("setup failed");

    objects.set(result.upload.key, {
      bytes: jpegBytes(16, 16),
      contentType: "image/jpeg"
    });

    const confirmed = await photoJobs.confirmCapture({ ownerId, jobId: result.job.id });
    expect(confirmed.kind).toBe("rejected");
    if (confirmed.kind !== "rejected") return;
    expect(confirmed.reason).toBe("capture-dimensions-out-of-range");
  });

  it("accepts a valid capture and records its real dimensions", async () => {
    const photoJobs = moduleWith(generatingAdapter);
    const { ownerId, result } = await requestJob(photoJobs);
    if (result.kind !== "requested") throw new Error("setup failed");

    objects.set(result.upload.key, {
      bytes: jpegBytes(1280, 720),
      contentType: "image/jpeg"
    });

    const confirmed = await photoJobs.confirmCapture({ ownerId, jobId: result.job.id });
    expect(confirmed.kind).toBe("ready");

    const capture = await context.database
      .withSchema("app")
      .selectFrom("sourceCapture")
      .select(["status", "width", "height", "byteSize"])
      .where("storageKey", "=", result.upload.key)
      .executeTakeFirstOrThrow();
    expect(capture.status).toBe("stored");
    expect(capture.width).toBe(1280);
    expect(capture.height).toBe(720);
  });

  async function readyJob(photoJobs = moduleWith(generatingAdapter)) {
    const { ownerId, result } = await requestJob(photoJobs);
    if (result.kind !== "requested") throw new Error("setup failed");
    objects.set(result.upload.key, {
      bytes: jpegBytes(1280, 720),
      contentType: "image/jpeg"
    });
    await photoJobs.confirmCapture({ ownerId, jobId: result.job.id });
    return { ownerId, jobId: result.job.id, photoJobs };
  }

  it("writes a Generated Photo row and stores the bytes on success", async () => {
    const { ownerId, jobId, photoJobs } = await readyJob();

    const run = await photoJobs.runJob({ ownerId, jobId });
    expect(run.kind).toBe("succeeded");
    if (run.kind !== "succeeded") return;

    const photo = await context.database
      .withSchema("app")
      .selectFrom("generatedPhoto")
      .select(["id", "storageKey", "width", "height", "contentType", "projectId"])
      .where("photoJobId", "=", jobId)
      .executeTakeFirstOrThrow();

    expect(photo.id).toBe(run.generatedPhotoId);
    expect(photo.width).toBe(1920);
    expect(photo.height).toBe(1080);
    // Dimensions come from probing the bytes, and the bytes are really stored.
    expect(objects.has(photo.storageKey)).toBe(true);
    expect(run.job.state).toBe("succeeded");
  });

  it("does not run a job whose capture is not confirmed", async () => {
    const photoJobs = moduleWith(generatingAdapter);
    const { ownerId, result } = await requestJob(photoJobs);
    if (result.kind !== "requested") throw new Error("setup failed");

    const run = await photoJobs.runJob({ ownerId, jobId: result.job.id });
    expect(run.kind).toBe("not-runnable");
  });

  it("runs a job only once even when called twice", async () => {
    const { ownerId, jobId, photoJobs } = await readyJob();

    const [first, second] = await Promise.all([
      photoJobs.runJob({ ownerId, jobId }),
      photoJobs.runJob({ ownerId, jobId })
    ]);
    const kinds = [first.kind, second.kind].sort();
    expect(kinds).toEqual(["not-runnable", "succeeded"]);

    const photos = await context.database
      .withSchema("app")
      .selectFrom("generatedPhoto")
      .select("id")
      .where("photoJobId", "=", jobId)
      .execute();
    expect(photos).toHaveLength(1);
  });

  it("fails the job and writes no photo when the provider fails", async () => {
    const failing: PhotoGenerationAdapter = {
      async generate() {
        return { kind: "failed", reason: "provider-disabled", retryable: false };
      }
    };
    const { ownerId, jobId, photoJobs } = await readyJob(moduleWith(failing));

    const run = await photoJobs.runJob({ ownerId, jobId });
    expect(run.kind).toBe("failed");
    if (run.kind !== "failed") return;
    expect(run.reason).toBe("provider-disabled");

    const photos = await context.database
      .withSchema("app")
      .selectFrom("generatedPhoto")
      .select("id")
      .where("photoJobId", "=", jobId)
      .execute();
    expect(photos).toHaveLength(0);
  });

  it("rejects provider output that is not a decodable image", async () => {
    const garbage: PhotoGenerationAdapter = {
      async generate() {
        return {
          kind: "generated",
          bytes: new TextEncoder().encode("provider returned prose"),
          declaredContentType: "image/jpeg",
          modelIdentifier: "test/model",
          providerReference: null
        };
      }
    };
    const { ownerId, jobId, photoJobs } = await readyJob(moduleWith(garbage));

    const run = await photoJobs.runJob({ ownerId, jobId });
    expect(run.kind).toBe("failed");
    if (run.kind !== "failed") return;
    expect(run.reason).toBe("output-not-an-image");
  });

  it("cancels a job before it runs and leaves it terminal", async () => {
    const photoJobs = moduleWith(generatingAdapter);
    const { ownerId, result } = await requestJob(photoJobs);
    if (result.kind !== "requested") throw new Error("setup failed");

    const canceled = await photoJobs.cancelJob({ ownerId, jobId: result.job.id });
    expect(canceled.kind).toBe("canceled");

    const again = await photoJobs.cancelJob({ ownerId, jobId: result.job.id });
    expect(again.kind).toBe("unchanged");
  });
});
