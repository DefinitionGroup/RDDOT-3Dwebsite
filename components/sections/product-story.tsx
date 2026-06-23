import { FeatureList } from "@/components/design-system/feature-list";
import { ImagePanel } from "@/components/design-system/image-panel";
import { SectionHeading } from "@/components/design-system/section-heading";
import { signatureFeatures } from "@/lib/content";

export function ProductStory() {
  return (
    <section className="py-24 md:py-36" id="collections">
      <div className="signature-container grid gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-start lg:gap-20">
        <ImagePanel
          alt="Signature Küche bei Abendlicht mit Glasfront und Holzdecke"
          cta="Unsere Line"
          eyebrow="Collections Unsere Produktreihen & Inspirationen"
          image="/images/signature-detail.png"
          priority
          title="Exclusive Line"
        />
        <div className="lg:pt-3">
          <SectionHeading title="Agile" subtitle="Effizienz. Mit Klasse." />
          <p className="mt-8 max-w-[34rem] text-pretty text-[1rem] leading-[1.72] text-graphite">
            Die Figma Entwürfe zeigen eine starke Bildwelt und einen reduzierten
            editorialen Rhythmus. Für den ersten modularen Ecom Schritt wird daraus
            ein klares System: starke Hero-Komposition, kurze Produktstory,
            wiederholbare Collection-Aktionen und sauber getrennte Komponenten.
          </p>
          <div className="mt-12">
            <FeatureList features={signatureFeatures} />
          </div>
        </div>
      </div>
    </section>
  );
}
