import { formatCurrency } from "@/features/configurator/product-definition";

/** Serializable description of the configuration a Quote Request is about. */
export type ConfigurationSummaryData = {
  productTitle: string;
  layoutLabel: string;
  cabinetFinish: string;
  frontFinish: string;
  lineItems: { key: string; label: string; quantity: number; totalCents: number }[];
  cabinetDeltaCents: number;
  frontDeltaCents: number;
  taxCents: number;
  totalCents: number;
  currency: string;
};

function formatQuantity(item: ConfigurationSummaryData["lineItems"][number]) {
  return item.key === "island-worktop"
    ? `${item.quantity.toLocaleString("de-DE", { maximumFractionDigits: 1 })} m`
    : `${item.quantity} ×`;
}

/**
 * The configuration as the person will see it on the request and on the
 * confirmation. Flat, hairline-separated, in the gallery system — no lifted
 * card, because this is a document, not a cart.
 */
export function ConfigurationSummary({
  heading = "Ihre Konfiguration",
  summary
}: {
  heading?: string;
  summary: ConfigurationSummaryData;
}) {
  return (
    <section aria-labelledby="configuration-summary-heading" className="border-t border-ink pt-5">
      <h2
        className="text-sm font-medium uppercase tracking-[0.14em] text-graphite"
        id="configuration-summary-heading"
      >
        {heading}
      </h2>
      <dl className="mt-5 space-y-3 text-body">
        <Row label="Produkt" value={summary.productTitle} />
        <Row label="Aufbau" value={summary.layoutLabel} />
        <Row label="Korpus" value={summary.cabinetFinish} />
        <Row label="Front" value={summary.frontFinish} />
      </dl>

      <div className="mt-8 space-y-2 text-sm text-graphite">
        {summary.lineItems.map((item) => (
          <div className="flex justify-between gap-6" key={item.key}>
            <span>
              {item.label} ({formatQuantity(item)})
            </span>
            <span>{formatCurrency(item.totalCents)}</span>
          </div>
        ))}
        <div className="flex justify-between gap-6">
          <span>Korpus-Finish</span>
          <span>{formatCurrency(summary.cabinetDeltaCents)}</span>
        </div>
        <div className="flex justify-between gap-6">
          <span>Front-Finish</span>
          <span>{formatCurrency(summary.frontDeltaCents)}</span>
        </div>
        <div className="flex justify-between gap-6">
          <span>enthaltene MwSt.</span>
          <span>{formatCurrency(summary.taxCents)}</span>
        </div>
      </div>

      <div className="mt-5 flex items-end justify-between gap-6 border-t border-hairline pt-4">
        <span className="text-body text-graphite">Richtpreis</span>
        <span className="text-lead font-semibold text-ink">
          {formatCurrency(summary.totalCents)}
        </span>
      </div>
      <p className="mt-3 text-xs leading-5 text-graphite">
        Unverbindliche Preisindikation zum Zeitpunkt der Anfrage. Ein Angebot
        erhalten Sie nach der Prüfung durch unsere Planung.
      </p>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-6 border-b border-hairline pb-3">
      <dt className="text-graphite">{label}</dt>
      <dd className="text-right text-ink">{value}</dd>
    </div>
  );
}
