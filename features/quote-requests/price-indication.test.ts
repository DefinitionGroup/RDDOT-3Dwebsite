import { describe, expect, it } from "vitest";
import {
  getConfiguratorQuote,
  normalizeConfiguratorState,
  RDTD_KITCHEN_PRODUCT_VERSION
} from "@/features/configurator/product-definition";
import {
  createPriceIndication,
  readPriceIndicationTotal
} from "@/features/quote-requests/price-indication";

describe("Price Indication", () => {
  it("captures the server-computed quote and the version it was computed under", () => {
    const configuration = normalizeConfiguratorState({});
    const computedAt = new Date("2026-09-02T12:00:00.000Z");

    const indication = createPriceIndication(
      configuration,
      RDTD_KITCHEN_PRODUCT_VERSION,
      computedAt
    );

    const quote = getConfiguratorQuote(configuration);
    expect(indication.totalCents).toBe(quote.totalCents);
    expect(indication.lineItems).toEqual(quote.lineItems);
    expect(indication.productDefinitionVersion).toBe(RDTD_KITCHEN_PRODUCT_VERSION);
    expect(indication.computedAt).toBe("2026-09-02T12:00:00.000Z");
    // Round-trips through JSON unchanged, which is how it is stored.
    expect(JSON.parse(JSON.stringify(indication))).toEqual(indication);
  });

  it("reads a total back defensively", () => {
    expect(readPriceIndicationTotal({ totalCents: 1010300 })).toBe(1010300);
    expect(readPriceIndicationTotal({ totalCents: "1010300" })).toBeNull();
    expect(readPriceIndicationTotal(null)).toBeNull();
    expect(readPriceIndicationTotal("x")).toBeNull();
  });
});
