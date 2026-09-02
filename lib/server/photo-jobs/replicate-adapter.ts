import "server-only";

import Replicate, { type Prediction } from "replicate";
import type {
  PhotoGenerationAdapter,
  PhotoGenerationOutcome,
  PhotoGenerationRequest
} from "@/features/photo-jobs/photo-generation-adapter";

/**
 * Replicate under the scoped ADR 0008 exception. Everything provider-shaped —
 * SDK types, prediction identifiers, delivery URLs, HTTP statuses — stops here.
 * The prediction id crosses the seam only as the opaque `providerReference`
 * evidence string; failure `detail` is logged for operators and never persisted.
 *
 * This calls `run()` synchronously. ADR 0008 requires predictions plus webhook
 * so a job survives browser closure; that is PLAN.md Phase 3 and replaces this
 * adapter's internals without changing the Interface.
 */
const MODEL = "qwen/qwen-image-2-pro";

/**
 * Cooperative bound. The SDK cancels the prediction at the provider when the
 * signal lapses, so a slow run stops spending instead of finishing unobserved.
 */
const GENERATE_TIMEOUT_MS = 90_000;
/** Hard bound in case the provider ignores the cancellation entirely. */
const GENERATE_HARD_TIMEOUT_MS = GENERATE_TIMEOUT_MS + 30_000;
const DOWNLOAD_TIMEOUT_MS = 30_000;
/** Provider error bodies can be long; the log line does not need all of it. */
const DETAIL_MAX_CHARS = 600;

type ReplicateClient = Pick<Replicate, "run">;

export type ReplicateAdapterDependencies = {
  client?: ReplicateClient;
  fetch?: typeof fetch;
  generateTimeoutMs?: number;
  generateHardTimeoutMs?: number;
  downloadTimeoutMs?: number;
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
 * The SDK uploads any Blob input through the provider's Files API and passes
 * the resulting URL to the model. A base64 data URI would inflate a 1.5 MB
 * capture to ~2 MB inside the prediction body and was the leading suspect for
 * opaque provider rejections.
 */
function toBlob(bytes: Uint8Array, type: string) {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return new Blob([copy], { type });
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

export function createReplicatePhotoGenerationAdapter(
  token: string,
  dependencies: ReplicateAdapterDependencies = {}
): PhotoGenerationAdapter {
  const client: ReplicateClient =
    dependencies.client ?? new Replicate({ auth: token });
  const fetchImpl = dependencies.fetch ?? fetch;
  const generateTimeoutMs = dependencies.generateTimeoutMs ?? GENERATE_TIMEOUT_MS;
  const generateHardTimeoutMs =
    dependencies.generateHardTimeoutMs ?? GENERATE_HARD_TIMEOUT_MS;
  const downloadTimeoutMs = dependencies.downloadTimeoutMs ?? DOWNLOAD_TIMEOUT_MS;

  return {
    async generate(
      request: PhotoGenerationRequest
    ): Promise<PhotoGenerationOutcome> {
      const trace: { predictionId: string | null } = { predictionId: null };

      function failed(
        reason: string,
        retryable: boolean,
        detail: string
      ): PhotoGenerationOutcome {
        console.error("Photo generation failed", {
          reason,
          retryable,
          model: MODEL,
          predictionId: trace.predictionId,
          detail
        });
        return {
          kind: "failed",
          reason,
          retryable,
          providerReference: trace.predictionId,
          detail
        };
      }

      const signal = AbortSignal.timeout(generateTimeoutMs);

      try {
        const output = await withTimeout(
          client.run(
            MODEL,
            {
              input: {
                image: toBlob(request.capture, request.captureContentType),
                prompt: request.prompt,
                aspect_ratio: request.aspectRatio,
                negative_prompt: "",
                match_input_image: false,
                enable_prompt_expansion: true
              },
              signal
            },
            (prediction: Prediction) => {
              if (prediction.id) trace.predictionId = prediction.id;
            }
          ),
          generateHardTimeoutMs,
          "Provider generation"
        );

        if (signal.aborted) {
          return failed(
            "provider-timeout",
            true,
            `Prediction canceled after ${generateTimeoutMs} ms`
          );
        }

        const outputUrl = extractOutputUrl(output);
        if (!outputUrl) {
          return failed(
            "provider-no-output",
            true,
            "Prediction finished without an output URL"
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
            `HTTP ${response.status} while fetching the output`
          );
        }

        return {
          kind: "generated",
          bytes: new Uint8Array(await response.arrayBuffer()),
          declaredContentType:
            response.headers.get("content-type") ?? "application/octet-stream",
          modelIdentifier: MODEL,
          providerReference: trace.predictionId
        };
      } catch (error) {
        const failure = classifyProviderError(error);
        return failed(failure.reason, failure.retryable, failure.detail);
      }
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
    async generate(): Promise<PhotoGenerationOutcome> {
      return { kind: "failed", reason, retryable: false };
    }
  };
}
