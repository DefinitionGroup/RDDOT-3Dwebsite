import "server-only";

import type { Kysely } from "kysely";
import type { Database } from "@/lib/server/db/database-types";

/** How long a Source Capture outlives its finished Photo Job (ADR 0011's grace window). */
export const SOURCE_CAPTURE_GRACE_MS = 24 * 60 * 60 * 1000;
/** A job neither uploaded nor submitted within a day never will be. */
export const ABANDONED_PHOTO_JOB_MS = 24 * 60 * 60 * 1000;

export type SourceCaptureRetentionResult = {
  abandonedJobs: number;
  retiredCaptures: number;
};

/**
 * Retires Source Captures, which are inputs rather than customer artifacts
 * (ADR 0011). A job still waiting for its upload or its submission after a day
 * is failed as abandoned; a capture whose jobs have all finished, the last of
 * them longer ago than the grace window, loses its row. The row's deletion
 * trigger records the object's deletion intent, and the storage sweep deletes
 * the object once its hold has passed.
 *
 * Safe to run concurrently — captures are claimed with SKIP LOCKED.
 */
export async function retireSourceCaptures(
  database: Kysely<Database>,
  options: { batchSize?: number; clock?: () => Date } = {}
): Promise<SourceCaptureRetentionResult> {
  const batchSize = options.batchSize ?? 200;
  const now = (options.clock ?? (() => new Date()))();
  const abandonedBefore = new Date(now.getTime() - ABANDONED_PHOTO_JOB_MS);
  const finishedBefore = new Date(now.getTime() - SOURCE_CAPTURE_GRACE_MS);

  const abandoned = await database
    .withSchema("app")
    .updateTable("photoJob")
    .set({ state: "failed", failureReason: "abandoned", terminalAt: now, updatedAt: now })
    .where("state", "in", ["requested", "capture-ready"])
    .where("createdAt", "<", abandonedBefore)
    .executeTakeFirst();

  const retired = await database.transaction().execute(async (transaction) => {
    const due = await transaction
      .withSchema("app")
      .selectFrom("sourceCapture")
      .select("sourceCapture.id")
      .where("sourceCapture.createdAt", "<", finishedBefore)
      .where((expression) =>
        expression.not(
          expression.exists(
            expression
              .selectFrom("photoJob")
              .select("photoJob.id")
              .whereRef("photoJob.sourceCaptureId", "=", "sourceCapture.id")
              .where((job) =>
                job.or([
                  job("photoJob.terminalAt", "is", null),
                  job("photoJob.terminalAt", ">=", finishedBefore)
                ])
              )
          )
        )
      )
      .orderBy("sourceCapture.createdAt")
      .limit(batchSize)
      .forUpdate()
      .skipLocked()
      .execute();
    if (due.length === 0) return 0;

    const ids = due.map((capture) => capture.id);
    // A finished job keeps its record without its input. A job still at work
    // is never released here, so the foreign key refuses the delete instead.
    await transaction
      .withSchema("app")
      .updateTable("photoJob")
      .set({ sourceCaptureId: null })
      .where("sourceCaptureId", "in", ids)
      .where("terminalAt", "is not", null)
      .execute();
    const deleted = await transaction
      .withSchema("app")
      .deleteFrom("sourceCapture")
      .where("id", "in", ids)
      .executeTakeFirst();
    return Number(deleted.numDeletedRows);
  });

  return { abandonedJobs: Number(abandoned.numUpdatedRows), retiredCaptures: retired };
}
