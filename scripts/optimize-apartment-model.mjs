import { stat } from "node:fs/promises";
import { resolve } from "node:path";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import {
  dedup,
  meshopt,
  prune,
  sparse,
  textureCompress
} from "@gltf-transform/functions";
import draco3d from "draco3dgltf";
import { MeshoptDecoder, MeshoptEncoder } from "meshoptimizer";
import sharp from "sharp";

const REMOVED_NODE_NAMES = new Set([
  "Modern Kitchen.001",
  "Modern Kitchen.002",
  "Extractor",
  "Cylinder.001",
  "Pendant Lamp Dixon Black and Gold-03",
  "Pendant Lamp Dixon Black and Gold-03.001",
  "Pendant Lamp Dixon Black and Gold-03.002"
]);

const [inputArgument, outputArgument] = process.argv.slice(2);

if (!inputArgument || !outputArgument) {
  throw new Error(
    "Usage: npm run optimize:apartment -- <source.glb> <optimized.glb>"
  );
}

const inputPath = resolve(inputArgument);
const outputPath = resolve(outputArgument);

if (inputPath === outputPath) {
  throw new Error("Input and output paths must be different.");
}

const [dracoDecoder, dracoEncoder] = await Promise.all([
  draco3d.createDecoderModule(),
  draco3d.createEncoderModule(),
  MeshoptDecoder.ready,
  MeshoptEncoder.ready
]);

const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({
    "draco3d.decoder": dracoDecoder,
    "draco3d.encoder": dracoEncoder,
    "meshopt.decoder": MeshoptDecoder,
    "meshopt.encoder": MeshoptEncoder
  });

const document = await io.read(inputPath);
const root = document.getRoot();
let removedNodeCount = 0;

for (const extension of root.listExtensionsUsed()) {
  if (
    extension.extensionName === "KHR_draco_mesh_compression" ||
    extension.extensionName === "EXT_meshopt_compression"
  ) {
    extension.dispose();
  }
}

for (const node of root.listNodes()) {
  if (REMOVED_NODE_NAMES.has(node.getName())) {
    node.dispose();
    removedNodeCount += 1;
  }
}

await document.transform(
  dedup(),
  prune(),
  sparse(),
  textureCompress({
    effort: 80,
    encoder: sharp,
    quality: 85,
    resize: [1024, 1024],
    targetFormat: "webp"
  }),
  meshopt({ encoder: MeshoptEncoder, level: "high" })
);

await io.write(outputPath, document);

const [inputStats, outputStats] = await Promise.all([stat(inputPath), stat(outputPath)]);
const reduction = 100 - (outputStats.size / inputStats.size) * 100;

console.log(
  `Removed ${removedNodeCount} obsolete scene nodes. ` +
    `${formatMegabytes(inputStats.size)} MB -> ${formatMegabytes(outputStats.size)} MB ` +
    `(${reduction.toFixed(1)}% smaller).`
);

function formatMegabytes(bytes) {
  return (bytes / 1024 / 1024).toFixed(1);
}
