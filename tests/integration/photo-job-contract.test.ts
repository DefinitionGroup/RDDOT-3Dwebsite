import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { ObjectStorageModule } from "@/features/object-storage/object-storage-module";
import type { PhotoGenerationAdapter } from "@/features/photo-jobs/photo-generation-adapter";
import type { PhotoGovernance } from "@/features/photo-jobs/photo-governance";
import {
  createPostgresPhotoJobModule,
  type PhotoLimits
} from "@/lib/server/db/photo-jobs-postgres";
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

  /** The approved releases as the module sees them; the DB seed is tested separately. */
  const governance: PhotoGovernance = {
    async getActiveReleases() {
      return {
        promptTemplate: {
          id: "5a6c1c8e-2c1f-4c33-9a0e-0d2f7f1e0001",
          key: "signature-kitchen-photo",
          version: 1,
          template: "Fronts {{frontLabel}} ({{frontMaterial}}), body {{cabinetLabel}}. {{scene}}",
          scenePresets: [
            { key: "urban-loft", label: { de: "Loft", en: "Loft", es: "Loft" }, scene: "In a loft." }
          ],
          approvedBy: "test",
          approvedAt: new Date("2026-08-27T00:00:00Z")
        },
        model: {
          id: "7b2e9d54-4f7a-4e2a-8c3d-1e5b9a2c0001",
          provider: "test",
          modelIdentifier: "test/model",
          versionLabel: "v1",
          estimatedCostCents: 5,
          approvedBy: "test",
          approvedAt: new Date("2026-08-27T00:00:00Z")
        }
      };
    }
  };

  function moduleWith(
    adapter: PhotoGenerationAdapter,
    clock?: () => Date,
    limits?: Partial<PhotoLimits>
  ) {
    return createPostgresPhotoJobModule(
      context.database,
      {
        storage,
        adapter,
        governance,
        buildPromptFacts: () => ({
          frontLabel: "Porcelain",
          frontMaterial: "matte lacquer",
          cabinetLabel: "Graphite"
        }),
        webhookUrl: null,
        limits
      },
      clock
    );
  }

  /**
   * A provider that accepts every submission and, when inspected, has the
   * output ready. Overrides shape the failure paths. References are unique so
   * events can be routed to the right job.
   */
  function fakeAdapter(overrides: Partial<PhotoGenerationAdapter> = {}) {
    const submitted: string[] = [];
    const canceled: string[] = [];
    const adapter: PhotoGenerationAdapter & { submitted: string[]; canceled: string[] } = {
      submitted,
      canceled,
      async submit() {
        const providerReference = `pred_${crypto.randomUUID()}`;
        submitted.push(providerReference);
        return { kind: "submitted", providerReference, modelIdentifier: "test/model" };
      },
      async inspect(providerReference) {
        return {
          kind: "generated",
          bytes: jpegBytes(1920, 1080),
          declaredContentType: "image/jpeg",
          modelIdentifier: "test/model",
          providerReference,
          durationMs: 17_000
        };
      },
      async cancel(providerReference) {
        canceled.push(providerReference);
      },
      async parseWebhook() {
        return null;
      },
      ...overrides
    };
    return adapter;
  }

  const generatingAdapter = fakeAdapter();

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

  async function submittedJob(adapter = fakeAdapter(), clock?: () => Date) {
    const photoJobs = moduleWith(adapter, clock);
    const { ownerId, jobId } = await readyJob(photoJobs);
    const submitted = await photoJobs.submitJob({ ownerId, jobId });
    if (submitted.kind !== "submitted") throw new Error(`setup failed: ${submitted.kind}`);
    const reference = adapter.submitted[adapter.submitted.length - 1];
    return { ownerId, jobId, photoJobs, adapter, reference };
  }

  it("submits a capture-ready job, pins the approved releases and the rendered prompt", async () => {
    const { jobId, reference, adapter, photoJobs, ownerId } = await submittedJob();

    const row = await context.database
      .withSchema("app")
      .selectFrom("photoJob")
      .select([
        "state",
        "providerReference",
        "modelIdentifier",
        "submittedAt",
        "promptTemplateReleaseId",
        "modelReleaseId",
        "promptText",
        "estimatedCostCents"
      ])
      .where("id", "=", jobId)
      .executeTakeFirstOrThrow();
    expect(row.state).toBe("submitted");
    expect(row.providerReference).toBe(reference);
    expect(row.modelIdentifier).toBe("test/model");
    expect(row.submittedAt).not.toBeNull();
    expect(row.promptTemplateReleaseId).toBe("5a6c1c8e-2c1f-4c33-9a0e-0d2f7f1e0001");
    expect(row.modelReleaseId).toBe("7b2e9d54-4f7a-4e2a-8c3d-1e5b9a2c0001");
    // Product facts and the approved scene only — nothing the client sent.
    expect(row.promptText).toBe("Fronts Porcelain (matte lacquer), body Graphite. In a loft.");
    expect(row.estimatedCostCents).toBe(5);
    expect(adapter.submitted).toHaveLength(1);

    const job = await photoJobs.getJob({ ownerId, jobId });
    expect(job?.state).toBe("submitted");
    expect(job?.submittedAt).toBeInstanceOf(Date);
  });

  it("completes a job from a verified provider event and stores the photo", async () => {
    const { jobId, reference, photoJobs } = await submittedJob();

    const applied = await photoJobs.recordProviderEvent({
      eventId: `evt-${crypto.randomUUID()}`,
      providerReference: reference,
      status: "succeeded"
    });
    expect(applied).toEqual({ kind: "applied", jobId });

    const photo = await context.database
      .withSchema("app")
      .selectFrom("generatedPhoto")
      .select(["id", "storageKey", "width", "height", "contentType"])
      .where("photoJobId", "=", jobId)
      .executeTakeFirstOrThrow();
    expect(photo.width).toBe(1920);
    expect(photo.height).toBe(1080);
    // Dimensions come from probing the bytes, and the bytes are really stored.
    expect(objects.has(photo.storageKey)).toBe(true);

    const row = await context.database
      .withSchema("app")
      .selectFrom("photoJob")
      .select(["state", "completedAt", "terminalAt", "providerDurationMs"])
      .where("id", "=", jobId)
      .executeTakeFirstOrThrow();
    expect(row.state).toBe("succeeded");
    expect(row.completedAt).not.toBeNull();
    expect(row.terminalAt).not.toBeNull();
    expect(row.providerDurationMs).toBe(17_000);
  });

  it("refuses a Scene Preset the active release does not approve", async () => {
    const photoJobs = moduleWith(generatingAdapter);
    const { ownerId, projectId } = await seedProject();
    const result = await photoJobs.requestJob({
      ownerId,
      projectId,
      expectedVersion: 1,
      idempotencyKey: crypto.randomUUID(),
      scenePresetKey: "moon-base",
      capture: { contentType: "image/jpeg", byteSize: CAPTURE_BYTE_SIZE }
    });
    expect(result).toEqual({ kind: "unknown-preset" });
  });

  it("enforces the per-account quota at request time", async () => {
    const photoJobs = moduleWith(generatingAdapter, undefined, { customerDailyJobs: 1 });
    const { ownerId, projectId } = await seedProject();
    const request = () =>
      photoJobs.requestJob({
        ownerId,
        projectId,
        expectedVersion: 1,
        idempotencyKey: crypto.randomUUID(),
        scenePresetKey: "urban-loft",
        capture: { contentType: "image/jpeg", byteSize: CAPTURE_BYTE_SIZE }
      });
    expect((await request()).kind).toBe("requested");
    expect(await request()).toEqual({ kind: "quota-exceeded", retryAfterSeconds: 3600 });
  });

  it("stops submissions when the provider-wide budget is spent, leaving the job retryable", async () => {
    // The budget spans every account in the database, including jobs other
    // tests submitted in the last 24 h, so the ceiling is set relative to the
    // spend that already exists: room for exactly one more.
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const spent = await context.database
      .withSchema("app")
      .selectFrom("photoJob")
      .select((expression) =>
        expression.fn
          .coalesce(expression.fn.sum<number>("estimatedCostCents"), expression.val(0))
          .as("cents")
      )
      .where("submittedAt", ">=", since)
      .executeTakeFirstOrThrow();
    const adapter = fakeAdapter();
    const photoJobs = moduleWith(adapter, undefined, {
      providerDailyCents: Number(spent.cents) + 5,
      providerDailyJobs: 100_000
    });
    const first = await readyJob(photoJobs);
    const second = await readyJob(photoJobs);

    expect((await photoJobs.submitJob({ ownerId: first.ownerId, jobId: first.jobId })).kind).toBe(
      "submitted"
    );
    const refused = await photoJobs.submitJob({ ownerId: second.ownerId, jobId: second.jobId });
    expect(refused).toMatchObject({ kind: "budget-exceeded", retryAfterSeconds: 3600 });
    expect(adapter.submitted).toHaveLength(1);
    expect((await photoJobs.getJob({ ownerId: second.ownerId, jobId: second.jobId }))?.state).toBe(
      "capture-ready"
    );
  });

  it("ignores a redelivered event and acknowledges an unknown reference", async () => {
    const { jobId, reference, photoJobs } = await submittedJob();
    const eventId = `evt-${crypto.randomUUID()}`;

    await photoJobs.recordProviderEvent({ eventId, providerReference: reference, status: "processing" });
    const redelivered = await photoJobs.recordProviderEvent({
      eventId,
      providerReference: reference,
      status: "processing"
    });
    expect(redelivered).toEqual({ kind: "duplicate" });

    const unknown = await photoJobs.recordProviderEvent({
      eventId: `evt-${crypto.randomUUID()}`,
      providerReference: "pred_nobody",
      status: "succeeded"
    });
    expect(unknown).toEqual({ kind: "unknown-reference" });

    const row = await context.database
      .withSchema("app")
      .selectFrom("photoJob")
      .select("state")
      .where("id", "=", jobId)
      .executeTakeFirstOrThrow();
    expect(row.state).toBe("running");

    const events = await context.database
      .withSchema("app")
      .selectFrom("photoJobProviderEvent")
      .select(["photoJobId", "processedAt"])
      .where("eventId", "=", eventId)
      .execute();
    expect(events).toHaveLength(1);
    expect(events[0].photoJobId).toBe(jobId);
    expect(events[0].processedAt).not.toBeNull();
  });

  it("completes a job by reconciliation when no webhook ever arrives", async () => {
    const { ownerId, jobId, photoJobs } = await submittedJob();

    const reconciled = await photoJobs.reconcileJob({ ownerId, jobId });
    expect(reconciled.kind).toBe("succeeded");
    if (reconciled.kind !== "succeeded") return;
    expect(reconciled.job.generatedPhotoId).not.toBeNull();

    // A second read right away is throttled, not a second provider call.
    const again = await photoJobs.reconcileJob({ ownerId, jobId });
    expect(again.kind).toBe("unchanged");
  });

  it("never files two photos when a webhook and a reconciliation race", async () => {
    const { ownerId, jobId, reference, photoJobs } = await submittedJob();

    await Promise.all([
      photoJobs.recordProviderEvent({
        eventId: `evt-${crypto.randomUUID()}`,
        providerReference: reference,
        status: "succeeded"
      }),
      photoJobs.reconcileJob({ ownerId, jobId })
    ]);

    const photos = await context.database
      .withSchema("app")
      .selectFrom("generatedPhoto")
      .select("id")
      .where("photoJobId", "=", jobId)
      .execute();
    expect(photos).toHaveLength(1);
  });

  it("reports a stalled job uncertain, then fails it with a provider cancel", async () => {
    let now = new Date("2026-09-02T12:00:00.000Z");
    const adapter = fakeAdapter({
      async inspect() {
        return { kind: "pending", started: true };
      }
    });
    const { ownerId, jobId, reference, photoJobs } = await submittedJob(adapter, () => now);

    now = new Date(now.getTime() + 11 * 60 * 1000);
    const uncertain = await photoJobs.reconcileJob({ ownerId, jobId });
    expect(uncertain.kind).toBe("progressed");
    if (uncertain.kind !== "progressed") return;
    expect(uncertain.job.state).toBe("uncertain");

    now = new Date(now.getTime() + 20 * 60 * 1000);
    const failed = await photoJobs.reconcileJob({ ownerId, jobId });
    expect(failed.kind).toBe("failed");
    if (failed.kind !== "failed") return;
    expect(failed.job.failureReason).toBe("provider-timeout");
    expect(adapter.canceled).toEqual([reference]);
  });

  it("sweeps in-flight jobs across owners", async () => {
    const adapter = fakeAdapter();
    const first = await submittedJob(adapter);
    const second = await submittedJob(adapter);

    const swept = await first.photoJobs.sweepInFlightJobs({ limit: 50 });
    expect(swept.succeeded).toBeGreaterThanOrEqual(2);

    for (const { ownerId, jobId, photoJobs } of [first, second]) {
      expect((await photoJobs.getJob({ ownerId, jobId }))?.state).toBe("succeeded");
    }
  });

  it("does not submit a job whose capture is not confirmed", async () => {
    const photoJobs = moduleWith(generatingAdapter);
    const { ownerId, result } = await requestJob(photoJobs);
    if (result.kind !== "requested") throw new Error("setup failed");

    const submitted = await photoJobs.submitJob({ ownerId, jobId: result.job.id });
    expect(submitted.kind).toBe("not-runnable");
  });

  it("submits a job only once even when asked twice at the same time", async () => {
    const adapter = fakeAdapter();
    const photoJobs = moduleWith(adapter);
    const { ownerId, jobId } = await readyJob(photoJobs);

    const [first, second] = await Promise.all([
      photoJobs.submitJob({ ownerId, jobId }),
      photoJobs.submitJob({ ownerId, jobId })
    ]);
    expect([first.kind, second.kind].sort()).toEqual(["not-runnable", "submitted"]);
    expect(adapter.submitted).toHaveLength(1);
  });

  it("fails the job and writes no photo when the provider refuses the submission", async () => {
    const refusing = fakeAdapter({
      async submit() {
        return { kind: "failed", reason: "provider-disabled", retryable: false };
      }
    });
    const photoJobs = moduleWith(refusing);
    const { ownerId, jobId } = await readyJob(photoJobs);

    const submitted = await photoJobs.submitJob({ ownerId, jobId });
    expect(submitted.kind).toBe("failed");
    if (submitted.kind !== "failed") return;
    expect(submitted.reason).toBe("provider-disabled");

    const photos = await context.database
      .withSchema("app")
      .selectFrom("generatedPhoto")
      .select("id")
      .where("photoJobId", "=", jobId)
      .execute();
    expect(photos).toHaveLength(0);
  });

  it("rejects provider output that is not a decodable image", async () => {
    const garbage = fakeAdapter({
      async inspect(providerReference) {
        return {
          kind: "generated",
          bytes: new TextEncoder().encode("provider returned prose"),
          declaredContentType: "image/jpeg",
          modelIdentifier: "test/model",
          providerReference,
          durationMs: null
        };
      }
    });
    const { ownerId, jobId, photoJobs } = await submittedJob(garbage);

    const reconciled = await photoJobs.reconcileJob({ ownerId, jobId });
    expect(reconciled.kind).toBe("failed");
    if (reconciled.kind !== "failed") return;
    expect(reconciled.job.failureReason).toBe("output-not-an-image");
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

  it("cancels a submitted job at the provider on a best-effort basis", async () => {
    const { ownerId, jobId, reference, adapter, photoJobs } = await submittedJob();

    const canceled = await photoJobs.cancelJob({ ownerId, jobId });
    expect(canceled.kind).toBe("canceled");
    expect(adapter.canceled).toEqual([reference]);

    // A late success event cannot resurrect a canceled job.
    await photoJobs.recordProviderEvent({
      eventId: `evt-${crypto.randomUUID()}`,
      providerReference: reference,
      status: "succeeded"
    });
    expect((await photoJobs.getJob({ ownerId, jobId }))?.state).toBe("canceled");
  });
});
