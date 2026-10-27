import "server-only";

import { CamelCasePlugin, Kysely, PostgresDialect } from "kysely";
import type { Database } from "@/lib/server/db/database-types";
import { createPostgresPool } from "@/lib/server/db/postgres-pool";

declare global {
  var __rddotDatabase: Kysely<Database> | undefined;
}

function createDatabase() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is required for server-side persistence");
  }

  return new Kysely<Database>({
    dialect: new PostgresDialect({
      pool: createPostgresPool({ connectionString, max: 5 })
    }),
    plugins: [new CamelCasePlugin()]
  });
}

export function getDatabase() {
  globalThis.__rddotDatabase ??= createDatabase();
  return globalThis.__rddotDatabase;
}
