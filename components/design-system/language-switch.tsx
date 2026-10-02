"use client";

import { useEffect, useId, useRef, useState } from "react";
import { LOCALE_TITLES } from "@/lib/i18n";
import type { LanguageLink } from "@/lib/language-links";

type LanguageSwitchProps = {
  links: LanguageLink[];
  /** Interface words in the page's language. */
  labels: { nav: string; current: (name: string) => string };
  /**
   * `row`: DE · EN · ES in the header bar. `sheet`: the same, larger, in the
   * phone menu. `compact`: the current language opening the others, for
   * header widths where the row does not fit next to the links.
   */
  variant?: "row" | "sheet" | "compact";
  className?: string;
  onNavigate?: () => void;
};

const linkBase =
  "inline-flex items-center gap-1.5 uppercase leading-none tracking-[0.04em] transition-colors duration-state ease-signature hover:text-porcelain";

function Dot() {
  return <span aria-hidden="true" className="size-1.5 rounded-pill bg-signature" />;
}

/**
 * The language switch. The current language carries the red dot, like an
 * active segment; each language is named in itself. Plain links rather than
 * client navigation: switching reloads the page in the other locale's layout.
 */
export function LanguageSwitch({ className = "", labels, links, onNavigate, variant = "row" }: LanguageSwitchProps) {
  if (links.length < 2) return null;
  if (variant === "compact") return <CompactSwitch className={className} labels={labels} links={links} />;
  const size = variant === "sheet" ? "min-h-12 px-3 text-title" : "min-h-11 px-1.5 text-nav";

  return (
    <nav aria-label={labels.nav} className={className}>
      <ul className="m-0 flex list-none items-center gap-1 p-0">
        {links.map((link) => (
          <li key={link.locale}>
            <a
              aria-current={link.current ? "true" : undefined}
              aria-label={LOCALE_TITLES[link.locale]}
              className={`${linkBase} ${size} ${link.current ? "text-ink" : "text-graphite"}`}
              href={link.href}
              hrefLang={link.locale}
              lang={link.locale}
              onClick={onNavigate}
            >
              {link.current && <Dot />}
              {link.locale}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** The current language as a button; the others open beneath it. Escape or a click outside closes. */
function CompactSwitch({
  className,
  labels,
  links
}: {
  className: string;
  labels: LanguageSwitchProps["labels"];
  links: LanguageLink[];
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const current = links.find((link) => link.current) ?? links[0];

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className={`relative ${className}`} ref={rootRef}>
      <button
        aria-controls={listId}
        aria-expanded={open}
        aria-label={labels.current(LOCALE_TITLES[current.locale])}
        className={`${linkBase} min-h-11 px-1.5 text-nav text-ink`}
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <Dot />
        {current.locale}
        <svg aria-hidden="true" fill="none" height="10" viewBox="0 0 10 10" width="10">
          <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeLinecap="round" strokeWidth="1.2" />
        </svg>
      </button>
      {open && (
        <nav aria-label={labels.nav} className="absolute right-0 top-full mt-2" id={listId}>
          <ul className="m-0 flex min-w-36 list-none flex-col rounded-card border border-hairline bg-charcoal p-1.5 shadow-[0_12px_40px_rgb(0_0_0/0.5)]">
            {links.map((link) => (
              <li key={link.locale}>
                <a
                  aria-current={link.current ? "true" : undefined}
                  className={`flex min-h-10 items-center justify-between gap-4 rounded-[6px] px-3 text-nav transition-colors duration-state ease-signature hover:bg-ink/10 ${
                    link.current ? "text-ink" : "text-graphite hover:text-porcelain"
                  }`}
                  href={link.href}
                  hrefLang={link.locale}
                  lang={link.locale}
                >
                  {LOCALE_TITLES[link.locale]}
                  {link.current && <Dot />}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
