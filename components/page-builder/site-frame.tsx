import type { ReactNode } from "react";
import { SiteFooter } from "@/components/design-system/site-footer";
import { SiteHeader } from "@/components/design-system/site-header";
import type { Locale } from "@/lib/i18n";
import type { LanguageLink } from "@/lib/language-links";
import { getMessages } from "@/lib/messages";
import { loadSiteChrome, loadSiteSettings } from "@/sanity/lib/loaders";

/**
 * Header, main and footer of an Editorial Page, with the locale's navigation
 * and language switch. The first Tab stop is a link past the header to the
 * content, shown only while it has focus.
 */
export async function SiteFrame({
  children,
  languages,
  locale
}: {
  children: ReactNode;
  languages: LanguageLink[];
  locale: Locale;
}) {
  const [chrome, settings] = await Promise.all([loadSiteChrome(locale), loadSiteSettings(locale)]);
  return (
    <>
      <a
        className="sr-only rounded-pill bg-ink text-nav leading-none text-canvas focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-[60] focus:inline-flex focus:min-h-11 focus:items-center focus:px-5"
        href="#inhalt"
      >
        {getMessages(locale).header.skipToContent}
      </a>
      <SiteHeader chrome={chrome} languages={languages} locale={locale} />
      <main className="outline-none" id="inhalt" tabIndex={-1}>
        {children}
      </main>
      <SiteFooter chrome={chrome} legalLine={settings?.legalLine ?? null} locale={locale} />
    </>
  );
}
