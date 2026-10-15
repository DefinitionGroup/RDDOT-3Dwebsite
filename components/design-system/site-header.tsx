"use client";

import Link from "next/link";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { BrandLogo } from "@/components/design-system/brand-logo";
import { LanguageSwitch } from "@/components/design-system/language-switch";
import { Pill, RoundButton } from "@/components/design-system/pill";
import type { SiteChrome } from "@/blocks/types";
import { localizePath, type Locale } from "@/lib/i18n";
import type { LanguageLink } from "@/lib/language-links";
import { getMessages } from "@/lib/messages";
import { DURATION, SIGNATURE_EASE, STAGGER } from "@/lib/motion";

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg aria-hidden="true" fill="none" height="16" viewBox="0 0 24 24" width="16">
      {open ? (
        <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
      ) : (
        <path d="M4 8h16M4 16h16" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
      )}
    </svg>
  );
}

/**
 * The marketing header: transparent over the film, frosted once the page
 * scrolls. The links and the ghost pill on desktop; on phones a round menu
 * button opens the same links as a full-screen sheet. Links come from the
 * locale's navigation document; the language dropdown appears, in the bar and
 * in the sheet, once more than one language can be opened.
 */
export function SiteHeader({
  chrome,
  languages = [],
  locale
}: {
  chrome: SiteChrome | null;
  languages?: LanguageLink[];
  locale: Locale;
}) {
  const t = getMessages(locale).header;
  const languageLabels = { nav: t.language, current: t.currentLanguage };
  const navItems = chrome?.items ?? [];
  const cta = chrome?.cta;
  const hasLanguages = languages.length > 1;
  const { scrollY } = useScroll();
  const [isScrolled, setIsScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useMotionValueEvent(scrollY, "change", (latest) => {
    setIsScrolled(latest > 24);
  });

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  useEffect(() => {
    if (!menuOpen) return;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenu();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [closeMenu, menuOpen]);

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 border-b transition-[background-color,border-color] duration-overlay ease-signature ${
          isScrolled
            ? "border-hairline bg-canvas/80 backdrop-blur-[20px]"
            : "border-transparent bg-transparent"
        }`}
      >
        <nav className="signature-container flex h-16 items-center justify-between lg:h-20">
          <BrandLogo href={localizePath(locale, "/")} label={t.home} />
          <div className="hidden items-center gap-7 lg:flex">
            {navItems.map((item) => (
              <Link
                className={`inline-flex min-h-11 items-center whitespace-nowrap px-1 text-nav leading-none transition-colors duration-state ease-signature hover:text-porcelain ${
                  item.quiet ? "text-graphite" : "text-ink"
                }`}
                href={item.href}
                key={item._key}
              >
                {item.label}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {/*
             * The language dropdown from lg on. Between lg and xl the bar cannot also
             * hold the action, so it steps aside there (the links and the page carry
             * it); from xl on everything fits.
             */}
            <LanguageSwitch className="mr-1 hidden lg:block" labels={languageLabels} links={languages} />
            {cta && (
              <Pill
                className={hasLanguages ? "hidden md:inline-flex lg:hidden xl:inline-flex" : "hidden md:inline-flex"}
                href={cta.href}
                variant="secondary"
              >
                {cta.label}
              </Pill>
            )}
            <RoundButton
              aria-controls="site-menu"
              aria-expanded={menuOpen}
              aria-label={menuOpen ? t.closeMenu : t.openMenu}
              className="lg:hidden"
              onClick={() => setMenuOpen((open) => !open)}
              ref={closeRef}
              tone="quiet"
            >
              <MenuIcon open={menuOpen} />
            </RoundButton>
          </div>
        </nav>
      </header>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-40 flex flex-col bg-canvas pt-16 lg:hidden"
            exit={{ opacity: 0 }}
            id="site-menu"
            initial={{ opacity: 0 }}
            transition={{ duration: DURATION.overlay, ease: SIGNATURE_EASE }}
          >
            <nav className="signature-container flex flex-1 flex-col justify-between py-10">
              <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {navItems.map((item, index) => (
                  <motion.li
                    animate={{ opacity: 1, y: 0 }}
                    initial={{ opacity: 0, y: 12 }}
                    key={item._key}
                    transition={{
                      duration: DURATION.reveal,
                      ease: SIGNATURE_EASE,
                      delay: index * STAGGER
                    }}
                  >
                    <Link
                      className={`inline-flex min-h-12 items-center text-title transition-colors duration-state ease-signature hover:text-porcelain ${
                        item.quiet ? "text-graphite" : "text-ink"
                      }`}
                      href={item.href}
                      onClick={closeMenu}
                    >
                      {item.label}
                    </Link>
                  </motion.li>
                ))}
              </ul>
              <div className="flex flex-col gap-6">
                <LanguageSwitch
                  labels={languageLabels}
                  links={languages}
                  onNavigate={closeMenu}
                  variant="sheet"
                />
                {cta && (
                  <Pill className="w-full" href={cta.href}>
                    {cta.label}
                  </Pill>
                )}
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
