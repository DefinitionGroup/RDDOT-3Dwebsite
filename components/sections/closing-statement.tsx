import { Pill } from "@/components/design-system/pill";
import { Reveal } from "@/components/design-system/reveal";
import { configureHref } from "@/lib/content";

/** The close: the project lives in the customer's own area. */
export function ClosingStatement() {
  return (
    <section className="signature-container pt-24 md:pt-40">
      <Reveal className="flex flex-col items-center gap-6 text-center md:gap-8">
        <h2 className="m-0 max-w-[14ch] text-balance text-heading-lg">
          Ihre Küche. In <em>Ihrem</em> Bereich.
        </h2>
        <p className="m-0 max-w-[44ch] text-body text-graphite">
          Konfigurieren Sie als Gast, speichern Sie mit einer E-Mail-Adresse. Versionen, Fotos und
          Anfragen bleiben privat bei Ihrem Projekt.
        </p>
        <Pill href={configureHref}>Küche konfigurieren</Pill>
      </Reveal>
    </section>
  );
}
