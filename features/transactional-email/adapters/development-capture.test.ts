import { describe, expect, it } from "vitest";
import {
  createDevelopmentCaptureEmailDelivery,
  createInMemoryDevelopmentEmailCaptureStore,
  extractOneTimeCode,
  isDevelopmentEmailCaptureActive,
  isDevelopmentEmailCaptureAllowed,
  MAXIMUM_CAPTURES_PER_RECIPIENT
} from "@/features/transactional-email/adapters/development-capture";
import { renderAuthenticationOtp } from "@/features/transactional-email/authentication-otp";

function otp(recipient: string, code: string) {
  return renderAuthenticationOtp({ recipient, otp: code, type: "sign-in" });
}

describe("development email capture", () => {
  it("captures the latest rendered message for a recipient", async () => {
    const store = createInMemoryDevelopmentEmailCaptureStore();
    const delivery = createDevelopmentCaptureEmailDelivery(store, {
      NODE_ENV: "development"
    } as NodeJS.ProcessEnv);

    await delivery.send(otp("Kunde@example.com", "123456"));
    await delivery.send(otp("kunde@example.com", "654321"));

    const capture = await store.findLatest(" KUNDE@example.com ");
    expect(capture && extractOneTimeCode(capture)).toBe("654321");
    expect(capture?.message.template).toEqual({
      key: "authentication-otp",
      version: 1,
      locale: "de"
    });
  });

  it("forgets captures after ten minutes", async () => {
    let now = Date.parse("2026-09-04T10:00:00Z");
    const store = createInMemoryDevelopmentEmailCaptureStore(() => now);

    await store.save({ message: otp("a@example.com", "111111"), capturedAt: new Date(now) });
    now += 10 * 60 * 1000 + 1;

    expect(await store.findLatest("a@example.com")).toBeNull();
  });

  it("keeps at most twenty captures per recipient", async () => {
    const store = createInMemoryDevelopmentEmailCaptureStore();
    for (let index = 0; index < MAXIMUM_CAPTURES_PER_RECIPIENT + 5; index += 1) {
      await store.save({
        message: otp("a@example.com", String(100000 + index)),
        capturedAt: new Date()
      });
    }
    await store.save({ message: otp("b@example.com", "222222"), capturedAt: new Date() });

    const latest = await store.findLatest("a@example.com");
    expect(latest && extractOneTimeCode(latest)).toBe(
      String(100000 + MAXIMUM_CAPTURES_PER_RECIPIENT + 4)
    );
    const other = await store.findLatest("b@example.com");
    expect(other && extractOneTimeCode(other)).toBe("222222");
  });

  it("refuses production builds unless the deployment opts in explicitly", () => {
    const store = createInMemoryDevelopmentEmailCaptureStore();
    const production = { NODE_ENV: "production" } as NodeJS.ProcessEnv;

    expect(() => createDevelopmentCaptureEmailDelivery(store, production)).toThrow(
      /cannot run in production/
    );
    expect(isDevelopmentEmailCaptureAllowed(production)).toBe(false);

    const optedIn = {
      NODE_ENV: "production",
      ALLOW_DEVELOPMENT_EMAIL_CAPTURE_IN_PRODUCTION: "true"
    } as NodeJS.ProcessEnv;
    expect(() => createDevelopmentCaptureEmailDelivery(store, optedIn)).not.toThrow();
    expect(isDevelopmentEmailCaptureAllowed(optedIn)).toBe(true);

    const halfHearted = {
      NODE_ENV: "production",
      ALLOW_DEVELOPMENT_EMAIL_CAPTURE_IN_PRODUCTION: "yes"
    } as NodeJS.ProcessEnv;
    expect(isDevelopmentEmailCaptureAllowed(halfHearted)).toBe(false);
  });

  it("is active only with the capture provider and permission together", () => {
    expect(
      isDevelopmentEmailCaptureActive({
        NODE_ENV: "development",
        TRANSACTIONAL_EMAIL_PROVIDER: "development-capture"
      } as NodeJS.ProcessEnv)
    ).toBe(true);
    expect(
      isDevelopmentEmailCaptureActive({
        NODE_ENV: "production",
        TRANSACTIONAL_EMAIL_PROVIDER: "development-capture"
      } as NodeJS.ProcessEnv)
    ).toBe(false);
    expect(
      isDevelopmentEmailCaptureActive({
        NODE_ENV: "production",
        TRANSACTIONAL_EMAIL_PROVIDER: "development-capture",
        ALLOW_DEVELOPMENT_EMAIL_CAPTURE_IN_PRODUCTION: "true"
      } as NodeJS.ProcessEnv)
    ).toBe(true);
    expect(
      isDevelopmentEmailCaptureActive({
        NODE_ENV: "development",
        ALLOW_DEVELOPMENT_EMAIL_CAPTURE_IN_PRODUCTION: "true"
      } as NodeJS.ProcessEnv)
    ).toBe(false);
  });
});
