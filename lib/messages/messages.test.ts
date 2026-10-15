import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { API_ERROR_CODES } from "@/lib/api-errors";
import { LOCALES } from "@/lib/i18n";
import { apiErrorMessage, getMessages } from "./index";

/** Every leaf of a dictionary, flattened: plain strings and sample calls of the functions. */
function leaves(node: unknown, path = ""): [string, string][] {
  if (typeof node === "string") return [[path, node]];
  if (typeof node === "function") return [[path, String((node as (value: never) => string)("X" as never))]];
  return Object.entries(node as Record<string, unknown>).flatMap(([key, value]) => leaves(value, `${path}.${key}`));
}

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? sourceFiles(path) : path.endsWith(".ts") ? [path] : [];
  });
}

describe("functional copy", () => {
  it("has the same keys and no empty strings in every locale", () => {
    const german = leaves(getMessages("de")).map(([path]) => path);
    for (const locale of LOCALES) {
      const entries = leaves(getMessages(locale));
      expect(entries.map(([path]) => path)).toEqual(german);
      for (const [path, value] of entries) expect(value, `${locale}${path}`).not.toBe("");
    }
  });

  it("leaves no German in English and Spanish", () => {
    for (const locale of ["en", "es"] as const) {
      for (const [path, value] of leaves(getMessages(locale))) {
        expect(value, `${locale}${path}`).not.toMatch(/[äöüßÄÖÜ]|\b(und|der|die|das|nicht|Sie|Ihr|Ihre)\b/);
      }
    }
  });

  it("counts decisions in words", () => {
    expect(getMessages("de").blocks.decisions(3)).toBe("Die drei Entscheidungen");
    expect(getMessages("en").blocks.decisions(3)).toBe("The three decisions");
    expect(getMessages("es").blocks.decisions(4)).toBe("Las cuatro decisiones");
  });

  it("words every code an API route answers with", () => {
    const answered = sourceFiles(join(process.cwd(), "app/api")).flatMap((file) =>
      [...readFileSync(file, "utf8").matchAll(/\bcode: "([a-z-]+)"/g)].map((match) => match[1])
    );
    const quoteRoute = readFileSync(join(process.cwd(), "app/api/projects/[projectId]/quote-requests/route.ts"), "utf8");
    answered.push(...[...quoteRoute.matchAll(/const [A-Z_]+ = "([a-z-]+)";/g)].map((match) => match[1]));
    expect(answered.length).toBeGreaterThan(50);
    for (const code of answered) expect(API_ERROR_CODES, code).toContain(code);
  });

  it("turns an API refusal into the page's words, or the caller's fallback", () => {
    expect(apiErrorMessage(getMessages("en"), { code: "project-conflict" }, "fallback")).toBe(
      "This project has been changed elsewhere in the meantime."
    );
    expect(apiErrorMessage(getMessages("es"), { code: "unknown-code" }, "reserva")).toBe("reserva");
    expect(apiErrorMessage(getMessages("de"), null, "Ersatz")).toBe("Ersatz");
  });
});
