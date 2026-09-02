import "server-only";

import Replicate, { validateWebhook } from "replicate";
import type {
  InspectPhotoGenerationOutcome,
  PhotoGenerationAdapter,
  PhotoGenerationFailure,
  PhotoGenerationRequest,
  ProviderEvent,
  ProviderEventStatus,
  SubmitPhotoGenerationOutcome
} from "@/features/photo-jobs/photo-generation-adapter";

/**
 * Replicate under the scoped ADR 0008 exception. Everything provider-shaped —
 * SDK types, prediction identifiers, delivery URLs, HTTP statuses, webhook
 * payloads — stops here. The prediction id crosses the seam only as the opaque
 * `providerReference`; failure `detail` is logged for operators and never
 * persisted.
 *
 * Predictions plus webhook (PLAN.md Phase 3): `submit` creates a prediction
 * and returns; `inspect` reads it back and downloads the output once it has
 * succeeded; `parseWebhook` verifies a delivery with the account's signing
 * secret.
 */
const MODEL = "qwen/qwen-image-2-pro";
const DOWNLOAD_TIMEOUT_MS = 30_000;
/** Provider error bodies can be long; the log line does not need all of it. */
const DETAIL_MAX_CHARS = 600;

type ReplicateClient = {
  predictions: Pick<Replicate["predictions"], "create" | "get" | "cancel">;
};

export type ReplicateAdapterDependencies = {
  client?: ReplicateClient;
  fetch?: typeof fetch;
  downloadTimeoutMs?: number;
  /** From the account's default webhook; without it every delivery is refused. */
  webhookSecret?: string | null;
};

type ProviderFailure = { reason: string; retryable: boolean; detail: string };

function withTimeout<T>(promise: Promise<T>, ms: number, label: string) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${label} timed out`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId);
  });
}

function truncate(text: string) {
  return text.length > DETAIL_MAX_CHARS
    ? `${text.slice(0, DETAIL_MAX_CHARS)}…`
    : text;
}

export function extractOutputUrl(output: unknown): string | null {
  const candidate = Array.isArray(output) ? output[0] : output;
  if (typeof candidate === "string") return candidate;

  if (candidate && typeof candidate === "object" && "url" in candidate) {
    const url = (candidate as { url: unknown }).url;
    if (typeof url === "function") {
      const result = url.call(candidate);
      if (result instanceof URL) return result.href;
      if (typeof result === "string") return result;
    }
    if (typeof url === "string") return url;
  }
  return null;
}

/**
 * Fallback when no presigned capture URL is available: the SDK uploads a File
 * through the provider's Files API and passes that URL to the model. Live runs
 * showed this model cannot use such URLs — it hands them to a downstream
 * service that fetches without credentials, receives the Files API's JSON 401,
 * and fails with "Invalid image format ''" (predictions k449ce4yphrmt0d0cc89v8msqw,
 * 500438hh8nrmr0d0ccaryy52mm). The presigned URL from the application's own
 * storage is therefore the primary path; this keeps the seam usable without it.
 */
function toFile(bytes: Uint8Array, type: "image/jpeg" | "image/png") {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return new File([copy], type === "image/png" ? "capture.png" : "capture.jpg", {
    type
  });
}

/** The SDK's ApiError is not exported as a class, so it is recognised by shape. */
function isApiError(error: unknown): error is Error & { response: Response } {
  if (!(error instanceof Error) || error.name !== "ApiError") return false;
  const response = (error as { response?: unknown }).response;
  return (
    typeof response === "object" &&
    response !== null &&
    typeof (response as { status?: unknown }).status === "number"
  );
}

/**
 * Turns whatever the SDK throws into a stable, customer-safe reason code plus an
 * operator-facing detail line. The codes are the only part that leaves the
 * adapter; the detail is for logs.
 */
export function classifyProviderError(error: unknown): ProviderFailure {
  if (isApiError(error)) {
    const status = error.response.status;
    const detail = truncate(`HTTP ${status}: ${error.message}`);
    if (status === 401 || status === 403) {
      return { reason: "provider-unauthorized", retryable: false, detail };
    }
    if (status === 402) {
      return { reason: "provider-billing", retryable: false, detail };
    }
    if (status === 413 || status === 422) {
      return { reason: "provider-rejected-input", retryable: false, detail };
    }
    if (status === 429) {
      return { reason: "provider-rate-limited", retryable: true, detail };
    }
    return { reason: "provider-error", retryable: status >= 500, detail };
  }

  const message = error instanceof Error ? error.message : String(error);
  const detail = truncate(message);
  if (message.startsWith("Prediction failed:")) {
    return { reason: "provider-prediction-failed", retryable: true, detail };
  }
  if (
    (error instanceof Error &&
      (error.name === "TimeoutError" || error.name === "AbortError")) ||
    message.toLowerCase().includes("timed out")
  ) {
    return { reason: "provider-timeout", retryable: true, detail };
  }
  return { reason: "provider-error", retryable: true, detail };
}

const EVENT_STATUSES: readonly ProviderEventStatus[] = [
  "starting",
  "processing",
  "succeeded",
  "failed",
  "canceled"
];

function toEventStatus(value: unknown): ProviderEventStatus | null {
  return typeof value === "string" && (EVENT_STATUSES as string[]).includes(value)
    ? (value as ProviderEventStatus)
    : null;
}

export function createReplicatePhotoGenerationAdapter(
  token: string,
  dependencies: ReplicateAdapterDependencies = {}
): PhotoGenerationAdapter {
  const client: ReplicateClient =
    dependencies.client ?? new Replicate({ auth: token });
  const fetchImpl = dependencies.fetch ?? fetch;
  const downloadTimeoutMs = dependencies.downloadTimeoutMs ?? DOWNLOAD_TIMEOUT_MS;
  const webhookSecret = dependencies.webhookSecret?.trim() || null;

  function failed(
    reason: string,
    retryable: boolean,
    detail: string,
    providerReference: string | null = null
  ): PhotoGenerationFailure {
    console.error("Photo generation failed", {
      reason,
      retryable,
      model: MODEL,
      predictionId: providerReference,
      detail
    });
    return { kind: "failed", reason, retryable, providerReference, detail };
  }

  return {
    async submit(request: PhotoGenerationRequest): Promise<SubmitPhotoGenerationOutcome> {
      const image =
        request.captureUrl ??
        (request.capture ? toFile(request.capture, request.captureContentType) : null);
      if (!image) {
        return failed("capture-unavailable", false, "Neither a capture URL nor bytes were given");
      }

      try {
        const prediction = await client.predictions.create({
          model: MODEL,
          input: {
            image,
            prompt: request.prompt,
            aspect_ratio: request.aspectRatio,
            negative_prompt: "",
            match_input_image: false,
            enable_prompt_expansion: true
          },
          ...(request.webhookUrl
            ? {
                webhook: request.webhookUrl,
                webhook_events_filter: ["start", "completed"] as const
              }
            : {})
        });
        if (!prediction.id) {
          return failed("provider-error", true, "Prediction created without an id");
        }
        return {
          kind: "submitted",
          providerReference: prediction.id,
          modelIdentifier: MODEL
        };
      } catch (error) {
        const failure = classifyProviderError(error);
        return failed(failure.reason, failure.retryable, failure.detail);
      }
    },

    async inspect(providerReference: string): Promise<InspectPhotoGenerationOutcome> {
      try {
        const prediction = await client.predictions.get(providerReference);
        switch (prediction.status) {
          case "starting":
            return { kind: "pending", started: false };
          case "processing":
            return { kind: "pending", started: true };
          case "canceled":
            return { kind: "canceled" };
          case "failed": {
            const failure = classifyProviderError(
              new Error(`Prediction failed: ${String(prediction.error ?? "unknown")}`)
            );
            return failed(failure.reason, failure.retryable, failure.detail, providerReference);
          }
          case "succeeded":
            break;
          default:
            return { kind: "pending", started: false };
        }

        const outputUrl = extractOutputUrl(prediction.output);
        if (!outputUrl) {
          return failed(
            "provider-no-output",
            true,
            "Prediction succeeded without an output URL",
            providerReference
          );
        }

        // Provider delivery URLs expire within the hour, so the bytes are pulled
        // now and handed to the module for validation and EU persistence. The
        // URL itself never leaves this adapter.
        const response = await withTimeout(
          fetchImpl(outputUrl),
          downloadTimeoutMs,
          "Output download"
        );
        if (!response.ok) {
          return failed(
            "provider-output-unreachable",
            true,
            `HTTP ${response.status} while fetching the output`,
            providerReference
          );
        }

        return {
          kind: "generated",
          bytes: new Uint8Array(await response.arrayBuffer()),
          declaredContentType:
            response.headers.get("content-type") ?? "application/octet-stream",
          modelIdentifier: MODEL,
          providerReference
        };
      } catch (error) {
        if (isApiError(error) && error.response.status === 404) {
          return { kind: "unknown" };
        }
        const failure = classifyProviderError(error);
        return failed(failure.reason, failure.retryable, failure.detail, providerReference);
      }
    },

    async cancel(providerReference: string) {
      try {
        await client.predictions.cancel(providerReference);
      } catch (error) {
        // Best effort by contract; reconciliation reads the real outcome later.
        console.warn("Photo generation cancel failed", {
          predictionId: providerReference,
          detail: truncate(error instanceof Error ? error.message : String(error))
        });
      }
    },

    async parseWebhook(request: Request): Promise<ProviderEvent | null> {
      if (!webhookSecret) {
        console.error("Photo webhook refused: no signing secret configured");
        return null;
      }
      const id = request.headers.get("webhook-id");
      const timestamp = request.headers.get("webhook-timestamp");
      const signature = request.headers.get("webhook-signature");
      if (!id || !timestamp || !signature) {
        console.warn("Photo webhook refused: signature headers missing");
        return null;
      }
      const body = await request.text();
      let valid = false;
      try {
        valid = await validateWebhook({ id, timestamp, signature, body, secret: webhookSecret });
      } catch (error) {
        console.warn("Photo webhook signature could not be checked", {
          detail: truncate(error instanceof Error ? error.message : String(error))
        });
        return null;
      }
      if (!valid) {
        console.warn("Photo webhook refused: signature mismatch");
        return null;
      }

      const eventId = id;
      let payload: { id?: unknown; status?: unknown };
      try {
        payload = JSON.parse(body) as { id?: unknown; status?: unknown };
      } catch {
        return null;
      }
      const status = toEventStatus(payload.status);
      if (!eventId || typeof payload.id !== "string" || !payload.id || !status) {
        return null;
      }
      return { eventId, providerReference: payload.id, status };
    }
  };
}

/**
 * Stands in when no provider is configured, so the module and its routes stay
 * usable — and fail honestly — rather than throwing at import time.
 */
export function createUnavailablePhotoGenerationAdapter(
  reason: string
): PhotoGenerationAdapter {
  return {
    async submit(): Promise<SubmitPhotoGenerationOutcome> {
      return { kind: "failed", reason, retryable: false };
    },
    async inspect(): Promise<InspectPhotoGenerationOutcome> {
      return { kind: "failed", reason, retryable: false };
    },
    async cancel() {},
    async parseWebhook() {
      return null;
    }
  };
}
