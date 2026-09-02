import { z } from "zod";
import manifestJson from "@/features/configurator/modules/kitchen-asset-manifest.json";

/**
 * The Asset Manifest of the kitchen module model (ADR 0009, CONTEXT.md).
 *
 * An immutable, content-hashed description of the production model: which
 * mesh carries which Semantic Scene Role, the module placements, approved
 * studio cameras, the Deterministic Visual Fallback, measured budgets and
 * provenance. The engine resolves roles through it and never infers product
 * meaning from geometry or authoring-tool names. Missing required roles fail
 * here, at import, rather than receiving a heuristic substitute.
 *
 * Regenerate with `pnpm assets:manifest` after the model changes; the release
 * gate test checks the manifest against the bytes on disk.
 */
export const SEMANTIC_SCENE_ROLES = [
  "appliance",
  "backdrop",
  "cabinet",
  "countertop",
  "front",
  "handle",
  "plinth"
] as const;

export type SemanticSceneRole = (typeof SEMANTIC_SCENE_ROLES)[number];

const roleSchema = z.enum(SEMANTIC_SCENE_ROLES);

const cameraPresetSchema = z.tuple([
  z.number(),
  z.number(),
  z.number(),
  z.number(),
  z.number(),
  z.number()
]);

const cameraSetSchema = z.object({
  signature: cameraPresetSchema,
  front: cameraPresetSchema,
  detail: cameraPresetSchema
});

const budgetSchema = z.object({
  transferBytes: z.number().int().positive(),
  triangles: z.number().int().positive(),
  drawCalls: z.number().int().positive()
});

export const assetManifestSchema = z.object({
  manifestVersion: z.literal(1),
  assetKey: z.string().min(1),
  model: z.object({
    path: z.string().startsWith("/"),
    byteSize: z.number().int().positive(),
    sha256: z.string().regex(/^[0-9a-f]{64}$/)
  }),
  compatibility: z.object({
    renderContract: z.number().int().positive(),
    three: z.string().min(1)
  }),
  provenance: z.object({
    source: z.string().min(1),
    pipeline: z.string().min(1),
    license: z.string().min(1)
  }),
  budgets: z.object({ limits: budgetSchema, measured: budgetSchema }),
  roles: z.object({
    required: z.array(roleSchema).min(1),
    runtime: z.array(roleSchema)
  }),
  nodes: z
    .array(
      z.object({
        name: z.string().min(1),
        role: roleSchema,
        prefab: z.string().min(1),
        materialSlot: z.string(),
        triangles: z.number().int().nonnegative()
      })
    )
    .min(1),
  modules: z.array(
    z.object({
      key: z.string().min(1),
      type: z.enum([
        "island-back-60",
        "island-back-90",
        "island-end",
        "island-front",
        "wall-big",
        "wall-device",
        "wall-small"
      ]),
      prefab: z.string().min(1),
      xMin: z.number(),
      width: z.number().positive(),
      meshCount: z.number().int().positive()
    })
  ),
  continuous: z.array(
    z.object({
      key: z.string().min(1),
      prefab: z.string().min(1),
      xMin: z.number(),
      width: z.number().positive()
    })
  ),
  cameras: z.object({
    studio: z.object({ desktop: cameraSetSchema, compact: cameraSetSchema })
  }),
  fallback: z.object({
    kind: z.literal("poster"),
    src: z.string().startsWith("/"),
    alt: z.string().min(1),
    note: z.string()
  })
});

export type AssetManifest = z.infer<typeof assetManifestSchema>;
export type CameraPresetTuple = z.infer<typeof cameraPresetSchema>;

export class AssetManifestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AssetManifestError";
  }
}

/** Invariants the schema alone cannot express. Violations block release. */
export function validateAssetManifest(manifest: AssetManifest): AssetManifest {
  const problems: string[] = [];

  const names = new Set<string>();
  for (const node of manifest.nodes) {
    if (names.has(node.name)) problems.push(`duplicate node "${node.name}"`);
    names.add(node.name);
  }

  for (const role of manifest.roles.required) {
    if (!manifest.nodes.some((node) => node.role === role)) {
      problems.push(`required role "${role}" has no node`);
    }
  }

  const prefabs = new Set(manifest.nodes.map((node) => node.prefab));
  for (const entry of [...manifest.modules, ...manifest.continuous]) {
    if (!prefabs.has(entry.prefab)) {
      problems.push(`prefab "${entry.prefab}" has no nodes`);
    }
  }

  for (const key of ["transferBytes", "triangles", "drawCalls"] as const) {
    if (manifest.budgets.measured[key] > manifest.budgets.limits[key]) {
      problems.push(
        `budget "${key}" exceeded: ${manifest.budgets.measured[key]} > ${manifest.budgets.limits[key]}`
      );
    }
  }

  if (problems.length > 0) {
    throw new AssetManifestError(
      `Asset Manifest "${manifest.assetKey}" is not releasable:\n  ${problems.join("\n  ")}`
    );
  }
  return manifest;
}

export const KITCHEN_ASSET_MANIFEST: AssetManifest = validateAssetManifest(
  assetManifestSchema.parse(manifestJson)
);

const rolesByNode = new Map(
  KITCHEN_ASSET_MANIFEST.nodes.map((node) => [node.name, node.role] as const)
);

/**
 * The only way the engine learns what a model node means. An unmapped node
 * is a release-blocking defect, not something to guess around (ADR 0009).
 */
export function resolveSemanticRole(nodeName: string): SemanticSceneRole {
  const role = rolesByNode.get(nodeName);
  if (!role) {
    throw new AssetManifestError(
      `Asset Manifest maps no Semantic Scene Role for node "${nodeName}". ` +
        "Rebuild it with `pnpm assets:manifest` after changing the model."
    );
  }
  return role;
}

export function getStudioCameraPresets(compact: boolean) {
  return compact
    ? KITCHEN_ASSET_MANIFEST.cameras.studio.compact
    : KITCHEN_ASSET_MANIFEST.cameras.studio.desktop;
}

export function getVisualFallback() {
  return KITCHEN_ASSET_MANIFEST.fallback;
}
