import Image from "next/image";
import { GlassBadge } from "@/components/design-system/glass";
import { Label, SectionIntro } from "@/components/design-system/label";
import { Pill } from "@/components/design-system/pill";
import { Reveal } from "@/components/design-system/reveal";
import { configureHref, roomStory } from "@/lib/content";

/** "Ihr Raum. Ihre Küche." — the ways to see a configuration before it exists. */
export function RoomStory() {
  return (
    <section className="signature-container pt-20 md:pt-[120px]" id="raum">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-end lg:gap-20">
        <div className="flex flex-col gap-8">
          <Reveal>
            <SectionIntro
              label={roomStory.label}
              title={
                <>
                  Ihr Raum. Ihre <em>Küche</em>.
                </>
              }
            />
            <p className="m-0 mt-6 max-w-[42ch] text-body text-graphite">{roomStory.lead}</p>
          </Reveal>
          <Reveal>
            <dl className="m-0 flex flex-col border-t border-ink">
              {roomStory.features.map((feature) => (
                <div
                  className="grid gap-2 border-b border-hairline py-4 md:grid-cols-[7.5rem_minmax(0,1fr)] md:gap-4"
                  key={feature.label}
                >
                  <dt>
                    <Label as="span">{feature.label}</Label>
                  </dt>
                  <dd className="m-0">
                    <p className="m-0 text-body font-label">{feature.title}</p>
                    <p className="m-0 mt-1 text-caption text-graphite">{feature.body}</p>
                  </dd>
                </div>
              ))}
            </dl>
            <Pill className="mt-8" href={configureHref} variant="secondary">
              Im Konfigurator ansehen
            </Pill>
          </Reveal>
        </div>
        <Reveal>
          <figure className="m-0">
            <div className="relative aspect-[16/10] overflow-hidden rounded-card bg-charcoal">
              <Image
                alt={roomStory.alt}
                className="object-cover"
                fill
                sizes="(min-width: 1024px) 60vw, 100vw"
                src={roomStory.image}
              />
              <GlassBadge className="absolute left-4 top-4">Appartement</GlassBadge>
            </div>
            <figcaption className="mt-3 text-caption text-graphite">{roomStory.caption}</figcaption>
          </figure>
        </Reveal>
      </div>
    </section>
  );
}
