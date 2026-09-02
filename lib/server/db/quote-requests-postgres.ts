import "server-only";

import { randomUUID } from "node:crypto";
import type { Kysely, Transaction } from "kysely";
import { z } from "zod";
import { hashJson } from "@/features/projects/configuration-contract";
import type { JsonValue } from "@/features/projects/project-module";
import {
  quoteRequestContactSchema,
  quoteRequestNoteSchema
} from "@/features/quote-requests/quote-request-contract";
import type {
  QuoteRequest,
  QuoteRequestCursor,
  QuoteRequestModule,
  QuoteRequestPage,
  SubmitQuoteRequestResult
} from "@/features/quote-requests/quote-request-module";
import { createQuoteRequestReference } from "@/features/quote-requests/quote-request-reference";
import type { Database } from "@/lib/server/db/database-types";
import { isPostgresErrorWithCode } from "@/lib/server/db/postgres-errors";

const uuidSchema = z.uuid();
const idempotencyKeySchema = z.string().trim().min(8).max(200);
const consentVersionSchema = z.string().trim().min(1).max(64);

/** Cheap abuse ceiling; a person planning one kitchen does not need more. */
const MAX_REQUESTS_PER_DAY = 10;
/** Unique-violation retries: a reference collision or a concurrent identical submit. */
const SUBMIT_ATTEMPTS = 3;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

/**
 * Describes the pinned configuration for the record: the display snapshot the
 * Configuration Revision carries and the Price Indication the request stores.
 * Returns null when the Product Definition version is not supported, in which
 * case nothing is written. Product knowledge stays outside this module.
 */
export type ConfigurationDescriber = (input: {
  normalizedConfiguration: unknown;
  productDefinitionVersion: string;
  now: Date;
}) => { displaySnapshot: JsonValue; priceIndication: JsonValue } | null;

type Row = {
  id: string;
  reference: string;
  projectId: string;
  projectName: string;
  configurationRevisionId: string;
  state: QuoteRequest["state"];
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  note: string;
  consentVersion: string;
  consentAcceptedAt: Date;
  priceIndication: JsonValue;
  createdAt: Date;
  updatedAt: Date;
};

function mapRow(row: Row): QuoteRequest {
  return {
    id: row.id,
    reference: row.reference,
    projectId: row.projectId,
    projectName: row.projectName,
    revisionId: row.configurationRevisionId,
    state: row.state,
    contact: { name: row.contactName, email: row.contactEmail, phone: row.contactPhone },
    note: row.note,
    consent: { version: row.consentVersion, acceptedAt: new Date(row.consentAcceptedAt) },
    priceIndication: row.priceIndication,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt)
  };
}

const columns = [
  "quoteRequest.id",
  "quoteRequest.reference",
  "quoteRequest.projectId",
  "project.name as projectName",
  "quoteRequest.configurationRevisionId",
  "quoteRequest.state",
  "quoteRequest.contactName",
  "quoteRequest.contactEmail",
  "quoteRequest.contactPhone",
  "quoteRequest.note",
  "quoteRequest.consentVersion",
  "quoteRequest.consentAcceptedAt",
  "quoteRequest.priceIndication",
  "quoteRequest.createdAt",
  "quoteRequest.updatedAt"
] as const;

export function createPostgresQuoteRequestModule(
  database: Kysely<Database>,
  dependencies: { describeConfiguration: ConfigurationDescriber },
  clock: () => Date = () => new Date()
): QuoteRequestModule {
  const { describeConfiguration } = dependencies;

  /** Single owner predicate for every read in this module. */
  function owned(ownerId: string, executor: Kysely<Database> | Transaction<Database> = database) {
    return executor
      .withSchema("app")
      .selectFrom("quoteRequest")
      .innerJoin("project", "project.id", "quoteRequest.projectId")
      .where("project.ownerId", "=", ownerId)
      .where("project.lifecycle", "!=", "trashed");
  }

  async function page(
    base: ReturnType<typeof owned>,
    limit: number,
    cursor: QuoteRequestCursor | undefined
  ): Promise<QuoteRequestPage> {
    const total = await base
      .clearSelect()
      .select((expression) => expression.fn.countAll<number>().as("count"))
      .executeTakeFirstOrThrow();

    let query = base.select([...columns]);
    if (cursor) {
      query = query.where((expression) =>
        expression.or([
          expression("quoteRequest.createdAt", "<", cursor.createdAt),
          expression.and([
            expression("quoteRequest.createdAt", "=", cursor.createdAt),
            expression("quoteRequest.id", "<", cursor.id)
          ])
        ])
      );
    }
    const rows = await query
      .orderBy("quoteRequest.createdAt", "desc")
      .orderBy("quoteRequest.id", "desc")
      .limit(limit + 1)
      .execute();

    const items = rows.slice(0, limit).map((row) => mapRow(row as Row));
    const last = items[items.length - 1];
    return {
      items,
      totalCount: Number(total.count),
      nextCursor:
        rows.length > limit && last ? { createdAt: last.createdAt, id: last.id } : null
    };
  }

  function pageSize(limit: number | undefined) {
    return z
      .number()
      .int()
      .min(1)
      .max(MAX_PAGE_SIZE)
      .default(DEFAULT_PAGE_SIZE)
      .parse(limit);
  }

  return {
    async submit(input): Promise<SubmitQuoteRequestResult> {
      const ownerId = uuidSchema.parse(input.ownerId);
      const projectId = uuidSchema.parse(input.projectId);
      const expectedVersion = z.number().int().positive().parse(input.expectedVersion);
      const idempotencyKey = idempotencyKeySchema.parse(input.idempotencyKey);
      const contact = quoteRequestContactSchema.parse(input.contact);
      const note = quoteRequestNoteSchema.parse(input.note);
      const consentVersion = consentVersionSchema.parse(input.consent.version);
      const requestHash = hashJson({
        projectId,
        expectedVersion,
        contact,
        note,
        consentVersion
      });

      for (let attempt = 1; ; attempt += 1) {
        try {
          return await database.transaction().execute(
            async (transaction): Promise<SubmitQuoteRequestResult> => {
              const replay = await owned(ownerId, transaction)
                .select([...columns, "quoteRequest.requestHash"])
                .where("project.id", "=", projectId)
                .where("quoteRequest.creationIdempotencyKey", "=", idempotencyKey)
                .executeTakeFirst();
              if (replay) {
                if (replay.requestHash !== requestHash) {
                  return { kind: "idempotency-conflict" };
                }
                return { kind: "replayed", quoteRequest: mapRow(replay as Row) };
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
              // `version` is a bigint, which the driver hands back as a string.
              const currentVersion = Number(working.version);
              if (currentVersion !== expectedVersion) {
                return { kind: "conflict", currentVersion };
              }

              const now = clock();
              const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
              const recent = await transaction
                .withSchema("app")
                .selectFrom("quoteRequest")
                .innerJoin("project", "project.id", "quoteRequest.projectId")
                .select((expression) => expression.fn.countAll<number>().as("count"))
                .where("project.ownerId", "=", ownerId)
                .where("quoteRequest.createdAt", ">=", since)
                .executeTakeFirstOrThrow();
              if (Number(recent.count) >= MAX_REQUESTS_PER_DAY) {
                return { kind: "quota-exceeded", retryAfterSeconds: 3600 };
              }

              const description = describeConfiguration({
                normalizedConfiguration: working.normalizedConfiguration,
                productDefinitionVersion: working.productDefinitionVersion,
                now
              });
              if (!description) return { kind: "unsupported-product-definition" };

              // The checkpoint and the request are one transaction: a request
              // can never reference a configuration that was not durably
              // pinned first (ADR 0003).
              const revisionId = randomUUID();
              const inserted = await transaction
                .withSchema("app")
                .insertInto("configurationRevision")
                .values({
                  id: revisionId,
                  projectId,
                  normalizedConfiguration: working.normalizedConfiguration,
                  configurationHash: working.configurationHash,
                  schemaVersion: working.schemaVersion,
                  productDefinitionVersion: working.productDefinitionVersion,
                  displaySnapshot: description.displaySnapshot,
                  trigger: "quote",
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
                inserted ??
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

              const quoteRequestId = randomUUID();
              const reference = createQuoteRequestReference();
              await transaction
                .withSchema("app")
                .insertInto("quoteRequest")
                .values({
                  id: quoteRequestId,
                  projectId,
                  configurationRevisionId: revision.id,
                  reference,
                  state: "submitted",
                  creationIdempotencyKey: idempotencyKey,
                  requestHash,
                  contactName: contact.name,
                  contactEmail: contact.email,
                  contactPhone: contact.phone,
                  note,
                  consentVersion,
                  consentAcceptedAt: now,
                  priceIndication: description.priceIndication,
                  createdAt: now,
                  updatedAt: now
                })
                .execute();

              // The business notification is deferred with the email provider
              // (ADR 0010); the intent is durable from the start so nothing is
              // lost in between.
              await transaction
                .withSchema("app")
                .insertInto("outboxMessage")
                .values({
                  id: randomUUID(),
                  topic: "quote-request.submitted",
                  aggregateType: "quote-request",
                  aggregateId: quoteRequestId,
                  idempotencyKey: quoteRequestId,
                  requestHash,
                  payload: { quoteRequestId, projectId, reference },
                  occurredAt: now,
                  availableAt: now,
                  processedAt: null
                })
                .execute();

              const created = await owned(ownerId, transaction)
                .select([...columns])
                .where("quoteRequest.id", "=", quoteRequestId)
                .executeTakeFirstOrThrow();
              return { kind: "submitted", quoteRequest: mapRow(created as Row) };
            }
          );
        } catch (error) {
          // A reference collision or a concurrent submit with the same key; the
          // next attempt either draws a new reference or replays the winner.
          if (isPostgresErrorWithCode(error, "23505") && attempt < SUBMIT_ATTEMPTS) {
            continue;
          }
          throw error;
        }
      }
    },

    async get(input) {
      const ownerId = uuidSchema.parse(input.ownerId);
      const quoteRequestId = uuidSchema.parse(input.quoteRequestId);
      const row = await owned(ownerId)
        .select([...columns])
        .where("quoteRequest.id", "=", quoteRequestId)
        .executeTakeFirst();
      return row ? mapRow(row as Row) : null;
    },

    async listForProject(input) {
      const ownerId = uuidSchema.parse(input.ownerId);
      const projectId = uuidSchema.parse(input.projectId);
      return page(
        owned(ownerId).where("project.id", "=", projectId),
        pageSize(input.limit),
        input.cursor
      );
    },

    async listForAccount(input) {
      const ownerId = uuidSchema.parse(input.ownerId);
      return page(owned(ownerId), pageSize(input.limit), input.cursor);
    }
  };
}
