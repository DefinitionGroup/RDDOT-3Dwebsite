import "server-only";

import { randomUUID } from "node:crypto";
import type { Kysely } from "kysely";
import { z } from "zod";
import type { CustomerAvatarModule } from "@/features/customer-accounts/customer-avatar";
import type { ObjectStorageModule } from "@/features/object-storage/object-storage-module";
import { processAvatar } from "@/lib/server/customer-accounts/avatar-image";
import type { Database } from "@/lib/server/db/database-types";

const uuidSchema = z.uuid();
const READ_URL_SECONDS = 120;

/**
 * One photo per Customer Account. The bytes go to private storage before the
 * row is written; replacing deletes the old row in the same transaction, and
 * its deletion trigger queues the old file for the storage sweep.
 */
export function createPostgresCustomerAvatarModule(
  database: Kysely<Database>,
  storage: ObjectStorageModule
): CustomerAvatarModule {
  function rowOf(ownerId: string) {
    return database
      .withSchema("app")
      .selectFrom("customerAvatar")
      .select(["id", "storageKey", "createdAt"])
      .where("customerAccountId", "=", ownerId)
      .executeTakeFirst();
  }

  return {
    async getAvatar(input) {
      const row = await rowOf(uuidSchema.parse(input.ownerId));
      return row ? { id: row.id, createdAt: new Date(row.createdAt) } : null;
    },

    async saveAvatar(input) {
      const ownerId = uuidSchema.parse(input.ownerId);
      const processed = await processAvatar(input.bytes);
      if (processed.kind !== "ok") return processed;

      const id = randomUUID();
      const storageKey = `avatars/${ownerId}/${id}.webp`;
      const upload = await storage.presignUpload({
        key: storageKey,
        contentType: "image/webp",
        byteSize: processed.bytes.byteLength
      });
      const put = await fetch(upload.url, { method: "PUT", headers: upload.requiredHeaders, body: processed.bytes });
      if (!put.ok) return { kind: "storage-failed" };

      const createdAt = new Date();
      try {
        await database.transaction().execute(async (transaction) => {
          const app = transaction.withSchema("app");
          await app.deleteFrom("customerAvatar").where("customerAccountId", "=", ownerId).execute();
          await app
            .insertInto("customerAvatar")
            .values({
              id,
              customerAccountId: ownerId,
              storageKey,
              byteSize: processed.bytes.byteLength,
              edgePx: processed.edge,
              createdAt
            })
            .execute();
        });
      } catch (error) {
        // Nothing owns the new file yet; remove it rather than leave it behind.
        await storage.deleteObject(storageKey).catch(() => undefined);
        throw error;
      }
      return { kind: "saved", avatar: { id, createdAt } };
    },

    async removeAvatar(input) {
      const ownerId = uuidSchema.parse(input.ownerId);
      const removed = await database
        .withSchema("app")
        .deleteFrom("customerAvatar")
        .where("customerAccountId", "=", ownerId)
        .executeTakeFirst();
      return { kind: Number(removed.numDeletedRows) > 0 ? "removed" : "none" };
    },

    async readUrl(input) {
      const row = await rowOf(uuidSchema.parse(input.ownerId));
      if (!row) return null;
      const download = await storage.presignDownload({ key: row.storageKey, expiresInSeconds: READ_URL_SECONDS });
      return download.url;
    },

    async readBytes(input) {
      const row = await rowOf(uuidSchema.parse(input.ownerId));
      if (!row) return null;
      const download = await storage.presignDownload({ key: row.storageKey, expiresInSeconds: READ_URL_SECONDS });
      const response = await fetch(download.url);
      return response.ok ? new Uint8Array(await response.arrayBuffer()) : null;
    }
  };
}
