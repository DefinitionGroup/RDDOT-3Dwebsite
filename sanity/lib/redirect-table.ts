import { createClient } from "@sanity/client";
import { buildRedirectTable, type RedirectEntry, type RedirectTable } from "@/lib/redirects";
import { apiVersion, dataset, isSanityConfigured, studioProjectId } from "@/sanity/env";
import { REDIRECTS_QUERY } from "./queries";

/*
 * The redirect lookup proxy.ts answers every request from. It lives in the
 * proxy's memory and is refreshed in the background at most once a minute,
 * so a hit costs one Map lookup and Sanity sees one query per minute per
 * server instance, never one per visitor. A new or changed redirect takes
 * effect within that minute; the publish webhook does not reach this memory.
 * If Sanity cannot be reached the last table stays in use.
 */

const MAX_AGE_MS = process.env.NODE_ENV === "production" ? 60_000 : 5_000;
/** How long the very first request of an instance waits for the table before going on without it. */
const FIRST_LOAD_BUDGET_MS = 1_500;

const EMPTY: RedirectTable = new Map();

let table: RedirectTable | null = null;
let loadedAt = 0;
let loading: Promise<void> | null = null;

const client = isSanityConfigured
  ? createClient({
      projectId: studioProjectId,
      dataset,
      apiVersion,
      // The datasets are private (ADR 0007); server-side only, never sent to a browser.
      token: process.env.SANITY_API_READ_TOKEN,
      useCdn: process.env.NODE_ENV === "production",
      perspective: "published"
    })
  : null;

function refresh() {
  if (!client) return Promise.resolve();
  loading ??= client
    .fetch(REDIRECTS_QUERY, {}, { tag: "proxy.redirects" })
    .then((entries: RedirectEntry[] | null) => {
      table = buildRedirectTable(entries ?? []);
    })
    .catch((error: unknown) => {
      console.error("Redirects could not be loaded; keeping the previous table", error);
      table ??= EMPTY;
    })
    .finally(() => {
      loadedAt = Date.now();
      loading = null;
    });
  return loading;
}

/**
 * The current table. Stale tables are served while a refresh runs in the
 * background (`waitUntil` keeps it alive after the response); only an
 * instance's first request waits, and not for long.
 */
export async function redirectTable(waitUntil: (promise: Promise<unknown>) => void): Promise<RedirectTable> {
  if (!client) return EMPTY;
  if (table === null) {
    const first = refresh();
    waitUntil(first);
    await Promise.race([first, new Promise((resolve) => setTimeout(resolve, FIRST_LOAD_BUDGET_MS))]);
    return table ?? EMPTY;
  }
  if (Date.now() - loadedAt > MAX_AGE_MS && !loading) waitUntil(refresh());
  return table;
}
