import { createHash } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createPostgresSignInCodeLimit } from "@/lib/server/db/sign-in-code-limit-postgres";
import {
  startPostgresTestContext,
  type PostgresTestContext
} from "@/tests/integration/postgres-test-context";

const emailKey = (email: string) => createHash("sha256").update(email).digest("hex");

describe("sign-in code limit per email address", { timeout: 30_000 }, () => {
  let context: PostgresTestContext;
  const used: string[] = [];

  beforeAll(async () => {
    context = await startPostgresTestContext();
  }, 120_000);

  afterEach(async () => {
    await context.database
      .withSchema("app")
      .deleteFrom("signInCodeLimit")
      .where("emailKey", "in", used.splice(0).map(emailKey))
      .execute();
  });

  afterAll(async () => {
    await context?.stop();
  });

  function address() {
    const email = `code-limit-${crypto.randomUUID()}@example.invalid`;
    used.push(email);
    return email;
  }

  function limitAt(time: { now: Date }) {
    return createPostgresSignInCodeLimit(context.database, () => time.now);
  }

  it("sends three codes per address in ten minutes, then says when the next may go", async () => {
    const time = { now: new Date("2026-10-28T10:00:00Z") };
    const limit = limitAt(time);
    const email = address();

    for (let request = 0; request < 3; request += 1) {
      expect(await limit.consume(email)).toEqual({ allowed: true });
      time.now = new Date(time.now.getTime() + 60_000);
    }
    // Three minutes in: the window reopens seven minutes later.
    expect(await limit.consume(email)).toEqual({ allowed: false, retryAfterSeconds: 420 });
  });

  it("counts an address however it is written", async () => {
    const limit = limitAt({ now: new Date() });
    const email = address();
    const shouted = `  ${email.toUpperCase()} `;

    await limit.consume(email);
    await limit.consume(shouted);
    await limit.consume(email);
    expect((await limit.consume(shouted)).allowed).toBe(false);
  });

  it("keeps addresses apart", async () => {
    const limit = limitAt({ now: new Date() });
    const first = address();
    for (let request = 0; request < 4; request += 1) await limit.consume(first);

    expect(await limit.consume(address())).toEqual({ allowed: true });
  });

  it("opens a new window once ten minutes have passed and forgets the old ones", async () => {
    const time = { now: new Date("2026-10-28T11:00:00Z") };
    const limit = limitAt(time);
    const email = address();
    const other = address();
    for (let request = 0; request < 4; request += 1) await limit.consume(email);
    await limit.consume(other);

    time.now = new Date(time.now.getTime() + 600_000);
    expect(await limit.consume(email)).toEqual({ allowed: true });

    const rows = await context.database
      .withSchema("app")
      .selectFrom("signInCodeLimit")
      .select(["emailKey", "requests"])
      .where("emailKey", "in", [emailKey(email), emailKey(other)])
      .execute();
    expect(rows).toEqual([{ emailKey: emailKey(email), requests: 1 }]);
  });

  it("lets exactly three of six simultaneous requests through", async () => {
    const limit = limitAt({ now: new Date() });
    const email = address();

    const verdicts = await Promise.all(Array.from({ length: 6 }, () => limit.consume(email)));
    expect(verdicts.filter((verdict) => verdict.allowed)).toHaveLength(3);
  });

  it("stores a hash of the address, never the address", async () => {
    const limit = limitAt({ now: new Date() });
    const email = address();
    await limit.consume(email);

    const row = await context.database
      .withSchema("app")
      .selectFrom("signInCodeLimit")
      .select("emailKey")
      .where("emailKey", "=", emailKey(email))
      .executeTakeFirstOrThrow();
    expect(row.emailKey).toMatch(/^[0-9a-f]{64}$/);
    expect(row.emailKey).not.toContain("example");
  });
});
