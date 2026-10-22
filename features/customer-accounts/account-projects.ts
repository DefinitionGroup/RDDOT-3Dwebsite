import {
  findConfiguratorProductDefinition,
  findFinish,
  getLocalizedLabel
} from "@/features/configurator/product-definition";
import type { LocaleCode } from "@/features/configurator/types";
import type { ProjectLifecycle } from "@/features/projects/project-lifecycle";
import type { ProjectSummary } from "@/features/projects/project-module";
import { createRevisionDisplaySnapshot } from "@/features/projects/revision-display";
import { INTL_LOCALE } from "@/lib/i18n";

type CardFinish = { label: string; hex: string; textureUrl: string | null };

/** A Project as its card in the account shows it; plain data, safe to hand to the browser. */
export type AccountProject = {
  id: string;
  name: string;
  lifecycle: ProjectLifecycle;
  updatedAt: string;
  /** In Trash: the last day it can be restored (ISO). */
  deletionDueAt: string | null;
  /** Null when the Project's product version can no longer be read: the card shows only its name. */
  summary: {
    layout: string;
    cabinet: CardFinish;
    front: CardFinish;
    price: string;
  } | null;
};

export function describeAccountProject(project: ProjectSummary, locale: LocaleCode): AccountProject {
  const base = {
    id: project.id,
    name: project.name,
    lifecycle: project.lifecycle,
    updatedAt: project.updatedAt.toISOString(),
    deletionDueAt: project.deletionDueAt?.toISOString() ?? null
  };
  const { configuration, productDefinitionVersion } = project.workingConfiguration;
  const definition = findConfiguratorProductDefinition(productDefinitionVersion);
  if (!definition) return { ...base, summary: null };

  try {
    const snapshot = createRevisionDisplaySnapshot(configuration, productDefinitionVersion, locale);
    const finish = (option: ReturnType<typeof findFinish>): CardFinish => ({
      label: getLocalizedLabel(option.label, locale),
      hex: option.hex,
      textureUrl: option.textureUrl ?? null
    });
    return {
      ...base,
      summary: {
        layout: snapshot.layoutLabel,
        cabinet: finish(findFinish(definition.cabinetColors, configuration.cabinetColorKey)),
        front: finish(findFinish(definition.frontColors, configuration.frontColorKey)),
        price: new Intl.NumberFormat(INTL_LOCALE[locale], {
          currency: snapshot.currency,
          maximumFractionDigits: 0,
          style: "currency"
        }).format(snapshot.totalCents / 100)
      }
    };
  } catch {
    return { ...base, summary: null };
  }
}
