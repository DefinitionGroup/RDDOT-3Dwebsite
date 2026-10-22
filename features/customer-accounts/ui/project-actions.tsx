"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { startTransition, useEffect, useId, useRef, useState } from "react";
import type { AccountProject } from "@/features/customer-accounts/account-projects";
import type { ProjectLifecycleAction } from "@/features/projects/project-lifecycle";
import { apiErrorMessage } from "@/lib/messages";
import { useMessages } from "@/lib/messages/locale-context";
import { DURATION, SIGNATURE_EASE } from "@/lib/motion";

/**
 * Archive, trash, restore and duplicate, as the account's cards and lists use
 * them. Each action asks the server, then reloads the account's data; one runs
 * at a time.
 */
export function useProjectActions() {
  const router = useRouter();
  const messages = useMessages();
  const t = messages.account;
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(projectId: string, request: () => Promise<Response>) {
    setBusyId(projectId);
    setError(null);
    try {
      const response = await request();
      if (!response.ok) {
        const payload: unknown = await response.json().catch(() => null);
        setError(apiErrorMessage(messages, payload, t.actionFailed));
        return;
      }
      startTransition(() => router.refresh());
    } catch {
      setError(messages.common.connectionLostRetry);
    } finally {
      setBusyId(null);
    }
  }

  return {
    busyId,
    error,
    change(projectId: string, action: ProjectLifecycleAction) {
      return run(projectId, () =>
        fetch(`/api/projects/${projectId}/lifecycle`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action })
        })
      );
    },
    duplicate(project: AccountProject) {
      return run(project.id, () =>
        fetch(`/api/projects/${project.id}/duplicate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), name: t.copyName(project.name) })
        })
      );
    }
  };
}

export type ProjectActions = ReturnType<typeof useProjectActions>;

const itemClass =
  "flex min-h-11 w-full items-center rounded-[6px] px-3 text-left text-nav text-ink transition-colors duration-state ease-signature hover:bg-ink/10 disabled:pointer-events-none disabled:opacity-40";

function DotsIcon() {
  return (
    <svg aria-hidden="true" fill="currentColor" height="16" viewBox="0 0 16 16" width="16">
      <circle cx="3.5" cy="8" r="1.4" />
      <circle cx="8" cy="8" r="1.4" />
      <circle cx="12.5" cy="8" r="1.4" />
    </svg>
  );
}

/**
 * The card's own menu, over its picture: duplicate, archive, trash. Trash asks
 * once more, because it revokes the share links for good. Escape or a click
 * outside closes it.
 */
export function ProjectMenu({ actions, project }: { actions: ProjectActions; project: AccountProject }) {
  const t = useMessages().account;
  const [open, setOpen] = useState(false);
  const [confirmTrash, setConfirmTrash] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listId = useId();
  const prefersReducedMotion = useReducedMotion();
  const busy = actions.busyId === project.id;

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      close();
      buttonRef.current?.focus();
    };
    document.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function close() {
    setOpen(false);
    setConfirmTrash(false);
  }

  return (
    <div className="absolute right-3 top-3 z-10" ref={rootRef}>
      <button
        aria-controls={listId}
        aria-expanded={open}
        aria-label={t.projectActions(project.name)}
        className="chip-solid flex size-10 items-center justify-center rounded-pill text-ink transition-colors duration-state ease-signature hover:bg-ink/[.14] disabled:opacity-40"
        disabled={busy}
        onClick={() => (open ? close() : setOpen(true))}
        ref={buttonRef}
        type="button"
      >
        <DotsIcon />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="absolute right-0 top-full mt-2 w-64 rounded-card border border-hairline bg-charcoal p-1.5 shadow-[0_12px_40px_rgb(0_0_0/0.5)]"
            exit={{ opacity: 0, y: prefersReducedMotion ? 0 : -6 }}
            id={listId}
            initial={{ opacity: 0, y: prefersReducedMotion ? 0 : -6 }}
            transition={{ duration: DURATION.state, ease: SIGNATURE_EASE }}
          >
            {confirmTrash ? (
              <div className="grid gap-1 p-1.5">
                <p className="m-0 px-1.5 pb-2 pt-1 text-caption text-graphite">{t.trashWarning}</p>
                <button
                  className={itemClass}
                  onClick={() => {
                    close();
                    void actions.change(project.id, "trash");
                  }}
                  type="button"
                >
                  {t.confirmTrash}
                </button>
                <button className={`${itemClass} text-graphite`} onClick={() => setConfirmTrash(false)} type="button">
                  {t.cancel}
                </button>
              </div>
            ) : (
              <div className="grid">
                <button
                  className={itemClass}
                  onClick={() => {
                    close();
                    void actions.duplicate(project);
                  }}
                  type="button"
                >
                  {t.duplicate}
                </button>
                <button
                  className={itemClass}
                  onClick={() => {
                    close();
                    void actions.change(project.id, "archive");
                  }}
                  type="button"
                >
                  {t.archive}
                </button>
                <button className={itemClass} onClick={() => setConfirmTrash(true)} type="button">
                  {t.moveToTrash}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const rowActionClass =
  "inline-flex min-h-11 items-center rounded-pill px-3 text-nav text-graphite transition-colors duration-state ease-signature hover:bg-ink/[.06] hover:text-ink disabled:pointer-events-none disabled:opacity-40";

/** A row in the account's Archive or Trash, with what can be done from there. */
export function RestingProjectRow({
  actions,
  detail,
  project
}: {
  actions: ProjectActions;
  detail: string;
  project: AccountProject;
}) {
  const t = useMessages().account;
  const [confirmTrash, setConfirmTrash] = useState(false);
  const busy = actions.busyId === project.id;

  return (
    <li className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-hairline py-3">
      <span className="min-w-0">
        <span className="block truncate text-nav text-ink">{project.name}</span>
        <span className="block text-caption text-ash">{confirmTrash ? t.trashWarning : detail}</span>
      </span>
      <span className="-mr-3 flex flex-wrap items-center gap-1">
        {confirmTrash ? (
          <>
            <button
              className={`${rowActionClass} text-ink`}
              disabled={busy}
              onClick={() => {
                setConfirmTrash(false);
                void actions.change(project.id, "trash");
              }}
              type="button"
            >
              {t.confirmTrash}
            </button>
            <button className={rowActionClass} onClick={() => setConfirmTrash(false)} type="button">
              {t.cancel}
            </button>
          </>
        ) : (
          <>
            <button
              className={`${rowActionClass} text-ink`}
              disabled={busy}
              onClick={() => void actions.change(project.id, "restore")}
              type="button"
            >
              {t.restore}
            </button>
            {project.lifecycle === "archived" && (
              <button className={rowActionClass} disabled={busy} onClick={() => setConfirmTrash(true)} type="button">
                {t.moveToTrash}
              </button>
            )}
          </>
        )}
      </span>
    </li>
  );
}
