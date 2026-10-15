"use client";

import Image from "next/image";
import { getVisualFallback } from "@/features/configurator/modules/asset-manifest";
import { useMessages } from "@/lib/messages/locale-context";

export type VisualFallbackReason = "webgl" | "asset" | "error";

/**
 * The Deterministic Visual Fallback (ADR 0009): an approved poster shown when
 * stable 3D is unavailable. The configuration tasks stay fully usable through
 * the panel; the picture is clearly illustrative, not the exact configuration.
 */
export function DeterministicVisualFallback({ reason }: { reason: VisualFallbackReason }) {
  const fallback = getVisualFallback();
  // The manifest's alt text is German; the poster is described in the page's language.
  const t = useMessages().visualFallback;
  return (
    <div className="relative h-full w-full overflow-hidden bg-canvas" role="img" aria-label={t.alt}>
      <Image
        alt=""
        className="object-cover object-center"
        fill
        priority
        sizes="(min-width: 1024px) 66vw, 100vw"
        src={fallback.src}
      />
      <div className="absolute inset-x-0 bottom-0 bg-[linear-gradient(180deg,rgba(20,18,16,0)_0%,rgba(20,18,16,0.72)_100%)] p-6 text-paper md:p-8">
        <p className="text-body">{t[reason]}</p>
        <p className="mt-1 max-w-[52ch] text-sm text-white/80">{t.note}</p>
      </div>
    </div>
  );
}
