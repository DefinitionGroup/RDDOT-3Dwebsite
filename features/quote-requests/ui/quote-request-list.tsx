import Link from "next/link";
import { formatCurrency } from "@/features/configurator/product-definition";
import { readPriceIndicationTotal } from "@/features/quote-requests/price-indication";
import type { QuoteRequestState } from "@/features/quote-requests/quote-request-module";
import { formatQuoteRequestReference } from "@/features/quote-requests/quote-request-reference";
import type { SerializedQuoteRequestPage } from "@/features/quote-requests/serialize-quote-request";

const STATE_LABEL: Record<QuoteRequestState, string> = {
  submitted: "Eingegangen",
  "in-review": "In Prüfung",
  answered: "Beantwortet",
  withdrawn: "Zurückgezogen"
};

/** The account's Quote Requests, newest first, in the account's list style. */
export function QuoteRequestList({ page }: { page: SerializedQuoteRequestPage }) {
  return (
    <section className="border-t border-ink pt-5">
      <div className="flex items-baseline justify-between gap-6">
        <h2 className="text-lead">Anfragen</h2>
        <span className="text-sm text-graphite">
          {page.totalCount === 1 ? "1 Anfrage" : `${page.totalCount} Anfragen`}
        </span>
      </div>

      {page.quoteRequests.length === 0 ? (
        <p className="max-w-[40ch] py-10 text-body text-graphite">
          Noch keine Anfrage. Wenn ein Projekt so weit ist, fragen Sie es direkt
          aus dem Konfigurator an – der Stand bleibt dabei festgehalten.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-hairline border-b border-hairline">
          {page.quoteRequests.map((request) => {
            const total = readPriceIndicationTotal(request.priceIndication);
            return (
              <li
                className="grid min-w-0 gap-2 py-5 sm:grid-cols-[1fr_auto] sm:items-end"
                key={request.id}
              >
                <div className="min-w-0">
                  <p className="text-lead">
                    <Link
                      className="transition-colors hover:text-signature focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signature focus-visible:ring-offset-4 focus-visible:ring-offset-canvas"
                      href={`/configure?project=${request.projectId}`}
                    >
                      {request.projectName}
                    </Link>
                  </p>
                  <p className="mt-1 text-sm text-graphite">
                    <span className="tracking-[0.06em] text-ink">
                      {formatQuoteRequestReference(request.reference)}
                    </span>
                    {" · "}
                    {new Intl.DateTimeFormat("de-DE", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric"
                    }).format(new Date(request.createdAt))}
                    {" · "}
                    {STATE_LABEL[request.state]}
                  </p>
                </div>
                <span className="text-sm text-graphite">
                  {total === null ? "Preis nicht verfügbar" : `Richtpreis ${formatCurrency(total)}`}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      {page.nextCursor && (
        <p className="mt-3 text-xs text-graphite">
          Ältere Anfragen werden hier bald nachgeladen.
        </p>
      )}
    </section>
  );
}
