import type { ConfiguratorQuote, QuoteLineItem } from "@/features/configurator/types";

/**
 * Consumers are shown prices with VAT included (PAngV). The price book is net;
 * these helpers turn its amounts into what a customer reads, so every price on
 * the site sits on the one basis the total already uses.
 */

/** A net amount with VAT added, to the cent. */
export function withTax(netCents: number, taxRate: number) {
  return Math.round(netCents * (1 + taxRate));
}

export type GrossQuoteLine = QuoteLineItem & {
  /** Unit price with VAT, to the cent. */
  unitGrossCents: number;
  /** The position with VAT, in whole euros (see `grossQuote`). */
  grossCents: number;
};

export type GrossQuote = {
  lineItems: GrossQuoteLine[];
  /** Finish surcharges with VAT, in whole euros. */
  cabinetFinishCents: number;
  frontFinishCents: number;
  /** The VAT the total contains. */
  taxCents: number;
  taxRate: number;
  totalCents: number;
};

/**
 * The quote as a customer reads it: every position with VAT, in whole euros
 * that add up to the total as it is shown. Rounding each position on its own
 * would leave the column a few euros off the total, so the euros left over go
 * to the positions closest to rounding up.
 */
export function grossQuote(quote: ConfiguratorQuote): GrossQuote {
  const exact = [
    ...quote.lineItems.map((item) => item.totalCents),
    quote.cabinetDeltaCents,
    quote.frontDeltaCents
  ].map((cents) => withTax(cents, quote.taxRate));
  const euros = allocateWholeEuros(exact, Math.round(quote.totalCents / 100) * 100);
  const count = quote.lineItems.length;

  return {
    lineItems: quote.lineItems.map((item, index) => ({
      ...item,
      unitGrossCents: withTax(item.unitPriceCents, quote.taxRate),
      grossCents: euros[index]
    })),
    cabinetFinishCents: euros[count],
    frontFinishCents: euros[count + 1],
    taxCents: quote.taxCents,
    taxRate: quote.taxRate,
    totalCents: quote.totalCents
  };
}

/**
 * Rounds each amount to whole euros so that together they make `targetCents`
 * (itself whole euros): every amount is rounded down, then the missing euros
 * go to the largest remainders, earlier positions first on a tie.
 */
export function allocateWholeEuros(amountsCents: number[], targetCents: number) {
  const result = amountsCents.map((cents) => Math.floor(cents / 100) * 100);
  if (result.length === 0) return result;
  const ranked = amountsCents
    .map((cents, index) => ({ index, remainder: cents - result[index] }))
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index)
    .map(({ index }) => index);

  let euros = Math.round((targetCents - result.reduce((sum, cents) => sum + cents, 0)) / 100);
  for (let step = 0; euros > 0; step++, euros--) result[ranked[step % ranked.length]] += 100;
  for (let step = 0; euros < 0; step++, euros++) result[ranked[ranked.length - 1 - (step % ranked.length)]] -= 100;
  return result;
}
