import { RedStop, SectionHeading } from "@/components/design-system/section-heading";
import { collections } from "@/lib/content";

export function CollectionCompare() {
  return (
    <section className="pb-32 md:pb-48" id="linien">
      <div className="signature-container">
        <SectionHeading title="Zwei Linien." />

        <div className="mt-14 grid border-y border-hairline md:mt-20 md:grid-cols-2">
          {collections.map((collection, index) => (
            <article
              className={`flex min-h-[24rem] flex-col justify-between px-0 py-10 md:py-14 ${
                index > 0
                  ? "border-t border-hairline md:border-l md:border-t-0 md:pl-16"
                  : "md:pr-16"
              }`}
              id={collection.id}
              key={collection.id}
            >
              <div>
                <h3 className="text-lead text-ink">
                  <RedStop text={collection.title} />
                </h3>
                <p className="mt-1 text-lead text-ash">{collection.subtitle}</p>
              </div>
              <div className="mt-20">
                <p className="max-w-[24rem] text-pretty text-body text-graphite">
                  {collection.body}
                </p>
                <a
                  className="group mt-8 inline-flex items-center gap-3 text-body text-ink"
                  href={collection.href}
                >
                  <span className="border-b border-ink pb-0.5 transition-colors duration-300 group-hover:border-signature">
                    Linie entdecken
                  </span>
                  <svg
                    aria-hidden="true"
                    className="size-3 transition-transform duration-300 ease-signature group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    fill="none"
                    viewBox="0 0 12 12"
                  >
                    <path
                      d="M2 10 10 2M4 2h6v6"
                      stroke="currentColor"
                      strokeLinecap="square"
                      strokeWidth="1.2"
                    />
                  </svg>
                </a>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
