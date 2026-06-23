"use client";

import { motion } from "motion/react";
import type { Feature } from "@/lib/content";

type FeatureListProps = {
  features: Feature[];
};

export function FeatureList({ features }: FeatureListProps) {
  return (
    <div className="grid gap-8">
      {features.map((feature, index) => (
        <motion.article
          className="grid grid-cols-[0.9rem_1fr] gap-4"
          initial={{ opacity: 1, y: 16 }}
          key={feature.title}
          transition={{ delay: index * 0.06, duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          viewport={{ once: true, amount: 0.35 }}
          whileInView={{ opacity: 1, y: 0 }}
        >
          <span className="mt-2 block size-3 rounded-full bg-signature" />
          <div>
            <h3 className="text-[1rem] font-medium text-ink">{feature.title}</h3>
            <p className="mt-2 max-w-[34rem] text-pretty text-[0.94rem] leading-[1.65] text-graphite">
              {feature.body}
            </p>
          </div>
        </motion.article>
      ))}
    </div>
  );
}
