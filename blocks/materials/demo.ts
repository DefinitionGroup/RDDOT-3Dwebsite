import type { BlockOf } from "@/blocks/types";
import { image, key, link } from "@/content/demo-helpers";

type MaterialItem = NonNullable<BlockOf<"materialsBlock">["items"]>[number];

type MaterialInput = {
  /** Doubles as the item's _key, so detail-card ids stay readable. */
  key: string;
  finishKey: MaterialItem["finishKey"];
  name: string;
  kind?: string;
  body?: string;
  image?: { url: string; width: number; height: number; alt: string; hotspot?: { x: number; y: number } };
  color?: string;
  colorAlt?: string;
  zoom?: number;
  detail?: string[];
  facts?: string[];
};

export function materialsDemo(input: {
  anchor?: string;
  productKey: BlockOf<"materialsBlock">["productKey"];
  label?: string;
  headline: string;
  intro?: string;
  items: MaterialInput[];
  cta?: { label: string; href: string };
  detailCtaLabel?: string;
}): BlockOf<"materialsBlock"> {
  return {
    _key: key("materials"),
    _type: "materialsBlock",
    anchor: input.anchor,
    productKey: input.productKey,
    label: input.label,
    headline: input.headline,
    intro: input.intro,
    items: input.items.map((item) => ({
      _key: item.key,
      _type: "material",
      finishKey: item.finishKey,
      name: item.name,
      kind: item.kind,
      body: item.body,
      image: item.image
        ? {
            ...image(item.image.url, item.image, item.image.alt),
            ...(item.image.hotspot
              ? { hotspot: { _type: "sanity.imageHotspot", ...item.image.hotspot, width: 1, height: 1 } }
              : {})
          }
        : null,
      color: item.color,
      colorAlt: item.colorAlt,
      zoom: item.zoom,
      detail: item.detail,
      facts: item.facts
    })),
    cta: input.cta ? link(input.cta.label, input.cta.href) : undefined,
    detailCtaLabel: input.detailCtaLabel
  };
}
