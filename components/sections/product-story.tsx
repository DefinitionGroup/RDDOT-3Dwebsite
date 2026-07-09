import { FeatureList } from "@/components/design-system/feature-list";
import { ImagePanel } from "@/components/design-system/image-panel";
import { SectionHeading } from "@/components/design-system/section-heading";
import { signatureFeatures } from "@/lib/content";

export function ProductStory() {
  return (
    <section className="py-28 md:py-44" id="collections">
      <div className="signature-container grid gap-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-start lg:gap-24">
        <ImagePanel
          alt="Signature Küche bei Abendlicht mit Glasfront und Holzdecke"
          caption="Exclusive Line — Abendlicht, Glas, Eiche"
          image="/images/signature-detail.webp"
          ratio="aspect-[3/4] md:aspect-[4/5]"
        />
        <div className="lg:sticky lg:top-32">
          <SectionHeading title="Material, das bleibt." />
          <p className="mt-8 max-w-[30rem] text-pretty text-lead text-graphite">
            Eine Küche ist kein Möbel. Sie ist der Raum, in dem gelebt wird.
          </p>
          <div className="mt-14">
            <FeatureList features={signatureFeatures} />
          </div>
        </div>
      </div>
    </section>
  );
}
