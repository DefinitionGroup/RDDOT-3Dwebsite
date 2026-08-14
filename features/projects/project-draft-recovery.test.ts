import { describe, expect, it } from "vitest";
import {
  clearProjectDraftRecovery,
  isProjectDraftCurrent,
  readProjectDraftRecovery,
  shouldClearProjectDraftAfterSave,
  writeProjectDraftRecovery
} from "@/features/projects/project-draft-recovery";

function createMemoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    removeItem: (key: string) => values.delete(key),
    setItem: (key: string, value: string) => values.set(key, value)
  };
}

describe("Project draft recovery", () => {
  it("survives a page-instance boundary and stays scoped to its Project", () => {
    const storage = createMemoryStorage();
    const recovery = {
      schemaVersion: 1 as const,
      projectId: "project-a",
      configurationCode: "encoded-local-change",
      baseVersion: 4,
      updatedAt: "2026-08-14T08:30:00.000Z"
    };

    expect(writeProjectDraftRecovery(storage, recovery)).toBe(true);
    expect(readProjectDraftRecovery(storage, "project-a")).toEqual(recovery);
    expect(readProjectDraftRecovery(storage, "project-b")).toBeNull();
  });

  it("clears only after an explicit discard or confirmed save", () => {
    const storage = createMemoryStorage();
    writeProjectDraftRecovery(storage, {
      schemaVersion: 1,
      projectId: "project-a",
      configurationCode: "encoded-local-change",
      baseVersion: 2,
      updatedAt: "2026-08-14T08:30:00.000Z"
    });

    clearProjectDraftRecovery(storage, "project-a");
    expect(readProjectDraftRecovery(storage, "project-a")).toBeNull();
  });

  it("marks a v1 draft as stale after the server advances to v2", () => {
    expect(
      isProjectDraftCurrent(
        {
          schemaVersion: 1,
          projectId: "project-a",
          configurationCode: "encoded-v1-change",
          baseVersion: 1,
          updatedAt: "2026-08-14T08:30:00.000Z"
        },
        2
      )
    ).toBe(false);
  });

  it("keeps newer recovery C when the in-flight save of B succeeds", () => {
    expect(shouldClearProjectDraftAfterSave("configuration-b", "configuration-c")).toBe(
      false
    );
    expect(shouldClearProjectDraftAfterSave("configuration-c", "configuration-c")).toBe(
      true
    );
  });

  it("ignores malformed or unavailable storage instead of breaking the editor", () => {
    const brokenStorage = {
      getItem: () => "not-json",
      removeItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      }
    };

    expect(readProjectDraftRecovery(brokenStorage, "project-a")).toBeNull();
    expect(
      writeProjectDraftRecovery(brokenStorage, {
        schemaVersion: 1,
        projectId: "project-a",
        configurationCode: "encoded-local-change",
        baseVersion: 1,
        updatedAt: "2026-08-14T08:30:00.000Z"
      })
    ).toBe(false);
    expect(() => clearProjectDraftRecovery(brokenStorage, "project-a")).not.toThrow();
  });
});
