import { randomUUID } from "node:crypto";
import type { Kysely } from "kysely";
import type { Database } from "@/lib/server/db/database-types";

/** Inserts a synthetic Dealer, as `pnpm dealers:provision` would (ADR 0014). */
export async function createDealer(
  database: Kysely<Database>,
  overrides: Partial<{
    name: string;
    latitude: number;
    longitude: number;
    status: "active" | "inactive";
  }> = {}
) {
  const id = randomUUID();
  await database
    .withSchema("app")
    .insertInto("dealer")
    .values({
      id,
      name: overrides.name ?? `Testküchen ${id.slice(0, 8)}`,
      street: "Musterstraße 1",
      postalCode: "10117",
      city: "Berlin",
      latitude: overrides.latitude ?? 52.52,
      longitude: overrides.longitude ?? 13.39,
      phone: "+49 30 0000 100",
      status: overrides.status ?? "active"
    })
    .execute();
  return id;
}

export async function createDealerUser(
  database: Kysely<Database>,
  dealerId: string,
  overrides: Partial<{ email: string; status: "active" | "disabled" }> = {}
) {
  const id = randomUUID();
  const email = overrides.email ?? `dealer-${id}@example.invalid`;
  await database
    .withSchema("app")
    .insertInto("dealerUser")
    .values({
      id,
      dealerId,
      email,
      name: "Test Händler",
      phone: "+49 30 0000 200",
      status: overrides.status ?? "active"
    })
    .execute();
  return { id, email };
}

export async function setDealerUserStatus(
  database: Kysely<Database>,
  dealerUserId: string,
  status: "active" | "disabled"
) {
  await database
    .withSchema("app")
    .updateTable("dealerUser")
    .set({ status })
    .where("id", "=", dealerUserId)
    .execute();
}

export async function setDealerStatus(
  database: Kysely<Database>,
  dealerId: string,
  status: "active" | "inactive"
) {
  await database
    .withSchema("app")
    .updateTable("dealer")
    .set({ status })
    .where("id", "=", dealerId)
    .execute();
}
