import { Emphasized } from "@/components/design-system/emphasized";
import { Pill } from "@/components/design-system/pill";
import { Reveal } from "@/components/design-system/reveal";
import type { BlockProps } from "@/blocks/types";

/** The close: one centred sentence and the action that follows from it. */
export default function ClosingBlock({ block }: BlockProps<"closingBlock">) {
  return (
    <section className="signature-container pt-24 md:pt-40" id={block.anchor}>
      <Reveal className="flex flex-col items-center gap-6 text-center md:gap-8">
        <h2 className="m-0 max-w-[14ch] text-balance text-heading-lg">
          <Emphasized text={block.headline} />
        </h2>
        {block.body && <p className="m-0 max-w-[46ch] text-body text-graphite">{block.body}</p>}
        {block.cta && <Pill href={block.cta.href}>{block.cta.label}</Pill>}
      </Reveal>
    </section>
  );
}
