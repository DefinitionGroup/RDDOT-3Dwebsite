import { ImagePanel } from "@/components/design-system/image-panel";
import { SectionHeading } from "@/components/design-system/section-heading";
import { SignatureButton } from "@/components/design-system/button";

export function MaterialRhythm() {
  return (
    <section className="pb-28 md:pb-44" id="configure">
      <div className="signature-container grid gap-14 lg:grid-cols-[0.8fr_1.2fr] lg:items-end lg:gap-24">
        <div>
          <SectionHeading title="Ihr Raum. Ihre Küche." />
          <p className="mt-8 max-w-[26rem] text-pretty text-lead text-graphite">
            Stellen Sie Front, Stein und Licht in Echtzeit zusammen — im
            3D-Konfigurator.
          </p>
          <div className="mt-10">
            <SignatureButton href="/configure">3D-Konfigurator öffnen</SignatureButton>
          </div>
        </div>
        <ImagePanel
          alt="Dunkle Küche mit Industrie-Fenstern und großzügiger Arbeitsinsel"
          caption="Agile — Industriefenster, mattes Schwarz"
          image="/images/signature-panorama.webp"
          ratio="aspect-[16/10]"
        />
      </div>
    </section>
  );
}
