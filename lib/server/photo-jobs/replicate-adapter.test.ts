import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  classifyProviderError,
  createReplicatePhotoGenerationAdapter,
  type ReplicateAdapterDependencies
} from "@/lib/server/photo-jobs/replicate-adapter";

type RunOptions = { input: Record<string, unknown>; signal?: AbortSignal };
type Progress = (prediction: { id: string; status: string }) => void;

const REQUEST = {
  capture: new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]),
  captureContentType: "image/jpeg" as const,
  captureUrl: null,
  prompt: "A kitchen",
  aspectRatio: "16:9" as const
};

function apiError(status: number, body = "provider says no") {
  const error = new Error(
    `Request to https://api.replicate.com/v1/predictions failed with status ${status}: ${body}.`
  );
  error.name = "ApiError";
  return Object.assign(error, { response: new Response(body, { status }) });
}

function createDependencies(
  run: (options: RunOptions, progress?: Progress) => Promise<unknown>,
  overrides: Partial<ReplicateAdapterDependencies> = {}
): ReplicateAdapterDependencies {
  return {
    client: {
      run: ((_model: string, options: RunOptions, progress?: Progress) =>
        run(options, progress)) as never
    },
    fetch: (async () =>
      new Response(new Uint8Array([9, 9, 9]), {
        status: 200,
        headers: { "content-type": "image/png" }
      })) as typeof fetch,
    ...overrides
  };
}

describe("Replicate photo generation adapter", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("passes the presigned capture URL to the model when one is granted", async () => {
    let received: unknown;
    const adapter = createReplicatePhotoGenerationAdapter(
      "token",
      createDependencies(async (options) => {
        received = options.input.image;
        return ["https://replicate.delivery/out.png"];
      })
    );

    const outcome = await adapter.generate({
      ...REQUEST,
      captureUrl: "https://storage.example/captures/abc.jpg?X-Amz-Signature=sig"
    });

    expect(received).toBe(
      "https://storage.example/captures/abc.jpg?X-Amz-Signature=sig"
    );
    expect(outcome.kind).toBe("generated");
  });

  it("falls back to a named, typed File when no capture URL exists", async () => {
    let received: unknown;
    const adapter = createReplicatePhotoGenerationAdapter(
      "token",
      createDependencies(async (options, progress) => {
        received = options.input.image;
        progress?.({ id: "pred_123", status: "starting" });
        return ["https://replicate.delivery/out.png"];
      })
    );

    const outcome = await adapter.generate(REQUEST);

    expect(received).toBeInstanceOf(File);
    const blob = received as File;
    // The model reads the format off the extension of the uploaded file's URL.
    expect(blob.name).toBe("capture.jpg");
    expect(blob.type).toBe("image/jpeg");
    expect(blob.size).toBe(REQUEST.capture.byteLength);
    expect(new Uint8Array(await blob.arrayBuffer())).toEqual(REQUEST.capture);

    expect(outcome.kind).toBe("generated");
    if (outcome.kind !== "generated") return;
    expect(outcome.providerReference).toBe("pred_123");
    expect(outcome.declaredContentType).toBe("image/png");
    expect(Array.from(outcome.bytes)).toEqual([9, 9, 9]);
  });

  it("keeps the prediction id when the run fails after it was issued", async () => {
    const adapter = createReplicatePhotoGenerationAdapter(
      "token",
      createDependencies(async (_options, progress) => {
        progress?.({ id: "pred_456", status: "processing" });
        throw new Error("Prediction failed: content flagged");
      })
    );

    const outcome = await adapter.generate(REQUEST);

    expect(outcome).toMatchObject({
      kind: "failed",
      reason: "provider-prediction-failed",
      providerReference: "pred_456"
    });
  });

  it("maps HTTP rejections to distinct, honest reason codes", () => {
    expect(classifyProviderError(apiError(401))).toMatchObject({
      reason: "provider-unauthorized",
      retryable: false
    });
    expect(classifyProviderError(apiError(402))).toMatchObject({
      reason: "provider-billing",
      retryable: false
    });
    expect(classifyProviderError(apiError(422, "image is invalid"))).toMatchObject(
      { reason: "provider-rejected-input", retryable: false }
    );
    expect(classifyProviderError(apiError(413))).toMatchObject({
      reason: "provider-rejected-input"
    });
    expect(classifyProviderError(apiError(429))).toMatchObject({
      reason: "provider-rate-limited",
      retryable: true
    });
    expect(classifyProviderError(apiError(503))).toMatchObject({
      reason: "provider-error",
      retryable: true
    });
    expect(classifyProviderError(new Error("socket hang up"))).toMatchObject({
      reason: "provider-error",
      retryable: true
    });
  });

  it("carries the provider status and message in the detail, truncated", () => {
    const failure = classifyProviderError(apiError(422, "x".repeat(2000)));
    expect(failure.detail.startsWith("HTTP 422: ")).toBe(true);
    expect(failure.detail.length).toBeLessThan(700);
  });

  it("reports a canceled slow prediction as a timeout, not as missing output", async () => {
    const adapter = createReplicatePhotoGenerationAdapter(
      "token",
      createDependencies(
        (options) =>
          new Promise((resolve) => {
            // Mirrors the SDK: once the signal lapses it stops polling, cancels
            // the prediction and resolves with whatever output exists — none.
            options.signal?.addEventListener("abort", () => resolve(null));
          }),
        { generateTimeoutMs: 20, generateHardTimeoutMs: 500 }
      )
    );

    const outcome = await adapter.generate(REQUEST);

    expect(outcome).toMatchObject({ kind: "failed", reason: "provider-timeout" });
  });

  it("gives up when the provider ignores the cancellation", async () => {
    const adapter = createReplicatePhotoGenerationAdapter(
      "token",
      createDependencies(() => new Promise(() => {}), {
        generateTimeoutMs: 10,
        generateHardTimeoutMs: 30
      })
    );

    const outcome = await adapter.generate(REQUEST);

    expect(outcome).toMatchObject({
      kind: "failed",
      reason: "provider-timeout",
      retryable: true
    });
  });

  it("reports an unreachable delivery URL with its status", async () => {
    const adapter = createReplicatePhotoGenerationAdapter(
      "token",
      createDependencies(async () => "https://replicate.delivery/gone.png", {
        fetch: (async () => new Response("", { status: 404 })) as typeof fetch
      })
    );

    const outcome = await adapter.generate(REQUEST);

    expect(outcome).toMatchObject({
      kind: "failed",
      reason: "provider-output-unreachable",
      detail: "HTTP 404 while fetching the output"
    });
  });
});
