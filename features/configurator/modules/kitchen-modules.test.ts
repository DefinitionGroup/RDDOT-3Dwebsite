import { describe, expect, it } from "vitest";
import {
  getContinuousManifest,
  getDefaultModuleLayout,
  getModuleManifest
} from "@/features/configurator/modules/kitchen-modules";

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
