import { createImageUrlBuilder, type SanityImageSource } from "@sanity/image-url";
import { dataset, isSanityConfigured, studioProjectId } from "@/sanity/env";

const builder = createImageUrlBuilder({ projectId: studioProjectId, dataset });

/** Any image the queries project: an asset with `_id` and `url`, plus crop and hotspot. */
export type ImageSource =
  | {
      asset: { _id: string; url: string; dimensions?: { width: number; height: number } | null } | null;
      crop?: unknown;
      hotspot?: { x: number; y: number } | null;
    }
  | null
  | undefined;

/** Demo assets (`demo-…`) and demo mode serve the local file under /public unchanged. */
function isLocal(source: NonNullable<ImageSource>) {
  return !isSanityConfigured || source.asset?._id.startsWith("demo-");
}

/**
 * The image's URL with the editor's crop applied, for next/image, a video
 * poster or a share image. With both sides given it is cut to that format
 * around the editor's focal point.
 */
export function imageUrl(source: ImageSource, options: { width?: number; height?: number } = {}) {
  if (!source?.asset) return undefined;
  if (isLocal(source)) return source.asset.url;
  let image = builder.image(source as SanityImageSource);
  if (options.width) image = image.width(options.width);
  if (options.height) image = image.height(options.height).fit("crop");
  return image.url();
}

export function imageDimensions(source: ImageSource) {
  const dimensions = source?.asset?.dimensions;
  return dimensions ? { width: dimensions.width, height: dimensions.height } : { width: 1600, height: 1000 };
}

/** The editor's focal point as CSS object-position, so `object-cover` crops around it. */
export function imageFocus(source: ImageSource) {
  const hotspot = source?.hotspot;
  return hotspot ? `${Math.round(hotspot.x * 100)}% ${Math.round(hotspot.y * 100)}%` : undefined;
}
