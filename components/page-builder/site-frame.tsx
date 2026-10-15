import type { ReactNode } from "react";
import { SiteFooter } from "@/components/design-system/site-footer";
import { SiteHeader } from "@/components/design-system/site-header";
import type { Locale } from "@/lib/i18n";
import type { LanguageLink } from "@/lib/language-links";
import { loadSiteChrome, loadSiteSettings } from "@/sanity/lib/loaders";

/** Header, main and footer of an Editorial Page, with the locale's navigation and language switch. */
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
      <SiteHeader chrome={chrome} languages={languages} locale={locale} />
      <main>{children}</main>
      <SiteFooter chrome={chrome} legalLine={settings?.legalLine ?? null} locale={locale} />
    </>
  );
}
