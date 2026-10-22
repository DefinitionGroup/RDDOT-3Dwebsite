import Link from "next/link";
import { AccountIndicator } from "@/components/design-system/account-indicator";
import { BrandLogo } from "@/components/design-system/brand-logo";
import { LanguageSwitch } from "@/components/design-system/language-switch";
import { localizePath, type Locale } from "@/lib/i18n";
import type { LanguageLink } from "@/lib/language-links";
import { getMessages } from "@/lib/messages";

type AppHeaderProps = {
  /**
   * The one contextual destination this surface offers, beyond home and the
   * account. Kept to a single explicit link so the slot always means one thing.
   */
  action?: { href: string; label: string };
  /** Hidden on the account surface itself, where it would point at the page. */
  showAccount?: boolean;
  /** This screen in each language the visitor can open; no switch below two. */
  languages?: LanguageLink[];
  className?: string;
  locale: Locale;
};

/**
 * The header for the application surfaces — configurator, account, request.
 * `SiteHeader` stays the marketing header for the homepage.
 *
 * Fixed slots, same order everywhere: the wordmark always goes home, the
 * action link is labelled with its destination, the language switch follows
 * once more than one language is open, and the account entry is present
 * wherever it is not the current page.
 *
 * Deliberately not used on the public shared-revision view, which exposes no
 * account or project navigation by design (CONTEXT.md, Shared Revision View).
 */
export function AppHeader({ action, className = "", languages = [], locale, showAccount = true }: AppHeaderProps) {
  const t = getMessages(locale).header;
  return (
    <div className={`flex items-center justify-between gap-4 ${className}`}>
      <BrandLogo compact href={localizePath(locale, "/")} label={t.home} />

      <div className="flex items-center gap-1">
        {action && (
          <Link
            className="group inline-flex min-h-11 items-center gap-2 rounded-pill px-3 text-nav leading-none text-graphite transition-colors duration-state ease-signature hover:text-ink"
            href={action.href}
          >
            <svg
              aria-hidden="true"
              className="size-3 transition-transform duration-state ease-signature group-hover:-translate-x-0.5"
              fill="none"
              viewBox="0 0 12 12"
            >
              <path
                d="M10 6H2m0 0 4-4M2 6l4 4"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="1.2"
              />
            </svg>
            {action.label}
          </Link>
        )}
        <LanguageSwitch links={languages} />
        {showAccount && <AccountIndicator locale={locale} />}
      </div>
    </div>
  );
}
