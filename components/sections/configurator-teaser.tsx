"use client";

import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { Card } from "@/components/design-system/card";
import { TemperatureCounter } from "@/components/design-system/counter";
import { Glass, GlassSegments } from "@/components/design-system/glass";
import { Label, SectionIntro } from "@/components/design-system/label";
import { Overlay } from "@/components/design-system/overlay";
import { Pill } from "@/components/design-system/pill";
import { Reveal } from "@/components/design-system/reveal";
import { configureHref, stages, steps } from "@/lib/content";
import type { Stage } from "@/lib/content";
import { DURATION, SIGNATURE_EASE } from "@/lib/motion";

type ConfiguratorTeaserProps = {
  /** The formatted price of the default configuration, from the product definition. */
  price: string;
  image: string;
  alt: string;
};

const CYCLE_MS = 3200;

/**
 * The configurator as a card with a living HUD: the three decisions cycle
 * over the scene until someone touches them; the price is the real one.
 */
export function ConfiguratorTeaser({ alt, image, price }: ConfiguratorTeaserProps) {
  const reduceMotion = useReducedMotion();
  const [stageId, setStageId] = useState<Stage["id"]>("material");
  const [paused, setPaused] = useState(false);
  const [explainerOpen, setExplainerOpen] = useState(false);

  useEffect(() => {
    if (reduceMotion || paused) return;
    const timer = window.setInterval(() => {
      setStageId((current) => {
        const index = stages.findIndex((stage) => stage.id === current);
        return stages[(index + 1) % stages.length].id;
      });
    }, CYCLE_MS);
    return () => window.clearInterval(timer);
  }, [paused, reduceMotion]);

  const stage = stages.find((entry) => entry.id === stageId) ?? stages[0];

  return (
    <section className="signature-container pt-20 md:pt-[120px]" id="konfigurator">
      <Reveal>
        <Card className="grid overflow-hidden lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <div className="relative order-first min-h-[240px] bg-canvas lg:order-last lg:min-h-[560px]">
            <Image
              alt={alt}
              className="object-cover"
              fill
              sizes="(min-width: 1024px) 58vw, 100vw"
              src={image}
            />
            <div aria-hidden="true" className="media-shade absolute inset-0" />
            <div className="absolute left-4 top-4 md:left-6 md:top-6">
              <GlassSegments
                activeId={stageId}
                ariaLabel="Die drei Entscheidungen"
                layoutGroup="teaser"
                onChange={(id) => {
                  setPaused(true);
                  setStageId(id as Stage["id"]);
                }}
                segments={stages.map(({ id, label }) => ({ id, label }))}
                size="card"
              />
            </div>
            <div className="absolute inset-x-4 bottom-4 flex items-end justify-between gap-4 md:inset-x-6 md:bottom-6">
              <div aria-live="polite" className="hidden min-h-12 max-w-[30ch] md:block">
                <AnimatePresence mode="wait">
                  <motion.p
                    animate={{ opacity: 1, y: 0 }}
                    className="m-0 text-nav font-base text-ink"
                    exit={{ opacity: 0, y: -6 }}
                    initial={{ opacity: 0, y: 6 }}
                    key={stage.id}
                    transition={{ duration: DURATION.accordion, ease: SIGNATURE_EASE }}
                  >
                    <span className="text-graphite">{stage.title}.</span> {stage.body}
                  </motion.p>
                </AnimatePresence>
              </div>
              <Glass className="inline-flex h-11 items-baseline gap-2.5 px-5">
                <Label as="span" className="tracking-badge">
                  Richtpreis
                </Label>
                <span className="tnum text-[1.125rem] font-display leading-none">{price}</span>
              </Glass>
            </div>
          </div>

          <div className="flex flex-col justify-between gap-8 p-6 md:p-10 lg:gap-12 lg:p-14">
            <div className="flex flex-col gap-5">
              <SectionIntro
                label="Konfigurator"
                title={
                  <>
                    Planen in 3D.
                    <br className="hidden lg:block" /> Speichern als <em>Projekt</em>.
                  </>
                }
              />
              <p className="m-0 max-w-[40ch] text-body text-graphite">
                Material, Aufbau, Prüfung — drei Entscheidungen, live in der Szene. Der Richtpreis
                folgt jeder Änderung; ein Projekt hält jeden Stand fest. Und wenn Sie mögen, macht
                die KI daraus ein Foto in Ihrem Raum.
              </p>
              <p className="m-0 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-hairline pt-5 text-body text-graphite">
                <span>Von 0 auf</span>
                <TemperatureCounter className="text-heading-lg font-display leading-none text-ink" />
                <span>in vier Klicks.</span>
              </p>
            </div>
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-3">
              <Pill className="w-full sm:w-auto" href={configureHref}>
                Jetzt konfigurieren
              </Pill>
              <Pill
                className="w-full sm:w-auto"
                onClick={() => setExplainerOpen(true)}
                variant="secondary"
              >
                So funktioniert es
              </Pill>
            </div>
          </div>
        </Card>
      </Reveal>

      <Overlay
        footer={
          <>
            <p className="tnum m-0 text-caption text-graphite">Richtpreis der Grundausstattung · {price}</p>
            <Pill href={configureHref}>Jetzt konfigurieren</Pill>
          </>
        }
        label="Konfigurator"
        onClose={() => setExplainerOpen(false)}
        open={explainerOpen}
        title={
          <>
            Vier <em>Klicks</em>.
          </>
        }
      >
        <p className="m-0 mt-4 max-w-[44ch] text-body text-graphite">
          Von der leeren Szene bis zur Anfrage an einen Planer — ohne Konto, ohne Formular, in
          Ihrem Tempo.
        </p>
        <ol className="m-0 mt-8 flex list-none flex-col p-0">
          {steps.map((entry, index) => (
            <li
              className="grid grid-cols-[2.5rem_1fr] gap-4 border-t border-hairline py-6 last:border-b"
              key={entry.label}
            >
              <span className="tnum text-title text-graphite">{index + 1}</span>
              <div className="flex flex-col gap-2">
                <Label>{entry.label}</Label>
                <h3 className="m-0 text-card">{entry.title}</h3>
                <p className="m-0 text-body text-graphite">{entry.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </Overlay>
    </section>
  );
}
