import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { NodeIO } from "@gltf-transform/core";
import { describe, expect, it } from "vitest";
import {
  AssetManifestError,
  assetManifestSchema,
  KITCHEN_ASSET_MANIFEST,
  resolveSemanticRole,
  validateAssetManifest
} from "@/features/configurator/modules/asset-manifest";
import segmentation from "@/features/configurator/modules/kitchen-line-manifest.json";

/**
 * The release gate of ADR 0009 for the kitchen module model. It fails when
 * the model on disk and the manifest disagree, when a mesh has no Semantic
 * Scene Role, when a required role is missing, or when a budget is exceeded.
 */
describe("Asset Manifest (release gate)", () => {
  const manifest = KITCHEN_ASSET_MANIFEST;
  const modelFile = `public${manifest.model.path}`;
  const bytes = readFileSync(modelFile);

  it("pins the exact model bytes", () => {
    expect(bytes.byteLength).toBe(manifest.model.byteSize);
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(manifest.model.sha256);
  });

  it("maps every mesh in the model, and nothing that is not in it", async () => {
    const document = await new NodeIO().read(modelFile);
    const scene = document.getRoot().listScenes()[0];
    const meshes = new Map<string, { prefab: string | null; triangles: number }>();

    function walk(node: ReturnType<typeof scene.listChildren>[number], prefab: string | null) {
      const name = node.getName();
      const mesh = node.getMesh();
      if (!mesh && (name.startsWith("module__") || name.startsWith("continuous__"))) {
        prefab = name;
      }
      if (mesh) {
        let triangles = 0;
        for (const primitive of mesh.listPrimitives()) {
          const indices = primitive.getIndices();
          const position = primitive.getAttribute("POSITION")!;
          triangles += Math.floor((indices ? indices.getCount() : position.getCount()) / 3);
        }
        meshes.set(name, { prefab, triangles });
      }
      for (const child of node.listChildren()) walk(child, prefab);
    }
    for (const node of scene.listChildren()) walk(node, null);

    const manifestNames = new Set(manifest.nodes.map((node) => node.name));
    expect([...meshes.keys()].filter((name) => !manifestNames.has(name))).toEqual([]);
    expect([...manifestNames].filter((name) => !meshes.has(name))).toEqual([]);

    for (const node of manifest.nodes) {
      const mesh = meshes.get(node.name)!;
      expect(mesh.prefab, node.name).toBe(node.prefab);
      expect(mesh.triangles, node.name).toBe(node.triangles);
      // The segmentation step bakes the role into the name; the manifest is
      // the authority, but the two must not drift apart silently.
      expect(node.name.startsWith(`${node.role}__`), node.name).toBe(true);
    }

    const totalTriangles = [...meshes.values()].reduce((sum, mesh) => sum + mesh.triangles, 0);
    expect(manifest.budgets.measured.triangles).toBe(totalTriangles);
    expect(manifest.budgets.measured.drawCalls).toBe(meshes.size);
    expect(manifest.budgets.measured.transferBytes).toBe(bytes.byteLength);
  });

  it("covers every required role and stays within budget", () => {
    for (const role of manifest.roles.required) {
      expect(manifest.nodes.some((node) => node.role === role), role).toBe(true);
    }
    for (const key of ["transferBytes", "triangles", "drawCalls"] as const) {
      expect(manifest.budgets.measured[key]).toBeLessThanOrEqual(manifest.budgets.limits[key]);
    }
  });

  it("carries the segmentation placements unchanged", () => {
    expect(manifest.modules).toEqual(segmentation.modules);
    expect(manifest.continuous).toEqual(segmentation.continuous);
  });

  it("declares approved cameras and a fallback that exists", () => {
    expect(manifest.cameras.studio.desktop.signature).toHaveLength(6);
    expect(manifest.cameras.studio.compact.detail).toHaveLength(6);
    expect(existsSync(`public${manifest.fallback.src}`)).toBe(true);
  });

  it("refuses an unmapped node instead of guessing", () => {
    expect(resolveSemanticRole(manifest.nodes[0].name)).toBe(manifest.nodes[0].role);
    expect(() => resolveSemanticRole("Cube.999")).toThrow(AssetManifestError);
  });

  it("blocks a manifest that lost a required role or exceeds a budget", () => {
    const withoutHandles = assetManifestSchema.parse({
      ...manifest,
      nodes: manifest.nodes.filter((node) => node.role !== "handle")
    });
    expect(() => validateAssetManifest(withoutHandles)).toThrow(/required role "handle"/);

    const overBudget = assetManifestSchema.parse({
      ...manifest,
      budgets: { ...manifest.budgets, limits: { ...manifest.budgets.limits, triangles: 10 } }
    });
    expect(() => validateAssetManifest(overBudget)).toThrow(/budget "triangles" exceeded/);
  });
});
