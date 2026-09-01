import type { Metadata } from "next";
import { AppHeader } from "@/components/design-system/app-header";
import {
  findFinish,
  formatCurrency,
  getConfiguratorQuote,
  getLocalizedLabel,
  RDTD_KITCHEN_PRODUCT_V2
} from "@/features/configurator/product-definition";
import { CONFIG_QUERY_PARAM, getInitialConfiguratorState } from "@/features/configurator/state-codec";

export const metadata: Metadata = {
  title: "Fake Checkout | rotpunkt Signature",
  description: "Prototype checkout handoff for a shared kitchen configuration."
};

type CheckoutPageProps = {
  searchParams: Promise<{
    [CONFIG_QUERY_PARAM]?: string | string[];
  }>;
};

export default async function CheckoutPage({ searchParams }: CheckoutPageProps) {
  const params = await searchParams;
  const config = getInitialConfiguratorState(params[CONFIG_QUERY_PARAM]);
  const cabinetColor = findFinish(RDTD_KITCHEN_PRODUCT_V2.cabinetColors, config.cabinetColorKey);
  const frontColor = findFinish(RDTD_KITCHEN_PRODUCT_V2.frontColors, config.frontColorKey);
  const quote = getConfiguratorQuote(config);

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#f6f2ec_0%,#ede6dd_46%,#fff_100%)] px-4 py-5 text-ink md:px-8 md:py-8">
      <AppHeader
        action={{
          href: `/configure?${CONFIG_QUERY_PARAM}=${params[CONFIG_QUERY_PARAM] ?? ""}`,
          label: "Konfiguration ändern"
        }}
        className="mx-auto max-w-6xl"
      />

      <section className="mx-auto mt-16 grid max-w-6xl gap-10 lg:grid-cols-[1fr_26rem] lg:items-start">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-signature">
            Fake Checkout
          </p>
          <h1 className="mt-5 max-w-4xl font-editorial text-[clamp(3rem,9vw,7.2rem)] leading-[0.88]">
            Anfrage für deine Signature Küche.
          </h1>
          <p className="mt-6 max-w-2xl text-pretty text-base leading-7 text-graphite">
            Dieser Schritt ist bewusst noch kein echter Checkout. Er testet den
            späteren Übergang von Konfiguration zu Bestellung, Quote oder Warenkorb.
          </p>

          <form className="mt-10 grid max-w-2xl gap-3 md:grid-cols-2">
            <input
              className="min-h-12 border border-ink/10 bg-white/72 px-4 text-sm outline-none transition-colors placeholder:text-graphite/70 focus:border-ink"
              placeholder="Name"
              type="text"
            />
            <input
              className="min-h-12 border border-ink/10 bg-white/72 px-4 text-sm outline-none transition-colors placeholder:text-graphite/70 focus:border-ink"
              placeholder="E-Mail"
              type="email"
            />
            <textarea
              className="min-h-32 border border-ink/10 bg-white/72 px-4 py-3 text-sm outline-none transition-colors placeholder:text-graphite/70 focus:border-ink md:col-span-2"
              placeholder="Notiz zur Planung"
            />
            <button
              className="min-h-12 bg-signature px-5 text-sm font-semibold text-white md:col-span-2"
              type="button"
            >
              Anfrage vorbereiten
            </button>
          </form>
        </div>

        <aside className="bg-paper/86 p-5 shadow-lift backdrop-blur-xl">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-graphite">
            Konfiguration
          </h2>
          <dl className="mt-5 space-y-4 text-sm">
            <div className="flex justify-between gap-6 border-b border-ink/10 pb-3">
              <dt className="text-graphite">Produkt</dt>
              <dd className="text-right font-medium">{getLocalizedLabel(RDTD_KITCHEN_PRODUCT_V2.title, "de")}</dd>
            </div>
            <div className="flex justify-between gap-6 border-b border-ink/10 pb-3">
              <dt className="text-graphite">Layout</dt>
              <dd className="text-right font-medium">Straight line</dd>
            </div>
            <div className="flex justify-between gap-6 border-b border-ink/10 pb-3">
              <dt className="text-graphite">Korpus</dt>
              <dd className="text-right font-medium">{getLocalizedLabel(cabinetColor.label, "de")}</dd>
            </div>
            <div className="flex justify-between gap-6 border-b border-ink/10 pb-3">
              <dt className="text-graphite">Front</dt>
              <dd className="text-right font-medium">{getLocalizedLabel(frontColor.label, "de")}</dd>
            </div>
          </dl>

          <div className="mt-8 space-y-2 text-sm">
            {quote.lineItems.map((item) => (
              <PriceRow
                key={item.key}
                label={`${getLocalizedLabel(item.label, "de")} (${
                  item.key === "island-worktop"
                    ? `${item.quantity.toLocaleString("de-DE", { maximumFractionDigits: 1 })} m`
                    : `${item.quantity} ×`
                })`}
                value={formatCurrency(item.totalCents)}
              />
            ))}
            <PriceRow label="Korpus Finish" value={formatCurrency(quote.cabinetDeltaCents)} />
            <PriceRow label="Front Finish" value={formatCurrency(quote.frontDeltaCents)} />
            <PriceRow label="MwSt. Indikator" value={formatCurrency(quote.taxCents)} />
            <div className="mt-4 flex items-end justify-between gap-6 border-t border-ink/15 pt-4">
              <span className="text-sm font-semibold">Gesamt</span>
              <span className="text-2xl font-semibold">{formatCurrency(quote.totalCents)}</span>
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}

function PriceRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-6 text-graphite">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
