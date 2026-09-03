export type LocaleCode = "de" | "en" | "es";

export type KitchenLayoutKey = "straight-line";

export type FinishOption = {
  key: string;
  label: Record<LocaleCode, string>;
  hex: string;
  textureUrl?: string;
  normalMapUrl?: string;
  roughnessMapUrl?: string;
  material: "matte" | "satin" | "structured";
  priceDeltaCents: number;
  externalId?: string;
};

export type PriceBook = {
  currency: "EUR";
  taxRate: number;
  basePriceCents: number;
  fakeCheckoutLabel: Record<LocaleCode, string>;
};

/** Sum-of-parts price book: no base price, totals come from module line items. */
export type PriceBookV2 = Omit<PriceBook, "basePriceCents">;

/** Customer-selectable wall module types on the 0.30m slot grid. */
export type WallModuleKey = "big" | "device" | "small";

/**
 * Island size as front-unit count. 2, 4 and 6 tile cleanly in both rows;
 * 5 — the large island offered in the configurator — carries one more front
 * unit than the standard one, and its back row stretches to match.
 */
export type IslandSize = 0 | 2 | 4 | 5 | 6;

export type WallModuleCatalogEntry = {
  key: WallModuleKey;
  label: Record<LocaleCode, string>;
  widthM: number;
  priceCents: number;
  /** Relative share of the default kitchen's finish-bearing surface. */
  finishWeight: number;
  /** Prefab variant keys in the module manifest usable for this type. */
  prefabVariants: string[];
  maxCount?: number;
};

export type IslandUnitCatalogEntry = {
  label: Record<LocaleCode, string>;
  widthM: number;
  priceCents: number;
  finishWeight: number;
};

export type IslandCatalog = {
  frontUnit: IslandUnitCatalogEntry;
  backUnit90: IslandUnitCatalogEntry;
  backUnit60: IslandUnitCatalogEntry;
  sizes: readonly IslandSize[];
  worktopLabel: Record<LocaleCode, string>;
  worktopPricePerMeterCents: number;
  /** Worktop length = frontUnits x frontUnit.widthM + overhang. */
  worktopOverhangM: number;
};

export type WallConstraints = {
  minModules: number;
  maxLineWidthM: number;
};

export type ConfiguratorProductDefinitionV1 = {
  schemaVersion: 1;
  productKey: string;
  title: Record<LocaleCode, string>;
  description: Record<LocaleCode, string>;
  availableLayouts: KitchenLayoutKey[];
  defaultLayout: KitchenLayoutKey;
  cabinetColors: FinishOption[];
  frontColors: FinishOption[];
  priceBook: PriceBook;
};

export type ConfiguratorProductDefinitionV2 = {
  schemaVersion: 2;
  productKey: string;
  title: Record<LocaleCode, string>;
  description: Record<LocaleCode, string>;
  availableLayouts: KitchenLayoutKey[];
  defaultLayout: KitchenLayoutKey;
  cabinetColors: FinishOption[];
  frontColors: FinishOption[];
  wallCatalog: WallModuleCatalogEntry[];
  wallConstraints: WallConstraints;
  island: IslandCatalog;
  /** Raw finish-weight sum of the default layout; factor 1.0 by definition. */
  finishWeightBaseline: number;
  defaultWallModules: readonly WallModuleKey[];
  defaultIslandSize: IslandSize;
  priceBook: PriceBookV2;
};

/** The currently active definition shape. */
export type ConfiguratorProductDefinition = ConfiguratorProductDefinitionV2;

export type AnyConfiguratorProductDefinition =
  | ConfiguratorProductDefinitionV1
  | ConfiguratorProductDefinitionV2;

export type ConfiguratorStateV1 = {
  schemaVersion: 1;
  productKey: string;
  layout: KitchenLayoutKey;
  cabinetColorKey: string;
  frontColorKey: string;
};

export type ConfiguratorStateV2 = {
  schemaVersion: 2;
  productKey: string;
  layout: KitchenLayoutKey;
  cabinetColorKey: string;
  frontColorKey: string;
  /** Ordered left-to-right wall line composition. */
  wallModules: WallModuleKey[];
  islandSize: IslandSize;
};

/** The currently active state shape. */
export type ConfiguratorState = ConfiguratorStateV2;

export type AnyConfiguratorState = ConfiguratorStateV1 | ConfiguratorStateV2;

export type QuoteLineItem = {
  key: string;
  label: Record<LocaleCode, string>;
  quantity: number;
  unitPriceCents: number;
  totalCents: number;
};

export type ConfiguratorQuote = {
  currency: PriceBook["currency"];
  lineItems: QuoteLineItem[];
  modulesCents: number;
  /** Finish-weight factor relative to the default layout (default = 1). */
  finishWeightFactor: number;
  cabinetDeltaCents: number;
  frontDeltaCents: number;
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
};

export type CameraView = "signature" | "front" | "detail";

export type VisualizationMode = "studio" | "apartment";
