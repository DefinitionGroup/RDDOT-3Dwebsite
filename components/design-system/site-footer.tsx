import Link from "next/link";
import type { SiteChrome } from "@/blocks/types";
import { BrandLogo } from "@/components/design-system/brand-logo";
import { Label } from "@/components/design-system/label";
import { localizePath, type Locale } from "@/lib/i18n";
import { getMessages } from "@/lib/messages";

/**
 * Brand, link columns and one line from the locale's navigation document;
 * below them the legal line from the site settings.
 */
export function SiteFooter({
  chrome,
  legalLine,
  locale
}: {
  chrome: SiteChrome | null;
  legalLine: string | null;
  locale: Locale;
}) {
  return (
    <footer className="signature-container mt-24 border-t border-hairline pb-12 pt-8 md:mt-32 md:pb-12 md:pt-10">
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between md:gap-12">
        <BrandLogo compact href={localizePath(locale, "/")} label={getMessages(locale).header.home} />
        <div className="grid grid-cols-2 gap-6 md:flex md:gap-16">
          {chrome?.footerColumns?.map((column) => (
            <div className="flex flex-col gap-2.5" key={column._key}>
              <Label className="mb-1">{column.title}</Label>
              {column.links?.map((link) => (
                <Link
                  className="inline-flex min-h-8 items-center text-[0.875rem] text-graphite transition-colors duration-state ease-signature hover:text-porcelain"
                  href={link.href}
                  key={link._key}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          ))}
        </div>
        {chrome?.footerNote && <Label>{chrome.footerNote}</Label>}
      </div>
      {legalLine && <p className="m-0 mt-10 text-[0.75rem] text-graphite md:mt-12">{legalLine}</p>}
    </footer>
  );
}
