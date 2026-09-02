"use client";

import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import { DURATION, SIGNATURE_EASE } from "@/lib/motion";

type AccordionItemProps = {
  id: string;
  title: string;
  /** What the closed row states: a count, a code, two swatches. */
  summary?: ReactNode;
  open: boolean;
  onToggle: (id: string) => void;
  children: ReactNode;
};

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={`size-3.5 shrink-0 transition-transform duration-accordion ease-signature ${
        open ? "rotate-180 text-ink" : "text-graphite"
      }`}
      fill="none"
      viewBox="0 0 24 24"
    >
      <path d="M5 9l7 7 7-7" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
    </svg>
  );
}

/** The list frame: a white rule above, hairlines between. */
export function Accordion({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`flex flex-col border-t border-ink ${className}`}>{children}</div>;
}

/**
 * One row that opens. The only place on the site that animates height —
 * a 240 ms unfold is what an accordion is; everything else moves by transform.
 */
export function AccordionItem({ children, id, onToggle, open, summary, title }: AccordionItemProps) {
  const panelId = `accordion-${id}`;
  return (
    <div className="border-b border-hairline">
      <button
        aria-controls={panelId}
        aria-expanded={open}
        className="flex min-h-[52px] w-full items-center justify-between gap-4 text-left transition-colors duration-state ease-signature hover:text-porcelain"
        onClick={() => onToggle(id)}
        type="button"
      >
        <span className="text-nav">{title}</span>
        <span className="flex min-w-0 items-center gap-3.5">
          {summary && (
            <span className="tnum truncate text-caption font-base text-graphite">{summary}</span>
          )}
          <Chevron open={open} />
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            animate={{ height: "auto", opacity: 1 }}
            className="overflow-hidden"
            exit={{ height: 0, opacity: 0 }}
            id={panelId}
            initial={{ height: 0, opacity: 0 }}
            transition={{ duration: DURATION.accordion, ease: SIGNATURE_EASE }}
          >
            <div className="pb-5 pt-0.5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
