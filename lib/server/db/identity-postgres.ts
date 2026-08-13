import "server-only";

import { randomUUID } from "node:crypto";
import type { Kysely } from "kysely";
import { z } from "zod";
import type { IdentityAdapter } from "@/features/customer-accounts/identity-adapter";
import type { Database } from "@/lib/server/db/database-types";
import { isPostgresErrorWithCode } from "@/lib/server/db/postgres-errors";

const providerSubjectSchema = z.string().trim().min(1).max(255);

async function findCustomerAccount(
  database: Kysely<Database>,
  provider: string,
  providerSubject: string
) {
  return database
    .withSchema("app")
    .selectFrom("authIdentity")
    .innerJoin(
      "customerAccount",
      "customerAccount.id",
      "authIdentity.customerAccountId"
    )
    .select("customerAccount.id")
    .where("authIdentity.provider", "=", provider)
    .where("authIdentity.providerSubject", "=", providerSubject)
    .where("customerAccount.status", "=", "active")
    .executeTakeFirst();
}

export function createPostgresIdentityAdapter(
  database: Kysely<Database>
): IdentityAdapter {
  return {
    async resolveCustomerAccount(input) {
      const providerSubject = providerSubjectSchema.parse(input.providerSubject);
      const existing = await findCustomerAccount(
        database,
        input.provider,
        providerSubject
      );
      if (existing) return existing.id;

      try {
        return await database.transaction().execute(async (transaction) => {
          const customerAccountId = randomUUID();

          await transaction
            .withSchema("app")
            .insertInto("customerAccount")
            .values({
              id: customerAccountId,
              status: "active"
            })
            .executeTakeFirstOrThrow();

          await transaction
            .withSchema("app")
            .insertInto("authIdentity")
            .values({
              id: randomUUID(),
              customerAccountId,
              provider: input.provider,
              providerSubject
            })
            .executeTakeFirstOrThrow();

          return customerAccountId;
        });
      } catch (error) {
        if (!isPostgresErrorWithCode(error, "23505")) throw error;

        const concurrentWinner = await findCustomerAccount(
          database,
          input.provider,
          providerSubject
        );
        if (!concurrentWinner) throw error;
        return concurrentWinner.id;
      }
    }
  };
}
