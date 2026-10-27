import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { ObjectStorageModule } from "@/features/object-storage/object-storage-module";
import { createPostgresCustomerAvatarModule } from "@/lib/server/db/customer-avatar-postgres";
import { createPostgresIdentityAdapter } from "@/lib/server/db/identity-postgres";
import { STORAGE_DELETION_TOPIC } from "@/lib/server/object-storage/storage-deletion-worker";
import {
  startPostgresTestContext,
  type PostgresTestContext
} from "@/tests/integration/postgres-test-context";

/** In-memory storage behind presigned URLs, like the photo job contract's. */
function memoryStorage() {
  const objects = new Map<string, Uint8Array>();
  const storage: ObjectStorageModule = {
    async presignUpload({ key, contentType, byteSize }) {
      return {
        key,
        url: `https://storage.test/${key}`,
        method: "PUT",
        requiredHeaders: { "content-type": contentType, "content-length": String(byteSize) },
        expiresAt: new Date(Date.now() + 300_000)
      };
    },
    async presignDownload({ key }) {
      return { key, url: `https://storage.test/${key}`, expiresAt: new Date(Date.now() + 300_000) };
    },
    async statObject(key) {
      const bytes = objects.get(key);
      return bytes ? { key, byteSize: bytes.byteLength, contentType: "image/webp" } : null;
    },
    async deleteObject(key) {
      objects.delete(key);
    }
  };
  return { storage, objects };
}

async function photo(width = 900, height = 700) {
  return new Uint8Array(
    await sharp({ create: { width, height, channels: 3, background: "#6d8a7c" } })
      .jpeg()
      .withExif({ IFD3: { GPSLatitudeRef: "N", GPSLatitude: "52/1 31/1 12/1" } })
      .toBuffer()
  );
}

describe("customer avatar", { timeout: 30_000 }, () => {
  let context: PostgresTestContext;
  let objects: Map<string, Uint8Array>;
  let storage: ObjectStorageModule;

  beforeAll(async () => {
    context = await startPostgresTestContext();
  }, 120_000);

  afterAll(async () => {
    vi.unstubAllGlobals();
    await context?.stop();
  });

  beforeEach(() => {
    ({ storage, objects } = memoryStorage());
    vi.stubGlobal("fetch", async (input: string | URL | Request, init?: RequestInit) => {
      const url = new URL(typeof input === "string" ? input : input.toString());
      if (url.host !== "storage.test") throw new Error(`unexpected fetch ${url.host}`);
      const key = decodeURIComponent(url.pathname.slice(1));
      if (init?.method === "PUT") {
        objects.set(key, init.body as Uint8Array);
        return new Response(null, { status: 200 });
      }
      const bytes = objects.get(key);
      return bytes ? new Response(bytes as BodyInit, { status: 200 }) : new Response(null, { status: 404 });
    });
  });

  function newAccount() {
    return createPostgresIdentityAdapter(context.database).resolveCustomerAccount({
      provider: "better-auth",
      providerSubject: `avatar-${randomUUID()}`
    });
  }

  function queuedDeletions(keys: string[]) {
    return context.database
      .withSchema("app")
      .selectFrom("outboxMessage")
      .select("idempotencyKey")
      .where("topic", "=", STORAGE_DELETION_TOPIC)
      .where("idempotencyKey", "in", keys)
      .execute();
  }

  it("stores a square WebP without location data and reads it back for its owner only", async () => {
    const avatars = createPostgresCustomerAvatarModule(context.database, storage);
    const ownerId = await newAccount();
    const stranger = await newAccount();

    const saved = await avatars.saveAvatar({ ownerId, bytes: await photo() });
    expect(saved.kind).toBe("saved");
    expect(await avatars.getAvatar({ ownerId })).toMatchObject({ id: saved.kind === "saved" ? saved.avatar.id : "" });

    const bytes = await avatars.readBytes({ ownerId });
    const stored = await sharp(bytes!).metadata();
    expect([stored.format, stored.width, stored.height, stored.exif]).toEqual(["webp", 512, 512, undefined]);
    expect(await avatars.readUrl({ ownerId })).toMatch(/^https:\/\/storage\.test\/avatars\//);

    expect(await avatars.getAvatar({ ownerId: stranger })).toBeNull();
    expect(await avatars.readUrl({ ownerId: stranger })).toBeNull();
  });

  it("queues the old file when the photo is replaced, removed, or the account deleted", async () => {
    const avatars = createPostgresCustomerAvatarModule(context.database, storage);
    const ownerId = await newAccount();
    const app = context.database.withSchema("app");
    const keyOf = async () =>
      (await app.selectFrom("customerAvatar").select("storageKey").where("customerAccountId", "=", ownerId).executeTakeFirstOrThrow())
        .storageKey;

    await avatars.saveAvatar({ ownerId, bytes: await photo() });
    const first = await keyOf();
    await avatars.saveAvatar({ ownerId, bytes: await photo(640, 640) });
    const second = await keyOf();
    expect(second).not.toBe(first);
    expect((await queuedDeletions([first, second])).map((row) => row.idempotencyKey)).toEqual([first]);

    expect(await avatars.removeAvatar({ ownerId })).toEqual({ kind: "removed" });
    expect(await avatars.removeAvatar({ ownerId })).toEqual({ kind: "none" });
    expect((await queuedDeletions([second])).length).toBe(1);

    const other = await newAccount();
    await avatars.saveAvatar({ ownerId: other, bytes: await photo() });
    const third = (
      await app.selectFrom("customerAvatar").select("storageKey").where("customerAccountId", "=", other).executeTakeFirstOrThrow()
    ).storageKey;
    await app.deleteFrom("customerAccount").where("id", "=", other).execute();
    expect((await queuedDeletions([third])).length).toBe(1);
  });

  it("refuses what is not a usable picture and writes nothing", async () => {
    const avatars = createPostgresCustomerAvatarModule(context.database, storage);
    const ownerId = await newAccount();
    expect((await avatars.saveAvatar({ ownerId, bytes: await photo(120, 600) })).kind).toBe("too-small");
    expect((await avatars.saveAvatar({ ownerId, bytes: new Uint8Array([1, 2, 3]) })).kind).toBe("not-an-image");
    expect(await avatars.getAvatar({ ownerId })).toBeNull();
    expect(objects.size).toBe(0);
  });
});
