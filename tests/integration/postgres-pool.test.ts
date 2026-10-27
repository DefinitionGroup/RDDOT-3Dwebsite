import { connect, createServer, type AddressInfo, type Socket } from "node:net";
import { CamelCasePlugin, Kysely, PostgresDialect, sql } from "kysely";
import { Pool, type PoolConfig } from "pg";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { createPostgresPool } from "@/lib/server/db/postgres-pool";
import {
  startPostgresTestContext,
  type PostgresTestContext
} from "@/tests/integration/postgres-test-context";

/**
 * A TCP relay in front of the test database. It can hold the next connections
 * the way Neon's proxy holds them while the database wakes, and drop every
 * open connection the way a suspend does.
 */
async function startRelay(target: { host: string; port: number }) {
  const holds: number[] = [];
  const sockets = new Set<Socket>();
  let opened = 0;

  const server = createServer((client) => {
    opened += 1;
    sockets.add(client);
    client.on("close", () => sockets.delete(client));
    client.on("error", () => client.destroy());
    // Until it is piped, the client's first bytes wait in its buffer.
    setTimeout(() => {
      if (client.destroyed) return;
      const upstream = connect(target);
      sockets.add(upstream);
      upstream.on("close", () => {
        sockets.delete(upstream);
        client.destroy();
      });
      upstream.on("error", () => upstream.destroy());
      client.on("close", () => upstream.destroy());
      client.pipe(upstream).pipe(client);
    }, holds.shift() ?? 0);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));

  return {
    port: (server.address() as AddressInfo).port,
    get opened() {
      return opened;
    },
    /** Holds each of the next connections for the given milliseconds. */
    hold(...ms: number[]) {
      holds.push(...ms);
    },
    dropAll() {
      for (const socket of sockets) socket.destroy();
    },
    reset() {
      holds.length = 0;
      opened = 0;
    },
    async stop() {
      this.dropAll();
      await new Promise((resolve) => server.close(resolve));
    }
  };
}

describe("postgres pool while the database wakes", { timeout: 60_000 }, () => {
  let context: PostgresTestContext;
  let relay: Awaited<ReturnType<typeof startRelay>>;
  let viaRelay: PoolConfig;
  const pools: Pool[] = [];
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

  beforeAll(async () => {
    context = await startPostgresTestContext();
    const url = new URL(context.connectionString);
    relay = await startRelay({ host: url.hostname, port: Number(url.port || 5432) });
    viaRelay = {
      host: "127.0.0.1",
      port: relay.port,
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: url.pathname.slice(1),
      // Through the relay, TLS still ends at the database: name it for SNI and the certificate.
      ssl: url.searchParams.has("sslmode") ? { servername: url.hostname } : undefined,
      connectionTimeoutMillis: 4_000
    };
  }, 120_000);

  afterEach(async () => {
    await Promise.all(pools.splice(0).map((pool) => pool.end()));
    relay.reset();
    warn.mockClear();
  });

  afterAll(async () => {
    warn.mockRestore();
    await relay?.stop();
    await context?.stop();
  });

  function pool(config: PoolConfig = viaRelay) {
    const created = createPostgresPool(config);
    pools.push(created);
    return created;
  }

  it("a plain pool gives up while the database wakes (the 500 of 2026-10-22)", async () => {
    const plain = new Pool(viaRelay);
    pools.push(plain);
    relay.hold(6_000);
    await expect(plain.query("select 1")).rejects.toThrow("Connection terminated due to connection timeout");
  });

  it("connects on the second attempt, for Kysely and for pool.query", async () => {
    const database = new Kysely({ dialect: new PostgresDialect({ pool: pool() }), plugins: [new CamelCasePlugin()] });
    relay.hold(6_000);
    const { rows } = await sql<{ ok: number }>`select 1 as ok`.execute(database);
    expect(rows).toEqual([{ ok: 1 }]);
    expect(relay.opened).toBe(2);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("trying once more"));

    relay.reset();
    const fresh = pool();
    relay.hold(6_000);
    expect((await fresh.query("select 2 as ok")).rows).toEqual([{ ok: 2 }]);
    expect(relay.opened).toBe(2);
  });

  it("gives up after the second attempt", async () => {
    relay.hold(6_000, 6_000);
    await expect(pool().connect()).rejects.toThrow("Connection terminated due to connection timeout");
    expect(relay.opened).toBe(2);
  });

  it("does not retry wrong credentials", async () => {
    const wrong = pool({ ...viaRelay, password: "not-the-password" });
    await expect(wrong.connect()).rejects.toMatchObject({ code: expect.stringMatching(/^28/) });
    expect(relay.opened).toBe(1);
  });

  it("survives an idle connection the database closes and opens a new one", async () => {
    const survivor = pool();
    expect((await survivor.query("select 1 as ok")).rows).toEqual([{ ok: 1 }]);
    relay.dropAll();
    await vi.waitFor(() => expect(warn).toHaveBeenCalledWith(expect.stringContaining("an idle connection closed")));
    expect((await survivor.query("select 3 as ok")).rows).toEqual([{ ok: 3 }]);
    expect(relay.opened).toBe(2);
  });
});
