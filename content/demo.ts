/**
 * Demo content: the site's own copy, used ONLY when Sanity is not configured
 * (sanity/lib/loaders.ts). It is ADR 0007's temporary local-content adapter,
 * written in the shape the queries return, and the seed script's source.
 * German only: a locale without content stays unavailable instead of
 * borrowing German text.
 */
import type { PageDocument, SiteChrome } from "@/blocks/types";
import { closingDemo } from "@/blocks/closing/demo";
import { collectionsDemo } from "@/blocks/collections/demo";
import { configuratorDemo } from "@/blocks/configurator/demo";
import { heroFilmDemo } from "@/blocks/hero-film/demo";
import { materialsDemo } from "@/blocks/materials/demo";
import { promisesDemo } from "@/blocks/promises/demo";
import { roomStoryDemo } from "@/blocks/room-story/demo";
import { statementDemo } from "@/blocks/statement/demo";
import type { Locale } from "@/lib/i18n";
import { key, link } from "./demo-helpers";

const configureHref = "/configure";
const productKey = "rdtdot-signature-kitchen-v1";

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
    }),
    promisesDemo({
      anchor: "signature",
      label: "Signature",
      headline: "Vier Entscheidungen.\nEin *Zuhause*.",
      intro:
        "Kein Katalog, keine tausend Optionen. Material, Aufbau, Prüfung und ein Planer, der weiterdenkt, wo der Konfigurator aufhört.",
      items: [
        {
          key: "material",
          label: "Material",
          title: "Ehrliche Materialien",
          body: "Echtholz, Feinsteinzeug und matte Lacke — ausgewählt für Patina statt Verschleiß.",
          detail: [
            "Wir wählen Oberflächen, die mit der Zeit schöner werden statt müder: geöltes Echtholz, das Patina ansetzt. Fenix-Fronten, die feine Kratzer mit Wärme wieder schließen. Matte Lacke mit Anti-Fingerprint, die auch nach dem Frühstück ruhig aussehen.",
            "Was Sie im Konfigurator sehen, ist das Material, das später in Ihrer Küche steht — mit denselben Farben und Strukturen."
          ]
        },
        {
          key: "technik",
          label: "Technik",
          title: "Stille Technik",
          body: "Grifflose Fronten, gedämpfte Auszüge, integriertes Licht. Technik, die man spürt, nicht sieht.",
          detail: [
            "Grifflos heißt bei uns: Die Front öffnet auf leichten Druck, der Auszug schließt gedämpft, das Licht ist da, wenn Sie es brauchen. Geräte verschwinden in Nischen, die genau für sie gebaut sind.",
            "Technik soll spürbar sein, nicht sichtbar. Eine Signature Küche erkennt man deshalb vor allem an dem, was man nicht hört."
          ]
        },
        {
          key: "fertigung",
          label: "Fertigung",
          title: "Präzision ab Werk",
          body: "Gefertigt in Deutschland. Toleranzen in Millimetern, gedacht in Jahrzehnten.",
          detail: [
            "Korpus, Front und Arbeitsplatte kommen aus einer Hand und werden in Deutschland gefertigt. Aus Ihrem Projekt entsteht eine Fertigungszeichnung, keine Interpretation — jedes Maß, das Sie im Konfigurator sehen, ist das Maß, das gebaut wird.",
            "Weil wir in Jahrzehnten denken, sind Beschläge und Fronten auf lange Nutzung ausgelegt, nicht auf den nächsten Trend."
          ]
        },
        {
          key: "planung",
          label: "Planung",
          title: "Persönliche Planung",
          body: "Vom ersten Entwurf bis zur Montage begleitet Sie ein Planer — kein Formular.",
          detail: [
            "Sie beginnen im Konfigurator, wann und wo Sie wollen — auch ohne Konto. Sobald Sie Ihre Küche als Projekt speichern und anfragen, übernimmt ein Planer: prüft Maße, Anschlüsse und Geräte und schlägt vor, was im Konfigurator noch nicht geht.",
            "Ein Ansprechpartner, vom ersten Entwurf bis zum ersten Abendessen."
          ]
        }
      ],
      detailCta: { label: "Küche konfigurieren", href: configureHref }
    }),
    materialsDemo({
      anchor: "material",
      productKey,
      label: "Material",
      headline: "Material, das *bleibt*.",
      intro:
        "Oberflächen mit Patina, nicht mit Verschleiß. Vier Fronten und drei Korpusfarben — alle grifflos, alle zum Anfassen gedacht. Jede Karte erzählt, woraus sie ist.",
      items: [
        {
          key: "walnut-memory",
          finishKey: "walnut-memory",
          name: "Nussbaum Memory",
          kind: "Furnier",
          body: "Echtholz, geölt",
          image: {
            url: "/images/material-walnut-memory-wn832.png",
            width: 325,
            height: 425,
            alt: "Nussbaum Memory Furnier mit ruhiger Maserung",
            // The tile has a ledge near its top: crop from the bottom and scale past the seam.
            hotspot: { x: 0.5, y: 1 }
          },
          zoom: 1.4,
          detail: [
            "Echtholzfurnier mit durchlaufender Maserung: Die Zeichnung setzt sich von Front zu Front fort, kein Blatt gleicht dem anderen.",
            "Geölt statt lackiert — das Holz bleibt offenporig, fühlt sich warm an und darf mit den Jahren nachdunkeln. Kleine Spuren des Lebens lassen sich nachölen."
          ],
          facts: ["Echtholzfurnier", "geölt, offenporig", "durchlaufende Maserung"]
        },
        {
          key: "fenix-castoro",
          finishKey: "castoro-ottawa",
          name: "Castoro Ottawa",
          kind: "Fenix",
          body: "Nanotech, matt, selbstheilend",
          image: {
            url: "/images/material-fenix-castoro-ottawa-0717.png",
            width: 512,
            height: 512,
            alt: "Fenix Castoro Ottawa, warmes Graubraun, matt"
          },
          detail: [
            "Eine extrem matte Nanotech-Oberfläche mit samtiger Haptik: Fingerabdrücke bleiben unsichtbar, Licht wird kaum reflektiert, feine Mikrokratzer lassen sich mit Wärme wieder schließen.",
            "Castoro Ottawa ist ein warmes Graubraun, das Holz und Stein ruhig zusammenführt."
          ],
          facts: ["Anti-Fingerprint", "extrem matt", "thermisch reparierbar"]
        },
        {
          key: "fenix-verde",
          finishKey: "verde-kitami",
          name: "Verde Kitami",
          kind: "Fenix",
          body: "Nanotech, matt, selbstheilend",
          image: {
            url: "/images/material-fenix-verde-kitami-0794.png",
            width: 512,
            height: 512,
            alt: "Fenix Verde Kitami, tiefes Grün, matt"
          },
          detail: [
            "Dieselbe Nanotech-Oberfläche in einem tiefen, gedeckten Grün. Verde Kitami wirkt bei Tageslicht fast grau, am Abend satt und ruhig.",
            "Und bleibt dabei so pflegeleicht wie alle Fenix-Fronten: Anti-Fingerprint, matt, thermisch reparierbar."
          ],
          facts: ["Anti-Fingerprint", "extrem matt", "thermisch reparierbar"]
        },
        {
          key: "porcelain",
          finishKey: "porcelain",
          name: "Porzellan",
          kind: "Lack",
          body: "Seidenmatt, Anti-Fingerprint",
          color: "#F5F1EA",
          colorAlt: "Porzellan, warmes Cremeweiß, seidenmatt lackiert",
          detail: [
            "Der Klassiker der Signature Linie: ein warmes Cremeweiß, seidenmatt lackiert, mit Anti-Fingerprint.",
            "Porzellan macht kleine Räume größer und große Räume ruhiger — und ist in der Grundausstattung enthalten."
          ],
          facts: ["Lack seidenmatt", "Anti-Fingerprint", "in der Grundausstattung"]
        }
      ],
      cta: { label: "Alle Oberflächen im Konfigurator", href: configureHref },
      detailCtaLabel: "In der Szene ansehen"
    }),
    configuratorDemo({
      anchor: "konfigurator",
      productKey,
      label: "Konfigurator",
      headline: "Planen in 3D.\nSpeichern als *Projekt*.",
      body: "Material, Aufbau, Prüfung — drei Entscheidungen, live in der Szene. Der Richtpreis folgt jeder Änderung; ein Projekt hält jeden Stand fest. Und wenn Sie mögen, macht die KI daraus ein Foto in Ihrem Raum.",
      counterBefore: "Von 0 auf",
      counterAfter: "in vier Klicks.",
      image: {
        url: "/images/signature-detail.webp",
        width: 2048,
        height: 1170,
        alt: "Signature Küche bei Abendlicht mit Glasfront und Holzdecke"
      },
      stages: [
        {
          key: "material",
          label: "Material",
          title: "Front und Korpus wählen",
          body: "Vier Oberflächen, alle grifflos, drei Korpusfarben. Jede Wahl wirkt sofort in der Szene."
        },
        {
          key: "layout",
          label: "Aufbau",
          title: "Zeile und Insel setzen",
          body: "Module in die Zeile ziehen, die Insel ohne, normal oder groß. Der Richtpreis folgt jeder Änderung."
        },
        {
          key: "review",
          label: "Prüfen",
          title: "Speichern und anfragen",
          body: "Aus jedem Stand wird ein Projekt: mit Versionen, Fotos und einer Anfrage an Ihren Planer."
        }
      ],
      ctaLabel: "Jetzt konfigurieren",
      explainerLabel: "So funktioniert es",
      explainerTitle: "Vier *Klicks*.",
      explainerIntro:
        "Von der leeren Szene bis zur Anfrage an einen Planer — ohne Konto, ohne Formular, in Ihrem Tempo.",
      steps: [
        {
          label: "Material",
          title: "Front und Korpus wählen",
          body: "Vier Oberflächen und drei Korpusfarben, alle grifflos. Jede Wahl wirkt sofort in der Szene."
        },
        {
          label: "Aufbau",
          title: "Zeile und Insel setzen",
          body: "Schränke in die Szene ziehen, verschieben oder tauschen; die Insel ohne, normal oder groß. Der Richtpreis folgt jeder Änderung."
        },
        {
          label: "Prüfen",
          title: "Aufstellung lesen, Stand speichern",
          body: "Jede Preisposition ist offen gelegt. Als Projekt gespeichert, bleibt jeder Stand mit Versionen und Fotos erhalten."
        },
        {
          label: "Anfragen",
          title: "Einen Planer ins Boot holen",
          body: "Unverbindlich, aus dem Projekt heraus. Ein Planer prüft Maße, Anschlüsse und Geräte und meldet sich persönlich."
        }
      ]
    }),
    roomStoryDemo({
      anchor: "raum",
      label: "Visualisierung",
      headline: "Ihr Raum. Ihre *Küche*.",
      lead: "Stellen Sie Front, Korpus und Aufbau in Echtzeit zusammen — und sehen Sie das Ergebnis dort, wo es hingehört: in einem Raum, nicht auf einem Datenblatt.",
      features: [
        {
          label: "Studio",
          title: "Neutral, für Material und Maße",
          body: "Schwarzer Raum, warmes Licht: Hier vergleichen Sie Oberflächen und Proportionen ohne Ablenkung."
        },
        {
          label: "Appartement",
          title: "Die Küche in einem Raum",
          body: "Ein eingerichteter Raum mit Tageslicht zeigt, wie die Linie mit Boden, Wand und Möbeln zusammenspielt."
        },
        {
          label: "KI-Foto",
          title: "Ein Foto Ihrer Konfiguration",
          body: "Aus jedem gespeicherten Stand entsteht auf Wunsch in Sekunden ein realistisches Foto — zum Teilen, Vergleichen und Wiederfinden."
        },
        {
          label: "Versionen & Links",
          title: "Jeder Stand bleibt",
          body: "Versionen halten fest, was gut war. Ein sicherer Link zeigt einen Stand, ohne Ihr Projekt zu öffnen."
        }
      ],
      cta: { label: "Im Konfigurator ansehen", href: configureHref },
      image: {
        url: "/images/signature-panorama.webp",
        width: 2048,
        height: 1170,
        alt: "Dunkle Küche mit Industriefenstern und großzügiger Arbeitsinsel"
      },
      imageBadge: "Appartement",
      caption: "Agile — Industriefenster, mattes Schwarz"
    }),
    collectionsDemo({
      anchor: "linien",
      label: "Linien",
      headline: "Zwei Linien. Eine *Haltung*.",
      items: [
        {
          title: "Agile",
          subtitle: "Effizienz. Mit Klasse.",
          body: "Klare Linien, schnelle Entscheidungen, präzise Planung. Die Linie für alle, die genau wissen, was sie wollen.",
          link: { label: "Linie entdecken", href: configureHref },
          image: {
            url: "/images/signature-panorama.webp",
            width: 2048,
            height: 1170,
            alt: "Dunkle Küche mit Industriefenstern und großzügiger Arbeitsinsel"
          },
          caption: "Industriefenster, mattes Schwarz"
        },
        {
          title: "Exclusive Line",
          subtitle: "High-End. Ohne Kompromiss.",
          body: "Materialtiefe, Maßanfertigung und persönliche Beratung. Die Linie für Räume, die bleiben sollen.",
          link: { label: "Linie entdecken", href: configureHref },
          image: {
            url: "/images/signature-hero.jpg",
            width: 2048,
            height: 1170,
            alt: "Offene Signature Küche mit Insel und warmem Abendlicht"
          },
          caption: "Eiche, Feinstein, mattes Schwarz"
        }
      ]
    }),
    closingDemo({
      headline: "Ihre Küche. In *Ihrem* Bereich.",
      body: "Konfigurieren Sie als Gast, speichern Sie mit einer E-Mail-Adresse — ohne Passwort, ohne Formular. Versionen, Fotos und Anfragen bleiben privat bei Ihrem Projekt, und ein Planer ist nur einen Klick entfernt.",
      cta: { label: "Küche konfigurieren", href: configureHref }
    })
  ]
};

const pages: PageDocument[] = [home];

const chrome: Partial<Record<Locale, SiteChrome>> = {
  de: {
    items: [
      { _key: key("nav"), label: "Haltung", href: "#haltung", quiet: null },
      { _key: key("nav"), label: "Material", href: "#material", quiet: null },
      { _key: key("nav"), label: "Konfigurator", href: "#konfigurator", quiet: null },
      { _key: key("nav"), label: "Linien", href: "#linien", quiet: null },
      { _key: key("nav"), label: "Mein Bereich", href: "/konto", quiet: true }
    ],
    cta: link("Küche konfigurieren", configureHref),
    footerColumns: [
      {
        _key: key("footer"),
        title: "Planen",
        links: [
          { _key: key("footer-link"), label: "Konfigurator", href: configureHref },
          { _key: key("footer-link"), label: "Mein Bereich", href: "/konto" },
          { _key: key("footer-link"), label: "Anfrage", href: "/anfrage" }
        ]
      },
      {
        _key: key("footer"),
        title: "Küchen",
        links: [
          { _key: key("footer-link"), label: "Agile", href: "#linien" },
          { _key: key("footer-link"), label: "Exclusive Line", href: "#linien" },
          { _key: key("footer-link"), label: "Material", href: "#material" }
        ]
      }
    ],
    footerNote: "Gefertigt in Deutschland"
  }
};

export function getDemoPage(locale: Locale, slug: string | null): PageDocument | null {
  return (
    pages.find((page) => page.language === locale && (slug === null ? page.isHomepage : page.slug === slug)) ??
    null
  );
}

export function getDemoChrome(locale: Locale): SiteChrome | null {
  return chrome[locale] ?? null;
}
