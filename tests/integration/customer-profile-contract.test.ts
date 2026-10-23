import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { EMPTY_CUSTOMER_PROFILE } from "@/features/customer-accounts/customer-profile";
import { createPostgresCustomerProfileModule } from "@/lib/server/db/customer-profile-postgres";
import { createPostgresIdentityAdapter } from "@/lib/server/db/identity-postgres";
import {
  startPostgresTestContext,
  type PostgresTestContext
} from "@/tests/integration/postgres-test-context";

describe("customer profile persistence", () => {
  let context: PostgresTestContext;

  beforeAll(async () => {
    context = await startPostgresTestContext();
  }, 120_000);

  afterAll(async () => {
    await context?.stop();
  });

  function newAccount() {
    return createPostgresIdentityAdapter(context.database).resolveCustomerAccount({
      provider: "better-auth",
      providerSubject: `profile-${randomUUID()}`
    });
  }

  it("starts empty, saves, and replaces on the next save", async () => {
    const profiles = createPostgresCustomerProfileModule(context.database);
    const ownerId = await newAccount();

    expect(await profiles.getProfile({ ownerId })).toEqual(EMPTY_CUSTOMER_PROFILE);

    const first = await profiles.saveProfile({
      ownerId,
      profile: { name: " Anna Weber ", phone: "030 1234567", postalCode: "10115" }
    });
    expect(first).toEqual({ ...EMPTY_CUSTOMER_PROFILE, name: "Anna Weber", phone: "030 1234567", postalCode: "10115" });

    await profiles.saveProfile({ ownerId, profile: { name: "Anna Weber", phone: "", postalCode: "sw1a 1aa" } });
    expect(await profiles.getProfile({ ownerId })).toEqual({
      ...EMPTY_CUSTOMER_PROFILE,
      name: "Anna Weber",
      postalCode: "SW1A 1AA"
    });
  });

  it("keeps each account's profile to itself", async () => {
    const profiles = createPostgresCustomerProfileModule(context.database);
    const owner = await newAccount();
    const other = await newAccount();

    await profiles.saveProfile({ ownerId: owner, profile: { name: "Owner", phone: "", postalCode: "" } });
    expect(await profiles.getProfile({ ownerId: other })).toEqual(EMPTY_CUSTOMER_PROFILE);
  });

  it("refuses what the contract refuses, at the module and in the table", async () => {
    const profiles = createPostgresCustomerProfileModule(context.database);
    const ownerId = await newAccount();

    await expect(
      profiles.saveProfile({ ownerId, profile: { name: "", phone: "12", postalCode: "" } })
    ).rejects.toThrow();
    await expect(
      context.database
        .withSchema("app")
        .insertInto("customerProfile")
        .values({ customerAccountId: ownerId, name: "", phone: "", postalCode: "10115 Berlin" })
        .execute()
    ).rejects.toThrow();
  });

  it("keeps how to address and reach the person, and the table holds the rules too", async () => {
    const profiles = createPostgresCustomerProfileModule(context.database);
    const ownerId = await newAccount();
    const details = {
      name: "Anna Weber",
      phone: "030 1234567",
      postalCode: "10115",
      salutation: "frau",
      title: "Dr.",
      contactChannel: "phone",
      contactTime: "evening",
      customerType: "professional",
      company: "Weber Innenarchitektur",
      professionalRole: "architecture"
    } as const;
    expect(await profiles.saveProfile({ ownerId, profile: details })).toEqual(details);
    expect(await profiles.getProfile({ ownerId })).toEqual(details);

    const app = context.database.withSchema("app");
    // A call without a number, a company without a professional: refused by the table as well.
    await expect(
      app.updateTable("customerProfile").set({ phone: "" }).where("customerAccountId", "=", ownerId).execute()
    ).rejects.toThrow();
    await expect(
      app.updateTable("customerProfile").set({ customerType: "private" }).where("customerAccountId", "=", ownerId).execute()
    ).rejects.toThrow();
  });

  it("goes with the account", async () => {
    const profiles = createPostgresCustomerProfileModule(context.database);
    const ownerId = await newAccount();
    await profiles.saveProfile({ ownerId, profile: { name: "Weg", phone: "", postalCode: "" } });

    await context.database.withSchema("app").deleteFrom("customerAccount").where("id", "=", ownerId).execute();

    const rows = await context.database
      .withSchema("app")
      .selectFrom("customerProfile")
      .select("customerAccountId")
      .where("customerAccountId", "=", ownerId)
      .execute();
    expect(rows).toEqual([]);
  });
});
