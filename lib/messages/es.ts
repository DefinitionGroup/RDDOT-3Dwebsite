import type { Messages } from "./de";

export const es = {
  header: {
    home: "Inicio de rotpunkt Signature",
    openMenu: "Abrir menú",
    closeMenu: "Cerrar menú",
    language: "Idioma",
    currentLanguage: (name: string) => `Idioma: ${name}`
  },
  preview: {
    exit: "Salir de la vista previa"
  },
  blocks: {
    moreAbout: (name: string) => `Más sobre ${name}`,
    includedAsStandard: "Incluido de serie",
    surcharge: (price: string) => `Suplemento ${price}`,
    indicativePrice: "Precio orientativo",
    indicativePriceStandard: "Precio orientativo del equipamiento básico",
    indicativePricePreset: "Precio orientativo de este equipamiento",
    decisions: (count: number) => `Las ${["", "una", "dos", "tres", "cuatro", "cinco"][count] ?? count} decisiones`,
    configureNow: "Configurar ahora"
  }
} satisfies Messages;
