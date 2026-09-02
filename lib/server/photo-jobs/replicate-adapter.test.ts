import { createHmac, randomBytes } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  classifyProviderError,
  createReplicatePhotoGenerationAdapter,
  type ReplicateAdapterDependencies
} from "@/lib/server/photo-jobs/replicate-adapter";

type Prediction = { id: string; status: string; output?: unknown; error?: unknown };
type CreateOptions = { input: Record<string, unknown>; webhook?: string; webhook_events_filter?: string[] };

const REQUEST = {
  captureContentType: "image/jpeg" as const,
  captureUrl: "https://storage.example/captures/abc.jpg?X-Amz-Signature=sig",
  prompt: "A kitchen",
  aspectRatio: "16:9" as const,
  webhookUrl: "https://app.example/api/webhooks/replicate"
};

function apiError(status: number, body = "provider says no") {
  const error = new Error(
    `Request to https://api.replicate.com/v1/predictions failed with status ${status}: ${body}.`
  );
  error.name = "ApiError";
  return Object.assign(error, { response: new Response(body, { status }) });
}

function createDependencies(
  predictions: Partial<{
    create: (options: CreateOptions) => Promise<Prediction>;
    get: (id: string) => Promise<Prediction>;
    cancel: (id: string) => Promise<Prediction>;
  }>,
  overrides: Partial<ReplicateAdapterDependencies> = {}
): ReplicateAdapterDependencies {
  return {
    client: {
      predictions: {
        create: predictions.create ?? (async () => ({ id: "pred_1", status: "starting" })),
        get: predictions.get ?? (async (id: string) => ({ id, status: "starting" })),
        cancel: predictions.cancel ?? (async (id: string) => ({ id, status: "canceled" }))
      } as never
    },
    fetch: (async () =>
      new Response(new Uint8Array([9, 9, 9]), {
        status: 200,
        headers: { "content-type": "image/png" }
      })) as typeof fetch,
    ...overrides
  };
}

const SECRET_BYTES = randomBytes(24);
const WEBHOOK_SECRET = `whsec_${SECRET_BYTES.toString("base64")}`;

function signedDelivery(body: string, secret = SECRET_BYTES, id = "msg_1") {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = createHmac("sha256", secret)
    .update(`${id}.${timestamp}.${body}`)
    .digest("base64");
  return new Request("https://app.example/api/webhooks/replicate", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "webhook-id": id,
      "webhook-timestamp": timestamp,
      "webhook-signature": `v1,${signature}`
    },
    body
  });
}

describe("Replicate photo generation adapter", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("submits the presigned capture URL with the webhook and returns the reference", async () => {
    let received: CreateOptions | null = null;
    const adapter = createReplicatePhotoGenerationAdapter(
      "token",
      createDependencies({
        create: async (options) => {
          received = options;
          return { id: "pred_42", status: "starting" };
        }
      })
    );

    const outcome = await adapter.submit(REQUEST);

    expect(outcome).toEqual({
      kind: "submitted",
      providerReference: "pred_42",
      modelIdentifier: "qwen/qwen-image-2-pro"
    });
    expect(received!.input.image).toBe(REQUEST.captureUrl);
    expect(received!.webhook).toBe(REQUEST.webhookUrl);
    expect(received!.webhook_events_filter).toEqual(["start", "completed"]);
  });

  it("submits without a webhook when none is configured, falling back to a named File", async () => {
    let received: CreateOptions | null = null;
    const adapter = createReplicatePhotoGenerationAdapter(
      "token",
      createDependencies({
        create: async (options) => {
          received = options;
          return { id: "pred_43", status: "starting" };
        }
      })
    );

    await adapter.submit({
      ...REQUEST,
      captureUrl: null,
      capture: new Uint8Array([0xff, 0xd8, 0xff, 0xe0]),
      webhookUrl: null
    });

    expect(received!.webhook).toBeUndefined();
    expect(received!.input.image).toBeInstanceOf(File);
    expect((received!.input.image as File).name).toBe("capture.jpg");
  });

  it("refuses to submit with neither a capture URL nor bytes", async () => {
    const adapter = createReplicatePhotoGenerationAdapter("token", createDependencies({}));
    const outcome = await adapter.submit({ ...REQUEST, captureUrl: null });
    expect(outcome).toMatchObject({ kind: "failed", reason: "capture-unavailable" });
  });

  it("maps HTTP rejections to distinct, honest reason codes", async () => {
    expect(classifyProviderError(apiError(401))).toMatchObject({
      reason: "provider-unauthorized",
      retryable: false
    });
    expect(classifyProviderError(apiError(402))).toMatchObject({
      reason: "provider-billing",
      retryable: false
    });
    expect(classifyProviderError(apiError(422))).toMatchObject({
      reason: "provider-rejected-input",
      retryable: false
    });
    expect(classifyProviderError(apiError(503))).toMatchObject({
      reason: "provider-error",
      retryable: true
    });

    const adapter = createReplicatePhotoGenerationAdapter(
      "token",
      createDependencies({
        create: async () => {
          throw apiError(429);
        }
      })
    );
    expect(await adapter.submit(REQUEST)).toMatchObject({
      kind: "failed",
      reason: "provider-rate-limited",
      retryable: true
    });
  });

  it("reads the provider's view back as pending, canceled, failed or generated", async () => {
    const states: Record<string, Prediction> = {
      a: { id: "a", status: "starting" },
      b: { id: "b", status: "processing" },
      c: { id: "c", status: "canceled" },
      d: { id: "d", status: "failed", error: "NSFW content detected" },
      e: { id: "e", status: "succeeded", output: ["https://replicate.delivery/out.png"] },
      f: { id: "f", status: "succeeded", output: null }
    };
    const adapter = createReplicatePhotoGenerationAdapter(
      "token",
      createDependencies({ get: async (id) => states[id] })
    );

    expect(await adapter.inspect("a")).toEqual({ kind: "pending", started: false });
    expect(await adapter.inspect("b")).toEqual({ kind: "pending", started: true });
    expect(await adapter.inspect("c")).toEqual({ kind: "canceled" });
    expect(await adapter.inspect("d")).toMatchObject({
      kind: "failed",
      reason: "provider-prediction-failed",
      providerReference: "d"
    });
    expect(await adapter.inspect("f")).toMatchObject({ kind: "failed", reason: "provider-no-output" });

    const generated = await adapter.inspect("e");
    expect(generated.kind).toBe("generated");
    if (generated.kind !== "generated") return;
    expect(Array.from(generated.bytes)).toEqual([9, 9, 9]);
    expect(generated.declaredContentType).toBe("image/png");
    expect(generated.providerReference).toBe("e");
  });

  it("reports a reference the provider no longer knows as unknown", async () => {
    const adapter = createReplicatePhotoGenerationAdapter(
      "token",
      createDependencies({
        get: async () => {
          throw apiError(404, "not found");
        }
      })
    );
    expect(await adapter.inspect("gone")).toEqual({ kind: "unknown" });
  });

  it("cancels on a best-effort basis and swallows provider errors", async () => {
    const canceled: string[] = [];
    const adapter = createReplicatePhotoGenerationAdapter(
      "token",
      createDependencies({
        cancel: async (id) => {
          canceled.push(id);
          throw apiError(500);
        }
      })
    );
    await expect(adapter.cancel("pred_9")).resolves.toBeUndefined();
    expect(canceled).toEqual(["pred_9"]);
  });

  it("accepts a correctly signed webhook and normalises it", async () => {
    const adapter = createReplicatePhotoGenerationAdapter(
      "token",
      createDependencies({}, { webhookSecret: WEBHOOK_SECRET })
    );
    const body = JSON.stringify({ id: "pred_77", status: "succeeded", output: ["x"] });

    const event = await adapter.parseWebhook(signedDelivery(body));

    expect(event).toEqual({ eventId: "msg_1", providerReference: "pred_77", status: "succeeded" });
  });

  it("refuses a webhook with a wrong signature, an unknown status, or no secret", async () => {
    const adapter = createReplicatePhotoGenerationAdapter(
      "token",
      createDependencies({}, { webhookSecret: WEBHOOK_SECRET })
    );
    const body = JSON.stringify({ id: "pred_77", status: "succeeded" });

    expect(await adapter.parseWebhook(signedDelivery(body, randomBytes(24)))).toBeNull();
    expect(
      await adapter.parseWebhook(signedDelivery(JSON.stringify({ id: "pred_77", status: "weird" })))
    ).toBeNull();

    const unconfigured = createReplicatePhotoGenerationAdapter("token", createDependencies({}));
    expect(await unconfigured.parseWebhook(signedDelivery(body))).toBeNull();
  });
});
