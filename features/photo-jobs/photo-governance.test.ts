import { describe, expect, it } from "vitest";
import {
  findScenePreset,
  PromptTemplateError,
  renderPromptTemplate,
  type PromptTemplateRelease
} from "@/features/photo-jobs/photo-governance";

const RELEASE: PromptTemplateRelease = {
  id: "r1",
  key: "signature-kitchen-photo",
  version: 1,
  template: "Fronts are {{frontLabel}} ({{ frontMaterial }}). {{scene}} Keep the camera.",
  scenePresets: [
    { key: "loft", label: { de: "Loft", en: "Loft", es: "Loft" }, scene: "Place it in a loft." }
  ],
  approvedBy: "test",
  approvedAt: new Date("2026-08-27T00:00:00Z")
};

describe("Prompt Template Release rendering", () => {
  it("fills every placeholder from trusted facts and normalises whitespace", () => {
    const prompt = renderPromptTemplate(RELEASE.template, {
      frontLabel: "Porcelain",
      frontMaterial: "matte  lacquer ",
      scene: "Place it in a loft."
    });
    expect(prompt).toBe(
      "Fronts are Porcelain (matte lacquer). Place it in a loft. Keep the camera."
    );
  });

  it("refuses to render when a placeholder has no fact", () => {
    expect(() => renderPromptTemplate(RELEASE.template, { frontLabel: "x" })).toThrow(
      PromptTemplateError
    );
    expect(() => renderPromptTemplate(RELEASE.template, { frontLabel: "x" })).toThrow(
      /frontMaterial, scene/
    );
  });

  it("substitutes placeholders only, never text inside a fact", () => {
    const prompt = renderPromptTemplate("A {{scene}} B", { scene: "{{frontLabel}} ignored" });
    expect(prompt).toBe("A {{frontLabel}} ignored B");
  });

  it("finds an approved Scene Preset by key and nothing else", () => {
    expect(findScenePreset(RELEASE, "loft")?.scene).toBe("Place it in a loft.");
    expect(findScenePreset(RELEASE, "beach")).toBeNull();
  });
});
