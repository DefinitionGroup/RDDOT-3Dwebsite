import type { ReactNode } from "react";
import { SiteFooter } from "@/components/design-system/site-footer";
import { SiteHeader } from "@/components/design-system/site-header";
import type { Locale } from "@/lib/i18n";
import type { LanguageLink } from "@/lib/language-links";
import { loadSiteChrome } from "@/sanity/lib/loaders";

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
  const chrome = await loadSiteChrome(locale);
  return (
    <>
      <SiteHeader chrome={chrome} languages={languages} />
      <main>{children}</main>
      <SiteFooter chrome={chrome} />
    </>
  );
}
