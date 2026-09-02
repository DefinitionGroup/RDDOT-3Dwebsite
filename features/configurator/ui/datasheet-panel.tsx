"use client";

import { ArrowUpRight, ChevronRight, Pencil } from "lucide-react";
import type { ReactNode } from "react";
import { Accordion, AccordionItem } from "@/components/design-system/accordion";
import { Label } from "@/components/design-system/label";
import { Pill, RoundButton } from "@/components/design-system/pill";
import {
  findWallCatalogEntry,
  getLocalizedLabel,
  RDTD_KITCHEN_PRODUCT_V2
} from "@/features/configurator/product-definition";
import type {
  ConfiguratorQuote,
  ConfiguratorState,
  FinishOption,
  LocaleCode
} from "@/features/configurator/types";
import {
  FINISH_MATERIAL_LABEL,
  finishSurfaceStyle
} from "@/features/configurator/ui/material-overlay";
import { lineWidthM, MODULE_SHORT_LABEL } from "@/features/configurator/ui/module-editor";
import { PriceLines, priceLineCount } from "@/features/configurator/ui/price-breakdown";

export type DatasheetSection = "material" | "layout" | "pricing" | "project";

export const ISLAND_LABEL: Record<number, string> = {
  0: "Ohne",
  2: "Klein",
  4: "Standard",
  6: "Groß"
};

type SummaryRow = { label: string; value: ReactNode };

type DatasheetPanelProps = {
  variant: "card" | "sheet";
  /** Card only: the chevron that tucks the panel away. */
  onCollapse?: () => void;
  /** Sheet only: the handle that grows the sheet. */
  sheetExpanded?: boolean;
  onToggleSheet?: () => void;
  title: ReactNode;
  description?: string;
  locale: LocaleCode;
  state: ConfiguratorState;
  quote: ConfiguratorQuote;
  cabinetColor: FinishOption;
  frontColor: FinishOption;
  priceText: string;
  primary: { href: string; label: string; shortLabel: string; tone: "primary" | "secondary" };
  /** Rows appended to the summary: the shared view's expiry. */
  extraRows?: SummaryRow[];
  /** Without sections the panel is read-only: the shared view. */
  sections?: {
    open: DatasheetSection | null;
    onToggle: (id: DatasheetSection) => void;
    onSelectCabinet: (key: string) => void;
    onSelectFront: (key: string) => void;
    onOpenMaterials: () => void;
    editing: boolean;
    onEdit: () => void;
    project: { title: string; summary: string; content: ReactNode };
  };
};

function formatMeters(value: number) {
  return `${value.toLocaleString("de-DE", { maximumFractionDigits: 2 })} m`;
}

/** The wall line as a strip: cream modules, appliance niches in charcoal. */
function LineStrip({ modules }: { modules: ConfiguratorState["wallModules"] }) {
  const gap = 2;
  const widths = modules.map(
    (key) => findWallCatalogEntry(RDTD_KITCHEN_PRODUCT_V2, key).widthM * 100
  );
  const total = widths.reduce((sum, width) => sum + width, 0) + gap * (modules.length - 1);
  const offsets = widths.reduce<number[]>((acc, width, index) => {
    acc.push(index === 0 ? 0 : acc[index - 1] + widths[index - 1] + gap);
    return acc;
  }, []);
  return (
    <svg
      aria-hidden="true"
      className="block h-5 w-[132px] shrink-0"
      preserveAspectRatio="xMinYMid meet"
      viewBox={`0 0 ${total} 56`}
    >
      {modules.map((key, index) => {
        const width = widths[index];
        const left = offsets[index];
        return (
          <g key={`${key}-${index}`}>
            <rect fill="#F5F1EA" height="50" width={width} x={left} y="1" />
            {key === "device" && (
              <rect fill="#202020" height="18" width={width * 0.45} x={left + width * 0.275} y="15" />
            )}
          </g>
        );
      })}
    </svg>
  );
}

function Swatch({ finish, size = 18 }: { finish: FinishOption; size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="inline-block shrink-0 rounded bg-cover bg-center"
      style={{ ...finishSurfaceStyle(finish), height: size, width: size }}
    />
  );
}

function FinishTiles({
  active,
  label,
  locale,
  onMore,
  onSelect,
  options
}: {
  active: FinishOption;
  label: string;
  locale: LocaleCode;
  onMore?: () => void;
  onSelect: (key: string) => void;
  options: FinishOption[];
}) {
  return (
    <div className="grid grid-cols-[72px_minmax(0,1fr)] items-center gap-3.5">
      <Label>{label}</Label>
      <div aria-label={label} className="flex items-center gap-2" role="group">
        {options.map((option) => {
          const isActive = option.key === active.key;
          const name = getLocalizedLabel(option.label, locale);
          return (
            <button
              aria-label={name}
              aria-pressed={isActive}
              className={`relative size-11 shrink-0 rounded-card bg-cover bg-center transition-[box-shadow] duration-state ease-signature ${
                isActive ? "ring-1 ring-ink" : "hover:ring-1 hover:ring-graphite"
              }`}
              key={option.key}
              onClick={() => onSelect(option.key)}
              style={finishSurfaceStyle(option)}
              title={name}
              type="button"
            >
              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute left-1/2 top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-pill bg-signature"
                />
              )}
            </button>
          );
        })}
        {onMore ? (
          <button
            aria-label="Alle Oberflächen in voller Größe"
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-card border border-hairline text-graphite transition-colors duration-state ease-signature hover:border-ink hover:text-ink"
            onClick={onMore}
            title="Alle Oberflächen"
            type="button"
          >
            <ArrowUpRight aria-hidden="true" size={14} strokeWidth={1.5} />
          </button>
        ) : (
          <span className="ml-1.5 truncate text-caption text-graphite">
            {getLocalizedLabel(active.label, locale)}
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * The Datenblatt: a charcoal card one step above the void (desktop) or the
 * bottom sheet (phones). Configuration first — what is there — then the
 * accordions that change it, then the price and the one action.
 */
export function DatasheetPanel({
  cabinetColor,
  description,
  extraRows = [],
  frontColor,
  locale,
  onCollapse,
  onToggleSheet,
  priceText,
  primary,
  quote,
  sections,
  sheetExpanded = false,
  state,
  title,
  variant
}: DatasheetPanelProps) {
  const sheet = variant === "sheet";
  const worktop = quote.lineItems.find((item) => item.key === "island-worktop")?.quantity ?? 0;
  const rows: SummaryRow[] = [
    {
      label: "Aufbau",
      value: (
        <span className="flex items-center justify-between gap-3">
          <LineStrip modules={state.wallModules} />
          <span>
            {state.wallModules.length} Module · {formatMeters(lineWidthM(state.wallModules))}
          </span>
        </span>
      )
    },
    {
      label: "Insel",
      value:
        state.islandSize === 0
          ? "Ohne"
          : `${ISLAND_LABEL[state.islandSize]} · ${formatMeters(worktop)}`
    },
    {
      label: "Korpus",
      value: (
        <span className="flex items-center justify-end gap-2.5">
          <Swatch finish={cabinetColor} />
          {getLocalizedLabel(cabinetColor.label, locale)}
        </span>
      )
    },
    {
      label: "Front",
      value: (
        <span className="flex items-center justify-end gap-2.5">
          <Swatch finish={frontColor} />
          {getLocalizedLabel(frontColor.label, locale)}, {FINISH_MATERIAL_LABEL[frontColor.material]}
        </span>
      )
    },
    ...extraRows
  ];

  const padding = sheet ? "px-5" : "px-7";

  return (
    <div
      className={`flex h-full flex-col bg-charcoal text-ink ${
        sheet ? "rounded-t-card" : "rounded-card"
      }`}
    >
      {sheet && (
        <button
          aria-expanded={sheetExpanded}
          aria-label={sheetExpanded ? "Datenblatt verkleinern" : "Datenblatt vergrößern"}
          className="flex h-7 w-full shrink-0 items-start justify-center pt-2.5"
          onClick={onToggleSheet}
          type="button"
        >
          <span aria-hidden="true" className="block h-[3px] w-9 rounded-pill bg-hairline" />
        </button>
      )}

      <div className={`flex min-h-0 flex-1 flex-col overflow-y-auto ${padding} ${sheet ? "pt-1" : "pt-7"}`}>
        <div className="flex items-center justify-between gap-4">
          <h1 className={`m-0 ${sheet ? "text-[1.5rem]" : "text-panel"} font-display leading-none tracking-[-0.025em]`}>
            {title}
          </h1>
          {onCollapse && (
            <RoundButton
              aria-label="Datenblatt ausblenden"
              className="-mr-3.5 -mt-2 border-transparent text-graphite hover:text-ink"
              onClick={onCollapse}
              tone="quiet"
            >
              <ChevronRight aria-hidden="true" size={16} strokeWidth={1.5} />
            </RoundButton>
          )}
        </div>
        {description && <p className="m-0 mt-3 text-caption text-graphite">{description}</p>}

        <dl className={`tnum m-0 flex flex-col text-[0.875rem] ${sheet ? "mt-3" : "mt-5"}`}>
          {rows.map((row, index) => (
            <div
              className={`grid grid-cols-[72px_minmax(0,1fr)] items-center gap-3.5 py-2.5 ${
                index < rows.length - 1 ? "border-b border-hairline" : ""
              }`}
              key={row.label}
            >
              <dt className="font-label text-label uppercase tracking-label text-graphite">{row.label}</dt>
              <dd className="m-0 min-w-0 text-right">{row.value}</dd>
            </div>
          ))}
        </dl>

        {sections && (
          <Accordion className="mt-5">
            <AccordionItem
              id={`${variant}-material`}
              onToggle={() => sections.onToggle("material")}
              open={sections.open === "material"}
              summary={
                <span className="flex gap-1">
                  <Swatch finish={cabinetColor} size={14} />
                  <Swatch finish={frontColor} size={14} />
                </span>
              }
              title="Material"
            >
              <div className="flex flex-col gap-4">
                <FinishTiles
                  active={cabinetColor}
                  label="Korpus"
                  locale={locale}
                  onSelect={sections.onSelectCabinet}
                  options={RDTD_KITCHEN_PRODUCT_V2.cabinetColors}
                />
                <FinishTiles
                  active={frontColor}
                  label="Front"
                  locale={locale}
                  onMore={sections.onOpenMaterials}
                  onSelect={sections.onSelectFront}
                  options={RDTD_KITCHEN_PRODUCT_V2.frontColors}
                />
              </div>
            </AccordionItem>

            <AccordionItem
              id={`${variant}-layout`}
              onToggle={() => sections.onToggle("layout")}
              open={sections.open === "layout"}
              summary={state.wallModules.map((key) => MODULE_SHORT_LABEL[key]).join(" ")}
              title="Aufbau"
            >
              <p className="m-0 text-caption text-graphite">
                Schränke in der Szene verschieben, ergänzen oder tauschen. Der Richtpreis folgt
                jeder Änderung; übernommen wird erst mit „Fertig“.
              </p>
              <Pill
                className="mt-4 w-full"
                disabled={sections.editing}
                leading={<Pencil aria-hidden="true" size={14} strokeWidth={1.5} />}
                onClick={sections.onEdit}
                variant="secondary"
              >
                {sections.editing ? "Wird in der Szene bearbeitet" : "Module bearbeiten"}
              </Pill>
            </AccordionItem>

            <AccordionItem
              id={`${variant}-pricing`}
              onToggle={() => sections.onToggle("pricing")}
              open={sections.open === "pricing"}
              summary={`${priceLineCount(quote)} Preispositionen`}
              title="Aufstellung"
            >
              <PriceLines locale={locale} quote={quote} />
            </AccordionItem>

            <AccordionItem
              id={`${variant}-project`}
              onToggle={() => sections.onToggle("project")}
              open={sections.open === "project"}
              summary={sections.project.summary}
              title={sections.project.title}
            >
              {sections.project.content}
            </AccordionItem>
          </Accordion>
        )}
        <div className="h-5 shrink-0" />
      </div>

      <div
        className={`shrink-0 ${padding} ${
          sheet
            ? "flex items-center justify-between gap-4 border-t border-hairline pb-[max(1.375rem,env(safe-area-inset-bottom))] pt-3.5"
            : "flex flex-col gap-3.5 pb-7 pt-5"
        }`}
      >
        {sheet ? (
          <div className="flex flex-col gap-0.5">
            <Label as="span">Richtpreis</Label>
            <span className="tnum text-[1.5rem] font-display leading-[1.1] tracking-[-0.025em]">
              {priceText}
            </span>
          </div>
        ) : (
          <div className="flex items-baseline justify-between gap-4">
            <Label as="span">Richtpreis, unverbindlich</Label>
            <span className="tnum text-title font-display leading-none">{priceText}</span>
          </div>
        )}
        <Pill className={sheet ? "" : "w-full"} href={primary.href} variant={primary.tone}>
          {sheet ? primary.shortLabel : primary.label}
        </Pill>
      </div>
    </div>
  );
}
