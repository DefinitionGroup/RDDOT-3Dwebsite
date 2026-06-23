import type {
  ConfiguratorProductDefinition,
  ConfiguratorState
} from "@/features/configurator/types";
import { normalizeConfiguratorState } from "@/features/configurator/product-definition";

export type SanityProductDefinitionDocument = ConfiguratorProductDefinition & {
  _id: string;
  _type: "productDefinition";
};

export type SanityConfiguratorBlock = {
  _key?: string;
  _type: "configuratorBlock";
  product?: SanityProductDefinitionDocument;
  defaultState?: Partial<ConfiguratorState>;
};

export function productDefinitionFromSanity(
  document: SanityProductDefinitionDocument
): ConfiguratorProductDefinition {
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
