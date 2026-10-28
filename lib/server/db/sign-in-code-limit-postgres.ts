import "server-only";

import { createHash } from "node:crypto";
import type { Kysely } from "kysely";
import {
  normalizeSignInEmail,
  SIGN_IN_CODE_WINDOW_SECONDS,
  SIGN_IN_CODES_PER_EMAIL,
  type SignInCodeLimit
} from "@/features/customer-accounts/sign-in-code-limit";
import type { Database } from "@/lib/server/db/database-types";

/**
 * The per-address sign-in code limit, shared by every function instance. Each
 * request first drops the windows that have passed, then counts itself in one
 * upsert, so concurrent requests for one address cannot both take the last
 * code. Only a SHA-256 of the address is stored.
 */
export function createPostgresSignInCodeLimit(
  database: Kysely<Database>,
  clock: () => Date = () => new Date()
): SignInCodeLimit {
  return {
    async consume(email) {
      const now = clock();
      const windowMs = SIGN_IN_CODE_WINDOW_SECONDS * 1000;
      const emailKey = createHash("sha256").update(normalizeSignInEmail(email)).digest("hex");

      const row = await database.transaction().execute(async (transaction) => {
        await transaction
          .withSchema("app")
          .deleteFrom("signInCodeLimit")
          .where("windowStartedAt", "<=", new Date(now.getTime() - windowMs))
          .execute();

        return transaction
          .withSchema("app")
          .insertInto("signInCodeLimit")
          .values({ emailKey, windowStartedAt: now, requests: 1 })
          .onConflict((conflict) =>
            conflict
              .column("emailKey")
              .doUpdateSet((update) => ({ requests: update("signInCodeLimit.requests", "+", 1) }))
          )
          .returning(["requests", "windowStartedAt"])
          .executeTakeFirstOrThrow();
      });

      if (row.requests <= SIGN_IN_CODES_PER_EMAIL) return { allowed: true };
      const reopensAt = new Date(row.windowStartedAt).getTime() + windowMs;
      return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((reopensAt - now.getTime()) / 1000)) };
    }
  };
}
