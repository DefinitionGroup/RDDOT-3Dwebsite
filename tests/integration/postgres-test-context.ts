import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { promisify } from "node:util";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { CamelCasePlugin, Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import type { Database } from "@/lib/server/db/database-types";

const execFileAsync = promisify(execFile);

export type PostgresTestContext = {
  database: Kysely<Database>;
  connectionString: string;
  stop(): Promise<void>;
};

export async function startPostgresTestContext(): Promise<PostgresTestContext> {
  if (!process.env.TEST_DATABASE_URL && existsSync(".env.local")) {
    process.loadEnvFile(".env.local");
  }

  let container: StartedPostgreSqlContainer | undefined;
  let connectionString = process.env.TEST_DATABASE_URL;

  if (!connectionString) {
    container = await new PostgreSqlContainer("postgres:17.6-alpine").start();
    connectionString = container.getConnectionUri();
  }

  await execFileAsync("node_modules/.bin/dbmate", [
    "--url",
    connectionString,
    "--migrations-dir",
    "db/migrations",
    "--schema-file",
    "db/schema.sql",
    "up"
  ]);

  const pool = new Pool({ connectionString, max: 6 });
  const database = new Kysely<Database>({
    dialect: new PostgresDialect({ pool }),
    plugins: [new CamelCasePlugin()]
  });

  return {
    database,
    connectionString,
    async stop() {
      await database.destroy();
      await container?.stop();
    }
  };
}
