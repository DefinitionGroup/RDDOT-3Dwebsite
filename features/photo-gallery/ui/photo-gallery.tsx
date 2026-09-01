"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  formatGalleryDate,
  PHOTO_DISCLOSURE,
  type GalleryResponse,
  type SerializedGalleryCursor,
  type SerializedGalleryPhoto
} from "@/features/photo-gallery/ui/gallery-types";

/**
 * Display URLs are presigned and expire. Refresh a little before they do, so a
 * gallery left open on screen keeps working instead of decaying into broken
 * images.
 */
const REFRESH_MARGIN_MS = 60_000;

type LoadPhase =
  | { phase: "loading" }
  | { phase: "ready" }
  | { phase: "error"; message: string };

type Scope = { kind: "account" } | { kind: "project"; projectId: string };

function endpointFor(scope: Scope, cursor: SerializedGalleryCursor | null) {
  const base =
    scope.kind === "account"
      ? "/api/photos"
      : `/api/projects/${scope.projectId}/photos`;
  if (!cursor) return base;

  const parameters = new URLSearchParams({
    cursorCreatedAt: cursor.createdAt,
    cursorId: cursor.id
  });
  return `${base}?${parameters.toString()}`;
}

export function PhotoGallery({
  scope,
  initialPhotos,
  initialNextCursor,
  initialTotalCount,
  heading = "Visualisierungen",
  emptyMessage = "Noch keine Visualisierung. Erzeugte Ansichten sammeln sich hier.",
  density = "roomy"
}: {
  scope: Scope;
  initialPhotos: SerializedGalleryPhoto[];
  initialNextCursor: SerializedGalleryCursor | null;
  initialTotalCount: number;
  heading?: string;
  emptyMessage?: string;
  /**
   * `compact` is for the configurator panel, which is far narrower than a
   * viewport breakpoint can detect — at three columns its captions truncate to
   * unreadable stubs.
   */
  density?: "roomy" | "compact";
}) {
  const isCompact = density === "compact";
  const [photos, setPhotos] = useState(initialPhotos);
  const [nextCursor, setNextCursor] = useState(initialNextCursor);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [status, setStatus] = useState<LoadPhase>({ phase: "ready" });
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [lightboxId, setLightboxId] = useState<string | null>(null);
  const [deleteCandidateId, setDeleteCandidateId] = useState<string | null>(null);
  const [busyPhotoId, setBusyPhotoId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const prefersReducedMotion = useReducedMotion();
  const scopeKey = scope.kind === "account" ? "account" : scope.projectId;

  /**
   * Reloads the first page. Also the refresh path when display URLs are close to
   * expiring, which is why it replaces rather than appends.
   */
  const loadFirstPage = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const response = await fetch(endpointFor(scope, null), {
          cache: "no-store",
          signal
        });
        const payload = (await response
          .json()
          .catch(() => null)) as GalleryResponse | null;

        if (!response.ok || !payload?.photos) {
          setStatus({
            phase: "error",
            message:
              payload?.error ?? "Die Visualisierungen konnten nicht geladen werden."
          });
          return;
        }

        setPhotos(payload.photos);
        setTotalCount(payload.totalCount ?? payload.photos.length);
        setNextCursor(payload.nextCursor ?? null);
        setStatus({ phase: "ready" });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setStatus({
          phase: "error",
          message: "Die Verbindung wurde unterbrochen."
        });
      }
    },
    // Only the identity of the scope matters, not the object reference.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scopeKey]
  );

  // Re-mint the presigned URLs shortly before the earliest one lapses.
  const refreshTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    clearTimeout(refreshTimeout.current);
    if (photos.length === 0) return;

    const earliestExpiry = Math.min(
      ...photos.map((photo) => new Date(photo.displayUrlExpiresAt).getTime())
    );
    const delay = Math.max(5_000, earliestExpiry - Date.now() - REFRESH_MARGIN_MS);
    refreshTimeout.current = setTimeout(() => void loadFirstPage(), delay);

    return () => clearTimeout(refreshTimeout.current);
  }, [photos, loadFirstPage]);

  async function loadMore() {
    if (!nextCursor || isLoadingMore) return;
    setIsLoadingMore(true);
    setActionError(null);

    try {
      const response = await fetch(endpointFor(scope, nextCursor), {
        cache: "no-store"
      });
      const payload = (await response
        .json()
        .catch(() => null)) as GalleryResponse | null;

      if (!response.ok || !payload?.photos) {
        setActionError(
          payload?.error ?? "Weitere Visualisierungen konnten nicht geladen werden."
        );
        return;
      }

      setPhotos((current) => [
        ...current,
        ...payload.photos!.filter(
          (photo) => !current.some((existing) => existing.id === photo.id)
        )
      ]);
      setTotalCount(payload.totalCount ?? totalCount);
      setNextCursor(payload.nextCursor ?? null);
    } catch {
      setActionError("Die Verbindung wurde beim Nachladen unterbrochen.");
    } finally {
      setIsLoadingMore(false);
    }
  }

  /**
   * The download URL is minted per request and carries an attachment
   * disposition, so it is fetched at click time rather than held in the page.
   */
  async function download(photoId: string) {
    setBusyPhotoId(photoId);
    setActionError(null);

    try {
      const response = await fetch(`/api/photos/${photoId}`, { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as {
        url?: string;
        filename?: string;
        error?: string;
      } | null;

      if (!response.ok || !payload?.url) {
        setActionError(
          payload?.error ?? "Der Download konnte nicht vorbereitet werden."
        );
        return;
      }

      const anchor = document.createElement("a");
      anchor.href = payload.url;
      anchor.download = payload.filename ?? "visualisierung.jpg";
      anchor.rel = "noopener";
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
    } catch {
      setActionError("Die Verbindung wurde unterbrochen.");
    } finally {
      setBusyPhotoId(null);
    }
  }

  async function deletePhoto(photoId: string) {
    setBusyPhotoId(photoId);
    setActionError(null);

    try {
      const response = await fetch(`/api/photos/${photoId}`, { method: "DELETE" });

      if (!response.ok && response.status !== 404) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        setActionError(
          payload?.error ?? "Die Visualisierung konnte nicht gelöscht werden."
        );
        return;
      }

      setPhotos((current) => current.filter((photo) => photo.id !== photoId));
      setTotalCount((current) => Math.max(0, current - 1));
      setDeleteCandidateId(null);
      if (lightboxId === photoId) setLightboxId(null);
    } catch {
      setActionError("Die Verbindung wurde unterbrochen.");
    } finally {
      setBusyPhotoId(null);
    }
  }

  const lightboxPhoto = photos.find((photo) => photo.id === lightboxId) ?? null;

  useEffect(() => {
    if (!lightboxPhoto) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setLightboxId(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [lightboxPhoto]);

  return (
    <section className="border-t border-hairline pt-5">
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-body text-ink">{heading}</p>
        <span className="text-sm text-graphite">
          {status.phase === "loading"
            ? "Lädt …"
            : totalCount === 1
              ? "1 Ansicht"
              : `${totalCount} Ansichten`}
        </span>
      </div>

      {status.phase === "error" && (
        <div className="mt-4 text-sm leading-6 text-signature">
          <p>{status.message}</p>
          <button
            className="mt-2 underline underline-offset-4"
            onClick={() => {
              setStatus({ phase: "loading" });
              void loadFirstPage();
            }}
            type="button"
          >
            Erneut versuchen
          </button>
        </div>
      )}

      {status.phase === "ready" && photos.length === 0 && (
        <p className="mt-4 max-w-[46ch] text-sm leading-6 text-graphite">
          {emptyMessage}
        </p>
      )}

      {photos.length > 0 && (
        <>
          <ul
            className={`mt-5 grid gap-3 ${
              isCompact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3"
            }`}
          >
            {photos.map((photo) => (
              <li key={photo.id}>
                <button
                  aria-label={`${photo.projectName}, ${formatGalleryDate(photo.createdAt)} — grösser anzeigen`}
                  className="group relative block w-full overflow-hidden bg-mist focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signature focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
                  onClick={() => setLightboxId(photo.id)}
                  style={{ aspectRatio: `${photo.width} / ${photo.height}` }}
                  type="button"
                >
                  {/* Deliberately not next/image: these URLs are presigned and
                      short-lived, so routing them through the image optimizer
                      would both leak the signed URL and cache a value that
                      expires. The intrinsic size prevents layout shift. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    alt={`Visualisierung ${photo.projectName}`}
                    className="size-full object-cover transition-opacity duration-300 group-hover:opacity-90"
                    height={photo.height}
                    loading="lazy"
                    onError={() => void loadFirstPage()}
                    src={photo.displayUrl}
                    width={photo.width}
                  />
                </button>

                <div
                  className={
                    isCompact
                      ? "mt-2"
                      : "mt-2 flex items-baseline justify-between gap-2"
                  }
                >
                  <p className="min-w-0 truncate text-sm text-graphite">
                    {scope.kind === "account"
                      ? photo.projectName
                      : (photo.revisionLabel ?? "Stand")}
                  </p>
                  <span
                    className={`text-xs text-ash ${isCompact ? "block" : "shrink-0"}`}
                  >
                    {formatGalleryDate(photo.createdAt)}
                  </span>
                </div>
              </li>
            ))}
          </ul>

          <p className="mt-4 text-xs leading-5 text-graphite">
            {PHOTO_DISCLOSURE}
          </p>
        </>
      )}

      {nextCursor && (
        <div className="mt-4 border-t border-hairline pt-4">
          <button
            className="min-h-11 text-sm text-graphite underline decoration-hairline underline-offset-4 transition-colors hover:text-ink disabled:cursor-wait disabled:text-ash"
            disabled={isLoadingMore}
            onClick={() => void loadMore()}
            type="button"
          >
            {isLoadingMore ? "Lädt …" : "Weitere Ansichten laden"}
          </button>
        </div>
      )}

      <div aria-live="polite" className="mt-3 min-h-6 text-sm leading-6">
        {actionError && <p className="text-signature">{actionError}</p>}
      </div>

      <AnimatePresence>
        {lightboxPhoto && (
          <motion.div
            animate={{ opacity: 1 }}
            aria-label="Visualisierung"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center bg-ink/90 p-4 sm:p-8"
            exit={{ opacity: 0 }}
            initial={{ opacity: prefersReducedMotion ? 1 : 0 }}
            onClick={(event) => {
              if (event.target === event.currentTarget) setLightboxId(null);
            }}
            role="dialog"
            transition={{ duration: 0.2 }}
          >
            <div className="flex max-h-full w-full max-w-4xl flex-col gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt={`Visualisierung ${lightboxPhoto.projectName}`}
                className="max-h-[70svh] w-full object-contain"
                height={lightboxPhoto.height}
                onError={() => void loadFirstPage()}
                src={lightboxPhoto.displayUrl}
                width={lightboxPhoto.width}
              />

              <div className="flex flex-wrap items-center justify-between gap-4 text-paper">
                <div className="min-w-0">
                  <p className="truncate text-body">
                    {lightboxPhoto.projectName}
                    {lightboxPhoto.revisionLabel
                      ? ` · ${lightboxPhoto.revisionLabel}`
                      : ""}
                  </p>
                  <p className="mt-1 text-xs text-white/70">
                    {formatGalleryDate(lightboxPhoto.createdAt)} ·{" "}
                    {lightboxPhoto.width}×{lightboxPhoto.height} · {PHOTO_DISCLOSURE}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-4">
                  <button
                    className="min-h-11 text-sm text-white/80 underline underline-offset-4 transition-colors hover:text-paper disabled:cursor-wait"
                    disabled={busyPhotoId === lightboxPhoto.id}
                    onClick={() => void download(lightboxPhoto.id)}
                    type="button"
                  >
                    {busyPhotoId === lightboxPhoto.id ? "Lädt …" : "Herunterladen"}
                  </button>
                  <button
                    className="min-h-11 text-sm text-white/80 underline underline-offset-4 transition-colors hover:text-signature"
                    onClick={() => setDeleteCandidateId(lightboxPhoto.id)}
                    type="button"
                  >
                    Löschen
                  </button>
                  <button
                    className="min-h-11 text-sm text-white/80 underline underline-offset-4 transition-colors hover:text-paper"
                    onClick={() => setLightboxId(null)}
                    type="button"
                  >
                    Schliessen
                  </button>
                </div>
              </div>

              {deleteCandidateId === lightboxPhoto.id && (
                <div className="border-t border-white/20 pt-4 text-paper">
                  <p className="text-sm leading-6 text-white/80">
                    Diese Visualisierung wird dauerhaft gelöscht. Ihre
                    Konfiguration und deren Versionen bleiben unverändert.
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      className="min-h-11 bg-signature px-4 text-body text-paper transition-colors hover:bg-paper hover:text-ink disabled:cursor-wait"
                      disabled={busyPhotoId === lightboxPhoto.id}
                      onClick={() => void deletePhoto(lightboxPhoto.id)}
                      type="button"
                    >
                      {busyPhotoId === lightboxPhoto.id
                        ? "Löscht …"
                        : "Endgültig löschen"}
                    </button>
                    <button
                      className="min-h-11 border border-white/40 px-4 text-body text-paper transition-colors hover:bg-white/10"
                      onClick={() => setDeleteCandidateId(null)}
                      type="button"
                    >
                      Abbrechen
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
