import { Label } from "@/components/design-system/label";
import { formatCurrency } from "@/features/configurator/product-definition";
import { formatQuantity } from "@/features/configurator/format-quantity";
import type { Locale } from "@/lib/i18n";
import { getMessages } from "@/lib/messages";

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

/**
 * The configuration as the person will see it on the request and on the
 * confirmation: a charcoal card, one step above the void, read like a
 * document rather than a cart.
 */
export function ConfigurationSummary({
  heading,
  locale,
  summary
}: {
  heading?: string;
  locale: Locale;
  summary: ConfigurationSummaryData;
}) {
  const messages = getMessages(locale);
  const t = messages.requestSummary;
  const money = (cents: number) => formatCurrency(cents, locale);
  return (
    <section
      aria-labelledby="configuration-summary-heading"
      className="rounded-card bg-charcoal p-6"
    >
      <Label as="span" className="block" >
        <span id="configuration-summary-heading">{heading ?? t.heading}</span>
      </Label>
      <dl className="tnum m-0 mt-4 flex flex-col text-[0.875rem]">
        <Row label={t.product} value={summary.productTitle} />
        <Row label={t.layout} value={summary.layoutLabel} />
        <Row label={t.cabinet} value={summary.cabinetFinish} />
        <Row label={t.front} value={summary.frontFinish} />
      </dl>

      <div className="tnum mt-6 flex flex-col gap-2 text-caption text-graphite">
        {summary.lineItems.map((item) => (
          <div className="flex justify-between gap-6" key={item.key}>
            <span>
              {item.label} ({formatQuantity(item.key, item.quantity, locale)})
            </span>
            <span>{money(item.totalCents)}</span>
          </div>
        ))}
        <div className="flex justify-between gap-6">
          <span>{messages.priceLines.cabinetFinish}</span>
          <span>{money(summary.cabinetDeltaCents)}</span>
        </div>
        <div className="flex justify-between gap-6">
          <span>{messages.priceLines.frontFinish}</span>
          <span>{money(summary.frontDeltaCents)}</span>
        </div>
        <div className="flex justify-between gap-6">
          <span>{messages.priceLines.taxIncluded}</span>
          <span>{money(summary.taxCents)}</span>
        </div>
      </div>

      <div className="mt-5 flex items-baseline justify-between gap-6 border-t border-hairline pt-4">
        <Label as="span">{messages.common.indicativePrice}</Label>
        <span className="tnum text-title font-display leading-none text-ink">
          {money(summary.totalCents)}
        </span>
      </div>
      <p className="m-0 mt-3 text-caption text-ash">{t.disclaimer}</p>
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
