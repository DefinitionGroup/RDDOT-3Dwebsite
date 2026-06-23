"use client";

import Image from "next/image";
import { motion } from "motion/react";
import type { Variants } from "motion/react";
import { SignatureButton } from "@/components/design-system/button";
import { CollectionStep } from "@/components/design-system/collection-step";
import { heroSteps } from "@/lib/content";

const signatureEase: [number, number, number, number] = [0.22, 1, 0.36, 1];
const titleEase: [number, number, number, number] = [0.16, 1, 0.3, 1];

const heroCopy: Variants = {
  hidden: {},
  show: {
    transition: {
      delayChildren: 0.28,
      staggerChildren: 0.12
    }
  }
};

const revealUp: Variants = {
  hidden: {
    opacity: 0,
    y: 28,
    filter: "blur(10px)"
  },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      duration: 0.8,
      ease: signatureEase
    }
  }
};

const titleWord: Variants = {
  hidden: {
    opacity: 0,
    y: "112%",
    rotateX: -18,
    filter: "blur(12px)"
  },
  show: {
    opacity: 1,
    y: "0%",
    rotateX: 0,
    filter: "blur(0px)",
    transition: {
      duration: 0.95,
      ease: titleEase
    }
  }
};

const supportPhrase: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
    clipPath: "inset(0 100% 0 0)"
  },
  show: {
    opacity: 1,
    y: 0,
    clipPath: "inset(0 0% 0 0)",
    transition: {
      duration: 0.72,
      ease: signatureEase
    }
  }
};

const railReveal: Variants = {
  hidden: {
    opacity: 0,
    y: 34,
    filter: "blur(12px)"
  },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      delay: 1.18,
      duration: 0.88,
      ease: signatureEase
    }
  }
};

export function SignatureHero() {
  return (
    <section
      className="relative isolate min-h-[100svh] overflow-hidden rounded-b-hero bg-ink"
      id="top"
    >
      <motion.div
        animate={{ scale: 1.04, filter: "brightness(1)" }}
        className="absolute inset-0"
        initial={{ scale: 1.1, filter: "brightness(0.72)" }}
        transition={{ duration: 2.35, ease: signatureEase }}
      >
        <Image
          alt="Offene Signature Küche mit Insel, warmem Licht und Outdoor-Atmosphäre"
          className="object-cover"
          fill
          priority
          sizes="100vw"
          src="/images/signature-hero.png"
        />
      </motion.div>
      <div className="image-shade absolute inset-0" />

      <div className="relative z-10 flex min-h-[100svh] flex-col justify-end px-4 pb-7 pt-32 md:px-10 md:pb-12 md:pt-40">
        <div className="mx-auto flex w-full max-w-[1540px] flex-1 items-center">
          <motion.div
            className="max-w-5xl"
            initial="hidden"
            animate="show"
            variants={heroCopy}
          >
            <motion.p
              className="mb-4 text-xs font-medium uppercase tracking-[0.2em] text-ember"
              variants={revealUp}
            >
              Premium Küchen
            </motion.p>
            <motion.h1
              aria-label="rotpunkt Signature"
              className="text-balance font-brand text-[4rem] font-light leading-[0.96] text-white md:text-[5.75rem]"
              variants={{
                hidden: {},
                show: {
                  transition: {
                    staggerChildren: 0.16
                  }
                }
              }}
            >
              {["rotpunkt", "Signature"].map((word) => (
                <span
                  aria-hidden="true"
                  className="mr-[0.18em] inline-block overflow-hidden align-bottom [perspective:900px]"
                  key={word}
                >
                  <motion.span className="inline-block origin-bottom" variants={titleWord}>
                    {word}
                  </motion.span>
                </span>
              ))}
            </motion.h1>
            <motion.p
              aria-label="Von 0 auf 100°C in 4 Klicks."
              className="mt-5 flex max-w-[20rem] flex-wrap gap-x-2 gap-y-1 text-pretty font-brand text-[1.55rem] font-medium leading-[1.14] text-porcelain sm:max-w-2xl sm:text-[2rem] md:text-[2.75rem]"
              variants={{
                hidden: {},
                show: {
                  transition: {
                    staggerChildren: 0.1
                  }
                }
              }}
            >
              {["Von 0 auf 100°C", "in 4 Klicks."].map((phrase) => (
                <motion.span
                  aria-hidden="true"
                  className="inline-block"
                  key={phrase}
                  variants={supportPhrase}
                >
                  {phrase}
                </motion.span>
              ))}
            </motion.p>
            <motion.div className="mt-8 flex flex-wrap gap-3" variants={revealUp}>
              <SignatureButton href="/configure" tone="glass">
                Küche konfigurieren
              </SignatureButton>
              <SignatureButton href="#collections" tone="light">
                Collections ansehen
              </SignatureButton>
            </motion.div>
          </motion.div>
        </div>

        <motion.div
          animate="show"
          className="mx-auto w-full max-w-[1540px]"
          initial="hidden"
          variants={railReveal}
        >
          <div className="glass-surface flex gap-9 overflow-x-auto px-6 py-6 md:w-fit md:gap-20 md:px-14 md:py-9">
            {heroSteps.map((step, index) => (
              <CollectionStep index={index} key={step.number} step={step} />
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
