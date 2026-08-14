import {
  findConfiguratorProductDefinition,
  findFinish,
  getConfiguratorQuote,
  getLocalizedLabel
} from "@/features/configurator/product-definition";
import type {
  ConfiguratorState,
  LocaleCode
} from "@/features/configurator/types";
import type { JsonValue } from "@/features/projects/project-module";

export type RevisionDisplaySnapshot = {
  schemaVersion: 1;
  productTitle: string;
  layoutLabel: string;
  cabinetFinish: string;
  frontFinish: string;
  totalCents: number;
  currency: string;
};

export class UnsupportedProductDefinitionVersionError extends Error {}

export function createRevisionDisplaySnapshot(
  configuration: ConfiguratorState,
  productDefinitionVersion: string,
  locale: LocaleCode = "de"
): RevisionDisplaySnapshot {
  const productDefinition = findConfiguratorProductDefinition(
    productDefinitionVersion
  );
  if (!productDefinition) {
    throw new UnsupportedProductDefinitionVersionError(
      `Unsupported Product Definition version: ${productDefinitionVersion}`
    );
  }
  const cabinet = findFinish(
    productDefinition.cabinetColors,
    configuration.cabinetColorKey
  );
  const front = findFinish(
    productDefinition.frontColors,
    configuration.frontColorKey
  );
  const quote = getConfiguratorQuote(configuration, productDefinition);

  return {
    schemaVersion: 1,
    productTitle: getLocalizedLabel(productDefinition.title, locale),
    layoutLabel: "Küchenzeile, gerade",
    cabinetFinish: getLocalizedLabel(cabinet.label, locale),
    frontFinish: getLocalizedLabel(front.label, locale),
    totalCents: quote.totalCents,
    currency: quote.currency
  };
}

export function parseRevisionDisplaySnapshot(
  value: JsonValue
): RevisionDisplaySnapshot | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  const snapshot = value as Record<string, JsonValue>;
  if (
    snapshot.schemaVersion !== 1 ||
    typeof snapshot.productTitle !== "string" ||
    typeof snapshot.layoutLabel !== "string" ||
    typeof snapshot.cabinetFinish !== "string" ||
    typeof snapshot.frontFinish !== "string" ||
    typeof snapshot.totalCents !== "number" ||
    !Number.isInteger(snapshot.totalCents) ||
    snapshot.totalCents < 0 ||
    typeof snapshot.currency !== "string"
  ) {
    return null;
  }

  return snapshot as RevisionDisplaySnapshot;
}
