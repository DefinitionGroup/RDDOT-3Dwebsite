import { describe, expect, it } from "vitest";
import { allowsSearchIndexing } from "./search-indexing";

const launched = { NODE_ENV: "production", VERCEL_ENV: "production", SEARCH_INDEXING_ENABLED: "true" };

describe("allowsSearchIndexing", () => {
  it("indexes only a production build that opts in", () => {
    expect(allowsSearchIndexing(launched)).toBe(true);
    expect(allowsSearchIndexing({ ...launched, VERCEL_ENV: undefined })).toBe(true);
    expect(allowsSearchIndexing({ ...launched, SEARCH_INDEXING_ENABLED: undefined })).toBe(false);
    expect(allowsSearchIndexing({ ...launched, SEARCH_INDEXING_ENABLED: "1" })).toBe(false);
  });

  it("never indexes a developer's machine or a preview", () => {
    expect(allowsSearchIndexing({ ...launched, NODE_ENV: "development" })).toBe(false);
    expect(allowsSearchIndexing({ ...launched, VERCEL_ENV: "preview" })).toBe(false);
  });

  it("never indexes a deployment that still carries test settings", () => {
    expect(allowsSearchIndexing({ ...launched, OPEN_ALL_LOCALES: "true" })).toBe(false);
    expect(allowsSearchIndexing({ ...launched, ALLOW_DEVELOPMENT_EMAIL_CAPTURE_IN_PRODUCTION: "true" })).toBe(false);
  });
});
