import type { BlockOf } from "@/blocks/types";
import { key, link } from "@/content/demo-helpers";

export function closingDemo(input: {
  anchor?: string;
  headline: string;
  body?: string;
  cta?: { label: string; href: string };
}): BlockOf<"closingBlock"> {
  return {
    _key: key("closing"),
    _type: "closingBlock",
    anchor: input.anchor,
    headline: input.headline,
    body: input.body,
    cta: input.cta ? link(input.cta.label, input.cta.href) : undefined
  };
}
