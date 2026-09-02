"use client";

import { useState } from "react";
import { MediaCard } from "@/components/design-system/card";
import { DetailCard, DetailTrigger } from "@/components/design-system/detail-card";
import { Label, SectionIntro } from "@/components/design-system/label";
import { Pill } from "@/components/design-system/pill";
import { Reveal } from "@/components/design-system/reveal";
import { Tilt } from "@/components/design-system/tilt";
import { configureHref, materials } from "@/lib/content";
import type { Material } from "@/lib/content";

export type MaterialLink = {
  /** Opens the configurator with this front already chosen. */
  href: string;
  /** "inklusive" or the surcharge, from the product definition. */
  price: string;
};

/** Material as cards that lean toward the pointer and open their story; a band on phones. */
export function MaterialCards({ links }: { links: Record<string, MaterialLink> }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const open: Material | null = materials.find((material) => material.id === openId) ?? null;
  const openLink = open ? links[open.id] : null;

  return (
    <section className="pt-20 md:pt-[120px]" id="material">
      <Reveal className="signature-container grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-end lg:gap-16">
        <SectionIntro
          label="Material"
          title={
            <>
              Material, das <em>bleibt</em>.
            </>
          }
        />
        <p className="m-0 max-w-[40ch] text-body text-graphite">
          Oberflächen mit Patina, nicht mit Verschleiß. Vier Fronten und drei Korpusfarben — alle
          grifflos, alle zum Anfassen gedacht. Jede Karte erzählt, woraus sie ist.
        </p>
      </Reveal>
      <div className="mt-6 md:mt-12">
        <ul className="signature-container my-0 flex snap-x snap-mandatory list-none gap-3 overflow-x-auto p-0 pb-2 [scrollbar-width:none] md:grid md:grid-cols-2 md:gap-4 md:overflow-visible md:pb-0 xl:grid-cols-4 [&::-webkit-scrollbar]:hidden">
          {materials.map((material, index) => (
            <Reveal
              as="li"
              className="w-[280px] shrink-0 snap-start md:w-auto"
              index={index}
              key={material.id}
            >
              <Tilt>
                <MediaCard
                  action={
                    <DetailTrigger
                      id={`material-${material.id}`}
                      label={`Mehr zu ${material.name}`}
                      onOpen={() => setOpenId(material.id)}
                      open={openId === material.id}
                      tone="glass"
                    />
                  }
                  alt={material.alt}
                  badge={material.kind}
                  body={material.body}
                  color={material.color}
                  image={material.image}
                  position={material.position}
                  ratio="aspect-[4/5]"
                  shade={material.color ? "frame" : "media"}
                  sizes="(min-width: 1280px) 23vw, (min-width: 768px) 45vw, 280px"
                  title={material.name}
                />
              </Tilt>
            </Reveal>
          ))}
        </ul>
      </div>
      <div className="signature-container mt-6 md:mt-8">
        <Pill href={configureHref} variant="secondary">
          Alle Oberflächen im Konfigurator
        </Pill>
      </div>

      {open && (
        <DetailCard
          footer={
            <>
              <p className="tnum m-0 text-caption text-graphite">
                {openLink?.price ?? ""}
              </p>
              <Pill className="h-11" href={openLink?.href ?? configureHref}>
                In der Szene ansehen
              </Pill>
            </>
          }
          id={`material-${open.id}`}
          label={open.kind}
          onClose={() => setOpenId(null)}
          open
          title={open.name}
        >
          {open.detail.map((paragraph) => (
            <p className="m-0 text-body text-graphite" key={paragraph.slice(0, 24)}>
              {paragraph}
            </p>
          ))}
          <dl className="m-0 mt-1 flex flex-wrap gap-2">
            {open.facts.map((fact) => (
              <div
                className="inline-flex h-8 items-center rounded-pill border border-hairline px-3"
                key={fact}
              >
                <dd className="m-0">
                  <Label as="span" tone="ink" className="tracking-badge">
                    {fact}
                  </Label>
                </dd>
              </div>
            ))}
          </dl>
        </DetailCard>
      )}
    </section>
  );
}
