import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import config from "../tailwind.config";

const ROOT = join(__dirname, "..");
const SKIP = new Set(["node_modules", "public", "scripts", "tests", "tmp", "db", "docs", "sanity"]);

/** Top-level folders that hold .tsx files, i.e. components that may carry Tailwind classes. */
function componentFolders() {
  return readdirSync(ROOT).filter((name) => {
    if (name.startsWith(".") || SKIP.has(name)) return false;
    const path = join(ROOT, name);
    return statSync(path).isDirectory() && containsTsx(path);
  });
}

function containsTsx(directory: string): boolean {
  return readdirSync(directory).some((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? containsTsx(path) : name.endsWith(".tsx");
  });
}

describe("Tailwind content globs", () => {
  // Classes in a folder Tailwind does not scan are silently missing from the CSS:
  // moving the sections to blocks/ once collapsed the hero and every grid.
  it("cover every folder with components", () => {
    const globs = (config.content as string[]).join(" ");
    for (const folder of componentFolders()) {
      expect(globs, `tailwind.config.ts content misses ./${folder}/`).toContain(`./${folder}/**`);
    }
  });
});
