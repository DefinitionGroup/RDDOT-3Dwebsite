import type {
  AnyConfiguratorState,
  ConfiguratorProductDefinitionV1
} from "@/features/configurator/types";
import { normalizeConfiguratorState } from "@/features/configurator/product-definition";

export type SanityProductDefinitionDocument = ConfiguratorProductDefinitionV1 & {
  _id: string;
  _type: "productDefinition";
};

export type SanityConfiguratorBlock = {
  _key?: string;
  _type: "configuratorBlock";
  product?: SanityProductDefinitionDocument;
  defaultState?: Partial<AnyConfiguratorState>;
};

export function productDefinitionFromSanity(
  document: SanityProductDefinitionDocument
): ConfiguratorProductDefinitionV1 {
  return {
    availableLayouts: document.availableLayouts,
    cabinetColors: document.cabinetColors,
    defaultLayout: document.defaultLayout,
    description: document.description,
    frontColors: document.frontColors,
    priceBook: document.priceBook,
    productKey: document.productKey,
    schemaVersion: document.schemaVersion,
    title: document.title
  };
}

export function configuratorStateFromBlock(block: SanityConfiguratorBlock) {
  return normalizeConfiguratorState(block.defaultState);
}
