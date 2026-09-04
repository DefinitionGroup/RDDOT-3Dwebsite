import "server-only";

import { Pool } from "pg";
import { createAuthenticationOtpSender } from "@/features/transactional-email/authentication-otp";
import { createAuth } from "@/lib/server/auth/create-auth";
import { createTransactionalEmailDeliveryFromEnvironment } from "@/lib/server/transactional-email/delivery";

declare global {
  var __rddotAuthPool: Pool | undefined;
}

function requiredEnvironment(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required for authentication`);
  return value;
}

function getAuthPool() {
  globalThis.__rddotAuthPool ??= new Pool({
    connectionString: requiredEnvironment("DATABASE_URL_AUTH"),
    max: 3,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000
  });

  return globalThis.__rddotAuthPool;
}

// Vercel exposes the deployment's own hostnames. A preview deployment has no
// stable BETTER_AUTH_URL of its own, so without an explicit value the base URL
// follows the deployment: the production domain in production, the branch
// alias (or the unique deployment URL) in previews. Locally it stays localhost.
function vercelHosts() {
  return [
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_BRANCH_URL,
    process.env.VERCEL_URL
  ].filter((host): host is string => Boolean(host));
}

function resolveBaseUrl() {
  const configured = process.env.BETTER_AUTH_URL?.trim();
  if (configured) return configured;

  const preferredHost =
    process.env.VERCEL_ENV === "production"
      ? process.env.VERCEL_PROJECT_PRODUCTION_URL
      : (process.env.VERCEL_BRANCH_URL ?? process.env.VERCEL_URL);
  if (preferredHost) return `https://${preferredHost}`;

  return "http://localhost:3000";
}

// Every hostname Vercel serves this deployment on is a legitimate origin for
// its own auth requests: the unique deployment URL, the branch alias, and the
// production domain.
function vercelOrigins() {
  return vercelHosts().map((host) => `https://${host}`);
}

// Next.js falls back to 3001+ when the configured port is taken, which makes
// the browser origin drift away from BETTER_AUTH_URL and trips better-auth's
// origin check with a 403. In development, echo back any loopback origin so a
// shifted port still signs in. Never active in production.
function developmentLoopbackOrigins(request?: Request) {
  if (process.env.NODE_ENV === "production") return [];

  const origin = request?.headers.get("origin");
  if (!origin) return [];

  try {
    const { hostname, protocol } = new URL(origin);
    const isLoopback =
      hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
    return isLoopback && protocol === "http:" ? [origin] : [];
  } catch {
    return [];
  }
}

export const auth = createAuth({
  database: getAuthPool(),
  secret: requiredEnvironment("BETTER_AUTH_SECRET"),
  baseURL: resolveBaseUrl(),
  trustedOrigins: (request) => [
    ...vercelOrigins(),
    ...developmentLoopbackOrigins(request)
  ],
  sendAuthenticationOtp: createAuthenticationOtpSender(
    createTransactionalEmailDeliveryFromEnvironment()
  )
});
