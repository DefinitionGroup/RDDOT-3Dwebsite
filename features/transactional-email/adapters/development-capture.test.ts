import { beforeEach, describe, expect, it } from "vitest";
import {
  clearDevelopmentEmailCaptures,
  createDevelopmentCaptureEmailDelivery,
  findLatestDevelopmentEmailCapture
} from "@/features/transactional-email/adapters/development-capture";
import { renderAuthenticationOtp } from "@/features/transactional-email/authentication-otp";

describe("development email capture", () => {
  beforeEach(() => clearDevelopmentEmailCaptures());

  it("captures the latest rendered message for a recipient", async () => {
    const delivery = createDevelopmentCaptureEmailDelivery();

    await delivery.send(
      renderAuthenticationOtp({
        recipient: "Kunde@example.com",
        otp: "123456",
        type: "sign-in"
      })
    );

    const capture = findLatestDevelopmentEmailCapture("kunde@example.com");
    expect(capture?.message.text).toContain("123456");
    expect(capture?.message.template).toEqual({
      key: "authentication-otp",
      version: 1,
      locale: "de"
    });
  });
});
