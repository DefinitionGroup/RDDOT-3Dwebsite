import "server-only";

import type { Kysely } from "kysely";
import { z } from "zod";
import {
  customerProfileSchema,
  EMPTY_CUSTOMER_PROFILE,
  type CustomerProfileModule
} from "@/features/customer-accounts/customer-profile";
import type { Database } from "@/lib/server/db/database-types";

const uuidSchema = z.uuid();

/** One row per Customer Account, written on the first save. */
export function createPostgresCustomerProfileModule(database: Kysely<Database>): CustomerProfileModule {
  return {
    async getProfile(input) {
      const ownerId = uuidSchema.parse(input.ownerId);
      const row = await database
        .withSchema("app")
        .selectFrom("customerProfile")
        .select(["name", "phone", "postalCode"])
        .where("customerAccountId", "=", ownerId)
        .executeTakeFirst();
      return row ?? { ...EMPTY_CUSTOMER_PROFILE };
    },

    async saveProfile(input) {
      const ownerId = uuidSchema.parse(input.ownerId);
      const profile = customerProfileSchema.parse(input.profile);
      return database
        .withSchema("app")
        .insertInto("customerProfile")
        .values({ customerAccountId: ownerId, ...profile })
        .onConflict((conflict) =>
          conflict.column("customerAccountId").doUpdateSet({ ...profile, updatedAt: new Date() })
        )
        .returning(["name", "phone", "postalCode"])
        .executeTakeFirstOrThrow();
    }
  };
}
