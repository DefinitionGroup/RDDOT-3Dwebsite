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
  ConfigurationRevisionSummary,
  ProjectModule,
  ProjectWorkspace,
  RenameProjectResult,
  RestoreRevisionResult
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

function mapRevisionSummary(row: {
  id: string;
  label: string | null;
  trigger: "version-save" | "share" | "photo" | "quote";
  displaySnapshot: unknown;
  createdAt: Date;
}): ConfigurationRevisionSummary {
  return {
    ...row,
    displaySnapshot: row.displaySnapshot as ConfigurationRevisionSummary["displaySnapshot"],
    createdAt: new Date(row.createdAt)
  };
}

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

    async renameProject(input): Promise<RenameProjectResult> {
      const ownerId = uuidSchema.parse(input.ownerId);
      const projectId = uuidSchema.parse(input.projectId);
      const name = projectNameSchema.parse(input.name);
      const updatedAt = new Date();

      const renamed = await database
        .withSchema("app")
        .updateTable("project")
        .set({ name, updatedAt })
        .where("id", "=", projectId)
        .where("ownerId", "=", ownerId)
        .where("lifecycle", "!=", "trashed")
        .returning(["name"])
        .executeTakeFirst();

      if (!renamed) return { kind: "unavailable" };
      return { kind: "renamed", name: renamed.name, updatedAt };
    },

    async listConfigurationRevisions(input) {
      const ownerId = uuidSchema.parse(input.ownerId);
      const projectId = uuidSchema.parse(input.projectId);
      const limit = z.number().int().min(1).max(100).parse(input.limit ?? 50);
      const cursor = input.cursor
        ? {
            createdAt: z.date().parse(input.cursor.createdAt),
            id: uuidSchema.parse(input.cursor.id)
          }
        : null;

      let query = database
        .withSchema("app")
        .selectFrom("configurationRevision")
        .innerJoin("project", "project.id", "configurationRevision.projectId")
        .select([
          "configurationRevision.id",
          "configurationRevision.label",
          "configurationRevision.trigger",
          "configurationRevision.displaySnapshot",
          "configurationRevision.createdAt"
        ])
        .where("project.id", "=", projectId)
        .where("project.ownerId", "=", ownerId)
        .where("project.lifecycle", "!=", "trashed");

      if (cursor) {
        query = query.where((expression) =>
          expression.or([
            expression("configurationRevision.createdAt", "<", cursor.createdAt),
            expression.and([
              expression(
                "configurationRevision.createdAt",
                "=",
                cursor.createdAt
              ),
              expression("configurationRevision.id", "<", cursor.id)
            ])
          ])
        );
      }

      const [rows, countRow] = await Promise.all([
        query
        .orderBy("configurationRevision.createdAt", "desc")
          .orderBy("configurationRevision.id", "desc")
          .limit(limit + 1)
          .execute(),
        database
          .withSchema("app")
          .selectFrom("configurationRevision")
          .innerJoin("project", "project.id", "configurationRevision.projectId")
          .select((expression) => expression.fn.countAll<number>().as("count"))
          .where("project.id", "=", projectId)
          .where("project.ownerId", "=", ownerId)
          .where("project.lifecycle", "!=", "trashed")
          .executeTakeFirstOrThrow()
      ]);

      const visibleRows = rows.slice(0, limit);
      const last = rows.length > limit ? visibleRows.at(-1) : null;
      return {
        items: visibleRows.map(mapRevisionSummary),
        totalCount: Number(countRow.count),
        nextCursor: last
          ? { createdAt: new Date(last.createdAt), id: last.id }
          : null
      };
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

          const revisionIdentity =
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

          const revision = await transaction
            .withSchema("app")
            .selectFrom("configurationRevision")
            .select(["id", "label", "trigger", "displaySnapshot", "createdAt"])
            .where("id", "=", revisionIdentity.id)
            .executeTakeFirstOrThrow();

          const requestHash = hashJson({
            revisionId: revision.id,
            topic,
            payload: input.intent.payload,
            trigger: input.trigger,
            label,
            displaySnapshot: input.displaySnapshot
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
                revisionCreated: Boolean(insertedRevision),
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
              revision: mapRevisionSummary(revision),
              outboxMessageId: insertedOutbox.id,
              created: Boolean(insertedRevision)
            };
          }

          const replay = await transaction
            .withSchema("app")
            .selectFrom("outboxMessage")
            .select(["id", "requestHash", "aggregateId", "payload"])
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
            revision: mapRevisionSummary(revision),
            outboxMessageId: replay.id,
            created:
              typeof replay.payload === "object" &&
              replay.payload !== null &&
              !Array.isArray(replay.payload) &&
              replay.payload.revisionCreated === true
          };
        });
      } catch (error) {
        if (error instanceof IdempotencyConflict) {
          return { kind: "idempotency-conflict" };
        }
        throw error;
      }
    },

    async restoreRevision(input): Promise<RestoreRevisionResult> {
      const ownerId = uuidSchema.parse(input.ownerId);
      const projectId = uuidSchema.parse(input.projectId);
      const revisionId = uuidSchema.parse(input.revisionId);
      const expectedVersion = z.number().int().positive().parse(input.expectedVersion);
      const supportedProductDefinitionVersions = z
        .array(productDefinitionVersionSchema)
        .min(1)
        .parse(input.supportedProductDefinitionVersions);

      return database.transaction().execute(async (transaction) => {
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

        const target = await transaction
          .withSchema("app")
          .selectFrom("configurationRevision")
          .select([
            "normalizedConfiguration",
            "configurationHash",
            "schemaVersion",
            "productDefinitionVersion"
          ])
          .where("id", "=", revisionId)
          .where("projectId", "=", projectId)
          .executeTakeFirst();

        if (!target) return { kind: "unavailable" };
        if (
          !supportedProductDefinitionVersions.includes(
            target.productDefinitionVersion
          )
        ) {
          return {
            kind: "unsupported-product-definition",
            productDefinitionVersion: target.productDefinitionVersion
          };
        }
        const targetConfiguration = parseConfiguration(
          target.normalizedConfiguration
        );
        if (
          target.configurationHash === working.configurationHash &&
          target.schemaVersion === working.schemaVersion &&
          target.productDefinitionVersion === working.productDefinitionVersion
        ) {
          return {
            kind: "unchanged",
            configuration: targetConfiguration,
            version: currentVersion(working)
          };
        }

        await transaction
          .withSchema("app")
          .insertInto("configurationRevision")
          .values({
            id: randomUUID(),
            projectId,
            normalizedConfiguration: working.normalizedConfiguration,
            configurationHash: working.configurationHash,
            schemaVersion: working.schemaVersion,
            productDefinitionVersion: working.productDefinitionVersion,
            displaySnapshot: input.safetyDisplaySnapshot,
            trigger: "version-save",
            label: "Vor Wiederherstellung"
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
          .executeTakeFirst();

        const updatedAt = new Date();
        const restored = await transaction
          .withSchema("app")
          .updateTable("workingConfiguration")
          .set((expression) => ({
            normalizedConfiguration: target.normalizedConfiguration,
            configurationHash: target.configurationHash,
            schemaVersion: target.schemaVersion,
            productDefinitionVersion: target.productDefinitionVersion,
            version: expression("version", "+", 1),
            updatedAt
          }))
          .where("projectId", "=", projectId)
          .where("version", "=", expectedVersion)
          .returning("version")
          .executeTakeFirstOrThrow();

        await transaction
          .withSchema("app")
          .updateTable("project")
          .set({ updatedAt })
          .where("id", "=", projectId)
          .where("ownerId", "=", ownerId)
          .executeTakeFirstOrThrow();

        return {
          kind: "restored",
          configuration: targetConfiguration,
          version: Number(restored.version),
          updatedAt
        };
      });
    }
  };
}
