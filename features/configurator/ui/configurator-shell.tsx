"use client";

import { useProgress } from "@react-three/drei";
import {
  Camera,
  Check,
  Copy,
  PanelRightClose,
  RotateCcw,
  ScanLine,
  SlidersHorizontal
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { BrandLogo } from "@/components/design-system/brand-logo";
import { preloadApartmentModel } from "@/features/configurator/engine/apartment-model";
import { ConfiguratorCanvas } from "@/features/configurator/engine/configurator-canvas";
import {
  findFinish,
  formatCurrency,
  getConfiguratorQuote,
  getLocalizedLabel,
  normalizeConfiguratorState,
  RDTD_KITCHEN_PRODUCT
} from "@/features/configurator/product-definition";
import { PHOTO_PRESETS } from "@/features/configurator/photo/photo-presets";
import { PhotoPopover, type PhotoStatus } from "@/features/configurator/photo/photo-popover";
import { useSceneCapture } from "@/features/configurator/photo/use-scene-capture";
import {
  CONFIG_QUERY_PARAM,
  decodeConfiguration,
  encodeConfiguration
} from "@/features/configurator/state-codec";
import type {
  CameraView,
  ConfiguratorState,
  FinishOption,
  LocaleCode,
  VisualizationMode
} from "@/features/configurator/types";
import {
  useProjectAutosave
} from "@/features/projects/ui/use-project-autosave";
import type { EditableProject } from "@/features/projects/ui/project-editor-types";
import { ProjectVersions } from "@/features/projects/ui/project-versions";

type ConfiguratorShellProps = {
  initialState: ConfiguratorState;
  locale?: LocaleCode;
  project?: EditableProject;
};

const cameraViews: { key: CameraView; label: string }[] = [
  { key: "signature", label: "Raum" },
  { key: "front", label: "Front" },
  { key: "detail", label: "Detail" }
];

export function ConfiguratorShell({
  initialState,
  locale = "de",
  project
}: ConfiguratorShellProps) {
  const [config, setConfig] = useState(() => normalizeConfiguratorState(initialState));
  const [cameraView, setCameraView] = useState<CameraView>("signature");
  const [copied, setCopied] = useState(false);
  const [isConfigPanelOpen, setConfigPanelOpen] = useState(true);
  const [visualization, setVisualization] = useState<VisualizationMode>("studio");
  const [isPending, startTransition] = useTransition();
  const [isPhotoOpen, setPhotoOpen] = useState(false);
  const [pathTracing, setPathTracing] = useState(false);
  const [renderRequested, setRenderRequested] = useState(false);
  const [photoPresetKey, setPhotoPresetKey] = useState(PHOTO_PRESETS[0].key);
  const [photoStatus, setPhotoStatus] = useState<PhotoStatus>({ phase: "idle" });
  const { captureRef, capturePhoto } = useSceneCapture();

  const cabinetColor = findFinish(RDTD_KITCHEN_PRODUCT.cabinetColors, config.cabinetColorKey);
  const frontColor = findFinish(RDTD_KITCHEN_PRODUCT.frontColors, config.frontColorKey);
  const quote = getConfiguratorQuote(config);
  const encodedConfig = encodeConfiguration(config);
  const checkoutHref = `/checkout?${CONFIG_QUERY_PARAM}=${encodedConfig}`;
  const renderActive = pathTracing || renderRequested;

  useEffect(() => {
    const path = project
      ? `/configure?project=${project.id}`
      : `/configure?${CONFIG_QUERY_PARAM}=${encodedConfig}`;
    window.history.replaceState(null, "", path);
  }, [encodedConfig, project]);

  useEffect(() => {
    const timeout = window.setTimeout(preloadApartmentModel, 450);

    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!renderRequested) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setPathTracing(true);
      setRenderRequested(false);
    }, 80);

    return () => window.clearTimeout(timeout);
  }, [renderRequested]);

  function stopRender() {
    setRenderRequested(false);
    setPathTracing(false);
  }

  function updateConfig(next: Partial<ConfiguratorState>) {
    stopRender();
    startTransition(() => {
      setConfig((current) => normalizeConfiguratorState({ ...current, ...next }));
    });
  }

  function selectCameraView(view: CameraView) {
    stopRender();
    setCameraView(view);
  }

  function selectVisualization(mode: VisualizationMode) {
    stopRender();
    setVisualization(mode);
  }

  async function copyShareUrl() {
    const path = `/configure?${CONFIG_QUERY_PARAM}=${encodedConfig}`;
    const shareUrl = `${window.location.origin}${path}`;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  function saveConfigurationAsProject(configurationCode: string) {
    const query = new URLSearchParams({
      intent: "save",
      import: crypto.randomUUID(),
      [CONFIG_QUERY_PARAM]: configurationCode
    });
    window.location.assign(`/konto?${query.toString()}`);
  }

  function restoreProjectDraft(configurationCode: string) {
    const restored = decodeConfiguration(configurationCode);
    if (!restored) return false;
    stopRender();
    setConfig(restored);
    return true;
  }

  function openPhoto() {
    stopRender();
    setPhotoStatus({ phase: "idle" });
    setPhotoOpen(true);
  }

  function togglePathTracing() {
    setPhotoOpen(false);
    if (renderActive) {
      stopRender();
      return;
    }

    setRenderRequested(true);
  }

  async function generatePhoto() {
    const preview = capturePhoto();
    if (!preview) {
      setPhotoStatus({
        phase: "error",
        message: "Die Szene konnte nicht aufgenommen werden. Bitte versuche es erneut."
      });
      return;
    }

    setPhotoStatus({ phase: "generating", preview });

    try {
      const response = await fetch("/api/photo", {
        body: JSON.stringify({
          cabinetColorKey: config.cabinetColorKey,
          frontColorKey: config.frontColorKey,
          image: preview,
          presetKey: photoPresetKey
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST"
      });

      const payload = (await response.json()) as { image?: string; error?: string };
      if (!response.ok || !payload.image) {
        throw new Error(payload.error ?? "Generation failed.");
      }

      setPhotoStatus({ phase: "done", image: payload.image, preview });
    } catch (error) {
      setPhotoStatus({
        phase: "error",
        message:
          error instanceof Error && error.message
            ? error.message
            : "Das Foto konnte nicht erstellt werden. Bitte versuche es erneut."
      });
    }
  }

  function resetConfiguration() {
    updateConfig({
      cabinetColorKey: "graphite",
      frontColorKey: "porcelain",
      layout: "straight-line"
    });
    setCameraView("signature");
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-canvas text-ink">
      <div className="absolute inset-0">
        <ConfiguratorCanvas
          cameraView={cameraView}
          captureRef={captureRef}
          onCameraInteraction={stopRender}
          pathTracing={pathTracing}
          state={config}
          visualization={visualization}
        />
      </div>

      <VisualizationPreloader active={visualization === "apartment"} />

      <CameraControlOverlay
        activeView={cameraView}
        isConfigPanelOpen={isConfigPanelOpen}
        onPhoto={openPhoto}
        onRender={togglePathTracing}
        onSelect={selectCameraView}
        renderActive={renderActive}
      />

      <PhotoPopover
        locale={locale}
        onClose={() => setPhotoOpen(false)}
        onGenerate={generatePhoto}
        onSelectPreset={setPhotoPresetKey}
        open={isPhotoOpen}
        selectedPresetKey={photoPresetKey}
        status={photoStatus}
      />

      <AnimatePresence initial={false}>
        {!isConfigPanelOpen && (
          <motion.button
            animate={{ opacity: 1, x: 0 }}
            aria-expanded={false}
            aria-label="Konfiguration einblenden"
            className="fixed right-4 top-20 z-30 inline-flex min-h-11 items-center gap-2.5 border border-ink bg-ink px-5 text-body leading-none text-paper transition-colors hover:bg-transparent hover:text-ink lg:right-8 lg:top-8"
            exit={{ opacity: 0, x: 14 }}
            initial={{ opacity: 0, x: 14 }}
            onClick={() => setConfigPanelOpen(true)}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            type="button"
          >
            <SlidersHorizontal aria-hidden="true" size={15} strokeWidth={1.5} />
            Konfiguration
          </motion.button>
        )}
      </AnimatePresence>

      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="pointer-events-none relative z-10 flex min-h-screen flex-col justify-between lg:flex-row"
        initial={{ opacity: 0, y: 14 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="pointer-events-auto flex h-fit items-center justify-between gap-6 p-5 md:p-6 lg:p-8">
          <BrandLogo compact href="/" tone="dark" />
          <Link
            className="group inline-flex items-center gap-2 text-body leading-none text-graphite transition-colors hover:text-ink"
            href={project ? "/konto" : "/"}
          >
            <svg
              aria-hidden="true"
              className="size-3 transition-transform duration-300 ease-signature group-hover:-translate-x-0.5"
              fill="none"
              viewBox="0 0 12 12"
            >
              <path
                d="M10 6H2m0 0 4-4M2 6l4 4"
                stroke="currentColor"
                strokeLinecap="square"
                strokeWidth="1.2"
              />
            </svg>
            {project ? "Meine Projekte" : "Zurück"}
          </Link>
        </div>

        <AnimatePresence initial={false}>
          {isConfigPanelOpen && (
            <motion.section
              animate={{ opacity: 1, x: 0 }}
              className="pointer-events-auto mt-[56vh] w-full border-t border-hairline bg-canvas p-6 md:p-8 lg:mt-0 lg:min-h-screen lg:w-[27rem] lg:self-stretch lg:overflow-y-auto lg:border-l lg:border-t-0"
              exit={{ opacity: 0, x: 32 }}
              initial={{ opacity: 0, x: 28 }}
              transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
            >
              <motion.div
                animate="show"
                initial="hidden"
                variants={{
                  hidden: {},
                  show: { transition: { staggerChildren: 0.06 } }
                }}
              >
                <motion.div
                  variants={{
                    hidden: { opacity: 0, y: 12 },
                    show: { opacity: 1, y: 0, transition: { duration: 0.5 } }
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <p className="text-body uppercase tracking-[0.22em] text-graphite">
                      Konfigurator
                    </p>
                    <button
                      aria-expanded={true}
                      aria-label="Konfiguration ausblenden"
                      className="grid size-9 place-items-center border border-hairline text-graphite transition-colors hover:border-ink hover:text-ink"
                      onClick={() => setConfigPanelOpen(false)}
                      type="button"
                    >
                      <PanelRightClose aria-hidden="true" size={15} strokeWidth={1.5} />
                    </button>
                  </div>
                  <h1 className="mt-5 text-lead text-ink">
                    {getLocalizedLabel(RDTD_KITCHEN_PRODUCT.title, locale)}
                    <span className="text-signature">.</span>
                  </h1>
                  <p className="mt-3 text-pretty text-body text-graphite">
                    {getLocalizedLabel(RDTD_KITCHEN_PRODUCT.description, locale)}
                  </p>
                </motion.div>

                <VisualizationTabs active={visualization} onSelect={selectVisualization} />

                <motion.div
                  className="mt-8 flex items-baseline justify-between gap-4 border-t border-hairline pt-6"
                  variants={{
                    hidden: { opacity: 0, y: 12 },
                    show: { opacity: 1, y: 0, transition: { duration: 0.5 } }
                  }}
                >
                  <p className="text-body text-graphite">Layout</p>
                  <p className="text-body text-ink">Küchenzeile, gerade</p>
                </motion.div>

                <ControlGroup title="Korpus">
                  <FinishPicker
                    activeKey={cabinetColor.key}
                    locale={locale}
                    onSelect={(key) => updateConfig({ cabinetColorKey: key })}
                    options={RDTD_KITCHEN_PRODUCT.cabinetColors}
                  />
                </ControlGroup>

                <ControlGroup title="Front">
                  <FinishPicker
                    activeKey={frontColor.key}
                    locale={locale}
                    onSelect={(key) => updateConfig({ frontColorKey: key })}
                    options={RDTD_KITCHEN_PRODUCT.frontColors}
                  />
                </ControlGroup>

                <motion.div
                  className="mt-8 space-y-5 border-t border-hairline pt-6"
                  variants={{
                    hidden: { opacity: 0, y: 12 },
                    show: { opacity: 1, y: 0, transition: { duration: 0.5 } }
                  }}
                >
                  <div className="flex items-baseline justify-between gap-4">
                    <p className="text-body text-graphite">Richtpreis</p>
                    <p className="text-lead text-ink">
                      {formatCurrency(quote.totalCents, locale)}
                    </p>
                  </div>

                  {project ? (
                    <ProjectSaveControls
                      configurationCode={encodedConfig}
                      onSaveAsNew={saveConfigurationAsProject}
                      onRestore={restoreProjectDraft}
                      project={project}
                    />
                  ) : (
                    <button
                      className="inline-flex min-h-12 w-full items-center justify-center bg-signature px-5 text-body leading-none text-paper transition-colors hover:bg-ink"
                      onClick={() => saveConfigurationAsProject(encodedConfig)}
                      type="button"
                    >
                      Als Projekt speichern
                    </button>
                  )}

                  <div className="grid grid-cols-[1fr_auto_auto] gap-2">
                    <a
                      className="inline-flex min-h-11 items-center justify-center border border-ink bg-ink px-5 text-body leading-none text-paper transition-colors hover:bg-transparent hover:text-ink"
                      href={checkoutHref}
                    >
                      Konfiguration anfragen
                    </a>
                    <button
                      aria-label="Share URL kopieren"
                      className="grid size-11 place-items-center border border-hairline text-graphite transition-colors hover:border-ink hover:text-ink"
                      onClick={copyShareUrl}
                      title="Share URL kopieren"
                      type="button"
                    >
                      {copied ? (
                        <Check aria-hidden="true" size={16} strokeWidth={1.5} />
                      ) : (
                        <Copy aria-hidden="true" size={16} strokeWidth={1.5} />
                      )}
                    </button>
                    <button
                      aria-label="Konfiguration zurücksetzen"
                      className="grid size-11 place-items-center border border-hairline text-graphite transition-colors hover:border-ink hover:text-ink"
                      onClick={resetConfiguration}
                      title="Konfiguration zurücksetzen"
                      type="button"
                    >
                      <RotateCcw aria-hidden="true" size={16} strokeWidth={1.5} />
                    </button>
                  </div>

                  <p className="min-h-5 text-body text-ash">
                    {isPending
                      ? "Aktualisiere Szene …"
                      : copied
                        ? "Share-Link kopiert."
                        : project
                          ? "Der Share-Link enthält einen unabhängigen Schnappschuss."
                          : "Ihre Konfiguration wird in der URL gespeichert."}
                  </p>
                </motion.div>
              </motion.div>
            </motion.section>
          )}
        </AnimatePresence>
      </motion.div>
    </main>
  );
}

function ProjectSaveControls({
  configurationCode,
  onSaveAsNew,
  onRestore,
  project
}: {
  configurationCode: string;
  onSaveAsNew: (configurationCode: string) => void;
  onRestore: (configurationCode: string) => boolean;
  project: EditableProject;
}) {
  const { discardRecovery, restoreRecovery, retry, status } = useProjectAutosave({
    configurationCode,
    onRestore,
    project
  });

  if (status.phase === "recovery") {
    return (
      <div aria-live="polite" className="border-y border-ink py-5">
        <p className="text-body text-ink">Lokaler Entwurf gefunden.</p>
        <p className="mt-2 text-sm leading-6 text-graphite">
          Eine noch nicht bestätigte Änderung aus diesem Browser wartet seit{" "}
          {new Intl.DateTimeFormat("de-DE", {
            hour: "2-digit",
            minute: "2-digit"
          }).format(new Date(status.updatedAt))} Uhr auf Sie.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <button
            className="min-h-11 bg-ink px-4 text-body text-paper transition-colors hover:bg-signature"
            onClick={restoreRecovery}
            type="button"
          >
            Entwurf wiederherstellen
          </button>
          <button
            className="min-h-11 border border-ink px-4 text-body text-ink transition-colors hover:bg-ink hover:text-paper"
            onClick={discardRecovery}
            type="button"
          >
            Entwurf verwerfen
          </button>
        </div>
      </div>
    );
  }

  if (status.phase === "stale-recovery") {
    return (
      <div aria-live="assertive" className="border-y border-signature py-5">
        <p className="text-body text-ink">Älterer lokaler Entwurf gefunden.</p>
        <p className="mt-2 text-sm leading-6 text-graphite">
          Das Projekt wurde seitdem geändert. Der lokale Entwurf kann deshalb nur
          als neues Projekt gesichert oder verworfen werden.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <button
            className="min-h-11 bg-ink px-4 text-body text-paper transition-colors hover:bg-signature"
            onClick={() => {
              discardRecovery();
              onSaveAsNew(status.configurationCode);
            }}
            type="button"
          >
            Als neues Projekt
          </button>
          <button
            className="min-h-11 border border-ink px-4 text-body text-ink transition-colors hover:bg-ink hover:text-paper"
            onClick={discardRecovery}
            type="button"
          >
            Entwurf verwerfen
          </button>
        </div>
      </div>
    );
  }

  if (status.phase === "conflict") {
    return (
      <div aria-live="assertive" className="border-y border-signature py-5">
        <p className="text-body text-ink">Neuere Projektversion gefunden.</p>
        <p className="mt-2 text-sm leading-6 text-graphite">
          Ihre Änderung wurde nicht überschrieben. Laden Sie den neuesten Stand
          oder sichern Sie diese Variante als neues Projekt.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <button
            className="min-h-11 bg-ink px-4 text-body text-paper transition-colors hover:bg-signature"
            onClick={() => {
              discardRecovery();
              window.location.reload();
            }}
            type="button"
          >
            Neueste Version laden
          </button>
          <button
            className="min-h-11 border border-ink px-4 text-body text-ink transition-colors hover:bg-ink hover:text-paper"
            onClick={() => {
              discardRecovery();
              onSaveAsNew(configurationCode);
            }}
            type="button"
          >
            Als neues Projekt
          </button>
        </div>
      </div>
    );
  }

  if (status.phase === "error") {
    return (
      <div aria-live="assertive" className="border-y border-signature py-5">
        <p className="text-sm leading-6 text-signature">{status.message}</p>
        <button
          className="mt-4 min-h-11 bg-ink px-5 text-body text-paper transition-colors hover:bg-signature"
          onClick={status.requiresSignIn ? () => window.location.reload() : retry}
          type="button"
        >
          {status.requiresSignIn ? "Erneut anmelden" : "Erneut speichern"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div
        aria-live="polite"
        className="flex min-w-0 items-baseline justify-between gap-4"
      >
        <p className="min-w-0 truncate text-body text-ink" title={project.name}>
          {project.name}
        </p>
        <p className="shrink-0 text-sm text-graphite">
          {status.phase === "saving"
            ? "Speichert …"
            : status.phase === "pending"
              ? "Änderung erkannt …"
              : `Gespeichert ${new Intl.DateTimeFormat("de-DE", {
                  hour: "2-digit",
                  minute: "2-digit"
                }).format(new Date(status.savedAt))}`}
        </p>
      </div>
      <ProjectVersions
        initialRevisions={project.revisions}
        initialNextCursor={project.revisionNextCursor}
        initialTotalCount={project.revisionTotalCount}
        projectId={project.id}
        savedVersion={status.phase === "saved" ? status.savedVersion : null}
      />
    </div>
  );
}

function VisualizationPreloader({ active }: { active: boolean }) {
  const isLoading = useProgress((state) => state.active);
  const progress = useProgress((state) => state.progress);
  const roundedProgress = Math.max(0, Math.min(100, Math.round(progress)));
  const visible = active && isLoading;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          animate={{ opacity: 1 }}
          aria-live="polite"
          className="fixed inset-0 z-[60] bg-canvas text-ink"
          exit={{ opacity: 0 }}
          initial={{ opacity: 0 }}
          role="status"
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="flex min-h-full flex-col px-6 py-6 md:px-10 md:py-8">
            <div className="flex items-center justify-between border-b border-hairline pb-5">
              <p className="text-body uppercase tracking-[0.22em] text-graphite">
                rotpunkt Signature
              </p>
              <p className="text-body tabular-nums text-graphite">{roundedProgress}%</p>
            </div>

            <motion.div
              animate={{ opacity: 1, y: 0 }}
              className="my-auto w-full max-w-[38rem]"
              initial={{ opacity: 0, y: 16 }}
              transition={{ delay: 0.08, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            >
              <p className="text-body uppercase tracking-[0.22em] text-graphite">
                Visualisierung
              </p>
              <h2 className="mt-6 text-lead leading-tight text-ink md:text-display">
                Appartement wird geladen<span className="text-signature">.</span>
              </h2>
              <div className="mt-10 h-px overflow-hidden bg-hairline" aria-hidden="true">
                <motion.div
                  animate={{ width: `${Math.max(3, roundedProgress)}%` }}
                  className="h-full bg-signature"
                  initial={{ width: "3%" }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
              <p className="mt-4 text-body text-graphite">
                Raum, Materialien und Licht werden vorbereitet.
              </p>
            </motion.div>

            <div className="flex items-center justify-between border-t border-hairline pt-5 text-body text-graphite">
              <span>3D Konfigurator</span>
              <span>Appartement</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function VisualizationTabs({
  active,
  onSelect
}: {
  active: VisualizationMode;
  onSelect: (mode: VisualizationMode) => void;
}) {
  const options: { key: VisualizationMode; label: string }[] = [
    { key: "studio", label: "Studio" },
    { key: "apartment", label: "Appartement" }
  ];

  return (
    <motion.div
      className="mt-8 border-t border-hairline pt-6"
      variants={{
        hidden: { opacity: 0, y: 12 },
        show: { opacity: 1, y: 0, transition: { duration: 0.5 } }
      }}
    >
      <p className="mb-4 text-body text-graphite">Visualisierung</p>
      <div
        aria-label="Visualisierung"
        className="grid grid-cols-2 divide-x divide-hairline border border-hairline"
        role="tablist"
      >
        {options.map((option) => {
          const isActive = active === option.key;

          return (
            <button
              aria-selected={isActive}
              className={`min-h-11 px-4 text-body transition-colors ${
                isActive ? "bg-ink text-paper" : "text-graphite hover:text-ink"
              }`}
              key={option.key}
              onClick={() => onSelect(option.key)}
              role="tab"
              type="button"
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}

function CameraControlOverlay({
  activeView,
  isConfigPanelOpen,
  onPhoto,
  onRender,
  onSelect,
  renderActive
}: {
  activeView: CameraView;
  isConfigPanelOpen: boolean;
  onPhoto: () => void;
  onRender: () => void;
  onSelect: (view: CameraView) => void;
  renderActive: boolean;
}) {
  return (
    <div
      className={`pointer-events-auto z-20 w-[min(calc(100vw-2.5rem),30rem)] -translate-x-1/2 ${
        isConfigPanelOpen
          ? "absolute left-1/2 top-[calc(56vh-4.5rem)] lg:fixed lg:bottom-8 lg:left-[calc((100vw-27rem)/2)] lg:top-auto"
          : "fixed bottom-6 left-1/2"
      }`}
    >
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-[repeat(3,minmax(0,1fr))_3.25rem_3.25rem] divide-x divide-hairline border border-hairline bg-canvas sm:grid-cols-[repeat(3,minmax(0,1fr))_auto_auto]"
        initial={{ opacity: 0, y: 12 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      >
        {cameraViews.map((viewOption) => (
          <CameraViewButton
            active={activeView === viewOption.key}
            key={viewOption.key}
            label={viewOption.label}
            onClick={() => onSelect(viewOption.key)}
          />
        ))}
        <button
          aria-label="AI Foto"
          className="inline-flex min-h-11 items-center justify-center gap-2 bg-ink px-3 text-body leading-none text-paper transition-colors hover:bg-graphite"
          onClick={onPhoto}
          title="AI Foto"
          type="button"
        >
          <Camera aria-hidden="true" size={15} strokeWidth={1.5} />
          <span className="hidden sm:inline">Foto</span>
        </button>
        <button
          aria-label={renderActive ? "3D Render beenden" : "3D Render starten"}
          aria-pressed={renderActive}
          className={`inline-flex min-h-11 items-center justify-center gap-2 px-3 text-body leading-none transition-colors ${
            renderActive
              ? "bg-signature text-paper hover:bg-ink"
              : "bg-graphite text-paper hover:bg-signature"
          }`}
          onClick={onRender}
          title={renderActive ? "3D Render beenden" : "3D Render starten"}
          type="button"
        >
          <ScanLine aria-hidden="true" size={15} strokeWidth={1.5} />
          <span className="hidden sm:inline">Render</span>
        </button>
      </motion.div>
    </div>
  );
}

function CameraViewButton({
  active,
  label,
  onClick
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-pressed={active}
      className={`inline-flex min-h-11 items-center justify-center gap-2 px-3 text-body leading-none transition-colors ${
        active ? "text-ink" : "text-graphite hover:text-ink"
      }`}
      onClick={onClick}
      type="button"
    >
      {active && <span aria-hidden="true" className="size-1.5 rounded-full bg-signature" />}
      {label}
    </button>
  );
}

function ControlGroup({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <motion.div
      className="mt-8 border-t border-hairline pt-6"
      variants={{
        hidden: { opacity: 0, y: 12 },
        show: { opacity: 1, y: 0, transition: { duration: 0.5 } }
      }}
    >
      <h2 className="mb-4 text-body text-ink">{title}</h2>
      {children}
    </motion.div>
  );
}

function FinishPicker({
  activeKey,
  locale,
  onSelect,
  options
}: {
  activeKey: string;
  locale: LocaleCode;
  onSelect: (key: string) => void;
  options: FinishOption[];
}) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {options.map((option) => {
        const isActive = activeKey === option.key;
        return (
          <button
            aria-pressed={isActive}
            className="group text-left"
            key={option.key}
            onClick={() => onSelect(option.key)}
            title={getLocalizedLabel(option.label, locale)}
            type="button"
          >
            <span
              aria-hidden="true"
              className={`block aspect-[4/3] w-full border bg-cover bg-center transition-colors ${
                isActive ? "border-ink" : "border-hairline group-hover:border-graphite"
              }`}
              style={
                option.textureUrl
                  ? { backgroundColor: option.hex, backgroundImage: `url(${option.textureUrl})` }
                  : { backgroundColor: option.hex }
              }
            />
            <span
              className={`mt-2 flex items-center gap-1.5 text-body leading-tight ${
                isActive ? "text-ink" : "text-graphite"
              }`}
            >
              {isActive && (
                <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-signature" />
              )}
              {getLocalizedLabel(option.label, locale)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
