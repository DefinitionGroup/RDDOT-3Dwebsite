/**
 * Where a Project may go from where it is (CONTEXT.md, Archived and Trashed
 * Project). An Archived Project is out of the active workspace and read-only;
 * a Trashed one is blocked, its share links revoked for good, and restorable
 * for 30 days. Deleting for good is not a transition here.
 */
export type ProjectLifecycle = "active" | "archived" | "trashed";

export type ProjectLifecycleAction = "archive" | "trash" | "restore";

export const TRASH_RECOVERY_DAYS = 30;

const TARGET: Record<ProjectLifecycleAction, ProjectLifecycle> = {
  archive: "archived",
  trash: "trashed",
  restore: "active"
};

const ALLOWED_FROM: Record<ProjectLifecycleAction, readonly ProjectLifecycle[]> = {
  archive: ["active"],
  trash: ["active", "archived"],
  restore: ["archived", "trashed"]
};

/**
 * The lifecycle an action leads to from `current`: the target when allowed,
 * `current` itself when the Project is already there (a repeated request is
 * not an error), null when the move is not allowed (archiving from Trash).
 */
export function nextProjectLifecycle(
  current: ProjectLifecycle,
  action: ProjectLifecycleAction
): ProjectLifecycle | null {
  const target = TARGET[action];
  if (current === target) return current;
  return ALLOWED_FROM[action].includes(current) ? target : null;
}

/** When a Project put in Trash at `trashedAt` is due for permanent deletion. */
export function trashDeletionDueAt(trashedAt: Date) {
  return new Date(trashedAt.getTime() + TRASH_RECOVERY_DAYS * 24 * 60 * 60 * 1000);
}
