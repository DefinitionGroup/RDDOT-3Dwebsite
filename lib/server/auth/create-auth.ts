import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { emailOTP } from "better-auth/plugins";
import type { Pool } from "pg";
import type { SignInCodeLimit } from "@/features/customer-accounts/sign-in-code-limit";

const SEND_CODE_PATH = "/email-otp/send-verification-otp";

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
  /** Caps the codes each email address is sent, wherever they are requested from. */
  signInCodeLimit?: SignInCodeLimit;
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
    // Per client address. A showroom's tablets, an office or a mobile network
    // can share one, so these leave room for several people at once; the
    // per-address code limit below protects each inbox.
    rateLimit: {
      enabled: input.rateLimitEnabled ?? true,
      storage: "database",
      window: 60,
      max: 60,
      customRules: {
        [SEND_CODE_PATH]: {
          window: 600,
          max: 20
        },
        "/sign-in/email-otp": {
          window: 300,
          max: 20
        }
      }
    },
    hooks: {
      before: createAuthMiddleware(async (context) => {
        if (context.path !== SEND_CODE_PATH || !input.signInCodeLimit) return;
        const email: unknown = context.body?.email;
        // The endpoint itself refuses a missing or malformed address.
        if (typeof email !== "string" || email.trim() === "") return;
        const verdict = await input.signInCodeLimit.consume(email);
        if (!verdict.allowed) {
          throw new APIError(
            "TOO_MANY_REQUESTS",
            { code: "SIGN_IN_CODE_LIMIT", message: "Too many sign-in codes for this address." },
            { "X-Retry-After": String(verdict.retryAfterSeconds) }
          );
        }
      })
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
