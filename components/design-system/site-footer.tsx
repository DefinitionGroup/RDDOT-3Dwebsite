import Link from "next/link";
import { BrandLogo } from "@/components/design-system/brand-logo";
import { Label } from "@/components/design-system/label";
import { footerColumns } from "@/lib/content";

export function SiteFooter() {
  return (
    <footer className="signature-container mt-24 border-t border-hairline pb-12 pt-8 md:mt-32 md:pb-12 md:pt-10">
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between md:gap-12">
        <BrandLogo compact />
        <div className="grid grid-cols-2 gap-6 md:flex md:gap-16">
          {footerColumns.map((column) => (
            <div className="flex flex-col gap-2.5" key={column.title}>
              <Label className="mb-1">{column.title}</Label>
              {column.links.map((link) => (
                <Link
                  className="inline-flex min-h-8 items-center text-[0.875rem] text-graphite transition-colors duration-state ease-signature hover:text-porcelain"
                  href={link.href}
                  key={link.title}
                >
                  {link.title}
                </Link>
              ))}
            </div>
          ))}
        </div>
        <Label>Gefertigt in Deutschland</Label>
      </div>
    </footer>
  );
}
