import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  extractOneTimeCode,
  MAXIMUM_CAPTURES_PER_RECIPIENT
} from "@/features/transactional-email/adapters/development-capture";
import { renderAuthenticationOtp } from "@/features/transactional-email/authentication-otp";
import { createPostgresDevelopmentEmailCaptureStore } from "@/lib/server/db/development-email-capture-postgres";
import {
  startPostgresTestContext,
  type PostgresTestContext
} from "@/tests/integration/postgres-test-context";

function otp(recipient: string, code: string) {
  return renderAuthenticationOtp({ recipient, otp: code, type: "sign-in" });
}

describe("development email capture store", () => {
  let context: PostgresTestContext;

  beforeAll(async () => {
    context = await startPostgresTestContext();
  }, 120_000);

  afterAll(async () => {
    await context?.stop();
  });

  beforeEach(async () => {
    await createPostgresDevelopmentEmailCaptureStore(context.database).clear();
  });

  it("returns the newest capture for a recipient regardless of case", async () => {
    const store = createPostgresDevelopmentEmailCaptureStore(context.database);

    await store.save({ message: otp("Kunde@example.com", "111111"), capturedAt: new Date() });
    await store.save({
      message: otp("kunde@example.com", "222222"),
      capturedAt: new Date(Date.now() + 1000)
    });

    const capture = await store.findLatest(" KUNDE@example.com ");
    expect(capture && extractOneTimeCode(capture)).toBe("222222");
    expect(capture?.message.subject).toBe(otp("kunde@example.com", "222222").subject);
    expect(await store.findLatest("nobody@example.com")).toBeNull();
  });

  it("expires captures after ten minutes and caps rows per recipient", async () => {
    let now = new Date("2026-09-04T10:00:00Z");
    const store = createPostgresDevelopmentEmailCaptureStore(
      context.database,
      () => now
    );

    await store.save({ message: otp("old@example.com", "333333"), capturedAt: now });
    now = new Date(now.getTime() + 11 * 60 * 1000);
    expect(await store.findLatest("old@example.com")).toBeNull();

    for (let index = 0; index < MAXIMUM_CAPTURES_PER_RECIPIENT + 5; index += 1) {
      await store.save({
        message: otp("many@example.com", String(100000 + index)),
        capturedAt: new Date(now.getTime() + index)
      });
    }

    const rows = await context.database
      .withSchema("app")
      .selectFrom("developmentEmailCapture")
      .select(({ fn }) => fn.countAll<number>().as("count"))
      .executeTakeFirstOrThrow();
    expect(Number(rows.count)).toBe(MAXIMUM_CAPTURES_PER_RECIPIENT);

    const latest = await store.findLatest("many@example.com");
    expect(latest && extractOneTimeCode(latest)).toBe(
      String(100000 + MAXIMUM_CAPTURES_PER_RECIPIENT + 4)
    );
  });
});
