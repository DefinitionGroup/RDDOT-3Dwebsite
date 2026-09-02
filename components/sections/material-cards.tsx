import { MediaCard } from "@/components/design-system/card";
import { SectionIntro } from "@/components/design-system/label";
import { Pill } from "@/components/design-system/pill";
import { Reveal } from "@/components/design-system/reveal";
import { configureHref, materials } from "@/lib/content";

/** Material as cinematic cards; a horizontal band on phones. */
export function MaterialCards() {
  return (
    <section className="pt-20 md:pt-[120px]" id="material">
      <Reveal className="signature-container flex flex-col gap-6 md:flex-row md:items-end md:justify-between md:gap-16">
        <SectionIntro
          label="Material"
          title={
            <>
              Oberflächen mit <em>Patina</em>,
              <br className="hidden md:block" /> nicht mit Verschleiß.
            </>
          }
        />
        <Pill className="hidden md:inline-flex" href={configureHref} variant="secondary">
          Alle Oberflächen im Konfigurator
        </Pill>
      </Reveal>
      <div className="mt-6 md:mt-12">
        <ul className="signature-container my-0 flex snap-x snap-mandatory list-none gap-3 overflow-x-auto p-0 pb-2 [scrollbar-width:none] md:grid md:grid-cols-3 md:gap-4 md:overflow-visible md:pb-0 [&::-webkit-scrollbar]:hidden">
          {materials.map((material, index) => (
            <Reveal
              as="li"
              className="w-[280px] shrink-0 snap-start md:w-auto"
              index={index}
              key={material.id}
            >
              <MediaCard
                alt={material.alt}
                badge={material.kind}
                body={material.body}
                image={material.image}
                position={material.position}
                ratio="aspect-[4/5]"
                sizes="(min-width: 1024px) 30vw, 280px"
                title={material.name}
              />
            </Reveal>
          ))}
        </ul>
      </div>
      <div className="signature-container mt-6 md:hidden">
        <Pill className="w-full" href={configureHref} variant="secondary">
          Alle Oberflächen im Konfigurator
        </Pill>
      </div>
    </section>
  );
}
