import { Pool } from "pg";
import { createAuth } from "@/lib/server/auth/create-auth";

function withAuthSchema(connectionString: string) {
  const url = new URL(connectionString);
  url.searchParams.set("options", "-c search_path=auth");
  return url.toString();
}

const connectionString = withAuthSchema(
  process.env.DATABASE_URL_AUTH ??
    "postgres://postgres:postgres@127.0.0.1:5432/rddot"
);

export const auth = createAuth({
  database: new Pool({ connectionString, max: 1 }),
  secret:
    process.env.BETTER_AUTH_SECRET ??
    "development-schema-generation-secret-change-me",
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  async sendAuthenticationOtp() {
    throw new Error(
      "The schema-only auth configuration cannot deliver authentication email"
    );
  }
});
