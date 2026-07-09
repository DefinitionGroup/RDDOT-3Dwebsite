"use client";

import Image from "next/image";
import { motion } from "motion/react";
import type { Variants } from "motion/react";
import { SignatureButton } from "@/components/design-system/button";
import { RedStop } from "@/components/design-system/section-heading";

const signatureEase: [number, number, number, number] = [0.22, 1, 0.36, 1];

const sequence: Variants = {
  hidden: {},
  show: {
    transition: {
      delayChildren: 0.2,
      staggerChildren: 0.12
    }
  }
};

const rise: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: signatureEase }
  }
};

export function SignatureHero() {
  return (
    <section className="pt-36 md:pt-48" id="top">
      <motion.div
        animate="show"
        className="signature-container"
        initial="hidden"
        variants={sequence}
      >
        <motion.p
          className="mb-8 text-body uppercase tracking-[0.22em] text-graphite"
          variants={rise}
        >
          Premium Küchen
        </motion.p>
        <motion.h1
          className="max-w-[16ch] text-balance text-display text-ink"
          variants={rise}
        >
          <RedStop text="Küchen, auf den Punkt." />
        </motion.h1>
        <motion.div
          className="mt-12 flex flex-col justify-between gap-8 md:mt-16 md:flex-row md:items-end"
          variants={rise}
        >
          <p className="max-w-[26rem] text-pretty text-lead text-graphite">
            Von 0 auf 100 °C in vier Klicks. Geplant in Ihrem Raum, gefertigt in
            Deutschland.
          </p>
          <div className="flex flex-wrap gap-3">
            <SignatureButton href="/configure">Küche konfigurieren</SignatureButton>
            <SignatureButton href="#collections" tone="light">
              Collections
            </SignatureButton>
          </div>
        </motion.div>
      </motion.div>

      <div className="signature-container mt-16 md:mt-24">
        <motion.figure
          animate={{ opacity: 1 }}
          className="m-0"
          initial={{ opacity: 0 }}
          transition={{ delay: 0.5, duration: 1, ease: signatureEase }}
        >
          <div className="relative aspect-[4/3] overflow-hidden bg-mist md:aspect-[21/10]">
            <motion.div
              animate={{ scale: 1 }}
              className="absolute inset-0"
              initial={{ scale: 1.07 }}
              transition={{ delay: 0.5, duration: 2.4, ease: signatureEase }}
            >
              <Image
                alt="Offene Signature Küche mit Insel und warmem Abendlicht"
                className="object-cover"
                fill
                priority
                sizes="100vw"
                src="/images/signature-hero.jpg"
              />
            </motion.div>
          </div>
          <figcaption className="mt-3 flex justify-between gap-6 text-body text-graphite">
            <span>Signature Küche — Exclusive Line</span>
            <span className="hidden md:block">Eiche, Feinstein, mattes Schwarz</span>
          </figcaption>
        </motion.figure>
      </div>
    </section>
  );
}
