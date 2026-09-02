import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import {
  buildPhotoPrompt,
  findPhotoPreset
} from "@/features/configurator/photo/photo-presets";
import {
  findFinish,
  RDTD_KITCHEN_PRODUCT_V2
} from "@/features/configurator/product-definition";
import { probeImage } from "@/features/photo-jobs/image-probe";
import { createS3ObjectStorage } from "@/lib/server/object-storage/s3-object-storage";
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
 * It exercises the adapter exactly as the Photo Job Module does: the capture
 * is placed in the application's own object storage, the provider receives a
 * short-lived presigned URL to it (plus the bytes as fallback), and the output
 * is probed as an image. `REPLICATE_LIVE_OUTPUT` saves the result for
 * inspection. The module-level kill switch (`PHOTO_GENERATION_ENABLED`) is
 * deliberately not consulted here: this test is its own explicit switch.
 */
const token = process.env.REPLICATE_API_TOKEN?.trim();
const capturePath = process.env.REPLICATE_LIVE_CAPTURE;
const storageConfigured =
  process.env.OBJECT_STORAGE_ENDPOINT &&
  process.env.OBJECT_STORAGE_REGION &&
  process.env.OBJECT_STORAGE_BUCKET &&
  process.env.OBJECT_STORAGE_ACCESS_KEY_ID &&
  process.env.OBJECT_STORAGE_SECRET_ACCESS_KEY;
const armed =
  process.env.REPLICATE_LIVE_TEST === "1" &&
  Boolean(token) &&
  Boolean(storageConfigured) &&
  Boolean(capturePath && existsSync(capturePath));

describe.skipIf(!armed)("Replicate adapter (live, spends one credit)", () => {
  const storage = createS3ObjectStorage({
    endpoint: process.env.OBJECT_STORAGE_ENDPOINT!,
    region: process.env.OBJECT_STORAGE_REGION!,
    bucket: process.env.OBJECT_STORAGE_BUCKET!,
    accessKeyId: process.env.OBJECT_STORAGE_ACCESS_KEY_ID!,
    secretAccessKey: process.env.OBJECT_STORAGE_SECRET_ACCESS_KEY!,
    forcePathStyle: process.env.OBJECT_STORAGE_FORCE_PATH_STYLE !== "false"
  });
  const key = `smoke/replicate-live-${crypto.randomUUID()}.jpg`;

  afterAll(async () => {
    await storage.deleteObject(key).catch(() => {});
  });

  it(
    "generates a photo from a real Source Capture, submitted and reconciled",
    async () => {
      const capture = new Uint8Array(readFileSync(capturePath!));
      const probedCapture = probeImage(capture);
      expect(probedCapture?.contentType).toBe("image/jpeg");

      // Mirror the Source Capture path: single-use presigned upload, then the
      // same short-lived read grant the module hands the adapter.
      const upload = await storage.presignUpload({
        key,
        contentType: "image/jpeg",
        byteSize: capture.byteLength
      });
      const put = await fetch(upload.url, {
        method: "PUT",
        headers: upload.requiredHeaders,
        body: capture
      });
      expect(put.ok, `capture upload failed ${put.status}`).toBe(true);
      const download = await storage.presignDownload({ key, expiresInSeconds: 300 });

      const prompt = buildPhotoPrompt(
        findPhotoPreset("nordic-morning"),
        findFinish(RDTD_KITCHEN_PRODUCT_V2.cabinetColors, "graphite"),
        findFinish(RDTD_KITCHEN_PRODUCT_V2.frontColors, "porcelain")
      );

      const adapter = createReplicatePhotoGenerationAdapter(token!);
      const startedAt = Date.now();
      // No webhook can reach a developer machine, so this is the reconciliation
      // path: submit, then read the provider's view back until it is terminal.
      const submitted = await adapter.submit({
        captureContentType: "image/jpeg",
        captureUrl: download.url,
        prompt,
        aspectRatio: "16:9",
        modelIdentifier: "qwen/qwen-image-2-pro",
        webhookUrl: null
      });
      if (submitted.kind === "failed") {
        throw new Error(
          `Submission failed: ${submitted.reason} (retryable=${submitted.retryable}) ${submitted.detail ?? ""}`
        );
      }

      let outcome = await adapter.inspect(submitted.providerReference);
      while (outcome.kind === "pending" && Date.now() - startedAt < 120_000) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
        outcome = await adapter.inspect(submitted.providerReference);
      }
      const elapsedMs = Date.now() - startedAt;

      // A failure is reported with everything the adapter now records, so a
      // single run is diagnostic either way.
      if (outcome.kind !== "generated") {
        const detail =
          outcome.kind === "failed"
            ? `${outcome.reason} (retryable=${outcome.retryable}) ${outcome.detail ?? ""}`
            : outcome.kind;
        throw new Error(
          `Generation did not complete after ${elapsedMs} ms (prediction ${submitted.providerReference}): ${detail}`
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
