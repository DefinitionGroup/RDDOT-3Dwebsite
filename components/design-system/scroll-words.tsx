"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { Fragment, useRef } from "react";
import type { MotionValue } from "motion/react";
import { emphasisWords, type EmphasisSegment } from "@/lib/emphasis";

function Word({
  parts,
  progress,
  range,
  still
}: {
  parts: EmphasisSegment[];
  progress: MotionValue<number>;
  range: [number, number];
  still: boolean;
}) {
  const opacity = useTransform(progress, range, [0.16, 1]);
  return (
    <>
      <motion.span className="inline-block" style={still ? undefined : { opacity }}>
        {parts.map((part, index) =>
          part.serif ? <em key={index}>{part.text}</em> : <Fragment key={index}>{part.text}</Fragment>
        )}
      </motion.span>{" "}
    </>
  );
}

/**
 * The one scroll-linked sequence on the site: a statement whose words light
 * up as the reader reaches them. Opacity only; reduced motion shows it lit.
 * `text` marks its serif word with asterisks, like every editor headline.
 */
export function ScrollWords({ className = "", text }: { className?: string; text: string }) {
  const ref = useRef<HTMLHeadingElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.85", "end 0.45"]
  });
  const words = emphasisWords(text);

  return (
    <h2 className={className} ref={ref}>
      {words.map((parts, index) => (
        <Word
          key={index}
          parts={parts}
          progress={scrollYProgress}
          range={[index / words.length, (index + 1) / words.length]}
          still={Boolean(reduceMotion)}
        />
      ))}
    </h2>
  );
}
