"use client";

import { useState } from "react";
import { Card } from "@/components/design-system/card";
import { DetailCard, DetailTrigger } from "@/components/design-system/detail-card";
import { Label, SectionIntro } from "@/components/design-system/label";
import { Pill } from "@/components/design-system/pill";
import { Reveal } from "@/components/design-system/reveal";
import { configureHref, signatureFeatures } from "@/lib/content";

/** The four promises: material, technology, manufacturing, planning. Each opens its story. */
export function SignaturePromises() {
  const [openId, setOpenId] = useState<string | null>(null);
  const open = signatureFeatures.find((feature) => feature.id === openId) ?? null;

  return (
    <section className="signature-container pt-20 md:pt-[120px]" id="signature">
      <Reveal className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-end lg:gap-16">
        <SectionIntro
          label="Signature"
          title={
            <>
              Vier Entscheidungen.
              <br className="hidden lg:block" /> Ein <em>Zuhause</em>.
            </>
          }
        />
        <p className="m-0 max-w-[40ch] text-body text-graphite">
          Kein Katalog, keine tausend Optionen. Material, Aufbau, Prüfung und ein Planer, der
          weiterdenkt, wo der Konfigurator aufhört.
        </p>
      </Reveal>
      <div className="mt-7 grid gap-3 md:mt-12 md:grid-cols-2 md:gap-4 xl:grid-cols-4">
        {signatureFeatures.map((feature, index) => (
          <Reveal as="article" index={index} key={feature.id}>
            <Card className="flex h-full min-h-[220px] flex-col justify-between gap-4 p-6 md:gap-8 md:p-7">
              <div className="flex items-start justify-between gap-4">
                <Label>{feature.label}</Label>
                <DetailTrigger
                  id={feature.id}
                  label={`Mehr zu ${feature.title}`}
                  onOpen={() => setOpenId(feature.id)}
                  open={openId === feature.id}
                />
              </div>
              <div className="flex flex-col gap-2.5">
                <h3 className="m-0 text-card">{feature.title}</h3>
                <p className="m-0 text-nav font-base text-graphite">{feature.body}</p>
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
              <Pill className="h-11" href={configureHref}>
                Küche konfigurieren
              </Pill>
            </>
          }
          id={open.id}
          label={open.label}
          onClose={() => setOpenId(null)}
          open
          title={open.title}
        >
          {open.detail.map((paragraph) => (
            <p className="m-0 text-body text-graphite" key={paragraph.slice(0, 24)}>
              {paragraph}
            </p>
          ))}
        </DetailCard>
      )}
    </section>
  );
}
