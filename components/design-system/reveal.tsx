"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
import { DURATION, REVEAL_RISE, SIGNATURE_EASE, STAGGER } from "@/lib/motion";

type RevealProps = {
  children: ReactNode;
  className?: string;
  /** Position among siblings; multiplied by the stagger. */
  index?: number;
  as?: "div" | "section" | "article" | "li";
};

/**
 * The one entrance on the site: a 12 px rise and fade, once, when a block
 * is 15 % in view. Reduced motion keeps the fade and drops the rise
 * (MotionProvider), so nothing sits hidden.
 */
export function Reveal({ as = "div", children, className, index = 0 }: RevealProps) {
  const Tag = motion[as];
  return (
    <Tag
      className={className}
      initial={{ opacity: 0, y: REVEAL_RISE }}
      transition={{ duration: DURATION.reveal, ease: SIGNATURE_EASE, delay: index * STAGGER }}
      viewport={{ once: true, amount: 0.15 }}
      whileInView={{ opacity: 1, y: 0 }}
    >
      {children}
    </Tag>
  );
}
