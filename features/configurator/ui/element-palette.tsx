"use client";

import type { PointerEvent } from "react";
import {
  findWallCatalogEntry,
  getLocalizedLabel,
  RDTD_KITCHEN_PRODUCT_V2
} from "@/features/configurator/product-definition";
import type { LocaleCode, WallModuleKey } from "@/features/configurator/types";

export type ElementPaletteProps = {
  canAdd: (key: WallModuleKey) => boolean;
  locale: LocaleCode;
  onAdd: (key: WallModuleKey) => void;
  onDragStart: (key: WallModuleKey, event: PointerEvent<HTMLButtonElement>) => void;
};

const ELEMENT_KEYS: WallModuleKey[] = ["big", "device", "small"];

/** A tile's glyph: the module's proportions, the appliance niche as a dark inset. */
function Glyph({ moduleKey, widthM }: { moduleKey: WallModuleKey; widthM: number }) {
  const width = Math.round(widthM * 64);
  return (
    <span
      aria-hidden="true"
      className="relative block h-12 rounded-[3px] bg-porcelain"
      style={{ width }}
    >
      {moduleKey === "device" && (
        <span className="absolute left-1/2 top-[30%] h-[22%] w-[55%] -translate-x-1/2 rounded-[2px] bg-charcoal" />
      )}
      {moduleKey === "small" && (
        <span className="absolute inset-x-[15%] top-1/2 h-px bg-charcoal/40" />
      )}
    </span>
  );
}

/**
 * The elements a line can take. Drag one into the scene and it stands
 * beside the line — left or right, wherever it is let go — as a red,
 * glowing ghost until then. Tapping adds it on the right.
 */
export function ElementPalette({ canAdd, locale, onAdd, onDragStart }: ElementPaletteProps) {
  return (
    <div className="flex flex-col gap-3">
      <p className="m-0 text-caption text-graphite">
        Ein Element in die Szene ziehen — es stellt sich links oder rechts an die Zeile.
        Antippen fügt es rechts an.
      </p>
      <ul aria-label="Elemente" className="m-0 grid list-none grid-cols-3 gap-2 p-0">
        {ELEMENT_KEYS.map((key) => {
          const entry = findWallCatalogEntry(RDTD_KITCHEN_PRODUCT_V2, key);
          const label = getLocalizedLabel(entry.label, locale);
          const enabled = canAdd(key);
          return (
            <li key={key}>
              <button
                aria-label={`${label} hinzufügen`}
                className="flex w-full cursor-grab touch-none select-none flex-col items-center gap-2.5 rounded-card border border-hairline px-2 py-3 text-center transition-colors duration-state ease-signature hover:border-ink active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-35"
                disabled={!enabled}
                onClick={() => onAdd(key)}
                onPointerDown={(event) => {
                  if (event.button !== 0 || !enabled) return;
                  onDragStart(key, event);
                }}
                type="button"
              >
                <Glyph moduleKey={key} widthM={entry.widthM} />
                <span className="flex flex-col gap-0.5">
                  <span className="text-caption font-label leading-tight text-ink">{label}</span>
                  <span className="tnum text-[0.6875rem] text-graphite">
                    {Math.round(entry.widthM * 100)} cm
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
