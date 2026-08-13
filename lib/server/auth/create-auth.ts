import { betterAuth } from "better-auth";
import { emailOTP } from "better-auth/plugins";
import type { Pool } from "pg";

export type SendAuthenticationOtp = (input: {
  email: string;
  otp: string;
  type:
    | "sign-in"
    | "email-verification"
    | "forget-password"
    | "change-email";
}) => Promise<void>;

export function createAuth(input: {
  database: Pool;
  secret: string;
  baseURL: string;
  sendAuthenticationOtp: SendAuthenticationOtp;
}) {
  return betterAuth({
    appName: "rotpunkt Signature",
    baseURL: input.baseURL,
    secret: input.secret,
    database: input.database,
    session: {
      cookieCache: {
        enabled: false
      }
    },
    rateLimit: {
      enabled: true,
      storage: "database",
      window: 60,
      max: 60,
      customRules: {
        "/email-otp/send-verification-otp": {
          window: 600,
          max: 3
        },
        "/sign-in/email-otp": {
          window: 300,
          max: 5
        }
      }
    },
    plugins: [
      emailOTP({
        expiresIn: 300,
        allowedAttempts: 3,
        resendStrategy: "rotate",
        storeOTP: "hashed",
        sendVerificationOTP: input.sendAuthenticationOtp
      })
    ]
  });
}
