import Link from "next/link";
import { AccountIndicator } from "@/components/design-system/account-indicator";
import { BrandLogo } from "@/components/design-system/brand-logo";

type AppHeaderProps = {
  tone?: "light" | "dark";
  /**
   * The one contextual destination this surface offers, beyond home and the
   * account. Kept to a single explicit link so the slot always means one thing.
   */
  action?: { href: string; label: string };
  /** Hidden on the account surface itself, where it would point at the page. */
  showAccount?: boolean;
  className?: string;
};

/**
 * The header for the application surfaces — configurator, account, request.
 * `SiteHeader` stays the marketing header for the homepage.
 *
 * Each of these routes previously built its own top-left corner, which is how
 * the account page ended up with a single link (the wordmark) and no route back
 * to the configurator. Three fixed slots, same order everywhere: the wordmark
 * always goes home, the action link is labelled with its destination, and the
 * account entry is present wherever it is not the current page.
 *
 * Deliberately not used on the public shared-revision view, which exposes no
 * account or project navigation by design (CONTEXT.md, Shared Revision View).
 */
export function AppHeader({
  action,
  className = "",
  showAccount = true,
  tone = "dark"
}: AppHeaderProps) {
  const linkTone =
    tone === "light"
      ? "text-white/80 hover:text-white"
      : "text-graphite hover:text-ink";

  return (
    <div className={`flex items-center justify-between gap-4 ${className}`}>
      <BrandLogo compact href="/" tone={tone} />

      <div className="flex items-center gap-1">
        {action && (
          <Link
            className={`group inline-flex min-h-11 items-center gap-2 px-2 text-body leading-none transition-colors ${linkTone}`}
            href={action.href}
          >
            <svg
              aria-hidden="true"
              className="size-3 transition-transform duration-300 ease-signature group-hover:-translate-x-0.5"
              fill="none"
              viewBox="0 0 12 12"
            >
              <path
                d="M10 6H2m0 0 4-4M2 6l4 4"
                stroke="currentColor"
                strokeLinecap="square"
                strokeWidth="1.2"
              />
            </svg>
            {action.label}
          </Link>
        )}
        {showAccount && <AccountIndicator tone={tone} />}
      </div>
    </div>
  );
}
