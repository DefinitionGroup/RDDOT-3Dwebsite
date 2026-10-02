"use client";

import { useState } from "react";
import { Card } from "@/components/design-system/card";
import { DetailCard, DetailTrigger } from "@/components/design-system/detail-card";
import { Emphasized } from "@/components/design-system/emphasized";
import { Label, SectionIntro } from "@/components/design-system/label";
import { Pill } from "@/components/design-system/pill";
import { Reveal } from "@/components/design-system/reveal";
import type { BlockProps } from "@/blocks/types";

/** Promises as cards: material, technology, manufacturing, planning. Each opens its story. */
export default function PromisesBlock({ block }: BlockProps<"promisesBlock">) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const items = block.items ?? [];
  const open = items.find((item) => item._key === openKey) ?? null;

  return (
    <section className="signature-container pt-20 md:pt-[120px]" id={block.anchor}>
      <Reveal className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-end lg:gap-16">
        <SectionIntro label={block.label} title={<Emphasized text={block.headline} />} />
        {block.intro && <p className="m-0 max-w-[40ch] text-body text-graphite">{block.intro}</p>}
      </Reveal>
      <div className="mt-7 grid gap-3 md:mt-12 md:grid-cols-2 md:gap-4 xl:grid-cols-4">
        {items.map((item, index) => (
          <Reveal as="article" index={index} key={item._key}>
            <Card className="flex h-full min-h-[220px] flex-col justify-between gap-4 p-6 md:gap-8 md:p-7">
              <div className="flex items-start justify-between gap-4">
                <Label>{item.label}</Label>
                <DetailTrigger
                  id={item._key}
                  label={`Mehr zu ${item.title}`}
                  onOpen={() => setOpenKey(item._key)}
                  open={openKey === item._key}
                />
              </div>
              <div className="flex flex-col gap-2.5">
                <h3 className="m-0 text-card">{item.title}</h3>
                <p className="m-0 text-nav font-base text-graphite">{item.body}</p>
              </div>
            </Card>
          </Reveal>
        ))}
      </div>

      {open && (
        <DetailCard
          footer={
            <>
              <p className="m-0 text-caption text-graphite">{open.body}</p>
              {block.detailCta && (
                <Pill className="h-11" href={block.detailCta.href}>
                  {block.detailCta.label}
                </Pill>
              )}
            </>
          }
          id={open._key}
          label={open.label}
          onClose={() => setOpenKey(null)}
          open
          title={open.title}
        >
          {open.detail?.map((paragraph, index) => (
            <p className="m-0 text-body text-graphite" key={index}>
              {paragraph}
            </p>
          ))}
        </DetailCard>
      )}
    </section>
  );
}
