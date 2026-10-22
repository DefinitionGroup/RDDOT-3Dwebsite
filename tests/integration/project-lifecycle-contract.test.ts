import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createPostgresIdentityAdapter } from "@/lib/server/db/identity-postgres";
import { createPostgresProjectModule } from "@/lib/server/db/project-postgres";
import { createPostgresSharingModule } from "@/lib/server/db/sharing-postgres";
import {
  startPostgresTestContext,
  type PostgresTestContext
} from "@/tests/integration/postgres-test-context";

const configuration = {
  schemaVersion: 1,
  productKey: "signature-line",
  layout: "straight-line",
  cabinetColorKey: "carbon",
  frontColorKey: "clay"
} as const;

function randomShareToken() {
  return `${crypto.randomUUID().replaceAll("-", "")}${crypto.randomUUID().replaceAll("-", "")}`.slice(0, 43);
}

describe("Project lifecycle: archive, trash, restore", () => {
  let context: PostgresTestContext;

  beforeAll(async () => {
    context = await startPostgresTestContext();
  }, 120_000);

  afterAll(async () => {
    await context?.stop();
  });

  async function newProject(name = "Lebenszyklus") {
    const ownerId = await createPostgresIdentityAdapter(context.database).resolveCustomerAccount({
      provider: "better-auth",
      providerSubject: `lifecycle-${crypto.randomUUID()}`
    });
    const workspace = await createPostgresProjectModule(context.database).createProject({
      ownerId,
      idempotencyKey: `create-${crypto.randomUUID()}`,
      name,
      configuration,
      productDefinitionVersion: "signature-line@1"
    });
    return { ownerId, projectId: workspace.id };
  }

  it("archives out of the active list and restores into it", async () => {
    const projects = createPostgresProjectModule(context.database);
    const { ownerId, projectId } = await newProject();

    await expect(projects.changeProjectLifecycle({ ownerId, projectId, action: "archive" })).resolves.toEqual({
      kind: "changed",
      lifecycle: "archived",
      deletionDueAt: null
    });
    expect((await projects.listProjects({ ownerId })).map((p) => p.id)).toEqual([]);
    expect((await projects.listProjects({ ownerId, includeArchived: true })).map((p) => p.lifecycle)).toEqual([
      "archived"
    ]);
    await expect(projects.changeProjectLifecycle({ ownerId, projectId, action: "archive" })).resolves.toMatchObject({
      kind: "changed",
      lifecycle: "archived"
    });

    await projects.changeProjectLifecycle({ ownerId, projectId, action: "restore" });
    expect((await projects.listProjects({ ownerId })).map((p) => p.id)).toEqual([projectId]);
  });

  it("trashes for 30 days, revokes share links for good, and restores without them", async () => {
    const projects = createPostgresProjectModule(context.database);
    const sharing = createPostgresSharingModule(context.database);
    const { ownerId, projectId } = await newProject("Mit Link");
    const token = randomShareToken();
    const created = await sharing.createLink({
      ownerId,
      projectId,
      expectedVersion: 1,
      idempotencyKey: `share-${crypto.randomUUID()}`,
      token,
      displaySnapshot: { cabinetFinish: "Carbon", frontFinish: "Clay" }
    });
    if (created.kind !== "created") throw new Error("link not created");

    const before = Date.now();
    const trashed = await projects.changeProjectLifecycle({ ownerId, projectId, action: "trash" });
    expect(trashed).toMatchObject({ kind: "changed", lifecycle: "trashed" });
    const due = trashed.kind === "changed" ? trashed.deletionDueAt?.getTime() ?? 0 : 0;
    expect(due - before).toBeGreaterThan(29.9 * 24 * 3600 * 1000);
    expect(due - before).toBeLessThan(30.1 * 24 * 3600 * 1000);

    expect((await projects.listProjects({ ownerId, includeArchived: true })).length).toBe(0);
    const inTrash = await projects.listProjects({ ownerId, includeTrashed: true });
    expect(inTrash.map((p) => [p.lifecycle, p.deletionDueAt?.getTime()])).toEqual([["trashed", due]]);
    await expect(sharing.resolveLink({ linkId: created.link.id, token })).resolves.toBeNull();

    await expect(projects.changeProjectLifecycle({ ownerId, projectId, action: "restore" })).resolves.toEqual({
      kind: "changed",
      lifecycle: "active",
      deletionDueAt: null
    });
    await expect(sharing.resolveLink({ linkId: created.link.id, token })).resolves.toBeNull();
    const [link] = await sharing.listLinks({ ownerId, projectId });
    expect(link.revokedAt).not.toBeNull();
  });

  it("refuses to archive from Trash, and keeps other people out", async () => {
    const projects = createPostgresProjectModule(context.database);
    const { ownerId, projectId } = await newProject();
    const stranger = await newProject();

    await projects.changeProjectLifecycle({ ownerId, projectId, action: "trash" });
    await expect(projects.changeProjectLifecycle({ ownerId, projectId, action: "archive" })).resolves.toEqual({
      kind: "not-allowed",
      lifecycle: "trashed"
    });
    await expect(
      projects.changeProjectLifecycle({ ownerId: stranger.ownerId, projectId, action: "restore" })
    ).resolves.toEqual({ kind: "unavailable" });
  });
});
