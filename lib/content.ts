export type NavItem = {
  title: string;
  href: string;
};

export type Feature = {
  title: string;
  body: string;
};

export type Collection = {
  id: string;
  title: string;
  subtitle: string;
  body: string;
  href: string;
};

export const navItems: NavItem[] = [
  { title: "Collections", href: "#collections" },
  { title: "Konfigurator", href: "/configure" },
  { title: "Linien", href: "#linien" }
];

export const signatureFeatures: Feature[] = [
  {
    title: "Ehrliche Materialien",
    body: "Echtholz, Feinsteinzeug und matte Lacke — ausgewählt für Patina statt Verschleiß."
  },
  {
    title: "Stille Technik",
    body: "Grifflose Fronten, gedämpfte Auszüge, integriertes Licht. Technik, die man spürt, nicht sieht."
  },
  {
    title: "Präzision ab Werk",
    body: "Gefertigt in Deutschland. Toleranzen in Millimetern, gedacht in Jahrzehnten."
  },
  {
    title: "Persönliche Planung",
    body: "Vom ersten Entwurf bis zur Montage begleitet Sie ein Planer — kein Formular."
  }
];

export const collections: Collection[] = [
  {
    id: "agile",
    title: "Agile",
    subtitle: "Effizienz. Mit Klasse.",
    body: "Klare Linien, schnelle Entscheidungen, präzise Planung. Die Linie für alle, die genau wissen, was sie wollen.",
    href: "/configure"
  },
  {
    id: "exclusive",
    title: "Exclusive Line",
    subtitle: "High-End. Ohne Kompromiss.",
    body: "Materialtiefe, Maßanfertigung und persönliche Beratung. Die Linie für Räume, die bleiben sollen.",
    href: "/configure"
  }
];
