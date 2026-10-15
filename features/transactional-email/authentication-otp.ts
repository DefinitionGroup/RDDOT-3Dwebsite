import { z } from "zod";
import type {
  TransactionalEmailDelivery,
  TransactionalEmailMessage
} from "@/features/transactional-email/transactional-email";
import { DEFAULT_LOCALE, isLocale, LOCALE_HEADER, type Locale } from "@/lib/i18n";
import { getMessages, type Messages } from "@/lib/messages";

const emailSchema = z.email();
const otpSchema = z.string().regex(/^\d{6}$/);

type AuthenticationOtpType = keyof Messages["authenticationEmail"]["subjects"];

export function renderAuthenticationOtp(input: {
  recipient: string;
  otp: string;
  type: AuthenticationOtpType;
  locale?: Locale;
}): TransactionalEmailMessage {
  const recipient = emailSchema.parse(input.recipient);
  const otp = otpSchema.parse(input.otp);
  const locale = input.locale ?? DEFAULT_LOCALE;
  const t = getMessages(locale).authenticationEmail;
  const codeIs = t.codeIs(t.purposes[input.type]);

  return {
    recipient,
    template: {
      key: "authentication-otp",
      version: 1,
      locale
    },
    subject: t.subjects[input.type],
    text: [`${codeIs} ${otp}`, t.validity, t.ignore, "rotpunkt Signature"].join("\n\n"),
    html: [
      `<div lang="${locale}" style="font-family:Arial,sans-serif;line-height:1.5;color:#171717">`,
      `<p>${codeIs}</p>`,
      `<p style="font-size:32px;letter-spacing:0.18em;font-weight:700">${otp}</p>`,
      `<p>${t.validity}</p>`,
      `<p>${t.ignore}</p>`,
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

/**
 * The language the person asked for the code in: the sign-in form names its
 * page's locale in a header. Anything else falls back to German.
 */
function requestLocale(context?: { headers?: Headers | null; request?: Request | null }): Locale {
  const value = context?.headers?.get(LOCALE_HEADER) ?? context?.request?.headers.get(LOCALE_HEADER);
  return value && isLocale(value) ? value : DEFAULT_LOCALE;
}

export function createAuthenticationOtpSender(
  delivery: TransactionalEmailDelivery
) {
  return async (
    input: {
      email: string;
      otp: string;
      type: AuthenticationOtpType;
    },
    context?: { headers?: Headers | null; request?: Request | null }
  ) => {
    await delivery.send(
      renderAuthenticationOtp({
        recipient: input.email,
        otp: input.otp,
        type: input.type,
        locale: requestLocale(context)
      })
    );
  };
}
