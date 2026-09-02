import Image from "next/image";
import { Label } from "@/components/design-system/label";
import { Pill } from "@/components/design-system/pill";
import { Reveal } from "@/components/design-system/reveal";
import { ScrollWords } from "@/components/design-system/scroll-words";
import { manifest } from "@/lib/content";

/**
 * The stance, rescued from the first site: a kitchen is not furniture.
 * The statement lights up word by word as it is read — the one
 * scroll-linked sequence on the page — beside the evening picture.
 */
export function Manifest() {
  return (
    <section className="signature-container pt-20 md:pt-[120px]" id="haltung">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-start lg:gap-20">
        <Reveal>
          <figure className="m-0">
            <div className="relative aspect-[3/4] overflow-hidden rounded-card bg-charcoal md:aspect-[4/5]">
              <Image
                alt={manifest.alt}
                className="object-cover"
                fill
                sizes="(min-width: 1024px) 52vw, 100vw"
                src={manifest.image}
              />
            </div>
            <figcaption className="mt-3 text-caption text-graphite">{manifest.caption}</figcaption>
          </figure>
        </Reveal>

        <div className="flex flex-col gap-8 lg:sticky lg:top-32 lg:pt-6">
          <Reveal>
            <Label>{manifest.label}</Label>
          </Reveal>
          <ScrollWords
            className="m-0 max-w-[16ch] text-balance text-heading-lg"
            tokens={manifest.statement}
          />
          <Reveal className="flex flex-col gap-5">
            {manifest.paragraphs.map((paragraph) => (
              <p className="m-0 max-w-[46ch] text-body text-graphite" key={paragraph.slice(0, 24)}>
                {paragraph}
              </p>
            ))}
            <div>
              <Pill className="-ml-5" href="#signature" variant="ghost">
                Die vier Entscheidungen
              </Pill>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
