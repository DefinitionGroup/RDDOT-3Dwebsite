"use client";

import Link from "next/link";
import { Label } from "@/components/design-system/label";
import { formatCurrency } from "@/features/configurator/product-definition";
import { readPriceIndicationTotal } from "@/features/quote-requests/price-indication";
import { formatQuoteRequestReference } from "@/features/quote-requests/quote-request-reference";
import type { SerializedQuoteRequestPage } from "@/features/quote-requests/serialize-quote-request";
import { INTL_LOCALE, localizePath } from "@/lib/i18n";
import { useLocale, useMessages } from "@/lib/messages/locale-context";

/** The account's Quote Requests, newest first, as hairline rows. */
export function QuoteRequestList({ page }: { page: SerializedQuoteRequestPage }) {
  const locale = useLocale();
  const messages = useMessages();
  const t = messages.requestList;
  return (
    <section className="border-t border-ink pt-5">
      <div className="flex items-baseline justify-between gap-6">
        <h2 className="m-0 text-nav">{t.heading}</h2>
        <Label as="span">{t.count(page.totalCount)}</Label>
      </div>

      {page.quoteRequests.length === 0 ? (
        <p className="m-0 max-w-[40ch] py-8 text-body text-graphite">{t.empty}</p>
      ) : (
        <ul className="m-0 mt-2 list-none divide-y divide-hairline p-0">
          {page.quoteRequests.map((request) => {
            const total = readPriceIndicationTotal(request.priceIndication);
            return (
              <li
                className="grid min-w-0 gap-2 py-4 sm:grid-cols-[1fr_auto] sm:items-end"
                key={request.id}
              >
                <div className="min-w-0">
                  <p className="m-0 text-body font-label">
                    <Link
                      className="transition-colors duration-state ease-signature hover:text-porcelain"
                      href={localizePath(locale, `/configure?project=${request.projectId}`)}
                    >
                      {request.projectName}
                    </Link>
                  </p>
                  <p className="tnum m-0 mt-1 text-caption text-graphite">
                    <span className="tracking-[0.06em] text-ink">
                      {formatQuoteRequestReference(request.reference)}
                    </span>
                    {" · "}
                    {new Intl.DateTimeFormat(INTL_LOCALE[locale], {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric"
                    }).format(new Date(request.createdAt))}
                    {" · "}
                    {t.states[request.state]}
                  </p>
                </div>
                <span className="tnum text-caption text-graphite">
                  {total === null ? messages.common.priceUnavailable : t.price(formatCurrency(total, locale))}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      {page.nextCursor && (
        <p className="m-0 mt-3 text-caption text-ash">{t.older}</p>
      )}
    </section>
  );
}
