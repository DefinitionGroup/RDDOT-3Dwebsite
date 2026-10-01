/**
 * Demo content: the site's own copy, used ONLY when Sanity is not configured
 * (sanity/lib/loaders.ts). It is ADR 0007's temporary local-content adapter,
 * written in the shape the queries return, and the seed script's source.
 * German only: a locale without content stays unavailable instead of
 * borrowing German text.
 */
import type { PageDocument } from "@/blocks/types";
import { heroFilmDemo } from "@/blocks/hero-film/demo";
import { statementDemo } from "@/blocks/statement/demo";
import type { Locale } from "@/lib/i18n";

const configureHref = "/configure";

const home: PageDocument = {
  _id: "demo-page-de-home",
  title: "Startseite",
  slug: null,
  language: "de",
  isHomepage: true,
  seo: null,
  translations: null,
  content: [
    heroFilmDemo({
      anchor: "top",
      eyebrow: "Premium Küchen",
      headline: "Küchen, auf den *Punkt*.",
      summary: "Modulare Signature-Küchen: in 3D geplant, in Ihrem Raum gesehen, in Deutschland gefertigt.",
      primaryCta: { label: "Küche konfigurieren", href: configureHref },
      filmButtonLabel: "Den Film ansehen",
      badge: "Gefertigt in Deutschland",
      // A 15-second silent loop transcoded from the supplied master (H.264, faststart, no audio).
      film: { desktop: "/video/hero-1080.mp4", mobile: "/video/hero-720.mp4", poster: "/images/hero-poster.jpg" }
    }),
    statementDemo({
      anchor: "haltung",
      label: "Haltung",
      statement: "Eine Küche ist kein Möbel. Sie ist der Raum, in dem *gelebt* wird.",
      paragraphs: [
        "Deshalb beginnt jede Signature Küche nicht im Katalog, sondern bei Ihnen: bei Ihrem Grundriss, Ihrem Licht und der Frage, wo morgens der Kaffee steht. Wir planen keine Schauküche. Wir planen den Ort, an dem Ihr Tag anfängt und Ihre Abende länger werden.",
        "Vier Entscheidungen genügen, um anzufangen. Alles Weitere übernimmt ein Planer, der Ihren Entwurf kennt — persönlich, nicht per Formular."
      ],
      link: { label: "Die vier Entscheidungen", href: "#signature" },
      image: {
        url: "/images/signature-detail.webp",
        width: 2048,
        height: 1170,
        alt: "Signature Küche bei Abendlicht mit Glasfront und Holzdecke"
      },
      caption: "Exclusive Line — Abendlicht, Glas, Eiche"
    })
  ]
};

const pages: PageDocument[] = [home];

export function getDemoPage(locale: Locale, slug: string | null): PageDocument | null {
  return (
    pages.find((page) => page.language === locale && (slug === null ? page.isHomepage : page.slug === slug)) ??
    null
  );
}
