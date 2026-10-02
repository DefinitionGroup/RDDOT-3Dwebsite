import { describe, expect, it } from "vitest";
import { languageLinks } from "./language-links";

const ALL = ["de", "en", "es"] as const;

describe("languageLinks", () => {
  it("is empty while only one locale is visible", () => {
    expect(languageLinks({ locale: "de", isHomepage: true, slug: null, translations: null }, ["de"])).toEqual([]);
  });

  it("links the homepages, German unprefixed", () => {
    expect(languageLinks({ locale: "de", isHomepage: true, slug: null, translations: null }, ALL)).toEqual([
      { locale: "de", href: "/", current: true },
      { locale: "en", href: "/en", current: false },
      { locale: "es", href: "/es", current: false }
    ]);
  });

  it("follows a translation's own slug and falls back to the homepage without one", () => {
    const links = languageLinks(
      {
        locale: "en",
        isHomepage: false,
        slug: "kitchens",
        translations: [
          { language: "de", slug: "kuechen", isHomepage: false },
          { language: "en", slug: "kitchens", isHomepage: false }
        ]
      },
      ALL
    );
    expect(links).toEqual([
      { locale: "de", href: "/kuechen", current: false },
      { locale: "en", href: "/en/kitchens", current: true },
      { locale: "es", href: "/es", current: false }
    ]);
  });

  it("keeps the site's locale order and leaves out locales that are not visible", () => {
    const links = languageLinks({ locale: "de", isHomepage: true, slug: null, translations: null }, ["es", "de"]);
    expect(links.map((link) => link.locale)).toEqual(["de", "es"]);
  });
});
