"use client";

import { Camera, Download, RotateCcw, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { type FormEvent, useId, useState } from "react";
import { Emphasized } from "@/components/design-system/emphasized";
import { FieldLabel, TextField } from "@/components/design-system/field";
import { Label } from "@/components/design-system/label";
import { Pill, RoundButton } from "@/components/design-system/pill";
import { PHOTO_PRESETS } from "@/features/configurator/photo/photo-presets";
import { getLocalizedLabel } from "@/features/configurator/product-definition";
import type { LocaleCode } from "@/features/configurator/types";
import { ProjectNameField } from "@/features/projects/ui/project-name-field";
import { useMessages } from "@/lib/messages/locale-context";
import { DURATION, OVERLAY_SLIDE, SIGNATURE_EASE } from "@/lib/motion";

export type PhotoStatus =
  | { phase: "idle" }
  /**
   * A Photo Job belongs to a saved Project (ADR 0008), so a guest configuration
   * has to become one first, and an unsaved change has to land before the
   * revision can be pinned.
   */
  | { phase: "blocked"; reason: "guest" | "not-yet-saved" }
  /** Signed in without a Project: the photo creates one, named here. */
  | { phase: "name" }
  | { phase: "creating" }
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
  onCreateProject: (name: string) => void;
  onGenerate: () => void;
  onRenamed: (name: string) => void;
  onSaveAsProject: () => void;
  onSelectPreset: (key: string) => void;
  open: boolean;
  project: { id: string; name: string } | null;
  selectedPresetKey: string;
  status: PhotoStatus;
};


/** The photo card over the dimmed scene. Stays open while a job is running. */
export function PhotoPopover({
  locale,
  onClose,
  onCreateProject,
  onGenerate,
  onRenamed,
  onSaveAsProject,
  onSelectPreset,
  open,
  project,
  selectedPresetKey,
  status
}: PhotoPopoverProps) {
  const messages = useMessages();
  const t = messages.photo;
  const isBusy = status.phase === "working" || status.phase === "creating";
  const nameId = useId();
  const [projectName, setProjectName] = useState(t.defaultProjectName);

  function createProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onCreateProject(projectName.trim() || t.defaultProjectName);
  }

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
            aria-label={t.label}
            className="w-full max-w-xl rounded-card border border-hairline bg-charcoal/[.96] p-6 backdrop-blur-[24px] md:p-8"
            exit={{ opacity: 0, y: OVERLAY_SLIDE }}
            initial={{ opacity: 0, y: OVERLAY_SLIDE }}
            onClick={(event) => event.stopPropagation()}
            transition={{ duration: DURATION.overlay, ease: SIGNATURE_EASE }}
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <div className="flex flex-col gap-3">
                <Label>{t.label}</Label>
                <h2 className="m-0 text-panel">
                  <Emphasized text={t.title} />
                </h2>
              </div>
              <RoundButton aria-label={messages.common.close} disabled={isBusy} onClick={onClose} tone="quiet">
                <X aria-hidden="true" size={14} strokeWidth={1.5} />
              </RoundButton>
            </div>

            {project && (
              <div className="mb-6 flex items-center justify-between gap-4 border-b border-hairline pb-4">
                <Label as="span">{t.project}</Label>
                <ProjectNameField name={project.name} onRenamed={onRenamed} projectId={project.id} />
              </div>
            )}

            {status.phase === "name" && (
              <form onSubmit={createProject}>
                <p className="m-0 text-pretty text-body text-graphite">{t.nameIntro}</p>
                <div className="mt-6">
                  <FieldLabel htmlFor={nameId}>{t.projectName}</FieldLabel>
                  <TextField
                    autoFocus
                    className="h-12 text-body"
                    id={nameId}
                    maxLength={120}
                    onChange={(event) => setProjectName(event.target.value)}
                    onFocus={(event) => event.currentTarget.select()}
                    placeholder={t.defaultProjectName}
                    value={projectName}
                  />
                </div>
                <Pill
                  className="mt-6 w-full"
                  leading={<Camera aria-hidden="true" size={15} strokeWidth={1.5} />}
                  type="submit"
                >
                  {t.createAndShoot}
                </Pill>
              </form>
            )}

            {status.phase === "creating" && (
              <div>
                <div className="relative aspect-video w-full overflow-hidden rounded-card bg-canvas">
                  <motion.div
                    animate={{ x: ["-100%", "100%"] }}
                    className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/25 to-transparent"
                    transition={{ duration: 1.6, ease: "easeInOut", repeat: Infinity }}
                  />
                </div>
                <p aria-live="polite" className="m-0 mt-5 text-center text-body text-graphite">
                  {t.creating}
                </p>
              </div>
            )}

            {status.phase === "blocked" && (
              <div>
                <p className="m-0 text-pretty text-body text-graphite">
                  {status.reason === "guest" ? t.guestBlocked : t.notYetSaved}
                </p>
                {status.reason === "guest" && (
                  <Pill className="mt-6" onClick={onSaveAsProject}>
                    {messages.configurator.saveAsProject}
                  </Pill>
                )}
              </div>
            )}

            {(status.phase === "idle" || status.phase === "error") && (
              <>
                <p className="m-0 text-pretty text-body text-graphite">{t.chooseScene}</p>
                <div aria-label={t.scene} className="mt-5 flex flex-wrap gap-2" role="group">
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
                  {t.shoot}
                </Pill>
              </>
            )}

            {status.phase === "working" && (
              <div>
                <div className="relative aspect-video w-full overflow-hidden rounded-card bg-canvas">
                  {status.preview && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      alt={t.capturedAlt}
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
                  {status.step === "uploading" ? t.uploading : t.generating}
                </p>
              </div>
            )}

            {status.phase === "done" && (
              <div>
                <div className="aspect-video w-full overflow-hidden rounded-card bg-canvas">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    alt={t.resultAlt}
                    className="size-full object-cover"
                    src={status.imageUrl}
                  />
                </div>
                <p className="m-0 mt-3 text-caption text-graphite">
                  {messages.gallery.disclosure} {t.keptWithProject}
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
                      void downloadPhoto(status.photoId, t.downloadFilename);
                    }}
                  >
                    {messages.common.download}
                  </Pill>
                  <RoundButton
                    aria-label={t.newPhoto}
                    onClick={onGenerate}
                    title={t.again}
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

async function downloadPhoto(photoId: string, fallbackFilename: string) {
  const response = await fetch(`/api/photos/${photoId}`, { cache: "no-store" });
  const payload = (await response.json().catch(() => null)) as {
    url?: string;
    filename?: string;
  } | null;
  if (!payload?.url) return;

  const anchor = document.createElement("a");
  anchor.href = payload.url;
  anchor.download = payload.filename ?? fallbackFilename;
  anchor.rel = "noopener";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
}
