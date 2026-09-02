"use client";

import { useProgress } from "@react-three/drei";
import {
  Camera,
  Check,
  Copy,
  PanelRightClose,
  Pencil,
  RotateCcw,
  ScanLine,
  SlidersHorizontal
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { AppHeader } from "@/components/design-system/app-header";
import { preloadAppartement2Model } from "@/features/configurator/engine/appartement2-model";
import { ConfiguratorCanvas } from "@/features/configurator/engine/configurator-canvas";
import {
  findFinish,
  getConfiguratorQuote,
  getLocalizedLabel,
  normalizeConfiguratorState,
  RDTD_KITCHEN_PRODUCT_V2
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
  ConfiguratorQuote,
  ConfiguratorState,
  FinishOption,
  LocaleCode,
  VisualizationMode
} from "@/features/configurator/types";
import {
  canAddModule,
  MODULE_SHORT_LABEL,
  SceneEditBar,
  type EditDraft
} from "@/features/configurator/ui/module-editor";
import { PriceBreakdown } from "@/features/configurator/ui/price-breakdown";
import type {
  EditTarget,
  KitchenEditProps
} from "@/features/configurator/engine/kitchen-model";
import { useProjectAutosave } from "@/features/projects/ui/use-project-autosave";
import type { EditableProject } from "@/features/projects/ui/project-editor-types";
import { galleryPageKey } from "@/features/photo-gallery/serialize-gallery";
import { PhotoGallery } from "@/features/photo-gallery/ui/photo-gallery";
import { ProjectVersions } from "@/features/projects/ui/project-versions";
import type { RevisionDisplaySnapshot } from "@/features/projects/revision-display";
import { ProjectShareLinks } from "@/features/sharing/ui/project-share-links";

type ConfiguratorShellProps = {
  initialState: ConfiguratorState;
  locale?: LocaleCode;
  project?: EditableProject;
  sharedView?: {
    displaySnapshot: RevisionDisplaySnapshot | null;
    expiresAt: string;
  };
};

/**
 * The three decisions a customer makes, in the order they are usually made.
 * One is visible at a time; the scene stays persistent across all three.
 */
type PlanningStage = "material" | "layout" | "review";

const planningStages: { key: PlanningStage; label: string }[] = [
  { key: "material", label: "Material" },
  { key: "layout", label: "Aufbau" },
  { key: "review", label: "Prüfen" }
];

type PhotoJobWatchOutcome =
  | { kind: "succeeded"; generatedPhotoId: string }
  | { kind: "failed"; reason: string | null }
  | { kind: "timeout" };

/** Polls a submitted Photo Job until it is terminal; about three minutes at most. */
async function waitForPhotoJob(
  jobId: string,
  { attempts = 72, intervalMs = 2500 } = {}
): Promise<PhotoJobWatchOutcome> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    await new Promise((resolve) => window.setTimeout(resolve, intervalMs));
    const response = await fetch(`/api/photo-jobs/${jobId}`, { cache: "no-store" });
    const payload = (await response.json().catch(() => null)) as {
      job?: { state: string; failureReason: string | null; generatedPhotoId: string | null };
    } | null;
    const job = payload?.job;
    if (!response.ok || !job) continue;
    if (job.state === "succeeded" && job.generatedPhotoId) {
      return { kind: "succeeded", generatedPhotoId: job.generatedPhotoId };
    }
    if (job.state === "failed" || job.state === "canceled") {
      return { kind: "failed", reason: job.failureReason };
    }
  }
  return { kind: "timeout" };
}

function describePhotoFailure(reason: string | null) {
  switch (reason) {
    case "provider-disabled":
    case "provider-not-configured":
      return "Die Fotoerzeugung ist derzeit nicht verfügbar.";
    case "provider-timeout":
      return "Die Erzeugung hat zu lange gedauert und wurde abgebrochen.";
    case "provider-rate-limited":
      return "Der Dienst ist gerade ausgelastet. Bitte versuchen Sie es in Kürze erneut.";
    case "canceled-by-owner":
      return "Die Erzeugung wurde abgebrochen.";
    default:
      return "Das Foto konnte nicht erstellt werden.";
  }
}

const cameraViews: { key: CameraView; label: string }[] = [
  { key: "signature", label: "Raum" },
  { key: "front", label: "Front" },
  { key: "detail", label: "Detail" }
];

export function ConfiguratorShell({
  initialState,
  locale = "de",
  project,
  sharedView
}: ConfiguratorShellProps) {
  const [config, setConfig] = useState(() => normalizeConfiguratorState(initialState));
  const [cameraView, setCameraView] = useState<CameraView>("signature");
  const [copied, setCopied] = useState(false);
  const [isConfigPanelOpen, setConfigPanelOpen] = useState(true);
  const [visualization, setVisualization] = useState<VisualizationMode>("studio");
  const [stage, setStage] = useState<PlanningStage>("material");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const [isPhotoOpen, setPhotoOpen] = useState(false);
  const [pathTracing, setPathTracing] = useState(false);
  const [renderRequested, setRenderRequested] = useState(false);
  const [photoPresetKey, setPhotoPresetKey] = useState(PHOTO_PRESETS[0].key);
  const [photoStatus, setPhotoStatus] = useState<PhotoStatus>({ phase: "idle" });
  const [editSession, setEditSession] = useState<{
    draft: EditDraft;
    selected: EditTarget;
  } | null>(null);
  const { captureRef, capturePhoto } = useSceneCapture();

  const cabinetColor = findFinish(RDTD_KITCHEN_PRODUCT_V2.cabinetColors, config.cabinetColorKey);
  const frontColor = findFinish(RDTD_KITCHEN_PRODUCT_V2.frontColors, config.frontColorKey);
  // While an Edit Session is open, the scene and price preview the staged
  // draft; the committed configuration (URL, autosave, Quote Request) is
  // untouched until the session is applied.
  const effectiveConfig = editSession
    ? normalizeConfiguratorState({ ...config, ...editSession.draft })
    : config;
  const quote = getConfiguratorQuote(effectiveConfig);
  // A shared view must never fall back to the live recomputed price: the
  // pinned snapshot is the only truthful source for a historical revision.
  const displayedTotalCents = sharedView
    ? sharedView.displaySnapshot?.totalCents ?? null
    : quote.totalCents;
  const displayedCurrency = sharedView
    ? sharedView.displaySnapshot?.currency ?? "EUR"
    : quote.currency;
  const encodedConfig = encodeConfiguration(config);
  // The commercial handoff pins an immutable revision of a Project, so a
  // saved Project goes straight to the request; a guest is asked to save first.
  const quoteRequestHref = project
    ? `/anfrage?project=${project.id}`
    : `/anfrage?${CONFIG_QUERY_PARAM}=${encodedConfig}`;
  const renderActive = pathTracing || renderRequested;

  useEffect(() => {
    if (sharedView) return;
    const path = project
      ? `/configure?project=${project.id}`
      : `/configure?${CONFIG_QUERY_PARAM}=${encodedConfig}`;
    window.history.replaceState(null, "", path);
  }, [encodedConfig, project, sharedView]);

  useEffect(() => {
    const apartmentTimer = window.setTimeout(preloadAppartement2Model, 1200);

    return () => {
      window.clearTimeout(apartmentTimer);
    };
  }, []);

  // A Photo Job survives the browser (PLAN.md Phase 5): if this Project has one
  // in flight when the page loads, pick it up again instead of leaving the
  // customer to guess whether anything is still happening.
  const projectId = project?.id ?? null;
  useEffect(() => {
    if (!projectId) return;
    const abort = new AbortController();

    async function resume() {
      const response = await fetch(`/api/projects/${projectId}/photo-jobs`, {
        cache: "no-store",
        signal: abort.signal
      });
      const payload = (await response.json().catch(() => null)) as {
        jobs?: Array<{ id: string; state: string }>;
      } | null;
      const inFlight = payload?.jobs?.find((job) =>
        ["submitted", "running", "validating", "uncertain"].includes(job.state)
      );
      if (!inFlight || abort.signal.aborted) return;
      setPhotoStatus({ phase: "working", step: "generating", preview: null });
      setPhotoOpen(true);
      await watchPhotoJob(projectId!, inFlight.id, null);
    }

    void resume().catch((error: unknown) => {
      if (error instanceof DOMException && error.name === "AbortError") return;
    });
    return () => abort.abort();
    // watchPhotoJob is stable for the life of the shell; re-running on every
    // render would restart the watch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

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

  function enterEditSession() {
    if (sharedView || editSession) return;
    stopRender();
    setPhotoOpen(false);
    setVisualization("studio");
    setCameraView("front");
    setStage("layout");
    setEditSession({
      draft: {
        wallModules: [...config.wallModules],
        islandSize: config.islandSize
      },
      selected: null
    });
  }

  function commitEditSession() {
    if (!editSession) return;
    updateConfig({
      wallModules: editSession.draft.wallModules,
      islandSize: editSession.draft.islandSize
    });
    setEditSession(null);
  }

  function discardEditSession() {
    setEditSession(null);
  }

  function updateConfig(next: Partial<ConfiguratorState>) {
    if (sharedView) return;
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

  /**
   * Drives the Photo Job lifecycle: request (which pins a Configuration
   * Revision), upload the capture straight to storage through the single-use
   * grant, confirm it server-side, submit it to the provider, then watch the
   * job until it is terminal.
   */
  async function generatePhoto() {
    if (!project) {
      setPhotoStatus({ phase: "blocked", reason: "guest" });
      return;
    }
    // The autosaved version is owned by the save controls, so it is read from
    // the server here. A change that lands in between makes the request 409,
    // which is the correct outcome: the photo must pin what the customer saw.
    const current = await fetch(`/api/projects/${project.id}/configuration`, {
      cache: "no-store"
    });
    const currentPayload = (await current.json().catch(() => null)) as {
      version?: number;
    } | null;
    if (!current.ok || !currentPayload?.version) {
      setPhotoStatus({ phase: "blocked", reason: "not-yet-saved" });
      return;
    }
    const savedVersion = currentPayload.version;

    const captured = await capturePhoto();
    if (!captured) {
      setPhotoStatus({
        phase: "error",
        message: "Die Szene konnte nicht aufgenommen werden. Bitte versuchen Sie es erneut."
      });
      return;
    }

    setPhotoStatus({ phase: "working", step: "uploading", preview: captured.previewUrl });

    async function fail(message: string) {
      URL.revokeObjectURL(captured!.previewUrl);
      setPhotoStatus({ phase: "error", message });
    }

    try {
      const requested = await fetch(`/api/projects/${project.id}/photo-jobs`, {
        body: JSON.stringify({
          expectedVersion: savedVersion,
          idempotencyKey: crypto.randomUUID(),
          scenePresetKey: photoPresetKey,
          capture: {
            contentType: captured.contentType,
            byteSize: captured.byteSize
          }
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST"
      });
      const requestPayload = (await requested.json().catch(() => null)) as {
        job?: { id: string };
        upload?: { url: string; headers: Record<string, string> };
        error?: string;
      } | null;

      if (!requested.ok || !requestPayload?.job || !requestPayload.upload) {
        return await fail(
          requestPayload?.error ??
            "Die Visualisierung konnte nicht angefordert werden."
        );
      }
      const jobId = requestPayload.job.id;

      const uploaded = await fetch(requestPayload.upload.url, {
        body: captured.blob,
        headers: requestPayload.upload.headers,
        method: "PUT"
      });
      if (!uploaded.ok) return await fail("Die Aufnahme konnte nicht übertragen werden.");

      const confirmed = await fetch(`/api/photo-jobs/${jobId}/capture`, {
        method: "POST"
      });
      if (!confirmed.ok) {
        return await fail("Die Aufnahme wurde abgelehnt. Bitte versuchen Sie es erneut.");
      }

      setPhotoStatus({ phase: "working", step: "generating", preview: captured.previewUrl });

      const submitted = await fetch(`/api/photo-jobs/${jobId}/submit`, { method: "POST" });
      const submitPayload = (await submitted.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!submitted.ok) {
        return await fail(
          submitPayload?.error ?? "Die Erzeugung konnte nicht gestartet werden."
        );
      }

      // The job now lives on the server; the browser only watches. Every read
      // reconciles with the provider, so a lost webhook cannot strand it, and
      // closing the tab loses nothing — the photo lands in the gallery anyway.
      await watchPhotoJob(project.id, jobId, captured.previewUrl);
    } catch {
      await fail("Die Verbindung wurde unterbrochen. Bitte versuchen Sie es erneut.");
    }
  }

  /**
   * Follows a submitted job to its end and shows the result. Shared by a
   * fresh request and by a job picked up again after the page was reloaded.
   */
  async function watchPhotoJob(projectId: string, jobId: string, previewUrl: string | null) {
    function fail(message: string) {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPhotoStatus({ phase: "error", message });
    }

    const finished = await waitForPhotoJob(jobId);
    if (finished.kind === "timeout") {
      return fail(
        "Die Erzeugung dauert länger als erwartet. Das Foto erscheint in der Galerie des Projekts, sobald es fertig ist."
      );
    }
    if (finished.kind === "failed") return fail(describePhotoFailure(finished.reason));

    // Resolve a display URL through the gallery the panel already renders,
    // rather than minting a second kind of URL for this one surface.
    const gallery = await fetch(`/api/projects/${projectId}/photos`, {
      cache: "no-store"
    });
    const galleryPayload = (await gallery.json().catch(() => null)) as {
      photos?: Array<{ id: string; displayUrl: string }>;
    } | null;
    const created = galleryPayload?.photos?.find(
      (photo) => photo.id === finished.generatedPhotoId
    );
    if (!created) return fail("Das Foto wurde erstellt, ist aber gerade nicht abrufbar.");

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPhotoStatus({
      phase: "done",
      imageUrl: created.displayUrl,
      photoId: created.id
    });
    // Re-seeds the panel gallery from the server so the new photo appears there too.
    startTransition(() => router.refresh());
  }

  function resetConfiguration() {
    updateConfig({
      cabinetColorKey: "graphite",
      frontColorKey: "porcelain",
      layout: "straight-line"
    });
    setCameraView("signature");
  }

  const canvasEdit: KitchenEditProps | undefined =
    editSession && visualization === "studio" && !pathTracing
      ? {
          selected: editSession.selected,
          canAddStart: canAddModule(editSession.draft.wallModules),
          canAddEnd: canAddModule(editSession.draft.wallModules),
          onSelect: (target) =>
            setEditSession((session) =>
              session ? { ...session, selected: target } : session
            ),
          onAddSlot: (end) =>
            setEditSession((session) => {
              if (!session || !canAddModule(session.draft.wallModules)) {
                return session;
              }
              const wallModules =
                end === "start"
                  ? (["small", ...session.draft.wallModules] as EditDraft["wallModules"])
                  : ([...session.draft.wallModules, "small"] as EditDraft["wallModules"]);
              return {
                draft: { ...session.draft, wallModules },
                selected: end === "start" ? 0 : wallModules.length - 1
              };
            })
        }
      : undefined;

  return (
    <main className="relative min-h-screen overflow-hidden bg-canvas text-ink">
      <div className="absolute inset-0">
        <ConfiguratorCanvas
          cameraView={cameraView}
          captureRef={captureRef}
          edit={canvasEdit}
          onCameraInteraction={stopRender}
          pathTracing={pathTracing}
          state={effectiveConfig}
          visualization={visualization}
        />
      </div>

      <VisualizationPreloader active={visualization !== "studio"} />

      <CameraControlOverlay
        accentSelection={!sharedView}
        activeView={cameraView}
        editSession={editSession}
        isConfigPanelOpen={isConfigPanelOpen}
        locale={locale}
        onEdit={enterEditSession}
        onEditChange={(draft) =>
          setEditSession((session) => (session ? { ...session, draft } : session))
        }
        onEditCommit={commitEditSession}
        onEditDiscard={discardEditSession}
        onEditSelect={(target) =>
          setEditSession((session) => (session ? { ...session, selected: target } : session))
        }
        onPhoto={openPhoto}
        onSelect={selectCameraView}
        quote={quote}
        showActions={!sharedView}
      />

      {!sharedView && (
        <PhotoPopover
          locale={locale}
          onClose={() => setPhotoOpen(false)}
          onGenerate={() => void generatePhoto()}
          onSaveAsProject={() => saveConfigurationAsProject(encodedConfig)}
          onSelectPreset={setPhotoPresetKey}
          open={isPhotoOpen}
          selectedPresetKey={photoPresetKey}
          status={photoStatus}
        />
      )}

      <AnimatePresence initial={false}>
        {!isConfigPanelOpen && (
          <motion.button
            animate={{ opacity: 1, x: 0 }}
            aria-expanded={false}
            aria-label={sharedView ? "Details einblenden" : "Konfiguration einblenden"}
            className="fixed right-4 top-20 z-30 inline-flex min-h-11 items-center gap-2.5 border border-ink bg-ink px-5 text-body leading-none text-paper transition-colors hover:bg-transparent hover:text-ink lg:right-8 lg:top-8"
            exit={{ opacity: 0, x: 14 }}
            initial={{ opacity: 0, x: 14 }}
            onClick={() => setConfigPanelOpen(true)}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            type="button"
          >
            <SlidersHorizontal aria-hidden="true" size={15} strokeWidth={1.5} />
            {sharedView ? "Details" : "Konfiguration"}
          </motion.button>
        )}
      </AnimatePresence>

      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="pointer-events-none relative z-10 flex min-h-screen flex-col justify-between lg:flex-row"
        initial={{ opacity: 0, y: 14 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        <AppHeader
          action={
            project
              ? { href: "/konto", label: "Meine Projekte" }
              : undefined
          }
          className="pointer-events-auto h-fit p-5 md:p-6 lg:p-8"
          showAccount={!sharedView}
        />

        <AnimatePresence initial={false}>
          {isConfigPanelOpen && (
            <motion.section
              animate={{ opacity: 1, x: 0 }}
              className="pointer-events-auto mt-[56vh] w-full border-t border-hairline bg-canvas lg:sticky lg:top-0 lg:mt-0 lg:flex lg:h-screen lg:w-[27rem] lg:flex-col lg:self-start lg:border-l lg:border-t-0"
              exit={{ opacity: 0, x: 32 }}
              initial={{ opacity: 0, x: 28 }}
              transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
            >
              {/* The scrolling middle. `min-h-0` is required for a flex child
                  to shrink below its content and actually scroll. */}
              <div className="p-6 pb-36 md:p-8 md:pb-36 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pb-8">
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
                    {!sharedView && (
                      <p className="text-body uppercase tracking-[0.22em] text-graphite">
                        Konfigurator
                      </p>
                    )}
                    <button
                      aria-expanded={true}
                      aria-label={sharedView ? "Details ausblenden" : "Konfiguration ausblenden"}
                      className="grid size-9 place-items-center border border-hairline text-graphite transition-colors hover:border-ink hover:text-ink"
                      onClick={() => setConfigPanelOpen(false)}
                      type="button"
                    >
                      <PanelRightClose aria-hidden="true" size={15} strokeWidth={1.5} />
                    </button>
                  </div>
                  <h1 className={`${sharedView ? "mt-0" : "mt-5"} text-lead text-ink`}>
                    {sharedView
                      ? sharedView.displaySnapshot?.productTitle ?? "Signature Küche"
                      : getLocalizedLabel(RDTD_KITCHEN_PRODUCT_V2.title, locale)}
                    {!sharedView && <span className="text-signature">.</span>}
                  </h1>
                  <p className="mt-3 text-pretty text-body text-graphite">
                    {sharedView
                      ? "Geteilter, unveränderlicher Küchenstand ohne private Projektdaten."
                      : getLocalizedLabel(RDTD_KITCHEN_PRODUCT_V2.description, locale)}
                  </p>
                </motion.div>

                <ViewControl
                  active={visualization}
                  onRender={togglePathTracing}
                  onSelect={selectVisualization}
                  renderActive={renderActive}
                />

                {sharedView ? (
                  <SharedRevisionDetails
                    cabinetColor={cabinetColor}
                    displaySnapshot={sharedView.displaySnapshot}
                    expiresAt={sharedView.expiresAt}
                    frontColor={frontColor}
                    locale={locale}
                  />
                ) : (
                  <>
                    <StageTabs active={stage} onSelect={setStage} />

                    <AnimatePresence initial={false} mode="wait">
                      <motion.div
                        animate={{ opacity: 1, y: 0 }}
                        aria-labelledby={`stage-tab-${stage}`}
                        exit={{ opacity: 0, y: -4 }}
                        id={`stage-panel-${stage}`}
                        initial={{ opacity: 0, y: 4 }}
                        key={stage}
                        role="tabpanel"
                        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                      >
                        {stage === "material" && (
                          <>
                            <ControlGroup title="Korpus">
                              <FinishPicker
                                activeKey={cabinetColor.key}
                                locale={locale}
                                onSelect={(key) => updateConfig({ cabinetColorKey: key })}
                                options={RDTD_KITCHEN_PRODUCT_V2.cabinetColors}
                              />
                            </ControlGroup>

                            <ControlGroup title="Front">
                              <FinishPicker
                                activeKey={frontColor.key}
                                locale={locale}
                                onSelect={(key) => updateConfig({ frontColorKey: key })}
                                options={RDTD_KITCHEN_PRODUCT_V2.frontColors}
                              />
                            </ControlGroup>
                          </>
                        )}

                        {stage === "layout" && (
                          <LayoutStage
                            editing={Boolean(editSession)}
                            islandSize={effectiveConfig.islandSize}
                            onEdit={enterEditSession}
                            wallModules={effectiveConfig.wallModules}
                          />
                        )}

                        {stage === "review" && (
                          <div className="mt-8 space-y-5 border-t border-hairline pt-6">
                            <PriceBreakdown defaultOpen locale={locale} quote={quote} />

                            {project && (
                              <ProjectSaveControls
                                configurationCode={encodedConfig}
                                onSaveAsNew={saveConfigurationAsProject}
                                onRestore={restoreProjectDraft}
                                project={project}
                              />
                            )}

                            <div
                              className={`grid gap-2 ${
                                project ? "grid-cols-1" : "grid-cols-[1fr_auto_auto]"
                              }`}
                            >
                              {!project && (
                                <a
                                  className="inline-flex min-h-11 items-center justify-center border border-ink bg-ink px-5 text-body leading-none text-paper transition-colors hover:bg-transparent hover:text-ink"
                                  href={quoteRequestHref}
                                >
                                  Konfiguration anfragen
                                </a>
                              )}
                              {!project && (
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
                              )}
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
                                    ? "Sichere Links bleiben auf einen festen Stand begrenzt."
                                    : "Ihre Konfiguration wird in der URL gespeichert."}
                            </p>
                          </div>
                        )}
                      </motion.div>
                    </AnimatePresence>
                  </>
                )}
              </motion.div>
              </div>

              {/* Pinned foot. The price is the most-read number on the page and
                  sat at y=1070 — below the fold on a 900px laptop — while the
                  primary action sat lower still. Both stay in view now, so a
                  finish can be compared against its price without scrolling. */}
              {/* Below the desktop breakpoint the panel is part of the page flow and
                  `main` clips overflow, which would make a sticky foot stick to the
                  page instead of the viewport. Fixed keeps price and primary action
                  in reach while the finishes are compared; the scroll area pads
                  its bottom so nothing hides behind it. */}
              <div className="fixed inset-x-0 bottom-0 z-30 border-t border-hairline bg-canvas px-6 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 md:px-8 lg:static lg:z-auto lg:shrink-0 lg:pb-8 lg:pt-5">
                <div className="flex items-baseline justify-between gap-4">
                  <p className="text-body text-graphite">Richtpreis</p>
                  <p className="text-lead text-ink">
                    {displayedTotalCents === null
                      ? "Preis nicht verfügbar"
                      : new Intl.NumberFormat("de-DE", {
                          currency: displayedCurrency,
                          maximumFractionDigits: 0,
                          style: "currency"
                        }).format(displayedTotalCents / 100)}
                  </p>
                </div>

                <div className="mt-4">
                  {sharedView ? (
                    <a
                      className="inline-flex min-h-12 w-full items-center justify-center border border-ink bg-ink px-5 text-body leading-none text-paper transition-colors hover:bg-transparent hover:text-ink"
                      href="/configure"
                    >
                      Eigene Küche konfigurieren
                    </a>
                  ) : project ? (
                    <a
                      className="inline-flex min-h-12 w-full items-center justify-center border border-ink bg-ink px-5 text-body leading-none text-paper transition-colors hover:bg-transparent hover:text-ink"
                      href={quoteRequestHref}
                    >
                      Konfiguration anfragen
                    </a>
                  ) : (
                    <button
                      className="inline-flex min-h-12 w-full items-center justify-center bg-signature px-5 text-body leading-none text-paper transition-colors hover:bg-ink"
                      onClick={() => saveConfigurationAsProject(encodedConfig)}
                      type="button"
                    >
                      Als Projekt speichern
                    </button>
                  )}
                </div>
              </div>
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
      <ProjectShareLinks
        initialLinks={project.shareLinks}
        projectId={project.id}
        savedVersion={status.phase === "saved" ? status.savedVersion : null}
      />
      <PhotoGallery
        density="compact"
        emptyMessage="Noch keine Visualisierung für dieses Projekt."
        initialNextCursor={project.gallery.nextCursor}
        initialPhotos={project.gallery.photos}
        initialTotalCount={project.gallery.totalCount}
        key={galleryPageKey(project.id, project.gallery)}
        scope={{ kind: "project", projectId: project.id }}
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

/**
 * One labelled control for how the scene is shown: which environment, and
 * whether it is being rendered photorealistically. Render was a separate
 * toggle before, which read as a mode without saying what it did.
 */
function ViewControl({
  active,
  onRender,
  onSelect,
  renderActive
}: {
  active: VisualizationMode;
  onRender: () => void;
  onSelect: (mode: VisualizationMode) => void;
  renderActive: boolean;
}) {
  const environments: { key: VisualizationMode; label: string }[] = [
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
      <p className="mb-4 text-body text-graphite" id="view-control-label">
        Ansicht
      </p>
      <div
        aria-labelledby="view-control-label"
        className="grid grid-cols-3 divide-x divide-hairline border border-hairline"
        role="group"
      >
        {environments.map((environment) => {
          const isCurrent = active === environment.key;
          const isSelected = isCurrent && !renderActive;
          return (
            <button
              aria-pressed={isSelected}
              className={`inline-flex min-h-11 items-center justify-center gap-2 px-3 text-body transition-colors ${
                isSelected ? "bg-ink text-paper" : "text-graphite hover:text-ink"
              }`}
              key={environment.key}
              onClick={() => onSelect(environment.key)}
              type="button"
            >
              {isCurrent && renderActive && (
                <span aria-hidden="true" className="size-1.5 rounded-full bg-signature" />
              )}
              {environment.label}
            </button>
          );
        })}
        <button
          aria-pressed={renderActive}
          className={`inline-flex min-h-11 items-center justify-center gap-2 px-3 text-body transition-colors ${
            renderActive ? "bg-ink text-paper" : "text-graphite hover:text-ink"
          }`}
          onClick={onRender}
          type="button"
        >
          <ScanLine aria-hidden="true" size={13} strokeWidth={1.5} />
          Render
        </button>
      </div>
      <p className="mt-3 min-h-5 text-sm leading-6 text-graphite">
        {renderActive
          ? "Fotorealistische Berechnung der aktuellen Ansicht. Zum Weiterplanen beenden."
          : active === "apartment"
            ? "Die Küche in einem Raum. Studio zeigt Material und Maße neutral."
            : "Neutrale Ansicht für Material und Maße. Appartement setzt die Küche in einen Raum."}
      </p>
    </motion.div>
  );
}

function StageTabs({
  active,
  onSelect
}: {
  active: PlanningStage;
  onSelect: (stage: PlanningStage) => void;
}) {
  return (
    <div
      aria-label="Planungsschritte"
      className="mt-8 grid grid-cols-3 divide-x divide-hairline border border-ink"
      role="tablist"
    >
      {planningStages.map((planningStage, index) => {
        const isActive = active === planningStage.key;
        return (
          <button
            aria-controls={`stage-panel-${planningStage.key}`}
            aria-selected={isActive}
            className={`min-h-11 px-3 text-body transition-colors ${
              isActive ? "bg-ink text-paper" : "text-graphite hover:text-ink"
            }`}
            id={`stage-tab-${planningStage.key}`}
            key={planningStage.key}
            onClick={() => onSelect(planningStage.key)}
            onKeyDown={(event) => {
              const delta = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
              if (!delta) return;
              event.preventDefault();
              const next = planningStages[(index + delta + planningStages.length) % planningStages.length];
              onSelect(next.key);
              (event.currentTarget.parentElement?.querySelector(
                `#stage-tab-${next.key}`
              ) as HTMLElement | null)?.focus();
            }}
            role="tab"
            tabIndex={isActive ? 0 : -1}
            type="button"
          >
            {planningStage.label}
          </button>
        );
      })}
    </div>
  );
}

const ISLAND_LABEL: Record<number, string> = {
  0: "ohne Insel",
  2: "Insel klein",
  4: "Insel standard",
  6: "Insel groß"
};

/**
 * The arrangement decision. Editing itself happens in the scene bar, where
 * the modules are; the panel states what is there and opens the Edit Session.
 */
function LayoutStage({
  editing,
  islandSize,
  onEdit,
  wallModules
}: {
  editing: boolean;
  islandSize: number;
  onEdit: () => void;
  wallModules: ConfiguratorState["wallModules"];
}) {
  return (
    <div className="mt-8 border-t border-hairline pt-6">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-body text-ink">Aufbau</h2>
        <p className="text-body text-graphite">
          {wallModules.length} Module · {ISLAND_LABEL[islandSize] ?? "Insel"}
        </p>
      </div>
      <ol aria-label="Küchenzeile von links nach rechts" className="mt-4 flex gap-1">
        {wallModules.map((moduleKey, index) => (
          <li
            className={`grid min-h-10 place-items-center border border-hairline text-sm text-graphite ${
              moduleKey === "small" ? "flex-[0.3]" : moduleKey === "device" ? "flex-[0.64]" : "flex-[0.62]"
            }`}
            key={`${moduleKey}-${index}`}
          >
            {MODULE_SHORT_LABEL[moduleKey]}
          </li>
        ))}
      </ol>
      <button
        className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 border border-ink bg-ink px-5 text-body leading-none text-paper transition-colors hover:bg-transparent hover:text-ink disabled:cursor-default disabled:border-hairline disabled:bg-transparent disabled:text-graphite"
        disabled={editing}
        onClick={onEdit}
        type="button"
      >
        <Pencil aria-hidden="true" size={15} strokeWidth={1.5} />
        {editing ? "Wird in der Szene bearbeitet" : "Module bearbeiten"}
      </button>
      <p className="mt-3 text-sm leading-6 text-graphite">
        Schränke in der Szene verschieben, ergänzen oder tauschen. Der Richtpreis
        folgt jeder Änderung; übernommen wird erst mit „Fertig“.
      </p>
    </div>
  );
}

function CameraControlOverlay({
  accentSelection,
  activeView,
  editSession,
  isConfigPanelOpen,
  locale,
  onEdit,
  onEditChange,
  onEditCommit,
  onEditDiscard,
  onEditSelect,
  onPhoto,
  onSelect,
  quote,
  showActions
}: {
  accentSelection: boolean;
  activeView: CameraView;
  editSession: { draft: EditDraft; selected: EditTarget } | null;
  isConfigPanelOpen: boolean;
  locale: LocaleCode;
  onEdit: () => void;
  onEditChange: (draft: EditDraft) => void;
  onEditCommit: () => void;
  onEditDiscard: () => void;
  onEditSelect: (target: EditTarget) => void;
  onPhoto: () => void;
  onSelect: (view: CameraView) => void;
  quote: ConfiguratorQuote;
  showActions: boolean;
}) {
  const editing = Boolean(editSession);

  return (
    <div
      className={`pointer-events-auto z-20 -translate-x-1/2 ${
        editing
          ? "w-[min(calc(100vw-2.5rem),42rem)]"
          : "w-[min(calc(100vw-2.5rem),30rem)]"
      } ${
        isConfigPanelOpen
          ? "absolute left-1/2 top-[calc(56vh-4.5rem)] lg:fixed lg:bottom-8 lg:left-[calc((100vw-27rem)/2)] lg:top-auto"
          : "fixed bottom-6 left-1/2"
      }`}
    >
      <AnimatePresence initial={false} mode="wait">
        {editSession ? (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            initial={{ opacity: 0, y: 8 }}
            key="edit"
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <SceneEditBar
              draft={editSession.draft}
              locale={locale}
              onChange={onEditChange}
              onCommit={onEditCommit}
              onDiscard={onEditDiscard}
              onSelect={onEditSelect}
              quote={quote}
              selected={editSession.selected}
            />
          </motion.div>
        ) : (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className={`grid divide-x divide-hairline border border-hairline bg-canvas ${
              showActions
                ? "grid-cols-5 sm:grid-cols-[repeat(3,minmax(0,1fr))_auto_auto]"
                : "grid-cols-3"
            }`}
            exit={{ opacity: 0, y: 8 }}
            initial={{ opacity: 0, y: 8 }}
            key="nav"
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            {cameraViews.map((viewOption) => (
              <CameraViewButton
                accent={accentSelection}
                active={activeView === viewOption.key}
                key={viewOption.key}
                label={viewOption.label}
                onClick={() => onSelect(viewOption.key)}
              />
            ))}
            {showActions && (
              <>
                <button
                  className="inline-flex min-h-12 flex-col items-center justify-center gap-1 bg-graphite px-1 text-[0.7rem] leading-none text-paper transition-colors hover:bg-signature sm:min-h-11 sm:flex-row sm:gap-2 sm:px-3 sm:text-body"
                  onClick={onEdit}
                  type="button"
                >
                  <Pencil aria-hidden="true" size={15} strokeWidth={1.5} />
                  Bearbeiten
                </button>
                <button
                  className="inline-flex min-h-12 flex-col items-center justify-center gap-1 bg-ink px-1 text-[0.7rem] leading-none text-paper transition-colors hover:bg-graphite sm:min-h-11 sm:flex-row sm:gap-2 sm:px-3 sm:text-body"
                  onClick={onPhoto}
                  type="button"
                >
                  <Camera aria-hidden="true" size={15} strokeWidth={1.5} />
                  Foto
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CameraViewButton({
  accent,
  active,
  label,
  onClick
}: {
  accent: boolean;
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-pressed={active}
      className={`inline-flex min-h-12 items-center justify-center gap-2 px-1 text-sm leading-none transition-colors sm:min-h-11 sm:px-3 sm:text-body ${
        active ? "text-ink" : "text-graphite hover:text-ink"
      }`}
      onClick={onClick}
      type="button"
    >
      {active && (
        <span
          aria-hidden="true"
          className={`size-1.5 rounded-full ${accent ? "bg-signature" : "bg-ink"}`}
        />
      )}
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

function SharedRevisionDetails({
  cabinetColor,
  displaySnapshot,
  expiresAt,
  frontColor,
  locale
}: {
  cabinetColor: FinishOption;
  displaySnapshot: RevisionDisplaySnapshot | null;
  expiresAt: string;
  frontColor: FinishOption;
  locale: LocaleCode;
}) {
  const expiry = new Intl.DateTimeFormat(locale === "de" ? "de-DE" : locale, {
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(new Date(expiresAt));

  return (
    <motion.dl
      className="mt-8 border-t border-hairline"
      variants={{
        hidden: { opacity: 0, y: 12 },
        show: { opacity: 1, y: 0, transition: { duration: 0.5 } }
      }}
    >
      <RevisionDetailRow
        label="Layout"
        value={displaySnapshot?.layoutLabel ?? "Küchenzeile, gerade"}
      />
      <RevisionFinishRow
        finish={cabinetColor}
        label="Korpus"
        value={displaySnapshot?.cabinetFinish ?? getLocalizedLabel(cabinetColor.label, locale)}
      />
      <RevisionFinishRow
        finish={frontColor}
        label="Front"
        value={displaySnapshot?.frontFinish ?? getLocalizedLabel(frontColor.label, locale)}
      />
      <RevisionDetailRow label="Gültig bis" value={expiry} />
    </motion.dl>
  );
}

function RevisionDetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-5 border-b border-hairline py-4">
      <dt className="text-body text-graphite">{label}</dt>
      <dd className="text-right text-body text-ink">{value}</dd>
    </div>
  );
}

function RevisionFinishRow({
  finish,
  label,
  value
}: {
  finish: FinishOption;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-5 border-b border-hairline py-4">
      <dt className="text-body text-graphite">{label}</dt>
      <dd className="flex items-center justify-end gap-3 text-right text-body text-ink">
        <span
          aria-hidden="true"
          className="size-8 shrink-0 border border-hairline bg-cover bg-center"
          style={
            finish.textureUrl
              ? { backgroundColor: finish.hex, backgroundImage: `url(${finish.textureUrl})` }
              : { backgroundColor: finish.hex }
          }
        />
        {value}
      </dd>
    </div>
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
