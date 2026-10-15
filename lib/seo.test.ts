import { describe, expect, it } from "vitest";
import { hreflangAlternates } from "./seo";

const ALL = ["de", "en", "es"] as const;

const home = {
  isHomepage: true,
  slug: null,
  translations: [
    { language: "de", slug: null, isHomepage: true },
    { language: "en", slug: null, isHomepage: true },
    { language: "es", slug: null, isHomepage: true }
  ]
};

describe("hreflangAlternates", () => {
  it("lists every launched translation, German unprefixed and as x-default", () => {
    expect(hreflangAlternates({ ...home, locale: "en" }, ALL)).toEqual({
      de: "/",
      en: "/en",
      es: "/es",
      "x-default": "/"
    });
  });

  it("leaves out translations whose locale has not launched", () => {
    expect(hreflangAlternates({ ...home, locale: "de" }, ["de", "en"])).toEqual({
      de: "/",
      en: "/en",
      "x-default": "/"
    });
  });

  it("is null while the page is the only public language", () => {
    expect(hreflangAlternates({ ...home, locale: "de" }, ["de"])).toBeNull();
  });

  it("lists only translations that exist, never a homepage in their place", () => {
    const page = {
      locale: "en" as const,
      isHomepage: false,
      slug: "kitchens",
      translations: [
        { language: "de", slug: "kuechen", isHomepage: false },
        { language: "en", slug: "kitchens", isHomepage: false }
      ]
    };
    expect(hreflangAlternates(page, ALL)).toEqual({ de: "/kuechen", en: "/en/kitchens", "x-default": "/kuechen" });
    expect(hreflangAlternates({ ...page, translations: null }, ALL)).toBeNull();
  });

  it("names no x-default without a German page", () => {
    const page = {
      locale: "es" as const,
      isHomepage: false,
      slug: "cocinas",
      translations: [
        { language: "en", slug: "kitchens", isHomepage: false },
        { language: "es", slug: "cocinas", isHomepage: false }
      ]
    };
    expect(hreflangAlternates(page, ALL)).toEqual({ en: "/en/kitchens", es: "/es/cocinas" });
  });

  it("gives a page in an unlaunched locale no alternates", () => {
    expect(hreflangAlternates({ ...home, locale: "es" }, ["de", "en"])).toBeNull();
  });

  it("skips a translation without an address", () => {
    const page = {
      locale: "de" as const,
      isHomepage: false,
      slug: "kuechen",
      translations: [
        { language: "de", slug: "kuechen", isHomepage: false },
        { language: "en", slug: null, isHomepage: false },
        { language: null, slug: "x", isHomepage: false }
      ]
    };
    expect(hreflangAlternates(page, ALL)).toBeNull();
  });
});
