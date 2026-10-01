/**
 * Helpers for writing demo content in the *resolved* shape the queries
 * return, so demo pages type-check against the generated result types and
 * the seed script can invert them. Demo asset ids start with `demo-` and
 * point at files under /public; the image helper serves those unchanged.
 */
import type { ResolvedFile, ResolvedImage } from "@/blocks/types";

let keyCounter = 0;

/** A stable array key: deterministic, so demo pages render the same on every request. */
export function key(prefix: string) {
  keyCounter += 1;
  return `${prefix}-${keyCounter}`;
}

function assetId(prefix: string, url: string) {
  return `demo-${prefix}-${url.replace(/^\/(images|video)\//, "").replace(/\.[a-z0-9]+$/i, "")}`;
}

/** An image without its own alt text: decorative uses such as a film's poster. */
export function decorativeImage(url: string, size: { width: number; height: number }) {
  return {
    _type: "image" as const,
    asset: {
      _id: assetId("image", url),
      url,
      lqip: null,
      dimensions: { _type: "sanity.imageDimensions" as const, ...size, aspectRatio: size.width / size.height }
    }
  };
}

export function image(url: string, size: { width: number; height: number }, alt: string): ResolvedImage {
  return { ...decorativeImage(url, size), alt };
}

export function file(url: string, mimeType = "video/mp4"): ResolvedFile {
  return { _id: assetId("file", url), url, mimeType };
}

export function link(label: string, href: string) {
  return { _type: "linkField" as const, label, href };
}
