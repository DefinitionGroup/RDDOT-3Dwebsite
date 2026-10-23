import { betterAuth } from "better-auth";
import { emailOTP } from "better-auth/plugins";
import type { Pool } from "pg";

export type SendAuthenticationOtp = (
  input: {
    email: string;
    otp: string;
    type:
      | "sign-in"
      | "email-verification"
      | "forget-password"
      | "change-email";
  },
  /** The endpoint's request context; its headers carry the page's locale. */
  context?: { headers?: Headers | null; request?: Request | null }
) => Promise<void>;

export function createAuth(input: {
  database: Pool;
  secret: string;
  baseURL: string;
  sendAuthenticationOtp: SendAuthenticationOtp;
  rateLimitEnabled?: boolean;
  trustedOrigins?: (request?: Request) => string[] | Promise<string[]>;
  /**
   * Runs before Better Auth deletes a user: deletes the application's account,
   * or throws an APIError to refuse. Without it, users cannot delete themselves.
   */
  beforeDeleteUser?: (userId: string) => Promise<void>;
  /** How recent a sign-in must be for sensitive actions such as deleting the account. */
  freshAgeSeconds?: number;
}) {
  return betterAuth({
    appName: "rotpunkt Signature",
    baseURL: input.baseURL,
    secret: input.secret,
    trustedOrigins: input.trustedOrigins,
    database: input.database,
    session: {
      cookieCache: {
        enabled: false
      },
      ...(input.freshAgeSeconds ? { freshAge: input.freshAgeSeconds } : {})
    },
    user: {
      deleteUser: {
        enabled: Boolean(input.beforeDeleteUser),
        beforeDelete: async (user) => {
          await input.beforeDeleteUser?.(user.id);
        }
      }
    },
    rateLimit: {
      enabled: input.rateLimitEnabled ?? true,
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
