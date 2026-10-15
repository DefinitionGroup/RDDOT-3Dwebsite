import { describe, expect, it, vi } from "vitest";
import {
  createAuthenticationOtpSender,
  renderAuthenticationOtp
} from "@/features/transactional-email/authentication-otp";

describe("German authentication OTP email", () => {
  it("renders a versioned transactional message without marketing content", () => {
    const message = renderAuthenticationOtp({
      recipient: "kunde@example.com",
      otp: "123456",
      type: "sign-in"
    });

    expect(message.template).toEqual({
      key: "authentication-otp",
      version: 1,
      locale: "de"
    });
    expect(message.subject).toContain("Anmeldecode");
    expect(message.text).toContain("123456");
    expect(message.html).toContain("123456");
    expect(message.text).not.toMatch(/Newsletter|Angebot|Rabatt/i);
  });

  it("sends only through the delivery interface", async () => {
    const send = vi.fn().mockResolvedValue({ providerMessageId: "message-1" });
    const sender = createAuthenticationOtpSender({ send });

    await sender({
      email: "kunde@example.com",
      otp: "654321",
      type: "email-verification"
    });

    expect(send).toHaveBeenCalledOnce();
    expect(send.mock.calls[0][0].tags).toEqual({
      category: "authentication",
      template: "authentication-otp@1",
      purpose: "email-verification"
    });
  });

  it("writes in the language the code was asked for in", async () => {
    const send = vi.fn().mockResolvedValue({ providerMessageId: "message-2" });
    const sender = createAuthenticationOtpSender({ send });

    await sender(
      { email: "customer@example.com", otp: "112233", type: "sign-in" },
      { headers: new Headers({ "x-site-locale": "en" }) }
    );
    const english = send.mock.calls[0][0];
    expect(english.template.locale).toBe("en");
    expect(english.subject).toBe("Your sign-in code for rotpunkt Signature");
    expect(english.text).toContain("Your code for signing in is: 112233");
    expect(english.html).toContain('lang="en"');

    await sender(
      { email: "cliente@example.com", otp: "445566", type: "sign-in" },
      { headers: new Headers({ "x-site-locale": "fr" }) }
    );
    expect(send.mock.calls[1][0].template.locale).toBe("de");
  });

  it("rejects malformed recipients and codes before delivery", () => {
    expect(() =>
      renderAuthenticationOtp({
        recipient: "not-an-email",
        otp: "123456",
        type: "sign-in"
      })
    ).toThrow();
    expect(() =>
      renderAuthenticationOtp({
        recipient: "kunde@example.com",
        otp: "12345",
        type: "sign-in"
      })
    ).toThrow();
  });
});
