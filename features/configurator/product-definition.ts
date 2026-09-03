import type {
  AnyConfiguratorProductDefinition,
  AnyConfiguratorState,
  ConfiguratorProductDefinitionV1,
  ConfiguratorProductDefinitionV2,
  ConfiguratorQuote,
  ConfiguratorState,
  FinishOption,
  IslandSize,
  LocaleCode,
  QuoteLineItem,
  WallModuleKey
} from "@/features/configurator/types";

const CABINET_COLORS: FinishOption[] = [
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
];

const FRONT_COLORS: FinishOption[] = [
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
];

/**
 * Historical fixed-layout definition. Kept in the registry so stored
 * Configuration Revisions pinned to it remain identifiable, but it is no
 * longer supported for new work: resolution paths fail closed per the
 * agreed migration posture.
 */
export const RDTD_KITCHEN_PRODUCT: ConfiguratorProductDefinitionV1 = {
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
  cabinetColors: CABINET_COLORS,
  frontColors: FRONT_COLORS,
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

/**
 * Module-based definition. Placeholder prices are calibrated so the default
 * layout (2 big, 2 device, 4 small, island size 4) plus worktop reproduces
 * the v1 base price of 849000 cents exactly, and finish weights are
 * normalized so the default layout has finish factor 1.0 — existing finish
 * deltas keep their meaning.
 */
export const RDTD_KITCHEN_PRODUCT_V2: ConfiguratorProductDefinitionV2 = {
  schemaVersion: 2,
  productKey: "rdtdot-signature-kitchen-v1",
  title: RDTD_KITCHEN_PRODUCT.title,
  description: {
    de: "Modulare geradlinige Küche mit konfigurierbaren Schränken, Insel sowie Front- und Korpusfarben.",
    en: "Modular straight kitchen with configurable cabinets, island, and front and cabinet colors.",
    es: "Cocina lineal modular con muebles configurables, isla y colores de frente y mueble."
  },
  availableLayouts: ["straight-line"],
  defaultLayout: "straight-line",
  cabinetColors: CABINET_COLORS,
  frontColors: FRONT_COLORS,
  wallCatalog: [
    {
      key: "big",
      label: { de: "Hochschrank", en: "Tall cabinet", es: "Columna" },
      widthM: 0.62,
      priceCents: 70000,
      finishWeight: 2,
      prefabVariants: ["wall-big-L", "wall-big-R"]
    },
    {
      key: "device",
      label: { de: "Geräteschrank", en: "Appliance cabinet", es: "Columna de electrodomésticos" },
      widthM: 0.64,
      priceCents: 130000,
      finishWeight: 1.6,
      prefabVariants: ["wall-device-A", "wall-device-B"],
      maxCount: 2
    },
    {
      key: "small",
      label: { de: "Schrank 30", en: "Cabinet 30", es: "Armario 30" },
      widthM: 0.3,
      priceCents: 32000,
      finishWeight: 1,
      prefabVariants: ["wall-small-1", "wall-small-2", "wall-small-3", "wall-small-4"]
    }
  ],
  wallConstraints: {
    minModules: 2,
    maxLineWidthM: 5.4
  },
  island: {
    frontUnit: {
      label: { de: "Insel-Auszugselement", en: "Island drawer unit", es: "Módulo de cajones de isla" },
      widthM: 0.75,
      priceCents: 42000,
      finishWeight: 0.9
    },
    backUnit90: {
      label: { de: "Insel-Rückelement 90", en: "Island back unit 90", es: "Módulo trasero de isla 90" },
      widthM: 0.9,
      priceCents: 29000,
      finishWeight: 0.7
    },
    backUnit60: {
      label: { de: "Insel-Rückelement 60", en: "Island back unit 60", es: "Módulo trasero de isla 60" },
      widthM: 0.6,
      priceCents: 19600,
      finishWeight: 0.7
    },
    sizes: [0, 2, 4, 5, 6],
    worktopLabel: { de: "Arbeitsplatte", en: "Worktop", es: "Encimera" },
    worktopPricePerMeterCents: 18000,
    worktopOverhangM: 0.1
  },
  finishWeightBaseline: 17.6,
  defaultWallModules: ["big", "device", "small", "small", "small", "small", "device", "big"],
  defaultIslandSize: 4,
  priceBook: {
    currency: "EUR",
    taxRate: 0.19,
    fakeCheckoutLabel: RDTD_KITCHEN_PRODUCT.priceBook.fakeCheckoutLabel
  }
};

export const RDTD_KITCHEN_PRODUCT_V1_VERSION = "rdtdot-signature-kitchen-v1@1";
export const RDTD_KITCHEN_PRODUCT_VERSION = "rdtdot-signature-kitchen-v1@2";

const PRODUCT_DEFINITIONS = new Map<string, AnyConfiguratorProductDefinition>([
  [RDTD_KITCHEN_PRODUCT_V1_VERSION, RDTD_KITCHEN_PRODUCT],
  [RDTD_KITCHEN_PRODUCT_VERSION, RDTD_KITCHEN_PRODUCT_V2]
]);

/**
 * Versions allowed for new checkpoints, restores, and shared-revision
 * resolution. Deliberately narrower than the registry: v1 stays known for
 * historical display but fails closed everywhere it would have to execute.
 */
export const SUPPORTED_PRODUCT_DEFINITION_VERSIONS = Object.freeze([
  RDTD_KITCHEN_PRODUCT_VERSION
]);

export function findConfiguratorProductDefinition(version: string) {
  return PRODUCT_DEFINITIONS.get(version) ?? null;
}

export const DEFAULT_CONFIGURATOR_STATE: ConfiguratorState = {
  schemaVersion: 2,
  productKey: RDTD_KITCHEN_PRODUCT_V2.productKey,
  layout: RDTD_KITCHEN_PRODUCT_V2.defaultLayout,
  cabinetColorKey: "graphite",
  frontColorKey: "porcelain",
  wallModules: [...RDTD_KITCHEN_PRODUCT_V2.defaultWallModules],
  islandSize: RDTD_KITCHEN_PRODUCT_V2.defaultIslandSize
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

export function findWallCatalogEntry(
  definition: ConfiguratorProductDefinitionV2,
  key: WallModuleKey
) {
  const entry = definition.wallCatalog.find((candidate) => candidate.key === key);
  if (!entry) {
    throw new Error(`Wall module type missing from catalog: ${key}`);
  }
  return entry;
}

/**
 * Back-row tiling for each legal island size. For 2, 4 and 6 the back row
 * equals the front width exactly; for 5 it comes up short by the amount
 * `getIslandBackStretchM` reports, and the scene stretches the back units
 * evenly to close it.
 */
export function getIslandBackComposition(size: IslandSize): Array<"90" | "60"> {
  switch (size) {
    case 0:
      return [];
    case 2:
      return ["90", "60"];
    case 4:
      return ["90", "60", "60", "90"];
    case 5:
      return ["90", "60", "60", "90", "60"];
    case 6:
      return ["90", "90", "90", "90", "90"];
  }
}

/** How far the nominal back row falls short of the front row, in meters. */
export function getIslandBackStretchM(size: IslandSize) {
  const back = getIslandBackComposition(size).reduce(
    (sum, unit) => sum + (unit === "90" ? 0.9 : 0.6),
    0
  );
  return Math.max(0, size * 0.75 - back);
}

export function getWorktopLengthM(
  definition: ConfiguratorProductDefinitionV2,
  size: IslandSize
) {
  if (size === 0) {
    return 0;
  }
  return size * definition.island.frontUnit.widthM + definition.island.worktopOverhangM;
}

function isWallModuleKey(value: unknown): value is WallModuleKey {
  return value === "big" || value === "device" || value === "small";
}

function normalizeWallModules(
  definition: ConfiguratorProductDefinitionV2,
  input: unknown
): WallModuleKey[] {
  const candidates = Array.isArray(input) ? input.filter(isWallModuleKey) : [];
  if (candidates.length < definition.wallConstraints.minModules) {
    return [...definition.defaultWallModules];
  }

  // Enforce per-type maximums by demoting surplus modules to the smallest type.
  const counts = new Map<WallModuleKey, number>();
  const capped = candidates.map((key) => {
    const entry = findWallCatalogEntry(definition, key);
    const used = counts.get(key) ?? 0;
    if (entry.maxCount !== undefined && used >= entry.maxCount) {
      return "small" as const;
    }
    counts.set(key, used + 1);
    return key;
  });

  // Enforce the wall width cap by dropping modules from the right.
  const widthOf = (key: WallModuleKey) => findWallCatalogEntry(definition, key).widthM;
  let total = capped.reduce((sum, key) => sum + widthOf(key), 0);
  while (
    total > definition.wallConstraints.maxLineWidthM &&
    capped.length > definition.wallConstraints.minModules
  ) {
    const removed = capped.pop();
    if (!removed) break;
    total -= widthOf(removed);
  }

  return capped;
}

function normalizeIslandSize(
  definition: ConfiguratorProductDefinitionV2,
  input: unknown
): IslandSize {
  const sizes = definition.island.sizes;
  if (typeof input === "number" && (sizes as readonly number[]).includes(input)) {
    return input as IslandSize;
  }
  return definition.defaultIslandSize;
}

export function normalizeConfiguratorState(
  state: Partial<AnyConfiguratorState> | null | undefined,
  definition: ConfiguratorProductDefinitionV2 = RDTD_KITCHEN_PRODUCT_V2
): ConfiguratorState {
  const layout = definition.availableLayouts.includes(state?.layout ?? "straight-line")
    ? state?.layout ?? definition.defaultLayout
    : definition.defaultLayout;

  const cabinetColor = findFinish(
    definition.cabinetColors,
    state?.cabinetColorKey ?? DEFAULT_CONFIGURATOR_STATE.cabinetColorKey
  );
  const frontColor = findFinish(
    definition.frontColors,
    state?.frontColorKey ?? DEFAULT_CONFIGURATOR_STATE.frontColorKey
  );

  // v1 states (and unversioned partials) carry no layout composition: they
  // map onto the default module layout with their finishes preserved.
  const v2Input = state && "wallModules" in state ? state : null;

  return {
    schemaVersion: 2,
    productKey: definition.productKey,
    layout,
    cabinetColorKey: cabinetColor.key,
    frontColorKey: frontColor.key,
    wallModules: normalizeWallModules(definition, v2Input?.wallModules),
    islandSize: normalizeIslandSize(definition, v2Input?.islandSize)
  };
}

function sumFinishWeights(
  definition: ConfiguratorProductDefinitionV2,
  state: ConfiguratorState
) {
  const wall = state.wallModules.reduce(
    (sum, key) => sum + findWallCatalogEntry(definition, key).finishWeight,
    0
  );
  const island =
    state.islandSize * definition.island.frontUnit.finishWeight +
    getIslandBackComposition(state.islandSize).reduce(
      (sum, unit) =>
        sum +
        (unit === "90"
          ? definition.island.backUnit90.finishWeight
          : definition.island.backUnit60.finishWeight),
      0
    );
  return wall + island;
}

function buildLineItems(
  definition: ConfiguratorProductDefinitionV2,
  state: ConfiguratorState
): QuoteLineItem[] {
  const items: QuoteLineItem[] = [];

  for (const entry of definition.wallCatalog) {
    const quantity = state.wallModules.filter((key) => key === entry.key).length;
    if (quantity > 0) {
      items.push({
        key: `wall-${entry.key}`,
        label: entry.label,
        quantity,
        unitPriceCents: entry.priceCents,
        totalCents: quantity * entry.priceCents
      });
    }
  }

  if (state.islandSize > 0) {
    const island = definition.island;
    items.push({
      key: "island-front",
      label: island.frontUnit.label,
      quantity: state.islandSize,
      unitPriceCents: island.frontUnit.priceCents,
      totalCents: state.islandSize * island.frontUnit.priceCents
    });

    const back = getIslandBackComposition(state.islandSize);
    const back90 = back.filter((unit) => unit === "90").length;
    const back60 = back.filter((unit) => unit === "60").length;
    if (back90 > 0) {
      items.push({
        key: "island-back-90",
        label: island.backUnit90.label,
        quantity: back90,
        unitPriceCents: island.backUnit90.priceCents,
        totalCents: back90 * island.backUnit90.priceCents
      });
    }
    if (back60 > 0) {
      items.push({
        key: "island-back-60",
        label: island.backUnit60.label,
        quantity: back60,
        unitPriceCents: island.backUnit60.priceCents,
        totalCents: back60 * island.backUnit60.priceCents
      });
    }

    const worktopLength = getWorktopLengthM(definition, state.islandSize);
    items.push({
      key: "island-worktop",
      label: island.worktopLabel,
      quantity: worktopLength,
      unitPriceCents: island.worktopPricePerMeterCents,
      totalCents: Math.round(worktopLength * island.worktopPricePerMeterCents)
    });
  }

  return items;
}

export function getConfiguratorQuote(
  state: AnyConfiguratorState,
  productDefinition: AnyConfiguratorProductDefinition = RDTD_KITCHEN_PRODUCT_V2
): ConfiguratorQuote {
  if (productDefinition.schemaVersion === 1) {
    return getLegacyQuote(state, productDefinition);
  }

  const definition = productDefinition;
  const normalized: ConfiguratorState =
    state.schemaVersion === 2
      ? state
      : normalizeConfiguratorState(state, definition);

  const cabinetColor = findFinish(definition.cabinetColors, normalized.cabinetColorKey);
  const frontColor = findFinish(definition.frontColors, normalized.frontColorKey);
  const lineItems = buildLineItems(definition, normalized);
  const modulesCents = lineItems.reduce((sum, item) => sum + item.totalCents, 0);

  const finishWeightFactor =
    sumFinishWeights(definition, normalized) / definition.finishWeightBaseline;
  const cabinetDeltaCents = Math.round(
    cabinetColor.priceDeltaCents * finishWeightFactor
  );
  const frontDeltaCents = Math.round(frontColor.priceDeltaCents * finishWeightFactor);

  const subtotalCents = modulesCents + cabinetDeltaCents + frontDeltaCents;
  const taxCents = Math.round(subtotalCents * definition.priceBook.taxRate);

  return {
    currency: definition.priceBook.currency,
    lineItems,
    modulesCents,
    finishWeightFactor,
    cabinetDeltaCents,
    frontDeltaCents,
    subtotalCents,
    taxCents,
    totalCents: subtotalCents + taxCents
  };
}

/** Quote math for historical v1 revisions: base price plus flat deltas. */
function getLegacyQuote(
  state: AnyConfiguratorState,
  definition: ConfiguratorProductDefinitionV1
): ConfiguratorQuote {
  const cabinetColor = findFinish(definition.cabinetColors, state.cabinetColorKey);
  const frontColor = findFinish(definition.frontColors, state.frontColorKey);
  const basePriceCents = definition.priceBook.basePriceCents;
  const subtotalCents =
    basePriceCents + cabinetColor.priceDeltaCents + frontColor.priceDeltaCents;
  const taxCents = Math.round(subtotalCents * definition.priceBook.taxRate);

  return {
    currency: definition.priceBook.currency,
    lineItems: [
      {
        key: "base",
        label: { de: "Basis", en: "Base", es: "Base" },
        quantity: 1,
        unitPriceCents: basePriceCents,
        totalCents: basePriceCents
      }
    ],
    modulesCents: basePriceCents,
    finishWeightFactor: 1,
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
