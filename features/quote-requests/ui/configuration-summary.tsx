import { Label } from "@/components/design-system/label";
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
 * confirmation: a charcoal card, one step above the void, read like a
 * document rather than a cart.
 */
export function ConfigurationSummary({
  heading = "Ihre Konfiguration",
  summary
}: {
  heading?: string;
  summary: ConfigurationSummaryData;
}) {
  return (
    <section
      aria-labelledby="configuration-summary-heading"
      className="rounded-card bg-charcoal p-6"
    >
      <Label as="span" className="block" >
        <span id="configuration-summary-heading">{heading}</span>
      </Label>
      <dl className="tnum m-0 mt-4 flex flex-col text-[0.875rem]">
        <Row label="Produkt" value={summary.productTitle} />
        <Row label="Aufbau" value={summary.layoutLabel} />
        <Row label="Korpus" value={summary.cabinetFinish} />
        <Row label="Front" value={summary.frontFinish} />
      </dl>

      <div className="tnum mt-6 flex flex-col gap-2 text-caption text-graphite">
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

      <div className="mt-5 flex items-baseline justify-between gap-6 border-t border-hairline pt-4">
        <Label as="span">Richtpreis</Label>
        <span className="tnum text-title font-display leading-none text-ink">
          {formatCurrency(summary.totalCents)}
        </span>
      </div>
      <p className="m-0 mt-3 text-caption text-ash">
        Unverbindliche Preisindikation zum Zeitpunkt der Anfrage. Ein Angebot
        erhalten Sie nach der Prüfung durch unsere Planung.
      </p>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-6 border-b border-hairline py-2.5">
      <dt className="font-label text-label uppercase tracking-label text-graphite">{label}</dt>
      <dd className="m-0 text-right text-ink">{value}</dd>
    </div>
  );
}
