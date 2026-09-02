"use client";

import { ArrowLeft, ArrowRight, Check, Trash2, X } from "lucide-react";
import { Reorder } from "motion/react";
import { useState } from "react";
import {
  reconcileSlots,
  slotsMatch,
  type SlotItem
} from "@/features/configurator/ui/edit-slots";
import {
  findWallCatalogEntry,
  formatCurrency,
  getLocalizedLabel,
  RDTD_KITCHEN_PRODUCT_V2
} from "@/features/configurator/product-definition";
import type {
  ConfiguratorQuote,
  IslandSize,
  LocaleCode,
  WallModuleKey
} from "@/features/configurator/types";
import type { EditTarget } from "@/features/configurator/engine/kitchen-model";

export type EditDraft = {
  wallModules: WallModuleKey[];
  islandSize: IslandSize;
};

const MODULE_SHORT_LABEL: Record<WallModuleKey, string> = {
  big: "H",
  device: "G",
  small: "30"
};

const ISLAND_OPTIONS: Array<{ size: IslandSize; label: string }> = [
  { size: 0, label: "Ohne" },
  { size: 2, label: "Klein" },
  { size: 4, label: "Standard" },
  { size: 6, label: "Groß" }
];

function lineWidthM(modules: WallModuleKey[]) {
  return modules.reduce(
    (sum, key) => sum + findWallCatalogEntry(RDTD_KITCHEN_PRODUCT_V2, key).widthM,
    0
  );
}

function deviceCount(modules: WallModuleKey[]) {
  return modules.filter((key) => key === "device").length;
}

export function canAddModule(modules: WallModuleKey[]) {
  const smallest = Math.min(
    ...RDTD_KITCHEN_PRODUCT_V2.wallCatalog.map((entry) => entry.widthM)
  );
  return (
    lineWidthM(modules) + smallest <=
    RDTD_KITCHEN_PRODUCT_V2.wallConstraints.maxLineWidthM
  );
}


function typeSwapDisabledFor(
  modules: WallModuleKey[],
  selectedIndex: number,
  selectedKey: WallModuleKey,
  candidate: WallModuleKey
) {
  if (candidate === selectedKey) return false;
  const next = [...modules];
  next[selectedIndex] = candidate;
  if (candidate === "device" && deviceCount(next) > 2) return true;
  return lineWidthM(next) > RDTD_KITCHEN_PRODUCT_V2.wallConstraints.maxLineWidthM;
}

type SceneEditBarProps = {
  draft: EditDraft;
  locale: LocaleCode;
  onChange: (draft: EditDraft) => void;
  onCommit: () => void;
  onDiscard: () => void;
  onSelect: (target: EditTarget) => void;
  quote: ConfiguratorQuote;
  selected: EditTarget;
};

/**
 * The in-scene navigation bar becomes this editing interface for the
 * duration of an Edit Session, and reverts to camera navigation when the
 * session is applied or discarded. Slots are drag-reorderable; the scene
 * geometry recomposes from the committed draft on every drop.
 */
export function SceneEditBar({
  draft,
  locale,
  onChange,
  onCommit,
  onDiscard,
  onSelect,
  quote,
  selected
}: SceneEditBarProps) {
  const constraints = RDTD_KITCHEN_PRODUCT_V2.wallConstraints;
  const selectedIndex = typeof selected === "number" ? selected : null;
  const selectedKey = selectedIndex !== null ? draft.wallModules[selectedIndex] : null;
  const addAllowed = canAddModule(draft.wallModules);

  // Reorder needs stable identities, but the draft carries only module types
  // (with duplicates). The bar owns those identities for the lifetime of the
  // Edit Session. Mutations made here update slots and draft together; a
  // draft change from elsewhere — a ghost slot clicked in the 3D scene — is
  // reconciled during render so the strip never shows a stale line.
  const [storedSlots, setSlots] = useState<SlotItem[]>(() =>
    draft.wallModules.map((key, index) => ({ id: index, key }))
  );
  const [storedNextSlotId, setNextSlotId] = useState(draft.wallModules.length);
  let slots = storedSlots;
  let nextSlotId = storedNextSlotId;
  if (!slotsMatch(storedSlots, draft.wallModules)) {
    const reconciled = reconcileSlots(storedSlots, draft.wallModules, storedNextSlotId);
    slots = reconciled.slots;
    nextSlotId = reconciled.nextId;
    setSlots(reconciled.slots);
    setNextSlotId(reconciled.nextId);
  }

  function applySlots(nextSlots: SlotItem[], nextSelected: EditTarget) {
    setSlots(nextSlots);
    onChange({ ...draft, wallModules: nextSlots.map((slot) => slot.key) });
    onSelect(nextSelected);
  }

  function commitReorder(nextSlots: SlotItem[]) {
    const selectedId = selectedIndex !== null ? slots[selectedIndex]?.id : undefined;
    const nextSelectedIndex = nextSlots.findIndex((slot) => slot.id === selectedId);
    applySlots(nextSlots, nextSelectedIndex >= 0 ? nextSelectedIndex : null);
  }

  function addModule(end: "start" | "end") {
    if (!addAllowed) return;
    const added: SlotItem = { id: nextSlotId, key: "small" };
    setNextSlotId(nextSlotId + 1);
    if (end === "start") {
      applySlots([added, ...slots], 0);
    } else {
      applySlots([...slots, added], slots.length);
    }
  }

  function removeSelected() {
    if (selectedIndex === null) return;
    if (slots.length <= constraints.minModules) return;
    applySlots(
      slots.filter((_, index) => index !== selectedIndex),
      null
    );
  }

  function moveSelected(direction: -1 | 1) {
    if (selectedIndex === null) return;
    const target = selectedIndex + direction;
    if (target < 0 || target >= slots.length) return;
    const next = [...slots];
    [next[selectedIndex], next[target]] = [next[target], next[selectedIndex]];
    applySlots(next, target);
  }

  function swapSelectedType(key: WallModuleKey) {
    if (selectedIndex === null || selectedKey === null || key === selectedKey) return;
    if (typeSwapDisabledFor(draft.wallModules, selectedIndex, selectedKey, key)) return;
    const next = slots.map((slot, index) =>
      index === selectedIndex ? { ...slot, key } : slot
    );
    applySlots(next, selectedIndex);
  }

  return (
    <div className="border border-hairline bg-canvas">
      <div className="flex items-center gap-2 border-b border-hairline px-2 py-2">
        <button
          aria-label="Modul links hinzufügen"
          className="grid h-11 w-7 flex-none place-items-center border border-dashed border-signature/50 text-signature transition-colors hover:border-signature disabled:cursor-not-allowed disabled:border-hairline disabled:text-graphite/40"
          disabled={!addAllowed}
          onClick={() => addModule("start")}
          type="button"
        >
          +
        </button>
        <Reorder.Group
          axis="x"
          as="div"
          className="flex h-11 flex-1 items-stretch gap-1"
          onReorder={commitReorder}
          values={slots}
        >
          {slots.map((slot, index) => {
            const entry = findWallCatalogEntry(RDTD_KITCHEN_PRODUCT_V2, slot.key);
            const isActive = selectedIndex === index;
            return (
              <Reorder.Item
                as="div"
                className={`grid cursor-grab select-none place-items-center border text-body transition-colors active:cursor-grabbing ${
                  isActive
                    ? "border-signature bg-signature/10 text-ink"
                    : "border-hairline bg-canvas text-graphite hover:border-ink hover:text-ink"
                }`}
                key={slot.id}
                onClick={() => onSelect(isActive ? null : index)}
                style={{ flexGrow: entry.widthM, flexBasis: 0 }}
                value={slot}
                whileDrag={{ scale: 1.04, zIndex: 2 }}
              >
                <span
                  aria-label={`${getLocalizedLabel(entry.label, locale)}, Position ${index + 1}`}
                  role="button"
                >
                  {MODULE_SHORT_LABEL[slot.key]}
                </span>
              </Reorder.Item>
            );
          })}
        </Reorder.Group>
        <button
          aria-label="Modul rechts hinzufügen"
          className="grid h-11 w-7 flex-none place-items-center border border-dashed border-signature/50 text-signature transition-colors hover:border-signature disabled:cursor-not-allowed disabled:border-hairline disabled:text-graphite/40"
          disabled={!addAllowed}
          onClick={() => addModule("end")}
          type="button"
        >
          +
        </button>
      </div>

      {selectedKey !== null && selectedIndex !== null ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-hairline px-2 py-2">
          <div className="flex flex-1 gap-1">
            {RDTD_KITCHEN_PRODUCT_V2.wallCatalog.map((entry) => (
              <button
                aria-pressed={entry.key === selectedKey}
                className={`min-h-9 flex-1 border px-2 text-body transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${
                  entry.key === selectedKey
                    ? "border-ink text-ink"
                    : "border-hairline text-graphite hover:border-ink hover:text-ink"
                }`}
                disabled={typeSwapDisabledFor(
                  draft.wallModules,
                  selectedIndex,
                  selectedKey,
                  entry.key
                )}
                key={entry.key}
                onClick={() => swapSelectedType(entry.key)}
                type="button"
              >
                {getLocalizedLabel(entry.label, locale)}
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            <button
              aria-label="Nach links schieben"
              className="grid size-9 place-items-center border border-hairline text-graphite hover:border-ink hover:text-ink disabled:opacity-35"
              disabled={selectedIndex === 0}
              onClick={() => moveSelected(-1)}
              type="button"
            >
              <ArrowLeft size={13} strokeWidth={1.5} />
            </button>
            <button
              aria-label="Nach rechts schieben"
              className="grid size-9 place-items-center border border-hairline text-graphite hover:border-ink hover:text-ink disabled:opacity-35"
              disabled={selectedIndex === draft.wallModules.length - 1}
              onClick={() => moveSelected(1)}
              type="button"
            >
              <ArrowRight size={13} strokeWidth={1.5} />
            </button>
            <button
              aria-label="Modul entfernen"
              className="grid size-9 place-items-center border border-hairline text-graphite hover:border-signature hover:text-signature disabled:opacity-35"
              disabled={draft.wallModules.length <= constraints.minModules}
              onClick={removeSelected}
              type="button"
            >
              <Trash2 size={13} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      ) : (
        <p className="border-b border-hairline px-3 py-2 text-body text-graphite">
          Module ziehen zum Umsortieren · antippen für Typ, Position oder
          Entfernen.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3 border-b border-hairline px-2 py-2">
        <div className="flex flex-1 items-center gap-2">
          <span className="text-body text-graphite">Insel</span>
          <div className="flex flex-1 gap-1">
            {ISLAND_OPTIONS.map((option) => (
              <button
                aria-pressed={draft.islandSize === option.size}
                className={`min-h-9 flex-1 border px-2 text-body transition-colors ${
                  draft.islandSize === option.size
                    ? "border-ink text-ink"
                    : "border-hairline text-graphite hover:border-ink hover:text-ink"
                }`}
                key={option.size}
                onClick={() => {
                  onChange({ ...draft, islandSize: option.size });
                  onSelect(option.size === 0 ? null : "island");
                }}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <span className="text-lead font-semibold tabular-nums text-ink">
          {formatCurrency(quote.totalCents, locale)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 px-2 py-2">
        <button
          className="inline-flex min-h-11 items-center justify-center gap-2 border border-signature px-4 text-body text-signature transition-colors hover:bg-signature/10"
          onClick={onDiscard}
          type="button"
        >
          <X size={15} strokeWidth={1.5} />
          Verwerfen
        </button>
        <button
          className="inline-flex min-h-11 items-center justify-center gap-2 border border-signature bg-signature px-4 text-body leading-none text-paper transition-colors hover:bg-ink hover:border-ink"
          onClick={onCommit}
          type="button"
        >
          <Check size={15} strokeWidth={1.5} />
          Fertig
        </button>
      </div>
    </div>
  );
}
