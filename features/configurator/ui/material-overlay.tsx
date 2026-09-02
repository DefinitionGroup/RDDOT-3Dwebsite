"use client";

import { Overlay } from "@/components/design-system/overlay";
import { Label } from "@/components/design-system/label";
import { Pill } from "@/components/design-system/pill";
import { getLocalizedLabel } from "@/features/configurator/product-definition";
import type { FinishOption, LocaleCode } from "@/features/configurator/types";

export const FINISH_MATERIAL_LABEL: Record<FinishOption["material"], string> = {
  matte: "matt",
  satin: "seidenmatt",
  structured: "strukturiert"
};

export function finishSurfaceStyle(finish: FinishOption) {
  return finish.textureUrl
    ? { backgroundColor: finish.hex, backgroundImage: `url(${finish.textureUrl})` }
    : { backgroundColor: finish.hex };
}

type MaterialOverlayProps = {
  cabinetColor: FinishOption;
  cabinetOptions: FinishOption[];
  changed: boolean;
  frontColor: FinishOption;
  frontOptions: FinishOption[];
  locale: LocaleCode;
  onApply: () => void;
  onCancel: () => void;
  onSelectCabinet: (key: string) => void;
  onSelectFront: (key: string) => void;
  open: boolean;
  priceText: string;
};

/**
 * The front material at full size over the dimmed scene. Choices apply to
 * the scene as they are made; cancelling restores what was there before.
 */
export function MaterialOverlay({
  cabinetColor,
  cabinetOptions,
  changed,
  frontColor,
  frontOptions,
  locale,
  onApply,
  onCancel,
  onSelectCabinet,
  onSelectFront,
  open,
  priceText
}: MaterialOverlayProps) {
  return (
    <Overlay
      footer={
        <>
          <p className="tnum m-0 text-caption text-graphite">
            {changed ? "Richtpreis" : "Richtpreis unverändert"} · {priceText}
          </p>
          <div className="flex items-center gap-2.5">
            <Pill onClick={onCancel} variant="secondary">
              Abbrechen
            </Pill>
            <Pill onClick={onApply}>Übernehmen</Pill>
          </div>
        </>
      }
      label="Material"
      onClose={onCancel}
      open={open}
      title={
        <>
          Die <em>Front</em>.
        </>
      }
    >
      <p className="m-0 mt-4 max-w-[44ch] text-body text-graphite">
        {frontOptions.length} Oberflächen, alle grifflos. Die Wahl wirkt sofort in der Szene.
      </p>

      <div aria-label="Front" className="mt-6 grid grid-cols-2 gap-4" role="group">
        {frontOptions.map((option) => {
          const active = option.key === frontColor.key;
          return (
            <button
              aria-pressed={active}
              className="group flex flex-col gap-3 text-left"
              key={option.key}
              onClick={() => onSelectFront(option.key)}
              type="button"
            >
              <span
                aria-hidden="true"
                className={`relative block aspect-[3/2] w-full rounded-card bg-cover bg-center transition-[box-shadow] duration-state ease-signature ${
                  active ? "ring-1 ring-ink" : "group-hover:ring-1 group-hover:ring-graphite"
                }`}
                style={finishSurfaceStyle(option)}
              >
                {active && (
                  <span className="absolute left-4 top-4 size-2 rounded-pill bg-signature" />
                )}
              </span>
              <span className="flex flex-col gap-0.5">
                <span className="text-body font-label">{getLocalizedLabel(option.label, locale)}</span>
                <span className="text-[0.875rem] text-graphite">
                  {option.textureUrl ? "Struktur, " : "Lack, "}
                  {FINISH_MATERIAL_LABEL[option.material]}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex items-center justify-between gap-4 border-t border-hairline pt-4">
        <Label>Korpus</Label>
        <div aria-label="Korpus" className="flex items-center gap-2.5" role="group">
          {cabinetOptions.map((option) => {
            const active = option.key === cabinetColor.key;
            return (
              <button
                aria-label={getLocalizedLabel(option.label, locale)}
                aria-pressed={active}
                className={`relative size-11 rounded-card bg-cover bg-center transition-[box-shadow] duration-state ease-signature ${
                  active ? "ring-1 ring-ink" : "hover:ring-1 hover:ring-graphite"
                }`}
                key={option.key}
                onClick={() => onSelectCabinet(option.key)}
                style={finishSurfaceStyle(option)}
                title={getLocalizedLabel(option.label, locale)}
                type="button"
              >
                {active && (
                  <span
                    aria-hidden="true"
                    className="absolute left-1/2 top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-pill bg-signature"
                  />
                )}
              </button>
            );
          })}
          <span className="ml-1.5 text-caption text-graphite">
            {getLocalizedLabel(cabinetColor.label, locale)}
          </span>
        </div>
      </div>
    </Overlay>
  );
}
