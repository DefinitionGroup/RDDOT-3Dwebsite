export type NavItem = {
  title: string;
  href: string;
  /** Rendered in smoke instead of white: the account entry. */
  quiet?: boolean;
};

export type Feature = {
  id: string;
  label: string;
  title: string;
  body: string;
  /** The longer story behind the promise, shown in its detail card. */
  detail: string[];
};

export type Material = {
  id: string;
  /** The front finish key in the product definition; links the card to the configurator. */
  finishKey: string;
  name: string;
  kind: string;
  body: string;
  image?: string;
  /** A plain colour instead of a photo: the lacquer. */
  color?: string;
  alt: string;
  /** object-position for the crop; the walnut tile has a ledge near its top. */
  position?: string;
  /** Scale the photo up so a seam at the tile's edge stays outside the card. */
  zoom?: number;
  detail: string[];
  facts: string[];
};

export type Collection = {
  id: string;
  title: string;
  subtitle: string;
  body: string;
  href: string;
  image: string;
  alt: string;
  caption: string;
};

export type Stage = {
  id: "material" | "layout" | "review";
  label: string;
  title: string;
  body: string;
};

export type Step = {
  label: string;
  title: string;
  body: string;
};

export type RoomFeature = {
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
  { title: "Haltung", href: "#haltung" },
  { title: "Material", href: "#material" },
  { title: "Konfigurator", href: "#konfigurator" },
  { title: "Linien", href: "#linien" },
  { title: "Mein Bereich", href: "/konto", quiet: true }
];

export const manifest = {
  label: "Haltung",
  statement: [
    { text: "Eine Küche ist kein Möbel. Sie ist der Raum, in dem" },
    { text: "gelebt", serif: true },
    { text: "wird." }
  ],
  paragraphs: [
    "Deshalb beginnt jede Signature Küche nicht im Katalog, sondern bei Ihnen: bei Ihrem Grundriss, Ihrem Licht und der Frage, wo morgens der Kaffee steht. Wir planen keine Schauküche. Wir planen den Ort, an dem Ihr Tag anfängt und Ihre Abende länger werden.",
    "Vier Entscheidungen genügen, um anzufangen. Alles Weitere übernimmt ein Planer, der Ihren Entwurf kennt — persönlich, nicht per Formular."
  ],
  image: "/images/signature-detail.webp",
  alt: "Signature Küche bei Abendlicht mit Glasfront und Holzdecke",
  caption: "Exclusive Line — Abendlicht, Glas, Eiche"
};

export const signatureFeatures: Feature[] = [
  {
    id: "material",
    label: "Material",
    title: "Ehrliche Materialien",
    body: "Echtholz, Feinsteinzeug und matte Lacke — ausgewählt für Patina statt Verschleiß.",
    detail: [
      "Wir wählen Oberflächen, die mit der Zeit schöner werden statt müder: geöltes Echtholz, das Patina ansetzt. Fenix-Fronten, die feine Kratzer mit Wärme wieder schließen. Matte Lacke mit Anti-Fingerprint, die auch nach dem Frühstück ruhig aussehen.",
      "Was Sie im Konfigurator sehen, ist das Material, das später in Ihrer Küche steht — mit denselben Farben und Strukturen."
    ]
  },
  {
    id: "technik",
    label: "Technik",
    title: "Stille Technik",
    body: "Grifflose Fronten, gedämpfte Auszüge, integriertes Licht. Technik, die man spürt, nicht sieht.",
    detail: [
      "Grifflos heißt bei uns: Die Front öffnet auf leichten Druck, der Auszug schließt gedämpft, das Licht ist da, wenn Sie es brauchen. Geräte verschwinden in Nischen, die genau für sie gebaut sind.",
      "Technik soll spürbar sein, nicht sichtbar. Eine Signature Küche erkennt man deshalb vor allem an dem, was man nicht hört."
    ]
  },
  {
    id: "fertigung",
    label: "Fertigung",
    title: "Präzision ab Werk",
    body: "Gefertigt in Deutschland. Toleranzen in Millimetern, gedacht in Jahrzehnten.",
    detail: [
      "Korpus, Front und Arbeitsplatte kommen aus einer Hand und werden in Deutschland gefertigt. Aus Ihrem Projekt entsteht eine Fertigungszeichnung, keine Interpretation — jedes Maß, das Sie im Konfigurator sehen, ist das Maß, das gebaut wird.",
      "Weil wir in Jahrzehnten denken, sind Beschläge und Fronten auf lange Nutzung ausgelegt, nicht auf den nächsten Trend."
    ]
  },
  {
    id: "planung",
    label: "Planung",
    title: "Persönliche Planung",
    body: "Vom ersten Entwurf bis zur Montage begleitet Sie ein Planer — kein Formular.",
    detail: [
      "Sie beginnen im Konfigurator, wann und wo Sie wollen — auch ohne Konto. Sobald Sie Ihre Küche als Projekt speichern und anfragen, übernimmt ein Planer: prüft Maße, Anschlüsse und Geräte und schlägt vor, was im Konfigurator noch nicht geht.",
      "Ein Ansprechpartner, vom ersten Entwurf bis zum ersten Abendessen."
    ]
  }
];

export const materials: Material[] = [
  {
    id: "walnut-memory",
    finishKey: "walnut-memory",
    name: "Nussbaum Memory",
    kind: "Furnier",
    body: "Echtholz, geölt",
    image: "/images/material-walnut-memory-wn832.png",
    alt: "Nussbaum Memory Furnier mit ruhiger Maserung",
    position: "center bottom",
    zoom: 1.4,
    detail: [
      "Echtholzfurnier mit durchlaufender Maserung: Die Zeichnung setzt sich von Front zu Front fort, kein Blatt gleicht dem anderen.",
      "Geölt statt lackiert — das Holz bleibt offenporig, fühlt sich warm an und darf mit den Jahren nachdunkeln. Kleine Spuren des Lebens lassen sich nachölen."
    ],
    facts: ["Echtholzfurnier", "geölt, offenporig", "durchlaufende Maserung"]
  },
  {
    id: "fenix-castoro",
    finishKey: "castoro-ottawa",
    name: "Castoro Ottawa",
    kind: "Fenix",
    body: "Nanotech, matt, selbstheilend",
    image: "/images/material-fenix-castoro-ottawa-0717.png",
    alt: "Fenix Castoro Ottawa, warmes Graubraun, matt",
    detail: [
      "Eine extrem matte Nanotech-Oberfläche mit samtiger Haptik: Fingerabdrücke bleiben unsichtbar, Licht wird kaum reflektiert, feine Mikrokratzer lassen sich mit Wärme wieder schließen.",
      "Castoro Ottawa ist ein warmes Graubraun, das Holz und Stein ruhig zusammenführt."
    ],
    facts: ["Anti-Fingerprint", "extrem matt", "thermisch reparierbar"]
  },
  {
    id: "fenix-verde",
    finishKey: "verde-kitami",
    name: "Verde Kitami",
    kind: "Fenix",
    body: "Nanotech, matt, selbstheilend",
    image: "/images/material-fenix-verde-kitami-0794.png",
    alt: "Fenix Verde Kitami, tiefes Grün, matt",
    detail: [
      "Dieselbe Nanotech-Oberfläche in einem tiefen, gedeckten Grün. Verde Kitami wirkt bei Tageslicht fast grau, am Abend satt und ruhig.",
      "Und bleibt dabei so pflegeleicht wie alle Fenix-Fronten: Anti-Fingerprint, matt, thermisch reparierbar."
    ],
    facts: ["Anti-Fingerprint", "extrem matt", "thermisch reparierbar"]
  },
  {
    id: "porcelain",
    finishKey: "porcelain",
    name: "Porzellan",
    kind: "Lack",
    body: "Seidenmatt, Anti-Fingerprint",
    color: "#F5F1EA",
    alt: "Porzellan, warmes Cremeweiß, seidenmatt lackiert",
    detail: [
      "Der Klassiker der Signature Linie: ein warmes Cremeweiß, seidenmatt lackiert, mit Anti-Fingerprint.",
      "Porzellan macht kleine Räume größer und große Räume ruhiger — und ist in der Grundausstattung enthalten."
    ],
    facts: ["Lack seidenmatt", "Anti-Fingerprint", "in der Grundausstattung"]
  }
];

/** The three decisions in the configurator; the HUD cycles through them. */
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
    body: "Module in die Zeile ziehen, die Insel ohne, normal oder groß. Der Richtpreis folgt jeder Änderung."
  },
  {
    id: "review",
    label: "Prüfen",
    title: "Speichern und anfragen",
    body: "Aus jedem Stand wird ein Projekt: mit Versionen, Fotos und einer Anfrage an Ihren Planer."
  }
];

/** Von 0 auf 100 °C: the four clicks from an empty scene to a request. */
export const steps: Step[] = [
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
];

export const roomStory = {
  label: "Visualisierung",
  lead: "Stellen Sie Front, Korpus und Aufbau in Echtzeit zusammen — und sehen Sie das Ergebnis dort, wo es hingehört: in einem Raum, nicht auf einem Datenblatt.",
  image: "/images/signature-panorama.webp",
  alt: "Dunkle Küche mit Industriefenstern und großzügiger Arbeitsinsel",
  caption: "Agile — Industriefenster, mattes Schwarz",
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
  ] satisfies RoomFeature[]
};

export const collections: Collection[] = [
  {
    id: "agile",
    title: "Agile",
    subtitle: "Effizienz. Mit Klasse.",
    body: "Klare Linien, schnelle Entscheidungen, präzise Planung. Die Linie für alle, die genau wissen, was sie wollen.",
    href: configureHref,
    image: "/images/signature-panorama.webp",
    alt: "Dunkle Küche mit Industriefenstern und großzügiger Arbeitsinsel",
    caption: "Industriefenster, mattes Schwarz"
  },
  {
    id: "exclusive",
    title: "Exclusive Line",
    subtitle: "High-End. Ohne Kompromiss.",
    body: "Materialtiefe, Maßanfertigung und persönliche Beratung. Die Linie für Räume, die bleiben sollen.",
    href: configureHref,
    image: "/images/signature-hero.jpg",
    alt: "Offene Signature Küche mit Insel und warmem Abendlicht",
    caption: "Eiche, Feinstein, mattes Schwarz"
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

/**
 * The hero film: a 15-second silent loop, served in two sizes from
 * public/video. Transcoded from the supplied master with ffmpeg (H.264,
 * faststart, no audio); the poster is a frame from the same film.
 */
export const heroFilm = {
  sources: [
    { src: "/video/hero-1080.mp4", media: "(min-width: 768px)" },
    { src: "/video/hero-720.mp4", media: undefined }
  ],
  poster: "/images/hero-poster.jpg"
};
