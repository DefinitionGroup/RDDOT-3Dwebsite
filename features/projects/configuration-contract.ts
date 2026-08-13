import { createHash } from "node:crypto";
import { z } from "zod";

const configuratorStateSchema = z
  .object({
    schemaVersion: z.literal(1),
    productKey: z.string().min(1),
    layout: z.literal("straight-line"),
    cabinetColorKey: z.string().min(1),
    frontColorKey: z.string().min(1)
  })
  .strict();

export function parseConfiguration(input: unknown) {
  return configuratorStateSchema.parse(input);
}

export function hashConfiguration(
  configuration: z.infer<typeof configuratorStateSchema>
) {
  return createHash("sha256")
    .update(JSON.stringify(configuration))
    .digest("hex");
}

export function hashJson(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
