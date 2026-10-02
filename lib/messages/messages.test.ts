import { describe, expect, it } from "vitest";
import { LOCALES } from "@/lib/i18n";
import { getMessages } from "./index";

/** Every leaf of a dictionary, flattened: plain strings and sample calls of the functions. */
function leaves(node: unknown, path = ""): [string, string][] {
  if (typeof node === "string") return [[path, node]];
  if (typeof node === "function") return [[path, String((node as (value: never) => string)("X" as never))]];
  return Object.entries(node as Record<string, unknown>).flatMap(([key, value]) => leaves(value, `${path}.${key}`));
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

  it("counts decisions in words", () => {
    expect(getMessages("de").blocks.decisions(3)).toBe("Die drei Entscheidungen");
    expect(getMessages("en").blocks.decisions(3)).toBe("The three decisions");
    expect(getMessages("es").blocks.decisions(4)).toBe("Las cuatro decisiones");
  });
});
