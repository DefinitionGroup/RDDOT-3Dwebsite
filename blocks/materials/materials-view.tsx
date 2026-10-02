"use client";

import { useState } from "react";
import { MediaCard } from "@/components/design-system/card";
import { DetailCard, DetailTrigger } from "@/components/design-system/detail-card";
import { Emphasized } from "@/components/design-system/emphasized";
import { Label, SectionIntro } from "@/components/design-system/label";
import { Pill } from "@/components/design-system/pill";
import { Reveal } from "@/components/design-system/reveal";
import { Tilt } from "@/components/design-system/tilt";

export type MaterialCard = {
  key: string;
  name: string;
  kind?: string;
  body?: string;
  image?: string;
  /** A plain colour instead of a photo: the lacquer. */
  color?: string;
  alt: string;
  position?: string;
  zoom?: number;
  detail: string[];
  facts: string[];
  /** Opens the configurator with this front chosen; null when the finish is unknown. */
  href: string | null;
  /** "In der Grundausstattung enthalten" or the surcharge, from the product definition. */
  price: string | null;
};

type MaterialsViewProps = {
  anchor?: string;
  label?: string;
  headline: string;
  intro?: string;
  cards: MaterialCard[];
  cta?: { label: string; href: string };
  detailCtaLabel?: string;
};

/** Material as cards that lean toward the pointer and open their story; a band on phones. */
export function MaterialsView({ anchor, cards, cta, detailCtaLabel, headline, intro, label }: MaterialsViewProps) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const open = cards.find((card) => card.key === openKey) ?? null;

  return (
    <section className="pt-20 md:pt-[120px]" id={anchor}>
      <Reveal className="signature-container grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-end lg:gap-16">
        <SectionIntro label={label} title={<Emphasized text={headline} />} />
        {intro && <p className="m-0 max-w-[40ch] text-body text-graphite">{intro}</p>}
      </Reveal>
      <div className="mt-6 md:mt-12">
        <ul className="signature-container my-0 flex snap-x snap-mandatory list-none gap-3 overflow-x-auto p-0 pb-2 [scrollbar-width:none] md:grid md:grid-cols-2 md:gap-4 md:overflow-visible md:pb-0 xl:grid-cols-4 [&::-webkit-scrollbar]:hidden">
          {cards.map((card, index) => (
            <Reveal as="li" className="w-[280px] shrink-0 snap-start md:w-auto" index={index} key={card.key}>
              <Tilt>
                <MediaCard
                  action={
                    <DetailTrigger
                      id={`material-${card.key}`}
                      label={`Mehr zu ${card.name}`}
                      onOpen={() => setOpenKey(card.key)}
                      open={openKey === card.key}
                      tone={card.color ? "dark" : "glass"}
                    />
                  }
                  alt={card.alt}
                  badge={card.kind}
                  body={card.body}
                  color={card.color}
                  image={card.image}
                  onLight={Boolean(card.color)}
                  position={card.position}
                  ratio="aspect-[4/5]"
                  sizes="(min-width: 1280px) 23vw, (min-width: 768px) 45vw, 280px"
                  title={card.name}
                  zoom={card.zoom}
                />
              </Tilt>
            </Reveal>
          ))}
        </ul>
      </div>
      {cta && (
        <div className="signature-container mt-6 md:mt-8">
          <Pill href={cta.href} variant="secondary">
            {cta.label}
          </Pill>
        </div>
      )}

      {open && (
        <DetailCard
          footer={
            <>
              <p className="tnum m-0 text-caption text-graphite">{open.price ?? ""}</p>
              {open.href && detailCtaLabel && (
                <Pill className="h-11" href={open.href}>
                  {detailCtaLabel}
                </Pill>
              )}
            </>
          }
          id={`material-${open.key}`}
          label={open.kind ?? open.name}
          onClose={() => setOpenKey(null)}
          open
          title={open.name}
        >
          {open.detail.map((paragraph, index) => (
            <p className="m-0 text-body text-graphite" key={index}>
              {paragraph}
            </p>
          ))}
          {open.facts.length > 0 && (
            <dl className="m-0 mt-1 flex flex-wrap gap-2">
              {open.facts.map((fact) => (
                <div className="inline-flex h-8 items-center rounded-pill border border-hairline px-3" key={fact}>
                  <dd className="m-0">
                    <Label as="span" tone="ink" className="tracking-badge">
                      {fact}
                    </Label>
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </DetailCard>
      )}
    </section>
  );
}
