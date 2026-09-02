import { SiteFooter } from "@/components/design-system/site-footer";
import { SiteHeader } from "@/components/design-system/site-header";
import { Ticker } from "@/components/design-system/ticker";
import { ClosingStatement } from "@/components/sections/closing-statement";
import { CollectionLines } from "@/components/sections/collection-lines";
import { ConfiguratorTeaser } from "@/components/sections/configurator-teaser";
import { Manifest } from "@/components/sections/manifest";
import { MaterialCards, type MaterialLink } from "@/components/sections/material-cards";
import { RoomStory } from "@/components/sections/room-story";
import { SignatureHero } from "@/components/sections/signature-hero";
import { SignaturePromises } from "@/components/sections/signature-promises";
import {
  DEFAULT_CONFIGURATOR_STATE,
  formatCurrency,
  getConfiguratorQuote,
  RDTD_KITCHEN_PRODUCT_V2
} from "@/features/configurator/product-definition";
import { CONFIG_QUERY_PARAM, encodeConfiguration } from "@/features/configurator/state-codec";
import { materials, tickerItems } from "@/lib/content";

export default function Home() {
  // The teaser shows the real price of the default configuration, never a typed number.
  const quote = getConfiguratorQuote(DEFAULT_CONFIGURATOR_STATE);

  // Every material card links into the configurator with that front already
  // chosen, and states its surcharge from the product definition.
  const materialLinks = Object.fromEntries(
    materials.map((material) => {
      const finish = RDTD_KITCHEN_PRODUCT_V2.frontColors.find(
        (option) => option.key === material.finishKey
      );
      const code = encodeConfiguration({
        ...DEFAULT_CONFIGURATOR_STATE,
        frontColorKey: material.finishKey
      });
      const delta = finish?.priceDeltaCents ?? 0;
      return [
        material.id,
        {
          href: `/configure?${CONFIG_QUERY_PARAM}=${code}`,
          price: delta === 0 ? "In der Grundausstattung enthalten" : `Aufpreis ${formatCurrency(delta)}`
        } satisfies MaterialLink
      ];
    })
  ) as Record<string, MaterialLink>;

  return (
    <>
      <SiteHeader />
      <main>
        <SignatureHero />
        <div className="mt-12 md:mt-16">
          <Ticker items={tickerItems} />
        </div>
        <Manifest />
        <SignaturePromises />
        <MaterialCards links={materialLinks} />
        <ConfiguratorTeaser
          alt="Signature Küche bei Abendlicht mit Glasfront und Holzdecke"
          image="/images/signature-detail.webp"
          price={formatCurrency(quote.totalCents)}
        />
        <RoomStory />
        <CollectionLines />
        <ClosingStatement />
      </main>
      <SiteFooter />
    </>
  );
}
