import { describe, expect, it } from "vitest";
import { opensAllLocales } from "./i18n";

describe("opening every locale before launch", () => {
  it("opens them on a developer's machine", () => {
    expect(opensAllLocales({ NODE_ENV: "development" })).toBe(true);
  });

  it("opens them on a test deployment that asks for it", () => {
    expect(opensAllLocales({ NODE_ENV: "production", OPEN_ALL_LOCALES: "true", VERCEL_ENV: "preview" })).toBe(true);
    expect(opensAllLocales({ NODE_ENV: "production", OPEN_ALL_LOCALES: "true" })).toBe(true);
  });

  it("keeps them closed otherwise, and always on Vercel production", () => {
    expect(opensAllLocales({ NODE_ENV: "production" })).toBe(false);
    expect(opensAllLocales({ NODE_ENV: "production", OPEN_ALL_LOCALES: "1", VERCEL_ENV: "preview" })).toBe(false);
    expect(opensAllLocales({ NODE_ENV: "production", OPEN_ALL_LOCALES: "true", VERCEL_ENV: "production" })).toBe(false);
  });
});
