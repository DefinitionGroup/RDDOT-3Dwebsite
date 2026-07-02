"use client";

import { Camera, Download, RotateCcw, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { PHOTO_PRESETS } from "@/features/configurator/photo/photo-presets";
import { getLocalizedLabel } from "@/features/configurator/product-definition";
import type { LocaleCode } from "@/features/configurator/types";

export type PhotoStatus =
  | { phase: "idle" }
  | { phase: "generating"; preview: string }
  | { phase: "done"; image: string; preview: string }
  | { phase: "error"; message: string };

type PhotoPopoverProps = {
  locale: LocaleCode;
  onClose: () => void;
  onGenerate: () => void;
  onSelectPreset: (key: string) => void;
  open: boolean;
  selectedPresetKey: string;
  status: PhotoStatus;
};

export function PhotoPopover({
  locale,
  onClose,
  onGenerate,
  onSelectPreset,
  open,
  selectedPresetKey,
  status
}: PhotoPopoverProps) {
  const isGenerating = status.phase === "generating";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-40 grid place-items-center bg-ink/35 p-4 backdrop-blur-sm"
          exit={{ opacity: 0 }}
          initial={{ opacity: 0 }}
          onClick={isGenerating ? undefined : onClose}
        >
          <motion.section
            animate={{ opacity: 1, y: 0, scale: 1 }}
            aria-label="KI-Foto"
            className="w-full max-w-2xl bg-paper p-5 shadow-lift md:p-6"
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            onClick={(event) => event.stopPropagation()}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-signature">
                  KI-Foto
                </p>
                <h2 className="mt-1 font-editorial text-2xl leading-tight text-ink">
                  Deine Küche als Foto
                </h2>
              </div>
              <button
                aria-label="Schließen"
                className="grid size-10 place-items-center border border-ink/12 text-ink transition-colors hover:border-ink/35 disabled:opacity-40"
                disabled={isGenerating}
                onClick={onClose}
                type="button"
              >
                <X aria-hidden="true" size={18} />
              </button>
            </div>

            {(status.phase === "idle" || status.phase === "error") && (
              <>
                <p className="text-sm leading-6 text-graphite">
                  Wähle eine Szene. Die aktuelle Konfiguration wird fotografiert und
                  von der KI in ein realistisches Foto verwandelt (ca. 10–30 Sekunden).
                </p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {PHOTO_PRESETS.map((preset) => {
                    const isActive = preset.key === selectedPresetKey;
                    return (
                      <button
                        aria-pressed={isActive}
                        className={`min-h-12 border px-3 py-2 text-left text-sm font-medium transition-colors ${
                          isActive
                            ? "border-ink bg-white text-ink"
                            : "border-ink/10 bg-white/45 text-ink hover:border-ink/35"
                        }`}
                        key={preset.key}
                        onClick={() => onSelectPreset(preset.key)}
                        type="button"
                      >
                        {getLocalizedLabel(preset.label, locale)}
                      </button>
                    );
                  })}
                </div>

                {status.phase === "error" && (
                  <p className="mt-4 border border-signature/40 bg-signature/5 px-3 py-2 text-xs leading-5 text-signature">
                    {status.message}
                  </p>
                )}

                <button
                  className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 bg-ink px-4 text-sm font-semibold text-paper transition-colors hover:bg-graphite"
                  onClick={onGenerate}
                  type="button"
                >
                  <Camera aria-hidden="true" size={17} />
                  Foto aufnehmen
                </button>
              </>
            )}

            {status.phase === "generating" && (
              <div>
                <div className="relative aspect-video w-full overflow-hidden border border-ink/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    alt="Aufgenommene Szene"
                    className="size-full object-cover opacity-60"
                    src={status.preview}
                  />
                  <motion.div
                    animate={{ x: ["-100%", "100%"] }}
                    className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/45 to-transparent"
                    transition={{ duration: 1.6, ease: "easeInOut", repeat: Infinity }}
                  />
                </div>
                <p className="mt-4 text-center text-sm text-graphite">
                  Erstelle dein Foto … das dauert etwa 10–30 Sekunden.
                </p>
              </div>
            )}

            {status.phase === "done" && (
              <div>
                <div className="aspect-video w-full overflow-hidden border border-ink/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    alt="KI-generiertes Küchenfoto"
                    className="size-full object-cover"
                    src={status.image}
                  />
                </div>
                <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
                  <a
                    className="inline-flex min-h-12 items-center justify-center gap-2 bg-signature px-4 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5"
                    download={`rotpunkt-kueche-${selectedPresetKey}.${extensionFromDataUrl(status.image)}`}
                    href={status.image}
                  >
                    <Download aria-hidden="true" size={17} />
                    Herunterladen
                  </a>
                  <button
                    aria-label="Neues Foto aufnehmen"
                    className="grid size-12 place-items-center border border-ink/12 bg-white/65 text-ink transition-colors hover:border-ink/35"
                    onClick={onGenerate}
                    title="Nochmal"
                    type="button"
                  >
                    <RotateCcw aria-hidden="true" size={18} />
                  </button>
                </div>
              </div>
            )}
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function extensionFromDataUrl(dataUrl: string) {
  const match = /^data:image\/(\w+);/.exec(dataUrl);
  return match ? match[1] : "png";
}
