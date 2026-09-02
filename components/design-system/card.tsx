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
  image: string;
  alt: string;
  ratio: string;
  sizes: string;
  badge?: string;
  label?: string;
  title: ReactNode;
  body?: string;
  action?: ReactNode;
  titleSize?: "card" | "title";
  shade?: "media" | "deep";
  className?: string;
  priority?: boolean;
  position?: string;
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
  image,
  label,
  position,
  priority = false,
  ratio,
  shade = "media",
  sizes,
  title,
  titleSize = "card"
}: MediaCardProps) {
  return (
    <article className={`relative overflow-hidden rounded-card bg-charcoal ${ratio} ${className}`}>
      <Image
        alt={alt}
        className="object-cover"
        fill
        priority={priority}
        sizes={sizes}
        src={image}
        style={position ? { objectPosition: position } : undefined}
      />
      <div
        aria-hidden="true"
        className={`absolute inset-0 ${shade === "deep" ? "media-shade-deep" : "media-shade"}`}
      />
      {badge && <GlassBadge className="absolute right-4 top-4">{badge}</GlassBadge>}
      <div className="absolute inset-x-5 bottom-5 flex items-end justify-between gap-6 md:inset-x-6 md:bottom-6">
        <div className="flex max-w-[34ch] flex-col gap-1">
          {label && (
            <p className="mb-1 font-label text-label uppercase tracking-label text-graphite">{label}</p>
          )}
          <h3 className={titleSize === "title" ? "text-title font-display" : "text-card"}>{title}</h3>
          {body && <p className="text-nav font-base text-graphite">{body}</p>}
        </div>
        {action}
      </div>
    </article>
  );
}
