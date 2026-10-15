"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";
import { LOCALE_TITLES } from "@/lib/i18n";
import type { LanguageLink } from "@/lib/language-links";
import { DURATION, SIGNATURE_EASE } from "@/lib/motion";

type LanguageSwitchProps = {
  links: LanguageLink[];
  /** Interface words in the page's language. */
  labels: { nav: string; current: (name: string) => string };
  /**
   * `bar`: the current language as a small button in the header bar, the
   * list opening below it. `sheet`: larger, in the phone menu, the list
   * opening above it because the switch sits at the foot of the sheet.
   */
  variant?: "bar" | "sheet";
  className?: string;
  onNavigate?: () => void;
};

function Dot() {
  return <span aria-hidden="true" className="size-1.5 shrink-0 rounded-pill bg-signature" />;
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={`transition-transform duration-state ease-signature ${open ? "rotate-180" : ""}`}
      fill="none"
      height="10"
      viewBox="0 0 10 10"
      width="10"
    >
      <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeLinecap="round" strokeWidth="1.2" />
    </svg>
  );
}

/**
 * The language switch: a dropdown with the current language as its button
 * and every language, named in itself, in the list. The current language
 * carries the red dot, like an active segment. Plain links rather than
 * client navigation: switching reloads the page in the other locale's
 * layout. Escape, a click outside or a choice closes it.
 */
export function LanguageSwitch({ className = "", labels, links, onNavigate, variant = "bar" }: LanguageSwitchProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listId = useId();
  const prefersReducedMotion = useReducedMotion();
  const sheet = variant === "sheet";
  const current = links.find((link) => link.current) ?? links[0];

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      // The phone menu also closes on Escape; the open list closes first.
      event.stopImmediatePropagation();
      setOpen(false);
      buttonRef.current?.focus();
    };
    document.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey, { capture: true });
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey, { capture: true });
    };
  }, [open]);

  if (links.length < 2 || !current) return null;

  const rise = prefersReducedMotion ? 0 : sheet ? 6 : -6;

  return (
    <div className={`relative ${className}`} ref={rootRef}>
      <button
        aria-controls={listId}
        aria-expanded={open}
        aria-label={labels.current(LOCALE_TITLES[current.locale])}
        className={`inline-flex items-center gap-2 leading-none text-ink transition-colors duration-state ease-signature hover:text-porcelain ${
          sheet
            ? "min-h-12 rounded-pill border border-hairline px-5 text-body"
            : "min-h-11 px-1.5 text-nav uppercase tracking-[0.04em]"
        }`}
        onClick={() => setOpen((value) => !value)}
        ref={buttonRef}
        type="button"
      >
        <Dot />
        {sheet ? LOCALE_TITLES[current.locale] : current.locale}
        <Chevron open={open} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.nav
            animate={{ opacity: 1, y: 0 }}
            aria-label={labels.nav}
            className={`absolute z-10 ${sheet ? "bottom-full left-0 mb-2" : "right-0 top-full mt-2"}`}
            exit={{ opacity: 0, y: rise }}
            id={listId}
            initial={{ opacity: 0, y: rise }}
            transition={{ duration: DURATION.state, ease: SIGNATURE_EASE }}
          >
            <ul
              className={`m-0 flex list-none flex-col rounded-card border border-hairline bg-charcoal p-1.5 shadow-[0_12px_40px_rgb(0_0_0/0.5)] ${
                sheet ? "min-w-56" : "min-w-40"
              }`}
            >
              {links.map((link) => (
                <li key={link.locale}>
                  <a
                    aria-current={link.current ? "true" : undefined}
                    className={`flex items-center justify-between gap-4 rounded-[6px] px-3 transition-colors duration-state ease-signature hover:bg-ink/10 ${
                      sheet ? "min-h-12 text-body" : "min-h-10 text-nav"
                    } ${link.current ? "text-ink" : "text-graphite hover:text-porcelain"}`}
                    href={link.href}
                    hrefLang={link.locale}
                    lang={link.locale}
                    onClick={() => {
                      setOpen(false);
                      onNavigate?.();
                    }}
                  >
                    {LOCALE_TITLES[link.locale]}
                    {link.current ? (
                      <Dot />
                    ) : (
                      <span className="text-caption uppercase tracking-[0.04em] text-ash">{link.locale}</span>
                    )}
                  </a>
                </li>
              ))}
            </ul>
          </motion.nav>
        )}
      </AnimatePresence>
    </div>
  );
}
