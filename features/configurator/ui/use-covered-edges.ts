"use client";

import { useLayoutEffect, useState, type RefObject } from "react";
import { UNCOVERED, type CoveredEdges } from "@/features/configurator/engine/visible-frame";

/**
 * On phones and tablets the controls above the scene and the camera row or
 * the Edit Session's bar below it cover the canvas. Measures how far, in CSS
 * pixels, from the elements inside `root` marked `data-covers="top"` or
 * `data-covers="bottom"`. An edge with no marked element keeps its last
 * value: the camera row hides while the sheet is expanded, and the framing
 * should not move behind the sheet. `layoutKey` names which controls are
 * mounted, so a change measures again.
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
      const reach = (edge: "top" | "bottom") =>
        [...element.querySelectorAll(`[data-covers="${edge}"]`)].map((marked) => {
          const rect = marked.getBoundingClientRect();
          return Math.round(edge === "top" ? rect.bottom - box.top : box.bottom - rect.top);
        });
      const tops = reach("top");
      const bottoms = reach("bottom");
      setEdges((previous) => {
        const top = tops.length > 0 ? Math.max(...tops) : previous.top;
        const bottom = bottoms.length > 0 ? Math.max(...bottoms) : previous.bottom;
        return top === previous.top && bottom === previous.bottom ? previous : { top, right: 0, bottom };
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
