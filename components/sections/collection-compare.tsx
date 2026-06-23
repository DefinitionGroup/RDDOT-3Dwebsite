import { collections } from "@/lib/content";

export function CollectionCompare() {
  return (
    <section className="pb-28 pt-16 md:pb-40 md:pt-24" id="process">
      <div className="signature-container">
        <div className="mb-12 max-w-[42rem]">
          <h2 className="break-words font-brand text-[2.15rem] font-medium leading-[1.08] text-graphite sm:text-[2.6rem] md:text-[3.35rem]">
            Zwei Linien, ein wiederverwendbares Pattern.
          </h2>
          <p className="mt-5 max-w-[34rem] text-pretty text-[1rem] leading-[1.7] text-graphite">
            Die grauen Figma-Flächen werden zu einem Compare-Modul für spätere
            Produkt- oder Kollektionseinträge. Es funktioniert als statischer
            Abschnitt, kann aber direkt an echte Commerce-Daten angeschlossen werden.
          </p>
        </div>

        <div className="grid border-y border-ash/25 md:grid-cols-2">
          {collections.map((collection, index) => (
            <article
              className={`min-h-[26rem] px-8 py-9 md:px-12 md:py-12 ${
                index === 0
                  ? "bg-mist text-ink"
                  : "bg-graphite text-porcelain md:border-l md:border-white/70"
              }`}
              id={collection.id}
              key={collection.id}
            >
              <h3
                className={`font-brand text-[2.4rem] font-medium leading-[1.04] ${
                  collection.tone === "dark" ? "text-white" : "text-graphite"
                }`}
              >
                {collection.title}
              </h3>
              <p
                className={`mt-2 max-w-[24rem] font-brand text-[2rem] font-medium leading-[1.1] ${
                  collection.tone === "dark" ? "text-white/72" : "text-ash"
                }`}
              >
                {collection.subtitle}
              </p>
              <p
                className={`mt-28 max-w-[25rem] text-[0.94rem] leading-[1.65] ${
                  collection.tone === "dark" ? "text-white/72" : "text-graphite"
                }`}
              >
                {collection.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
