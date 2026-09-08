/**
 * Post-build check: the production minifier once dropped the success path of
 * the Replicate adapter's `inspect` (code after a switch whose other cases
 * return), so every finished photo failed only in real builds. The sentinels
 * below live in that path; a server bundle without them fails the build.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = ".next/server";
const SENTINELS = ["provider-no-output", "Output download", "provider-output-unreachable"];

function* walk(directory) {
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) yield* walk(path);
    else if (path.endsWith(".js")) yield path;
  }
}

let found = false;
for (const file of walk(ROOT)) {
  const source = readFileSync(file, "utf8");
  if (SENTINELS.every((sentinel) => source.includes(sentinel))) {
    found = true;
    break;
  }
}

if (!found) {
  console.error(
    `verify-server-bundle: the photo adapter's success path is missing from the server bundle (sentinels ${SENTINELS.join(", ")}).`
  );
  process.exit(1);
}
console.log("verify-server-bundle: photo adapter success path present");
