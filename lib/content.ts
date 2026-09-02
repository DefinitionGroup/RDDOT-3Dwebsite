export type NavItem = {
  title: string;
  href: string;
  /** Rendered in smoke instead of white: the account entry. */
  quiet?: boolean;
};

export type Feature = {
  label: string;
  title: string;
  body: string;
};

export type Material = {
  id: string;
  name: string;
  kind: string;
  body: string;
  image: string;
  alt: string;
  /** object-position for the crop; the walnut tile has a ledge near its top. */
  position?: string;
};

export type Collection = {
  id: string;
  title: string;
  subtitle: string;
  body: string;
  href: string;
  image: string;
  alt: string;
};

export type Stage = {
  id: "material" | "layout" | "review";
  label: string;
  title: string;
  body: string;
};

export type FooterColumn = {
  title: string;
  links: NavItem[];
};

export const configureHref = "/configure";

export const navItems: NavItem[] = [
  { title: "Linien", href: "#linien" },
  { title: "Material", href: "#material" },
  { title: "Konfigurator", href: "#konfigurator" },
  { title: "Mein Bereich", href: "/konto", quiet: true }
];

export const signatureFeatures: Feature[] = [
  {
    label: "Material",
    title: "Ehrliche Materialien",
    body: "Echtholz, Feinsteinzeug und matte Lacke — ausgewählt für Patina statt Verschleiß."
  },
  {
    label: "Technik",
    title: "Stille Technik",
    body: "Grifflose Fronten, gedämpfte Auszüge, integriertes Licht. Technik, die man spürt, nicht sieht."
  },
  {
    label: "Fertigung",
    title: "Präzision ab Werk",
    body: "Gefertigt in Deutschland. Toleranzen in Millimetern, gedacht in Jahrzehnten."
  },
  {
    label: "Planung",
    title: "Persönliche Planung",
    body: "Vom ersten Entwurf bis zur Montage begleitet Sie ein Planer — kein Formular."
  }
];

export const materials: Material[] = [
  {
    id: "walnut-memory",
    name: "Nussbaum Memory",
    kind: "Furnier",
    body: "Echtholz, geölt",
    image: "/images/material-walnut-memory-wn832.png",
    alt: "Nussbaum Memory Furnier mit ruhiger Maserung",
    position: "center 80%"
  },
  {
    id: "fenix-castoro",
    name: "Castoro Ottawa",
    kind: "Fenix",
    body: "Nanotech, matt, selbstheilend",
    image: "/images/material-fenix-castoro-ottawa-0717.png",
    alt: "Fenix Castoro Ottawa, warmes Graubraun, matt"
  },
  {
    id: "fenix-verde",
    name: "Verde Kitami",
    kind: "Fenix",
    body: "Nanotech, matt, selbstheilend",
    image: "/images/material-fenix-verde-kitami-0794.png",
    alt: "Fenix Verde Kitami, tiefes Grün, matt"
  }
];

export const stages: Stage[] = [
  {
    id: "material",
    label: "Material",
    title: "Front und Korpus wählen",
    body: "Vier Oberflächen, alle grifflos, drei Korpusfarben. Jede Wahl wirkt sofort in der Szene."
  },
  {
    id: "layout",
    label: "Aufbau",
    title: "Zeile und Insel setzen",
    body: "Module in der Zeile, die Insel in drei Größen. Der Richtpreis folgt jeder Änderung."
  },
  {
    id: "review",
    label: "Prüfen",
    title: "Speichern und anfragen",
    body: "Aus jedem Stand wird ein Projekt: mit Versionen, Fotos und einer Anfrage an Ihren Planer."
  }
];

export const collections: Collection[] = [
  {
    id: "agile",
    title: "Agile",
    subtitle: "Effizienz. Mit Klasse.",
    body: "Klare Linien, schnelle Entscheidungen, präzise Planung. Für alle, die genau wissen, was sie wollen.",
    href: configureHref,
    image: "/images/signature-panorama.webp",
    alt: "Dunkle Küche mit Industriefenstern und großzügiger Arbeitsinsel"
  },
  {
    id: "exclusive",
    title: "Exclusive Line",
    subtitle: "High-End. Ohne Kompromiss.",
    body: "Materialtiefe, Maßanfertigung und persönliche Beratung. Für Räume, die bleiben sollen.",
    href: configureHref,
    image: "/images/signature-hero.jpg",
    alt: "Offene Signature Küche mit Insel und warmem Abendlicht"
  }
];

export const footerColumns: FooterColumn[] = [
  {
    title: "Planen",
    links: [
      { title: "Konfigurator", href: configureHref },
      { title: "Mein Bereich", href: "/konto" },
      { title: "Anfrage", href: "/anfrage" }
    ]
  },
  {
    title: "Küchen",
    links: [
      { title: "Agile", href: "#linien" },
      { title: "Exclusive Line", href: "#linien" },
      { title: "Material", href: "#material" }
    ]
  }
];

/** The rotpunkt film: close-up hands, 1920 × 1080, a silent loop. */
export const heroFilm = {
  src: "https://www.rotpunktkuechen.de/fileadmin/01_Startseite/Video/6740233_Closeup_Hands_1920x1080_loop_3.5mbs.mp4",
  poster: "/images/signature-hero.jpg"
};
