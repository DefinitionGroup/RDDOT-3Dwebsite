import { describe, expect, it } from "vitest";
import { frontFinishChoices, presetPricing, presetState, productChoices, resolveProduct } from "./catalog";
import { DEFAULT_CONFIGURATOR_STATE, getConfiguratorQuote, RDTD_KITCHEN_PRODUCT_V2 } from "./product-definition";

const KEY = RDTD_KITCHEN_PRODUCT_V2.productKey;

describe("resolveProduct", () => {
  it("finds the code-owned product by key and nothing else", () => {
    expect(resolveProduct(KEY)).toBe(RDTD_KITCHEN_PRODUCT_V2);
    expect(resolveProduct("retired-kitchen")).toBeNull();
    expect(resolveProduct(undefined)).toBeNull();
  });
});

describe("Studio choices", () => {
  it("lists products and front finishes by key with German titles", () => {
    expect(productChoices()).toEqual([{ value: KEY, title: RDTD_KITCHEN_PRODUCT_V2.title.de }]);
    expect(frontFinishChoices().map((choice) => choice.value)).toEqual(
      RDTD_KITCHEN_PRODUCT_V2.frontColors.map((option) => option.key)
    );
  });
});

describe("presetState", () => {
  it("is the default configuration when no finish is chosen", () => {
    expect(presetState(KEY)?.state).toEqual(DEFAULT_CONFIGURATOR_STATE);
  });

  it("applies a known front finish", () => {
    expect(presetState(KEY, { frontColorKey: "verde-kitami" })?.state.frontColorKey).toBe("verde-kitami");
  });

  it("refuses unknown products and finishes instead of falling back", () => {
    expect(presetState("retired-kitchen")).toBeNull();
    expect(presetState(KEY, { frontColorKey: "chrome" })).toBeNull();
    expect(presetState(KEY, { cabinetColorKey: "chrome" })).toBeNull();
  });
});

describe("presetPricing", () => {
  it("prices the preset and reports the front surcharge as the total moves, VAT included", () => {
    const standard = presetPricing(KEY);
    const walnut = presetPricing(KEY, { frontColorKey: "walnut-memory" });
    expect(standard?.totalCents).toBe(getConfiguratorQuote(DEFAULT_CONFIGURATOR_STATE).totalCents);
    expect(standard?.frontSurchargeCents).toBe(0);
    // The homepage card said +580 € while choosing walnut moved the total by 690,20 €.
    expect(walnut?.frontSurchargeCents).toBe(69020);
    expect(walnut!.totalCents - standard!.totalCents).toBe(walnut?.frontSurchargeCents);
  });
});
