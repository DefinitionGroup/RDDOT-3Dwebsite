import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { QUOTE_REQUEST_REFERENCE_PATTERN } from "@/features/quote-requests/quote-request-reference";
import {
  type ConfigurationDescriber,
  createPostgresQuoteRequestModule
} from "@/lib/server/db/quote-requests-postgres";
import {
  startPostgresTestContext,
  type PostgresTestContext
} from "@/tests/integration/postgres-test-context";

const describing: ConfigurationDescriber = ({ productDefinitionVersion, now }) => ({
  displaySnapshot: { kind: "test", productDefinitionVersion },
  priceIndication: { totalCents: 1010300, computedAt: now.toISOString() }
});

const unsupported: ConfigurationDescriber = () => null;

const CONTACT = { name: "Mara Vogel", email: "Mara.Vogel@example.com ", phone: "" };

describe("quote request contract", () => {
  let context: PostgresTestContext;

  beforeAll(async () => {
    context = await startPostgresTestContext();
  }, 120_000);

  afterAll(async () => {
    await context?.stop();
  });

  function moduleWith(describer = describing, clock?: () => Date) {
    return createPostgresQuoteRequestModule(
      context.database,
      { describeConfiguration: describer },
      clock
    );
  }

  async function seedProject(lifecycle: "active" | "archived" = "active") {
    const ownerId = crypto.randomUUID();
    const projectId = crypto.randomUUID();
    const db = context.database.withSchema("app");

    await db.insertInto("customerAccount").values({ id: ownerId, status: "active" }).execute();
    await db
      .insertInto("project")
      .values({
        id: projectId,
        ownerId,
        creationIdempotencyKey: `k-${projectId}`,
        name: "Küche Vogel",
        privateNotes: "",
        lifecycle
      })
      .execute();
    await db
      .insertInto("workingConfiguration")
      .values({
        projectId,
        normalizedConfiguration: {
          schemaVersion: 2,
          productKey: "rdtdot-signature-kitchen-v1",
          layout: "straight-line",
          cabinetColorKey: "graphite",
          frontColorKey: "porcelain",
          wallModules: ["big", "device", "big"],
          islandSize: 4
        },
        configurationHash: crypto.randomUUID().replaceAll("-", "").padEnd(64, "a").slice(0, 64),
        schemaVersion: 2,
        productDefinitionVersion: "rdtdot-signature-kitchen-v1@2"
      })
      .execute();

    return { ownerId, projectId };
  }

  function submission(ownerId: string, projectId: string, idempotencyKey = crypto.randomUUID()) {
    return {
      ownerId,
      projectId,
      expectedVersion: 1,
      idempotencyKey,
      contact: CONTACT,
      note: "  Bitte mit Termin für ein Beratungsgespräch.  ",
      consent: { version: "anfrage-datenschutz-2026-09" }
    };
  }

  it("pins a quote-triggered revision, the contact, consent, price context and an outbox intent in one submit", async () => {
    const { ownerId, projectId } = await seedProject();
    const now = new Date("2026-09-02T10:00:00.000Z");
    const quoteRequests = moduleWith(describing, () => now);

    const result = await quoteRequests.submit(submission(ownerId, projectId));

    expect(result.kind).toBe("submitted");
    if (result.kind !== "submitted") return;
    const request = result.quoteRequest;
    expect(request.reference).toMatch(QUOTE_REQUEST_REFERENCE_PATTERN);
    expect(request.state).toBe("submitted");
    expect(request.projectName).toBe("Küche Vogel");
    // Normalised at the boundary: trimmed, lower-cased email, empty phone → null.
    expect(request.contact).toEqual({
      name: "Mara Vogel",
      email: "mara.vogel@example.com",
      phone: null
    });
    expect(request.note).toBe("Bitte mit Termin für ein Beratungsgespräch.");
    expect(request.consent).toEqual({ version: "anfrage-datenschutz-2026-09", acceptedAt: now });
    expect(request.priceIndication).toEqual({
      totalCents: 1010300,
      computedAt: now.toISOString()
    });

    const db = context.database.withSchema("app");
    const revision = await db
      .selectFrom("configurationRevision")
      .selectAll()
      .where("id", "=", request.revisionId)
      .executeTakeFirstOrThrow();
    expect(revision.trigger).toBe("quote");
    expect(revision.projectId).toBe(projectId);
    expect(revision.displaySnapshot).toEqual({
      kind: "test",
      productDefinitionVersion: "rdtdot-signature-kitchen-v1@2"
    });

    const outbox = await db
      .selectFrom("outboxMessage")
      .selectAll()
      .where("aggregateId", "=", request.id)
      .executeTakeFirstOrThrow();
    expect(outbox.topic).toBe("quote-request.submitted");
    expect(outbox.payload).toEqual({
      quoteRequestId: request.id,
      projectId,
      reference: request.reference
    });
    expect(outbox.processedAt).toBeNull();
  });

  it("replays an identical submit and refuses the same key with different data", async () => {
    const { ownerId, projectId } = await seedProject();
    const quoteRequests = moduleWith();
    const key = crypto.randomUUID();

    const first = await quoteRequests.submit(submission(ownerId, projectId, key));
    const replay = await quoteRequests.submit(submission(ownerId, projectId, key));
    expect(first.kind).toBe("submitted");
    expect(replay.kind).toBe("replayed");
    if (first.kind !== "submitted" || replay.kind !== "replayed") return;
    expect(replay.quoteRequest.id).toBe(first.quoteRequest.id);
    expect(replay.quoteRequest.reference).toBe(first.quoteRequest.reference);

    const tampered = await quoteRequests.submit({
      ...submission(ownerId, projectId, key),
      note: "andere Notiz"
    });
    expect(tampered).toEqual({ kind: "idempotency-conflict" });

    const count = await context.database
      .withSchema("app")
      .selectFrom("quoteRequest")
      .select((expression) => expression.fn.countAll<number>().as("count"))
      .where("projectId", "=", projectId)
      .executeTakeFirstOrThrow();
    expect(Number(count.count)).toBe(1);
  });

  it("reuses the revision for an unchanged configuration and reports version drift", async () => {
    const { ownerId, projectId } = await seedProject();
    const quoteRequests = moduleWith();

    const first = await quoteRequests.submit(submission(ownerId, projectId));
    const second = await quoteRequests.submit(submission(ownerId, projectId));
    if (first.kind !== "submitted" || second.kind !== "submitted") {
      throw new Error("expected two submissions");
    }
    expect(second.quoteRequest.revisionId).toBe(first.quoteRequest.revisionId);
    expect(second.quoteRequest.id).not.toBe(first.quoteRequest.id);

    const stale = await quoteRequests.submit({
      ...submission(ownerId, projectId),
      expectedVersion: 7
    });
    expect(stale).toEqual({ kind: "conflict", currentVersion: 1 });
  });

  it("is owner-scoped and refuses projects that are not active", async () => {
    const { ownerId, projectId } = await seedProject();
    const stranger = await seedProject();
    const archived = await seedProject("archived");
    const quoteRequests = moduleWith();

    expect(
      await quoteRequests.submit(submission(stranger.ownerId, projectId))
    ).toEqual({ kind: "unavailable" });
    expect(
      await quoteRequests.submit(submission(archived.ownerId, archived.projectId))
    ).toEqual({ kind: "unavailable" });

    const own = await quoteRequests.submit(submission(ownerId, projectId));
    if (own.kind !== "submitted") throw new Error("expected submission");
    expect(
      await quoteRequests.get({ ownerId: stranger.ownerId, quoteRequestId: own.quoteRequest.id })
    ).toBeNull();
    expect(
      (await quoteRequests.get({ ownerId, quoteRequestId: own.quoteRequest.id }))?.reference
    ).toBe(own.quoteRequest.reference);
  });

  it("writes nothing when the configuration cannot be described", async () => {
    const { ownerId, projectId } = await seedProject();
    const quoteRequests = moduleWith(unsupported);

    expect(await quoteRequests.submit(submission(ownerId, projectId))).toEqual({
      kind: "unsupported-product-definition"
    });

    const db = context.database.withSchema("app");
    const revisions = await db
      .selectFrom("configurationRevision")
      .select("id")
      .where("projectId", "=", projectId)
      .execute();
    expect(revisions).toHaveLength(0);
  });

  it("lists newest first across the account with a cursor, and per project", async () => {
    const { ownerId, projectId } = await seedProject();
    const other = crypto.randomUUID();
    const db = context.database.withSchema("app");
    await db
      .insertInto("project")
      .values({
        id: other,
        ownerId,
        creationIdempotencyKey: `k-${other}`,
        name: "Zweite Küche",
        privateNotes: "",
        lifecycle: "active"
      })
      .execute();
    await db
      .insertInto("workingConfiguration")
      .values({
        projectId: other,
        normalizedConfiguration: { schemaVersion: 2 },
        configurationHash: "b".repeat(64),
        schemaVersion: 2,
        productDefinitionVersion: "rdtdot-signature-kitchen-v1@2"
      })
      .execute();

    let tick = 0;
    const quoteRequests = moduleWith(
      describing,
      () => new Date(Date.UTC(2026, 8, 2, 12, 0, tick++))
    );
    await quoteRequests.submit(submission(ownerId, projectId));
    await quoteRequests.submit(submission(ownerId, other));
    await quoteRequests.submit(submission(ownerId, projectId));

    const firstPage = await quoteRequests.listForAccount({ ownerId, limit: 2 });
    expect(firstPage.totalCount).toBe(3);
    expect(firstPage.items.map((item) => item.projectName)).toEqual([
      "Küche Vogel",
      "Zweite Küche"
    ]);
    expect(firstPage.nextCursor).not.toBeNull();

    const secondPage = await quoteRequests.listForAccount({
      ownerId,
      limit: 2,
      cursor: firstPage.nextCursor!
    });
    expect(secondPage.items).toHaveLength(1);
    expect(secondPage.nextCursor).toBeNull();

    const forProject = await quoteRequests.listForProject({ ownerId, projectId });
    expect(forProject.totalCount).toBe(2);
    expect(forProject.items.every((item) => item.projectId === projectId)).toBe(true);
  });

  it("caps submissions per account and day", async () => {
    const { ownerId, projectId } = await seedProject();
    const quoteRequests = moduleWith();

    for (let i = 0; i < 10; i += 1) {
      const result = await quoteRequests.submit(submission(ownerId, projectId));
      expect(result.kind).toBe("submitted");
    }
    expect(await quoteRequests.submit(submission(ownerId, projectId))).toEqual({
      kind: "quota-exceeded",
      retryAfterSeconds: 3600
    });
  }, 30_000);
});
