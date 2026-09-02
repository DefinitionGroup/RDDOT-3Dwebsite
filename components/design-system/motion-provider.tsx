"use client";

import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";
import { DURATION, SIGNATURE_EASE } from "@/lib/motion";

/**
 * One curve for every Motion animation, and the reduced-motion contract:
 * with `reducedMotion="user"` Motion drops transform and layout animations
 * for people who asked for less motion and keeps fades, so content is
 * always rendered in its final position.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <MotionConfig
      reducedMotion="user"
      transition={{ duration: DURATION.state, ease: SIGNATURE_EASE }}
    >
      {children}
    </MotionConfig>
  );
}
