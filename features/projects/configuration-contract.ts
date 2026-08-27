import { createHash } from "node:crypto";
import { z } from "zod";

const configuratorStateV1Schema = z
  .object({
    schemaVersion: z.literal(1),
    productKey: z.string().min(1),
    layout: z.literal("straight-line"),
    cabinetColorKey: z.string().min(1),
    frontColorKey: z.string().min(1)
  })
  .strict();

const configuratorStateV2Schema = z
  .object({
    schemaVersion: z.literal(2),
    productKey: z.string().min(1),
    layout: z.literal("straight-line"),
    cabinetColorKey: z.string().min(1),
    frontColorKey: z.string().min(1),
    wallModules: z.array(z.enum(["big", "device", "small"])).min(1).max(24),
    islandSize: z.union([z.literal(0), z.literal(2), z.literal(4), z.literal(6)])
  })
  .strict();

/**
 * Parses every known state generation. Historical v1 rows must stay
 * readable so version gates can reject them gracefully instead of
 * exploding on the read path.
 */
const configuratorStateSchema = z.discriminatedUnion("schemaVersion", [
  configuratorStateV1Schema,
  configuratorStateV2Schema
]);

export type ParsedConfiguration = z.infer<typeof configuratorStateSchema>;

export function parseConfiguration(input: unknown): ParsedConfiguration {
  return configuratorStateSchema.parse(input);
}

/**
 * Serializes with recursively sorted object keys so the hash depends on
 * content, not construction order. Array order is preserved: the wall
 * module sequence is semantic.
 */
function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`);
    return `{${entries.join(",")}}`;
  }
  return JSON.stringify(value);
}

export function hashConfiguration(configuration: ParsedConfiguration) {
  if (configuration.schemaVersion === 1) {
    // Byte-compatible with the hashes stored for existing v1 revisions:
    // the original implementation stringified the normalized construction
    // order, reproduced here explicitly.
    const legacyOrdered = {
      schemaVersion: configuration.schemaVersion,
      productKey: configuration.productKey,
      layout: configuration.layout,
      cabinetColorKey: configuration.cabinetColorKey,
      frontColorKey: configuration.frontColorKey
    };
    return createHash("sha256")
      .update(JSON.stringify(legacyOrdered))
      .digest("hex");
  }

  return createHash("sha256")
    .update(stableStringify(configuration))
    .digest("hex");
}

export function hashJson(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
