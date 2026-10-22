import { describe, expect, it } from "vitest";
import { localizePath, opensAllLocales, unlocalizePath } from "./i18n";

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

describe("unlocalizePath", () => {
  it("undoes localizePath for every locale", () => {
    for (const locale of ["de", "en", "es"] as const) {
      for (const path of ["/", "/konto", "/anfrage?project=p1", "/configure?c=N4Ig-x+y"]) {
        expect(unlocalizePath(localizePath(locale, path))).toBe(path);
      }
    }
  });

  it("leaves a path alone whose first segment only looks like a locale", () => {
    expect(unlocalizePath("/de/konto")).toBe("/de/konto");
    expect(unlocalizePath("/entwurf")).toBe("/entwurf");
  });
});
