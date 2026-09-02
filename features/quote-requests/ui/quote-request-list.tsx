import Link from "next/link";
import { Label } from "@/components/design-system/label";
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

/** The account's Quote Requests, newest first, as hairline rows. */
export function QuoteRequestList({ page }: { page: SerializedQuoteRequestPage }) {
  return (
    <section className="border-t border-ink pt-5">
      <div className="flex items-baseline justify-between gap-6">
        <h2 className="m-0 text-nav">Anfragen</h2>
        <Label as="span">
          {page.totalCount === 1 ? "1 Anfrage" : `${page.totalCount} Anfragen`}
        </Label>
      </div>

      {page.quoteRequests.length === 0 ? (
        <p className="m-0 max-w-[40ch] py-8 text-body text-graphite">
          Noch keine Anfrage. Wenn ein Projekt so weit ist, fragen Sie es direkt aus dem
          Konfigurator an – der Stand bleibt dabei festgehalten.
        </p>
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
                      href={`/configure?project=${request.projectId}`}
                    >
                      {request.projectName}
                    </Link>
                  </p>
                  <p className="tnum m-0 mt-1 text-caption text-graphite">
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
                <span className="tnum text-caption text-graphite">
                  {total === null ? "Preis nicht verfügbar" : `Richtpreis ${formatCurrency(total)}`}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      {page.nextCursor && (
        <p className="m-0 mt-3 text-caption text-ash">
          Ältere Anfragen werden hier bald nachgeladen.
        </p>
      )}
    </section>
  );
}
