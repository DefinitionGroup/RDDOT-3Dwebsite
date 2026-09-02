#!/usr/bin/env node
/**
 * Builds the Asset Manifest for the kitchen module model (ADR 0009).
 *
 * Reads the GLB and the segmentation pipeline's output
 * (kitchen-line-manifest.json), and writes kitchen-asset-manifest.json with:
 *   - the model's content hash, byte size and measured budgets,
 *   - an explicit mapping of every mesh node to its Semantic Scene Role,
 *     prefab and material slot,
 *   - the module and continuous-element placements,
 *   - authored sections (cameras, fallback, provenance, budget limits,
 *     compatibility) carried over from the existing manifest, seeded with
 *     defaults on the first run.
 *
 * The runtime reads only the Asset Manifest. A mesh the manifest does not
 * map has no role and fails validation instead of receiving a heuristic.
 *
 * Usage: node scripts/build-asset-manifest.mjs
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { NodeIO } from "@gltf-transform/core";

const ROOT = resolve(import.meta.dirname, "..");
const MODEL_PATH = "/models/kitchen-modules.glb";
const MODEL_FILE = resolve(ROOT, "public", MODEL_PATH.slice(1));
const SEGMENTATION_MANIFEST = resolve(
  ROOT,
  "features/configurator/modules/kitchen-line-manifest.json"
);
const ASSET_MANIFEST = resolve(
  ROOT,
  "features/configurator/modules/kitchen-asset-manifest.json"
);

/** Roles the model itself must provide. `appliance` is generated at runtime. */
const REQUIRED_ROLES = ["backdrop", "cabinet", "countertop", "front", "handle", "plinth"];
const RUNTIME_ROLES = ["appliance"];

const DEFAULT_AUTHORED = {
  compatibility: { renderContract: 1, three: "0.184" },
  provenance: {
    source: "rotpunkt Signature kitchen line (kitchen-line.glb)",
    pipeline: "scripts/segment-kitchen-modules.py → scripts/build-asset-manifest.mjs",
    license: "Owned by rotpunkt; confirm before the Production Release Gate."
  },
  budgetLimits: { transferBytes: 2_000_000, triangles: 120_000, drawCalls: 200 },
  cameras: {
    studio: {
      desktop: {
        signature: [5.05, 2.75, 6.25, 0, 0.45, -0.08],
        front: [0, 1.55, 6.05, 0, 0.48, 0],
        detail: [2.05, 1.45, 3.05, 0.82, 0.38, 0.08]
      },
      compact: {
        signature: [7.4, 4.5, 9.2, 0, -2.45, -0.05],
        front: [0, 2.8, 9.4, 0, -1.05, 0],
        detail: [3.15, 1.7, 4.45, 0.75, -0.04, 0.04]
      }
    }
  },
  fallback: {
    kind: "poster",
    src: "/images/signature-panorama.webp",
    alt: "Signature Küche in Graphit und Porzellan, fotografiert im Studio.",
    note: "Deterministic Visual Fallback: shown when stable 3D is unavailable. Illustrative, not the exact configuration."
  }
};

const bytes = readFileSync(MODEL_FILE);
const sha256 = createHash("sha256").update(bytes).digest("hex");
const segmentation = JSON.parse(readFileSync(SEGMENTATION_MANIFEST, "utf8"));
const previous = existsSync(ASSET_MANIFEST)
  ? JSON.parse(readFileSync(ASSET_MANIFEST, "utf8"))
  : {};

const io = new NodeIO();
const document = await io.read(MODEL_FILE);
const scene = document.getRoot().listScenes()[0];

const nodes = [];
let triangles = 0;
const problems = [];

function walk(node, prefab) {
  const name = node.getName();
  const mesh = node.getMesh();
  if (!mesh && (name.startsWith("module__") || name.startsWith("continuous__"))) {
    prefab = name;
  }
  if (mesh) {
    const separator = name.indexOf("__");
    const role = separator > 0 ? name.slice(0, separator) : null;
    if (!role || !REQUIRED_ROLES.includes(role)) {
      problems.push(`mesh "${name}" carries no known role`);
    }
    if (!prefab) {
      problems.push(`mesh "${name}" sits outside any prefab`);
    }
    let meshTriangles = 0;
    const materials = new Set();
    for (const primitive of mesh.listPrimitives()) {
      const indices = primitive.getIndices();
      const position = primitive.getAttribute("POSITION");
      meshTriangles += Math.floor((indices ? indices.getCount() : position.getCount()) / 3);
      materials.add(primitive.getMaterial()?.getName() ?? "");
    }
    triangles += meshTriangles;
    nodes.push({
      name,
      role,
      prefab,
      materialSlot: [...materials].join("|"),
      triangles: meshTriangles
    });
  }
  for (const child of node.listChildren()) walk(child, prefab);
}
for (const node of scene.listChildren()) walk(node, null);

const seen = new Set();
for (const node of nodes) {
  if (seen.has(node.name)) problems.push(`duplicate node name "${node.name}"`);
  seen.add(node.name);
}
for (const role of REQUIRED_ROLES) {
  if (!nodes.some((node) => node.role === role)) {
    problems.push(`required role "${role}" has no node`);
  }
}
if (problems.length > 0) {
  console.error("Asset Manifest cannot be built:\n  " + problems.join("\n  "));
  process.exit(1);
}

nodes.sort((a, b) => a.name.localeCompare(b.name));

const manifest = {
  manifestVersion: 1,
  assetKey: "rdtdot-signature-kitchen-modules",
  model: { path: MODEL_PATH, byteSize: bytes.byteLength, sha256 },
  compatibility: previous.compatibility ?? DEFAULT_AUTHORED.compatibility,
  provenance: previous.provenance ?? DEFAULT_AUTHORED.provenance,
  budgets: {
    limits: previous.budgets?.limits ?? DEFAULT_AUTHORED.budgetLimits,
    measured: { transferBytes: bytes.byteLength, triangles, drawCalls: nodes.length }
  },
  roles: { required: REQUIRED_ROLES, runtime: RUNTIME_ROLES },
  nodes,
  modules: segmentation.modules,
  continuous: segmentation.continuous,
  cameras: previous.cameras ?? DEFAULT_AUTHORED.cameras,
  fallback: previous.fallback ?? DEFAULT_AUTHORED.fallback
};

for (const [key, measured] of Object.entries(manifest.budgets.measured)) {
  const limit = manifest.budgets.limits[key];
  if (measured > limit) {
    console.error(`Budget exceeded: ${key} ${measured} > ${limit}`);
    process.exit(1);
  }
}

writeFileSync(ASSET_MANIFEST, JSON.stringify(manifest, null, 2) + "\n");
console.log(
  `Asset Manifest written: ${nodes.length} nodes, ${triangles} triangles, ` +
    `${manifest.modules.length} modules, ${manifest.continuous.length} continuous, sha256 ${sha256.slice(0, 12)}…`
);
