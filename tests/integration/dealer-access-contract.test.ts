import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ownerActor, type ProjectActor } from "@/features/projects/project-module";
import { createPostgresDealerModule } from "@/lib/server/db/dealer-postgres";
import { createPostgresIdentityAdapter } from "@/lib/server/db/identity-postgres";
import { holdsProjectAccess } from "@/lib/server/db/project-access-postgres";
import { createPostgresProjectModule } from "@/lib/server/db/project-postgres";
import {
  type ConfigurationDescriber,
  createPostgresQuoteRequestModule
} from "@/lib/server/db/quote-requests-postgres";
import { createPostgresSharingModule } from "@/lib/server/db/sharing-postgres";
import {
  createDealer,
  createDealerUser,
  setDealerStatus,
  setDealerUserStatus
} from "@/tests/integration/dealer-fixtures";
import {
  startPostgresTestContext,
  type PostgresTestContext
} from "@/tests/integration/postgres-test-context";

const configuration = {
  schemaVersion: 1,
  productKey: "signature-line",
  layout: "straight-line",
  cabinetColorKey: "carbon",
  frontColorKey: "clay"
} as const;
const productDefinitionVersion = "signature-line@1";

const describing: ConfigurationDescriber = ({ now }) => ({
  displaySnapshot: { kind: "test" },
  priceIndication: { totalCents: 1010300, computedAt: now.toISOString() }
});

const CUSTOMER_CONTACT = { name: "Mara Vogel", email: "mara@example.com", phone: "030 1234567" };
const DEALER_CONTACT = {
  name: "Jonas Händler",
  email: "jonas@kuechen.example",
  phone: "030 7654321",
  customerType: "professional",
  company: "Küchen am Markt",
  professionalRole: "trade"
} as const;

function randomShareToken() {
  return `${crypto.randomUUID().replaceAll("-", "")}${crypto.randomUUID().replaceAll("-", "")}`.slice(0, 43);
}

function dealerActor(dealerUserId: string): ProjectActor {
  return { kind: "dealer", dealerUserId };
}

describe("Dealer access to customer Projects (ADR 0014)", { timeout: 30_000 }, () => {
  let context: PostgresTestContext;

  beforeAll(async () => {
    context = await startPostgresTestContext();
  }, 120_000);

  afterAll(async () => {
    await context?.stop();
  });

  const modules = () => ({
    projects: createPostgresProjectModule(context.database),
    sharing: createPostgresSharingModule(context.database),
    quotes: createPostgresQuoteRequestModule(context.database, { describeConfiguration: describing }),
    dealers: createPostgresDealerModule(context.database)
  });

  async function newCustomer() {
    return createPostgresIdentityAdapter(context.database).resolveCustomerAccount({
      provider: "better-auth",
      providerSubject: `dealer-access-${crypto.randomUUID()}`
    });
  }

  /** An owner with an active Project, and a Dealer with one user, not yet granted. */
  async function scenario() {
    const ownerId = await newCustomer();
    const workspace = await modules().projects.createProject({
      ownerId,
      idempotencyKey: `create-${crypto.randomUUID()}`,
      name: "Küche Vogel",
      configuration,
      productDefinitionVersion
    });
    const dealerId = await createDealer(context.database, { name: "Küchen am Markt" });
    const user = await createDealerUser(context.database, dealerId);
    return { ownerId, projectId: workspace.id, dealerId, dealerUserId: user.id };
  }

  async function grant(input: { ownerId: string; projectId: string; dealerId: string }) {
    const result = await modules().dealers.grantProject({
      ...input,
      idempotencyKey: `grant-${crypto.randomUUID()}`,
      customerContact: CUSTOMER_CONTACT
    });
    expect(result.kind).toBe("granted");
    return result;
  }

  async function openGrantCount(projectId: string) {
    const row = await context.database
      .withSchema("app")
      .selectFrom("projectDealerGrant")
      .select((expression) => expression.fn.countAll<number>().as("count"))
      .where("projectId", "=", projectId)
      .where("revokedAt", "is", null)
      .executeTakeFirstOrThrow();
    return Number(row.count);
  }

  /** Every operation a dealer may perform, refused for the given actor. */
  async function expectRefused(actor: ProjectActor, projectId: string) {
    const { projects, sharing, quotes } = modules();
    expect(await projects.getWorkspace({ actor, projectId })).toBeNull();
    expect(
      await projects.listConfigurationRevisions({ actor, projectId })
    ).toMatchObject({ items: [], totalCount: 0 });
    expect(
      await projects.saveWorkingConfiguration({
        actor,
        projectId,
        expectedVersion: 1,
        configuration: { ...configuration, frontColorKey: "sand" },
        productDefinitionVersion
      })
    ).toEqual({ kind: "unavailable" });
    expect(
      await projects.checkpointRevision({
        actor,
        projectId,
        expectedVersion: 1,
        trigger: "version-save",
        displaySnapshot: {},
        intent: { idempotencyKey: `v-${crypto.randomUUID()}`, topic: "project.version-saved", payload: {} }
      })
    ).toEqual({ kind: "unavailable" });
    expect(
      await projects.restoreRevision({
        actor,
        projectId,
        revisionId: crypto.randomUUID(),
        expectedVersion: 1,
        safetyDisplaySnapshot: {},
        supportedProductDefinitionVersions: [productDefinitionVersion]
      })
    ).toEqual({ kind: "unavailable" });
    expect(
      await sharing.createLink({
        actor,
        projectId,
        expectedVersion: 1,
        idempotencyKey: `share-${crypto.randomUUID()}`,
        token: randomShareToken(),
        displaySnapshot: {}
      })
    ).toEqual({ kind: "unavailable" });
    expect(await sharing.listLinks({ actor, projectId })).toEqual([]);
    expect(
      await quotes.submit({
        actor,
        projectId,
        expectedVersion: 1,
        idempotencyKey: `quote-${crypto.randomUUID()}`,
        contact: DEALER_CONTACT,
        note: "",
        consent: { version: "anfrage-datenschutz-2026-09" }
      })
    ).toEqual({ kind: "unavailable" });
    expect(await quotes.listForProject({ actor, projectId })).toMatchObject({ items: [], totalCount: 0 });
  }

  describe("grant", () => {
    it("opens the owner's Project to the Dealer, replays the key and copies the contact", async () => {
      const { ownerId, projectId, dealerId, dealerUserId } = await scenario();
      const { dealers } = modules();
      const idempotencyKey = `grant-${crypto.randomUUID()}`;
      const input = { ownerId, projectId, dealerId, idempotencyKey, customerContact: CUSTOMER_CONTACT };

      const granted = await dealers.grantProject(input);
      expect(granted).toMatchObject({
        kind: "granted",
        grant: { projectId, dealer: { id: dealerId, name: "Küchen am Markt" } }
      });
      expect(await dealers.grantProject(input)).toMatchObject({ kind: "replayed" });
      const otherDealer = await createDealer(context.database);
      expect(await dealers.grantProject({ ...input, dealerId: otherDealer })).toEqual({
        kind: "idempotency-conflict"
      });

      expect(await dealers.listGrantsForOwner({ ownerId })).toMatchObject([
        { projectId, dealer: { id: dealerId } }
      ]);
      expect(await dealers.listSharedProjects({ dealerUserId })).toMatchObject([
        {
          projectId,
          name: "Küche Vogel",
          lifecycle: "active",
          customer: CUSTOMER_CONTACT,
          workingConfiguration: { productDefinitionVersion }
        }
      ]);
    });

    it("refuses another customer's Project, an inactive Dealer and a Project that is not active", async () => {
      const { ownerId, projectId, dealerId } = await scenario();
      const { dealers, projects } = modules();
      const stranger = await newCustomer();
      const request = (overrides: Partial<{ ownerId: string; dealerId: string }>) =>
        dealers.grantProject({
          ownerId,
          projectId,
          dealerId,
          idempotencyKey: `grant-${crypto.randomUUID()}`,
          customerContact: CUSTOMER_CONTACT,
          ...overrides
        });

      expect(await request({ ownerId: stranger })).toEqual({ kind: "unavailable" });
      expect(await modules().dealers.revokeGrant({ ownerId: stranger, projectId })).toEqual({
        kind: "unavailable"
      });

      const closed = await createDealer(context.database, { status: "inactive" });
      expect(await request({ dealerId: closed })).toEqual({ kind: "dealer-unavailable" });
      expect(await request({ dealerId: crypto.randomUUID() })).toEqual({ kind: "dealer-unavailable" });

      await projects.changeProjectLifecycle({ ownerId, projectId, action: "archive" });
      expect(await request({})).toEqual({ kind: "unavailable" });
      expect(await openGrantCount(projectId)).toBe(0);
    });

    it("switches dealers in one step and refreshes the contact for the same Dealer", async () => {
      const { ownerId, projectId, dealerId, dealerUserId } = await scenario();
      const { dealers } = modules();
      const first = await grant({ ownerId, projectId, dealerId });

      const nextDealer = await createDealer(context.database, { name: "Küchenwerk Süd" });
      const nextUser = await createDealerUser(context.database, nextDealer);
      await grant({ ownerId, projectId, dealerId: nextDealer });

      expect(await openGrantCount(projectId)).toBe(1);
      expect(await dealers.listSharedProjects({ dealerUserId })).toEqual([]);
      expect(await dealers.listSharedProjects({ dealerUserId: nextUser.id })).toHaveLength(1);

      const refreshed = await dealers.grantProject({
        ownerId,
        projectId,
        dealerId: nextDealer,
        idempotencyKey: `grant-${crypto.randomUUID()}`,
        customerContact: { ...CUSTOMER_CONTACT, phone: "0170 5550000" }
      });
      expect(refreshed.kind === "granted" && refreshed.grant.id).not.toBe(
        first.kind === "granted" && first.grant.id
      );
      expect(await openGrantCount(projectId)).toBe(1);
      expect(
        (await dealers.listSharedProjects({ dealerUserId: nextUser.id }))[0].customer.phone
      ).toBe("0170 5550000");
    });
  });

  describe("dealer read and edit", () => {
    it("reads and edits the Working Configuration, saves and restores versions", async () => {
      const { ownerId, projectId, dealerId, dealerUserId } = await scenario();
      await grant({ ownerId, projectId, dealerId });
      const { projects } = modules();
      const actor = dealerActor(dealerUserId);

      expect(await projects.getWorkspace({ actor, projectId })).toMatchObject({
        id: projectId,
        workingConfiguration: { version: 1 }
      });

      const version = await projects.checkpointRevision({
        actor,
        projectId,
        expectedVersion: 1,
        trigger: "version-save",
        label: "Vom Händler",
        displaySnapshot: { cabinetFinish: "Carbon" },
        intent: { idempotencyKey: `v-${crypto.randomUUID()}`, topic: "project.version-saved", payload: {} }
      });
      expect(version.kind).toBe("checkpointed");
      if (version.kind !== "checkpointed") return;

      const saved = await projects.saveWorkingConfiguration({
        actor,
        projectId,
        expectedVersion: 1,
        configuration: { ...configuration, frontColorKey: "sand" },
        productDefinitionVersion
      });
      expect(saved).toMatchObject({ kind: "saved", version: 2 });
      expect(
        await projects.saveWorkingConfiguration({
          actor,
          projectId,
          expectedVersion: 1,
          configuration,
          productDefinitionVersion
        })
      ).toEqual({ kind: "conflict", currentVersion: 2 });

      // The owner sees the dealer's change; ownership has not moved.
      expect(
        (await projects.getWorkspace({ actor: ownerActor(ownerId), projectId }))?.workingConfiguration
          .configuration
      ).toMatchObject({ frontColorKey: "sand" });
      expect((await projects.listProjects({ ownerId })).map((project) => project.id)).toContain(projectId);

      expect(await projects.listConfigurationRevisions({ actor, projectId })).toMatchObject({
        items: [{ id: version.revisionId, label: "Vom Händler" }],
        totalCount: 1
      });
      expect(
        await projects.restoreRevision({
          actor,
          projectId,
          revisionId: version.revisionId,
          expectedVersion: 2,
          safetyDisplaySnapshot: {},
          supportedProductDefinitionVersions: [productDefinitionVersion]
        })
      ).toMatchObject({ kind: "restored", version: 3 });
    });

    it("keeps share links to the dealer's own and records who made them", async () => {
      const { ownerId, projectId, dealerId, dealerUserId } = await scenario();
      await grant({ ownerId, projectId, dealerId });
      const { sharing } = modules();
      const actor = dealerActor(dealerUserId);
      const link = (who: ProjectActor) =>
        sharing.createLink({
          actor: who,
          projectId,
          expectedVersion: 1,
          idempotencyKey: `share-${crypto.randomUUID()}`,
          token: randomShareToken(),
          displaySnapshot: {}
        });

      const owners = await link(ownerActor(ownerId));
      const dealers = await link(actor);
      expect(owners.kind).toBe("created");
      expect(dealers.kind).toBe("created");
      if (owners.kind !== "created" || dealers.kind !== "created") return;

      const colleague = await createDealerUser(context.database, dealerId);
      expect((await sharing.listLinks({ actor, projectId })).map((row) => row.id)).toEqual([
        dealers.link.id
      ]);
      expect(
        (await sharing.listLinks({ actor: dealerActor(colleague.id), projectId })).map((row) => row.id)
      ).toEqual([dealers.link.id]);
      expect(await sharing.listLinks({ actor: ownerActor(ownerId), projectId })).toHaveLength(2);

      expect(
        await sharing.revokeLink({ actor, projectId, linkId: owners.link.id })
      ).toEqual({ kind: "unavailable" });
      expect(
        await sharing.revokeLink({ actor, projectId, linkId: dealers.link.id })
      ).toMatchObject({ kind: "revoked" });

      const recorded = await context.database
        .withSchema("app")
        .selectFrom("sharedRevisionLink")
        .select(["id", "createdByDealerUserId"])
        .where("projectId", "=", projectId)
        .execute();
      expect(Object.fromEntries(recorded.map((row) => [row.id, row.createdByDealerUserId]))).toEqual({
        [owners.link.id]: null,
        [dealers.link.id]: dealerUserId
      });
    });

    it("submits Quote Requests with the dealer's contact against the dealer's own limit", async () => {
      const { ownerId, projectId, dealerId, dealerUserId } = await scenario();
      await grant({ ownerId, projectId, dealerId });
      const { quotes } = modules();
      const submit = (actor: ProjectActor) =>
        quotes.submit({
          actor,
          projectId,
          expectedVersion: 1,
          idempotencyKey: `quote-${crypto.randomUUID()}`,
          contact: actor.kind === "dealer" ? DEALER_CONTACT : CUSTOMER_CONTACT,
          note: "",
          consent: { version: "anfrage-datenschutz-2026-09" }
        });

      const dealers = await submit(dealerActor(dealerUserId));
      expect(dealers).toMatchObject({
        kind: "submitted",
        quoteRequest: { projectId, contact: { email: DEALER_CONTACT.email, company: "Küchen am Markt" } }
      });
      expect((await submit(ownerActor(ownerId))).kind).toBe("submitted");

      expect(await quotes.listForProject({ actor: dealerActor(dealerUserId), projectId })).toMatchObject({
        totalCount: 1,
        items: [{ contact: { email: DEALER_CONTACT.email } }]
      });
      expect(await quotes.listForProject({ actor: ownerActor(ownerId), projectId })).toMatchObject({
        totalCount: 2
      });
      expect(await quotes.listForAccount({ ownerId })).toMatchObject({ totalCount: 2 });

      const row = await context.database
        .withSchema("app")
        .selectFrom("quoteRequest")
        .select("submittedByDealerUserId")
        .where("id", "=", dealers.kind === "submitted" ? dealers.quoteRequest.id : "")
        .executeTakeFirstOrThrow();
      expect(row.submittedByDealerUserId).toBe(dealerUserId);

      // Nine more reach the dealer's ten a day; the owner's own count is apart.
      for (let index = 0; index < 9; index += 1) {
        expect((await submit(dealerActor(dealerUserId))).kind).toBe("submitted");
      }
      expect(await submit(dealerActor(dealerUserId))).toMatchObject({ kind: "quota-exceeded" });
      expect((await submit(ownerActor(ownerId))).kind).toBe("submitted");
    });
  });

  describe("revoke", () => {
    it("ends every dealer read and write, and revoking twice changes nothing", async () => {
      const { ownerId, projectId, dealerId, dealerUserId } = await scenario();
      const { dealers } = modules();
      await grant({ ownerId, projectId, dealerId });

      expect(await dealers.revokeGrant({ ownerId, projectId })).toMatchObject({ kind: "revoked" });
      expect(await dealers.revokeGrant({ ownerId, projectId })).toEqual({ kind: "unchanged" });
      expect(await dealers.listSharedProjects({ dealerUserId })).toEqual([]);
      expect(await dealers.listGrantsForOwner({ ownerId })).toEqual([]);
      await expectRefused(dealerActor(dealerUserId), projectId);
    });

    it("closes an archived Project to writes and revokes for good in Trash", async () => {
      const { ownerId, projectId, dealerId, dealerUserId } = await scenario();
      const { dealers, projects } = modules();
      const actor = dealerActor(dealerUserId);
      await grant({ ownerId, projectId, dealerId });

      await projects.changeProjectLifecycle({ ownerId, projectId, action: "archive" });
      expect(await dealers.listSharedProjects({ dealerUserId })).toMatchObject([
        { projectId, lifecycle: "archived" }
      ]);
      expect(
        await projects.saveWorkingConfiguration({
          actor,
          projectId,
          expectedVersion: 1,
          configuration,
          productDefinitionVersion
        })
      ).toEqual({ kind: "unavailable" });

      await projects.changeProjectLifecycle({ ownerId, projectId, action: "restore" });
      expect(
        await projects.saveWorkingConfiguration({
          actor,
          projectId,
          expectedVersion: 1,
          configuration: { ...configuration, frontColorKey: "sand" },
          productDefinitionVersion
        })
      ).toMatchObject({ kind: "saved" });

      await projects.changeProjectLifecycle({ ownerId, projectId, action: "trash" });
      expect(await openGrantCount(projectId)).toBe(0);
      await projects.changeProjectLifecycle({ ownerId, projectId, action: "restore" });
      expect(await openGrantCount(projectId)).toBe(0);
      expect(await dealers.listSharedProjects({ dealerUserId })).toEqual([]);
      expect(await projects.getWorkspace({ actor, projectId })).toBeNull();
    });

    it("waits for a dealer write in flight, then refuses the next one", async () => {
      const { ownerId, projectId, dealerId, dealerUserId } = await scenario();
      const { dealers, projects } = modules();
      const actor = dealerActor(dealerUserId);
      await grant({ ownerId, projectId, dealerId });

      let release!: () => void;
      let locked!: () => void;
      const releasing = new Promise<void>((resolve) => (release = resolve));
      const lockTaken = new Promise<void>((resolve) => (locked = resolve));
      const inFlight = context.database.transaction().execute(async (transaction) => {
        expect(await holdsProjectAccess(transaction, actor, projectId)).toBe(true);
        locked();
        await releasing;
      });
      await lockTaken;

      let settled = false;
      const revoking = dealers.revokeGrant({ ownerId, projectId }).then((result) => {
        settled = true;
        return result;
      });
      await new Promise((resolve) => setTimeout(resolve, 300));
      expect(settled).toBe(false);

      release();
      await inFlight;
      expect(await revoking).toMatchObject({ kind: "revoked" });
      expect(
        await projects.saveWorkingConfiguration({
          actor,
          projectId,
          expectedVersion: 1,
          configuration,
          productDefinitionVersion
        })
      ).toEqual({ kind: "unavailable" });
    });
  });

  describe("strangers", () => {
    it("refuses another Dealer, another customer, a disabled user and an inactive Dealer", async () => {
      const { ownerId, projectId, dealerId, dealerUserId } = await scenario();
      await grant({ ownerId, projectId, dealerId });

      const otherDealer = await createDealer(context.database);
      const otherUser = await createDealerUser(context.database, otherDealer);
      await expectRefused(dealerActor(otherUser.id), projectId);
      await expectRefused(ownerActor(await newCustomer()), projectId);
      await expectRefused(dealerActor(crypto.randomUUID()), projectId);

      const disabled = await createDealerUser(context.database, dealerId);
      await setDealerUserStatus(context.database, disabled.id, "disabled");
      await expectRefused(dealerActor(disabled.id), projectId);

      await setDealerStatus(context.database, dealerId, "inactive");
      await expectRefused(dealerActor(dealerUserId), projectId);
      expect(await modules().dealers.listSharedProjects({ dealerUserId })).toEqual([]);

      // The grant itself survives a pause of the Dealer; reopening restores access.
      await setDealerStatus(context.database, dealerId, "active");
      expect(await modules().projects.getWorkspace({ actor: dealerActor(dealerUserId), projectId })).not.toBeNull();
    });
  });
});
