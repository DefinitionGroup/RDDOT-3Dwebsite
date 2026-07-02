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
          className="fixed inset-0 z-40 grid place-items-center bg-ink/30 p-4"
          exit={{ opacity: 0 }}
          initial={{ opacity: 0 }}
          onClick={isGenerating ? undefined : onClose}
        >
          <motion.section
            animate={{ opacity: 1, y: 0 }}
            aria-label="KI-Foto"
            className="w-full max-w-2xl border border-hairline bg-canvas p-6 md:p-8"
            exit={{ opacity: 0, y: 14 }}
            initial={{ opacity: 0, y: 14 }}
            onClick={(event) => event.stopPropagation()}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-body uppercase tracking-[0.22em] text-graphite">KI-Foto</p>
                <h2 className="mt-3 text-lead text-ink">
                  Ihre Küche als Foto<span className="text-signature">.</span>
                </h2>
              </div>
              <button
                aria-label="Schließen"
                className="grid size-9 place-items-center border border-hairline text-graphite transition-colors hover:border-ink hover:text-ink disabled:opacity-40"
                disabled={isGenerating}
                onClick={onClose}
                type="button"
              >
                <X aria-hidden="true" size={15} strokeWidth={1.5} />
              </button>
            </div>

            {(status.phase === "idle" || status.phase === "error") && (
              <>
                <p className="text-pretty text-body text-graphite">
                  Wählen Sie eine Szene. Die aktuelle Konfiguration wird fotografiert und
                  von der KI in ein realistisches Foto verwandelt (ca. 10–30 Sekunden).
                </p>
                <div className="mt-5 grid grid-cols-2 divide-x divide-y divide-hairline border border-hairline">
                  {PHOTO_PRESETS.map((preset) => {
                    const isActive = preset.key === selectedPresetKey;
                    return (
                      <button
                        aria-pressed={isActive}
                        className={`inline-flex min-h-12 items-center gap-2 px-4 py-2 text-left text-body transition-colors ${
                          isActive ? "text-ink" : "text-graphite hover:text-ink"
                        }`}
                        key={preset.key}
                        onClick={() => onSelectPreset(preset.key)}
                        type="button"
                      >
                        {isActive && (
                          <span
                            aria-hidden="true"
                            className="size-1.5 shrink-0 rounded-full bg-signature"
                          />
                        )}
                        {getLocalizedLabel(preset.label, locale)}
                      </button>
                    );
                  })}
                </div>

                {status.phase === "error" && (
                  <p className="mt-4 border border-signature/40 px-4 py-3 text-body text-signature">
                    {status.message}
                  </p>
                )}

                <button
                  className="mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2.5 border border-ink bg-ink px-5 text-body leading-none text-paper transition-colors hover:bg-transparent hover:text-ink"
                  onClick={onGenerate}
                  type="button"
                >
                  <Camera aria-hidden="true" size={15} strokeWidth={1.5} />
                  Foto aufnehmen
                </button>
              </>
            )}

            {status.phase === "generating" && (
              <div>
                <div className="relative aspect-video w-full overflow-hidden border border-hairline">
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
                <p className="mt-5 text-center text-body text-graphite">
                  Ihr Foto entsteht … das dauert etwa 10–30 Sekunden.
                </p>
              </div>
            )}

            {status.phase === "done" && (
              <div>
                <div className="aspect-video w-full overflow-hidden border border-hairline">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    alt="KI-generiertes Küchenfoto"
                    className="size-full object-cover"
                    src={status.image}
                  />
                </div>
                <div className="mt-5 grid grid-cols-[1fr_auto] gap-2">
                  <a
                    className="inline-flex min-h-11 items-center justify-center gap-2.5 border border-ink bg-ink px-5 text-body leading-none text-paper transition-colors hover:bg-transparent hover:text-ink"
                    download={`rotpunkt-kueche-${selectedPresetKey}.${extensionFromDataUrl(status.image)}`}
                    href={status.image}
                  >
                    <Download aria-hidden="true" size={15} strokeWidth={1.5} />
                    Herunterladen
                  </a>
                  <button
                    aria-label="Neues Foto aufnehmen"
                    className="grid size-11 place-items-center border border-hairline text-graphite transition-colors hover:border-ink hover:text-ink"
                    onClick={onGenerate}
                    title="Nochmal"
                    type="button"
                  >
                    <RotateCcw aria-hidden="true" size={16} strokeWidth={1.5} />
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
