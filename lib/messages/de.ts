/**
 * Functional copy: the interface words around editorial content, owned by
 * code, not Sanity (ADR 0007). German defines the shape; every other locale
 * must match it exactly or the build fails.
 */
export const de = {
  header: {
    home: "rotpunkt Signature Startseite",
    openMenu: "Menü öffnen",
    closeMenu: "Menü schließen",
    language: "Sprache",
    currentLanguage: (name: string) => `Sprache: ${name}`
  },
  preview: {
    exit: "Vorschau beenden"
  },
  blocks: {
    moreAbout: (name: string) => `Mehr zu ${name}`,
    includedAsStandard: "In der Grundausstattung enthalten",
    surcharge: (price: string) => `Aufpreis ${price}`,
    indicativePrice: "Richtpreis",
    indicativePriceStandard: "Richtpreis der Grundausstattung",
    indicativePricePreset: "Richtpreis dieser Ausstattung",
    decisions: (count: number) => `Die ${["", "eine", "zwei", "drei", "vier", "fünf"][count] ?? count} Entscheidungen`,
    configureNow: "Jetzt konfigurieren"
  }
};

export type Messages = typeof de;
