import { withTax } from "./gross-prices";
import {
  DEFAULT_CONFIGURATOR_STATE,
  getConfiguratorQuote,
  normalizeConfiguratorState,
  RDTD_KITCHEN_PRODUCT_V2
} from "./product-definition";
import type { ConfiguratorProductDefinitionV2, ConfiguratorState, LocaleCode } from "./types";

/*
 * The product lookup behind editorial Configurator Blocks (CONTEXT.md). A
 * block names a product by its stable `productKey` and, at most, the finish
 * keys of a starting preset; everything executable — options, rules, prices —
 * is resolved here. Today that is the code-owned definition; later it is the
 * active Release Bundle, and no editorial content changes when that happens.
 */

const PRODUCTS: readonly ConfiguratorProductDefinitionV2[] = [RDTD_KITCHEN_PRODUCT_V2];

export function resolveProduct(productKey: string | null | undefined) {
  return PRODUCTS.find((product) => product.productKey === productKey) ?? null;
}

/** Choices for the Studio: products editors may place on a page. */
export function productChoices(locale: LocaleCode = "de") {
  return PRODUCTS.map((product) => ({ value: product.productKey, title: product.title[locale] }));
}

/** Choices for the Studio: front finishes across all products, by key. */
export function frontFinishChoices(locale: LocaleCode = "de") {
  return uniqueChoices(PRODUCTS.flatMap((product) => product.frontColors), locale);
}

/** Choices for the Studio: cabinet finishes across all products, by key. */
export function cabinetFinishChoices(locale: LocaleCode = "de") {
  return uniqueChoices(PRODUCTS.flatMap((product) => product.cabinetColors), locale);
}

function uniqueChoices(options: { key: string; label: Record<LocaleCode, string> }[], locale: LocaleCode) {
  const seen = new Map<string, string>();
  for (const option of options) if (!seen.has(option.key)) seen.set(option.key, option.label[locale]);
  return [...seen].map(([value, title]) => ({ value, title }));
}

export type ProductPreset = { frontColorKey?: string | null; cabinetColorKey?: string | null };

/**
 * The starting configuration of a preset, or null when the product or a
 * finish is unknown — the block then shows its editorial content without a
 * price or a preset link instead of guessing.
 */
export function presetState(productKey: string | null | undefined, preset: ProductPreset = {}) {
  const product = resolveProduct(productKey);
  if (!product) return null;
  if (preset.frontColorKey && !product.frontColors.some((option) => option.key === preset.frontColorKey)) return null;
  if (preset.cabinetColorKey && !product.cabinetColors.some((option) => option.key === preset.cabinetColorKey)) {
    return null;
  }
  const state: ConfiguratorState = normalizeConfiguratorState(
    {
      ...DEFAULT_CONFIGURATOR_STATE,
      ...(preset.frontColorKey ? { frontColorKey: preset.frontColorKey } : {}),
      ...(preset.cabinetColorKey ? { cabinetColorKey: preset.cabinetColorKey } : {})
    },
    product
  );
  return { product, state };
}

/**
 * Price facts of a preset, both with VAT like every price a customer sees: its
 * indicative total and what its front finish adds to that total.
 */
export function presetPricing(productKey: string | null | undefined, preset: ProductPreset = {}) {
  const resolved = presetState(productKey, preset);
  if (!resolved) return null;
  const { product, state } = resolved;
  const quote = getConfiguratorQuote(state, product);
  return {
    totalCents: quote.totalCents,
    frontSurchargeCents: withTax(quote.frontDeltaCents, quote.taxRate)
  };
}
