import Image from "next/image";
import type { ReactNode } from "react";
import { GlassBadge } from "@/components/design-system/glass";

type CardProps = {
  children: ReactNode;
  className?: string;
  as?: "div" | "article" | "section";
};

/** Charcoal on black, 10 px, no shadow. */
export function Card({ as: Tag = "div", children, className = "" }: CardProps) {
  return <Tag className={`rounded-card bg-charcoal ${className}`}>{children}</Tag>;
}

type MediaCardProps = {
  image?: string;
  /** A flat colour instead of a photo: the lacquer. */
  color?: string;
  alt: string;
  ratio: string;
  sizes: string;
  badge?: string;
  label?: string;
  title: ReactNode;
  body?: string;
  action?: ReactNode;
  titleSize?: "card" | "title";
  shade?: "media" | "deep" | "frame";
  className?: string;
  priority?: boolean;
  position?: string;
  zoom?: number;
  /** For a light colour card: dark chips and text instead of shade and white. */
  onLight?: boolean;
};

/**
 * Imagery with a gradient seat for its caption; an optional frosted badge
 * in the corner and an optional action at the foot.
 */
export function MediaCard({
  action,
  alt,
  badge,
  body,
  className = "",
  color,
  image,
  label,
  onLight = false,
  position,
  priority = false,
  ratio,
  shade = "media",
  sizes,
  title,
  titleSize = "card",
  zoom
}: MediaCardProps) {
  const imageStyle = {
    ...(position ? { objectPosition: position } : {}),
    ...(zoom ? { transform: `scale(${zoom})`, transformOrigin: position ?? "center" } : {})
  };
  return (
    <article className={`relative overflow-hidden rounded-card bg-charcoal ${ratio} ${className}`}>
      {image ? (
        <Image
          alt={alt}
          className="object-cover"
          fill
          priority={priority}
          sizes={sizes}
          src={image}
          style={imageStyle}
        />
      ) : (
        <div aria-label={alt} className="absolute inset-0" role="img" style={{ backgroundColor: color }} />
      )}
      {!onLight && (
        <div
          aria-hidden="true"
          className={`absolute inset-0 ${
            shade === "deep" ? "media-shade-deep" : shade === "frame" ? "media-shade-frame" : "media-shade"
          }`}
        />
      )}
      {badge &&
        (onLight ? (
          <span className="absolute right-4 top-4 inline-flex h-8 items-center rounded-pill bg-charcoal px-3.5 font-label text-label uppercase tracking-badge text-ink">
            {badge}
          </span>
        ) : (
          <GlassBadge className="absolute right-4 top-4">{badge}</GlassBadge>
        ))}
      <div className="absolute inset-x-5 bottom-5 flex items-end justify-between gap-6 md:inset-x-6 md:bottom-6">
        <div className="flex max-w-[34ch] flex-col gap-1">
          {label && (
            <p className="mb-1 font-label text-label uppercase tracking-label text-graphite">{label}</p>
          )}
          <h3
            className={`${titleSize === "title" ? "text-title font-display" : "text-card"} ${
              onLight ? "text-charcoal" : ""
            }`}
          >
            {title}
          </h3>
          {body && (
            <p className={`text-nav font-base ${onLight ? "text-[#5f5a52]" : "text-graphite"}`}>
              {body}
            </p>
          )}
        </div>
        {action}
      </div>
    </article>
  );
}
