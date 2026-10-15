"use client";

import { useEffect } from "react";
import { Pill } from "@/components/design-system/pill";
import type { ProjectAutosaveStatus } from "@/features/projects/ui/use-project-autosave";
import { useProjectAutosave } from "@/features/projects/ui/use-project-autosave";
import type { EditableProject } from "@/features/projects/ui/project-editor-types";
import { INTL_LOCALE, type Locale } from "@/lib/i18n";
import { getMessages } from "@/lib/messages";
import { useLocale, useMessages } from "@/lib/messages/locale-context";

type ProjectAutosaveProps = {
  configurationCode: string;
  onRestore: (configurationCode: string) => boolean;
  onSaveAsNew: (configurationCode: string) => void;
  onStatus: (status: ProjectAutosaveStatus) => void;
  project: EditableProject;
};

function formatTime(iso: string, locale: Locale) {
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], { hour: "2-digit", minute: "2-digit" }).format(
    new Date(iso)
  );
}

/** One line for the HUD: what the autosave is doing right now. */
export function describeAutosave(status: ProjectAutosaveStatus | null, locale: Locale) {
  if (!status) return null;
  const t = getMessages(locale).autosave;
  switch (status.phase) {
    case "saving":
      return t.saving;
    case "pending":
      return t.pending;
    case "saved":
      return t.saved(formatTime(status.savedAt, locale));
    case "error":
      return t.notSaved;
    default:
      return t.draftWaiting;
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
  const locale = useLocale();
  const messages = useMessages();
  const t = messages.autosave;
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
      <Notice live="polite" title={t.recoveryTitle}>
        <p className="m-0 text-caption text-graphite">
          {t.recoveryBody(formatTime(status.updatedAt, locale))}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Pill className="h-11" onClick={restoreRecovery}>
            {t.restoreDraft}
          </Pill>
          <Pill onClick={discardRecovery} variant="secondary">
            {messages.common.discard}
          </Pill>
        </div>
      </Notice>
    );
  }

  if (status.phase === "stale-recovery") {
    return (
      <Notice live="assertive" title={t.staleTitle}>
        <p className="m-0 text-caption text-graphite">{t.staleBody}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Pill
            className="h-11"
            onClick={() => {
              discardRecovery();
              onSaveAsNew(status.configurationCode);
            }}
          >
            {t.saveAsNew}
          </Pill>
          <Pill onClick={discardRecovery} variant="secondary">
            {messages.common.discard}
          </Pill>
        </div>
      </Notice>
    );
  }

  if (status.phase === "conflict") {
    return (
      <Notice live="assertive" title={t.conflictTitle}>
        <p className="m-0 text-caption text-graphite">{t.conflictBody}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Pill
            className="h-11"
            onClick={() => {
              discardRecovery();
              window.location.reload();
            }}
          >
            {t.loadLatest}
          </Pill>
          <Pill
            onClick={() => {
              discardRecovery();
              onSaveAsNew(configurationCode);
            }}
            variant="secondary"
          >
            {t.saveAsNew}
          </Pill>
        </div>
      </Notice>
    );
  }

  if (status.phase === "error") {
    return (
      <Notice live="assertive" title={t.errorTitle}>
        <p className="m-0 text-caption text-graphite">{status.message}</p>
        <div className="mt-4">
          <Pill
            className="h-11"
            onClick={status.requiresSignIn ? () => window.location.reload() : retry}
          >
            {status.requiresSignIn ? t.signInAgain : t.saveAgain}
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
