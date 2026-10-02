import { MediaCard } from "@/components/design-system/card";
import { Emphasized } from "@/components/design-system/emphasized";
import { SectionIntro } from "@/components/design-system/label";
import { Pill } from "@/components/design-system/pill";
import { Reveal } from "@/components/design-system/reveal";
import type { BlockProps } from "@/blocks/types";
import { imageFocus, imageUrl } from "@/sanity/lib/image";

/** Product lines, one stance: cinematic cards side by side. */
export default function CollectionsBlock({ block }: BlockProps<"collectionsBlock">) {
  return (
    <section className="signature-container pt-20 md:pt-[120px]" id={block.anchor}>
      <Reveal>
        <SectionIntro label={block.label} title={<Emphasized text={block.headline} />} />
      </Reveal>
      <div className="mt-6 grid gap-3 md:mt-12 md:grid-cols-2 md:gap-4">
        {block.items?.map((item, index) => (
          <Reveal index={index} key={item._key}>
            <MediaCard
              action={
                item.link && (
                  <Pill className="hidden md:inline-flex" href={item.link.href} variant="secondary">
                    {item.link.label}
                  </Pill>
                )
              }
              alt={item.image.alt}
              badge={item.caption}
              body={item.body}
              image={imageUrl(item.image)}
              label={item.subtitle}
              position={imageFocus(item.image)}
              ratio="aspect-[4/5] md:aspect-[16/11]"
              shade="deep"
              sizes="(min-width: 768px) 50vw, 100vw"
              title={item.title}
              titleSize="title"
            />
          </Reveal>
        ))}
      </div>
    </section>
  );
}
