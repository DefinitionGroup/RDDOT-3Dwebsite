import type { BlockProps } from "@/blocks/types";
import { imageUrl } from "@/sanity/lib/image";
import { HeroFilmView } from "./hero-film-view";

/** Resolves the film's files and poster on the server; the view only plays them. */
export default function HeroFilmBlock({ block }: BlockProps<"heroFilmBlock">) {
  const desktop = block.film.desktop?.url;
  if (!desktop) return null;

  return (
    <HeroFilmView
      anchor={block.anchor}
      badge={block.badge}
      eyebrow={block.eyebrow}
      film={{
        desktop,
        mobile: block.film.mobile?.url,
        poster: imageUrl(block.film.poster, { width: 1920 })
      }}
      filmButtonLabel={block.filmButtonLabel}
      headline={block.headline}
      primaryCta={block.primaryCta}
      summary={block.summary}
    />
  );
}
