"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";
import type { MotionValue } from "motion/react";

export type WordToken = { text: string; serif?: boolean };

function Word({
  children,
  progress,
  range,
  serif,
  still
}: {
  children: string;
  progress: MotionValue<number>;
  range: [number, number];
  serif?: boolean;
  still: boolean;
}) {
  const opacity = useTransform(progress, range, [0.16, 1]);
  return (
    <>
      <motion.span className="inline-block" style={still ? undefined : { opacity }}>
        {serif ? <em>{children}</em> : children}
      </motion.span>{" "}
    </>
  );
}

/**
 * The one scroll-linked sequence on the site: a statement whose words light
 * up as the reader reaches them. Opacity only; reduced motion shows it lit.
 */
export function ScrollWords({ className = "", tokens }: { className?: string; tokens: WordToken[] }) {
  const ref = useRef<HTMLHeadingElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.85", "end 0.45"]
  });
  const words = tokens.flatMap((token) =>
    token.text.split(" ").map((word) => ({ word, serif: token.serif }))
  );

  return (
    <h2 className={className} ref={ref}>
      {words.map((entry, index) => (
        <Word
          key={`${entry.word}-${index}`}
          progress={scrollYProgress}
          range={[index / words.length, (index + 1) / words.length]}
          serif={entry.serif}
          still={Boolean(reduceMotion)}
        >
          {entry.word}
        </Word>
      ))}
    </h2>
  );
}
