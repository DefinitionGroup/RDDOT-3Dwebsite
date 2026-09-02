import { MediaCard } from "@/components/design-system/card";
import { SectionIntro } from "@/components/design-system/label";
import { Pill } from "@/components/design-system/pill";
import { Reveal } from "@/components/design-system/reveal";
import { collections } from "@/lib/content";

/** Two lines, one stance: Agile and Exclusive Line as cinematic cards. */
export function CollectionLines() {
  return (
    <section className="signature-container pt-20 md:pt-[120px]" id="linien">
      <Reveal>
        <SectionIntro
          label="Linien"
          title={
            <>
              Zwei Linien. Eine <em>Haltung</em>.
            </>
          }
        />
      </Reveal>
      <div className="mt-6 grid gap-3 md:mt-12 md:grid-cols-2 md:gap-4">
        {collections.map((collection, index) => (
          <Reveal index={index} key={collection.id}>
            <MediaCard
              action={
                <Pill className="hidden md:inline-flex" href={collection.href} variant="secondary">
                  Linie entdecken
                </Pill>
              }
              alt={collection.alt}
              body={collection.body}
              image={collection.image}
              label={collection.subtitle}
              ratio="aspect-[4/5] md:aspect-[16/11]"
              shade="deep"
              sizes="(min-width: 768px) 50vw, 100vw"
              title={collection.title}
              titleSize="title"
            />
          </Reveal>
        ))}
      </div>
    </section>
  );
}
