import { describe, expect, it } from "vitest";
import {
  computeKitchenLayout,
  getContinuousManifest,
  getDefaultModuleLayout,
  getModuleManifest
} from "@/features/configurator/modules/kitchen-modules";
import { DEFAULT_CONFIGURATOR_STATE } from "@/features/configurator/product-definition";

describe("kitchen module manifest", () => {
  it("contains the segmented default kitchen: 8 wall modules, island rows, ends", () => {
    const modules = getModuleManifest();
    const byType = new Map<string, number>();
    for (const entry of modules) {
      byType.set(entry.type, (byType.get(entry.type) ?? 0) + 1);
    }

    expect(byType.get("wall-big")).toBe(2);
    expect(byType.get("wall-device")).toBe(2);
    expect(byType.get("wall-small")).toBe(4);
    expect(byType.get("island-front")).toBe(4);
    expect(byType.get("island-back-90")).toBe(2);
    expect(byType.get("island-back-60")).toBe(2);
    expect(byType.get("island-end")).toBe(2);
    expect(modules).toHaveLength(18);
  });

  it("has unique keys and well-formed prefab references", () => {
    const modules = getModuleManifest();
    const keys = new Set(modules.map((entry) => entry.key));

    expect(keys.size).toBe(modules.length);
    for (const entry of modules) {
      expect(entry.prefab).toBe(`module__${entry.key}`);
      expect(entry.width).toBeGreaterThan(0);
      expect(entry.meshCount).toBeGreaterThan(0);
    }
    for (const entry of getContinuousManifest()) {
      expect(entry.prefab).toBe(`continuous__${entry.key}`);
    }
  });

  it("keeps the wall line contiguous within panel tolerance", () => {
    const wall = getModuleManifest()
      .filter((entry) => entry.type.startsWith("wall-"))
      .sort((a, b) => a.xMin - b.xMin);

    for (let index = 1; index < wall.length; index += 1) {
      const gap = wall[index].xMin - (wall[index - 1].xMin + wall[index - 1].width);
      expect(Math.abs(gap)).toBeLessThan(0.03);
    }
  });

  it("reproduces the as-authored placements for the default configuration", () => {
    const layout = computeKitchenLayout(DEFAULT_CONFIGURATOR_STATE);
    const manifest = getModuleManifest();

    for (const entry of manifest) {
      const placed = layout.modules.find(
        (candidate) => candidate.prefab === entry.prefab
      );
      expect(placed, entry.key).toBeDefined();
      expect(Math.abs((placed?.x ?? 0) - entry.xMin), entry.key).toBeLessThan(0.002);
    }
    for (const entry of getContinuousManifest()) {
      const placed = layout.continuous.find(
        (candidate) => candidate.key === entry.key
      );
      expect(placed, entry.key).toBeDefined();
      expect(placed?.scaleX).toBeCloseTo(1, 6);
      expect(Math.abs((placed?.x ?? 0) - entry.xMin), entry.key).toBeLessThan(0.002);
    }
    expect(layout.generated).toHaveLength(0);
  });

  it("keeps arbitrary layouts contiguous and centered", () => {
    const layout = computeKitchenLayout({
      ...DEFAULT_CONFIGURATOR_STATE,
      wallModules: ["big", "small", "device", "big"],
      islandSize: 2
    });

    const wall = layout.modules
      .filter((placement) => placement.prefab.includes("wall-"))
      .sort((a, b) => a.x - b.x);
    const manifest = getModuleManifest();
    const widthOf = (prefab: string) =>
      manifest.find((entry) => entry.prefab === prefab)?.width ?? NaN;

    for (let index = 1; index < wall.length; index += 1) {
      const expected = wall[index - 1].x + widthOf(wall[index - 1].prefab);
      expect(Math.abs(wall[index].x - expected)).toBeLessThan(1e-9);
    }

    const wallCenter =
      (wall[0].x + wall[wall.length - 1].x + widthOf(wall[wall.length - 1].prefab)) / 2;
    expect(wallCenter).toBeCloseTo(3.958, 2);

    // A non-default island replaces the cutout worktop with a generated one.
    expect(layout.generated.some((box) => box.key === "island-countertop")).toBe(true);
    expect(layout.islandWidth).toBeCloseTo(2 * 0.75 + 2 * 0.019, 1);
  });

  it("stretches the large island's back row across its five front units", () => {
    const layout = computeKitchenLayout({ ...DEFAULT_CONFIGURATOR_STATE, islandSize: 5 });
    const manifest = getModuleManifest();
    const widthOf = (prefab: string) =>
      manifest.find((entry) => entry.prefab === prefab)?.width ?? NaN;
    const fronts = layout.modules.filter((placement) => placement.prefab.includes("island-front"));
    const backs = layout.modules.filter((placement) => placement.prefab.includes("island-back"));
    expect(fronts).toHaveLength(5);
    expect(backs).toHaveLength(5);

    const frontWidth = fronts.reduce((sum, placement) => sum + widthOf(placement.prefab), 0);
    const backWidth = backs.reduce(
      (sum, placement) => sum + widthOf(placement.prefab) * (placement.scaleX ?? 1),
      0
    );
    expect(backWidth).toBeCloseTo(frontWidth, 6);
    expect(backs.every((placement) => (placement.scaleX ?? 1) > 1 && (placement.scaleX ?? 1) < 1.1)).toBe(true);

    // The right end panel moves out with the fronts and the worktop follows.
    const endL = layout.modules.find((placement) => placement.key === "island-end-L");
    const endR = layout.modules.find((placement) => placement.key === "island-end-R");
    expect((endR?.x ?? 0) - (endL?.x ?? 0)).toBeCloseTo(frontWidth + 0.019, 6);
    const worktop = layout.generated.find((box) => box.key === "island-countertop");
    expect(worktop).toBeDefined();
    expect((worktop?.max[0] ?? 0) - (worktop?.min[0] ?? 0)).toBeCloseTo(layout.islandWidth, 6);

    // The standard island keeps its as-authored back row untouched.
    const standard = computeKitchenLayout(DEFAULT_CONFIGURATOR_STATE);
    expect(standard.modules.every((placement) => placement.scaleX === undefined)).toBe(true);
  });

  it("places no island prefabs when the island is removed", () => {
    const layout = computeKitchenLayout({
      ...DEFAULT_CONFIGURATOR_STATE,
      islandSize: 0
    });

    expect(
      layout.modules.some((placement) => placement.prefab.includes("island"))
    ).toBe(false);
    expect(
      layout.continuous.some((placement) => placement.key.startsWith("island"))
    ).toBe(false);
    expect(layout.generated).toHaveLength(0);
    expect(layout.islandWidth).toBe(0);
  });

  it("places every module exactly once in the default layout", () => {
    const layout = getDefaultModuleLayout();
    const modules = getModuleManifest();

    expect(layout.map((placement) => placement.key).sort()).toEqual(
      modules.map((entry) => entry.key).sort()
    );
    for (const placement of layout) {
      const entry = modules.find((candidate) => candidate.key === placement.key);
      expect(placement.x).toBe(entry?.xMin);
    }
  });
});
