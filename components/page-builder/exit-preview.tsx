"use client";

import { usePathname } from "next/navigation";
import { useIsPresentationTool } from "next-sanity/hooks";
import { Pill } from "@/components/design-system/pill";

/**
 * Leaves Editorial Preview when it was opened outside the Studio. Inside the
 * Presentation tool the Studio owns that switch, so this stays hidden.
 */
export function ExitPreview({ label }: { label: string }) {
  const pathname = usePathname();
  const inPresentation = useIsPresentationTool();
  if (inPresentation !== false) return null;
  return (
    <Pill
      className="fixed bottom-4 right-4 z-[60]"
      // A full navigation: the route clears the cookie and redirects back.
      onClick={() => window.location.assign(`/api/draft-mode/disable?redirect=${encodeURIComponent(pathname)}`)}
      variant="secondary"
    >
      {label}
    </Pill>
  );
}
