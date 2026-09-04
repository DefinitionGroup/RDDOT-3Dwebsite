import "server-only";

import { randomUUID } from "node:crypto";
import type { Kysely } from "kysely";
import {
  CAPTURE_LIFETIME_MS,
  type DevelopmentEmailCaptureStore,
  MAXIMUM_CAPTURES_PER_RECIPIENT,
  normalizeCaptureRecipient
} from "@/features/transactional-email/adapters/development-capture";
import type { TransactionalEmailMessage } from "@/features/transactional-email/transactional-email";
import type { Database } from "@/lib/server/db/database-types";

/**
 * Durable capture store for the development email adapter. A serverless
 * deployment stores the mail in one function instance and reads it back from
 * another, so process memory is not enough there. Every write prunes expired
 * rows and caps the rows kept per recipient.
 */
export function createPostgresDevelopmentEmailCaptureStore(
  database: Kysely<Database>,
  clock: () => Date = () => new Date()
): DevelopmentEmailCaptureStore {
  function expiryCutoff() {
    return new Date(clock().getTime() - CAPTURE_LIFETIME_MS);
  }

  return {
    async save(capture) {
      const recipient = normalizeCaptureRecipient(capture.message.recipient);

      await database.transaction().execute(async (transaction) => {
        await transaction
          .withSchema("app")
          .deleteFrom("developmentEmailCapture")
          .where("capturedAt", "<=", expiryCutoff())
          .execute();

        await transaction
          .withSchema("app")
          .insertInto("developmentEmailCapture")
          .values({
            id: randomUUID(),
            recipient,
            message: capture.message,
            capturedAt: capture.capturedAt
          })
          .execute();

        const surplus = await transaction
          .withSchema("app")
          .selectFrom("developmentEmailCapture")
          .select("id")
          .where("recipient", "=", recipient)
          .orderBy("capturedAt", "desc")
          .offset(MAXIMUM_CAPTURES_PER_RECIPIENT)
          .execute();

        if (surplus.length > 0) {
          await transaction
            .withSchema("app")
            .deleteFrom("developmentEmailCapture")
            .where(
              "id",
              "in",
              surplus.map((row) => row.id)
            )
            .execute();
        }
      });
    },

    async findLatest(recipient) {
      const row = await database
        .withSchema("app")
        .selectFrom("developmentEmailCapture")
        .select(["message", "capturedAt"])
        .where("recipient", "=", normalizeCaptureRecipient(recipient))
        .where("capturedAt", ">", expiryCutoff())
        .orderBy("capturedAt", "desc")
        .limit(1)
        .executeTakeFirst();

      if (!row) return null;

      return {
        message: row.message as TransactionalEmailMessage,
        capturedAt: row.capturedAt
      };
    },

    async clear() {
      await database
        .withSchema("app")
        .deleteFrom("developmentEmailCapture")
        .execute();
    }
  };
}
