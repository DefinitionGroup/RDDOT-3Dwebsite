import { Emphasized } from "@/components/design-system/emphasized";
import { GlassBadge } from "@/components/design-system/glass";
import { Label, SectionIntro } from "@/components/design-system/label";
import { Pill } from "@/components/design-system/pill";
import { Reveal } from "@/components/design-system/reveal";
import { SanityImage } from "@/components/sanity-image";
import type { BlockProps } from "@/blocks/types";

/** "Ihr Raum. Ihre Küche." — the ways to see a configuration before it exists. */
export default function RoomStoryBlock({ block }: BlockProps<"roomStoryBlock">) {
  return (
    <section className="signature-container pt-20 md:pt-[120px]" id={block.anchor}>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-end lg:gap-20">
        <div className="flex flex-col gap-8">
          <Reveal>
            <SectionIntro label={block.label} title={<Emphasized text={block.headline} />} />
            {block.lead && <p className="m-0 mt-6 max-w-[42ch] text-body text-graphite">{block.lead}</p>}
          </Reveal>
          <Reveal>
            {block.features?.length ? (
              <dl className="m-0 flex flex-col border-t border-ink">
                {block.features.map((feature) => (
                  <div
                    className="grid gap-2 border-b border-hairline py-4 md:grid-cols-[7.5rem_minmax(0,1fr)] md:gap-4"
                    key={feature._key}
                  >
                    <dt>
                      <Label as="span">{feature.label}</Label>
                    </dt>
                    <dd className="m-0">
                      <p className="m-0 text-body font-label">{feature.title}</p>
                      {feature.body && <p className="m-0 mt-1 text-caption text-graphite">{feature.body}</p>}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : null}
            {block.cta && (
              <Pill className="mt-8" href={block.cta.href} variant="secondary">
                {block.cta.label}
              </Pill>
            )}
          </Reveal>
        </div>
        <Reveal>
          <figure className="m-0">
            <div className="relative aspect-[16/10] overflow-hidden rounded-card bg-charcoal">
              <SanityImage
                className="object-cover"
                fill
                image={block.image}
                sizes="(min-width: 1024px) 60vw, 100vw"
              />
              {block.imageBadge && <GlassBadge className="absolute left-4 top-4">{block.imageBadge}</GlassBadge>}
            </div>
            {block.caption && <figcaption className="mt-3 text-caption text-graphite">{block.caption}</figcaption>}
          </figure>
        </Reveal>
      </div>
    </section>
  );
}
