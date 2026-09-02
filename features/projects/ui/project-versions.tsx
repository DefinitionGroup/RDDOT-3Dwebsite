"use client";

import { useRef, useState } from "react";
import { clearProjectDraftRecovery } from "@/features/projects/project-draft-recovery";
import type { EditableProjectRevision } from "@/features/projects/ui/project-editor-types";

type VersionActionStatus =
  | { phase: "idle" }
  | { phase: "saving" }
  | { phase: "restoring"; revisionId: string }
  | { phase: "success"; message: string }
  | {
      phase: "error";
      message: string;
      requiresReload?: boolean;
      retry: { kind: "save" } | { kind: "restore"; revisionId: string };
    };

type CheckpointResponse = {
  revision?: EditableProjectRevision;
  created?: boolean;
  error?: string;
};

export function ProjectVersions({
  initialRevisions,
  initialNextCursor,
  initialTotalCount,
  projectId,
  savedVersion
}: {
  initialRevisions: EditableProjectRevision[];
  initialNextCursor: { createdAt: string; id: string } | null;
  initialTotalCount: number;
  projectId: string;
  savedVersion: number | null;
}) {
  const [revisions, setRevisions] = useState(initialRevisions);
  const [nextCursor, setNextCursor] = useState(initialNextCursor);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [paginationError, setPaginationError] = useState<string | null>(null);
  const [status, setStatus] = useState<VersionActionStatus>({ phase: "idle" });
  const [restoreCandidateId, setRestoreCandidateId] = useState<string | null>(null);
  const checkpointOperation = useRef<string | null>(null);
  const isBusy = status.phase === "saving" || status.phase === "restoring";

  async function saveVersion() {
    if (!savedVersion || isBusy) return;
    checkpointOperation.current ??= crypto.randomUUID();
    setStatus({ phase: "saving" });

    try {
      const response = await fetch(`/api/projects/${projectId}/revisions`, {
        body: JSON.stringify({
          expectedVersion: savedVersion,
          idempotencyKey: checkpointOperation.current
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST"
      });
      const payload = (await response.json().catch(() => null)) as CheckpointResponse | null;

      if (!response.ok || !payload?.revision) {
        setStatus({
          phase: "error",
          message:
            payload?.error ??
            "Die Version konnte nicht gespeichert werden. Bitte versuchen Sie es erneut.",
          requiresReload: response.status === 401 || response.status === 409,
          retry: { kind: "save" }
        });
        return;
      }

      if (payload.created) {
        setRevisions((current) => [
          payload.revision!,
          ...current.filter((revision) => revision.id !== payload.revision!.id)
        ]);
        setTotalCount((current) => current + 1);
      }
      checkpointOperation.current = null;
      setStatus({
        phase: "success",
        message: payload.created
          ? "Version dauerhaft gespeichert."
          : "Dieser Stand war bereits als Version gespeichert."
      });
    } catch {
      setStatus({
        phase: "error",
        message:
          "Die Verbindung wurde unterbrochen. Sie können dieselbe Speicheranfrage erneut senden.",
        retry: { kind: "save" }
      });
    }
  }

  async function loadMore() {
    if (!nextCursor || isLoadingMore) return;
    setIsLoadingMore(true);
    setPaginationError(null);

    try {
      const parameters = new URLSearchParams({
        cursorCreatedAt: nextCursor.createdAt,
        cursorId: nextCursor.id
      });
      const response = await fetch(
        `/api/projects/${projectId}/revisions?${parameters.toString()}`,
        { cache: "no-store" }
      );
      const payload = (await response.json().catch(() => null)) as {
        revisions?: EditableProjectRevision[];
        totalCount?: number;
        nextCursor?: { createdAt: string; id: string } | null;
        error?: string;
      } | null;

      if (!response.ok || !payload?.revisions || payload.totalCount === undefined) {
        setPaginationError(
          payload?.error ?? "Weitere Versionen konnten nicht geladen werden."
        );
        return;
      }

      setRevisions((current) => [
        ...current,
        ...payload.revisions!.filter(
          (revision) => !current.some((item) => item.id === revision.id)
        )
      ]);
      setTotalCount(payload.totalCount);
      setNextCursor(payload.nextCursor ?? null);
    } catch {
      setPaginationError("Die Verbindung wurde beim Nachladen unterbrochen.");
    } finally {
      setIsLoadingMore(false);
    }
  }

  async function restoreVersion(revisionId: string) {
    if (!savedVersion || isBusy) return;
    setStatus({ phase: "restoring", revisionId });

    try {
      const response = await fetch(
        `/api/projects/${projectId}/revisions/${revisionId}/restore`,
        {
          body: JSON.stringify({ expectedVersion: savedVersion }),
          headers: { "Content-Type": "application/json" },
          method: "POST"
        }
      );
      const payload = (await response.json().catch(() => null)) as {
        restored?: boolean;
        error?: string;
      } | null;

      if (!response.ok) {
        setStatus({
          phase: "error",
          message:
            payload?.error ??
            "Die Version konnte nicht wiederhergestellt werden. Bitte versuchen Sie es erneut.",
          requiresReload: response.status === 401 || response.status === 409,
          retry: { kind: "restore", revisionId }
        });
        return;
      }

      if (!payload?.restored) {
        setRestoreCandidateId(null);
        setStatus({ phase: "success", message: "Diese Version ist bereits aktiv." });
        return;
      }

      clearProjectDraftRecovery(window.localStorage, projectId);
      window.location.reload();
    } catch {
      setStatus({
        phase: "error",
        message:
          "Die Verbindung wurde unterbrochen. Der aktuelle Arbeitsstand wurde nicht ersetzt.",
        retry: { kind: "restore", revisionId }
      });
    }
  }

  return (
    <section className="border-t border-hairline pt-5">
      <div className="flex items-center justify-between gap-4">
        <p className="m-0 text-nav">Versionen</p>
        <button
          className="inline-flex h-11 items-center justify-center rounded-pill border border-ink px-5 text-nav font-label leading-none text-ink transition-colors duration-state ease-signature hover:bg-ink/10 disabled:cursor-wait disabled:border-hairline disabled:text-ash disabled:hover:bg-transparent"
          disabled={!savedVersion || isBusy}
          onClick={() => void saveVersion()}
          type="button"
        >
          {status.phase === "saving" ? "Speichert …" : "Version speichern"}
        </button>
      </div>

      {!savedVersion && (
        <p className="m-0 mt-3 text-caption text-graphite">
          Warten Sie, bis der aktuelle Arbeitsstand automatisch gespeichert ist.
        </p>
      )}

      <details className="mt-4 border-y border-hairline" open={totalCount > 0}>
        <summary className="cursor-pointer py-4 text-caption text-graphite transition-colors duration-state ease-signature hover:text-ink">
          {totalCount === 1
            ? "1 gespeicherte Version"
            : `${totalCount} gespeicherte Versionen`}
        </summary>

        {revisions.length === 0 ? (
          <p className="m-0 border-t border-hairline py-5 text-caption text-graphite">
            Noch keine feste Version. Autosaves bleiben davon getrennt.
          </p>
        ) : (
          <ol className="divide-y divide-hairline border-t border-hairline">
            {revisions.map((revision) => (
              <li className="py-5" key={revision.id}>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="m-0 text-caption text-ink">
                      {revision.label ?? "Gespeicherte Version"}
                    </p>
                    <p className="m-0 mt-1 text-caption text-graphite">
                      {new Intl.DateTimeFormat("de-DE", {
                        dateStyle: "medium",
                        timeStyle: "short"
                      }).format(new Date(revision.createdAt))}
                    </p>
                  </div>
                  <button
                    className="shrink-0 inline-flex min-h-11 items-center text-caption text-graphite underline decoration-hairline underline-offset-4 transition-colors duration-state ease-signature hover:text-porcelain disabled:cursor-wait disabled:text-ash"
                    disabled={!savedVersion || isBusy}
                    onClick={() => setRestoreCandidateId(revision.id)}
                    type="button"
                  >
                    Wiederherstellen
                  </button>
                </div>

                {revision.displaySnapshot ? (
                  <div className="mt-3 text-caption text-graphite">
                    <p className="m-0">
                      {revision.displaySnapshot.cabinetFinish} ·{" "}
                      {revision.displaySnapshot.frontFinish}
                    </p>
                    <p className="m-0">
                      {new Intl.NumberFormat("de-DE", {
                        currency: revision.displaySnapshot.currency,
                        maximumFractionDigits: 0,
                        style: "currency"
                      }).format(revision.displaySnapshot.totalCents / 100)}
                    </p>
                  </div>
                ) : (
                  <p className="m-0 mt-3 text-caption text-graphite">
                    Historischer Stand ohne aktuelle Anzeigeinformationen.
                  </p>
                )}

                {restoreCandidateId === revision.id && (
                  <div className="mt-4 border-t border-hairline pt-4">
                    <p className="m-0 text-caption text-graphite">
                      Der aktuelle Arbeitsstand wird vorher automatisch als
                      Sicherheitsversion festgehalten.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        className="inline-flex h-11 items-center justify-center rounded-pill bg-signature px-5 text-nav font-label leading-none text-ink transition-colors duration-state ease-signature hover:bg-signature-hover disabled:cursor-wait disabled:opacity-40"
                        disabled={isBusy}
                        onClick={() => void restoreVersion(revision.id)}
                        type="button"
                      >
                        {status.phase === "restoring" &&
                        status.revisionId === revision.id
                          ? "Stellt wieder her …"
                          : "Jetzt wiederherstellen"}
                      </button>
                      <button
                        className="inline-flex h-11 items-center justify-center rounded-pill border border-ink px-5 text-nav font-label leading-none text-ink transition-colors duration-state ease-signature hover:bg-ink/10 disabled:cursor-wait disabled:border-hairline disabled:text-ash disabled:hover:bg-transparent"
                        onClick={() => setRestoreCandidateId(null)}
                        type="button"
                      >
                        Abbrechen
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ol>
        )}

        {nextCursor && (
          <div className="border-t border-hairline py-4">
            <button
              className="inline-flex min-h-11 items-center text-caption text-graphite underline decoration-hairline underline-offset-4 transition-colors duration-state ease-signature hover:text-porcelain disabled:cursor-wait disabled:text-ash"
              disabled={isLoadingMore}
              onClick={() => void loadMore()}
              type="button"
            >
              {isLoadingMore ? "Lädt …" : "Weitere Versionen laden"}
            </button>
            {paginationError && (
              <p className="m-0 mt-2 text-caption text-ink">
                {paginationError}
              </p>
            )}
          </div>
        )}
      </details>

      <div aria-live="polite" className="mt-3 min-h-6 text-caption">
        {status.phase === "success" && (
          <p className="m-0 text-graphite">{status.message}</p>
        )}
        {status.phase === "error" && (
          <div className="text-ink">
            <p className="m-0">{status.message}</p>
            <button
              className="mt-2 inline-flex min-h-11 items-center text-caption underline underline-offset-4"
              onClick={() => {
                if (status.requiresReload) {
                  window.location.reload();
                  return;
                }
                if (status.retry.kind === "save") {
                  void saveVersion();
                  return;
                }
                void restoreVersion(status.retry.revisionId);
              }}
              type="button"
            >
              {status.requiresReload ? "Neu laden" : "Erneut versuchen"}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
