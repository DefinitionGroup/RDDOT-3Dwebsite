import "server-only";

import { randomUUID } from "node:crypto";
import type { Kysely } from "kysely";
import { z } from "zod";
import type {
  DealerUserResolution,
  IdentityAdapter
} from "@/features/customer-accounts/identity-adapter";
import type { Database } from "@/lib/server/db/database-types";
import { isPostgresErrorWithCode } from "@/lib/server/db/postgres-errors";

const providerSubjectSchema = z.string().trim().min(1).max(255);
const emailSchema = z.string().trim().toLowerCase().min(3).max(254);

function dealerUsers(database: Kysely<Database>) {
  return database
    .withSchema("app")
    .selectFrom("dealerUser")
    .innerJoin("dealer", "dealer.id", "dealerUser.dealerId")
    .select([
      "dealerUser.id as dealerUserId",
      "dealerUser.dealerId",
      "dealer.name as dealerName",
      "dealerUser.name",
      "dealerUser.email",
      "dealerUser.phone",
      "dealerUser.status as userStatus",
      "dealer.status as dealerStatus"
    ]);
}

function toResolution(row: {
  dealerUserId: string;
  dealerId: string;
  dealerName: string;
  name: string;
  email: string;
  phone: string;
  userStatus: "active" | "disabled";
  dealerStatus: "active" | "inactive";
}): DealerUserResolution {
  if (row.userStatus !== "active" || row.dealerStatus !== "active") {
    return { kind: "blocked" };
  }
  return {
    kind: "dealer",
    dealer: {
      dealerUserId: row.dealerUserId,
      dealerId: row.dealerId,
      dealerName: row.dealerName,
      name: row.name,
      email: row.email,
      phone: row.phone
    }
  };
}

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
    async resolveDealerUser(input) {
      const providerSubject = providerSubjectSchema.parse(input.providerSubject);
      const email = emailSchema.parse(input.email);

      const linked = await dealerUsers(database)
        .innerJoin(
          "dealerUserIdentity",
          "dealerUserIdentity.dealerUserId",
          "dealerUser.id"
        )
        .where("dealerUserIdentity.provider", "=", input.provider)
        .where("dealerUserIdentity.providerSubject", "=", providerSubject)
        .executeTakeFirst();
      if (linked) return toResolution(linked);

      // The first sign-in: the email-code sign-in verified the address that
      // rotpunkt provisioned, so the identity is linked to that Dealer User.
      const provisioned = await dealerUsers(database)
        .where("dealerUser.email", "=", email)
        .executeTakeFirst();
      if (!provisioned) return { kind: "none" };

      const resolution = toResolution(provisioned);
      if (resolution.kind === "dealer") {
        await database
          .withSchema("app")
          .insertInto("dealerUserIdentity")
          .values({
            id: randomUUID(),
            dealerUserId: provisioned.dealerUserId,
            provider: input.provider,
            providerSubject
          })
          .onConflict((conflict) =>
            conflict.columns(["provider", "providerSubject"]).doNothing()
          )
          .execute();
      }
      return resolution;
    },

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
