"use client";

import { Camera, Download, RotateCcw, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Label } from "@/components/design-system/label";
import { Pill, RoundButton } from "@/components/design-system/pill";
import { PHOTO_PRESETS } from "@/features/configurator/photo/photo-presets";
import { getLocalizedLabel } from "@/features/configurator/product-definition";
import type { LocaleCode } from "@/features/configurator/types";
import { PHOTO_DISCLOSURE } from "@/features/photo-gallery/ui/gallery-types";
import { DURATION, OVERLAY_SLIDE, SIGNATURE_EASE } from "@/lib/motion";

export type PhotoStatus =
  | { phase: "idle" }
  /**
   * A Photo Job belongs to a saved Project (ADR 0008), so a guest configuration
   * has to become one first, and an unsaved change has to land before the
   * revision can be pinned.
   */
  | { phase: "blocked"; reason: "guest" | "not-yet-saved" }
  | {
      phase: "working";
      step: "uploading" | "generating";
      /** Null when a job in flight was picked up again after a page load. */
      preview: string | null;
    }
  | { phase: "done"; imageUrl: string; photoId: string }
  | { phase: "error"; message: string };

type PhotoPopoverProps = {
  locale: LocaleCode;
  onClose: () => void;
  onGenerate: () => void;
  onSaveAsProject: () => void;
  onSelectPreset: (key: string) => void;
  open: boolean;
  selectedPresetKey: string;
  status: PhotoStatus;
};

const STEP_COPY: Record<"uploading" | "generating", string> = {
  uploading: "Die Aufnahme wird übertragen und geprüft …",
  generating: "Ihr Foto entsteht … das dauert etwa 10–30 Sekunden."
};

/** The photo card over the dimmed scene. Stays open while a job is running. */
export function PhotoPopover({
  locale,
  onClose,
  onGenerate,
  onSaveAsProject,
  onSelectPreset,
  open,
  selectedPresetKey,
  status
}: PhotoPopoverProps) {
  const isBusy = status.phase === "working";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-40 grid place-items-center bg-canvas/45 p-4 backdrop-blur-sm"
          exit={{ opacity: 0 }}
          initial={{ opacity: 0 }}
          onClick={isBusy ? undefined : onClose}
          transition={{ duration: DURATION.overlay, ease: SIGNATURE_EASE }}
        >
          <motion.section
            animate={{ opacity: 1, y: 0 }}
            aria-label="KI-Foto"
            className="w-full max-w-xl rounded-card border border-hairline bg-charcoal/[.96] p-6 backdrop-blur-[24px] md:p-8"
            exit={{ opacity: 0, y: OVERLAY_SLIDE }}
            initial={{ opacity: 0, y: OVERLAY_SLIDE }}
            onClick={(event) => event.stopPropagation()}
            transition={{ duration: DURATION.overlay, ease: SIGNATURE_EASE }}
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <div className="flex flex-col gap-3">
                <Label>KI-Foto</Label>
                <h2 className="m-0 text-panel">
                  Ihre Küche als <em>Foto</em>.
                </h2>
              </div>
              <RoundButton aria-label="Schließen" disabled={isBusy} onClick={onClose} tone="quiet">
                <X aria-hidden="true" size={14} strokeWidth={1.5} />
              </RoundButton>
            </div>

            {status.phase === "blocked" && (
              <div>
                <p className="m-0 text-pretty text-body text-graphite">
                  {status.reason === "guest"
                    ? "Visualisierungen gehören zu einem gespeicherten Projekt. Sichern Sie Ihre Konfiguration, dann bleibt jedes Foto dauerhaft bei ihr."
                    : "Ihr aktueller Stand wird gerade gespeichert. Sobald das erledigt ist, kann das Foto zu genau diesem Stand erzeugt werden."}
                </p>
                {status.reason === "guest" && (
                  <Pill className="mt-6" onClick={onSaveAsProject}>
                    Als Projekt speichern
                  </Pill>
                )}
              </div>
            )}

            {(status.phase === "idle" || status.phase === "error") && (
              <>
                <p className="m-0 text-pretty text-body text-graphite">
                  Wählen Sie eine Szene. Die aktuelle Konfiguration wird fotografiert und von der
                  KI in ein realistisches Foto verwandelt.
                </p>
                <div aria-label="Szene" className="mt-5 flex flex-wrap gap-2" role="group">
                  {PHOTO_PRESETS.map((preset) => {
                    const isActive = preset.key === selectedPresetKey;
                    return (
                      <button
                        aria-pressed={isActive}
                        className={`inline-flex h-11 items-center gap-2 rounded-pill border px-4 text-nav leading-none transition-colors duration-state ease-signature ${
                          isActive
                            ? "border-ink text-ink"
                            : "border-hairline text-graphite hover:border-ink hover:text-ink"
                        }`}
                        key={preset.key}
                        onClick={() => onSelectPreset(preset.key)}
                        type="button"
                      >
                        {isActive && (
                          <span aria-hidden="true" className="size-1.5 shrink-0 rounded-pill bg-signature" />
                        )}
                        {getLocalizedLabel(preset.label, locale)}
                      </button>
                    );
                  })}
                </div>

                {status.phase === "error" && (
                  <p className="m-0 mt-4 rounded-card border border-hairline px-4 py-3 text-caption text-ink">
                    {status.message}
                  </p>
                )}

                <Pill
                  className="mt-6 w-full"
                  leading={<Camera aria-hidden="true" size={15} strokeWidth={1.5} />}
                  onClick={onGenerate}
                >
                  Foto aufnehmen
                </Pill>
              </>
            )}

            {status.phase === "working" && (
              <div>
                <div className="relative aspect-video w-full overflow-hidden rounded-card bg-canvas">
                  {status.preview && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      alt="Aufgenommene Szene"
                      className="size-full object-cover opacity-60"
                      src={status.preview}
                    />
                  )}
                  <motion.div
                    animate={{ x: ["-100%", "100%"] }}
                    className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/25 to-transparent"
                    transition={{ duration: 1.6, ease: "easeInOut", repeat: Infinity }}
                  />
                </div>
                <p aria-live="polite" className="m-0 mt-5 text-center text-body text-graphite">
                  {STEP_COPY[status.step]}
                </p>
              </div>
            )}

            {status.phase === "done" && (
              <div>
                <div className="aspect-video w-full overflow-hidden rounded-card bg-canvas">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    alt="KI-generiertes Küchenfoto"
                    className="size-full object-cover"
                    src={status.imageUrl}
                  />
                </div>
                <p className="m-0 mt-3 text-caption text-graphite">
                  {PHOTO_DISCLOSURE} Sie liegt jetzt bei Ihrem Projekt.
                </p>
                <div className="mt-5 flex items-center gap-2">
                  <Pill
                    className="flex-1"
                    href={`/api/photos/${status.photoId}`}
                    leading={<Download aria-hidden="true" size={15} strokeWidth={1.5} />}
                    onClick={(event) => {
                      // The download URL is minted per request, so it is fetched
                      // at click time rather than held in the page.
                      event.preventDefault();
                      void downloadPhoto(status.photoId);
                    }}
                  >
                    Herunterladen
                  </Pill>
                  <RoundButton
                    aria-label="Neues Foto aufnehmen"
                    onClick={onGenerate}
                    title="Nochmal"
                    tone="quiet"
                  >
                    <RotateCcw aria-hidden="true" size={16} strokeWidth={1.5} />
                  </RoundButton>
                </div>
              </div>
            )}
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

async function downloadPhoto(photoId: string) {
  const response = await fetch(`/api/photos/${photoId}`, { cache: "no-store" });
  const payload = (await response.json().catch(() => null)) as {
    url?: string;
    filename?: string;
  } | null;
  if (!payload?.url) return;

  const anchor = document.createElement("a");
  anchor.href = payload.url;
  anchor.download = payload.filename ?? "visualisierung.jpg";
  anchor.rel = "noopener";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
}
