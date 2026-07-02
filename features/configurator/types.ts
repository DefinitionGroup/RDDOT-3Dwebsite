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

export type ConfiguratorProductDefinition = {
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

export type ConfiguratorState = {
  schemaVersion: 1;
  productKey: string;
  layout: KitchenLayoutKey;
  cabinetColorKey: string;
  frontColorKey: string;
};

export type ConfiguratorQuote = {
  currency: PriceBook["currency"];
  basePriceCents: number;
  cabinetDeltaCents: number;
  frontDeltaCents: number;
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
};

export type CameraView = "signature" | "front" | "detail";
