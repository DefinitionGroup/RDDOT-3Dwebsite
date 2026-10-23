import "server-only";

import type { Kysely } from "kysely";
import { z } from "zod";
import type { AccountDeletion } from "@/features/customer-accounts/account-deletion";
import type { Database } from "@/lib/server/db/database-types";

const providerSubjectSchema = z.string().trim().min(1).max(255);

/** One transaction: find the account, refuse when it has Quote Requests, else delete it. */
export function createPostgresAccountDeletion(database: Kysely<Database>): AccountDeletion {
  return {
    async deleteAccount(input) {
      const providerSubject = providerSubjectSchema.parse(input.providerSubject);

      return database.transaction().execute(async (transaction) => {
        const account = await transaction
          .withSchema("app")
          .selectFrom("authIdentity")
          .innerJoin("customerAccount", "customerAccount.id", "authIdentity.customerAccountId")
          .select("customerAccount.id")
          .where("authIdentity.provider", "=", input.provider)
          .where("authIdentity.providerSubject", "=", providerSubject)
          .forUpdate()
          .executeTakeFirst();
        if (!account) return { kind: "not-found" };

        const request = await transaction
          .withSchema("app")
          .selectFrom("quoteRequest")
          .innerJoin("project", "project.id", "quoteRequest.projectId")
          .select("quoteRequest.id")
          .where("project.ownerId", "=", account.id)
          .limit(1)
          .executeTakeFirst();
        if (request) return { kind: "has-requests" };

        await transaction
          .withSchema("app")
          .deleteFrom("customerAccount")
          .where("id", "=", account.id)
          .execute();
        return { kind: "deleted" };
      });
    }
  };
}
