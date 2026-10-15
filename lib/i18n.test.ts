import { describe, expect, it } from "vitest";
import { opensAllLocales } from "./i18n";

describe("opening every locale before launch", () => {
  it("opens them on a developer's machine", () => {
    expect(opensAllLocales({ NODE_ENV: "development" })).toBe(true);
  });

  it("opens them on a deployment that asks for it explicitly", () => {
    expect(opensAllLocales({ NODE_ENV: "production", OPEN_ALL_LOCALES: "true" })).toBe(true);
  });

  it("keeps them closed otherwise", () => {
    expect(opensAllLocales({ NODE_ENV: "production" })).toBe(false);
    expect(opensAllLocales({ NODE_ENV: "production", OPEN_ALL_LOCALES: "1" })).toBe(false);
    expect(opensAllLocales({ NODE_ENV: "production", OPEN_ALL_LOCALES: "false" })).toBe(false);
  });
});
