import manifest from "@/features/configurator/modules/kitchen-line-manifest.json";

export type ModuleType =
  | "island-back-60"
  | "island-back-90"
  | "island-end"
  | "island-front"
  | "wall-big"
  | "wall-device"
  | "wall-small";

export type ModuleManifestEntry = {
  key: string;
  type: ModuleType;
  prefab: string;
  /** World X of the module's left edge in the source model, meters. */
  xMin: number;
  width: number;
  meshCount: number;
};

export type ContinuousManifestEntry = {
  key: string;
  prefab: string;
  xMin: number;
  width: number;
};

export type ModulePlacement = {
  key: string;
  prefab: string;
  x: number;
};

const MODULE_ENTRIES = manifest.modules as ModuleManifestEntry[];
const CONTINUOUS_ENTRIES = manifest.continuous as ContinuousManifestEntry[];

export function getModuleManifest() {
  return MODULE_ENTRIES;
}

export function getContinuousManifest() {
  return CONTINUOUS_ENTRIES;
}

/**
 * The as-authored layout: every segmented module at its original position.
 * Slice S2 replaces this with a layout derived from ConfiguratorState.
 */
export function getDefaultModuleLayout(): ModulePlacement[] {
  return MODULE_ENTRIES.map((entry) => ({
    key: entry.key,
    prefab: entry.prefab,
    x: entry.xMin
  }));
}
