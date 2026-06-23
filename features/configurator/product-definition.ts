import type {
  ConfiguratorProductDefinition,
  ConfiguratorQuote,
  ConfiguratorState,
  FinishOption,
  LocaleCode
} from "@/features/configurator/types";

export const RDTD_KITCHEN_PRODUCT: ConfiguratorProductDefinition = {
  schemaVersion: 1,
  productKey: "rdtdot-signature-kitchen-v1",
  title: {
    de: "Signature Küche",
    en: "Signature Kitchen",
    es: "Cocina Signature"
  },
  description: {
    de: "Geradlinige Küche als erster 3D-Prototyp mit Front- und Korpusfarben.",
    en: "Straight kitchen as the first 3D prototype with front and cabinet colors.",
    es: "Cocina lineal como primer prototipo 3D con colores de frente y mueble."
  },
  availableLayouts: ["straight-line"],
  defaultLayout: "straight-line",
  cabinetColors: [
    {
      key: "graphite",
      label: { de: "Graphit", en: "Graphite", es: "Grafito" },
      hex: "#393531",
      material: "matte",
      priceDeltaCents: 0,
      externalId: "cabinet-graphite"
    },
    {
      key: "porcelain",
      label: { de: "Porzellan", en: "Porcelain", es: "Porcelana" },
      hex: "#f2eee8",
      material: "satin",
      priceDeltaCents: 38000,
      externalId: "cabinet-porcelain"
    },
    {
      key: "oak",
      label: { de: "Eiche warm", en: "Warm oak", es: "Roble cálido" },
      hex: "#9d8060",
      material: "structured",
      priceDeltaCents: 62000,
      externalId: "cabinet-warm-oak"
    }
  ],
  frontColors: [
    {
      key: "porcelain",
      label: { de: "Porzellan", en: "Porcelain", es: "Porcelana" },
      hex: "#f5f1ea",
      material: "satin",
      priceDeltaCents: 0,
      externalId: "front-porcelain"
    },
    {
      key: "red-dot",
      label: { de: "Rotpunkt", en: "Red dot", es: "Punto rojo" },
      hex: "#ff0004",
      material: "matte",
      priceDeltaCents: 48000,
      externalId: "front-red-dot"
    },
    {
      key: "night",
      label: { de: "Nacht", en: "Night", es: "Noche" },
      hex: "#171615",
      material: "matte",
      priceDeltaCents: 52000,
      externalId: "front-night"
    },
    {
      key: "sage",
      label: { de: "Salbei", en: "Sage", es: "Salvia" },
      hex: "#9aa18d",
      material: "matte",
      priceDeltaCents: 35000,
      externalId: "front-sage"
    }
  ],
  priceBook: {
    currency: "EUR",
    taxRate: 0.19,
    basePriceCents: 849000,
    fakeCheckoutLabel: {
      de: "Konfiguration anfragen",
      en: "Request configuration",
      es: "Solicitar configuración"
    }
  }
};

export const DEFAULT_CONFIGURATOR_STATE: ConfiguratorState = {
  schemaVersion: 1,
  productKey: RDTD_KITCHEN_PRODUCT.productKey,
  layout: RDTD_KITCHEN_PRODUCT.defaultLayout,
  cabinetColorKey: "graphite",
  frontColorKey: "porcelain"
};

export function getLocalizedLabel(
  labels: Record<LocaleCode, string>,
  locale: LocaleCode = "de"
) {
  return labels[locale] ?? labels.de;
}

export function findFinish(options: FinishOption[], key: string) {
  return options.find((option) => option.key === key) ?? options[0];
}

export function normalizeConfiguratorState(
  state: Partial<ConfiguratorState> | null | undefined
): ConfiguratorState {
  const layout = RDTD_KITCHEN_PRODUCT.availableLayouts.includes(state?.layout ?? "straight-line")
    ? state?.layout ?? RDTD_KITCHEN_PRODUCT.defaultLayout
    : RDTD_KITCHEN_PRODUCT.defaultLayout;

  const cabinetColor = findFinish(
    RDTD_KITCHEN_PRODUCT.cabinetColors,
    state?.cabinetColorKey ?? DEFAULT_CONFIGURATOR_STATE.cabinetColorKey
  );
  const frontColor = findFinish(
    RDTD_KITCHEN_PRODUCT.frontColors,
    state?.frontColorKey ?? DEFAULT_CONFIGURATOR_STATE.frontColorKey
  );

  return {
    schemaVersion: 1,
    productKey: RDTD_KITCHEN_PRODUCT.productKey,
    layout,
    cabinetColorKey: cabinetColor.key,
    frontColorKey: frontColor.key
  };
}

export function getConfiguratorQuote(state: ConfiguratorState): ConfiguratorQuote {
  const cabinetColor = findFinish(RDTD_KITCHEN_PRODUCT.cabinetColors, state.cabinetColorKey);
  const frontColor = findFinish(RDTD_KITCHEN_PRODUCT.frontColors, state.frontColorKey);
  const basePriceCents = RDTD_KITCHEN_PRODUCT.priceBook.basePriceCents;
  const subtotalCents = basePriceCents + cabinetColor.priceDeltaCents + frontColor.priceDeltaCents;
  const taxCents = Math.round(subtotalCents * RDTD_KITCHEN_PRODUCT.priceBook.taxRate);

  return {
    currency: RDTD_KITCHEN_PRODUCT.priceBook.currency,
    basePriceCents,
    cabinetDeltaCents: cabinetColor.priceDeltaCents,
    frontDeltaCents: frontColor.priceDeltaCents,
    subtotalCents,
    taxCents,
    totalCents: subtotalCents + taxCents
  };
}

export function formatCurrency(cents: number, locale: LocaleCode = "de") {
  return new Intl.NumberFormat(locale === "de" ? "de-DE" : locale === "es" ? "es-ES" : "en-US", {
    currency: "EUR",
    maximumFractionDigits: 0,
    style: "currency"
  }).format(cents / 100);
}
