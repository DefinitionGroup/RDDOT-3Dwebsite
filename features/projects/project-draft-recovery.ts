export type ProjectDraftRecovery = {
  schemaVersion: 1;
  projectId: string;
  configurationCode: string;
  baseVersion: number;
  updatedAt: string;
};

type RecoveryStorage = Pick<Storage, "getItem" | "removeItem" | "setItem">;

const RECOVERY_KEY_PREFIX = "signature-project-draft:";

function recoveryKey(projectId: string) {
  return `${RECOVERY_KEY_PREFIX}${projectId}`;
}

export function writeProjectDraftRecovery(
  storage: RecoveryStorage,
  recovery: ProjectDraftRecovery
) {
  try {
    storage.setItem(recoveryKey(recovery.projectId), JSON.stringify(recovery));
    return true;
  } catch {
    return false;
  }
}

export function readProjectDraftRecovery(
  storage: RecoveryStorage,
  projectId: string
): ProjectDraftRecovery | null {
  try {
    const value = storage.getItem(recoveryKey(projectId));
    if (!value) return null;
    const parsed = JSON.parse(value) as Partial<ProjectDraftRecovery>;
    if (
      parsed.schemaVersion !== 1 ||
      parsed.projectId !== projectId ||
      typeof parsed.configurationCode !== "string" ||
      parsed.configurationCode.length < 1 ||
      parsed.configurationCode.length > 4_000 ||
      typeof parsed.baseVersion !== "number" ||
      !Number.isInteger(parsed.baseVersion) ||
      parsed.baseVersion < 1 ||
      typeof parsed.updatedAt !== "string" ||
      Number.isNaN(Date.parse(parsed.updatedAt))
    ) {
      return null;
    }
    return parsed as ProjectDraftRecovery;
  } catch {
    return null;
  }
}

export function clearProjectDraftRecovery(
  storage: RecoveryStorage,
  projectId: string
) {
  try {
    storage.removeItem(recoveryKey(projectId));
  } catch {
    // A blocked storage API must not prevent the server-backed editor from working.
  }
}

export function isProjectDraftCurrent(
  recovery: ProjectDraftRecovery,
  projectVersion: number
) {
  return recovery.baseVersion === projectVersion;
}

export function shouldClearProjectDraftAfterSave(
  savedConfigurationCode: string,
  latestConfigurationCode: string
) {
  return savedConfigurationCode === latestConfigurationCode;
}
