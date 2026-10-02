import type { ReactNode } from "react";
import { SiteFooter } from "@/components/design-system/site-footer";
import { SiteHeader } from "@/components/design-system/site-header";
import type { Locale } from "@/lib/i18n";
import { loadSiteChrome } from "@/sanity/lib/loaders";

/** Header, main and footer of an Editorial Page, with the locale's navigation. */
export async function SiteFrame({ locale, children }: { locale: Locale; children: ReactNode }) {
  const chrome = await loadSiteChrome(locale);
  return (
    <>
      <SiteHeader chrome={chrome} />
      <main>{children}</main>
      <SiteFooter chrome={chrome} />
    </>
  );
}
