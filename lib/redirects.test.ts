import { describe, expect, it } from "vitest";
import {
  buildRedirectTable,
  matchRedirect,
  normalizeRedirectPath,
  redirectSourceProblem,
  redirectTargetProblem,
  type RedirectEntry
} from "./redirects";

const entry = (from: string, to: string, permanent: boolean | null = true): RedirectEntry => ({ from, to, permanent });

describe("normalizeRedirectPath", () => {
  it("compares decoded, lower case, without a trailing slash", () => {
    expect(normalizeRedirectPath("/Kuechen/")).toBe("/kuechen");
    expect(normalizeRedirectPath("/k%C3%BCchen")).toBe("/küchen");
    expect(normalizeRedirectPath("/")).toBe("/");
    expect(normalizeRedirectPath("/bad%E0%A4%A")).toBe("/bad%e0%a4%a");
  });
});

describe("redirectSourceProblem", () => {
  it("accepts an old page in any locale", () => {
    expect(redirectSourceProblem("/alte-seite")).toBeNull();
    expect(redirectSourceProblem("/en/old-page")).toBeNull();
    expect(redirectSourceProblem("/es/pagina/vieja")).toBeNull();
  });

  it("refuses paths the redirect could never see or must not take over", () => {
    expect(redirectSourceProblem("alte-seite")).toMatch(/Beginnt mit \//);
    expect(redirectSourceProblem("/seite?x=1")).toMatch(/kein \?/);
    expect(redirectSourceProblem("/")).toMatch(/Startseite/);
    expect(redirectSourceProblem("/en/")).toMatch(/Startseite einer Sprache/);
    expect(redirectSourceProblem("/de/alte-seite")).toMatch(/ohne \/de/);
    expect(redirectSourceProblem("/kuechen.html")).toMatch(/Dateiendung/);
    expect(redirectSourceProblem("/configure")).toMatch(/gehört der Anwendung/);
    expect(redirectSourceProblem("/en/konto/x")).toMatch(/gehört der Anwendung/);
    expect(redirectSourceProblem("/studio")).toMatch(/gehört der Anwendung/);
  });
});

describe("redirectTargetProblem", () => {
  it("accepts site paths and web addresses", () => {
    expect(redirectTargetProblem("/configure", "/konfigurator")).toBeNull();
    expect(redirectTargetProblem("https://rotpunkt.de/kuechen", "/alt")).toBeNull();
  });

  it("refuses targets that lead nowhere or back", () => {
    expect(redirectTargetProblem("konfigurator", "/alt")).toMatch(/Beginnt mit/);
    expect(redirectTargetProblem("//evil.example", "/alt")).toMatch(/Beginnt mit/);
    expect(redirectTargetProblem("/Alt/?x=1", "/alt")).toMatch(/sich selbst/);
  });
});

describe("matchRedirect", () => {
  const table = buildRedirectTable([
    entry("/konfigurator", "/configure"),
    entry("/aktion", "/#material", false),
    entry("/en/old", "/en/configure?config=abc")
  ]);

  it("answers a known path with its target and status", () => {
    expect(matchRedirect(table, "/konfigurator")).toEqual({ location: "/configure", status: 308 });
    expect(matchRedirect(table, "/Konfigurator/")).toEqual({ location: "/configure", status: 308 });
    expect(matchRedirect(table, "/aktion")).toEqual({ location: "/#material", status: 307 });
  });

  it("keeps the visitor's query unless the target sets one", () => {
    expect(matchRedirect(table, "/konfigurator", "?utm_source=print")).toEqual({
      location: "/configure?utm_source=print",
      status: 308
    });
    expect(matchRedirect(table, "/aktion", "?a=1")?.location).toBe("/?a=1#material");
    expect(matchRedirect(table, "/en/old", "?a=1")?.location).toBe("/en/configure?config=abc");
  });

  it("leaves every other path alone", () => {
    expect(matchRedirect(table, "/configure")).toBeNull();
    expect(matchRedirect(table, "/")).toBeNull();
    expect(matchRedirect(buildRedirectTable([]), "/konfigurator")).toBeNull();
  });
});

describe("buildRedirectTable", () => {
  it("follows chains so a visitor is redirected once, permanent only if every step is", () => {
    const table = buildRedirectTable([
      entry("/a", "/b"),
      entry("/b", "/c/", false),
      entry("/c", "https://example.com/d")
    ]);
    expect(table.get("/a")).toEqual({ to: "https://example.com/d", permanent: false });
    expect(table.get("/b")).toEqual({ to: "https://example.com/d", permanent: false });
    expect(table.get("/c")).toEqual({ to: "https://example.com/d", permanent: true });
  });

  it("drops loops instead of bouncing the browser", () => {
    const table = buildRedirectTable([entry("/a", "/b"), entry("/b", "/a"), entry("/x", "/a")]);
    expect(table.size).toBe(0);
  });

  it("skips invalid entries and keeps the first of two with the same source", () => {
    const table = buildRedirectTable([
      { from: null, to: "/x", permanent: true },
      entry("/configure", "/x"),
      entry("/alt", "/neu"),
      entry("/ALT/", "/anders"),
      entry("/selbst", "/selbst")
    ]);
    expect([...table.entries()]).toEqual([["/alt", { to: "/neu", permanent: true }]]);
  });

  it("treats a missing permanent flag as permanent, like the Studio's default", () => {
    expect(buildRedirectTable([entry("/alt", "/neu", null)]).get("/alt")?.permanent).toBe(true);
  });
});
