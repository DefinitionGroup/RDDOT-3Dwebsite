"use client";

import {
  Check,
  Copy,
  Eye,
  Palette,
  PanelRightClose,
  Scan,
  SlidersHorizontal,
  RotateCcw,
  ShoppingBag,
  View,
  ZoomIn
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { BrandLogo } from "@/components/design-system/brand-logo";
import { ConfiguratorCanvas } from "@/features/configurator/engine/configurator-canvas";
import {
  findFinish,
  formatCurrency,
  getConfiguratorQuote,
  getLocalizedLabel,
  normalizeConfiguratorState,
  RDTD_KITCHEN_PRODUCT
} from "@/features/configurator/product-definition";
import { CONFIG_QUERY_PARAM, encodeConfiguration } from "@/features/configurator/state-codec";
import type {
  CameraView,
  ConfiguratorState,
  FinishOption,
  LocaleCode
} from "@/features/configurator/types";

type ConfiguratorShellProps = {
  initialState: ConfiguratorState;
  locale?: LocaleCode;
};

const cameraViews: { key: CameraView; label: string; Icon: typeof Eye }[] = [
  { key: "signature", label: "Raum", Icon: Eye },
  { key: "front", label: "Front", Icon: Scan },
  { key: "detail", label: "Detail", Icon: ZoomIn }
];

export function ConfiguratorShell({ initialState, locale = "de" }: ConfiguratorShellProps) {
  const [config, setConfig] = useState(() => normalizeConfiguratorState(initialState));
  const [cameraView, setCameraView] = useState<CameraView>("signature");
  const [copied, setCopied] = useState(false);
  const [isConfigPanelOpen, setConfigPanelOpen] = useState(true);
  const [isPending, startTransition] = useTransition();

  const cabinetColor = findFinish(RDTD_KITCHEN_PRODUCT.cabinetColors, config.cabinetColorKey);
  const frontColor = findFinish(RDTD_KITCHEN_PRODUCT.frontColors, config.frontColorKey);
  const quote = getConfiguratorQuote(config);
  const encodedConfig = encodeConfiguration(config);
  const checkoutHref = `/checkout?${CONFIG_QUERY_PARAM}=${encodedConfig}`;

  useEffect(() => {
    const path = `/configure?${CONFIG_QUERY_PARAM}=${encodedConfig}`;
    window.history.replaceState(null, "", path);
  }, [encodedConfig]);

  function updateConfig(next: Partial<ConfiguratorState>) {
    startTransition(() => {
      setConfig((current) => normalizeConfiguratorState({ ...current, ...next }));
    });
  }

  async function copyShareUrl() {
    const path = `/configure?${CONFIG_QUERY_PARAM}=${encodedConfig}`;
    const shareUrl = `${window.location.origin}${path}`;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  function resetConfiguration() {
    updateConfig({
      cabinetColorKey: "graphite",
      frontColorKey: "porcelain",
      layout: "straight-line"
    });
    setCameraView("signature");
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f4f0eb] text-ink">
      <div className="absolute inset-0">
        <ConfiguratorCanvas cameraView={cameraView} state={config} />
      </div>

      <motion.div
        aria-hidden="true"
        animate={{ opacity: isConfigPanelOpen ? 1 : 0.58 }}
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgb(244_240_235/.9)_0%,rgb(244_240_235/.42)_28%,rgb(244_240_235/.08)_58%,rgb(244_240_235/.72)_100%)]"
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      />

      <CameraControlOverlay
        activeView={cameraView}
        isConfigPanelOpen={isConfigPanelOpen}
        onSelect={setCameraView}
      />

      <AnimatePresence initial={false}>
        {!isConfigPanelOpen && (
          <motion.button
            animate={{ opacity: 1, x: 0 }}
            aria-expanded={false}
            aria-label="Konfiguration einblenden"
            className="fixed right-4 top-24 z-30 inline-flex min-h-12 items-center gap-2 bg-ink px-4 text-xs font-semibold uppercase tracking-[0.08em] text-paper shadow-lift transition-colors hover:bg-graphite lg:right-8 lg:top-8"
            exit={{ opacity: 0, x: 14 }}
            initial={{ opacity: 0, x: 14 }}
            onClick={() => setConfigPanelOpen(true)}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            type="button"
          >
            <SlidersHorizontal aria-hidden="true" size={16} strokeWidth={1.8} />
            Konfiguration
          </motion.button>
        )}
      </AnimatePresence>

      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="pointer-events-none relative z-10 flex min-h-screen flex-col justify-between p-4 md:p-6 lg:flex-row lg:p-8"
        initial={{ opacity: 0, y: 18 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="pointer-events-auto flex h-fit items-center justify-between gap-4 lg:w-[24rem]">
          <BrandLogo compact href="/" tone="dark" />
          <Link
            className="bg-paper/80 px-4 py-3 text-xs font-medium uppercase tracking-[0.08em] text-ink backdrop-blur-xl transition-colors hover:bg-paper"
            href="/"
          >
            Zurück
          </Link>
        </div>

        <AnimatePresence initial={false}>
          {isConfigPanelOpen && (
            <motion.section
              animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
              className="pointer-events-auto mt-[46vh] w-full bg-paper/88 p-4 shadow-lift backdrop-blur-2xl md:p-6 lg:mt-0 lg:min-h-[calc(100vh-4rem)] lg:w-[26rem] lg:self-stretch lg:overflow-y-auto"
              exit={{ opacity: 0, x: 32, filter: "blur(8px)" }}
              initial={{ opacity: 0, x: 28, filter: "blur(8px)" }}
              transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="mb-5 flex justify-end">
                <button
                  aria-expanded={true}
                  aria-label="Konfiguration ausblenden"
                  className="inline-flex min-h-10 items-center gap-2 border border-ink/10 bg-white/45 px-3 text-xs font-semibold uppercase tracking-[0.08em] text-ink transition-colors hover:border-ink/35 hover:bg-white/70"
                  onClick={() => setConfigPanelOpen(false)}
                  type="button"
                >
                  <PanelRightClose aria-hidden="true" size={16} strokeWidth={1.8} />
                  Ausblenden
                </button>
              </div>

              <motion.div
                animate="show"
                initial="hidden"
                variants={{
                  hidden: {},
                  show: { transition: { staggerChildren: 0.07 } }
                }}
              >
                <motion.div
                  variants={{
                    hidden: { opacity: 0, y: 18 },
                    show: { opacity: 1, y: 0, transition: { duration: 0.55 } }
                  }}
                >
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-signature">
                    3D Immersion Prototype
                  </p>
                  <h1 className="mt-4 font-editorial text-[clamp(2.3rem,8vw,4.85rem)] leading-[0.9] text-ink">
                    {getLocalizedLabel(RDTD_KITCHEN_PRODUCT.title, locale)}
                  </h1>
                  <p className="mt-5 text-pretty text-sm leading-6 text-graphite">
                    {getLocalizedLabel(RDTD_KITCHEN_PRODUCT.description, locale)}
                  </p>
                </motion.div>

                <motion.div
                  className="mt-7 border-y border-ink/10 py-4"
                  variants={{
                    hidden: { opacity: 0, y: 18 },
                    show: { opacity: 1, y: 0, transition: { duration: 0.55 } }
                  }}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.14em] text-graphite">Layout</p>
                      <p className="mt-1 text-sm font-medium text-ink">Straight line kitchen</p>
                    </div>
                    <div className="grid size-12 place-items-center bg-ink text-paper">
                      <View aria-hidden="true" size={20} strokeWidth={1.8} />
                    </div>
                  </div>
                </motion.div>

                <ControlGroup
                  icon={<Palette aria-hidden="true" size={18} strokeWidth={1.8} />}
                  title="Korpusfarbe"
                >
                  <FinishPicker
                    activeKey={cabinetColor.key}
                    locale={locale}
                    onSelect={(key) => updateConfig({ cabinetColorKey: key })}
                    options={RDTD_KITCHEN_PRODUCT.cabinetColors}
                  />
                </ControlGroup>

                <ControlGroup
                  icon={<Palette aria-hidden="true" size={18} strokeWidth={1.8} />}
                  title="Frontfarbe"
                >
                  <FinishPicker
                    activeKey={frontColor.key}
                    locale={locale}
                    onSelect={(key) => updateConfig({ frontColorKey: key })}
                    options={RDTD_KITCHEN_PRODUCT.frontColors}
                  />
                </ControlGroup>

                <motion.div
                  className="mt-8 space-y-4"
                  variants={{
                    hidden: { opacity: 0, y: 18 },
                    show: { opacity: 1, y: 0, transition: { duration: 0.55 } }
                  }}
                >
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.14em] text-graphite">
                        Preisindikator
                      </p>
                      <p className="mt-1 text-[2rem] font-semibold leading-none text-ink">
                        {formatCurrency(quote.totalCents, locale)}
                      </p>
                    </div>
                    <p className="max-w-[9rem] text-right text-xs leading-5 text-graphite">
                      Temporär aus Produktdaten. Später Commerce-ready.
                    </p>
                  </div>

                  <div className="grid grid-cols-[1fr_auto_auto] gap-2">
                    <a
                      className="inline-flex min-h-12 items-center justify-center gap-2 bg-signature px-4 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5"
                      href={checkoutHref}
                    >
                      <ShoppingBag aria-hidden="true" size={17} />
                      Fake Checkout
                    </a>
                    <button
                      aria-label="Share URL kopieren"
                      className="grid size-12 place-items-center border border-ink/12 bg-white/65 text-ink transition-colors hover:border-ink/35"
                      onClick={copyShareUrl}
                      title="Share URL kopieren"
                      type="button"
                    >
                      {copied ? (
                        <Check aria-hidden="true" size={18} />
                      ) : (
                        <Copy aria-hidden="true" size={18} />
                      )}
                    </button>
                    <button
                      aria-label="Konfiguration zurücksetzen"
                      className="grid size-12 place-items-center border border-ink/12 bg-white/65 text-ink transition-colors hover:border-ink/35"
                      onClick={resetConfiguration}
                      title="Konfiguration zurücksetzen"
                      type="button"
                    >
                      <RotateCcw aria-hidden="true" size={18} />
                    </button>
                  </div>

                  <div className="min-h-5 text-xs text-graphite">
                    {isPending
                      ? "Aktualisiere Szene..."
                      : copied
                        ? "Share-Link kopiert."
                        : "Änderungen werden in der URL gespeichert."}
                  </div>
                </motion.div>
              </motion.div>
            </motion.section>
          )}
        </AnimatePresence>
      </motion.div>
    </main>
  );
}

function CameraControlOverlay({
  activeView,
  isConfigPanelOpen,
  onSelect
}: {
  activeView: CameraView;
  isConfigPanelOpen: boolean;
  onSelect: (view: CameraView) => void;
}) {
  return (
    <div
      className={`pointer-events-auto fixed z-20 w-[min(calc(100vw-2rem),25rem)] -translate-x-1/2 ${
        isConfigPanelOpen
          ? "left-1/2 top-[calc(46vh-5.25rem)] lg:left-[calc((100vw-26rem)/2)] lg:top-auto lg:bottom-8"
          : "bottom-6 left-1/2"
      }`}
    >
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="border border-white/50 bg-paper/72 p-2 shadow-lift backdrop-blur-2xl"
        initial={{ opacity: 0, y: 16 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="grid grid-cols-3 gap-1">
          {cameraViews.map((viewOption) => (
            <CameraViewButton
              active={activeView === viewOption.key}
              icon={viewOption.Icon}
              key={viewOption.key}
              label={viewOption.label}
              onClick={() => onSelect(viewOption.key)}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}

function CameraViewButton({
  active,
  icon: Icon,
  label,
  onClick
}: {
  active: boolean;
  icon: typeof Eye;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-pressed={active}
      className={`inline-flex min-h-11 items-center justify-center gap-2 px-3 text-sm font-semibold transition-colors ${
        active ? "bg-ink text-paper" : "bg-white/45 text-ink hover:bg-white/75"
      }`}
      onClick={onClick}
      type="button"
    >
      <Icon aria-hidden="true" size={16} strokeWidth={1.8} />
      {label}
    </button>
  );
}

function ControlGroup({
  children,
  icon,
  title
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
  title: string;
}) {
  return (
    <motion.div
      className="mt-7"
      variants={{
        hidden: { opacity: 0, y: 18 },
        show: { opacity: 1, y: 0, transition: { duration: 0.55 } }
      }}
    >
      <div className="mb-3 flex items-center gap-2">
        {icon}
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
      </div>
      {children}
    </motion.div>
  );
}

function FinishPicker({
  activeKey,
  locale,
  onSelect,
  options
}: {
  activeKey: string;
  locale: LocaleCode;
  onSelect: (key: string) => void;
  options: FinishOption[];
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {options.map((option) => {
        const isActive = activeKey === option.key;
        return (
          <button
            aria-pressed={isActive}
            className={`min-h-[5.6rem] border p-2 text-left transition-colors ${
              isActive ? "border-ink bg-white" : "border-ink/10 bg-white/45 hover:border-ink/35"
            }`}
            key={option.key}
            onClick={() => onSelect(option.key)}
            title={getLocalizedLabel(option.label, locale)}
            type="button"
          >
            <span
              aria-hidden="true"
              className="block h-8 w-full border border-ink/10 bg-cover bg-center"
              style={
                option.textureUrl
                  ? { backgroundColor: option.hex, backgroundImage: `url(${option.textureUrl})` }
                  : { backgroundColor: option.hex }
              }
            />
            <span className="mt-2 block text-xs font-medium leading-tight text-ink">
              {getLocalizedLabel(option.label, locale)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
