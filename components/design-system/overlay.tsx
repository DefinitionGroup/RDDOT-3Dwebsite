"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useId, useRef, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { Label } from "@/components/design-system/label";
import { RoundButton } from "@/components/design-system/pill";
import { DURATION, OVERLAY_SLIDE, SIGNATURE_EASE } from "@/lib/motion";

type OverlayProps = {
  open: boolean;
  onClose: () => void;
  label: string;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  /** A sheet from the right, or a centred card. */
  placement?: "sheet" | "card";
};

function CloseIcon() {
  return (
    <svg aria-hidden="true" fill="none" height="14" viewBox="0 0 24 24" width="14">
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
    </svg>
  );
}

/**
 * Charcoal sheet over the dimmed page: 24 px slide plus fade, 420 ms.
 * Rendered into <body> so a transformed ancestor cannot trap it.
 */
export function Overlay({
  children,
  footer,
  label,
  onClose,
  open,
  placement = "sheet",
  title
}: OverlayProps) {
  // Portals need the document; on the server there is none.
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

  const sheet = placement === "sheet";

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className={`fixed inset-0 z-[80] flex ${sheet ? "justify-end" : "items-center justify-center p-5"}`}>
          <motion.button
            animate={{ opacity: 1 }}
            aria-label="Schließen"
            className="absolute inset-0 bg-canvas/45 backdrop-blur-sm"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            onClick={onClose}
            transition={{ duration: DURATION.overlay, ease: SIGNATURE_EASE }}
            type="button"
          />
          <motion.section
            animate={{ opacity: 1, x: 0, y: 0 }}
            aria-labelledby={titleId}
            aria-modal="true"
            className={`relative flex flex-col bg-charcoal/[.96] backdrop-blur-[24px] ${
              sheet
                ? "h-full w-full max-w-[40rem] border-l border-hairline"
                : "max-h-full w-full max-w-[36rem] rounded-card border border-hairline"
            }`}
            exit={sheet ? { opacity: 0, x: OVERLAY_SLIDE } : { opacity: 0, y: OVERLAY_SLIDE }}
            initial={sheet ? { opacity: 0, x: OVERLAY_SLIDE } : { opacity: 0, y: OVERLAY_SLIDE }}
            role="dialog"
            transition={{ duration: DURATION.overlay, ease: SIGNATURE_EASE }}
          >
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 pt-8 md:px-12 md:pt-10">
              <div className="flex items-start justify-between gap-6">
                <div className="flex flex-col gap-3">
                  <Label>{label}</Label>
                  <h2 className="m-0 text-heading" id={titleId}>
                    {title}
                  </h2>
                </div>
                <RoundButton aria-label="Schließen" onClick={onClose} ref={closeRef}>
                  <CloseIcon />
                </RoundButton>
              </div>
              <div className="pb-8">{children}</div>
            </div>
            {footer && (
              <div className="flex items-center justify-between gap-5 border-t border-hairline px-6 py-5 md:px-12">
                {footer}
              </div>
            )}
          </motion.section>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
