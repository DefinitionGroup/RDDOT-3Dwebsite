"use client";

import Image from "next/image";
import { motion } from "motion/react";
import type { CollectionStep as CollectionStepType } from "@/lib/content";

type CollectionStepProps = {
  step: CollectionStepType;
  index: number;
};

export function CollectionStep({ step, index }: CollectionStepProps) {
  return (
    <motion.a
      className="group relative flex min-w-[12rem] flex-col items-start gap-3 text-white md:min-w-0"
      href={step.href}
      initial={{ opacity: 1, y: 18 }}
      transition={{ delay: 0.5 + index * 0.08, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      viewport={{ once: true }}
      whileHover={{ y: -4 }}
      whileInView={{ opacity: 1, y: 0 }}
    >
      <span className="font-brand text-[2rem] font-light leading-none md:text-[2.65rem]">
        {step.number}
      </span>
      <span className="space-y-1">
        <span className="block text-[0.94rem] leading-[1.35]">{step.label}</span>
        <span className="block max-w-36 text-[0.72rem] font-medium leading-tight text-porcelain/82">
          {step.description}
        </span>
      </span>
      <span className="relative inline-flex min-h-9 items-center gap-2 bg-graphite px-3 text-[0.72rem] font-medium text-white transition-colors duration-300 group-hover:bg-ink">
        Unsere Line
        <span className="relative size-3">
          <Image alt="" fill src="/images/icon-arrow-up-right.svg" />
        </span>
        <span className="absolute bottom-0 right-0 size-3">
          <Image alt="" fill src="/images/icon-corner.svg" />
        </span>
      </span>
    </motion.a>
  );
}
