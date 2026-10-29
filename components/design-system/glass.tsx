"use client";

import { motion } from "motion/react";
import { type KeyboardEvent, type ReactNode, useRef } from "react";
import { Label } from "@/components/design-system/label";
import { arrowTarget } from "@/lib/keyboard";

/** glass: frosted, for imagery. solid: soot, for the 3D scene, where frosting tints with the surface below. */
export type GlassTone = "glass" | "solid";

type GlassProps = {
  children: ReactNode;
  className?: string;
  tone?: GlassTone;
};

export const glassToneClass: Record<GlassTone, string> = {
  glass: "glass",
  solid: "chip-solid"
};

/** A pill floating over imagery or the scene. */
export function Glass({ children, className = "", tone = "glass" }: GlassProps) {
  return <div className={`${glassToneClass[tone]} rounded-pill text-ink ${className}`}>{children}</div>;
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
  /**
   * A segment is about to be chosen: the pointer is over it, it has focus or
   * a finger is down on it. Lets what it opens start loading.
   */
  onIntent?: (id: string) => void;
  /** Shares the sliding highlight between instances. */
  layoutGroup: string;
  className?: string;
  /** hud: 44 px chips over the scene; card: 36 px inside cards; compact: 44 px, tight, on phones. */
  size?: "hud" | "card" | "compact";
  tone?: GlassTone;
  ariaLabel: string;
};

const segmentSize = {
  hud: "h-11 px-[18px] text-[0.875rem]",
  card: "h-9 px-4 text-caption",
  compact: "h-11 px-3 text-[0.75rem]"
};

/**
 * The segmented control that carries the three decisions, the view, the
 * camera. The active segment lifts to 14 % white and carries the red dot; the
 * highlight slides between segments. A radio group: Tab reaches the chosen
 * segment, arrow keys, Home and End choose another.
 */
export function GlassSegments({
  activeId,
  ariaLabel,
  className = "",
  layoutGroup,
  onChange,
  onIntent,
  segments,
  size = "card",
  tone = "glass"
}: GlassSegmentsProps) {
  const height = segmentSize[size];
  const groupRef = useRef<HTMLDivElement>(null);
  const focusIndex = Math.max(0, segments.findIndex((segment) => segment.id === activeId));

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const target = onChange ? arrowTarget(event.key, index, segments.length) : null;
    if (target === null) return;
    event.preventDefault();
    onChange?.(segments[target].id);
    groupRef.current?.querySelectorAll<HTMLButtonElement>("[role=radio]")[target]?.focus();
  }

  return (
    <Glass className={`inline-flex items-center gap-0.5 p-1 ${className}`} tone={tone}>
      <div aria-label={ariaLabel} className="contents" ref={groupRef} role="radiogroup">
        {segments.map((segment, index) => {
          const active = segment.id === activeId;
          const intent = onIntent ? () => onIntent(segment.id) : undefined;
          return (
            <button
              aria-checked={active}
              className={`relative inline-flex ${height} items-center gap-2 rounded-pill font-label leading-none transition-colors duration-state ease-signature ${
                active ? "text-ink" : "text-graphite hover:text-ink"
              }`}
              key={segment.id}
              onClick={onChange ? () => onChange(segment.id) : undefined}
              onFocus={intent}
              onKeyDown={(event) => onKeyDown(event, index)}
              onPointerDown={intent}
              onPointerEnter={intent}
              role="radio"
              tabIndex={index === focusIndex ? 0 : -1}
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
