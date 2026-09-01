import "server-only";

import type { Kysely } from "kysely";
import { z } from "zod";
import type { ObjectStorageModule } from "@/features/object-storage/object-storage-module";
import type { Database } from "@/lib/server/db/database-types";

export const STORAGE_DELETION_TOPIC = "storage.object.delete";

const MAX_ATTEMPTS = 8;
const BASE_BACKOFF_SECONDS = 30;

const payloadSchema = z.object({ storageKey: z.string().min(1) });

export type StorageDeletionSweepResult = {
  claimed: number;
  deleted: number;
  failed: number;
  abandoned: number;
};

/**
 * Drains the deletion intents recorded by the `enqueue_storage_object_deletion`
 * trigger (ADR 0011). Object deletion cannot join the database transaction that
 * removed the owning row, so the row's disappearance and the object's deletion
 * are bridged by the outbox: the intent is durable the moment the row is gone,
 * and this sweep makes it true in storage.
 *
 * Safe to run concurrently — messages are claimed with SKIP LOCKED.
 */
export async function sweepStorageDeletions(
  database: Kysely<Database>,
  storage: ObjectStorageModule,
  options: { batchSize?: number; clock?: () => Date } = {}
): Promise<StorageDeletionSweepResult> {
  const batchSize = options.batchSize ?? 50;
  const clock = options.clock ?? (() => new Date());
  const result: StorageDeletionSweepResult = {
    claimed: 0,
    deleted: 0,
    failed: 0,
    abandoned: 0
  };

  const claimed = await database.transaction().execute(async (transaction) => {
    const due = await transaction
      .withSchema("app")
      .selectFrom("outboxMessage")
      .select(["id", "payload", "attempts"])
      .where("topic", "=", STORAGE_DELETION_TOPIC)
      .where("processedAt", "is", null)
      .where("availableAt", "<=", clock())
      .orderBy("availableAt")
      .limit(batchSize)
      .forUpdate()
      .skipLocked()
      .execute();

    if (due.length > 0) {
      // Hold the claim so a second sweep does not pick the same messages up
      // while this one is still calling storage.
      await transaction
        .withSchema("app")
        .updateTable("outboxMessage")
        .set({
          attempts: (eb) => eb("attempts", "+", 1),
          availableAt: new Date(clock().getTime() + 5 * 60 * 1000)
        })
        .where(
          "id",
          "in",
          due.map((message) => message.id)
        )
        .execute();
    }

    return due;
  });

  result.claimed = claimed.length;

  for (const message of claimed) {
    const payload = payloadSchema.safeParse(message.payload);

    if (!payload.success) {
      // Unparseable intent will never succeed; stop retrying it forever.
      await markProcessed(database, message.id, clock());
      result.abandoned += 1;
      continue;
    }

    try {
      await storage.deleteObject(payload.data.storageKey);
      await markProcessed(database, message.id, clock());
      result.deleted += 1;
    } catch {
      const attempts = message.attempts + 1;

      if (attempts >= MAX_ATTEMPTS) {
        // Leave the message unprocessed and permanently due so it stays visible
        // as an unreconciled object rather than disappearing quietly.
        result.abandoned += 1;
        continue;
      }

      const backoffSeconds = BASE_BACKOFF_SECONDS * 2 ** (attempts - 1);
      await database
        .withSchema("app")
        .updateTable("outboxMessage")
        .set({ availableAt: new Date(clock().getTime() + backoffSeconds * 1000) })
        .where("id", "=", message.id)
        .execute();
      result.failed += 1;
    }
  }

  return result;
}

async function markProcessed(
  database: Kysely<Database>,
  id: string,
  now: Date
) {
  await database
    .withSchema("app")
    .updateTable("outboxMessage")
    .set({ processedAt: now })
    .where("id", "=", id)
    .execute();
}

/**
 * Objects whose deletion was recorded but never confirmed. Non-empty output is
 * an operational signal, not a normal state — the Production Release Gate for
 * ADR 0011 expects this to be empty.
 */
export async function findUnreconciledDeletions(
  database: Kysely<Database>,
  limit = 100
) {
  return database
    .withSchema("app")
    .selectFrom("outboxMessage")
    .select(["id", "payload", "attempts", "occurredAt"])
    .where("topic", "=", STORAGE_DELETION_TOPIC)
    .where("processedAt", "is", null)
    .where("attempts", ">=", MAX_ATTEMPTS)
    .orderBy("occurredAt")
    .limit(limit)
    .execute();
}
