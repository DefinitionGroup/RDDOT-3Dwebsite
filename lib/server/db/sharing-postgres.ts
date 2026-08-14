import "server-only";

import { createHash, randomUUID } from "node:crypto";
import type { Kysely } from "kysely";
import { z } from "zod";
import { hashJson, parseConfiguration } from "@/features/projects/configuration-contract";
import type {
  CreateSharedRevisionLinkResult,
  SharingModule,
  SharedRevisionLinkSummary
} from "@/features/sharing/sharing-module";
import type { Database } from "@/lib/server/db/database-types";
import { isPostgresErrorWithCode } from "@/lib/server/db/postgres-errors";

const uuidSchema = z.uuid();
const idempotencyKeySchema = z.string().trim().min(8).max(200);
const shareTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
const linkLifetimeMs = 90 * 24 * 60 * 60 * 1000;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function mapLink(row: {
  id: string;
  configurationRevisionId: string;
  createdAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
}): SharedRevisionLinkSummary {
  return {
    id: row.id,
    revisionId: row.configurationRevisionId,
    createdAt: new Date(row.createdAt),
    expiresAt: new Date(row.expiresAt),
    revokedAt: row.revokedAt ? new Date(row.revokedAt) : null
  };
}

export function createPostgresSharingModule(
  database: Kysely<Database>,
  clock: () => Date = () => new Date()
): SharingModule {
  return {
    async createLink(input): Promise<CreateSharedRevisionLinkResult> {
      const ownerId = uuidSchema.parse(input.ownerId);
      const projectId = uuidSchema.parse(input.projectId);
      const expectedVersion = z.number().int().positive().parse(input.expectedVersion);
      const idempotencyKey = idempotencyKeySchema.parse(input.idempotencyKey);
      const tokenHash = hashToken(shareTokenSchema.parse(input.token));
      const requestHash = hashJson({ projectId, expectedVersion, tokenHash });

      try {
        return await database.transaction().execute(async (transaction) => {
          const replay = await transaction
            .withSchema("app")
            .selectFrom("sharedRevisionLink")
            .innerJoin("project", "project.id", "sharedRevisionLink.projectId")
            .select([
              "sharedRevisionLink.id",
              "sharedRevisionLink.configurationRevisionId",
              "sharedRevisionLink.createdAt",
              "sharedRevisionLink.expiresAt",
              "sharedRevisionLink.revokedAt",
              "sharedRevisionLink.requestHash"
            ])
            .where("project.id", "=", projectId)
            .where("project.ownerId", "=", ownerId)
            .where("sharedRevisionLink.creationIdempotencyKey", "=", idempotencyKey)
            .executeTakeFirst();

          if (replay) {
            return replay.requestHash === requestHash
              ? { kind: "replayed", link: mapLink(replay) }
              : { kind: "idempotency-conflict" };
          }

          const working = await transaction
            .withSchema("app")
            .selectFrom("workingConfiguration")
            .innerJoin("project", "project.id", "workingConfiguration.projectId")
            .select([
              "workingConfiguration.normalizedConfiguration",
              "workingConfiguration.configurationHash",
              "workingConfiguration.schemaVersion",
              "workingConfiguration.productDefinitionVersion",
              "workingConfiguration.version"
            ])
            .where("project.id", "=", projectId)
            .where("project.ownerId", "=", ownerId)
            .where("project.lifecycle", "=", "active")
            .forUpdate()
            .executeTakeFirst();

          if (!working) return { kind: "unavailable" };
          if (Number(working.version) !== expectedVersion) {
            return { kind: "conflict", currentVersion: Number(working.version) };
          }

          const insertedRevision = await transaction
            .withSchema("app")
            .insertInto("configurationRevision")
            .values({
              id: randomUUID(),
              projectId,
              normalizedConfiguration: working.normalizedConfiguration,
              configurationHash: working.configurationHash,
              schemaVersion: working.schemaVersion,
              productDefinitionVersion: working.productDefinitionVersion,
              displaySnapshot: input.displaySnapshot,
              trigger: "share",
              label: null
            })
            .onConflict((conflict) =>
              conflict
                .columns([
                  "projectId",
                  "schemaVersion",
                  "productDefinitionVersion",
                  "configurationHash"
                ])
                .doNothing()
            )
            .returning("id")
            .executeTakeFirst();

          const revision =
            insertedRevision ??
            (await transaction
              .withSchema("app")
              .selectFrom("configurationRevision")
              .select("id")
              .where("projectId", "=", projectId)
              .where("schemaVersion", "=", working.schemaVersion)
              .where("productDefinitionVersion", "=", working.productDefinitionVersion)
              .where("configurationHash", "=", working.configurationHash)
              .executeTakeFirstOrThrow());

          const now = clock();
          const inserted = await transaction
            .withSchema("app")
            .insertInto("sharedRevisionLink")
            .values({
              id: randomUUID(),
              projectId,
              configurationRevisionId: revision.id,
              tokenHash,
              creationIdempotencyKey: idempotencyKey,
              requestHash,
              createdAt: now,
              expiresAt: new Date(now.getTime() + linkLifetimeMs),
              revokedAt: null
            })
            .returning([
              "id",
              "configurationRevisionId",
              "createdAt",
              "expiresAt",
              "revokedAt"
            ])
            .executeTakeFirstOrThrow();

          return { kind: "created", link: mapLink(inserted) };
        });
      } catch (error) {
        if (isPostgresErrorWithCode(error, "23505")) {
          const replay = await database
            .withSchema("app")
            .selectFrom("sharedRevisionLink")
            .innerJoin("project", "project.id", "sharedRevisionLink.projectId")
            .select([
              "sharedRevisionLink.id",
              "sharedRevisionLink.configurationRevisionId",
              "sharedRevisionLink.createdAt",
              "sharedRevisionLink.expiresAt",
              "sharedRevisionLink.revokedAt",
              "sharedRevisionLink.requestHash"
            ])
            .where("project.id", "=", projectId)
            .where("project.ownerId", "=", ownerId)
            .where("sharedRevisionLink.creationIdempotencyKey", "=", idempotencyKey)
            .executeTakeFirst();
          if (replay) {
            return replay.requestHash === requestHash
              ? { kind: "replayed", link: mapLink(replay) }
              : { kind: "idempotency-conflict" };
          }
          return { kind: "token-conflict" };
        }
        throw error;
      }
    },

    async listLinks(input) {
      const ownerId = uuidSchema.parse(input.ownerId);
      const projectId = uuidSchema.parse(input.projectId);
      const rows = await database
        .withSchema("app")
        .selectFrom("sharedRevisionLink")
        .innerJoin("project", "project.id", "sharedRevisionLink.projectId")
        .select([
          "sharedRevisionLink.id",
          "sharedRevisionLink.configurationRevisionId",
          "sharedRevisionLink.createdAt",
          "sharedRevisionLink.expiresAt",
          "sharedRevisionLink.revokedAt"
        ])
        .where("project.id", "=", projectId)
        .where("project.ownerId", "=", ownerId)
        .where("project.lifecycle", "!=", "trashed")
        .orderBy("sharedRevisionLink.createdAt", "desc")
        .execute();

      return rows.map(mapLink);
    },

    async revokeLink(input) {
      const ownerId = uuidSchema.parse(input.ownerId);
      const projectId = uuidSchema.parse(input.projectId);
      const linkId = uuidSchema.parse(input.linkId);
      const revokedAt = clock();
      const revoked = await database
        .withSchema("app")
        .updateTable("sharedRevisionLink")
        .set({ revokedAt })
        .where("id", "=", linkId)
        .where("projectId", "=", projectId)
        .where("revokedAt", "is", null)
        .where("projectId", "in", (query) =>
          query
            .selectFrom("project")
            .select("id")
            .where("ownerId", "=", ownerId)
            .where("lifecycle", "!=", "trashed")
        )
        .returning("revokedAt")
        .executeTakeFirst();

      if (revoked?.revokedAt) {
        return { kind: "revoked", revokedAt: new Date(revoked.revokedAt) };
      }

      const existing = await database
        .withSchema("app")
        .selectFrom("sharedRevisionLink")
        .innerJoin("project", "project.id", "sharedRevisionLink.projectId")
        .select("sharedRevisionLink.revokedAt")
        .where("sharedRevisionLink.id", "=", linkId)
        .where("project.id", "=", projectId)
        .where("project.ownerId", "=", ownerId)
        .where("project.lifecycle", "!=", "trashed")
        .executeTakeFirst();

      return existing?.revokedAt
        ? { kind: "unchanged", revokedAt: new Date(existing.revokedAt) }
        : { kind: "unavailable" };
    },

    async resolveLink(input) {
      const linkId = uuidSchema.parse(input.linkId);
      const tokenHash = hashToken(shareTokenSchema.parse(input.token));
      const row = await database
        .withSchema("app")
        .selectFrom("sharedRevisionLink")
        .innerJoin(
          "configurationRevision",
          "configurationRevision.id",
          "sharedRevisionLink.configurationRevisionId"
        )
        .innerJoin("project", "project.id", "sharedRevisionLink.projectId")
        .select([
          "configurationRevision.normalizedConfiguration",
          "configurationRevision.productDefinitionVersion",
          "configurationRevision.displaySnapshot",
          "sharedRevisionLink.expiresAt"
        ])
        .where("sharedRevisionLink.id", "=", linkId)
        .where("sharedRevisionLink.tokenHash", "=", tokenHash)
        .where("sharedRevisionLink.revokedAt", "is", null)
        .where("sharedRevisionLink.expiresAt", ">", clock())
        .where("project.lifecycle", "!=", "trashed")
        .executeTakeFirst();

      return row
        ? {
            configuration: parseConfiguration(row.normalizedConfiguration),
            productDefinitionVersion: row.productDefinitionVersion,
            displaySnapshot: row.displaySnapshot,
            expiresAt: new Date(row.expiresAt)
          }
        : null;
    }
  };
}
