/**
 * Demo site settings, one resolved copy per locale in the shape
 * SITE_SETTINGS_QUERY returns. The seed script folds them back into the one
 * siteSettings document with a localized value per field.
 */
import type { SiteSettings } from "@/blocks/types";
import type { Locale } from "@/lib/i18n";
import { decorativeImage } from "./demo-helpers";

const shared = {
  brandName: "rotpunkt Signature",
  shareImage: decorativeImage("/images/signature-hero.jpg", { width: 2048, height: 1170 })
} satisfies Partial<SiteSettings>;

export const demoSettings: Record<Locale, SiteSettings> = {
  de: {
    ...shared,
    seoTitle: "rotpunkt Signature – Küchen, auf den Punkt.",
    seoDescription: "Modulare Signature-Küchen: in 3D geplant, in Deutschland gefertigt, als Projekt gespeichert.",
    legalLine: "© 2026 rotpunkt Signature"
  },
  en: {
    ...shared,
    seoTitle: "rotpunkt Signature – Kitchens, to the point.",
    seoDescription: "Modular Signature kitchens: planned in 3D, made in Germany, saved as a project.",
    legalLine: "© 2026 rotpunkt Signature"
  },
  es: {
    ...shared,
    seoTitle: "rotpunkt Signature – Cocinas, en su punto.",
    seoDescription:
      "Cocinas Signature modulares: planificadas en 3D, fabricadas en Alemania, guardadas como proyecto.",
    legalLine: "© 2026 rotpunkt Signature"
  }
};
