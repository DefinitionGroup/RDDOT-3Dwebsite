"use client";

import { ArrowLeft, ArrowRight, Check, Trash2, X } from "lucide-react";
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

type ModuleEditorProps = {
  draft: EditDraft;
  locale: LocaleCode;
  onChange: (draft: EditDraft) => void;
  onCommit: () => void;
  onDiscard: () => void;
  onSelect: (target: EditTarget) => void;
  quote: ConfiguratorQuote;
  selected: EditTarget;
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

export function ModuleEditor({
  draft,
  locale,
  onChange,
  onCommit,
  onDiscard,
  onSelect,
  quote,
  selected
}: ModuleEditorProps) {
  const constraints = RDTD_KITCHEN_PRODUCT_V2.wallConstraints;
  const selectedIndex = typeof selected === "number" ? selected : null;
  const selectedKey = selectedIndex !== null ? draft.wallModules[selectedIndex] : null;
  const addAllowed = canAddModule(draft.wallModules);

  function updateModules(next: WallModuleKey[], nextSelected: EditTarget) {
    onChange({ ...draft, wallModules: next });
    onSelect(nextSelected);
  }

  function addModule(end: "start" | "end") {
    if (!addAllowed) return;
    const next = [...draft.wallModules];
    if (end === "start") {
      next.unshift("small");
      updateModules(next, 0);
    } else {
      next.push("small");
      updateModules(next, next.length - 1);
    }
  }

  function removeSelected() {
    if (selectedIndex === null) return;
    if (draft.wallModules.length <= constraints.minModules) return;
    const next = draft.wallModules.filter((_, index) => index !== selectedIndex);
    updateModules(next, null);
  }

  function moveSelected(direction: -1 | 1) {
    if (selectedIndex === null) return;
    const target = selectedIndex + direction;
    if (target < 0 || target >= draft.wallModules.length) return;
    const next = [...draft.wallModules];
    [next[selectedIndex], next[target]] = [next[target], next[selectedIndex]];
    updateModules(next, target);
  }

  function swapSelectedType(key: WallModuleKey) {
    if (selectedIndex === null || key === selectedKey) return;
    const entry = findWallCatalogEntry(RDTD_KITCHEN_PRODUCT_V2, key);
    const next = [...draft.wallModules];
    next[selectedIndex] = key;
    if (
      entry.maxCount !== undefined &&
      deviceCount(next) > entry.maxCount &&
      key === "device"
    ) {
      return;
    }
    if (lineWidthM(next) > constraints.maxLineWidthM) {
      return;
    }
    updateModules(next, selectedIndex);
  }

  function typeSwapDisabled(key: WallModuleKey) {
    if (selectedIndex === null || selectedKey === null) return true;
    if (key === selectedKey) return false;
    const next = [...draft.wallModules];
    next[selectedIndex] = key;
    if (key === "device" && deviceCount(next) > 2) return true;
    return lineWidthM(next) > constraints.maxLineWidthM;
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-body uppercase tracking-[0.22em] text-graphite">
          Wandzeile
        </p>
        <div className="mt-3 flex items-stretch gap-1">
          <button
            aria-label="Modul links hinzufügen"
            className="grid w-7 flex-none place-items-center border border-dashed border-signature/50 text-signature transition-colors hover:border-signature disabled:cursor-not-allowed disabled:border-hairline disabled:text-graphite/40"
            disabled={!addAllowed}
            onClick={() => addModule("start")}
            type="button"
          >
            +
          </button>
          <div className="flex min-h-14 flex-1 items-stretch gap-1">
            {draft.wallModules.map((key, index) => {
              const entry = findWallCatalogEntry(RDTD_KITCHEN_PRODUCT_V2, key);
              const isActive = selectedIndex === index;
              return (
                <button
                  aria-label={`${getLocalizedLabel(entry.label, locale)}, Position ${index + 1}`}
                  aria-pressed={isActive}
                  className={`grid place-items-center border text-body transition-colors ${
                    isActive
                      ? "border-signature bg-signature/10 text-ink"
                      : "border-hairline text-graphite hover:border-ink hover:text-ink"
                  }`}
                  key={`${key}-${index}`}
                  onClick={() => onSelect(isActive ? null : index)}
                  style={{ flexGrow: entry.widthM, flexBasis: 0 }}
                  type="button"
                >
                  {MODULE_SHORT_LABEL[key]}
                </button>
              );
            })}
          </div>
          <button
            aria-label="Modul rechts hinzufügen"
            className="grid w-7 flex-none place-items-center border border-dashed border-signature/50 text-signature transition-colors hover:border-signature disabled:cursor-not-allowed disabled:border-hairline disabled:text-graphite/40"
            disabled={!addAllowed}
            onClick={() => addModule("end")}
            type="button"
          >
            +
          </button>
        </div>
        <p className="mt-2 text-body text-graphite">
          {lineWidthM(draft.wallModules).toLocaleString("de-DE", {
            maximumFractionDigits: 2
          })}{" "}
          m von {constraints.maxLineWidthM.toLocaleString("de-DE")} m ·{" "}
          {draft.wallModules.length} Module
        </p>
      </div>

      {selectedKey !== null && selectedIndex !== null && (
        <div className="space-y-3 border border-hairline p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-body text-ink">
              {getLocalizedLabel(
                findWallCatalogEntry(RDTD_KITCHEN_PRODUCT_V2, selectedKey).label,
                locale
              )}
              <span className="ml-2 text-graphite">
                Position {selectedIndex + 1}
              </span>
            </p>
            <div className="flex gap-1">
              <button
                aria-label="Nach links schieben"
                className="grid size-8 place-items-center border border-hairline text-graphite hover:border-ink hover:text-ink disabled:opacity-35"
                disabled={selectedIndex === 0}
                onClick={() => moveSelected(-1)}
                type="button"
              >
                <ArrowLeft size={13} strokeWidth={1.5} />
              </button>
              <button
                aria-label="Nach rechts schieben"
                className="grid size-8 place-items-center border border-hairline text-graphite hover:border-ink hover:text-ink disabled:opacity-35"
                disabled={selectedIndex === draft.wallModules.length - 1}
                onClick={() => moveSelected(1)}
                type="button"
              >
                <ArrowRight size={13} strokeWidth={1.5} />
              </button>
              <button
                aria-label="Modul entfernen"
                className="grid size-8 place-items-center border border-hairline text-graphite hover:border-signature hover:text-signature disabled:opacity-35"
                disabled={draft.wallModules.length <= constraints.minModules}
                onClick={removeSelected}
                type="button"
              >
                <Trash2 size={13} strokeWidth={1.5} />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-1">
            {RDTD_KITCHEN_PRODUCT_V2.wallCatalog.map((entry) => (
              <button
                aria-pressed={entry.key === selectedKey}
                className={`min-h-9 border px-2 text-body transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${
                  entry.key === selectedKey
                    ? "border-ink text-ink"
                    : "border-hairline text-graphite hover:border-ink hover:text-ink"
                }`}
                disabled={typeSwapDisabled(entry.key)}
                key={entry.key}
                onClick={() => swapSelectedType(entry.key)}
                type="button"
              >
                {getLocalizedLabel(entry.label, locale)}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="text-body uppercase tracking-[0.22em] text-graphite">Insel</p>
        <div
          className={`mt-3 grid grid-cols-4 gap-1 ${
            selected === "island" ? "outline outline-1 outline-signature/60" : ""
          }`}
        >
          {ISLAND_OPTIONS.map((option) => (
            <button
              aria-pressed={draft.islandSize === option.size}
              className={`min-h-9 border px-2 text-body transition-colors ${
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

      <div className="space-y-3 border-t border-hairline pt-4">
        <div className="flex items-baseline justify-between gap-4">
          <p className="text-body text-graphite">Richtpreis</p>
          <p className="text-lead tabular-nums text-ink">
            {formatCurrency(quote.totalCents, locale)}
          </p>
        </div>
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <button
            className="inline-flex min-h-11 items-center justify-center gap-2.5 border border-ink bg-ink px-5 text-body leading-none text-paper transition-colors hover:bg-transparent hover:text-ink"
            onClick={onCommit}
            type="button"
          >
            <Check size={15} strokeWidth={1.5} />
            Übernehmen
          </button>
          <button
            className="inline-flex min-h-11 items-center justify-center gap-2 border border-hairline px-4 text-body text-graphite transition-colors hover:border-ink hover:text-ink"
            onClick={onDiscard}
            type="button"
          >
            <X size={15} strokeWidth={1.5} />
            Verwerfen
          </button>
        </div>
        <p className="text-body text-graphite">
          Klicken Sie ein Modul in der Szene oder in der Zeile, um Typ, Position
          oder Entfernen zu wählen.
        </p>
      </div>
    </div>
  );
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
 * session is applied or discarded.
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

  function updateModules(next: WallModuleKey[], nextSelected: EditTarget) {
    onChange({ ...draft, wallModules: next });
    onSelect(nextSelected);
  }

  function addModule(end: "start" | "end") {
    if (!addAllowed) return;
    const next = [...draft.wallModules];
    if (end === "start") {
      next.unshift("small");
      updateModules(next, 0);
    } else {
      next.push("small");
      updateModules(next, next.length - 1);
    }
  }

  function removeSelected() {
    if (selectedIndex === null) return;
    if (draft.wallModules.length <= constraints.minModules) return;
    updateModules(
      draft.wallModules.filter((_, index) => index !== selectedIndex),
      null
    );
  }

  function moveSelected(direction: -1 | 1) {
    if (selectedIndex === null) return;
    const target = selectedIndex + direction;
    if (target < 0 || target >= draft.wallModules.length) return;
    const next = [...draft.wallModules];
    [next[selectedIndex], next[target]] = [next[target], next[selectedIndex]];
    updateModules(next, target);
  }

  function swapSelectedType(key: WallModuleKey) {
    if (selectedIndex === null || selectedKey === null || key === selectedKey) return;
    if (typeSwapDisabledFor(draft.wallModules, selectedIndex, selectedKey, key)) return;
    const next = [...draft.wallModules];
    next[selectedIndex] = key;
    updateModules(next, selectedIndex);
  }

  return (
    <div className="border border-hairline bg-canvas">
      <div className="flex items-center gap-2 border-b border-hairline px-2 py-2">
        <button
          aria-label="Modul links hinzufügen"
          className="grid h-10 w-7 flex-none place-items-center border border-dashed border-signature/50 text-signature transition-colors hover:border-signature disabled:cursor-not-allowed disabled:border-hairline disabled:text-graphite/40"
          disabled={!addAllowed}
          onClick={() => addModule("start")}
          type="button"
        >
          +
        </button>
        <div className="flex h-10 flex-1 items-stretch gap-1">
          {draft.wallModules.map((key, index) => {
            const entry = findWallCatalogEntry(RDTD_KITCHEN_PRODUCT_V2, key);
            const isActive = selectedIndex === index;
            return (
              <button
                aria-label={`${getLocalizedLabel(entry.label, locale)}, Position ${index + 1}`}
                aria-pressed={isActive}
                className={`grid place-items-center border text-body transition-colors ${
                  isActive
                    ? "border-signature bg-signature/10 text-ink"
                    : "border-hairline text-graphite hover:border-ink hover:text-ink"
                }`}
                key={`${key}-${index}`}
                onClick={() => onSelect(isActive ? null : index)}
                style={{ flexGrow: entry.widthM, flexBasis: 0 }}
                type="button"
              >
                {MODULE_SHORT_LABEL[key]}
              </button>
            );
          })}
        </div>
        <button
          aria-label="Modul rechts hinzufügen"
          className="grid h-10 w-7 flex-none place-items-center border border-dashed border-signature/50 text-signature transition-colors hover:border-signature disabled:cursor-not-allowed disabled:border-hairline disabled:text-graphite/40"
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
          Modul in der Szene oder in der Zeile wählen, um Typ, Position oder
          Entfernen zu ändern.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2 px-2 py-2">
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
        <span className="tabular-nums text-body text-ink">
          {formatCurrency(quote.totalCents, locale)}
        </span>
        <div className="flex gap-1">
          <button
            className="inline-flex min-h-9 items-center justify-center gap-2 border border-hairline px-3 text-body text-graphite transition-colors hover:border-ink hover:text-ink"
            onClick={onDiscard}
            type="button"
          >
            <X size={14} strokeWidth={1.5} />
            Verwerfen
          </button>
          <button
            className="inline-flex min-h-9 items-center justify-center gap-2 border border-ink bg-ink px-3 text-body leading-none text-paper transition-colors hover:bg-transparent hover:text-ink"
            onClick={onCommit}
            type="button"
          >
            <Check size={14} strokeWidth={1.5} />
            Fertig
          </button>
        </div>
      </div>
    </div>
  );
}
