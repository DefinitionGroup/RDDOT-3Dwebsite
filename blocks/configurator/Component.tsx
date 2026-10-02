import { stegaClean } from "next-sanity";
import type { BlockProps } from "@/blocks/types";
import { presetPricing, presetState } from "@/features/configurator/catalog";
import { formatCurrency } from "@/features/configurator/product-definition";
import { CONFIG_QUERY_PARAM, encodeConfiguration } from "@/features/configurator/state-codec";
import { localizePath } from "@/lib/i18n";
import { getMessages } from "@/lib/messages";
import { imageFocus, imageUrl } from "@/sanity/lib/image";
import { ConfiguratorView } from "./configurator-view";

/**
 * Resolves the block's product on the server: the real indicative price of
 * its starting configuration and the link that opens it. An unknown product
 * keeps the editorial content and drops the price; the link then opens the
 * configurator's own default.
 */
export default function ConfiguratorBlock({ block, locale }: BlockProps<"configuratorBlock">) {
  const t = getMessages(locale).blocks;
  const configurePath = localizePath(locale, "/configure");
  // Keys are logic: in preview they carry stega markers that would never match.
  const productKey = stegaClean(block.productKey);
  const preset = { frontColorKey: stegaClean(block.startFront), cabinetColorKey: stegaClean(block.startCabinet) };
  const resolved = presetState(productKey, preset);
  const pricing = presetPricing(productKey, preset);
  if (!resolved) console.warn(`configuratorBlock: cannot resolve product "${productKey}" with its start finishes`);

  const hasPreset = Boolean(block.startFront || block.startCabinet);
  const href =
    resolved && hasPreset
      ? `${configurePath}?${CONFIG_QUERY_PARAM}=${encodeConfiguration(resolved.state)}`
      : configurePath;

  return (
    <ConfiguratorView
      anchor={block.anchor}
      body={block.body}
      counter={
        block.counterBefore || block.counterAfter
          ? { before: block.counterBefore, after: block.counterAfter }
          : null
      }
      cta={{ label: block.ctaLabel ?? t.configureNow, href }}
      explainer={
        block.explainerLabel
          ? {
              label: block.explainerLabel,
              title: block.explainerTitle,
              intro: block.explainerIntro,
              steps: (block.steps ?? []).map(({ _key, label, title, body }) => ({ key: _key, label, title, body }))
            }
          : null
      }
      headline={block.headline}
      image={{ src: imageUrl(block.image), alt: block.image.alt, position: imageFocus(block.image) }}
      label={block.label}
      labels={{ price: t.indicativePrice, decisions: t.decisions(block.stages?.length ?? 0) }}
      price={pricing ? formatCurrency(pricing.totalCents, locale) : null}
      priceNote={hasPreset ? t.indicativePricePreset : t.indicativePriceStandard}
      stages={(block.stages ?? []).map(({ _key, label, title, body }) => ({ key: _key, label, title, body }))}
    />
  );
}
