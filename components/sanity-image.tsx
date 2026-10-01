import Image from "next/image";
import type { ResolvedImage } from "@/blocks/types";
import { imageDimensions, imageFocus, imageUrl } from "@/sanity/lib/image";

type SanityImageProps = {
  image: ResolvedImage | null | undefined;
  sizes: string;
  className?: string;
  /** Fill the positioned parent and crop around the editor's focal point. */
  fill?: boolean;
  priority?: boolean;
};

/** next/image for a projected editorial image: alt, focal point and blur placeholder from Sanity. */
export function SanityImage({ image, sizes, className = "", fill = false, priority = false }: SanityImageProps) {
  const src = imageUrl(image);
  if (!image || !src) return null;
  const lqip = image.asset?.lqip ?? undefined;
  const placeholder = lqip ? { placeholder: "blur" as const, blurDataURL: lqip } : {};

  if (fill) {
    return (
      <Image
        alt={image.alt}
        className={className}
        fill
        priority={priority}
        sizes={sizes}
        src={src}
        style={{ objectPosition: imageFocus(image) }}
        {...placeholder}
      />
    );
  }
  const { width, height } = imageDimensions(image);
  return (
    <Image
      alt={image.alt}
      className={className}
      height={height}
      priority={priority}
      sizes={sizes}
      src={src}
      width={width}
      {...placeholder}
    />
  );
}
