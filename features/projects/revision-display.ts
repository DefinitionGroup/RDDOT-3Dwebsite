import {
  findConfiguratorProductDefinition,
  findFinish,
  getConfiguratorQuote,
  getLocalizedLabel,
  SUPPORTED_PRODUCT_DEFINITION_VERSIONS
} from "@/features/configurator/product-definition";
import type {
  AnyConfiguratorState,
  LocaleCode
} from "@/features/configurator/types";
import type { JsonValue } from "@/features/projects/project-module";
import { getMessages } from "@/lib/messages";

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

  const words = getMessages(locale).snapshot;
  const layoutLabel =
    configuration.schemaVersion === 2
      ? words.layout(configuration.wallModules.length, words.islands[configuration.islandSize])
      : words.straightLine;

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

/**
 * A stored snapshot keeps its labels in the language it was written in —
 * German so far, as revisions are checkpointed on the server. A label that
 * names the product or a finish of a supported Product Definition is shown in
 * the reader's language; anything else is shown as stored.
 */
export function localizeSnapshotLabel(label: string, locale: LocaleCode) {
  for (const version of SUPPORTED_PRODUCT_DEFINITION_VERSIONS) {
    const definition = findConfiguratorProductDefinition(version);
    if (!definition) continue;
    const labels = [
      definition.title,
      ...definition.cabinetColors.map((option) => option.label),
      ...definition.frontColors.map((option) => option.label)
    ];
    const match = labels.find((candidate) => Object.values(candidate).includes(label));
    if (match) return getLocalizedLabel(match, locale);
  }
  return label;
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
