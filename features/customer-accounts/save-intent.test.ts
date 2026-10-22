import { describe, expect, it } from "vitest";
import { readSaveIntent, saveIntentPath } from "./save-intent";

const intent = { configurationCode: "N4Ig-x+y", idempotencyKey: "4f0c7a9e-1b2d-4c3e-8f5a-6b7c8d9e0f1a" };

function paramsOf(path: string) {
  return Object.fromEntries(new URL(path, "https://example.test").searchParams);
}

describe("save intent", () => {
  it("survives the round trip through the account URL", () => {
    expect(readSaveIntent(paramsOf(saveIntentPath("de", intent)))).toEqual(intent);
  });

  it("keeps the locale prefix", () => {
    expect(saveIntentPath("de", intent)).toMatch(/^\/konto\?/);
    expect(saveIntentPath("en", intent)).toMatch(/^\/en\/konto\?/);
  });

  it("is absent unless intent, code and key are all single values", () => {
    const { configurationCode: c, idempotencyKey: key } = intent;
    expect(readSaveIntent({ import: key, c })).toBeNull();
    expect(readSaveIntent({ intent: "share", import: key, c })).toBeNull();
    expect(readSaveIntent({ intent: "save", c })).toBeNull();
    expect(readSaveIntent({ intent: "save", import: key, c: [c, c] })).toBeNull();
  });
});
