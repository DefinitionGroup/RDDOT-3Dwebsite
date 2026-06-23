import { ImagePanel } from "@/components/design-system/image-panel";
import { SectionHeading } from "@/components/design-system/section-heading";
import { SignatureButton } from "@/components/design-system/button";

export function MaterialRhythm() {
  return (
    <section className="py-16 md:py-28" id="configure">
      <div className="signature-container grid gap-12 lg:grid-cols-[0.82fr_1.18fr] lg:items-end lg:gap-20">
        <div>
          <SectionHeading title="Material, Licht und Auswahl als System." />
          <p className="mt-8 max-w-[30rem] text-pretty text-[1rem] leading-[1.72] text-graphite">
            Version 1 bringt gute Bausteine für spätere Produktmodule: breite
            Raumansichten, Detailbilder und kurze Copy-Blöcke. Statt sie zu
            stapeln, wird jedes Motiv einem klaren Zweck zugeordnet.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <SignatureButton href="/configure">3D Konfigurator öffnen</SignatureButton>
            <SignatureButton href="#collections" tone="light">
              Linien vergleichen
            </SignatureButton>
          </div>
        </div>
        <ImagePanel
          alt="Dunkle Küche mit Industrie-Fenstern und großzügiger Arbeitsinsel"
          image="/images/signature-panorama.png"
          title="Agile"
          eyebrow="Effizienz. Mit Klasse."
          cta="Zum Modul"
        />
      </div>
    </section>
  );
}
