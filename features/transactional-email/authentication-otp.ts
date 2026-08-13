import { z } from "zod";
import type {
  TransactionalEmailDelivery,
  TransactionalEmailMessage
} from "@/features/transactional-email/transactional-email";

const emailSchema = z.email();
const otpSchema = z.string().regex(/^\d{6}$/);

const copy = {
  "sign-in": {
    subject: "Ihr Anmeldecode für rotpunkt Signature",
    purpose: "Anmeldung"
  },
  "email-verification": {
    subject: "Bestätigen Sie Ihre E-Mail-Adresse",
    purpose: "Bestätigung Ihrer E-Mail-Adresse"
  },
  "forget-password": {
    subject: "Ihr Sicherheitscode für rotpunkt Signature",
    purpose: "Wiederherstellung Ihres Zugangs"
  },
  "change-email": {
    subject: "Bestätigen Sie die Änderung Ihrer E-Mail-Adresse",
    purpose: "Änderung Ihrer E-Mail-Adresse"
  }
} as const;

type AuthenticationOtpType = keyof typeof copy;

export function renderAuthenticationOtp(input: {
  recipient: string;
  otp: string;
  type: AuthenticationOtpType;
}): TransactionalEmailMessage {
  const recipient = emailSchema.parse(input.recipient);
  const otp = otpSchema.parse(input.otp);
  const content = copy[input.type];

  return {
    recipient,
    template: {
      key: "authentication-otp",
      version: 1,
      locale: "de"
    },
    subject: content.subject,
    text: [
      `Ihr Code für die ${content.purpose} lautet: ${otp}`,
      "Der Code ist fünf Minuten gültig und kann einmal verwendet werden.",
      "Wenn Sie diesen Code nicht angefordert haben, können Sie diese Nachricht ignorieren.",
      "rotpunkt Signature"
    ].join("\n\n"),
    html: [
      '<div lang="de" style="font-family:Arial,sans-serif;line-height:1.5;color:#171717">',
      `<p>Ihr Code für die ${content.purpose} lautet:</p>`,
      `<p style="font-size:32px;letter-spacing:0.18em;font-weight:700">${otp}</p>`,
      "<p>Der Code ist fünf Minuten gültig und kann einmal verwendet werden.</p>",
      "<p>Wenn Sie diesen Code nicht angefordert haben, können Sie diese Nachricht ignorieren.</p>",
      "<p>rotpunkt Signature</p>",
      "</div>"
    ].join(""),
    tags: {
      category: "authentication",
      template: "authentication-otp@1",
      purpose: input.type
    }
  };
}

export function createAuthenticationOtpSender(
  delivery: TransactionalEmailDelivery
) {
  return async (input: {
    email: string;
    otp: string;
    type: AuthenticationOtpType;
  }) => {
    await delivery.send(
      renderAuthenticationOtp({
        recipient: input.email,
        otp: input.otp,
        type: input.type
      })
    );
  };
}
