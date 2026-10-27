import "server-only";

import sharp, { type Metadata } from "sharp";
import { AVATAR_LIMITS } from "@/features/customer-accounts/customer-avatar";

const ACCEPTED_FORMATS = new Set(["jpeg", "png", "webp"]);

export type ProcessedAvatar =
  | { kind: "ok"; bytes: Uint8Array<ArrayBuffer>; edge: number }
  | { kind: "not-an-image" }
  | { kind: "too-small" };

/**
 * Decodes an uploaded picture and returns the square WebP that is stored:
 * turned upright by its EXIF orientation, the centre square cropped, at most
 * 512 px, every metadata block (EXIF, GPS, ICC comments) dropped by the
 * re-encode. Anything that is not a JPEG, PNG or WebP, or whose shorter edge is
 * under 200 px, is refused.
 */
export async function processAvatar(input: Uint8Array): Promise<ProcessedAvatar> {
  let metadata: Metadata;
  try {
    metadata = await sharp(input, { limitInputPixels: 40_000_000 }).metadata();
  } catch {
    return { kind: "not-an-image" };
  }
  if (!metadata.format || !ACCEPTED_FORMATS.has(metadata.format)) return { kind: "not-an-image" };

  const width = metadata.autoOrient?.width ?? metadata.width;
  const height = metadata.autoOrient?.height ?? metadata.height;
  if (!width || !height || Math.min(width, height) < AVATAR_LIMITS.minEdge) return { kind: "too-small" };

  const edge = Math.min(AVATAR_LIMITS.storedEdge, width, height);
  try {
    const bytes = await sharp(input, { limitInputPixels: 40_000_000 })
      .autoOrient()
      .resize(edge, edge, { fit: "cover", position: "centre" })
      .webp({ quality: 82 })
      .toBuffer();
    return { kind: "ok", bytes: new Uint8Array(bytes), edge };
  } catch {
    return { kind: "not-an-image" };
  }
}
