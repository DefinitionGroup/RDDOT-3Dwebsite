import "server-only";

import type { Kysely, Transaction } from "kysely";
import { z } from "zod";
import type { ProjectActor } from "@/features/projects/project-module";
import type { Database } from "@/lib/server/db/database-types";

// How the Project adapters decide who may reach a Project (ADR 0014): its
// owner, or a Dealer User through the open Dealer Grant of the Project. Reads
// put `accessibleProjectIds` into their own statement; a dealer's write first
// takes `holdsProjectAccess` in its transaction, and an owner who changes a
// Project's grants first takes `lockOpenProjectGrant`, so grants are always
// locked before the Project and its Working Configuration.

type Executor = Kysely<Database> | Transaction<Database>;

const uuidSchema = z.uuid();

export function parseProjectActor(actor: ProjectActor): ProjectActor {
  return actor.kind === "owner"
    ? { kind: "owner", customerAccountId: uuidSchema.parse(actor.customerAccountId) }
    : { kind: "dealer", dealerUserId: uuidSchema.parse(actor.dealerUserId) };
}

/** The grants a Dealer User acts through: open, of an active Dealer, held by an active user. */
export function openGrantsOf(executor: Executor, dealerUserId: string) {
  return executor
    .withSchema("app")
    .selectFrom("projectDealerGrant as openGrant")
    .innerJoin("dealerUser as grantUser", "grantUser.dealerId", "openGrant.dealerId")
    .innerJoin("dealer as grantDealer", "grantDealer.id", "openGrant.dealerId")
    .where("grantUser.id", "=", dealerUserId)
    .where("grantUser.status", "=", "active")
    .where("grantDealer.status", "=", "active")
    .where("openGrant.revokedAt", "is", null);
}

/** The Projects the actor may reach, for `project.id in (…)` in the same statement. */
export function accessibleProjectIds(executor: Executor, actor: ProjectActor) {
  if (actor.kind === "owner") {
    return executor
      .withSchema("app")
      .selectFrom("project as ownedProject")
      .select("ownedProject.id")
      .where("ownedProject.ownerId", "=", actor.customerAccountId);
  }
  return openGrantsOf(executor, actor.dealerUserId).select("openGrant.projectId as id");
}

/**
 * Before a write: an owner needs nothing more; a Dealer User's open grant on
 * the Project is locked `FOR SHARE` for the rest of the transaction. A
 * revocation that committed first leaves no grant to find; one that comes
 * later waits until this write has committed.
 */
export async function holdsProjectAccess(
  transaction: Transaction<Database>,
  actor: ProjectActor,
  projectId: string
) {
  if (actor.kind === "owner") return true;
  const grant = await openGrantsOf(transaction, actor.dealerUserId)
    .select("openGrant.id")
    .where("openGrant.projectId", "=", projectId)
    .forShare("openGrant")
    .executeTakeFirst();
  return Boolean(grant);
}

/** Before an owner revokes or replaces a Project's grant: waits for dealer writes in flight. */
export async function lockOpenProjectGrant(
  transaction: Transaction<Database>,
  projectId: string
) {
  await transaction
    .withSchema("app")
    .selectFrom("projectDealerGrant")
    .select("id")
    .where("projectId", "=", projectId)
    .where("revokedAt", "is", null)
    .forUpdate()
    .execute();
}

/** The Dealer the Dealer User works for, for scoping what a dealer made. */
export function dealerUsersOfSameDealer(executor: Executor, dealerUserId: string) {
  return executor
    .withSchema("app")
    .selectFrom("dealerUser as colleague")
    .select("colleague.id")
    .where("colleague.dealerId", "=", (expression) =>
      expression
        .selectFrom("dealerUser as actingUser")
        .select("actingUser.dealerId")
        .where("actingUser.id", "=", dealerUserId)
    );
}
