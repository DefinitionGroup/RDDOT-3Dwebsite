import type { BlockProps } from "@/blocks/types";
import { presetPricing, presetState } from "@/features/configurator/catalog";
import { formatCurrency } from "@/features/configurator/product-definition";
import { CONFIG_QUERY_PARAM, encodeConfiguration } from "@/features/configurator/state-codec";
import { imageFocus, imageUrl } from "@/sanity/lib/image";
import { MaterialsView, type MaterialCard } from "./materials-view";

const CONFIGURE_PATH = "/configure";

/**
 * Resolves each card's finish against the configurator on the server: the
 * link opens the scene with that front, the line under it states the
 * surcharge. An unknown product or finish keeps the card but drops both.
 */
export default function MaterialsBlock({ block }: BlockProps<"materialsBlock">) {
  const cards: MaterialCard[] = (block.items ?? []).map((item) => {
    const preset = { frontColorKey: item.finishKey };
    const resolved = presetState(block.productKey, preset);
    const pricing = presetPricing(block.productKey, preset);
    if (!resolved) console.warn(`materialsBlock: no finish "${item.finishKey}" in product "${block.productKey}"`);

    return {
      key: item._key,
      name: item.name,
      kind: item.kind,
      body: item.body,
      image: imageUrl(item.image),
      alt: item.image?.alt ?? item.colorAlt ?? item.name,
      position: imageFocus(item.image),
      zoom: item.zoom,
      color: item.image ? undefined : item.color,
      detail: item.detail ?? [],
      facts: item.facts ?? [],
      href: resolved ? `${CONFIGURE_PATH}?${CONFIG_QUERY_PARAM}=${encodeConfiguration(resolved.state)}` : null,
      price: pricing
        ? pricing.frontDeltaCents === 0
          ? "In der Grundausstattung enthalten"
          : `Aufpreis ${formatCurrency(pricing.frontDeltaCents)}`
        : null
    };
  });

  return (
    <MaterialsView
      anchor={block.anchor}
      cards={cards}
      cta={block.cta}
      detailCtaLabel={block.detailCtaLabel}
      headline={block.headline}
      intro={block.intro}
      label={block.label}
    />
  );
}
