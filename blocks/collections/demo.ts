import type { BlockOf } from "@/blocks/types";
import { image, key, link } from "@/content/demo-helpers";

export function collectionsDemo(input: {
  anchor?: string;
  label?: string;
  headline: string;
  items: {
    title: string;
    subtitle?: string;
    body?: string;
    link?: { label: string; href: string };
    image: { url: string; width: number; height: number; alt: string };
    caption?: string;
  }[];
}): BlockOf<"collectionsBlock"> {
  return {
    _key: key("collections"),
    _type: "collectionsBlock",
    anchor: input.anchor,
    label: input.label,
    headline: input.headline,
    items: input.items.map((item) => ({
      _key: key("collection"),
      _type: "collection",
      title: item.title,
      subtitle: item.subtitle,
      body: item.body,
      link: item.link ? link(item.link.label, item.link.href) : undefined,
      image: image(item.image.url, item.image, item.image.alt),
      caption: item.caption
    }))
  };
}
