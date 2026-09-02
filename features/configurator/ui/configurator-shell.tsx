"use client";

import { useProgress } from "@react-three/drei";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Label } from "@/components/design-system/label";
import { Pill } from "@/components/design-system/pill";
import { preloadAppartement2Model } from "@/features/configurator/engine/appartement2-model";
import { ConfiguratorCanvas } from "@/features/configurator/engine/configurator-canvas";
import type {
  EditTarget,
  KitchenEditProps
} from "@/features/configurator/engine/kitchen-model";
import { PHOTO_PRESETS } from "@/features/configurator/photo/photo-presets";
import { PhotoPopover, type PhotoStatus } from "@/features/configurator/photo/photo-popover";
import { useSceneCapture } from "@/features/configurator/photo/use-scene-capture";
import {
  findFinish,
  formatCurrency,
  getConfiguratorQuote,
  getLocalizedLabel,
  normalizeConfiguratorState,
  RDTD_KITCHEN_PRODUCT_V2
} from "@/features/configurator/product-definition";
import {
  CONFIG_QUERY_PARAM,
  decodeConfiguration,
  encodeConfiguration
} from "@/features/configurator/state-codec";
import type {
  CameraView,
  ConfiguratorState,
  LocaleCode,
  VisualizationMode
} from "@/features/configurator/types";
import {
  CameraSegments,
  HudAccountLink,
  HudBrand,
  HudPrice,
  SaveState,
  SceneActions,
  StageSegments,
  ViewSegments,
  type PlanningStage
} from "@/features/configurator/ui/configurator-hud";
import {
  DatasheetPanel,
  type DatasheetSection
} from "@/features/configurator/ui/datasheet-panel";
import { MaterialOverlay } from "@/features/configurator/ui/material-overlay";
import {
  canAddModule,
  SceneEditBar,
  type EditDraft
} from "@/features/configurator/ui/module-editor";
import {
  describeAutosave,
  ProjectAutosave
} from "@/features/configurator/ui/project-save-controls";
import { galleryPageKey } from "@/features/photo-gallery/serialize-gallery";
import type { GalleryResponse } from "@/features/photo-gallery/ui/gallery-types";
import { PhotoGallery } from "@/features/photo-gallery/ui/photo-gallery";
import type { RevisionDisplaySnapshot } from "@/features/projects/revision-display";
import type { EditableProject } from "@/features/projects/ui/project-editor-types";
import { ProjectNameField } from "@/features/projects/ui/project-name-field";
import { ProjectVersions } from "@/features/projects/ui/project-versions";
import type { ProjectAutosaveStatus } from "@/features/projects/ui/use-project-autosave";
import { ProjectShareLinks } from "@/features/sharing/ui/project-share-links";
import { DURATION, OVERLAY_SLIDE, SIGNATURE_EASE } from "@/lib/motion";
import { useIsDesktop } from "@/lib/use-media";

type ConfiguratorShellProps = {
  initialState: ConfiguratorState;
  locale?: LocaleCode;
  project?: EditableProject;
  /** A signed-in person without a Project: the photo can create one. */
  signedIn?: boolean;
  sharedView?: {
    displaySnapshot: RevisionDisplaySnapshot | null;
    expiresAt: string;
  };
};

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

/** The stage chips name the decision; the panel section is where it is made. */
const SECTION_FOR_STAGE: Record<PlanningStage, DatasheetSection> = {
  material: "material",
  layout: "layout",
  review: "pricing"
};

function stageForSection(section: DatasheetSection | null): PlanningStage {
  if (section === "layout") return "layout";
  if (section === "pricing" || section === "project") return "review";
  return "material";
}

export function ConfiguratorShell({
  initialState,
  locale = "de",
  project: projectProp,
  sharedView,
  signedIn = false
}: ConfiguratorShellProps) {
  const [config, setConfig] = useState(() => normalizeConfiguratorState(initialState));
  // A Project created or renamed in this session, ahead of the server's props.
  const [projectOverride, setProjectOverride] = useState<EditableProject | null>(null);
  const project = projectOverride ?? projectProp;
  const [cameraView, setCameraView] = useState<CameraView>("signature");
  const [copied, setCopied] = useState(false);
  const [isPanelOpen, setPanelOpen] = useState(true);
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [visualization, setVisualization] = useState<VisualizationMode>("studio");
  const [openSection, setOpenSection] = useState<DatasheetSection | null>("material");
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
  // The material overlay applies live; this remembers what to restore on cancel.
  const [materialSnapshot, setMaterialSnapshot] = useState<{
    cabinet: string;
    front: string;
  } | null>(null);
  const [autosaveStatus, setAutosaveStatus] = useState<ProjectAutosaveStatus | null>(null);
  const { captureRef, capturePhoto } = useSceneCapture();
  const isDesktop = useIsDesktop();

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
  const priceText =
    displayedTotalCents === null
      ? "Preis nicht verfügbar"
      : new Intl.NumberFormat("de-DE", {
          currency: displayedCurrency,
          maximumFractionDigits: 0,
          style: "currency"
        }).format(displayedTotalCents / 100);
  const encodedConfig = encodeConfiguration(config);
  // The commercial handoff pins an immutable revision of a Project, so a
  // saved Project goes straight to the request; a guest is asked to save first.
  const quoteRequestHref = project
    ? `/anfrage?project=${project.id}`
    : `/anfrage?${CONFIG_QUERY_PARAM}=${encodedConfig}`;
  const renderActive = pathTracing || renderRequested;
  const savedVersion = autosaveStatus?.phase === "saved" ? autosaveStatus.savedVersion : null;

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
    setOpenSection("layout");
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

  function selectStage(stage: PlanningStage) {
    setOpenSection(SECTION_FOR_STAGE[stage]);
    setSheetExpanded(true);
  }

  function toggleSection(section: DatasheetSection) {
    setOpenSection((current) => (current === section ? null : section));
  }

  function openMaterials() {
    setMaterialSnapshot({ cabinet: config.cabinetColorKey, front: config.frontColorKey });
  }

  function cancelMaterials() {
    if (materialSnapshot) {
      updateConfig({
        cabinetColorKey: materialSnapshot.cabinet,
        frontColorKey: materialSnapshot.front
      });
    }
    setMaterialSnapshot(null);
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
  async function generatePhoto(target: EditableProject | undefined = project) {
    if (!target) {
      // Signed in: the photo creates the Project, named in the card. A guest
      // saves first, which signs them in on the way.
      setPhotoStatus(signedIn ? { phase: "name" } : { phase: "blocked", reason: "guest" });
      return;
    }
    const inSession = target !== projectProp;
    // The autosaved version is owned by the save controls, so it is read from
    // the server here. A change that lands in between makes the request 409,
    // which is the correct outcome: the photo must pin what the customer saw.
    const current = await fetch(`/api/projects/${target.id}/configuration`, {
      cache: "no-store"
    });
    const currentPayload = (await current.json().catch(() => null)) as {
      version?: number;
    } | null;
    if (!current.ok || !currentPayload?.version) {
      setPhotoStatus({ phase: "blocked", reason: "not-yet-saved" });
      return;
    }
    const savedVersionNow = currentPayload.version;

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
      const requested = await fetch(`/api/projects/${target.id}/photo-jobs`, {
        body: JSON.stringify({
          expectedVersion: savedVersionNow,
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
      await watchPhotoJob(target.id, jobId, captured.previewUrl, inSession);
    } catch {
      await fail("Die Verbindung wurde unterbrochen. Bitte versuchen Sie es erneut.");
    }
  }

  /**
   * A signed-in person without a Project takes a photo: the Project is
   * created here with the name they typed, the shell switches to it without
   * a reload, and the photo continues against it.
   */
  async function createProjectAndShoot(name: string) {
    setPhotoStatus({ phase: "creating" });
    try {
      const response = await fetch("/api/projects", {
        body: JSON.stringify({
          configurationCode: encodedConfig,
          idempotencyKey: crypto.randomUUID(),
          name
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST"
      });
      const payload = (await response.json().catch(() => null)) as {
        project?: { id: string; name: string; version: number; updatedAt: string };
        error?: string;
      } | null;
      if (!response.ok || !payload?.project) {
        setPhotoStatus({
          phase: "error",
          message: payload?.error ?? "Das Projekt konnte nicht angelegt werden."
        });
        return;
      }
      const created: EditableProject = {
        id: payload.project.id,
        name: payload.project.name,
        updatedAt: payload.project.updatedAt,
        version: payload.project.version,
        revisions: [],
        revisionTotalCount: 0,
        revisionNextCursor: null,
        shareLinks: [],
        gallery: { photos: [], totalCount: 0, nextCursor: null }
      };
      setProjectOverride(created);
      await generatePhoto(created);
    } catch {
      setPhotoStatus({
        phase: "error",
        message: "Die Verbindung wurde unterbrochen. Bitte versuchen Sie es erneut."
      });
    }
  }

  function renameProject(name: string) {
    setProjectOverride((current) => {
      const base = current ?? project;
      return base ? { ...base, name } : current;
    });
  }

  /**
   * Follows a submitted job to its end and shows the result. Shared by a
   * fresh request and by a job picked up again after the page was reloaded.
   */
  async function watchPhotoJob(
    projectId: string,
    jobId: string,
    previewUrl: string | null,
    inSession = false
  ) {
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
    const galleryPayload = (await gallery.json().catch(() => null)) as GalleryResponse | null;
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
    if (inSession) {
      // The Project was created a moment ago; a refresh would remount the
      // shell under its Project key and drop this card. Seed the panel
      // gallery from the page just fetched instead.
      const photos = galleryPayload?.photos ?? [];
      setProjectOverride((current) =>
        current
          ? {
              ...current,
              gallery: {
                photos,
                totalCount: galleryPayload?.totalCount ?? photos.length,
                nextCursor: galleryPayload?.nextCursor ?? null
              }
            }
          : current
      );
      return;
    }
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

  const stage = stageForSection(openSection);
  const editing = Boolean(editSession);
  const activeShareLinks = project
    ? project.shareLinks.filter(
        (link) => !link.revokedAt && new Date(link.expiresAt).getTime() > Date.now()
      ).length
    : 0;

  const editBar = editSession && (
    <SceneEditBar
      draft={editSession.draft}
      locale={locale}
      onChange={(draft) =>
        setEditSession((session) => (session ? { ...session, draft } : session))
      }
      onCommit={commitEditSession}
      onDiscard={discardEditSession}
      onSelect={(target) =>
        setEditSession((session) => (session ? { ...session, selected: target } : session))
      }
      quote={quote}
      selected={editSession.selected}
    />
  );

  const panelTitle = sharedView ? (
    sharedView.displaySnapshot?.productTitle ?? "Signature Küche"
  ) : (
    <>
      Signature <em>Küche</em>.
    </>
  );

  const sharedRows = sharedView
    ? [
        {
          label: "Gültig bis",
          value: new Intl.DateTimeFormat(locale === "de" ? "de-DE" : locale, {
            day: "numeric",
            month: "long",
            year: "numeric"
          }).format(new Date(sharedView.expiresAt))
        }
      ]
    : [];

  const primary = sharedView
    ? { href: "/configure", label: "Eigene Küche konfigurieren", shortLabel: "Selbst planen" }
    : { href: quoteRequestHref, label: "Konfiguration anfragen", shortLabel: "Anfragen" };

  const projectSection = project
    ? {
        title: "Versionen & Freigaben",
        summary: `${project.revisionTotalCount} · ${activeShareLinks} ${
          activeShareLinks === 1 ? "Link" : "Links"
        }`,
        content: (
          <div className="flex flex-col gap-5">
            <div aria-live="polite" className="flex items-center justify-between gap-4">
              <ProjectNameField name={project.name} onRenamed={renameProject} projectId={project.id} />
              <p className="m-0 shrink-0 text-caption text-graphite">
                {describeAutosave(autosaveStatus) ?? "…"}
              </p>
            </div>
            <ProjectVersions
              initialRevisions={project.revisions}
              initialNextCursor={project.revisionNextCursor}
              initialTotalCount={project.revisionTotalCount}
              projectId={project.id}
              savedVersion={savedVersion}
            />
            <ProjectShareLinks
              initialLinks={project.shareLinks}
              projectId={project.id}
              savedVersion={savedVersion}
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
        )
      }
    : {
        title: "Speichern & Teilen",
        summary: "Gast",
        content: (
          <div className="flex flex-col gap-4">
            <p className="m-0 text-caption text-graphite">
              Ihre Konfiguration wird in der URL gespeichert. Als Projekt bleibt sie mit
              Versionen, Fotos und Anfragen bei Ihrem Konto.
            </p>
            <div className="flex flex-wrap gap-2">
              <Pill onClick={() => saveConfigurationAsProject(encodedConfig)} variant="secondary">
                Als Projekt speichern
              </Pill>
              <Pill onClick={() => void copyShareUrl()} variant="ghost">
                {copied ? "Link kopiert" : "Link kopieren"}
              </Pill>
              <Pill onClick={resetConfiguration} variant="ghost">
                Zurücksetzen
              </Pill>
            </div>
          </div>
        )
      };

  const sections = sharedView
    ? undefined
    : {
        open: openSection,
        onToggle: toggleSection,
        onSelectCabinet: (key: string) => updateConfig({ cabinetColorKey: key }),
        onSelectFront: (key: string) => updateConfig({ frontColorKey: key }),
        onOpenMaterials: openMaterials,
        editing,
        onEdit: enterEditSession,
        project: projectSection
      };

  const panel = (variant: "card" | "sheet") => (
    <DatasheetPanel
      cabinetColor={cabinetColor}
      description={
        sharedView
          ? "Geteilter, unveränderlicher Küchenstand ohne private Projektdaten."
          : undefined
      }
      extraRows={sharedRows}
      frontColor={frontColor}
      locale={locale}
      onCollapse={variant === "card" ? () => setPanelOpen(false) : undefined}
      onToggleSheet={() => setSheetExpanded((expanded) => !expanded)}
      priceText={priceText}
      primary={{ ...primary, tone: editing ? "secondary" : "primary" }}
      quote={quote}
      sections={sections}
      sheetExpanded={sheetExpanded}
      state={effectiveConfig}
      title={panelTitle}
      variant={variant}
    />
  );

  const hudContext = sharedView
    ? "Geteilter Stand"
    : project?.name ?? getLocalizedLabel(RDTD_KITCHEN_PRODUCT_V2.title, locale);

  return (
    <main className="relative h-svh overflow-hidden bg-canvas text-ink">
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

      {/* HUD · top */}
      <div className="pointer-events-none absolute inset-x-5 top-5 z-20 flex items-center justify-between gap-4 lg:inset-x-10 lg:top-7">
        <HudBrand context={hudContext} />
        {!sharedView && isDesktop && (
          <div className="pointer-events-auto">
            <StageSegments active={stage} onSelect={selectStage} size="hud" />
          </div>
        )}
        <div className="flex items-center gap-5">
          {isDesktop ? (
            <HudPrice>{priceText}</HudPrice>
          ) : (
            <div className="pointer-events-auto">
              <ViewSegments
                active={visualization}
                onRender={togglePathTracing}
                onSelect={selectVisualization}
                renderActive={renderActive}
                size="compact"
                withRender={false}
              />
            </div>
          )}
          {!sharedView && isDesktop && <HudAccountLink />}
        </div>
      </div>

      {/* HUD · view (desktop) */}
      {isDesktop && (
        <div className="pointer-events-auto absolute left-10 top-24 z-20">
          <ViewSegments
            active={visualization}
            onRender={togglePathTracing}
            onSelect={selectVisualization}
            renderActive={renderActive}
            size="hud"
            withRender
          />
        </div>
      )}

      {/* HUD · decisions (phones) */}
      {!sharedView && !isDesktop && (
        <div className="pointer-events-auto absolute left-5 top-[76px] z-20">
          <StageSegments active={stage} onSelect={selectStage} size="compact" />
        </div>
      )}

      {/* Autosave states that need a decision sit over the scene, on every layout. */}
      {project && !sharedView && (
        <div className="pointer-events-auto absolute left-1/2 top-[8.5rem] z-30 w-[min(calc(100vw-2.5rem),26rem)] -translate-x-1/2 lg:top-24 [&>div]:bg-charcoal/[.96] [&>div]:backdrop-blur-[24px]">
          <ProjectAutosave
            configurationCode={encodedConfig}
            onRestore={restoreProjectDraft}
            onSaveAsNew={saveConfigurationAsProject}
            onStatus={setAutosaveStatus}
            project={project}
          />
        </div>
      )}

      {/* HUD · camera, scene actions, save state (desktop) */}
      {isDesktop && (
      <div className="pointer-events-none absolute bottom-9 left-10 z-20">
        <AnimatePresence initial={false} mode="wait">
          {editSession ? (
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              className="pointer-events-auto w-[42rem]"
              exit={{ opacity: 0, y: 8 }}
              initial={{ opacity: 0, y: 8 }}
              key="edit"
              transition={{ duration: DURATION.accordion, ease: SIGNATURE_EASE }}
            >
              {editBar}
            </motion.div>
          ) : (
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              className="pointer-events-auto flex items-center gap-3"
              exit={{ opacity: 0, y: 8 }}
              initial={{ opacity: 0, y: 8 }}
              key="nav"
              transition={{ duration: DURATION.accordion, ease: SIGNATURE_EASE }}
            >
              <CameraSegments active={cameraView} onSelect={selectCameraView} size="hud" />
              {!sharedView && (
                <SceneActions compact={false} onEdit={enterEditSession} onPhoto={openPhoto} />
              )}
              <SaveState text={project ? describeAutosave(autosaveStatus) : null} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      )}

      {/* HUD · camera and actions above the sheet (phones) */}
      {!isDesktop && !editSession && !sheetExpanded && (
        <div className="pointer-events-none absolute inset-x-5 bottom-[calc(45svh+0.75rem)] z-20 flex items-center justify-between gap-2">
          <div className="pointer-events-auto">
            <CameraSegments active={cameraView} onSelect={selectCameraView} size="compact" />
          </div>
          {!sharedView && (
            <SceneActions compact onEdit={enterEditSession} onPhoto={openPhoto} />
          )}
        </div>
      )}

      {/* Edit Session bar (phones) */}
      {!isDesktop && editSession && (
        <div className="pointer-events-auto absolute inset-x-3 bottom-3 z-30">
          {editBar}
        </div>
      )}

      {!sharedView && (
        <PhotoPopover
          locale={locale}
          onClose={() => setPhotoOpen(false)}
          onCreateProject={(name) => void createProjectAndShoot(name)}
          onGenerate={() => void generatePhoto()}
          onRenamed={renameProject}
          onSaveAsProject={() => saveConfigurationAsProject(encodedConfig)}
          onSelectPreset={setPhotoPresetKey}
          open={isPhotoOpen}
          project={project ? { id: project.id, name: project.name } : null}
          selectedPresetKey={photoPresetKey}
          status={photoStatus}
        />
      )}

      {!sharedView && (
        <MaterialOverlay
          cabinetColor={cabinetColor}
          cabinetOptions={RDTD_KITCHEN_PRODUCT_V2.cabinetColors}
          changed={
            materialSnapshot !== null &&
            (materialSnapshot.cabinet !== config.cabinetColorKey ||
              materialSnapshot.front !== config.frontColorKey)
          }
          frontColor={frontColor}
          frontOptions={RDTD_KITCHEN_PRODUCT_V2.frontColors}
          locale={locale}
          onApply={() => setMaterialSnapshot(null)}
          onCancel={cancelMaterials}
          onSelectCabinet={(key) => updateConfig({ cabinetColorKey: key })}
          onSelectFront={(key) => updateConfig({ frontColorKey: key })}
          open={materialSnapshot !== null}
          priceText={formatCurrency(quote.totalCents, locale)}
        />
      )}

      {/* Datenblatt · card (desktop). The layout switch itself does not
          animate: a phone must never see the desktop card fade out. */}
      {isDesktop && (
      <AnimatePresence initial={false}>
        {isPanelOpen && (
          <motion.div
            animate={{ opacity: 1, x: 0 }}
            className="pointer-events-auto absolute bottom-9 right-10 top-24 z-20 w-[400px]"
            exit={{ opacity: 0, x: OVERLAY_SLIDE }}
            initial={{ opacity: 0, x: OVERLAY_SLIDE }}
            transition={{ duration: DURATION.overlay, ease: SIGNATURE_EASE }}
          >
            {panel("card")}
          </motion.div>
        )}
      </AnimatePresence>
      )}
      {isDesktop && !isPanelOpen && (
        <div className="pointer-events-auto absolute right-10 top-24 z-20">
          <button
            aria-expanded={false}
            className="glass inline-flex h-11 items-center gap-2 rounded-pill px-5 text-[0.875rem] font-label leading-none text-ink transition-[background-color] duration-state ease-signature hover:bg-ink/[.14]"
            onClick={() => setPanelOpen(true)}
            type="button"
          >
            <span aria-hidden="true" className="size-1.5 rounded-pill bg-signature" />
            Datenblatt
          </button>
        </div>
      )}

      {/* Datenblatt · sheet (phones) */}
      {!isDesktop && !editSession && (
        <div
          className={`pointer-events-auto absolute inset-x-0 bottom-0 z-20 transition-[height] duration-accordion ease-signature ${
            sheetExpanded ? "h-[85svh]" : "h-[45svh]"
          }`}
        >
          {panel("sheet")}
        </div>
      )}

      <p aria-live="polite" className="sr-only">
        {isPending ? "Szene wird aktualisiert." : ""}
      </p>
    </main>
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
          transition={{ duration: DURATION.overlay, ease: SIGNATURE_EASE }}
        >
          <div className="flex min-h-full flex-col px-5 py-6 md:px-10 md:py-8">
            <div className="flex items-center justify-between border-b border-hairline pb-5">
              <Label>rotpunkt Signature</Label>
              <span className="tnum text-caption text-graphite">{roundedProgress} %</span>
            </div>

            <motion.div
              animate={{ opacity: 1, y: 0 }}
              className="my-auto w-full max-w-[38rem]"
              initial={{ opacity: 0, y: 12 }}
              transition={{ delay: 0.08, duration: DURATION.reveal, ease: SIGNATURE_EASE }}
            >
              <Label>Visualisierung</Label>
              <h2 className="m-0 mt-5 text-heading">
                Appartement wird <em>geladen</em>.
              </h2>
              <div aria-hidden="true" className="mt-10 h-px overflow-hidden bg-hairline">
                <motion.div
                  animate={{ scaleX: Math.max(0.03, roundedProgress / 100) }}
                  className="h-full w-full origin-left bg-ink"
                  initial={{ scaleX: 0.03 }}
                  transition={{ duration: 0.35, ease: SIGNATURE_EASE }}
                />
              </div>
              <p className="m-0 mt-4 text-body text-graphite">
                Raum, Materialien und Licht werden vorbereitet.
              </p>
            </motion.div>

            <div className="flex items-center justify-between border-t border-hairline pt-5">
              <Label>3D Konfigurator</Label>
              <Label>Appartement</Label>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
