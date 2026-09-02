"use client";

import {
  formatCurrency,
  getLocalizedLabel
} from "@/features/configurator/product-definition";
import type { ConfiguratorQuote, LocaleCode } from "@/features/configurator/types";

function formatQuantity(key: string, quantity: number) {
  if (key === "island-worktop") {
    return `${quantity.toLocaleString("de-DE", { maximumFractionDigits: 1 })} m`;
  }
  return `${quantity} ×`;
}

/** How many rows the itemisation shows: the line items plus the two finish deltas. */
export function priceLineCount(quote: ConfiguratorQuote) {
  return quote.lineItems.length + 2;
}

/** The itemised quote: module counts, island units, the worktop, finish deltas, tax. */
export function PriceLines({ locale, quote }: { locale: LocaleCode; quote: ConfiguratorQuote }) {
  return (
    <dl className="tnum m-0 flex flex-col gap-2 text-caption">
      {quote.lineItems.map((item) => (
        <div className="flex justify-between gap-4" key={item.key}>
          <dt className="text-graphite">
            {getLocalizedLabel(item.label, locale)}
            <span className="ml-2 text-ash">
              {formatQuantity(item.key, item.quantity)} {formatCurrency(item.unitPriceCents, locale)}
            </span>
          </dt>
          <dd className="m-0 text-ink">{formatCurrency(item.totalCents, locale)}</dd>
        </div>
      ))}
      <div className="flex justify-between gap-4 border-t border-hairline pt-2">
        <dt className="text-graphite">Korpus-Finish</dt>
        <dd className="m-0 text-ink">{formatCurrency(quote.cabinetDeltaCents, locale)}</dd>
      </div>
      <div className="flex justify-between gap-4">
        <dt className="text-graphite">Front-Finish</dt>
        <dd className="m-0 text-ink">{formatCurrency(quote.frontDeltaCents, locale)}</dd>
      </div>
      <div className="flex justify-between gap-4 border-t border-hairline pt-2">
        <dt className="text-graphite">Zwischensumme</dt>
        <dd className="m-0 text-ink">{formatCurrency(quote.subtotalCents, locale)}</dd>
      </div>
      <div className="flex justify-between gap-4">
        <dt className="text-graphite">MwSt. Indikator</dt>
        <dd className="m-0 text-ink">{formatCurrency(quote.taxCents, locale)}</dd>
      </div>
    </dl>
  );
}
