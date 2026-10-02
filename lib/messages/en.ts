import type { Messages } from "./de";

export const en = {
  header: {
    home: "rotpunkt Signature home",
    openMenu: "Open menu",
    closeMenu: "Close menu",
    language: "Language",
    currentLanguage: (name: string) => `Language: ${name}`
  },
  preview: {
    exit: "Exit preview"
  },
  blocks: {
    moreAbout: (name: string) => `More about ${name}`,
    includedAsStandard: "Included as standard",
    surcharge: (price: string) => `Surcharge ${price}`,
    indicativePrice: "Indicative price",
    indicativePriceStandard: "Indicative price, standard specification",
    indicativePricePreset: "Indicative price of this specification",
    decisions: (count: number) => `The ${["", "one", "two", "three", "four", "five"][count] ?? count} decisions`,
    configureNow: "Configure now"
  }
} satisfies Messages;
