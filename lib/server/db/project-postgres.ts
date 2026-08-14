import "server-only";

import { randomUUID } from "node:crypto";
import type { Kysely, Selectable, Transaction } from "kysely";
import { z } from "zod";
import {
  hashConfiguration,
  hashJson,
  parseConfiguration
} from "@/features/projects/configuration-contract";
import type {
  CheckpointRevisionResult,
  ProjectModule,
  ProjectWorkspace
} from "@/features/projects/project-module";
import type {
  Database,
  WorkingConfigurationTable
} from "@/lib/server/db/database-types";
import { isPostgresErrorWithCode } from "@/lib/server/db/postgres-errors";

const uuidSchema = z.uuid();
const idempotencyKeySchema = z.string().trim().min(8).max(200);
const productDefinitionVersionSchema = z.string().trim().min(1).max(100);
const projectNameSchema = z.string().trim().min(1).max(120);
const labelSchema = z.string().trim().min(1).max(120);
const topicSchema = z.string().trim().min(1).max(120);

class IdempotencyConflict extends Error {}

function mapWorkspace(row: {
  projectId: string;
  name: string;
  lifecycle: "active" | "archived" | "trashed";
  normalizedConfiguration: unknown;
  version: number;
  configurationHash: string;
  productDefinitionVersion: string;
  updatedAt: Date;
}): ProjectWorkspace {
  return {
    id: row.projectId,
    name: row.name,
    lifecycle: row.lifecycle,
    workingConfiguration: {
      configuration: parseConfiguration(row.normalizedConfiguration),
      version: Number(row.version),
      configurationHash: row.configurationHash,
      productDefinitionVersion: row.productDefinitionVersion,
      updatedAt: new Date(row.updatedAt)
    }
  };
}

async function findWorkspace(
  database: Kysely<Database> | Transaction<Database>,
  ownerId: string,
  projectId: string
) {
  const row = await database
    .withSchema("app")
    .selectFrom("project")
    .innerJoin(
      "workingConfiguration",
      "workingConfiguration.projectId",
      "project.id"
    )
    .select([
      "project.id as projectId",
      "project.name",
      "project.lifecycle",
      "workingConfiguration.normalizedConfiguration",
      "workingConfiguration.version",
      "workingConfiguration.configurationHash",
      "workingConfiguration.productDefinitionVersion",
      "workingConfiguration.updatedAt"
    ])
    .where("project.id", "=", projectId)
    .where("project.ownerId", "=", ownerId)
    .executeTakeFirst();

  return row ? mapWorkspace(row) : null;
}

async function findWorkspaceByCreationKey(
  database: Kysely<Database> | Transaction<Database>,
  ownerId: string,
  idempotencyKey: string
) {
  const row = await database
    .withSchema("app")
    .selectFrom("project")
    .select("id")
    .where("ownerId", "=", ownerId)
    .where("creationIdempotencyKey", "=", idempotencyKey)
    .executeTakeFirst();

  return row ? findWorkspace(database, ownerId, row.id) : null;
}

function currentVersion(
  row: Pick<Selectable<WorkingConfigurationTable>, "version">
) {
  return Number(row.version);
}

export function createPostgresProjectModule(
  database: Kysely<Database>
): ProjectModule {
  return {
    async listProjects(input) {
      const ownerId = uuidSchema.parse(input.ownerId);
      let query = database
        .withSchema("app")
        .selectFrom("project")
        .select(["id", "name", "lifecycle", "updatedAt"])
        .where("ownerId", "=", ownerId)
        .where("lifecycle", "!=", "trashed");

      if (!input.includeArchived) {
        query = query.where("lifecycle", "=", "active");
      }

      const rows = await query.orderBy("updatedAt", "desc").execute();
      return rows.map((row) => ({
        ...row,
        updatedAt: new Date(row.updatedAt)
      }));
    },

    async createProject(input) {
      const ownerId = uuidSchema.parse(input.ownerId);
      const idempotencyKey = idempotencyKeySchema.parse(input.idempotencyKey);
      const name = projectNameSchema.parse(input.name);
      const productDefinitionVersion = productDefinitionVersionSchema.parse(
        input.productDefinitionVersion
      );
      const configuration = parseConfiguration(input.configuration);
      const configurationHash = hashConfiguration(configuration);

      const existing = await findWorkspaceByCreationKey(
        database,
        ownerId,
        idempotencyKey
      );
      if (existing) return existing;

      try {
        return await database.transaction().execute(async (transaction) => {
          const projectId = randomUUID();

          await transaction
            .withSchema("app")
            .insertInto("project")
            .values({
              id: projectId,
              ownerId,
              creationIdempotencyKey: idempotencyKey,
              name,
              privateNotes: "",
              lifecycle: "active",
              trashedAt: null,
              deletionDueAt: null
            })
            .executeTakeFirstOrThrow();

          await transaction
            .withSchema("app")
            .insertInto("workingConfiguration")
            .values({
              projectId,
              normalizedConfiguration: configuration,
              configurationHash,
              schemaVersion: configuration.schemaVersion,
              productDefinitionVersion
            })
            .executeTakeFirstOrThrow();

          const workspace = await findWorkspace(
            transaction,
            ownerId,
            projectId
          );
          if (!workspace) throw new Error("Created Project could not be loaded");
          return workspace;
        });
      } catch (error) {
        if (!isPostgresErrorWithCode(error, "23505")) throw error;

        const replay = await findWorkspaceByCreationKey(
          database,
          ownerId,
          idempotencyKey
        );
        if (!replay) throw error;
        return replay;
      }
    },

    async getWorkspace(input) {
      return findWorkspace(
        database,
        uuidSchema.parse(input.ownerId),
        uuidSchema.parse(input.projectId)
      );
    },

    async saveWorkingConfiguration(input) {
      const ownerId = uuidSchema.parse(input.ownerId);
      const projectId = uuidSchema.parse(input.projectId);
      const expectedVersion = z.number().int().positive().parse(input.expectedVersion);
      const productDefinitionVersion = productDefinitionVersionSchema.parse(
        input.productDefinitionVersion
      );
      const configuration = parseConfiguration(input.configuration);
      const configurationHash = hashConfiguration(configuration);

      return database.transaction().execute(async (transaction) => {
        const saved = await transaction
          .withSchema("app")
          .updateTable("workingConfiguration")
          .set((expression) => ({
            normalizedConfiguration: configuration,
            configurationHash,
            schemaVersion: configuration.schemaVersion,
            productDefinitionVersion,
            version: expression("version", "+", 1),
            updatedAt: new Date()
          }))
          .where("projectId", "=", projectId)
          .where("version", "=", expectedVersion)
          .where("projectId", "in", (query) =>
            query
              .selectFrom("project")
              .select("id")
              .where("ownerId", "=", ownerId)
              .where("lifecycle", "=", "active")
          )
          .returning(["version", "updatedAt"])
          .executeTakeFirst();

        if (saved) {
          await transaction
            .withSchema("app")
            .updateTable("project")
            .set({ updatedAt: new Date(saved.updatedAt) })
            .where("id", "=", projectId)
            .where("ownerId", "=", ownerId)
            .executeTakeFirstOrThrow();

          return {
            kind: "saved" as const,
            version: Number(saved.version),
            configurationHash,
            updatedAt: new Date(saved.updatedAt)
          };
        }

        const current = await transaction
          .withSchema("app")
          .selectFrom("workingConfiguration")
          .innerJoin("project", "project.id", "workingConfiguration.projectId")
          .select("workingConfiguration.version")
          .where("project.id", "=", projectId)
          .where("project.ownerId", "=", ownerId)
          .where("project.lifecycle", "=", "active")
          .executeTakeFirst();

        return current
          ? { kind: "conflict" as const, currentVersion: currentVersion(current) }
          : { kind: "unavailable" as const };
      });
    },

    async checkpointRevision(input): Promise<CheckpointRevisionResult> {
      const ownerId = uuidSchema.parse(input.ownerId);
      const projectId = uuidSchema.parse(input.projectId);
      const expectedVersion = z.number().int().positive().parse(input.expectedVersion);
      const label = input.label ? labelSchema.parse(input.label) : null;
      const topic = topicSchema.parse(input.intent.topic);
      const idempotencyKey = idempotencyKeySchema.parse(
        input.intent.idempotencyKey
      );

      try {
        return await database.transaction().execute(async (transaction) => {
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
          if (currentVersion(working) !== expectedVersion) {
            return {
              kind: "conflict",
              currentVersion: currentVersion(working)
            };
          }

          const revisionId = randomUUID();
          const insertedRevision = await transaction
            .withSchema("app")
            .insertInto("configurationRevision")
            .values({
              id: revisionId,
              projectId,
              normalizedConfiguration: working.normalizedConfiguration,
              configurationHash: working.configurationHash,
              schemaVersion: working.schemaVersion,
              productDefinitionVersion: working.productDefinitionVersion,
              displaySnapshot: input.displaySnapshot,
              trigger: input.trigger,
              label
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
              .where(
                "productDefinitionVersion",
                "=",
                working.productDefinitionVersion
              )
              .where("configurationHash", "=", working.configurationHash)
              .executeTakeFirstOrThrow());

          const requestHash = hashJson({
            revisionId: revision.id,
            topic,
            payload: input.intent.payload
          });
          const outboxMessageId = randomUUID();
          const insertedOutbox = await transaction
            .withSchema("app")
            .insertInto("outboxMessage")
            .values({
              id: outboxMessageId,
              topic,
              aggregateType: "configuration-revision",
              aggregateId: revision.id,
              idempotencyKey,
              requestHash,
              payload: {
                revisionId: revision.id,
                data: input.intent.payload
              },
              processedAt: null
            })
            .onConflict((conflict) =>
              conflict.columns(["topic", "idempotencyKey"]).doNothing()
            )
            .returning(["id", "requestHash"])
            .executeTakeFirst();

          if (insertedOutbox) {
            return {
              kind: "checkpointed",
              revisionId: revision.id,
              outboxMessageId: insertedOutbox.id
            };
          }

          const replay = await transaction
            .withSchema("app")
            .selectFrom("outboxMessage")
            .select(["id", "requestHash", "aggregateId"])
            .where("topic", "=", topic)
            .where("idempotencyKey", "=", idempotencyKey)
            .executeTakeFirstOrThrow();

          if (
            replay.requestHash !== requestHash ||
            replay.aggregateId !== revision.id
          ) {
            throw new IdempotencyConflict();
          }

          return {
            kind: "checkpointed",
            revisionId: revision.id,
            outboxMessageId: replay.id
          };
        });
      } catch (error) {
        if (error instanceof IdempotencyConflict) {
          return { kind: "idempotency-conflict" };
        }
        throw error;
      }
    }
  };
}
