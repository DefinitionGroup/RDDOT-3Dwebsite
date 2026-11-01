import "server-only";

import { randomUUID } from "node:crypto";
import type { Kysely, Transaction } from "kysely";
import { z } from "zod";
import { parseConfiguration } from "@/features/projects/configuration-contract";
import type {
  DealerGrantSummary,
  DealerModule,
  GrantProjectResult,
  RevokeDealerGrantResult
} from "@/features/dealers/dealer-module";
import type { Database } from "@/lib/server/db/database-types";
import { isPostgresErrorWithCode } from "@/lib/server/db/postgres-errors";
import {
  lockOpenProjectGrant,
  openGrantsOf
} from "@/lib/server/db/project-access-postgres";

const uuidSchema = z.uuid();
const idempotencyKeySchema = z.string().trim().min(8).max(200);
const contactSchema = z.object({
  name: z.string().trim().max(120),
  email: z.string().trim().min(3).max(254),
  phone: z
    .string()
    .trim()
    .max(40)
    .refine((phone) => phone === "" || phone.length >= 3)
});

type Executor = Kysely<Database> | Transaction<Database>;

function grantsWithDealer(executor: Executor) {
  return executor
    .withSchema("app")
    .selectFrom("projectDealerGrant")
    .innerJoin("dealer", "dealer.id", "projectDealerGrant.dealerId")
    .innerJoin("project", "project.id", "projectDealerGrant.projectId")
    .select([
      "projectDealerGrant.id",
      "projectDealerGrant.projectId",
      "projectDealerGrant.dealerId",
      "projectDealerGrant.grantedAt",
      "dealer.name as dealerName",
      "dealer.street as dealerStreet",
      "dealer.postalCode as dealerPostalCode",
      "dealer.city as dealerCity",
      "dealer.phone as dealerPhone"
    ]);
}

function mapGrant(row: {
  id: string;
  projectId: string;
  dealerId: string;
  grantedAt: Date;
  dealerName: string;
  dealerStreet: string;
  dealerPostalCode: string;
  dealerCity: string;
  dealerPhone: string;
}): DealerGrantSummary {
  return {
    id: row.id,
    projectId: row.projectId,
    dealer: {
      id: row.dealerId,
      name: row.dealerName,
      street: row.dealerStreet,
      postalCode: row.dealerPostalCode,
      city: row.dealerCity,
      phone: row.dealerPhone
    },
    grantedAt: new Date(row.grantedAt)
  };
}

/** The owner's Project, read without a lock: the cheap first check before grants are locked. */
async function ownsProject(executor: Executor, ownerId: string, projectId: string) {
  const row = await executor
    .withSchema("app")
    .selectFrom("project")
    .select("id")
    .where("id", "=", projectId)
    .where("ownerId", "=", ownerId)
    .executeTakeFirst();
  return Boolean(row);
}

export function createPostgresDealerModule(
  database: Kysely<Database>,
  clock: () => Date = () => new Date()
): DealerModule {
  async function replayOf(
    executor: Executor,
    ownerId: string,
    projectId: string,
    idempotencyKey: string,
    dealerId: string
  ): Promise<GrantProjectResult | null> {
    const replay = await grantsWithDealer(executor)
      .where("project.id", "=", projectId)
      .where("project.ownerId", "=", ownerId)
      .where("projectDealerGrant.creationIdempotencyKey", "=", idempotencyKey)
      .executeTakeFirst();
    if (!replay) return null;
    return replay.dealerId === dealerId
      ? { kind: "replayed", grant: mapGrant(replay) }
      : { kind: "idempotency-conflict" };
  }

  return {
    async listDealers() {
      const rows = await database
        .withSchema("app")
        .selectFrom("dealer")
        .select([
          "id",
          "name",
          "street",
          "postalCode",
          "city",
          "country",
          "phone",
          "email",
          "website",
          "latitude",
          "longitude"
        ])
        .where("status", "=", "active")
        .orderBy("name")
        .execute();
      return rows.map((row) => ({
        ...row,
        latitude: Number(row.latitude),
        longitude: Number(row.longitude)
      }));
    },

    async grantProject(input): Promise<GrantProjectResult> {
      const ownerId = uuidSchema.parse(input.ownerId);
      const projectId = uuidSchema.parse(input.projectId);
      const dealerId = uuidSchema.parse(input.dealerId);
      const idempotencyKey = idempotencyKeySchema.parse(input.idempotencyKey);
      const contact = contactSchema.parse(input.customerContact);

      try {
        return await database.transaction().execute(async (transaction) => {
          const replay = await replayOf(transaction, ownerId, projectId, idempotencyKey, dealerId);
          if (replay) return replay;

          if (!(await ownsProject(transaction, ownerId, projectId))) {
            return { kind: "unavailable" };
          }
          // Grants first, then the Project: the order every dealer write keeps.
          await lockOpenProjectGrant(transaction, projectId);
          const project = await transaction
            .withSchema("app")
            .selectFrom("project")
            .select("id")
            .where("id", "=", projectId)
            .where("ownerId", "=", ownerId)
            .where("lifecycle", "=", "active")
            .forUpdate()
            .executeTakeFirst();
          if (!project) return { kind: "unavailable" };

          const dealer = await transaction
            .withSchema("app")
            .selectFrom("dealer")
            .select("id")
            .where("id", "=", dealerId)
            .where("status", "=", "active")
            .executeTakeFirst();
          if (!dealer) return { kind: "dealer-unavailable" };

          const open = await transaction
            .withSchema("app")
            .selectFrom("projectDealerGrant")
            .select(["id", "dealerId"])
            .where("projectId", "=", projectId)
            .where("revokedAt", "is", null)
            .executeTakeFirst();

          let grantId: string;
          if (open?.dealerId === dealerId) {
            // The same Dealer again: the grant stays, the contact copy is refreshed.
            await transaction
              .withSchema("app")
              .updateTable("projectDealerGrant")
              .set({
                customerName: contact.name,
                customerEmail: contact.email,
                customerPhone: contact.phone
              })
              .where("id", "=", open.id)
              .execute();
            grantId = open.id;
          } else {
            const now = clock();
            if (open) {
              await transaction
                .withSchema("app")
                .updateTable("projectDealerGrant")
                .set({ revokedAt: now })
                .where("id", "=", open.id)
                .execute();
            }
            grantId = randomUUID();
            await transaction
              .withSchema("app")
              .insertInto("projectDealerGrant")
              .values({
                id: grantId,
                projectId,
                dealerId,
                customerName: contact.name,
                customerEmail: contact.email,
                customerPhone: contact.phone,
                creationIdempotencyKey: idempotencyKey,
                grantedAt: now,
                revokedAt: null
              })
              .execute();
          }

          const grant = await grantsWithDealer(transaction)
            .where("projectDealerGrant.id", "=", grantId)
            .executeTakeFirstOrThrow();
          return { kind: "granted", grant: mapGrant(grant) };
        });
      } catch (error) {
        if (!isPostgresErrorWithCode(error, "23505")) throw error;
        const replay = await replayOf(database, ownerId, projectId, idempotencyKey, dealerId);
        if (replay) return replay;
        throw error;
      }
    },

    async revokeGrant(input): Promise<RevokeDealerGrantResult> {
      const ownerId = uuidSchema.parse(input.ownerId);
      const projectId = uuidSchema.parse(input.projectId);

      return database.transaction().execute(async (transaction) => {
        if (!(await ownsProject(transaction, ownerId, projectId))) {
          return { kind: "unavailable" };
        }
        await lockOpenProjectGrant(transaction, projectId);
        const revoked = await transaction
          .withSchema("app")
          .updateTable("projectDealerGrant")
          .set({ revokedAt: clock() })
          .where("projectId", "=", projectId)
          .where("revokedAt", "is", null)
          .returning("revokedAt")
          .executeTakeFirst();
        return revoked?.revokedAt
          ? { kind: "revoked", revokedAt: new Date(revoked.revokedAt) }
          : { kind: "unchanged" };
      });
    },

    async listGrantsForOwner(input) {
      const ownerId = uuidSchema.parse(input.ownerId);
      const rows = await grantsWithDealer(database)
        .where("project.ownerId", "=", ownerId)
        .where("project.lifecycle", "!=", "trashed")
        .where("projectDealerGrant.revokedAt", "is", null)
        .execute();
      return rows.map(mapGrant);
    },

    async listSharedProjects(input) {
      const dealerUserId = uuidSchema.parse(input.dealerUserId);
      const rows = await openGrantsOf(database, dealerUserId)
        .innerJoin("project", "project.id", "openGrant.projectId")
        .innerJoin("workingConfiguration", "workingConfiguration.projectId", "project.id")
        .select([
          "project.id as projectId",
          "project.name",
          "project.lifecycle",
          "project.updatedAt",
          "openGrant.grantedAt",
          "openGrant.customerName",
          "openGrant.customerEmail",
          "openGrant.customerPhone",
          "workingConfiguration.normalizedConfiguration",
          "workingConfiguration.productDefinitionVersion"
        ])
        .where("project.lifecycle", "in", ["active", "archived"])
        .orderBy("project.updatedAt", "desc")
        .execute();

      return rows.map((row) => ({
        projectId: row.projectId,
        name: row.name,
        lifecycle: row.lifecycle === "archived" ? "archived" : "active",
        updatedAt: new Date(row.updatedAt),
        grantedAt: new Date(row.grantedAt),
        customer: {
          name: row.customerName,
          email: row.customerEmail,
          phone: row.customerPhone
        },
        workingConfiguration: {
          configuration: parseConfiguration(row.normalizedConfiguration),
          productDefinitionVersion: row.productDefinitionVersion
        }
      }));
    }
  };
}
