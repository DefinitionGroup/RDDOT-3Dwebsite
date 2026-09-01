import "server-only";

import Replicate from "replicate";
import type {
  PhotoGenerationAdapter,
  PhotoGenerationOutcome,
  PhotoGenerationRequest
} from "@/features/photo-jobs/photo-generation-adapter";

/**
 * Replicate under the scoped ADR 0008 exception. Everything provider-shaped —
 * SDK types, prediction identifiers, delivery URLs — stops here.
 *
 * This calls `run()` synchronously. ADR 0008 requires predictions plus webhook
 * so a job survives browser closure; that is PLAN.md Phase 3 and replaces this
 * adapter's internals without changing the Interface.
 */
const MODEL = "qwen/qwen-image-2-pro";
const GENERATE_TIMEOUT_MS = 90_000;
const DOWNLOAD_TIMEOUT_MS = 30_000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${label} timed out`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId);
  });
}

function extractOutputUrl(output: unknown): string | null {
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

function toDataUri(bytes: Uint8Array, contentType: string) {
  return `data:${contentType};base64,${Buffer.from(bytes).toString("base64")}`;
}

export function createReplicatePhotoGenerationAdapter(
  token: string
): PhotoGenerationAdapter {
  const replicate = new Replicate({ auth: token });

  return {
    async generate(
      request: PhotoGenerationRequest
    ): Promise<PhotoGenerationOutcome> {
      try {
        const output = await withTimeout(
          replicate.run(MODEL, {
            input: {
              image: toDataUri(request.capture, request.captureContentType),
              prompt: request.prompt,
              aspect_ratio: request.aspectRatio,
              negative_prompt: "",
              match_input_image: false,
              enable_prompt_expansion: true
            }
          }),
          GENERATE_TIMEOUT_MS,
          "Provider generation"
        );

        const outputUrl = extractOutputUrl(output);
        if (!outputUrl) {
          return { kind: "failed", reason: "provider-no-output", retryable: true };
        }

        // Provider delivery URLs expire within the hour, so the bytes are pulled
        // now and handed to the module for validation and EU persistence. The
        // URL itself never leaves this adapter.
        const response = await withTimeout(
          fetch(outputUrl),
          DOWNLOAD_TIMEOUT_MS,
          "Output download"
        );
        if (!response.ok) {
          return {
            kind: "failed",
            reason: "provider-output-unreachable",
            retryable: true
          };
        }

        return {
          kind: "generated",
          bytes: new Uint8Array(await response.arrayBuffer()),
          declaredContentType:
            response.headers.get("content-type") ?? "application/octet-stream",
          modelIdentifier: MODEL,
          providerReference: null
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const timedOut = message.toLowerCase().includes("timed out");
        console.error("Photo generation adapter failed:", message);
        return {
          kind: "failed",
          reason: timedOut ? "provider-timeout" : "provider-error",
          retryable: true
        };
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
