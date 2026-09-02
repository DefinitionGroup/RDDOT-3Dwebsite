import { getConfiguratorQuote } from "@/features/configurator/product-definition";
import type { AnyConfiguratorState, QuoteLineItem } from "@/features/configurator/types";

/**
 * The nonbinding Price Indication captured with a Quote Request: what the
 * customer saw, computed server-side from the pinned configuration under the
 * Product Definition version it was saved with. It is evidence of the context
 * at submission, not a price the business has committed to (CONTEXT.md).
 */
export type PriceIndication = {
  productDefinitionVersion: string;
  currency: string;
  lineItems: QuoteLineItem[];
  cabinetDeltaCents: number;
  frontDeltaCents: number;
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  computedAt: string;
};

export function createPriceIndication(
  configuration: AnyConfiguratorState,
  productDefinitionVersion: string,
  computedAt: Date
): PriceIndication {
  const quote = getConfiguratorQuote(configuration);
  return {
    productDefinitionVersion,
    currency: quote.currency,
    lineItems: quote.lineItems,
    cabinetDeltaCents: quote.cabinetDeltaCents,
    frontDeltaCents: quote.frontDeltaCents,
    subtotalCents: quote.subtotalCents,
    taxCents: quote.taxCents,
    totalCents: quote.totalCents,
    computedAt: computedAt.toISOString()
  };
}

/** Reads the total back from a stored indication without trusting its shape. */
export function readPriceIndicationTotal(value: unknown): number | null {
  if (typeof value !== "object" || value === null) return null;
  const total = (value as { totalCents?: unknown }).totalCents;
  return typeof total === "number" && Number.isFinite(total) ? total : null;
}
