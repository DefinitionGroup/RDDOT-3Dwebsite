import type { BlockOf } from "@/blocks/types";
import { image, key } from "@/content/demo-helpers";

type Block = BlockOf<"configuratorBlock">;
type StepInput = { label: string; title: string; body?: string };

export function configuratorDemo(input: {
  anchor?: string;
  productKey: Block["productKey"];
  startFront?: Block["startFront"];
  startCabinet?: Block["startCabinet"];
  label?: string;
  headline: string;
  body?: string;
  counterBefore?: string;
  counterAfter?: string;
  image: { url: string; width: number; height: number; alt: string };
  /** `key` doubles as the stage's _key, so the cycling HUD keeps readable ids. */
  stages: (StepInput & { key: string })[];
  ctaLabel?: string;
  explainerLabel?: string;
  explainerTitle?: string;
  explainerIntro?: string;
  steps?: StepInput[];
}): Block {
  return {
    _key: key("configurator"),
    _type: "configuratorBlock",
    anchor: input.anchor,
    productKey: input.productKey,
    startFront: input.startFront,
    startCabinet: input.startCabinet,
    label: input.label,
    headline: input.headline,
    body: input.body,
    counterBefore: input.counterBefore,
    counterAfter: input.counterAfter,
    image: image(input.image.url, input.image, input.image.alt),
    stages: input.stages.map(({ key: stageKey, ...stage }) => ({ _key: stageKey, _type: "stage", ...stage })),
    ctaLabel: input.ctaLabel,
    explainerLabel: input.explainerLabel,
    explainerTitle: input.explainerTitle,
    explainerIntro: input.explainerIntro,
    steps: input.steps?.map((step) => ({ _key: key("step"), _type: "step", ...step }))
  };
}
