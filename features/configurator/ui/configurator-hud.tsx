"use client";

import { Camera, Pencil, ScanLine } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { BrandLogo } from "@/components/design-system/brand-logo";
import { GlassSegments } from "@/components/design-system/glass";
import { Label } from "@/components/design-system/label";
import type { CameraView, VisualizationMode } from "@/features/configurator/types";

/** The three decisions, in the order they are usually made. */
export type PlanningStage = "material" | "layout" | "review";

export const PLANNING_STAGES: { id: PlanningStage; label: string }[] = [
  { id: "material", label: "Material" },
  { id: "layout", label: "Aufbau" },
  { id: "review", label: "Prüfen" }
];

export const CAMERA_VIEWS: { id: CameraView; label: string }[] = [
  { id: "signature", label: "Raum" },
  { id: "front", label: "Front" },
  { id: "detail", label: "Detail" }
];

type ViewId = VisualizationMode | "render";

function AccountIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="16" viewBox="0 0 24 24" width="16">
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
    </svg>
  );
}

/** Brand, context and the account entry: the top-left and top-right of the HUD. */
export function HudBrand({ context }: { context: string }) {
  return (
    <div className="pointer-events-auto flex items-center gap-4">
      <BrandLogo compact />
      <span aria-hidden="true" className="hidden h-[18px] w-px bg-hairline sm:block" />
      <span className="hidden truncate text-[0.875rem] text-graphite sm:block">{context}</span>
    </div>
  );
}

export function HudAccountLink() {
  return (
    <Link
      aria-label="Mein Bereich"
      className="pointer-events-auto inline-flex size-11 shrink-0 items-center justify-center rounded-pill border border-hairline text-ink transition-colors duration-state ease-signature hover:border-ink"
      href="/konto"
    >
      <AccountIcon />
    </Link>
  );
}

export function HudPrice({ children, size = "hud" }: { children: ReactNode; size?: "hud" | "sheet" }) {
  return (
    <div className={`flex items-baseline gap-2.5 ${size === "sheet" ? "flex-col gap-0.5" : ""}`}>
      <Label as="span">Richtpreis</Label>
      <span
        className={`tnum font-display leading-none tracking-[-0.02em] text-ink ${
          size === "sheet" ? "text-[1.5rem]" : "text-[1.375rem]"
        }`}
      >
        {children}
      </span>
    </div>
  );
}

export function StageSegments({
  active,
  onSelect,
  size
}: {
  active: PlanningStage;
  onSelect: (stage: PlanningStage) => void;
  size: "hud" | "compact";
}) {
  return (
    <GlassSegments
      activeId={active}
      ariaLabel="Planungsschritte"
      layoutGroup={`stage-${size}`}
      onChange={(id) => onSelect(id as PlanningStage)}
      segments={PLANNING_STAGES}
      size={size}
    />
  );
}

export function ViewSegments({
  active,
  onRender,
  onSelect,
  renderActive,
  size,
  withRender
}: {
  active: VisualizationMode;
  onRender: () => void;
  onSelect: (mode: VisualizationMode) => void;
  renderActive: boolean;
  size: "hud" | "compact";
  withRender: boolean;
}) {
  const segments: { id: ViewId; label: string; icon?: ReactNode }[] = [
    { id: "studio", label: "Studio" },
    { id: "apartment", label: "Appartement" }
  ];
  if (withRender) {
    segments.push({
      id: "render",
      label: "Rendering",
      icon: <ScanLine aria-hidden="true" size={12} strokeWidth={1.5} />
    });
  }
  return (
    <GlassSegments
      activeId={renderActive ? "render" : active}
      ariaLabel="Ansicht"
      layoutGroup={`view-${size}`}
      onChange={(id) => {
        if (id === "render") {
          onRender();
          return;
        }
        onSelect(id as VisualizationMode);
      }}
      segments={segments}
      size={size}
    />
  );
}

export function CameraSegments({
  active,
  onSelect,
  size
}: {
  active: CameraView;
  onSelect: (view: CameraView) => void;
  size: "hud" | "compact";
}) {
  return (
    <GlassSegments
      activeId={active}
      ariaLabel="Kamera"
      layoutGroup={`camera-${size}`}
      onChange={(id) => onSelect(id as CameraView)}
      segments={CAMERA_VIEWS}
      size={size}
    />
  );
}

const glassAction =
  "glass pointer-events-auto inline-flex items-center justify-center gap-2 rounded-pill text-[0.875rem] font-label leading-none text-ink transition-[background-color,transform] duration-state ease-signature hover:bg-ink/[.14] active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40";

/** "Bearbeiten" and "Foto" as frosted pills (desktop) or rounds (phones). */
export function SceneActions({
  compact,
  onEdit,
  onPhoto
}: {
  compact: boolean;
  onEdit: () => void;
  onPhoto: () => void;
}) {
  const shape = compact ? "size-[46px]" : "h-12 px-5";
  return (
    <div className="flex items-center gap-2 md:gap-3">
      <button
        aria-label="Module bearbeiten"
        className={`${glassAction} ${shape}`}
        onClick={onEdit}
        type="button"
      >
        <Pencil aria-hidden="true" size={15} strokeWidth={1.5} />
        {!compact && "Bearbeiten"}
      </button>
      <button
        aria-label="Foto erzeugen"
        className={`${glassAction} ${shape}`}
        onClick={onPhoto}
        type="button"
      >
        <Camera aria-hidden="true" size={15} strokeWidth={1.5} />
        {!compact && "Foto"}
      </button>
    </div>
  );
}

/** The autosave state next to the scene actions: a grey dot and one line. */
export function SaveState({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <p aria-live="polite" className="m-0 ml-2 hidden items-center gap-2 text-[0.75rem] text-graphite md:flex">
      <span aria-hidden="true" className="size-1.5 rounded-pill bg-graphite" />
      {text}
    </p>
  );
}
