import { z } from "zod";

/**
 * Governance records of ADR 0008 (CONTEXT.md): an immutable, approved Prompt
 * Template Release with its Scene Presets, and an immutable, approved Model
 * Release. Every Photo Job pins one of each, so an execution is always
 * attributable to what was approved (PLAN.md Phase 4, gap G6).
 */
export const scenePresetSchema = z.object({
  key: z.string().min(1).max(64),
  label: z.object({ de: z.string().min(1), en: z.string().min(1), es: z.string().min(1) }),
  scene: z.string().min(1).max(2000)
});

export type ScenePreset = z.infer<typeof scenePresetSchema>;

export type PromptTemplateRelease = {
  id: string;
  key: string;
  version: number;
  template: string;
  scenePresets: ScenePreset[];
  approvedBy: string;
  approvedAt: Date;
};

export type ModelRelease = {
  id: string;
  provider: string;
  modelIdentifier: string;
  versionLabel: string;
  estimatedCostCents: number;
  approvedBy: string;
  approvedAt: Date;
};

export type ActivePhotoReleases = {
  promptTemplate: PromptTemplateRelease;
  model: ModelRelease;
};

export type PhotoGovernance = {
  /** Null when either active release is missing; generation then fails closed. */
  getActiveReleases(): Promise<ActivePhotoReleases | null>;
};

export class PromptTemplateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PromptTemplateError";
  }
}

const PLACEHOLDER = /\{\{\s*([a-zA-Z][a-zA-Z0-9]*)\s*\}\}/g;

/**
 * Fills a release's template from trusted facts. Every placeholder must be
 * supplied and nothing but placeholders is substituted, so a fact can never
 * smuggle instructions in and a template can never silently lose one.
 */
export function renderPromptTemplate(template: string, facts: Record<string, string>) {
  const missing: string[] = [];
  const rendered = template.replace(PLACEHOLDER, (_match, name: string) => {
    const value = facts[name];
    if (value === undefined) {
      missing.push(name);
      return "";
    }
    return value.replace(/\s+/g, " ").trim();
  });
  if (missing.length > 0) {
    throw new PromptTemplateError(`Template placeholders without a fact: ${missing.join(", ")}`);
  }
  return rendered.replace(/\s{2,}/g, " ").trim();
}

export function findScenePreset(release: PromptTemplateRelease, key: string) {
  return release.scenePresets.find((preset) => preset.key === key) ?? null;
}
