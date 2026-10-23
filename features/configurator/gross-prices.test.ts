import { describe, expect, it } from "vitest";
import { allocateWholeEuros, grossQuote, withTax } from "./gross-prices";
import { formatCurrency, formatUnitPrice, getConfiguratorQuote, RDTD_KITCHEN_PRODUCT_V2 } from "./product-definition";
import type { ConfiguratorState } from "./types";

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

describe("withTax", () => {
  it("adds VAT to the cent", () => {
    expect(withTax(58000, 0.19)).toBe(69020);
    expect(withTax(39200, 0.19)).toBe(46648);
    expect(withTax(0, 0.19)).toBe(0);
  });
});

describe("formatUnitPrice", () => {
  it("shows cents only when the unit price has them", () => {
    expect(formatUnitPrice(83300)).toMatch(/^833\s€$/);
    expect(formatUnitPrice(49980)).toMatch(/^499,80\s€$/);
    expect(formatUnitPrice(49980, "en")).toBe("€499.80");
  });
});

describe("allocateWholeEuros", () => {
  it("rounds to whole euros that make the target, largest remainders first", () => {
    expect(allocateWholeEuros([152320, 46648, 66402], 265400)).toEqual([152300, 46700, 66400]);
    expect(allocateWholeEuros([150, 150], 300)).toEqual([200, 100]);
    expect(allocateWholeEuros([199, 199], 200)).toEqual([100, 100]);
    expect(allocateWholeEuros([], 0)).toEqual([]);
  });
});

describe("grossQuote", () => {
  const product = RDTD_KITCHEN_PRODUCT_V2;
  const walls: ConfiguratorState["wallModules"][] = [
    ["big", "device", "big"],
    ["big", "big"],
    ["device", "small", "small", "big", "small"]
  ];
  const states: ConfiguratorState[] = product.cabinetColors.flatMap((cabinet) =>
    product.frontColors.flatMap((front) =>
      walls.flatMap((wallModules) =>
        ([0, 2, 4, 5] as const).map((islandSize) => ({
          schemaVersion: 2,
          productKey: product.productKey,
          layout: "straight-line",
          cabinetColorKey: cabinet.key,
          frontColorKey: front.key,
          wallModules,
          islandSize
        }))
      )
    )
  );

  it("shows every position with VAT, adding up to the total as it is shown", () => {
    for (const state of states) {
      const quote = getConfiguratorQuote(state, product);
      const gross = grossQuote(quote);
      const positions = [...gross.lineItems.map((item) => item.grossCents), gross.cabinetFinishCents, gross.frontFinishCents];
      expect(sum(positions)).toBe(Math.round(quote.totalCents / 100) * 100);
      expect(formatCurrency(sum(positions))).toBe(formatCurrency(quote.totalCents));

      const net = [...quote.lineItems.map((item) => item.totalCents), quote.cabinetDeltaCents, quote.frontDeltaCents];
      positions.forEach((cents, index) => {
        expect(cents % 100).toBe(0);
        expect(Math.abs(cents - withTax(net[index], quote.taxRate))).toBeLessThan(100);
      });
      gross.lineItems.forEach((item) => expect(item.unitGrossCents).toBe(withTax(item.unitPriceCents, quote.taxRate)));
      expect(gross.taxCents).toBe(quote.taxCents);
    }
  });
});
