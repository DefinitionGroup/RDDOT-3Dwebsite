import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildPhotoPrompt,
  findPhotoPreset
} from "@/features/configurator/photo/photo-presets";
import {
  findFinish,
  RDTD_KITCHEN_PRODUCT_V2
} from "@/features/configurator/product-definition";
import { probeImage } from "@/features/photo-jobs/image-probe";
import { createReplicatePhotoGenerationAdapter } from "@/lib/server/photo-jobs/replicate-adapter";

if (!process.env.REPLICATE_API_TOKEN && existsSync(".env.local")) {
  process.loadEnvFile(".env.local");
}

/**
 * Spends one real provider credit, so it runs only when asked for by name:
 *
 *   REPLICATE_LIVE_TEST=1 REPLICATE_LIVE_CAPTURE=/path/to/capture.jpg \
 *     pnpm exec vitest run tests/integration/replicate-live.test.ts
 *
 * The capture should be a real Source Capture (a 16:9 JPEG of the rendered
 * scene), because the point is to exercise the adapter exactly as the Photo
 * Job Module does — Blob upload, prompt, timeout, error mapping — not to
 * produce a picture. `REPLICATE_LIVE_OUTPUT` saves the result for inspection.
 * The module-level kill switch (`PHOTO_GENERATION_ENABLED`) is deliberately not
 * consulted here: this test is its own explicit switch.
 */
const token = process.env.REPLICATE_API_TOKEN?.trim();
const capturePath = process.env.REPLICATE_LIVE_CAPTURE;
const armed =
  process.env.REPLICATE_LIVE_TEST === "1" &&
  Boolean(token) &&
  Boolean(capturePath && existsSync(capturePath));

describe.skipIf(!armed)("Replicate adapter (live, spends one credit)", () => {
  it(
    "generates a photo from a real Source Capture through the Blob upload path",
    async () => {
      const capture = new Uint8Array(readFileSync(capturePath!));
      const probedCapture = probeImage(capture);
      expect(probedCapture?.contentType).toBe("image/jpeg");

      const prompt = buildPhotoPrompt(
        findPhotoPreset("nordic-morning"),
        findFinish(RDTD_KITCHEN_PRODUCT_V2.cabinetColors, "graphite"),
        findFinish(RDTD_KITCHEN_PRODUCT_V2.frontColors, "porcelain")
      );

      const adapter = createReplicatePhotoGenerationAdapter(token!);
      const startedAt = Date.now();
      const outcome = await adapter.generate({
        capture,
        captureContentType: "image/jpeg",
        prompt,
        aspectRatio: "16:9"
      });
      const elapsedMs = Date.now() - startedAt;

      // A failure is reported with everything the adapter now records, so a
      // single run is diagnostic either way.
      if (outcome.kind === "failed") {
        throw new Error(
          `Generation failed after ${elapsedMs} ms: ${outcome.reason} ` +
            `(retryable=${outcome.retryable}, prediction=${outcome.providerReference ?? "none"}) ` +
            `${outcome.detail ?? ""}`
        );
      }

      expect(outcome.modelIdentifier).toBe("qwen/qwen-image-2-pro");
      expect(outcome.providerReference).toMatch(/\S/);
      const probed = probeImage(outcome.bytes);
      expect(probed).not.toBeNull();
      expect(probed!.width).toBeGreaterThan(0);

      const outputPath = process.env.REPLICATE_LIVE_OUTPUT;
      if (outputPath) {
        mkdirSync(dirname(outputPath), { recursive: true });
        writeFileSync(outputPath, outcome.bytes);
      }
      console.info("Replicate live generation", {
        elapsedMs,
        prediction: outcome.providerReference,
        declaredContentType: outcome.declaredContentType,
        bytes: outcome.bytes.byteLength,
        contentType: probed!.contentType,
        width: probed!.width,
        height: probed!.height,
        savedTo: outputPath ?? null
      });
    },
    150_000
  );
});
