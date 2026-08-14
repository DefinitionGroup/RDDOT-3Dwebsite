"use client";

import { useEffect, useRef, useState } from "react";
import {
  clearProjectDraftRecovery,
  isProjectDraftCurrent,
  readProjectDraftRecovery,
  shouldClearProjectDraftAfterSave,
  writeProjectDraftRecovery
} from "@/features/projects/project-draft-recovery";
import type { EditableProject } from "@/features/projects/ui/project-editor-types";

export type ProjectAutosaveStatus =
  | { phase: "saved"; savedAt: string; savedVersion: number }
  | { phase: "pending" }
  | { phase: "saving" }
  | { phase: "recovery"; configurationCode: string; updatedAt: string }
  | { phase: "stale-recovery"; configurationCode: string; updatedAt: string }
  | { phase: "conflict"; currentVersion: number }
  | { phase: "error"; message: string; requiresSignIn?: boolean };

type SaveResponse = {
  project?: { updatedAt: string; version: number };
  currentVersion?: number;
  error?: string;
};

const AUTOSAVE_DELAY_MS = 800;

export function useProjectAutosave({
  configurationCode,
  onRestore,
  project
}: {
  configurationCode: string;
  onRestore: (configurationCode: string) => boolean;
  project: EditableProject;
}) {
  const [status, setStatus] = useState<ProjectAutosaveStatus>({
    phase: "saved",
    savedAt: project.updatedAt,
    savedVersion: project.version
  });
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [drainAttempt, setDrainAttempt] = useState(0);
  const latestCode = useRef(configurationCode);
  const savedCode = useRef(configurationCode);
  const savedAt = useRef(project.updatedAt);
  const version = useRef(project.version);
  const inFlight = useRef(false);
  const blockedByConflict = useRef(false);
  const hasRecovery = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    const recovery = readProjectDraftRecovery(window.localStorage, project.id);
    if (!recovery) return;
    if (recovery.configurationCode === savedCode.current) {
      clearProjectDraftRecovery(window.localStorage, project.id);
      return;
    }

    hasRecovery.current = true;
    setStatus({
      phase: isProjectDraftCurrent(recovery, project.version)
        ? "recovery"
        : "stale-recovery",
      configurationCode: recovery.configurationCode,
      updatedAt: recovery.updatedAt
    });
  }, [project.id, project.version]);

  useEffect(() => {
    const configurationChanged = configurationCode !== latestCode.current;
    latestCode.current = configurationCode;
    if (configurationCode === savedCode.current) {
      if (hasRecovery.current) return;
      clearProjectDraftRecovery(window.localStorage, project.id);
      const restoreTimer = window.setTimeout(() => {
        if (mounted.current) {
          setStatus({
            phase: "saved",
            savedAt: savedAt.current,
            savedVersion: version.current
          });
        }
      }, 0);
      return () => window.clearTimeout(restoreTimer);
    }
    if (blockedByConflict.current) return;

    writeProjectDraftRecovery(window.localStorage, {
      schemaVersion: 1,
      projectId: project.id,
      configurationCode,
      baseVersion: version.current,
      updatedAt: new Date().toISOString()
    });

    const delay = configurationChanged
      ? AUTOSAVE_DELAY_MS
      : retryAttempt > 0
        ? 0
        : 250;
    const pendingTimer = window.setTimeout(() => {
      if (inFlight.current || blockedByConflict.current) return;

      const codeBeingSaved = latestCode.current;
      const expectedVersion = version.current;
      let savedSuccessfully = false;
      inFlight.current = true;
      setStatus({ phase: "saving" });

      void fetch(`/api/projects/${project.id}/configuration`, {
        body: JSON.stringify({
          configurationCode: codeBeingSaved,
          expectedVersion
        }),
        headers: { "Content-Type": "application/json" },
        method: "PUT"
      })
        .then(async (response) => {
          const payload = (await response.json().catch(() => null)) as SaveResponse | null;

          if (response.status === 409) {
            blockedByConflict.current = true;
            if (mounted.current) {
              setStatus({
                phase: "conflict",
                currentVersion: payload?.currentVersion ?? expectedVersion + 1
              });
            }
            return;
          }

          if (!response.ok || !payload?.project) {
            if (mounted.current) {
              setStatus({
                phase: "error",
                message:
                  payload?.error ??
                  "Die Änderung konnte nicht gespeichert werden. Bitte versuchen Sie es erneut.",
                requiresSignIn: response.status === 401
              });
            }
            return;
          }

          savedCode.current = codeBeingSaved;
          savedAt.current = payload.project.updatedAt;
          version.current = payload.project.version;
          if (
            shouldClearProjectDraftAfterSave(
              codeBeingSaved,
              latestCode.current
            )
          ) {
            clearProjectDraftRecovery(window.localStorage, project.id);
          }
          savedSuccessfully = true;
          if (mounted.current) {
            setStatus({
              phase: "saved",
              savedAt: payload.project.updatedAt,
              savedVersion: payload.project.version
            });
          }
        })
        .catch(() => {
          if (mounted.current) {
            setStatus({
              phase: "error",
              message:
                "Die Verbindung wurde unterbrochen. Ihre Änderung bleibt im Browser und kann erneut gespeichert werden."
            });
          }
        })
        .finally(() => {
          inFlight.current = false;
          if (
            mounted.current &&
            savedSuccessfully &&
            !blockedByConflict.current &&
            latestCode.current !== savedCode.current
          ) {
            setDrainAttempt((attempt) => attempt + 1);
          }
        });
    }, delay);

    const statusTimer = window.setTimeout(() => {
      if (mounted.current && !inFlight.current) setStatus({ phase: "pending" });
    }, 0);

    return () => {
      window.clearTimeout(pendingTimer);
      window.clearTimeout(statusTimer);
    };
  }, [configurationCode, drainAttempt, project.id, retryAttempt]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  function retry() {
    if (blockedByConflict.current) return;
    setRetryAttempt((attempt) => attempt + 1);
  }

  function restoreRecovery() {
    if (status.phase !== "recovery") return;
    if (!onRestore(status.configurationCode)) {
      clearProjectDraftRecovery(window.localStorage, project.id);
      hasRecovery.current = false;
      setStatus({
        phase: "error",
        message: "Der lokale Entwurf ist beschädigt und konnte nicht wiederhergestellt werden."
      });
      return;
    }

    hasRecovery.current = false;
    setStatus({ phase: "pending" });
  }

  function discardRecovery() {
    clearProjectDraftRecovery(window.localStorage, project.id);
    hasRecovery.current = false;
    setStatus({
      phase: "saved",
      savedAt: savedAt.current,
      savedVersion: version.current
    });
  }

  return { discardRecovery, restoreRecovery, retry, status };
}
