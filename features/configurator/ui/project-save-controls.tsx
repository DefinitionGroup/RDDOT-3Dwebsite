"use client";

import { useEffect } from "react";
import { Pill } from "@/components/design-system/pill";
import type { ProjectAutosaveStatus } from "@/features/projects/ui/use-project-autosave";
import { useProjectAutosave } from "@/features/projects/ui/use-project-autosave";
import type { EditableProject } from "@/features/projects/ui/project-editor-types";

type ProjectAutosaveProps = {
  configurationCode: string;
  onRestore: (configurationCode: string) => boolean;
  onSaveAsNew: (configurationCode: string) => void;
  onStatus: (status: ProjectAutosaveStatus) => void;
  project: EditableProject;
};

function formatTime(iso: string) {
  return new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit" }).format(
    new Date(iso)
  );
}

/** One line for the HUD: what the autosave is doing right now. */
export function describeAutosave(status: ProjectAutosaveStatus | null) {
  if (!status) return null;
  switch (status.phase) {
    case "saving":
      return "speichert …";
    case "pending":
      return "Änderung erkannt …";
    case "saved":
      return `gespeichert ${formatTime(status.savedAt)}`;
    case "error":
      return "nicht gespeichert";
    default:
      return "Entwurf wartet";
  }
}

/**
 * Owns the autosave for a Project and stays mounted for the life of the
 * configurator, whichever panel section is open. It renders only the states
 * that need a decision — a recovered draft, a conflict, an error — as a card
 * above the panel's accordions, and reports every status upward for the HUD.
 */
export function ProjectAutosave({
  configurationCode,
  onRestore,
  onSaveAsNew,
  onStatus,
  project
}: ProjectAutosaveProps) {
  const { discardRecovery, restoreRecovery, retry, status } = useProjectAutosave({
    configurationCode,
    onRestore,
    project
  });

  useEffect(() => {
    onStatus(status);
  }, [onStatus, status]);

  if (status.phase === "recovery") {
    return (
      <Notice live="polite" title="Lokaler Entwurf gefunden.">
        <p className="m-0 text-caption text-graphite">
          Eine noch nicht bestätigte Änderung aus diesem Browser wartet seit{" "}
          {formatTime(status.updatedAt)} Uhr auf Sie.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Pill className="h-11" onClick={restoreRecovery}>
            Entwurf wiederherstellen
          </Pill>
          <Pill onClick={discardRecovery} variant="secondary">
            Verwerfen
          </Pill>
        </div>
      </Notice>
    );
  }

  if (status.phase === "stale-recovery") {
    return (
      <Notice live="assertive" title="Älterer lokaler Entwurf gefunden.">
        <p className="m-0 text-caption text-graphite">
          Das Projekt wurde seitdem geändert. Der lokale Entwurf kann deshalb nur als neues
          Projekt gesichert oder verworfen werden.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Pill
            className="h-11"
            onClick={() => {
              discardRecovery();
              onSaveAsNew(status.configurationCode);
            }}
          >
            Als neues Projekt
          </Pill>
          <Pill onClick={discardRecovery} variant="secondary">
            Verwerfen
          </Pill>
        </div>
      </Notice>
    );
  }

  if (status.phase === "conflict") {
    return (
      <Notice live="assertive" title="Neuere Projektversion gefunden.">
        <p className="m-0 text-caption text-graphite">
          Ihre Änderung wurde nicht überschrieben. Laden Sie den neuesten Stand oder sichern
          Sie diese Variante als neues Projekt.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Pill
            className="h-11"
            onClick={() => {
              discardRecovery();
              window.location.reload();
            }}
          >
            Neueste Version laden
          </Pill>
          <Pill
            onClick={() => {
              discardRecovery();
              onSaveAsNew(configurationCode);
            }}
            variant="secondary"
          >
            Als neues Projekt
          </Pill>
        </div>
      </Notice>
    );
  }

  if (status.phase === "error") {
    return (
      <Notice live="assertive" title="Nicht gespeichert.">
        <p className="m-0 text-caption text-graphite">{status.message}</p>
        <div className="mt-4">
          <Pill
            className="h-11"
            onClick={status.requiresSignIn ? () => window.location.reload() : retry}
          >
            {status.requiresSignIn ? "Erneut anmelden" : "Erneut speichern"}
          </Pill>
        </div>
      </Notice>
    );
  }

  return null;
}

function Notice({
  children,
  live,
  title
}: {
  children: React.ReactNode;
  live: "polite" | "assertive";
  title: string;
}) {
  return (
    <div aria-live={live} className="mt-5 rounded-card border border-hairline p-4">
      <p className="m-0 mb-2 text-nav">{title}</p>
      {children}
    </div>
  );
}
