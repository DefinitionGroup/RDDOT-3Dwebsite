import { Card } from "@/components/design-system/card";
import { Label, SectionIntro } from "@/components/design-system/label";
import { Reveal } from "@/components/design-system/reveal";
import { signatureFeatures } from "@/lib/content";

/** The four promises: material, technology, manufacturing, planning. */
export function SignaturePromises() {
  return (
    <section className="signature-container pt-20 md:pt-[120px]" id="signature">
      <Reveal className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-end lg:gap-16">
        <SectionIntro
          label="Signature"
          title={
            <>
              Vier Entscheidungen.
              <br className="hidden lg:block" /> Eine Küche, die <em>bleibt</em>.
            </>
          }
        />
        <p className="m-0 max-w-[40ch] text-body text-graphite">
          Kein Katalog, keine tausend Optionen. Material, Aufbau, Prüfung und ein Planer, der
          weiterdenkt, wo der Konfigurator aufhört.
        </p>
      </Reveal>
      <div className="mt-7 grid gap-3 md:mt-12 md:grid-cols-2 md:gap-4 xl:grid-cols-4">
        {signatureFeatures.map((feature, index) => (
          <Reveal as="article" index={index} key={feature.title}>
            <Card className="flex h-full min-h-[220px] flex-col justify-between gap-4 p-6 md:gap-8 md:p-7">
              <Label>{feature.label}</Label>
              <div className="flex flex-col gap-2.5">
                <h3 className="m-0 text-card">{feature.title}</h3>
                <p className="m-0 text-nav font-base text-graphite">{feature.body}</p>
              </div>
            </Card>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
