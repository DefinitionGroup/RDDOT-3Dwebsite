import { describe, expect, it } from "vitest";
import {
  createQuoteRequestReference,
  formatQuoteRequestReference,
  QUOTE_REQUEST_REFERENCE_PATTERN
} from "@/features/quote-requests/quote-request-reference";

describe("Quote Request reference", () => {
  it("produces readable references without ambiguous symbols", () => {
    for (let i = 0; i < 200; i += 1) {
      const reference = createQuoteRequestReference();
      expect(reference).toMatch(QUOTE_REQUEST_REFERENCE_PATTERN);
      expect(reference).not.toMatch(/[01IO]/);
    }
  });

  it("maps bytes to symbols deterministically", () => {
    const reference = createQuoteRequestReference(
      () => new Uint8Array([0, 1, 31, 32, 255, 64, 100, 200])
    );
    expect(reference).toBe("A-23Z2Z26A");
  });

  it("formats a reference in two groups and leaves anything else alone", () => {
    expect(formatQuoteRequestReference("A-7K3M9Q2X")).toBe("A-7K3M 9Q2X");
    expect(formatQuoteRequestReference("legacy")).toBe("legacy");
  });
});
