import { describe, expect, it } from "vitest";
import {
  DEFAULT_CONFIGURATOR_STATE,
  getConfiguratorQuote,
  getIslandBackComposition,
  getWorktopLengthM,
  normalizeConfiguratorState,
  RDTD_KITCHEN_PRODUCT,
  RDTD_KITCHEN_PRODUCT_V2
} from "@/features/configurator/product-definition";
import type { ConfiguratorState, IslandSize } from "@/features/configurator/types";

describe("v2 sum-of-parts quote", () => {
  it("is calibrated to the v1 base price for the default layout", () => {
    const v2 = getConfiguratorQuote(DEFAULT_CONFIGURATOR_STATE);

    expect(v2.modulesCents).toBe(RDTD_KITCHEN_PRODUCT.priceBook.basePriceCents);
    expect(v2.finishWeightFactor).toBe(1);
  });

  it("matches the historical v1 total for every finish combination", () => {
    for (const cabinet of RDTD_KITCHEN_PRODUCT_V2.cabinetColors) {
      for (const front of RDTD_KITCHEN_PRODUCT_V2.frontColors) {
        const state: ConfiguratorState = {
          ...DEFAULT_CONFIGURATOR_STATE,
          cabinetColorKey: cabinet.key,
          frontColorKey: front.key
        };
        const v2 = getConfiguratorQuote(state);
        const v1 = getConfiguratorQuote(
          {
            schemaVersion: 1,
            productKey: "rdtdot-signature-kitchen-v1",
            layout: "straight-line",
            cabinetColorKey: cabinet.key,
            frontColorKey: front.key
          },
          RDTD_KITCHEN_PRODUCT
        );

        expect(v2.totalCents).toBe(v1.totalCents);
      }
    }
  });

  it("scales finish upcharges with module count", () => {
    const small: ConfiguratorState = {
      ...DEFAULT_CONFIGURATOR_STATE,
      wallModules: ["big", "big"],
      islandSize: 0,
      frontColorKey: "verde-kitami"
    };
    const quote = getConfiguratorQuote(small);

    expect(quote.finishWeightFactor).toBeCloseTo(4 / 17.6, 10);
    expect(quote.frontDeltaCents).toBe(Math.round(52000 * (4 / 17.6)));
  });

  it("prices the island worktop per meter and drops it without an island", () => {
    const withIsland = getConfiguratorQuote(DEFAULT_CONFIGURATOR_STATE);
    const worktop = withIsland.lineItems.find((item) => item.key === "island-worktop");
    expect(worktop?.totalCents).toBe(Math.round(3.1 * 18000));

    const withoutIsland = getConfiguratorQuote({
      ...DEFAULT_CONFIGURATOR_STATE,
      islandSize: 0
    });
    expect(
      withoutIsland.lineItems.some((item) => item.key.startsWith("island"))
    ).toBe(false);
  });

  it("keeps every legal island size tileable by the back row", () => {
    for (const size of RDTD_KITCHEN_PRODUCT_V2.island.sizes) {
      const back = getIslandBackComposition(size);
      const backWidth = back.reduce(
        (sum, unit) => sum + (unit === "90" ? 0.9 : 0.6),
        0
      );
      expect(backWidth).toBeCloseTo(size * 0.75, 10);
      if (size > 0) {
        expect(getWorktopLengthM(RDTD_KITCHEN_PRODUCT_V2, size)).toBeCloseTo(
          size * 0.75 + 0.1,
          10
        );
      }
    }
  });
});

describe("v2 state normalization", () => {
  it("maps v1 states onto the default layout with finishes preserved", () => {
    const normalized = normalizeConfiguratorState({
      schemaVersion: 1,
      productKey: "rdtdot-signature-kitchen-v1",
      layout: "straight-line",
      cabinetColorKey: "oak",
      frontColorKey: "walnut-memory"
    });

    expect(normalized.schemaVersion).toBe(2);
    expect(normalized.cabinetColorKey).toBe("oak");
    expect(normalized.frontColorKey).toBe("walnut-memory");
    expect(normalized.wallModules).toEqual([
      ...RDTD_KITCHEN_PRODUCT_V2.defaultWallModules
    ]);
    expect(normalized.islandSize).toBe(4);
  });

  it("demotes device cabinets beyond the per-type maximum", () => {
    const normalized = normalizeConfiguratorState({
      ...DEFAULT_CONFIGURATOR_STATE,
      wallModules: ["device", "device", "device", "device"]
    });

    expect(normalized.wallModules).toEqual(["device", "device", "small", "small"]);
  });

  it("enforces the wall width cap by dropping modules from the right", () => {
    const normalized = normalizeConfiguratorState({
      ...DEFAULT_CONFIGURATOR_STATE,
      wallModules: Array.from({ length: 12 }, () => "big" as const)
    });

    const width = normalized.wallModules.reduce((sum) => sum + 0.62, 0);
    expect(width).toBeLessThanOrEqual(5.4 + 1e-9);
    expect(normalized.wallModules.length).toBe(8);
  });

  it("rejects illegal island sizes in favor of the default", () => {
    const normalized = normalizeConfiguratorState({
      ...DEFAULT_CONFIGURATOR_STATE,
      islandSize: 3 as IslandSize
    });

    expect(normalized.islandSize).toBe(4);
  });

  it("falls back to the default layout when fewer than two modules remain", () => {
    const normalized = normalizeConfiguratorState({
      ...DEFAULT_CONFIGURATOR_STATE,
      wallModules: ["big"]
    });

    expect(normalized.wallModules).toEqual([
      ...RDTD_KITCHEN_PRODUCT_V2.defaultWallModules
    ]);
  });
});
