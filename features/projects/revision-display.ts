import {
  findConfiguratorProductDefinition,
  findFinish,
  getConfiguratorQuote,
  getLocalizedLabel,
  SUPPORTED_PRODUCT_DEFINITION_VERSIONS
} from "@/features/configurator/product-definition";
import type {
  AnyConfiguratorState,
  ConfiguratorStateV2,
  LocaleCode
} from "@/features/configurator/types";
import type { JsonValue } from "@/features/projects/project-module";

export type RevisionDisplaySnapshotV1 = {
  schemaVersion: 1;
  productTitle: string;
  layoutLabel: string;
  cabinetFinish: string;
  frontFinish: string;
  totalCents: number;
  currency: string;
};

export type RevisionDisplaySnapshotV2 = {
  schemaVersion: 2;
  productTitle: string;
  layoutLabel: string;
  cabinetFinish: string;
  frontFinish: string;
  totalCents: number;
  currency: string;
};

export type RevisionDisplaySnapshot =
  | RevisionDisplaySnapshotV1
  | RevisionDisplaySnapshotV2;

export class UnsupportedProductDefinitionVersionError extends Error {}

function describeIslandSize(islandSize: ConfiguratorStateV2["islandSize"]) {
  switch (islandSize) {
    case 0:
      return "ohne Insel";
    case 2:
      return "Insel klein";
    case 4:
      return "Insel standard";
    case 5:
      return "Insel groß";
    case 6:
      return "Insel extra groß";
  }
}

export function createRevisionDisplaySnapshot(
  configuration: AnyConfiguratorState,
  productDefinitionVersion: string,
  locale: LocaleCode = "de"
): RevisionDisplaySnapshot {
  if (!SUPPORTED_PRODUCT_DEFINITION_VERSIONS.includes(productDefinitionVersion)) {
    throw new UnsupportedProductDefinitionVersionError(
      `Unsupported Product Definition version: ${productDefinitionVersion}`
    );
  }
  const productDefinition = findConfiguratorProductDefinition(
    productDefinitionVersion
  );
  if (!productDefinition) {
    throw new UnsupportedProductDefinitionVersionError(
      `Unsupported Product Definition version: ${productDefinitionVersion}`
    );
  }
  if (configuration.schemaVersion !== productDefinition.schemaVersion) {
    throw new UnsupportedProductDefinitionVersionError(
      `Configuration schema v${configuration.schemaVersion} does not match definition schema v${productDefinition.schemaVersion}`
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

  const layoutLabel =
    configuration.schemaVersion === 2
      ? `Küchenzeile, ${configuration.wallModules.length} Module · ${describeIslandSize(configuration.islandSize)}`
      : "Küchenzeile, gerade";

  return {
    schemaVersion: 2,
    productTitle: getLocalizedLabel(productDefinition.title, locale),
    layoutLabel,
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
    (snapshot.schemaVersion !== 1 && snapshot.schemaVersion !== 2) ||
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
