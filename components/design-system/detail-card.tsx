"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useId, useRef, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { Label } from "@/components/design-system/label";
import { RoundButton } from "@/components/design-system/pill";
import { DURATION, SIGNATURE_EASE } from "@/lib/motion";

const morph = { type: "spring", stiffness: 280, damping: 32, mass: 0.9 } as const;

function PlusIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="14" viewBox="0 0 24 24" width="14">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="14" viewBox="0 0 24 24" width="14">
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
    </svg>
  );
}

/**
 * The small round "+" that a detail card grows out of. Shares its layoutId
 * with the card, so opening is one shape becoming another.
 */
export function DetailTrigger({
  id,
  label,
  onOpen,
  open,
  tone = "quiet"
}: {
  id: string;
  label: string;
  onOpen: () => void;
  open: boolean;
  tone?: "quiet" | "glass";
}) {
  return (
    <motion.button
      aria-expanded={open}
      aria-haspopup="dialog"
      aria-label={label}
      className={`inline-flex size-9 shrink-0 items-center justify-center text-ink transition-[background-color,border-color] duration-state ease-signature ${
        tone === "glass"
          ? "glass hover:bg-ink/[.14]"
          : "border border-hairline hover:border-ink"
      }`}
      layoutId={`detail-${id}`}
      onClick={onOpen}
      style={{ borderRadius: 9999 }}
      transition={morph}
      type="button"
    >
      <PlusIcon />
    </motion.button>
  );
}

/**
 * A detail card over the page. It morphs out of its trigger on a spring
 * (the one place springs belong: an opening), the content fades in a beat
 * later, and it hands focus back when it closes.
 */
export function DetailCard({
  children,
  footer,
  id,
  label,
  onClose,
  open,
  title
}: {
  children: ReactNode;
  footer?: ReactNode;
  id: string;
  label: string;
  onClose: () => void;
  open: boolean;
  title: ReactNode;
}) {
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false
  );
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [onClose, open]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-5">
          <motion.button
            animate={{ opacity: 1 }}
            aria-label="Schließen"
            className="absolute inset-0 bg-canvas/55 backdrop-blur-sm"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            onClick={onClose}
            transition={{ duration: DURATION.overlay, ease: SIGNATURE_EASE }}
            type="button"
          />
          <motion.section
            aria-labelledby={titleId}
            aria-modal="true"
            className="relative flex max-h-full w-full max-w-[34rem] flex-col overflow-hidden border border-hairline bg-charcoal"
            layoutId={`detail-${id}`}
            role="dialog"
            style={{ borderRadius: 10 }}
            transition={morph}
          >
            <motion.div
              animate={{ opacity: 1 }}
              className="flex min-h-0 flex-col overflow-y-auto p-6 md:p-8"
              exit={{ opacity: 0, transition: { duration: DURATION.state } }}
              initial={{ opacity: 0 }}
              transition={{ duration: DURATION.accordion, delay: 0.14, ease: SIGNATURE_EASE }}
            >
              <div className="flex items-start justify-between gap-6">
                <div className="flex flex-col gap-3">
                  <Label>{label}</Label>
                  <h2 className="m-0 text-title" id={titleId}>
                    {title}
                  </h2>
                </div>
                <RoundButton aria-label="Schließen" onClick={onClose} ref={closeRef} tone="quiet">
                  <CloseIcon />
                </RoundButton>
              </div>
              <div className="mt-5 flex flex-col gap-4">{children}</div>
              {footer && (
                <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-hairline pt-5">
                  {footer}
                </div>
              )}
            </motion.div>
          </motion.section>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
