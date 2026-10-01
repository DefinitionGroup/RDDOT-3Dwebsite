import type { BlockOf } from "@/blocks/types";
import { decorativeImage, file, key, link } from "@/content/demo-helpers";

export function heroFilmDemo(input: {
  anchor?: string;
  eyebrow?: string;
  headline: string;
  summary?: string;
  primaryCta?: { label: string; href: string };
  filmButtonLabel?: string;
  badge?: string;
  /** Files under /public/video and the poster under /public/images. */
  film: { desktop: string; mobile?: string; poster: string };
}): BlockOf<"heroFilmBlock"> {
  return {
    _key: key("hero-film"),
    _type: "heroFilmBlock",
    anchor: input.anchor,
    eyebrow: input.eyebrow,
    headline: input.headline,
    summary: input.summary,
    primaryCta: input.primaryCta ? link(input.primaryCta.label, input.primaryCta.href) : undefined,
    filmButtonLabel: input.filmButtonLabel,
    badge: input.badge,
    film: {
      desktop: file(input.film.desktop),
      mobile: input.film.mobile ? file(input.film.mobile) : null,
      poster: decorativeImage(input.film.poster, { width: 1920, height: 1080 })
    }
  };
}
