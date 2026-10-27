import "server-only";

import { attachDatabasePool } from "@vercel/functions";
import { Pool, type PoolClient, type PoolConfig } from "pg";

/**
 * Neon suspends an idle database and wakes it on the next connection. The
 * wake-up and the way from the function's region took longer than the 5 s the
 * pools used to allow, and the first sign-in after a quiet period answered 500
 * (2026-10-22). Neon's own examples allow 10 s.
 */
const CONNECT_TIMEOUT_MS = 10_000;
const IDLE_TIMEOUT_MS = 30_000;
const RETRY_DELAY_MS = 500;

type ConnectCallback = (
  error: Error | undefined,
  client: PoolClient | undefined,
  done: (release?: Error | boolean) => void
) => void;

/** Wrong credentials (28…) or a missing database (3D…) stay wrong on a retry. */
function isPermanent(error: unknown) {
  const code = error instanceof Error && "code" in error ? String(error.code) : "";
  return code.startsWith("28") || code.startsWith("3D");
}

/**
 * Opens a second connection when the first fails to open, as while the
 * database wakes. A connection that never opened ran nothing, so the retry
 * repeats no statement.
 */
class RetryingPool extends Pool {
  override connect(): Promise<PoolClient>;
  override connect(callback: ConnectCallback): void;
  override connect(callback?: ConnectCallback): Promise<PoolClient> | void {
    const connected = this.connectWithRetry();
    if (!callback) return connected;
    connected.then(
      (client) => callback(undefined, client, client.release),
      (error: Error) => callback(error, undefined, () => {})
    );
  }

  private async connectWithRetry() {
    try {
      return await super.connect();
    } catch (error) {
      if (this.ending || isPermanent(error)) throw error;
      console.warn(
        `[db] connecting failed, trying once more: ${error instanceof Error ? error.message : String(error)}`
      );
      // The jitter spreads a burst of requests that all met the sleeping database.
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * (1 + Math.random())));
      return super.connect();
    }
  }
}

/**
 * A pg pool for Neon on Vercel. It allows 10 s per connection attempt and
 * tries once more; an idle connection the database closes is logged instead
 * of crashing the process; and on Vercel the function stays up until the pool
 * has closed its idle connections, so none outlives a suspended function.
 */
export function createPostgresPool(config: PoolConfig) {
  const pool = new RetryingPool({
    idleTimeoutMillis: IDLE_TIMEOUT_MS,
    connectionTimeoutMillis: CONNECT_TIMEOUT_MS,
    ...config
  });
  pool.on("error", (error) => {
    console.warn(`[db] an idle connection closed: ${error.message}`);
  });
  attachDatabasePool(pool);
  return pool;
}
