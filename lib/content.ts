export type NavItem = {
  title: string;
  description: string;
  href: string;
};

export type CollectionStep = {
  number: string;
  label: string;
  description: string;
  href: string;
};

export type Feature = {
  title: string;
  body: string;
};

export const navItems: NavItem[] = [
  {
    title: "Collections",
    description: "Unsere Produktreihen & Inspirationen",
    href: "#collections"
  },
  {
    title: "Konfigurieren",
    description: "Traumküche mit 3 Klicks",
    href: "/configure"
  },
  {
    title: "Wie läufts ab?",
    description: "Damit alles glatt läuft.",
    href: "#process"
  }
];

export const heroSteps: CollectionStep[] = [
  {
    number: "01",
    label: "Agile",
    description: "Effiziente Planung mit Signature Details",
    href: "#agile"
  },
  {
    number: "02",
    label: "Exclusive Line",
    description: "High-End Küchen mit Materialtiefe",
    href: "#exclusive"
  },
  {
    number: "03",
    label: "Studio Visit",
    description: "Erleben, vergleichen, konfigurieren",
    href: "/configure"
  }
];

export const signatureFeatures: Feature[] = [
  {
    title: "Schneller zur Auswahl",
    body: "Die Figma Idee wird zu einem modularen Auswahlfluss: Kollektion wählen, Materialgefühl prüfen, Beratung anfragen."
  },
  {
    title: "Bessere Produktdramaturgie",
    body: "Statt wiederholter Textblöcke führt jede Sektion einen klaren nächsten Schritt ein."
  },
  {
    title: "Ecommerce-ready Komponenten",
    body: "Hero, Collection Rail, Image Panel, CTA und Compare Module sind datengetrieben und wiederverwendbar."
  },
  {
    title: "Premium ohne Reibung",
    body: "Große Bilder, kurze Texte und sichtbare Aktionen halten den Look hochwertig und den Weg kaufnah."
  }
];

export const collections = [
  {
    id: "agile",
    title: "Agile",
    subtitle: "Effizienz. Mit Klasse.",
    body: "Für Küchen, die präzise planen, schnell entscheiden und dennoch hochwertig wirken müssen.",
    tone: "light"
  },
  {
    id: "exclusive",
    title: "Exclusive Line",
    subtitle: "High-End Küchen.",
    body: "Für Beratung, Materialinszenierung und anspruchsvolle Konfigurationen mit starkem visuellen Anspruch.",
    tone: "dark"
  }
];
