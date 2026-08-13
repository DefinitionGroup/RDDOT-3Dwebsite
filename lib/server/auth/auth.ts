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

export const auth = createAuth({
  database: getAuthPool(),
  secret: requiredEnvironment("BETTER_AUTH_SECRET"),
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  sendAuthenticationOtp: createAuthenticationOtpSender(
    createTransactionalEmailDeliveryFromEnvironment()
  )
});
