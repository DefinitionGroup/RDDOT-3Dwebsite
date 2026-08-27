"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import {
  formatCurrency,
  getLocalizedLabel
} from "@/features/configurator/product-definition";
import type { ConfiguratorQuote, LocaleCode } from "@/features/configurator/types";

type PriceBreakdownProps = {
  locale: LocaleCode;
  quote: ConfiguratorQuote;
};

function formatQuantity(key: string, quantity: number) {
  if (key === "island-worktop") {
    return `${quantity.toLocaleString("de-DE", { maximumFractionDigits: 1 })} m`;
  }
  return `${quantity} ×`;
}

export function PriceBreakdown({ locale, quote }: PriceBreakdownProps) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        aria-expanded={open}
        className="inline-flex min-h-9 items-center gap-2 text-body text-graphite transition-colors hover:text-ink"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span
          aria-hidden="true"
          className={`inline-block text-[0.6rem] transition-transform ${open ? "rotate-90" : ""}`}
        >
          ▶
        </span>
        Aufstellung
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            animate={{ height: "auto", opacity: 1 }}
            className="overflow-hidden"
            exit={{ height: 0, opacity: 0 }}
            initial={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <dl className="mt-3 space-y-2 border-t border-hairline pt-3 text-body">
              {quote.lineItems.map((item) => (
                <div className="flex justify-between gap-4" key={item.key}>
                  <dt className="text-graphite">
                    {getLocalizedLabel(item.label, locale)}
                    <span className="ml-2 tabular-nums text-graphite/70">
                      {formatQuantity(item.key, item.quantity)}{" "}
                      {formatCurrency(item.unitPriceCents, locale)}
                    </span>
                  </dt>
                  <dd className="tabular-nums text-ink">
                    {formatCurrency(item.totalCents, locale)}
                  </dd>
                </div>
              ))}
              <div className="flex justify-between gap-4 border-t border-hairline pt-2">
                <dt className="text-graphite">Korpus-Finish</dt>
                <dd className="tabular-nums text-ink">
                  {formatCurrency(quote.cabinetDeltaCents, locale)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-graphite">Front-Finish</dt>
                <dd className="tabular-nums text-ink">
                  {formatCurrency(quote.frontDeltaCents, locale)}
                </dd>
              </div>
              <div className="flex justify-between gap-4 border-t border-hairline pt-2">
                <dt className="text-graphite">Zwischensumme</dt>
                <dd className="tabular-nums text-ink">
                  {formatCurrency(quote.subtotalCents, locale)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-graphite">MwSt. Indikator</dt>
                <dd className="tabular-nums text-ink">
                  {formatCurrency(quote.taxCents, locale)}
                </dd>
              </div>
            </dl>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
