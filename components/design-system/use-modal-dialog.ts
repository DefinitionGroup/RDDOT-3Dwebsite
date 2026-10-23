"use client";

import { type RefObject, useEffect, useEffectEvent } from "react";
import { tabTarget } from "@/lib/keyboard";

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type=hidden])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "summary",
  "[tabindex]:not([tabindex='-1'])"
].join(",");

/**
 * Marks everything outside `keep` inert, level by level up to <body>, and
 * returns how to undo it. Elements that were inert already stay as they were.
 */
function inertOutside(keep: Element) {
  const changed: Element[] = [];
  for (let node: Element = keep; node.parentElement && node !== document.body; node = node.parentElement) {
    for (const sibling of node.parentElement.children) {
      if (sibling === node || sibling.hasAttribute("inert") || ["SCRIPT", "STYLE", "LINK"].includes(sibling.tagName)) {
        continue;
      }
      sibling.setAttribute("inert", "");
      changed.push(sibling);
    }
  }
  return () => changed.forEach((element) => element.removeAttribute("inert"));
}

/**
 * What a modal dialog owes keyboard and screen-reader users while it is open:
 * focus moves in (to `initialFocusRef`, else the dialog), Tab and Shift+Tab
 * stay inside, Escape closes, the rest of the page is inert and does not
 * scroll, and focus returns where it was on close. `rootRef` is what stays
 * live, the dialog plus its backdrop; it defaults to the dialog.
 */
export function useModalDialog({
  dialogRef,
  initialFocusRef,
  onClose,
  open,
  rootRef
}: {
  dialogRef: RefObject<HTMLElement | null>;
  initialFocusRef?: RefObject<HTMLElement | null>;
  onClose: () => void;
  open: boolean;
  rootRef?: RefObject<HTMLElement | null>;
}) {
  // Callers pass a fresh closure on every render; reading it as an event keeps
  // the effect from rerunning and pulling focus back to the first element.
  const close = useEffectEvent(onClose);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog) return;
    const previous = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    const restoreInert = inertOutside(rootRef?.current ?? dialog);
    (initialFocusRef?.current ?? dialog).focus();

    const onKey = (event: KeyboardEvent) => {
      const active = document.activeElement;
      // A dialog opened on top of this one handles its own keys.
      if (active && active !== document.body && !dialog.contains(active)) return;
      if (event.key === "Escape") {
        close();
        return;
      }
      if (event.key !== "Tab") return;
      const items = [...dialog.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (element) => element.getClientRects().length > 0
      );
      if (items.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const target = tabTarget(items.indexOf(active as HTMLElement), items.length, event.shiftKey);
      if (target === null) return;
      event.preventDefault();
      items[target].focus();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      restoreInert();
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [dialogRef, initialFocusRef, open, rootRef]);
}
