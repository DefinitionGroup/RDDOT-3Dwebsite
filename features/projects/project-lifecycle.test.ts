import { describe, expect, it } from "vitest";
import { nextProjectLifecycle, trashDeletionDueAt } from "./project-lifecycle";

describe("project lifecycle", () => {
  it("archives only active Projects", () => {
    expect(nextProjectLifecycle("active", "archive")).toBe("archived");
    expect(nextProjectLifecycle("trashed", "archive")).toBeNull();
  });

  it("puts active and archived Projects in Trash", () => {
    expect(nextProjectLifecycle("active", "trash")).toBe("trashed");
    expect(nextProjectLifecycle("archived", "trash")).toBe("trashed");
  });

  it("restores from the archive and from Trash", () => {
    expect(nextProjectLifecycle("archived", "restore")).toBe("active");
    expect(nextProjectLifecycle("trashed", "restore")).toBe("active");
  });

  it("treats a repeated request as already done", () => {
    expect(nextProjectLifecycle("archived", "archive")).toBe("archived");
    expect(nextProjectLifecycle("trashed", "trash")).toBe("trashed");
    expect(nextProjectLifecycle("active", "restore")).toBe("active");
  });

  it("keeps a trashed Project restorable for 30 days", () => {
    expect(trashDeletionDueAt(new Date("2026-10-23T10:00:00Z")).toISOString()).toBe("2026-11-22T10:00:00.000Z");
  });
});
