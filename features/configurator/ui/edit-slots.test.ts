import { describe, expect, it } from "vitest";
import {
  reconcileSlots,
  slotsMatch,
  type SlotItem
} from "@/features/configurator/ui/edit-slots";

const DEFAULT: SlotItem[] = [
  { id: 0, key: "big" },
  { id: 1, key: "device" },
  { id: 2, key: "small" },
  { id: 3, key: "small" },
  { id: 4, key: "device" },
  { id: 5, key: "big" }
];

describe("Edit Session slot reconciliation", () => {
  it("returns the same array when the draft already matches", () => {
    const keys = DEFAULT.map((slot) => slot.key);
    expect(slotsMatch(DEFAULT, keys)).toBe(true);
    const result = reconcileSlots(DEFAULT, keys, 6);
    expect(result.slots).toBe(DEFAULT);
    expect(result.nextId).toBe(6);
  });

  it("keeps every identity when a module is added at the start from the scene", () => {
    const result = reconcileSlots(
      DEFAULT,
      ["small", ...DEFAULT.map((slot) => slot.key)],
      6
    );
    expect(result.slots[0]).toEqual({ id: 6, key: "small" });
    expect(result.slots.slice(1)).toEqual(DEFAULT);
    expect(result.nextId).toBe(7);
  });

  it("keeps every identity when a module is added at the end from the scene", () => {
    const result = reconcileSlots(
      DEFAULT,
      [...DEFAULT.map((slot) => slot.key), "small"],
      6
    );
    expect(result.slots.slice(0, 6)).toEqual(DEFAULT);
    expect(result.slots[6]).toEqual({ id: 6, key: "small" });
  });

  it("never hands out an identity twice", () => {
    const result = reconcileSlots(DEFAULT, ["big", "small", "small"], 6);
    const ids = result.slots.map((slot) => slot.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(result.slots.map((slot) => slot.key)).toEqual(["big", "small", "small"]);
    expect(result.nextId).toBeGreaterThanOrEqual(Math.max(...ids) + 1);
  });
});
