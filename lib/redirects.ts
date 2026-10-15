import { DEFAULT_LOCALE, isLocale, RESERVED_SEGMENTS } from "./i18n";

/** A redirect document as the redirects query returns it. */
export type RedirectEntry = { from: string | null; to: string | null; permanent: boolean | null };

export type RedirectTarget = { to: string; permanent: boolean };

/** Normalized source path → final target, chains already followed. */
export type RedirectTable = ReadonlyMap<string, RedirectTarget>;

/** Paths the application owns; a redirect may not take them over. */
const APP_SEGMENTS = new Set<string>(RESERVED_SEGMENTS.filter((segment) => !isLocale(segment)));
APP_SEGMENTS.add("_next");

const MAX_HOPS = 10;

/**
 * The form a path is compared in: decoded, lower case, without a trailing
 * slash. Old links arrive in every spelling (`/Kuechen/`, `/k%C3%BCchen`).
 */
export function normalizeRedirectPath(path: string) {
  let decoded = path;
  try {
    decoded = decodeURI(path);
  } catch {
    // A malformed escape stays as it came; it can still match itself.
  }
  const trimmed = decoded.trim().toLowerCase().replace(/\/+$/, "");
  return trimmed === "" ? "/" : trimmed;
}

/** Why a source path cannot be redirected, in the Studio's language; null when it can. */
export function redirectSourceProblem(from: string): string | null {
  if (!from.startsWith("/")) return "Beginnt mit /, ohne Domain.";
  if (/[\s?#]/.test(from)) return "Nur der Pfad: keine Leerzeichen, kein ? und kein #.";
  const path = normalizeRedirectPath(from);
  if (path === "/") return "Die Startseite kann nicht weitergeleitet werden.";
  // proxy.ts skips anything that looks like a file, so such a redirect would never run.
  if (path.split("/").pop()?.includes(".")) return "Adressen mit Dateiendung (.html, .php) erreichen die Weiterleitung nicht.";
  const segments = path.split("/").slice(1);
  if (segments[0] === DEFAULT_LOCALE) return `Deutsche Adressen stehen ohne /${DEFAULT_LOCALE}.`;
  const first = isLocale(segments[0]) ? segments[1] : segments[0];
  if (first === undefined) return "Die Startseite einer Sprache kann nicht weitergeleitet werden.";
  if (APP_SEGMENTS.has(first)) return `„/${first}“ gehört der Anwendung und kann nicht weitergeleitet werden.`;
  return null;
}

/** Why a target cannot be used, in the Studio's language; null when it can. */
export function redirectTargetProblem(to: string, from: string | null): string | null {
  if (/\s/.test(to)) return "Keine Leerzeichen.";
  if (!to.startsWith("/") && !/^https?:\/\/[^/]/.test(to)) return "Beginnt mit / oder mit https://.";
  if (to.startsWith("//")) return "Beginnt mit / oder mit https://.";
  if (from && to.startsWith("/") && normalizeRedirectPath(pathOf(to)) === normalizeRedirectPath(from)) {
    return "Führt auf sich selbst.";
  }
  return null;
}

/** The path part of an internal target (`/neu?x=1#y` → `/neu`). */
function pathOf(target: string) {
  return target.split(/[?#]/)[0];
}

/**
 * The lookup the proxy answers from. Invalid and duplicate sources are left
 * out (the first one wins); chains are followed so a visitor is redirected
 * once, and a chain that loops is dropped instead of bouncing the browser.
 * A chain is permanent only if every step is.
 */
export function buildRedirectTable(entries: readonly RedirectEntry[]): RedirectTable {
  const direct = new Map<string, RedirectTarget>();
  for (const entry of entries) {
    if (!entry.from || !entry.to) continue;
    if (redirectSourceProblem(entry.from) || redirectTargetProblem(entry.to, entry.from)) continue;
    const key = normalizeRedirectPath(entry.from);
    if (!direct.has(key)) direct.set(key, { to: entry.to.trim(), permanent: entry.permanent !== false });
  }

  const table = new Map<string, RedirectTarget>();
  for (const [source, first] of direct) {
    const seen = new Set([source]);
    let target = first;
    let permanent = first.permanent;
    let loops = false;
    for (let hop = 0; hop < MAX_HOPS && target.to.startsWith("/"); hop += 1) {
      const next = normalizeRedirectPath(pathOf(target.to));
      if (seen.has(next)) {
        loops = true;
        break;
      }
      const following = direct.get(next);
      if (!following) break;
      seen.add(next);
      target = following;
      permanent &&= following.permanent;
    }
    if (!loops) table.set(source, { to: target.to, permanent });
  }
  return table;
}

/**
 * The redirect for a request, or null. The visitor's query string travels
 * along unless the target sets its own.
 */
export function matchRedirect(
  table: RedirectTable,
  pathname: string,
  search = ""
): { location: string; status: 307 | 308 } | null {
  if (table.size === 0) return null;
  const target = table.get(normalizeRedirectPath(pathname));
  if (!target) return null;
  const keepQuery = search && search !== "?" && !target.to.includes("?");
  const location = keepQuery ? insertQuery(target.to, search.startsWith("?") ? search : `?${search}`) : target.to;
  return { location, status: target.permanent ? 308 : 307 };
}

function insertQuery(to: string, query: string) {
  const hash = to.indexOf("#");
  return hash === -1 ? `${to}${query}` : `${to.slice(0, hash)}${query}${to.slice(hash)}`;
}
