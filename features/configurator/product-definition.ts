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
      key: "castoro-ottawa",
      label: {
        de: "Fenix Castoro Ottawa",
        en: "Fenix Castoro Ottawa",
        es: "Fenix Castoro Ottawa"
      },
      hex: "#77694f",
      textureUrl: "/images/material-fenix-castoro-ottawa-0717.png",
      material: "matte",
      priceDeltaCents: 48000,
      externalId: "front-fenix-castoro-ottawa-0717"
    },
    {
      key: "verde-kitami",
      label: {
        de: "Fenix Verde Kitami",
        en: "Fenix Verde Kitami",
        es: "Fenix Verde Kitami"
      },
      hex: "#a3ab99",
      textureUrl: "/images/material-fenix-verde-kitami-0794.png",
      material: "matte",
      priceDeltaCents: 52000,
      externalId: "front-fenix-verde-kitami-0794"
    },
    {
      key: "walnut-memory",
      label: { de: "Nussbaum Memory", en: "Walnut Memory", es: "Nogal Memory" },
      hex: "#5d3f2e",
      textureUrl: "/images/material-walnut-memory-wn832.png",
      normalMapUrl: "/images/material-walnut-memory-wn832-normal.png",
      roughnessMapUrl: "/images/material-walnut-memory-wn832-rough.png",
      material: "structured",
      priceDeltaCents: 58000,
      externalId: "front-walnut-memory-wn832"
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

export const RDTD_KITCHEN_PRODUCT_VERSION =
  "rdtdot-signature-kitchen-v1@1";

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
