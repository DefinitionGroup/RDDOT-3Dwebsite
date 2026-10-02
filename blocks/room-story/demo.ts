import type { BlockOf } from "@/blocks/types";
import { image, key, link } from "@/content/demo-helpers";

export function roomStoryDemo(input: {
  anchor?: string;
  label?: string;
  headline: string;
  lead?: string;
  features: { label: string; title: string; body?: string }[];
  cta?: { label: string; href: string };
  image: { url: string; width: number; height: number; alt: string };
  imageBadge?: string;
  caption?: string;
}): BlockOf<"roomStoryBlock"> {
  return {
    _key: key("room-story"),
    _type: "roomStoryBlock",
    anchor: input.anchor,
    label: input.label,
    headline: input.headline,
    lead: input.lead,
    features: input.features.map((feature) => ({ _key: key("room-feature"), _type: "roomFeature", ...feature })),
    cta: input.cta ? link(input.cta.label, input.cta.href) : undefined,
    image: image(input.image.url, input.image, input.image.alt),
    imageBadge: input.imageBadge,
    caption: input.caption
  };
}
