"use client";

import {
  formatCurrency,
  formatPercent,
  formatUnitPrice,
  getLocalizedLabel
} from "@/features/configurator/product-definition";
import { formatQuantity } from "@/features/configurator/format-quantity";
import { grossQuote } from "@/features/configurator/gross-prices";
import type { ConfiguratorQuote, LocaleCode } from "@/features/configurator/types";
import { getMessages } from "@/lib/messages";

/** How many rows the itemisation shows: the line items plus the two finish deltas. */
export function priceLineCount(quote: ConfiguratorQuote) {
  return quote.lineItems.length + 2;
}

/**
 * The itemised quote with VAT included, like the total under it: module counts,
 * island units, the worktop, finish surcharges, and the VAT the total contains.
 */
export function PriceLines({ locale, quote }: { locale: LocaleCode; quote: ConfiguratorQuote }) {
  const t = getMessages(locale).priceLines;
  const gross = grossQuote(quote);
  return (
    <dl className="tnum m-0 flex flex-col gap-2 text-caption">
      {gross.lineItems.map((item) => (
        <div className="flex justify-between gap-4" key={item.key}>
          <dt className="text-graphite">
            {getLocalizedLabel(item.label, locale)}
            <span className="ml-2 text-ash">
              {formatQuantity(item.key, item.quantity, locale)} {formatUnitPrice(item.unitGrossCents, locale)}
            </span>
          </dt>
          <dd className="m-0 text-ink">{formatCurrency(item.grossCents, locale)}</dd>
        </div>
      ))}
      <div className="flex justify-between gap-4 border-t border-hairline pt-2">
        <dt className="text-graphite">{t.cabinetFinish}</dt>
        <dd className="m-0 text-ink">{formatCurrency(gross.cabinetFinishCents, locale)}</dd>
      </div>
      <div className="flex justify-between gap-4">
        <dt className="text-graphite">{t.frontFinish}</dt>
        <dd className="m-0 text-ink">{formatCurrency(gross.frontFinishCents, locale)}</dd>
      </div>
      <div className="flex justify-between gap-4 border-t border-hairline pt-2">
        <dt className="text-graphite">{t.taxIncluded(formatPercent(gross.taxRate, locale))}</dt>
        <dd className="m-0 text-ash">{formatCurrency(gross.taxCents, locale)}</dd>
      </div>
    </dl>
  );
}
