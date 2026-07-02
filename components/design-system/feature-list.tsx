"use client";

import { motion } from "motion/react";
import type { Feature } from "@/lib/content";

type FeatureListProps = {
  features: Feature[];
};

export function FeatureList({ features }: FeatureListProps) {
  return (
    <div className="grid">
      {features.map((feature, index) => (
        <motion.article
          className="grid grid-cols-[0.75rem_1fr] gap-5 border-t border-hairline py-7 last:border-b"
          initial={{ opacity: 0, y: 12 }}
          key={feature.title}
          transition={{ delay: index * 0.05, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          viewport={{ once: true, amount: 0.35 }}
          whileInView={{ opacity: 1, y: 0 }}
        >
          <span className="mt-[0.45rem] block size-2 rounded-full bg-signature" />
          <div>
            <h3 className="text-body text-ink">{feature.title}</h3>
            <p className="mt-1.5 max-w-[34rem] text-pretty text-body text-graphite">
              {feature.body}
            </p>
          </div>
        </motion.article>
      ))}
    </div>
  );
}
