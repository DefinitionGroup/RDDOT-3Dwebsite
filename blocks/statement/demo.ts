import type { BlockOf } from "@/blocks/types";
import { image, key, link } from "@/content/demo-helpers";

export function statementDemo(input: {
  anchor?: string;
  label?: string;
  statement: string;
  paragraphs?: string[];
  link?: { label: string; href: string };
  /** A file under /public/images with its pixel size. */
  image: { url: string; width: number; height: number; alt: string };
  caption?: string;
}): BlockOf<"statementBlock"> {
  return {
    _key: key("statement"),
    _type: "statementBlock",
    anchor: input.anchor,
    label: input.label,
    statement: input.statement,
    paragraphs: input.paragraphs,
    link: input.link ? link(input.link.label, input.link.href) : undefined,
    image: image(input.image.url, input.image, input.image.alt),
    caption: input.caption
  };
}
