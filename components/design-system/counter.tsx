"use client";

import { motion, useInView, useReducedMotion, useSpring, useTransform } from "motion/react";
import { useEffect, useRef } from "react";

/**
 * "Von 0 auf 100 °C": the number climbs on a slow spring once it is in
 * view. The value lives in a MotionValue and is written straight to the
 * text node, so nothing re-renders per frame. Assistive technology reads the
 * final value once, in the page's language, instead of the climbing digits.
 */
export function TemperatureCounter({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { amount: 0.8, once: true });
  const reduceMotion = useReducedMotion();
  const value = useSpring(0, { stiffness: 26, damping: 15, mass: 1.1 });
  const rounded = useTransform(value, (latest) => Math.round(latest));

  useEffect(() => {
    if (!inView) return;
    if (reduceMotion) {
      value.jump(100);
      return;
    }
    value.set(100);
  }, [inView, reduceMotion, value]);

  return (
    <span className={`tnum ${className}`} ref={ref}>
      <span className="sr-only">100 °C</span>
      <motion.span aria-hidden="true">{rounded}</motion.span>
      <span aria-hidden="true"> °C</span>
    </span>
  );
}
