"use client";

import { motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import type { PointerEvent, ReactNode } from "react";

/**
 * A card that leans toward the pointer — springs on transforms only, mouse
 * only (touch scrolls), nothing under reduced motion.
 */
export function Tilt({
  children,
  className = "",
  max = 5
}: {
  children: ReactNode;
  className?: string;
  max?: number;
}) {
  const reduceMotion = useReducedMotion();
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const springX = useSpring(rotateX, { stiffness: 220, damping: 24, mass: 0.6 });
  const springY = useSpring(rotateY, { stiffness: 220, damping: 24, mass: 0.6 });

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (reduceMotion || event.pointerType !== "mouse") return;
    const rect = event.currentTarget.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width - 0.5;
    const py = (event.clientY - rect.top) / rect.height - 0.5;
    rotateX.set(-py * max * 2);
    rotateY.set(px * max * 2);
  }

  function onPointerLeave() {
    rotateX.set(0);
    rotateY.set(0);
  }

  return (
    <motion.div
      className={className}
      onPointerLeave={onPointerLeave}
      onPointerMove={onPointerMove}
      style={{ rotateX: springX, rotateY: springY, transformPerspective: 1100 }}
      whileHover={reduceMotion ? undefined : { scale: 1.015 }}
    >
      {children}
    </motion.div>
  );
}
