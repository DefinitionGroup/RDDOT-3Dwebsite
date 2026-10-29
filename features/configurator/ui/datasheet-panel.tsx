"use client";

import { ArrowUpRight, ChevronRight, Pencil } from "lucide-react";
import type { PointerEvent, ReactNode } from "react";
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
  LocaleCode,
  WallModuleKey
} from "@/features/configurator/types";
import { ElementPalette } from "@/features/configurator/ui/element-palette";
import { finishSurfaceStyle } from "@/features/configurator/ui/material-overlay";
import { lineWidthM, MODULE_SHORT_LABEL } from "@/features/configurator/ui/module-editor";
import { PriceLines, priceLineCount } from "@/features/configurator/ui/price-breakdown";
import { INTL_LOCALE } from "@/lib/i18n";
import { useMessages } from "@/lib/messages/locale-context";

export type DatasheetSection = "material" | "layout" | "pricing" | "project";

type SummaryRow = { label: string; value: ReactNode };

type DatasheetPanelProps = {
  /**
   * card: beside the scene on desktop. sheet: below it on phones. side: beside
   * it on a phone held sideways, as compact as the sheet and framed as a card.
   */
  variant: "card" | "sheet" | "side";
  /** Card and side: the chevron that tucks the panel away. */
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
  /** Below the sections, at the end of the scrolling part: the phone's language switch. */
  footer?: ReactNode;
  /** Without sections the panel is read-only: the shared view. */
  sections?: {
    open: DatasheetSection | null;
    onToggle: (id: DatasheetSection) => void;
    onSelectCabinet: (key: string) => void;
    onSelectFront: (key: string) => void;
    onOpenMaterials: () => void;
    editing: boolean;
    onEdit: () => void;
    /** While editing: the elements that can be dragged into the scene. */
    elements: {
      canAdd: (key: WallModuleKey) => boolean;
      onAdd: (key: WallModuleKey) => void;
      onDragStart: (key: WallModuleKey, event: PointerEvent<HTMLButtonElement>) => void;
    };
    project: { title: string; summary: string; content: ReactNode };
  };
};

/** A length with its unit; the no-break space keeps "3,72 m" on one line. */
function formatMeters(value: number, locale: LocaleCode) {
  return `${value.toLocaleString(INTL_LOCALE[locale], { maximumFractionDigits: 2 })}\u00a0m`;
}

/**
 * The wall line as a strip: cream modules, appliance niches in charcoal. It
 * narrows before the measurement beside it would wrap, as English and
 * Spanish need a few pixels more than German.
 */
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
      className="block h-5 w-[132px] min-w-0 shrink"
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
  const t = useMessages().datasheet;
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
            aria-label={t.allSurfacesFull}
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-card border border-hairline text-graphite transition-colors duration-state ease-signature hover:border-ink hover:text-ink"
            onClick={onMore}
            title={t.allSurfaces}
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
 * The Datenblatt: a charcoal card one step above the void (desktop), the
 * bottom sheet (phones) or a compact card beside the scene (phones held
 * sideways). Configuration first — what is there — then the accordions that
 * change it, then the price and the one action.
 */
export function DatasheetPanel({
  cabinetColor,
  description,
  extraRows = [],
  footer,
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
  const messages = useMessages();
  const t = messages.datasheet;
  const sheet = variant === "sheet";
  // The sheet and the side card share the phone's sizes and its one-line foot.
  const compact = variant !== "card";
  const worktop = quote.lineItems.find((item) => item.key === "island-worktop")?.quantity ?? 0;
  const rows: SummaryRow[] = [
    {
      label: t.layoutRow,
      value: (
        <span className="flex items-center justify-between gap-3">
          <LineStrip modules={state.wallModules} />
          <span className="whitespace-nowrap">
            {t.modules(state.wallModules.length, formatMeters(lineWidthM(state.wallModules), locale))}
          </span>
        </span>
      )
    },
    {
      label: t.island,
      value:
        state.islandSize === 0
          ? messages.islandSizes[0]
          : `${messages.islandSizes[state.islandSize]} · ${formatMeters(worktop, locale)}`
    },
    {
      label: t.cabinet,
      value: (
        <span className="flex items-center justify-end gap-2.5">
          <Swatch finish={cabinetColor} />
          {getLocalizedLabel(cabinetColor.label, locale)}
        </span>
      )
    },
    {
      label: t.front,
      value: (
        <span className="flex items-center justify-end gap-2.5">
          <Swatch finish={frontColor} />
          {getLocalizedLabel(frontColor.label, locale)}, {messages.finishMaterials[frontColor.material]}
        </span>
      )
    },
    ...extraRows
  ];

  const padding = compact ? "px-5" : "px-7";

  return (
    <div
      className={`flex h-full flex-col bg-charcoal text-ink ${
        sheet ? "rounded-t-card" : "rounded-card"
      }`}
    >
      {sheet && (
        <button
          aria-expanded={sheetExpanded}
          aria-label={sheetExpanded ? t.shrink : t.expand}
          className="flex h-7 w-full shrink-0 items-start justify-center pt-2.5"
          onClick={onToggleSheet}
          type="button"
        >
          <span aria-hidden="true" className="block h-[3px] w-9 rounded-pill bg-hairline" />
        </button>
      )}

      <div
        className={`flex min-h-0 flex-1 flex-col overflow-y-auto ${padding} ${sheet ? "pt-1" : compact ? "pt-5" : "pt-7"}`}
      >
        <div className="flex items-center justify-between gap-4">
          <h1 className={`m-0 ${compact ? "text-[1.5rem]" : "text-panel"} font-display leading-none tracking-[-0.025em]`}>
            {title}
          </h1>
          {onCollapse && (
            <RoundButton
              aria-label={t.hide}
              className="-mr-3.5 -mt-2 border-transparent text-graphite hover:text-ink"
              onClick={onCollapse}
              tone="quiet"
            >
              <ChevronRight aria-hidden="true" size={16} strokeWidth={1.5} />
            </RoundButton>
          )}
        </div>
        {description && <p className="m-0 mt-3 text-caption text-graphite">{description}</p>}

        <dl className={`tnum m-0 flex flex-col text-[0.875rem] ${compact ? "mt-3" : "mt-5"}`}>
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
              title={t.material}
            >
              <div className="flex flex-col gap-4">
                <FinishTiles
                  active={cabinetColor}
                  label={t.cabinet}
                  locale={locale}
                  onSelect={sections.onSelectCabinet}
                  options={RDTD_KITCHEN_PRODUCT_V2.cabinetColors}
                />
                <FinishTiles
                  active={frontColor}
                  label={t.front}
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
              title={t.layout}
            >
              {sections.editing ? (
                <>
                  <ElementPalette
                    canAdd={sections.elements.canAdd}
                    locale={locale}
                    onAdd={sections.elements.onAdd}
                    onDragStart={sections.elements.onDragStart}
                  />
                  <p className="m-0 mt-4 text-caption text-graphite">{t.editingHint}</p>
                </>
              ) : (
                <>
                  <p className="m-0 text-caption text-graphite">{t.layoutHint}</p>
                  <Pill
                    className="mt-4 w-full"
                    leading={<Pencil aria-hidden="true" size={14} strokeWidth={1.5} />}
                    onClick={sections.onEdit}
                    variant="secondary"
                  >
                    {messages.configurator.editModules}
                  </Pill>
                </>
              )}
            </AccordionItem>

            <AccordionItem
              id={`${variant}-pricing`}
              onToggle={() => sections.onToggle("pricing")}
              open={sections.open === "pricing"}
              summary={t.priceLines(priceLineCount(quote))}
              title={t.pricing}
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
        {footer && <div className="shrink-0 pt-6">{footer}</div>}
        <div className="h-5 shrink-0" />
      </div>

      <div
        className={`shrink-0 ${padding} ${
          compact
            ? `flex items-center justify-between gap-4 border-t border-hairline pt-3.5 ${
                sheet ? "pb-[max(1.375rem,env(safe-area-inset-bottom))]" : "pb-4"
              }`
            : "flex flex-col gap-3.5 pb-7 pt-5"
        }`}
      >
        {compact ? (
          <div className="flex flex-col gap-0.5">
            <Label as="span">{messages.common.indicativePrice}</Label>
            <span className="tnum text-[1.5rem] font-display leading-[1.1] tracking-[-0.025em]">
              {priceText}
            </span>
          </div>
        ) : (
          <div className="flex items-baseline justify-between gap-4">
            <Label as="span">{t.indicativePriceNonBinding}</Label>
            <span className="tnum text-title font-display leading-none">{priceText}</span>
          </div>
        )}
        <Pill className={compact ? "" : "w-full"} href={primary.href} variant={primary.tone}>
          {compact ? primary.shortLabel : primary.label}
        </Pill>
      </div>
    </div>
  );
}
