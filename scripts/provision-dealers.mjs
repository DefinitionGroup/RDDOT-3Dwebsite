// Writes Dealers and Dealer Users from a JSON file into a database (ADR 0014).
// rotpunkt provisions dealers; there is no self-registration. Idempotent: rows
// are matched by id and updated in place. A Dealer User is disabled through its
// `status`, never deleted, because share links and Quote Requests point at it.
//
//   pnpm dealers:provision [file] [--url <postgres-url>] [--allow-remote]
//
// The file defaults to db/seeds/demo-dealers.json (synthetic). Without --url the
// script uses DATABASE_URL_DIRECT, then DATABASE_URL, loading .env.local when
// neither is set. Neon hosts are refused unless --allow-remote is given: the
// shared development database receives dealers only with Martin's OK.

import { existsSync, readFileSync } from "node:fs";
import pg from "pg";

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name) => {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
};
const file =
  args.find((arg, index) => !arg.startsWith("--") && args[index - 1] !== "--url") ??
  "db/seeds/demo-dealers.json";

if (!option("--url") && !process.env.DATABASE_URL_DIRECT && !process.env.DATABASE_URL && existsSync(".env.local")) {
  process.loadEnvFile(".env.local");
}

const connectionString =
  option("--url") ?? process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL;
if (!connectionString) throw new Error("No database: pass --url or set DATABASE_URL");

const host = new URL(connectionString).hostname;
if (host.endsWith("neon.tech") && !flag("--allow-remote")) {
  throw new Error(
    `Refusing to provision dealers on ${host} without --allow-remote (shared database)`
  );
}

const { dealers } = JSON.parse(readFileSync(file, "utf8"));
if (!Array.isArray(dealers)) throw new Error(`${file} has no "dealers" array`);

const client = new pg.Client({ connectionString });
await client.connect();
try {
  await client.query("BEGIN");
  let users = 0;
  for (const dealer of dealers) {
    await client.query(
      `INSERT INTO app.dealer (id, name, street, postal_code, city, country, phone, email,
         website, latitude, longitude, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name, street = EXCLUDED.street, postal_code = EXCLUDED.postal_code,
         city = EXCLUDED.city, country = EXCLUDED.country, phone = EXCLUDED.phone,
         email = EXCLUDED.email, website = EXCLUDED.website, latitude = EXCLUDED.latitude,
         longitude = EXCLUDED.longitude, status = EXCLUDED.status, updated_at = now()`,
      [
        dealer.id,
        dealer.name,
        dealer.street,
        dealer.postalCode,
        dealer.city,
        dealer.country ?? "DE",
        dealer.phone ?? "",
        dealer.email ?? "",
        dealer.website ?? "",
        dealer.latitude,
        dealer.longitude,
        dealer.status ?? "active"
      ]
    );
    for (const user of dealer.users ?? []) {
      await client.query(
        `INSERT INTO app.dealer_user (id, dealer_id, email, name, phone, status)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO UPDATE SET
           dealer_id = EXCLUDED.dealer_id, email = EXCLUDED.email, name = EXCLUDED.name,
           phone = EXCLUDED.phone, status = EXCLUDED.status, updated_at = now()`,
        [
          user.id,
          dealer.id,
          String(user.email).trim().toLowerCase(),
          user.name ?? "",
          user.phone ?? "",
          user.status ?? "active"
        ]
      );
      users += 1;
    }
  }
  await client.query("COMMIT");
  console.log(`Provisioned ${dealers.length} dealers and ${users} dealer users on ${host}`);
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  await client.end();
}
