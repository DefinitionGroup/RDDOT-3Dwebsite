import { BrandLogo } from "@/components/design-system/brand-logo";
import { navItems } from "@/lib/content";

export function SiteFooter() {
  return (
    <footer className="border-t border-hairline py-12">
      <div className="signature-container flex flex-col justify-between gap-8 md:flex-row md:items-center">
        <BrandLogo />
        <div className="flex flex-wrap items-center gap-x-10 gap-y-3">
          {navItems.map((item) => (
            <a
              className="text-body text-graphite transition-colors duration-300 hover:text-ink"
              href={item.href}
              key={item.title}
            >
              {item.title}
            </a>
          ))}
        </div>
        <p className="text-body text-ash">© {new Date().getFullYear()} rotpunkt Signature</p>
      </div>
    </footer>
  );
}
