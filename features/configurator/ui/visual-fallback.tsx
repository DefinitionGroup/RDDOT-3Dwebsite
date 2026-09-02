"use client";

import Image from "next/image";
import { getVisualFallback } from "@/features/configurator/modules/asset-manifest";

export type VisualFallbackReason = "webgl" | "asset" | "error";

const MESSAGE: Record<VisualFallbackReason, string> = {
  webgl: "Die 3D-Ansicht ist auf diesem Gerät nicht verfügbar.",
  asset: "Die 3D-Ansicht konnte nicht geladen werden.",
  error: "Die 3D-Ansicht ist vorübergehend nicht verfügbar."
};

/**
 * The Deterministic Visual Fallback (ADR 0009): an approved poster shown when
 * stable 3D is unavailable. The configuration tasks stay fully usable through
 * the panel; the picture is clearly illustrative, not the exact configuration.
 */
export function DeterministicVisualFallback({ reason }: { reason: VisualFallbackReason }) {
  const fallback = getVisualFallback();
  return (
    <div className="relative h-full w-full overflow-hidden bg-canvas" role="img" aria-label={fallback.alt}>
      <Image
        alt=""
        className="object-cover object-center"
        fill
        priority
        sizes="(min-width: 1024px) 66vw, 100vw"
        src={fallback.src}
      />
      <div className="absolute inset-x-0 bottom-0 bg-[linear-gradient(180deg,rgba(20,18,16,0)_0%,rgba(20,18,16,0.72)_100%)] p-6 text-paper md:p-8">
        <p className="text-body">{MESSAGE[reason]}</p>
        <p className="mt-1 max-w-[52ch] text-sm text-white/80">
          Ihre Konfiguration bleibt vollständig nutzbar. Die Abbildung ist
          illustrativ und zeigt nicht Ihre exakte Auswahl.
        </p>
      </div>
    </div>
  );
}
