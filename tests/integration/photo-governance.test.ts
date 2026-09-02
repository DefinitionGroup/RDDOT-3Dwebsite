import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  buildPhotoPrompt,
  PHOTO_PRESETS
} from "@/features/configurator/photo/photo-presets";
import { findFinish, RDTD_KITCHEN_PRODUCT_V2 } from "@/features/configurator/product-definition";
import { findScenePreset, renderPromptTemplate } from "@/features/photo-jobs/photo-governance";
import { createPostgresPhotoGovernance } from "@/lib/server/db/photo-governance-postgres";
import {
  startPostgresTestContext,
  type PostgresTestContext
} from "@/tests/integration/postgres-test-context";

/**
 * The seeded Release v1 records the standing product decision. The UI still
 * offers the presets from code, so the two must not drift apart silently, and
 * the template must render exactly what the in-code builder produced before
 * governance existed — that is what "Release v1" means.
 */
describe("photo governance releases", () => {
  let context: PostgresTestContext;

  beforeAll(async () => {
    context = await startPostgresTestContext();
  }, 120_000);

  afterAll(async () => {
    await context?.stop();
  });

  it("has one active Prompt Template Release and one active Model Release", async () => {
    const releases = await createPostgresPhotoGovernance(context.database).getActiveReleases();
    expect(releases).not.toBeNull();
    expect(releases!.promptTemplate.key).toBe("signature-kitchen-photo");
    expect(releases!.promptTemplate.version).toBe(1);
    expect(releases!.model.provider).toBe("replicate");
    expect(releases!.model.modelIdentifier).toBe("qwen/qwen-image-2-pro");
    expect(releases!.model.estimatedCostCents).toBeGreaterThan(0);
    expect(releases!.promptTemplate.approvedBy).toMatch(/Product owner/);
  });

  it("approves exactly the Scene Presets the configurator offers", async () => {
    const releases = await createPostgresPhotoGovernance(context.database).getActiveReleases();
    expect(releases!.promptTemplate.scenePresets).toEqual(PHOTO_PRESETS);
  });

  it("renders Release v1 exactly as the pre-governance builder did", async () => {
    const releases = await createPostgresPhotoGovernance(context.database).getActiveReleases();
    const cabinet = findFinish(RDTD_KITCHEN_PRODUCT_V2.cabinetColors, "graphite");
    const front = findFinish(RDTD_KITCHEN_PRODUCT_V2.frontColors, "porcelain");

    for (const preset of PHOTO_PRESETS) {
      const approved = findScenePreset(releases!.promptTemplate, preset.key);
      expect(approved).not.toBeNull();
      const rendered = renderPromptTemplate(releases!.promptTemplate.template, {
        frontLabel: front.label.en,
        frontMaterial: front.material,
        cabinetLabel: cabinet.label.en,
        scene: approved!.scene
      });
      expect(rendered).toBe(buildPhotoPrompt(preset, cabinet, front));
    }
  });

  it("allows only one active release per kind", async () => {
    await expect(
      context.database
        .withSchema("app")
        .insertInto("modelRelease")
        .values({
          id: crypto.randomUUID(),
          provider: "test",
          modelIdentifier: "test/second",
          versionLabel: "v2",
          license: "test",
          expectations: {},
          safetyNotes: "test",
          pricingBasis: "test",
          estimatedCostCents: 1,
          evaluationEvidence: "test",
          active: true,
          approvedBy: "test",
          approvedAt: new Date()
        })
        .execute()
    ).rejects.toMatchObject({ code: "23505" });
  });
});
