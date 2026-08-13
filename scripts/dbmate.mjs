import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { delimiter } from "node:path";

if (!process.env.DATABASE_URL_DIRECT && existsSync(".env.local")) {
  process.loadEnvFile(".env.local");
}

const allowedCommands = new Set(["up", "rollback", "dump"]);
const command = process.argv[2];

if (!command || !allowedCommands.has(command)) {
  throw new Error("Expected one of: up, rollback, dump");
}

const directConnectionString = process.env.DATABASE_URL_DIRECT;

if (!directConnectionString) {
  throw new Error("DATABASE_URL_DIRECT is required for database operations");
}

const directConnectionUrl = new URL(directConnectionString);

if (directConnectionUrl.hostname.includes("-pooler")) {
  throw new Error(
    "DATABASE_URL_DIRECT must use Neon's direct endpoint, not its -pooler endpoint"
  );
}

const homebrewLibpqBin = "/opt/homebrew/opt/libpq/bin";
const executablePath = existsSync(homebrewLibpqBin)
  ? `${homebrewLibpqBin}${delimiter}${process.env.PATH ?? ""}`
  : process.env.PATH;

const child = spawn(
  "node_modules/.bin/dbmate",
  [
    "--migrations-dir",
    "db/migrations",
    "--schema-file",
    "db/schema.sql",
    command
  ],
  {
    cwd: process.cwd(),
    env: {
      ...process.env,
      DATABASE_URL: directConnectionString,
      PATH: executablePath
    },
    stdio: "inherit"
  }
);

child.on("error", (error) => {
  throw error;
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exitCode = code ?? 1;
});
