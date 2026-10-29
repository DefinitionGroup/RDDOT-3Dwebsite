"use client";

import { motion, useScroll, useTransform } from "motion/react";
import { Fragment, useRef } from "react";
import type { MotionValue } from "motion/react";
import { emphasisWords, type EmphasisSegment } from "@/lib/emphasis";

function Word({
  parts,
  progress,
  range
}: {
  parts: EmphasisSegment[];
  progress: MotionValue<number>;
  range: [number, number];
}) {
  const opacity = useTransform(progress, range, [0.16, 1]);
  return (
    <>
      <motion.span className="scroll-word inline-block" style={{ opacity }}>
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
 *
 * Reduced motion is honoured in CSS (`.scroll-word` in globals.css), not in
 * render: the server cannot know the preference, and a word rendered dim on
 * the server and lit in the browser stays dim, since React does not patch an
 * attribute that differs at hydration. The CSS also holds before scripts run.
 */
export function ScrollWords({ className = "", text }: { className?: string; text: string }) {
  const ref = useRef<HTMLHeadingElement>(null);
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
        />
      ))}
    </h2>
  );
}
