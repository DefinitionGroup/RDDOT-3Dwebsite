import type { BlockOf } from "@/blocks/types";
import { key, link } from "@/content/demo-helpers";

export function promisesDemo(input: {
  anchor?: string;
  label?: string;
  headline: string;
  intro?: string;
  /** `key` doubles as the item's _key, so detail-card ids stay readable. */
  items: { key: string; label: string; title: string; body: string; detail?: string[] }[];
  detailCta?: { label: string; href: string };
}): BlockOf<"promisesBlock"> {
  return {
    _key: key("promises"),
    _type: "promisesBlock",
    anchor: input.anchor,
    label: input.label,
    headline: input.headline,
    intro: input.intro,
    items: input.items.map(({ key: itemKey, ...item }) => ({ _key: itemKey, _type: "promise", ...item })),
    detailCta: input.detailCta ? link(input.detailCta.label, input.detailCta.href) : undefined
  };
}
