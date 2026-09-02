import type { WallModuleKey } from "@/features/configurator/types";

/**
 * A drag-reorderable slot in the Edit Session bar. The draft carries only
 * module types, which repeat, so the bar assigns each slot an identity that
 * survives reordering.
 */
export type SlotItem = { id: number; key: WallModuleKey };

export function slotsMatch(slots: SlotItem[], keys: readonly WallModuleKey[]) {
  return (
    slots.length === keys.length &&
    slots.every((slot, index) => slot.key === keys[index])
  );
}

/**
 * Brings the slot list in line with a draft that changed outside the bar —
 * a module added through a ghost slot in the 3D scene, for instance. Existing
 * identities are kept wherever the sequence still lines up, so a drag in
 * progress or a selection keeps pointing at the same slot; anything that no
 * longer lines up gets a fresh identity.
 */
export function reconcileSlots(
  slots: SlotItem[],
  keys: readonly WallModuleKey[],
  nextId: number
): { slots: SlotItem[]; nextId: number } {
  if (slotsMatch(slots, keys)) return { slots, nextId };

  const result: SlotItem[] = [];
  let cursor = 0;
  let id = nextId;
  for (const key of keys) {
    const candidate = slots[cursor];
    if (candidate && candidate.key === key) {
      result.push(candidate);
      cursor += 1;
    } else {
      result.push({ id, key });
      id += 1;
    }
  }
  return { slots: result, nextId: id };
}
