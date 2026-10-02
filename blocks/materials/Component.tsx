import { stegaClean } from "next-sanity";
import type { BlockProps } from "@/blocks/types";
import { presetPricing, presetState } from "@/features/configurator/catalog";
import { formatCurrency } from "@/features/configurator/product-definition";
import { CONFIG_QUERY_PARAM, encodeConfiguration } from "@/features/configurator/state-codec";
import { localizePath } from "@/lib/i18n";
import { getMessages } from "@/lib/messages";
import { imageFocus, imageUrl } from "@/sanity/lib/image";
import { MaterialsView, type MaterialCard } from "./materials-view";

/**
 * Resolves each card's finish against the configurator on the server: the
 * link opens the scene with that front, the line under it states the
 * surcharge. An unknown product or finish keeps the card but drops both.
 */
export default function MaterialsBlock({ block, locale }: BlockProps<"materialsBlock">) {
  const t = getMessages(locale).blocks;
  const configurePath = localizePath(locale, "/configure");
  // Keys are logic: in preview they carry stega markers that would never match.
  const productKey = stegaClean(block.productKey);
  const cards: MaterialCard[] = (block.items ?? []).map((item) => {
    const preset = { frontColorKey: stegaClean(item.finishKey) };
    const resolved = presetState(productKey, preset);
    const pricing = presetPricing(productKey, preset);
    if (!resolved) console.warn(`materialsBlock: no finish "${preset.frontColorKey}" in product "${productKey}"`);

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
      href: resolved ? `${configurePath}?${CONFIG_QUERY_PARAM}=${encodeConfiguration(resolved.state)}` : null,
      detailLabel: t.moreAbout(item.name),
      price: pricing
        ? pricing.frontDeltaCents === 0
          ? t.includedAsStandard
          : t.surcharge(formatCurrency(pricing.frontDeltaCents, locale))
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
