"use client";

import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { Card } from "@/components/design-system/card";
import { TemperatureCounter } from "@/components/design-system/counter";
import { Emphasized } from "@/components/design-system/emphasized";
import { Glass, GlassSegments } from "@/components/design-system/glass";
import { Label, SectionIntro } from "@/components/design-system/label";
import { Overlay } from "@/components/design-system/overlay";
import { Pill } from "@/components/design-system/pill";
import { Reveal } from "@/components/design-system/reveal";
import { DURATION, SIGNATURE_EASE } from "@/lib/motion";

type Step = { key: string; label: string; title: string; body?: string };

type ConfiguratorViewProps = {
  anchor?: string;
  label?: string;
  headline: string;
  body?: string;
  counter: { before?: string; after?: string } | null;
  image: { src?: string; alt: string; position?: string };
  stages: Step[];
  cta: { label: string; href: string };
  /** The formatted indicative price of the starting configuration; null when the product is unknown. */
  price: string | null;
  priceNote: string;
  /** Interface words in the page's language. */
  labels: { price: string; decisions: string };
  explainer: { label: string; title?: string; intro?: string; steps: Step[] } | null;
};

const CYCLE_MS = 3200;

/**
 * The configurator as a card with a living HUD: the decisions cycle over the
 * scene until someone touches them; the price is the real one.
 */
export function ConfiguratorView({
  anchor,
  body,
  counter,
  cta,
  explainer,
  headline,
  image,
  label,
  labels,
  price,
  priceNote,
  stages
}: ConfiguratorViewProps) {
  const reduceMotion = useReducedMotion();
  const [stageKey, setStageKey] = useState(stages[0]?.key ?? "");
  const [paused, setPaused] = useState(false);
  const [explainerOpen, setExplainerOpen] = useState(false);

  useEffect(() => {
    if (reduceMotion || paused || stages.length < 2) return;
    const timer = window.setInterval(() => {
      setStageKey((current) => {
        const index = stages.findIndex((stage) => stage.key === current);
        return stages[(index + 1) % stages.length].key;
      });
    }, CYCLE_MS);
    return () => window.clearInterval(timer);
  }, [paused, reduceMotion, stages]);

  const stage = stages.find((entry) => entry.key === stageKey) ?? stages[0];

  return (
    <section className="signature-container pt-20 md:pt-[120px]" id={anchor}>
      <Reveal>
        <Card className="grid overflow-hidden lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <div className="relative order-first min-h-[240px] bg-canvas lg:order-last lg:min-h-[560px]">
            {image.src && (
              <Image
                alt={image.alt}
                className="object-cover"
                fill
                sizes="(min-width: 1024px) 58vw, 100vw"
                src={image.src}
                style={image.position ? { objectPosition: image.position } : undefined}
              />
            )}
            <div aria-hidden="true" className="media-shade absolute inset-0" />
            {stages.length > 0 && (
              <div className="absolute left-4 top-4 md:left-6 md:top-6">
                <GlassSegments
                  activeId={stageKey}
                  ariaLabel={labels.decisions}
                  layoutGroup="teaser"
                  onChange={(id) => {
                    setPaused(true);
                    setStageKey(id);
                  }}
                  segments={stages.map(({ key, label: segmentLabel }) => ({ id: key, label: segmentLabel }))}
                  size="card"
                />
              </div>
            )}
            <div className="absolute inset-x-4 bottom-4 flex items-end justify-between gap-4 md:inset-x-6 md:bottom-6">
              <div aria-live="polite" className="hidden min-h-12 max-w-[30ch] md:block">
                <AnimatePresence mode="wait">
                  {stage && (
                    <motion.p
                      animate={{ opacity: 1, y: 0 }}
                      className="m-0 text-nav font-base text-ink"
                      exit={{ opacity: 0, y: -6 }}
                      initial={{ opacity: 0, y: 6 }}
                      key={stage.key}
                      transition={{ duration: DURATION.accordion, ease: SIGNATURE_EASE }}
                    >
                      <span className="text-graphite">{stage.title}.</span> {stage.body}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
              {price && (
                <Glass className="inline-flex h-11 items-baseline gap-2.5 px-5">
                  <Label as="span" className="tracking-badge">
                    {labels.price}
                  </Label>
                  <span className="tnum text-[1.125rem] font-display leading-none">{price}</span>
                </Glass>
              )}
            </div>
          </div>

          <div className="flex flex-col justify-between gap-8 p-6 md:p-10 lg:gap-12 lg:p-14">
            <div className="flex flex-col gap-5">
              <SectionIntro label={label} title={<Emphasized text={headline} />} />
              {body && <p className="m-0 max-w-[40ch] text-body text-graphite">{body}</p>}
              {counter && (
                <p className="m-0 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-hairline pt-5 text-body text-graphite">
                  {counter.before && <span>{counter.before}</span>}
                  <TemperatureCounter className="text-heading-lg font-display leading-none text-ink" />
                  {counter.after && <span>{counter.after}</span>}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-3">
              <Pill className="w-full sm:w-auto" href={cta.href}>
                {cta.label}
              </Pill>
              {explainer && (
                <Pill className="w-full sm:w-auto" onClick={() => setExplainerOpen(true)} variant="secondary">
                  {explainer.label}
                </Pill>
              )}
            </div>
          </div>
        </Card>
      </Reveal>

      {explainer && (
        <Overlay
          footer={
            <>
              <p className="tnum m-0 text-caption text-graphite">{price ? `${priceNote} · ${price}` : ""}</p>
              <Pill href={cta.href}>{cta.label}</Pill>
            </>
          }
          label={label ?? explainer.label}
          onClose={() => setExplainerOpen(false)}
          open={explainerOpen}
          title={explainer.title ? <Emphasized text={explainer.title} /> : explainer.label}
        >
          {explainer.intro && <p className="m-0 mt-4 max-w-[44ch] text-body text-graphite">{explainer.intro}</p>}
          {explainer.steps.length > 0 && (
            <ol className="m-0 mt-8 flex list-none flex-col p-0">
              {explainer.steps.map((entry, index) => (
                <li
                  className="grid grid-cols-[2.5rem_1fr] gap-4 border-t border-hairline py-6 last:border-b"
                  key={entry.key}
                >
                  <span className="tnum text-title text-graphite">{index + 1}</span>
                  <div className="flex flex-col gap-2">
                    <Label>{entry.label}</Label>
                    <h3 className="m-0 text-card">{entry.title}</h3>
                    {entry.body && <p className="m-0 text-body text-graphite">{entry.body}</p>}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Overlay>
      )}
    </section>
  );
}
