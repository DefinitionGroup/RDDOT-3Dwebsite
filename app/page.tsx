import { SiteFooter } from "@/components/design-system/site-footer";
import { SiteHeader } from "@/components/design-system/site-header";
import { ClosingStatement } from "@/components/sections/closing-statement";
import { CollectionLines } from "@/components/sections/collection-lines";
import { ConfiguratorTeaser } from "@/components/sections/configurator-teaser";
import { MaterialCards } from "@/components/sections/material-cards";
import { SignatureHero } from "@/components/sections/signature-hero";
import { SignaturePromises } from "@/components/sections/signature-promises";
import {
  DEFAULT_CONFIGURATOR_STATE,
  formatCurrency,
  getConfiguratorQuote
} from "@/features/configurator/product-definition";

export default function Home() {
  // The teaser shows the real price of the default configuration, never a typed number.
  const quote = getConfiguratorQuote(DEFAULT_CONFIGURATOR_STATE);

  return (
    <>
      <SiteHeader />
      <main>
        <SignatureHero />
        <SignaturePromises />
        <MaterialCards />
        <ConfiguratorTeaser
          alt="Signature Küche bei Abendlicht mit Glasfront und Holzdecke"
          image="/images/signature-detail.webp"
          price={formatCurrency(quote.totalCents)}
        />
        <CollectionLines />
        <ClosingStatement />
      </main>
      <SiteFooter />
    </>
  );
}
