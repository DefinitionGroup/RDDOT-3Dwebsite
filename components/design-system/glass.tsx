"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
import { Label } from "@/components/design-system/label";

type GlassProps = {
  children: ReactNode;
  className?: string;
};

/** A frosted pill floating over imagery or the scene. */
export function Glass({ children, className = "" }: GlassProps) {
  return <div className={`glass rounded-pill text-ink ${className}`}>{children}</div>;
}

/** The small uppercase badge in a card corner: "Furnier", "Gefertigt in Deutschland". */
export function GlassBadge({ children, className = "" }: GlassProps) {
  return (
    <Glass className={`inline-flex h-8 items-center px-3.5 ${className}`}>
      <Label as="span" tone="ink" className="tracking-badge">
        {children}
      </Label>
    </Glass>
  );
}

export type Segment = { id: string; label: string; icon?: ReactNode };

type GlassSegmentsProps = {
  segments: Segment[];
  activeId: string;
  onChange?: (id: string) => void;
  /** Shares the sliding highlight between instances. */
  layoutGroup: string;
  className?: string;
  /** hud: 44 px chips over the scene; card: 36 px inside cards; compact: 44 px, tight, on phones. */
  size?: "hud" | "card" | "compact";
  ariaLabel: string;
};

const segmentSize = {
  hud: "h-11 px-[18px] text-[0.875rem]",
  card: "h-9 px-4 text-caption",
  compact: "h-11 px-3 text-[0.75rem]"
};

/**
 * The frosted segmented control that carries the three decisions.
 * The active segment lifts to 14 % white and carries the red dot;
 * the highlight slides between segments.
 */
export function GlassSegments({
  activeId,
  ariaLabel,
  className = "",
  layoutGroup,
  onChange,
  segments,
  size = "card"
}: GlassSegmentsProps) {
  const height = segmentSize[size];
  return (
    <Glass className={`inline-flex items-center gap-0.5 p-1 ${className}`}>
      <div aria-label={ariaLabel} className="contents" role="tablist">
        {segments.map((segment) => {
          const active = segment.id === activeId;
          return (
            <button
              aria-selected={active}
              className={`relative inline-flex ${height} items-center gap-2 rounded-pill font-label leading-none transition-colors duration-state ease-signature ${
                active ? "text-ink" : "text-graphite hover:text-ink"
              }`}
              key={segment.id}
              onClick={onChange ? () => onChange(segment.id) : undefined}
              role="tab"
              type="button"
            >
              {active && (
                <motion.span
                  aria-hidden="true"
                  className="absolute inset-0 rounded-pill bg-ink/[.14]"
                  layoutId={`${layoutGroup}-segment`}
                  transition={{ duration: 0.24 }}
                />
              )}
              {active && (
                <span aria-hidden="true" className="relative size-1.5 rounded-pill bg-signature" />
              )}
              {segment.icon && <span className="relative inline-flex">{segment.icon}</span>}
              <span className="relative">{segment.label}</span>
            </button>
          );
        })}
      </div>
    </Glass>
  );
}
