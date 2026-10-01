import { Label } from "@/components/design-system/label";
import { Pill } from "@/components/design-system/pill";
import { Reveal } from "@/components/design-system/reveal";
import { ScrollWords } from "@/components/design-system/scroll-words";
import { SanityImage } from "@/components/sanity-image";
import type { BlockProps } from "@/blocks/types";

/**
 * A stance in one sentence: it lights up word by word as it is read — the
 * one scroll-linked sequence on the page — beside a picture.
 */
export default function StatementBlock({ block }: BlockProps<"statementBlock">) {
  return (
    <section className="signature-container pt-20 md:pt-[120px]" id={block.anchor}>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-start lg:gap-20">
        <Reveal>
          <figure className="m-0">
            <div className="relative aspect-[3/4] overflow-hidden rounded-card bg-charcoal md:aspect-[4/5]">
              <SanityImage
                className="object-cover"
                fill
                image={block.image}
                sizes="(min-width: 1024px) 52vw, 100vw"
              />
            </div>
            {block.caption && (
              <figcaption className="mt-3 text-caption text-graphite">{block.caption}</figcaption>
            )}
          </figure>
        </Reveal>

        <div className="flex flex-col gap-8 lg:sticky lg:top-32 lg:pt-6">
          {block.label && (
            <Reveal>
              <Label>{block.label}</Label>
            </Reveal>
          )}
          <ScrollWords className="m-0 max-w-[16ch] text-balance text-heading-lg" text={block.statement} />
          {(block.paragraphs?.length || block.link) && (
            <Reveal className="flex flex-col gap-5">
              {block.paragraphs?.map((paragraph, index) => (
                <p className="m-0 max-w-[46ch] text-body text-graphite" key={index}>
                  {paragraph}
                </p>
              ))}
              {block.link && (
                <div>
                  <Pill className="-ml-5" href={block.link.href} variant="ghost">
                    {block.link.label}
                  </Pill>
                </div>
              )}
            </Reveal>
          )}
        </div>
      </div>
    </section>
  );
}
