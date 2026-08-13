import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { Client } from "pg";

if (existsSync(".env.local")) {
  process.loadEnvFile(".env.local");
}

const directConnectionString = process.env.DATABASE_URL_DIRECT;
const pooledOwnerConnectionString = process.env.DATABASE_URL;

if (!directConnectionString || !pooledOwnerConnectionString) {
  throw new Error("DATABASE_URL_DIRECT and DATABASE_URL are required");
}

const directUrl = new URL(directConnectionString);
const pooledOwnerUrl = new URL(pooledOwnerConnectionString);
const authRoleName = "better_auth_runtime";

if (directUrl.hostname.includes("-pooler")) {
  throw new Error("DATABASE_URL_DIRECT must use Neon's direct endpoint");
}

if (!pooledOwnerUrl.hostname.includes("-pooler")) {
  throw new Error("DATABASE_URL must provide Neon's pooled endpoint template");
}

function generatePassword() {
  return randomBytes(36).toString("base64url");
}

async function roleCommand(
  client,
  roleName,
  password,
  exists
) {
  const verb = exists ? "ALTER" : "CREATE";
  const { rows } = await client.query(
    `SELECT format('${verb} ROLE %I ${exists ? "WITH" : "LOGIN"} PASSWORD %L', $1::text, $2::text) AS command`,
    [roleName, password]
  );

  await client.query(rows[0].command);
}

function connectionForRole(template, role, password) {
  const url = new URL(template);
  url.username = role;
  url.password = password;
  return url.toString();
}

const appPassword = generatePassword();
const authPassword = generatePassword();
const client = new Client({ connectionString: directUrl.toString() });
let appRoleCreated = false;
let authRoleCreated = false;
let appRoleManaged = false;
let authRoleManaged = false;

await client.connect();

try {
  await client.query("BEGIN");

  const existingRoles = await client.query(
    `SELECT role.rolname, COALESCE(membership.admin_option, false) AS admin_option
     FROM pg_roles role
     LEFT JOIN pg_auth_members membership
       ON membership.roleid = role.oid
      AND membership.member = (
        SELECT oid FROM pg_roles WHERE rolname = current_user
      )
     WHERE role.rolname = ANY($1::text[])`,
    [["app_runtime", authRoleName]]
  );
  const roleAccess = new Map(
    existingRoles.rows.map((row) => [row.rolname, row.admin_option])
  );

  appRoleCreated = !roleAccess.has("app_runtime");
  authRoleCreated = !roleAccess.has(authRoleName);
  appRoleManaged = appRoleCreated || roleAccess.get("app_runtime") === true;
  authRoleManaged = authRoleCreated || roleAccess.get(authRoleName) === true;

  if (appRoleCreated) {
    await roleCommand(client, "app_runtime", appPassword, false);
  } else if (appRoleManaged) {
    await roleCommand(client, "app_runtime", appPassword, true);
  }

  if (appRoleManaged) {
    await client.query("ALTER ROLE app_runtime SET search_path TO app");
  }

  if (authRoleCreated) {
    await roleCommand(client, authRoleName, authPassword, false);
  } else if (authRoleManaged) {
    await roleCommand(client, authRoleName, authPassword, true);
  }

  if (authRoleManaged) {
    await client.query(`ALTER ROLE ${authRoleName} SET search_path TO auth`);
  }

  await client.query(
    `GRANT CONNECT ON DATABASE neondb TO app_runtime, ${authRoleName}`
  );
  await client.query("GRANT USAGE ON SCHEMA app TO app_runtime");
  await client.query(`GRANT USAGE ON SCHEMA auth TO ${authRoleName}`);
  await client.query(
    "GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA app TO app_runtime"
  );
  await client.query(
    `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA auth TO ${authRoleName}`
  );
  await client.query(
    "GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA app TO app_runtime"
  );
  await client.query(
    `GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA auth TO ${authRoleName}`
  );
  await client.query(
    "ALTER DEFAULT PRIVILEGES IN SCHEMA app GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_runtime"
  );
  await client.query(
    `ALTER DEFAULT PRIVILEGES IN SCHEMA auth GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${authRoleName}`
  );
  await client.query(
    "ALTER DEFAULT PRIVILEGES IN SCHEMA app GRANT USAGE, SELECT ON SEQUENCES TO app_runtime"
  );
  await client.query(
    `ALTER DEFAULT PRIVILEGES IN SCHEMA auth GRANT USAGE, SELECT ON SEQUENCES TO ${authRoleName}`
  );

  await client.query("COMMIT");
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  await client.end();
}

const values = {
  TEST_DATABASE_URL: directUrl.toString(),
  BETTER_AUTH_SECRET:
    process.env.BETTER_AUTH_SECRET || randomBytes(48).toString("base64url"),
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL || "http://localhost:3000"
};

if (appRoleManaged) {
  values.DATABASE_URL = connectionForRole(
    pooledOwnerUrl.toString(),
    "app_runtime",
    appPassword
  );
}

if (authRoleManaged) {
  values.DATABASE_URL_AUTH = connectionForRole(
    pooledOwnerUrl.toString(),
    authRoleName,
    authPassword
  );
}

process.stdout.write(
  JSON.stringify({
    values,
    manual: {
      appRuntimeConnectionRequired:
        !appRoleManaged && !process.env.DATABASE_URL?.includes("app_runtime"),
      authRuntimeConnectionRequired:
        !authRoleManaged && !process.env.DATABASE_URL_AUTH
    }
  })
);
