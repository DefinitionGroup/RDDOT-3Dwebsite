"use client";

import { useProgress } from "@react-three/drei";
import { AnimatePresence, motion, useMotionValue } from "motion/react";
import { useRouter } from "next/navigation";
import { type PointerEvent as ReactPointerEvent, useEffect, useRef, useState, useTransition } from "react";
import { Emphasized } from "@/components/design-system/emphasized";
import { Label } from "@/components/design-system/label";
import { LanguageSwitch } from "@/components/design-system/language-switch";
import { Pill } from "@/components/design-system/pill";
import { preloadApartmentRoom } from "@/features/configurator/engine/apartment-room";
import { preloadLoftRoom } from "@/features/configurator/engine/loft-room";
import { ConfiguratorCanvas } from "@/features/configurator/engine/configurator-canvas";
import type {
  EditTarget,
  KitchenEditProps,
  LineEnd
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
  LoftOutlook,
  VisualizationMode,
  WallModuleKey
} from "@/features/configurator/types";
import {
  CameraSegments,
  HudAccountLink,
  HudBrand,
  HudPrice,
  OutlookSegments,
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
  canAddModuleOfType,
  SceneEditBar,
  type EditDraft
} from "@/features/configurator/ui/module-editor";
import { findWallCatalogEntry, RDTD_KITCHEN_PRODUCT_V2 as PRODUCT } from "@/features/configurator/product-definition";
import {
  describeAutosave,
  ProjectAutosave
} from "@/features/configurator/ui/project-save-controls";
import { saveIntentPath } from "@/features/customer-accounts/save-intent";
import { galleryPageKey } from "@/features/photo-gallery/serialize-gallery";
import type { GalleryResponse } from "@/features/photo-gallery/ui/gallery-types";
import { PhotoGallery } from "@/features/photo-gallery/ui/photo-gallery";
import {
  localizeSnapshotLabel,
  type RevisionDisplaySnapshot
} from "@/features/projects/revision-display";
import type { EditableProject } from "@/features/projects/ui/project-editor-types";
import { ProjectNameField } from "@/features/projects/ui/project-name-field";
import { ProjectVersions } from "@/features/projects/ui/project-versions";
import type { ProjectAutosaveStatus } from "@/features/projects/ui/use-project-autosave";
import { ProjectShareLinks } from "@/features/sharing/ui/project-share-links";
import { INTL_LOCALE, localizePath } from "@/lib/i18n";
import { screenLanguageLinks } from "@/lib/language-links";
import { apiErrorMessage, getMessages, type Messages } from "@/lib/messages";
import { useLocale, useMessages } from "@/lib/messages/locale-context";
import { DURATION, OVERLAY_SLIDE, SIGNATURE_EASE } from "@/lib/motion";
import { useIsDesktop } from "@/lib/use-media";
import { useCoveredEdges } from "@/features/configurator/ui/use-covered-edges";

type ConfiguratorShellProps = {
  initialState: ConfiguratorState;
  locale?: LocaleCode;
  /** Languages the visitor can open; the switch shows from two. */
  locales?: readonly LocaleCode[];
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

function describePhotoFailure(reason: string | null, t: Messages["photo"]) {
  switch (reason) {
    case "provider-disabled":
    case "provider-not-configured":
      return t.unavailable;
    case "provider-timeout":
      return t.timedOut;
    case "provider-rate-limited":
      return t.rateLimited;
    case "canceled-by-owner":
      return t.canceled;
    default:
      return t.failed;
  }
}

/** The desktop Datenblatt card: its width and its gap to the right edge. */
const DATASHEET_WIDTH_PX = 400;
const DATASHEET_GAP_PX = 40;

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
  locale: localeProp,
  locales = [],
  project: projectProp,
  sharedView,
  signedIn = false
}: ConfiguratorShellProps) {
  const pageLocale = useLocale();
  const locale = localeProp ?? pageLocale;
  const messages = getMessages(locale);
  const t = messages.configurator;
  const [config, setConfig] = useState(() => normalizeConfiguratorState(initialState));
  // A Project created or renamed in this session, ahead of the server's props.
  const [projectOverride, setProjectOverride] = useState<EditableProject | null>(null);
  const project = projectOverride ?? projectProp;
  const [cameraView, setCameraView] = useState<CameraView>("signature");
  const [copied, setCopied] = useState(false);
  const [isPanelOpen, setPanelOpen] = useState(true);
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [visualization, setVisualization] = useState<VisualizationMode>("studio");
  const [outlook, setOutlook] = useState<LoftOutlook>("street");
  const [openSection, setOpenSection] = useState<DatasheetSection | null>("material");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const [isPhotoOpen, setPhotoOpen] = useState(false);
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
  const mainRef = useRef<HTMLElement | null>(null);
  // What the HUD covers of the scene, which draws its framing into the rest:
  // the open Datenblatt on desktop, the controls above and below on phones.
  const phoneCovered = useCoveredEdges(
    mainRef,
    !isDesktop,
    `${editSession ? "edit" : "nav"}|${sheetExpanded}|${sharedView ? "shared" : "own"}`
  );
  const covered = isDesktop
    ? { top: 0, right: isPanelOpen ? DATASHEET_WIDTH_PX + DATASHEET_GAP_PX : 0, bottom: 0 }
    : phoneCovered;
  // An element dragged from the Datenblatt into the scene.
  const [drag, setDrag] = useState<{ key: WallModuleKey } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [dragTarget, setDragTarget] = useState<LineEnd | null>(null);
  const dragTargetRef = useRef<LineEnd | null>(null);
  const chipX = useMotionValue(0);
  const chipY = useMotionValue(0);

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
      ? messages.common.priceUnavailable
      : new Intl.NumberFormat(INTL_LOCALE[locale], {
          currency: displayedCurrency,
          maximumFractionDigits: 0,
          style: "currency"
        }).format(displayedTotalCents / 100);
  const encodedConfig = encodeConfiguration(config);
  // The commercial handoff pins an immutable revision of a Project, so a
  // saved Project goes straight to the request; a guest is asked to save first.
  const quoteRequestHref = localizePath(
    locale,
    project ? `/anfrage?project=${project.id}` : `/anfrage?${CONFIG_QUERY_PARAM}=${encodedConfig}`
  );
  const savedVersion = autosaveStatus?.phase === "saved" ? autosaveStatus.savedVersion : null;

  // The address of this configurator: the Project, or the guest configuration itself.
  const configurePath = project
    ? `/configure?project=${project.id}`
    : `/configure?${CONFIG_QUERY_PARAM}=${encodedConfig}`;
  const languages = sharedView
    ? []
    : screenLanguageLinks(locale, locales, (target) => localizePath(target, configurePath));

  useEffect(() => {
    if (sharedView) return;
    window.history.replaceState(null, "", localizePath(locale, configurePath));
  }, [configurePath, locale, sharedView]);

  useEffect(() => {
    const roomsTimer = window.setTimeout(() => {
      preloadApartmentRoom();
      preloadLoftRoom();
    }, 1200);

    return () => {
      window.clearTimeout(roomsTimer);
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

  function enterEditSession() {
    if (sharedView || editSession) return;
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

  /** Adds one element of a type at a line end, respecting width and per-type caps. */
  function addModuleAt(key: WallModuleKey, end: LineEnd) {
    setEditSession((session) => {
      if (!session || !canAddModuleOfType(session.draft.wallModules, key)) return session;
      const wallModules =
        end === "start"
          ? ([key, ...session.draft.wallModules] as EditDraft["wallModules"])
          : ([...session.draft.wallModules, key] as EditDraft["wallModules"]);
      return {
        draft: { ...session.draft, wallModules },
        selected: end === "start" ? 0 : wallModules.length - 1
      };
    });
  }

  function startElementDrag(key: WallModuleKey, event: ReactPointerEvent<HTMLButtonElement>) {
    if (!editSession) return;
    chipX.set(event.clientX + 14);
    chipY.set(event.clientY + 14);
    dragTargetRef.current = null;
    setDragTarget(null);
    setDragOver(false);
    setDrag({ key });
  }

  // The drag lives on the window: the pointer is free to leave the tile,
  // cross the panel and reach the canvas, where the scene's probe reports
  // which end the element would join. Letting go there adds it.
  useEffect(() => {
    if (!drag) return;
    const { key } = drag;
    let over = false;
    const { userSelect } = document.body.style;
    document.body.style.userSelect = "none";

    const finish = (end: LineEnd | null) => {
      if (end) addModuleAt(key, end);
      setDrag(null);
      setDragOver(false);
      setDragTarget(null);
      dragTargetRef.current = null;
    };
    const fallbackEnd = (clientX: number): LineEnd => {
      const canvas = document.querySelector("main canvas");
      const rect = canvas?.getBoundingClientRect();
      return rect && clientX < rect.left + rect.width / 2 ? "start" : "end";
    };
    const onMove = (event: PointerEvent) => {
      chipX.set(event.clientX + 14);
      chipY.set(event.clientY + 14);
      const nowOver =
        document.elementFromPoint(event.clientX, event.clientY) instanceof HTMLCanvasElement;
      if (nowOver !== over) {
        over = nowOver;
        setDragOver(nowOver);
      }
    };
    const onUp = (event: PointerEvent) => {
      finish(over ? dragTargetRef.current ?? fallbackEnd(event.clientX) : null);
    };
    const onCancel = () => finish(null);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") finish(null);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      window.removeEventListener("keydown", onKey);
      document.body.style.userSelect = userSelect;
    };
    // addModuleAt only touches state setters; the drag key is captured above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag]);

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
    startTransition(() => {
      setConfig((current) => normalizeConfiguratorState({ ...current, ...next }));
    });
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
    const path = localizePath(locale, `/configure?${CONFIG_QUERY_PARAM}=${encodedConfig}`);
    const shareUrl = `${window.location.origin}${path}`;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  function saveConfigurationAsProject(configurationCode: string) {
    window.location.assign(
      saveIntentPath(locale, { configurationCode, idempotencyKey: crypto.randomUUID() })
    );
  }

  function restoreProjectDraft(configurationCode: string) {
    const restored = decodeConfiguration(configurationCode);
    if (!restored) return false;
    setConfig(restored);
    return true;
  }

  function openPhoto() {
    setPhotoStatus({ phase: "idle" });
    setPhotoOpen(true);
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

    const captured = await capturePhoto({ covered });
    if (!captured) {
      setPhotoStatus({ phase: "error", message: messages.photo.captureFailed });
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
      } | null;

      if (!requested.ok || !requestPayload?.job || !requestPayload.upload) {
        return await fail(apiErrorMessage(messages, requestPayload, messages.photo.requestFailed));
      }
      const jobId = requestPayload.job.id;

      const uploaded = await fetch(requestPayload.upload.url, {
        body: captured.blob,
        headers: requestPayload.upload.headers,
        method: "PUT"
      });
      if (!uploaded.ok) return await fail(messages.photo.uploadFailed);

      const confirmed = await fetch(`/api/photo-jobs/${jobId}/capture`, {
        method: "POST"
      });
      if (!confirmed.ok) {
        return await fail(messages.photo.captureRejected);
      }

      setPhotoStatus({ phase: "working", step: "generating", preview: captured.previewUrl });

      const submitted = await fetch(`/api/photo-jobs/${jobId}/submit`, { method: "POST" });
      const submitPayload: unknown = await submitted.json().catch(() => null);
      if (!submitted.ok) {
        return await fail(apiErrorMessage(messages, submitPayload, messages.photo.startFailed));
      }

      // The job now lives on the server; the browser only watches. Every read
      // reconciles with the provider, so a lost webhook cannot strand it, and
      // closing the tab loses nothing — the photo lands in the gallery anyway.
      await watchPhotoJob(target.id, jobId, captured.previewUrl, inSession);
    } catch {
      await fail(messages.common.connectionLostRetry);
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
      } | null;
      if (!response.ok || !payload?.project) {
        setPhotoStatus({
          phase: "error",
          message: apiErrorMessage(messages, payload, messages.photo.projectFailed)
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
      setPhotoStatus({ phase: "error", message: messages.common.connectionLostRetry });
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
      return fail(messages.photo.slow);
    }
    if (finished.kind === "failed") return fail(describePhotoFailure(finished.reason, messages.photo));

    // Resolve a display URL through the gallery the panel already renders,
    // rather than minting a second kind of URL for this one surface.
    const gallery = await fetch(`/api/projects/${projectId}/photos`, {
      cache: "no-store"
    });
    const galleryPayload = (await gallery.json().catch(() => null)) as GalleryResponse | null;
    const created = galleryPayload?.photos?.find(
      (photo) => photo.id === finished.generatedPhotoId
    );
    if (!created) return fail(messages.photo.notRetrievable);

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
    editSession && visualization === "studio"
      ? {
          selected: editSession.selected,
          canAddStart: canAddModule(editSession.draft.wallModules),
          canAddEnd: canAddModule(editSession.draft.wallModules),
          drag: drag ? { key: drag.key, over: dragOver } : null,
          dragTarget,
          onDragTarget: (end) => {
            dragTargetRef.current = end;
            setDragTarget(end);
          },
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
    (sharedView.displaySnapshot
      ? localizeSnapshotLabel(sharedView.displaySnapshot.productTitle, locale)
      : t.productName)
  ) : (
    <Emphasized text={t.panelTitle} />
  );

  const sharedRows = sharedView
    ? [
        {
          label: t.validUntil,
          value: new Intl.DateTimeFormat(INTL_LOCALE[locale], {
            day: "numeric",
            month: "long",
            year: "numeric"
          }).format(new Date(sharedView.expiresAt))
        }
      ]
    : [];

  const primary = sharedView
    ? { href: localizePath(locale, "/configure"), label: t.configureOwn, shortLabel: t.configureOwnShort }
    : { href: quoteRequestHref, label: t.request, shortLabel: t.requestShort };

  const projectSection = project
    ? {
        title: t.versionsAndLinks,
        summary: t.versionsAndLinksSummary(project.revisionTotalCount, activeShareLinks),
        content: (
          <div className="flex flex-col gap-5">
            <div aria-live="polite" className="flex items-center justify-between gap-4">
              <ProjectNameField name={project.name} onRenamed={renameProject} projectId={project.id} />
              <p className="m-0 shrink-0 text-caption text-graphite">
                {describeAutosave(autosaveStatus, locale) ?? "…"}
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
              emptyMessage={t.projectGalleryEmpty}
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
        title: t.saveAndShare,
        summary: t.guest,
        content: (
          <div className="flex flex-col gap-4">
            <p className="m-0 text-caption text-graphite">{t.guestNote}</p>
            <div className="flex flex-wrap gap-2">
              <Pill onClick={() => saveConfigurationAsProject(encodedConfig)} variant="secondary">
                {t.saveAsProject}
              </Pill>
              <Pill onClick={() => void copyShareUrl()} variant="ghost">
                {copied ? t.linkCopied : t.copyLink}
              </Pill>
              <Pill onClick={resetConfiguration} variant="ghost">
                {t.reset}
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
        elements: {
          canAdd: (key: WallModuleKey) =>
            editSession ? canAddModuleOfType(editSession.draft.wallModules, key) : false,
          onAdd: (key: WallModuleKey) => addModuleAt(key, "end"),
          onDragStart: startElementDrag
        },
        project: projectSection
      };

  const panel = (variant: "card" | "sheet") => (
    <DatasheetPanel
      cabinetColor={cabinetColor}
      description={sharedView ? t.sharedDescription : undefined}
      extraRows={sharedRows}
      footer={
        // Phones: the sheet's foot holds the language switch, the top bar has no room.
        variant === "sheet" && languages.length > 1 ? (
          <LanguageSwitch links={languages} variant="sheet" />
        ) : undefined
      }
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
    ? t.sharedContext
    : project?.name ?? getLocalizedLabel(RDTD_KITCHEN_PRODUCT_V2.title, locale);

  return (
    <main className="relative h-svh overflow-hidden bg-canvas text-ink" ref={mainRef}>
      <div className="absolute inset-0">
        <ConfiguratorCanvas
          cameraView={cameraView}
          captureRef={captureRef}
          covered={covered}
          edit={canvasEdit}
          outlook={outlook}
          state={effectiveConfig}
          visualization={visualization}
        />
      </div>

      <VisualizationPreloader active={visualization !== "studio"} />

      {/* HUD · top; above the Datenblatt card so the language list can open over it */}
      <div
        className="pointer-events-none absolute inset-x-5 top-5 z-30 flex items-center justify-between gap-4 lg:inset-x-10 lg:top-7"
        data-covers="top"
      >
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
              <ViewSegments active={visualization} onSelect={setVisualization} size="compact" />
            </div>
          )}
          {isDesktop && languages.length > 1 && (
            <div className="chip-solid pointer-events-auto rounded-pill px-2">
              <LanguageSwitch links={languages} />
            </div>
          )}
          {!sharedView && isDesktop && <HudAccountLink />}
        </div>
      </div>

      {/* HUD · view (desktop), the Loft's outlook small beneath it, flush with "Loft" */}
      {isDesktop && (
        <div className="pointer-events-none absolute left-10 top-24 z-20 flex flex-col items-end gap-2">
          <div className="pointer-events-auto">
            <ViewSegments active={visualization} onSelect={setVisualization} size="hud" />
          </div>
          <OutlookControl
            active={outlook}
            onSelect={setOutlook}
            size="card"
            visible={visualization === "loft"}
          />
        </div>
      )}

      {/* HUD · decisions (phones) */}
      {!sharedView && !isDesktop && (
        <div className="pointer-events-auto absolute left-5 top-[76px] z-20" data-covers="top">
          <StageSegments active={stage} onSelect={selectStage} size="compact" />
        </div>
      )}

      {/* HUD · the Loft's outlook (phones): under the view control, a row below the decisions */}
      {!isDesktop && (
        <div className="pointer-events-none absolute right-5 top-[132px] z-20">
          <OutlookControl
            active={outlook}
            onSelect={setOutlook}
            size="compact"
            visible={visualization === "loft"}
          />
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
              <CameraSegments active={cameraView} onSelect={setCameraView} size="hud" />
              {!sharedView && (
                <SceneActions compact={false} onEdit={enterEditSession} onPhoto={openPhoto} />
              )}
              <SaveState text={project ? describeAutosave(autosaveStatus, locale) : null} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      )}

      {/* HUD · camera and actions above the sheet (phones) */}
      {!isDesktop && !editSession && !sheetExpanded && (
        <div
          className="pointer-events-none absolute inset-x-5 bottom-[calc(45svh+0.75rem)] z-20 flex items-center justify-between gap-2"
          data-covers="bottom"
        >
          <div className="pointer-events-auto">
            <CameraSegments active={cameraView} onSelect={setCameraView} size="compact" />
          </div>
          {!sharedView && (
            <SceneActions compact onEdit={enterEditSession} onPhoto={openPhoto} />
          )}
        </div>
      )}

      {/* Edit Session bar (phones) */}
      {!isDesktop && editSession && (
        <div className="pointer-events-auto absolute inset-x-3 bottom-3 z-30" data-covers="bottom">
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
            className="pointer-events-auto absolute bottom-9 top-24 z-20"
            exit={{ opacity: 0, x: OVERLAY_SLIDE }}
            initial={{ opacity: 0, x: OVERLAY_SLIDE }}
            style={{ right: DATASHEET_GAP_PX, width: DATASHEET_WIDTH_PX }}
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
            className="chip-solid inline-flex h-11 items-center gap-2 rounded-pill px-5 text-[0.875rem] font-label leading-none text-ink transition-[background-color] duration-state ease-signature hover:bg-ink/[.14]"
            onClick={() => setPanelOpen(true)}
            type="button"
          >
            <span aria-hidden="true" className="size-1.5 rounded-pill bg-signature" />
            {t.datasheet}
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

      {/* The dragged element follows the pointer as a soot chip. */}
      {drag && (
        <motion.div
          aria-hidden="true"
          className="chip-solid pointer-events-none fixed left-0 top-0 z-[70] inline-flex h-9 items-center gap-2 rounded-pill px-3.5 text-caption font-label text-ink"
          style={{ x: chipX, y: chipY }}
        >
          <span className="size-1.5 rounded-pill bg-signature" />
          {dragTarget === "start"
            ? t.attachLeft
            : dragTarget === "end"
              ? t.attachRight
              : getLocalizedLabel(findWallCatalogEntry(PRODUCT, drag.key).label, locale)}
        </motion.div>
      )}

      <p aria-live="polite" className="sr-only">
        {isPending ? t.sceneUpdating : ""}
      </p>
    </main>
  );
}

/** The outlook switch rises in under the view control while the Loft is shown. */
function OutlookControl({
  active,
  onSelect,
  size,
  visible
}: {
  active: LoftOutlook;
  onSelect: (outlook: LoftOutlook) => void;
  size: "card" | "compact";
  visible: boolean;
}) {
  return (
    <AnimatePresence initial={false}>
      {visible && (
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="pointer-events-auto"
          exit={{ opacity: 0, y: -6 }}
          initial={{ opacity: 0, y: -6 }}
          transition={{ duration: DURATION.accordion, ease: SIGNATURE_EASE }}
        >
          <OutlookSegments active={active} onSelect={onSelect} size={size} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function VisualizationPreloader({ active }: { active: boolean }) {
  const isLoading = useProgress((state) => state.active);
  const progress = useProgress((state) => state.progress);
  const roundedProgress = Math.max(0, Math.min(100, Math.round(progress)));
  const visible = active && isLoading;
  const t = useMessages().configurator;

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
              <Label>{t.loadingLabel}</Label>
              <h2 className="m-0 mt-5 text-heading">
                <Emphasized text={t.loadingTitle} />
              </h2>
              <div aria-hidden="true" className="mt-10 h-px overflow-hidden bg-hairline">
                <motion.div
                  animate={{ scaleX: Math.max(0.03, roundedProgress / 100) }}
                  className="h-full w-full origin-left bg-ink"
                  initial={{ scaleX: 0.03 }}
                  transition={{ duration: 0.35, ease: SIGNATURE_EASE }}
                />
              </div>
              <p className="m-0 mt-4 text-body text-graphite">{t.loadingBody}</p>
            </motion.div>

            <div className="flex items-center justify-between border-t border-hairline pt-5">
              <Label>{t.loadingFooter}</Label>
              <Label>{t.loadingScene}</Label>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
