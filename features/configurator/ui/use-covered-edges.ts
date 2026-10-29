"use client";

import { useLayoutEffect, useState, type RefObject } from "react";
import { UNCOVERED, type CoveredEdges } from "@/features/configurator/engine/visible-frame";

/**
 * On phones and tablets the controls above the scene and the camera row or
 * the Edit Session's bar below it cover the canvas, and on a phone held
 * sideways the Datenblatt card beside it. Measures how far, in CSS pixels,
 * from the elements inside `root` marked `data-covers="top"`, `"bottom"` or
 * `"right"`. A top or bottom edge with no marked element keeps its last
 * value: the camera row hides while the sheet is expanded, and the framing
 * should not move behind the sheet. The right edge is free once the card is
 * tucked away. `layoutKey` names which controls are mounted, so a change
 * measures again.
 */
export function useCoveredEdges(
  root: RefObject<HTMLElement | null>,
  active: boolean,
  layoutKey: string
): CoveredEdges {
  const [edges, setEdges] = useState<CoveredEdges>(UNCOVERED);

  useLayoutEffect(() => {
    const element = root.current;
    if (!active || !element) return;

    const measure = () => {
      const box = element.getBoundingClientRect();
      const reach = (edge: "top" | "bottom" | "right") =>
        [...element.querySelectorAll(`[data-covers="${edge}"]`)].map((marked) => {
          const rect = marked.getBoundingClientRect();
          if (edge === "top") return Math.round(rect.bottom - box.top);
          if (edge === "bottom") return Math.round(box.bottom - rect.top);
          return Math.round(box.right - rect.left);
        });
      const tops = reach("top");
      const bottoms = reach("bottom");
      const rights = reach("right");
      setEdges((previous) => {
        const top = tops.length > 0 ? Math.max(...tops) : previous.top;
        const bottom = bottoms.length > 0 ? Math.max(...bottoms) : previous.bottom;
        const right = rights.length > 0 ? Math.max(...rights) : 0;
        return top === previous.top && bottom === previous.bottom && right === previous.right
          ? previous
          : { top, right, bottom };
      });
    };

    measure();
    // The root follows the viewport (and with it the controls placed in svh);
    // the marked controls change size with their content.
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    element.querySelectorAll("[data-covers]").forEach((marked) => observer.observe(marked));
    return () => observer.disconnect();
  }, [active, layoutKey, root]);

  return active ? edges : UNCOVERED;
}
