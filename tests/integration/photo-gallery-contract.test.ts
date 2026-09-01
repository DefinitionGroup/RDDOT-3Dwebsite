import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { ObjectStorageModule } from "@/features/object-storage/object-storage-module";
import { createPostgresPhotoGalleryModule } from "@/lib/server/db/photo-gallery-postgres";
import { STORAGE_DELETION_TOPIC } from "@/lib/server/object-storage/storage-deletion-worker";
import {
  startPostgresTestContext,
  type PostgresTestContext
} from "@/tests/integration/postgres-test-context";

function presigningStorage(): ObjectStorageModule {
  return {
    async presignUpload() {
      throw new Error("not used");
    },
    async presignDownload({ key, expiresInSeconds, downloadFilename }) {
      const url = new URL(`https://storage.invalid/${key}`);
      url.searchParams.set("X-Amz-Signature", "fake");
      if (downloadFilename) url.searchParams.set("filename", downloadFilename);
      return {
        key,
        url: url.toString(),
        expiresAt: new Date(Date.now() + (expiresInSeconds ?? 300) * 1000)
      };
    },
    async statObject() {
      return null;
    },
    async deleteObject() {}
  };
}

describe("photo gallery contract", () => {
  let context: PostgresTestContext;

  beforeAll(async () => {
    context = await startPostgresTestContext();
  }, 120_000);

  afterAll(async () => {
    await context?.stop();
  });

  async function seedAccount(projectNames: string[]) {
    const accountId = crypto.randomUUID();
    const db = context.database.withSchema("app");
    await db.insertInto("customerAccount").values({ id: accountId, status: "active" }).execute();

    const projects = [];
    for (const name of projectNames) {
      const projectId = crypto.randomUUID();
      const revisionId = crypto.randomUUID();
      const jobId = crypto.randomUUID();
      const captureId = crypto.randomUUID();
      const photoId = crypto.randomUUID();
      const storageKey = `photos/${photoId}.webp`;

      await db
        .insertInto("project")
        .values({
          id: projectId,
          ownerId: accountId,
          creationIdempotencyKey: `key-${projectId}`,
          name,
          privateNotes: "",
          lifecycle: "active"
        })
        .execute();
      await db
        .insertInto("configurationRevision")
        .values({
          id: revisionId,
          projectId,
          normalizedConfiguration: {},
          configurationHash: "a".repeat(64),
          schemaVersion: 2,
          productDefinitionVersion: "rdtdot-signature-kitchen-v1@2",
          displaySnapshot: {},
          trigger: "photo",
          label: `${name} Stand`
        })
        .execute();
      await db
        .insertInto("sourceCapture")
        .values({
          id: captureId,
          projectId,
          configurationRevisionId: revisionId,
          storageKey: `captures/${captureId}.jpg`,
          contentType: "image/jpeg",
          maxByteSize: 400_000,
          byteSize: 123_456,
          width: 1280,
          height: 720,
          status: "stored",
          rejectionReason: null,
          storedAt: new Date()
        })
        .execute();
      await db
        .insertInto("photoJob")
        .values({
          id: jobId,
          projectId,
          configurationRevisionId: revisionId,
          sourceCaptureId: captureId,
          scenePresetKey: "studio",
          state: "succeeded",
          creationIdempotencyKey: `job-${jobId}`,
          requestHash: "b".repeat(64),
          providerReference: null,
          failureReason: null,
          terminalAt: new Date()
        })
        .execute();
      await db
        .insertInto("generatedPhoto")
        .values({
          id: photoId,
          photoJobId: jobId,
          projectId,
          configurationRevisionId: revisionId,
          storageKey,
          contentType: "image/webp",
          byteSize: 234_567,
          width: 1920,
          height: 1080
        })
        .execute();

      projects.push({ projectId, revisionId, photoId, storageKey, name });
    }

    return { accountId, projects };
  }

  const gallery = () =>
    createPostgresPhotoGalleryModule(context.database, presigningStorage());

  it("lists a Project's photos with a presigned display URL", async () => {
    const { accountId, projects } = await seedAccount(["Küche Nord"]);

    const page = await gallery().listForProject({
      ownerId: accountId,
      projectId: projects[0].projectId
    });

    expect(page.totalCount).toBe(1);
    expect(page.items[0].id).toBe(projects[0].photoId);
    expect(page.items[0].displayUrl).toContain("X-Amz-Signature");
    expect(page.items[0].displayUrlExpiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(page.items[0].width).toBe(1920);
  });

  it("spans Projects in the profile gallery and names each one", async () => {
    const { accountId } = await seedAccount(["Küche Nord", "Küche Süd"]);

    const page = await gallery().listForAccount({ ownerId: accountId });

    expect(page.totalCount).toBe(2);
    expect(page.items.map((photo) => photo.projectName).sort()).toEqual([
      "Küche Nord",
      "Küche Süd"
    ]);
    expect(page.items.every((photo) => photo.revisionLabel !== null)).toBe(true);
  });

  it("shows another customer nothing, in either gallery", async () => {
    const owner = await seedAccount(["Küche Nord"]);
    const stranger = await seedAccount(["Fremde Küche"]);

    const projectPage = await gallery().listForProject({
      ownerId: stranger.accountId,
      projectId: owner.projects[0].projectId
    });
    const accountPage = await gallery().listForAccount({
      ownerId: stranger.accountId
    });

    expect(projectPage.totalCount).toBe(0);
    expect(accountPage.items.map((photo) => photo.id)).not.toContain(
      owner.projects[0].photoId
    );
  });

  it("excludes photos of a trashed Project", async () => {
    const { accountId, projects } = await seedAccount(["Küche Nord"]);
    await context.database
      .withSchema("app")
      .updateTable("project")
      .set({
        lifecycle: "trashed",
        trashedAt: new Date(),
        deletionDueAt: new Date(Date.now() + 30 * 24 * 3600 * 1000)
      })
      .where("id", "=", projects[0].projectId)
      .execute();

    const page = await gallery().listForAccount({ ownerId: accountId });
    expect(page.items.map((photo) => photo.id)).not.toContain(projects[0].photoId);
  });

  it("grants a download with an attachment filename to the owner only", async () => {
    const owner = await seedAccount(["Küche Nord"]);
    const stranger = await seedAccount(["Fremde Küche"]);

    const granted = await gallery().getDownload({
      ownerId: owner.accountId,
      photoId: owner.projects[0].photoId
    });
    const refused = await gallery().getDownload({
      ownerId: stranger.accountId,
      photoId: owner.projects[0].photoId
    });

    expect(granted?.filename).toContain("Küche Nord");
    expect(granted?.url).toContain("X-Amz-Signature");
    expect(refused).toBeNull();
  });

  it("deletes the owner's photo and records the object deletion intent", async () => {
    const { accountId, projects } = await seedAccount(["Küche Nord"]);

    const result = await gallery().deletePhoto({
      ownerId: accountId,
      photoId: projects[0].photoId
    });
    expect(result.kind).toBe("deleted");

    const intents = await context.database
      .withSchema("app")
      .selectFrom("outboxMessage")
      .select("idempotencyKey")
      .where("topic", "=", STORAGE_DELETION_TOPIC)
      .where("idempotencyKey", "=", projects[0].storageKey)
      .execute();
    expect(intents).toHaveLength(1);
  });

  it("refuses deletion by another customer and leaves the photo intact", async () => {
    const owner = await seedAccount(["Küche Nord"]);
    const stranger = await seedAccount(["Fremde Küche"]);

    const result = await gallery().deletePhoto({
      ownerId: stranger.accountId,
      photoId: owner.projects[0].photoId
    });
    expect(result.kind).toBe("unavailable");

    const stillThere = await gallery().listForProject({
      ownerId: owner.accountId,
      projectId: owner.projects[0].projectId
    });
    expect(stillThere.totalCount).toBe(1);
  });

  it("paginates newest first without repeating or dropping a photo", async () => {
    const { accountId } = await seedAccount(["A", "B", "C", "D", "E"]);

    const first = await gallery().listForAccount({ ownerId: accountId, limit: 2 });
    expect(first.items).toHaveLength(2);
    expect(first.nextCursor).not.toBeNull();

    const second = await gallery().listForAccount({
      ownerId: accountId,
      limit: 2,
      cursor: first.nextCursor
    });
    const third = await gallery().listForAccount({
      ownerId: accountId,
      limit: 2,
      cursor: second.nextCursor
    });

    const seen = [...first.items, ...second.items, ...third.items].map((p) => p.id);
    expect(new Set(seen).size).toBe(5);
    expect(first.totalCount).toBe(5);
  });
});
