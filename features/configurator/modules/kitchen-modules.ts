import { KITCHEN_ASSET_MANIFEST } from "@/features/configurator/modules/asset-manifest";
import {
  getIslandBackComposition,
  getIslandBackStretchM
} from "@/features/configurator/product-definition";
import type { ConfiguratorState, WallModuleKey } from "@/features/configurator/types";

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
  /** X scale from the prefab's left edge; only the large island's back row carries one. */
  scaleX?: number;
};

// Placements come from the validated Asset Manifest (ADR 0009), never from
// the segmentation pipeline's intermediate output directly.
const MODULE_ENTRIES: ModuleManifestEntry[] = KITCHEN_ASSET_MANIFEST.modules;
const CONTINUOUS_ENTRIES: ContinuousManifestEntry[] = KITCHEN_ASSET_MANIFEST.continuous;

export function getModuleManifest() {
  return MODULE_ENTRIES;
}

export function getContinuousManifest() {
  return CONTINUOUS_ENTRIES;
}

/**
 * The as-authored layout: every segmented module at its original position.
 */
export function getDefaultModuleLayout(): ModulePlacement[] {
  return MODULE_ENTRIES.map((entry) => ({
    key: entry.key,
    prefab: entry.prefab,
    x: entry.xMin
  }));
}

const entriesByKey = new Map(MODULE_ENTRIES.map((entry) => [entry.key, entry]));
const continuousByKey = new Map(CONTINUOUS_ENTRIES.map((entry) => [entry.key, entry]));

function moduleEntry(key: string): ModuleManifestEntry {
  const entry = entriesByKey.get(key);
  if (!entry) {
    throw new Error(`Module manifest entry missing: ${key}`);
  }
  return entry;
}

function continuousEntry(key: string): ContinuousManifestEntry {
  const entry = continuousByKey.get(key);
  if (!entry) {
    throw new Error(`Continuous manifest entry missing: ${key}`);
  }
  return entry;
}

/** Wall line and island stay centered on their as-authored midpoints. */
const WALL_CENTER_X = (() => {
  const wall = MODULE_ENTRIES.filter((entry) => entry.type.startsWith("wall-"));
  const min = Math.min(...wall.map((entry) => entry.xMin));
  const max = Math.max(...wall.map((entry) => entry.xMin + entry.width));
  return (min + max) / 2;
})();

const ISLAND_CENTER_X = (() => {
  const left = continuousEntry("island-countertop");
  return left.xMin + left.width / 2;
})();

/**
 * Prefab variant cycling per wall module type. Variants rotate by per-type
 * occurrence so the default sequence reproduces the as-authored assignment;
 * a trailing big cabinet takes the right end-cap variant.
 */
function assignWallPrefabs(keys: WallModuleKey[]): string[] {
  const occurrence = new Map<WallModuleKey, number>();
  const smalls = ["wall-small-1", "wall-small-2", "wall-small-3", "wall-small-4"];
  return keys.map((key, index) => {
    const seen = occurrence.get(key) ?? 0;
    occurrence.set(key, seen + 1);
    if (key === "big") {
      return index === keys.length - 1 ? "wall-big-R" : "wall-big-L";
    }
    if (key === "device") {
      return seen % 2 === 0 ? "wall-device-A" : "wall-device-B";
    }
    return smalls[seen % smalls.length];
  });
}

export type ContinuousPlacement = {
  key: string;
  prefab: string;
  /** Left edge of the stretched instance. */
  x: number;
  /** X scale relative to the as-authored width. */
  scaleX: number;
  /** As-authored left edge; instances position at x - scaleX * sourceXMin. */
  sourceXMin: number;
};

export type GeneratedBoxSpec = {
  key: string;
  role: "countertop" | "cabinet" | "plinth";
  /** Axis-aligned world-space box [min, max] per axis. */
  min: [number, number, number];
  max: [number, number, number];
};

export type KitchenLayout = {
  modules: ModulePlacement[];
  continuous: ContinuousPlacement[];
  generated: GeneratedBoxSpec[];
  wallWidth: number;
  islandWidth: number;
};

const ISLAND_FRONT_PREFABS = [
  "island-front-1",
  "island-front-2",
  "island-front-3",
  "island-front-4"
];

const DEFAULT_WALL_WIDTH = (() => {
  const defaults: WallModuleKey[] = [
    "big",
    "device",
    "small",
    "small",
    "small",
    "small",
    "device",
    "big"
  ];
  return assignWallPrefabs(defaults).reduce(
    (sum, prefab) => sum + moduleEntry(prefab).width,
    0
  );
})();

/**
 * Computes every prefab placement for a configuration. The default state
 * reproduces the as-authored layout exactly; other layouts re-abut module
 * prefabs around the same centerlines and stretch or regenerate the
 * continuous elements (back panels, plinths, worktop).
 */
export function computeKitchenLayout(state: ConfiguratorState): KitchenLayout {
  const modules: ModulePlacement[] = [];
  const continuous: ContinuousPlacement[] = [];
  const generated: GeneratedBoxSpec[] = [];

  // ---- wall line ----
  const wallPrefabs = assignWallPrefabs(state.wallModules);
  const wallWidth = wallPrefabs.reduce(
    (sum, prefab) => sum + moduleEntry(prefab).width,
    0
  );
  let cursor = WALL_CENTER_X - wallWidth / 2;
  wallPrefabs.forEach((prefab, index) => {
    modules.push({ key: `${prefab}#${index}`, prefab: `module__${prefab}`, x: cursor });
    cursor += moduleEntry(prefab).width;
  });

  // Wall continuous elements stretch with the line, scaled about the wall
  // center so the default layout reproduces the as-authored positions and
  // their slight overhangs stay proportional.
  const wallRatio = wallWidth / DEFAULT_WALL_WIDTH;
  for (const key of ["wall-backwall", "wall-backpanel", "wall-plinth-strip"]) {
    const entry = continuousEntry(key);
    continuous.push({
      key,
      prefab: entry.prefab,
      x: WALL_CENTER_X + (entry.xMin - WALL_CENTER_X) * wallRatio,
      scaleX: wallRatio,
      sourceXMin: entry.xMin
    });
  }

  // ---- island ----
  let islandWidth = 0;
  if (state.islandSize > 0) {
    const frontPrefabs = Array.from({ length: state.islandSize }, (_, index) => {
      if (index === state.islandSize - 1) return "island-front-4";
      return ISLAND_FRONT_PREFABS[index % 3];
    });
    const backUnits = getIslandBackComposition(state.islandSize);
    let ninety = 0;
    let sixty = 0;
    const backPrefabs = backUnits.map((unit, index) => {
      if (unit === "90") {
        ninety += 1;
        return index === backUnits.length - 1 || ninety % 2 === 0
          ? "island-back-90-R"
          : "island-back-90-L";
      }
      sixty += 1;
      return sixty % 2 === 1 ? "island-back-60-1" : "island-back-60-2";
    });

    const frontWidth = frontPrefabs.reduce(
      (sum, prefab) => sum + moduleEntry(prefab).width,
      0
    );
    const endWidth = moduleEntry("island-end-L").width;
    islandWidth = frontWidth + 2 * endWidth;

    const islandLeft = ISLAND_CENTER_X - islandWidth / 2;
    modules.push({
      key: "island-end-L",
      prefab: "module__island-end-L",
      x: islandLeft
    });
    modules.push({
      key: "island-end-R",
      prefab: "module__island-end-R",
      x: islandLeft + endWidth + frontWidth
    });

    let frontCursor = islandLeft + endWidth;
    frontPrefabs.forEach((prefab, index) => {
      modules.push({
        key: `${prefab}#${index}`,
        prefab: `module__${prefab}`,
        x: frontCursor
      });
      frontCursor += moduleEntry(prefab).width;
    });

    // The large island's back row is nominally short of its five fronts;
    // its units stretch evenly so the row closes on the right end panel.
    // Sizes that tile cleanly keep their as-authored widths untouched.
    const backManifestWidth = backPrefabs.reduce(
      (sum, prefab) => sum + moduleEntry(prefab).width,
      0
    );
    const backScale =
      getIslandBackStretchM(state.islandSize) > 0 ? frontWidth / backManifestWidth : 1;
    let backCursor = islandLeft + endWidth;
    backPrefabs.forEach((prefab, index) => {
      modules.push({
        key: `${prefab}#${index}`,
        prefab: `module__${prefab}`,
        x: backCursor,
        ...(backScale !== 1 ? { scaleX: backScale } : {})
      });
      backCursor += moduleEntry(prefab).width * backScale;
    });

    // Island continuous elements. The as-authored worktop carries sink
    // cutouts that only fit the default size; other sizes get a plain
    // generated worktop with the same cross-section.
    const counter = continuousEntry("island-countertop");
    const midpanel = continuousEntry("island-midpanel");
    const backPlinth = continuousEntry("island-back-plinth");

    if (state.islandSize === 4) {
      for (const entry of [counter, midpanel, backPlinth]) {
        continuous.push({
          key: entry.key,
          prefab: entry.prefab,
          x: entry.xMin,
          scaleX: 1,
          sourceXMin: entry.xMin
        });
      }
    } else {
      generated.push({
        key: "island-countertop",
        role: "countertop",
        min: [islandLeft, 0.94, -3.302],
        max: [islandLeft + islandWidth, 0.968, -2.284]
      });
      const innerLeft = islandLeft + endWidth;
      const innerRight = islandLeft + islandWidth - endWidth;
      const midScale = (innerRight - innerLeft) / midpanel.width;
      continuous.push({
        key: midpanel.key,
        prefab: midpanel.prefab,
        x: innerLeft,
        scaleX: midScale,
        sourceXMin: midpanel.xMin
      });
      const plinthInset = 0.11;
      continuous.push({
        key: backPlinth.key,
        prefab: backPlinth.prefab,
        x: innerLeft + plinthInset,
        scaleX: (innerRight - innerLeft - 2 * plinthInset) / backPlinth.width,
        sourceXMin: backPlinth.xMin
      });
    }
  }

  return { modules, continuous, generated, wallWidth, islandWidth };
}
