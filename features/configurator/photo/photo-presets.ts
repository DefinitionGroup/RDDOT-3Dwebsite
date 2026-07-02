import type { FinishOption, LocaleCode } from "@/features/configurator/types";

export type PhotoPreset = {
  key: string;
  label: Record<LocaleCode, string>;
  scene: string;
};

export const PHOTO_PRESETS: PhotoPreset[] = [
  {
    key: "beach-villa",
    label: {
      de: "Strandvilla Sonnenuntergang",
      en: "Beach villa sunset",
      es: "Villa de playa al atardecer"
    },
    scene:
      "Place this kitchen on the wooden bankirai terrace of a Gran Canaria beach villa with a lot of glass and stone. Huge windows let us view the surroundings on the beach with mountains in the background. The time is sunset, 19:00, warm golden light."
  },
  {
    key: "urban-loft",
    label: { de: "Urban Loft", en: "Urban loft", es: "Loft urbano" },
    scene:
      "Place this kitchen in a spacious industrial loft with polished concrete floors, exposed brick and black steel-framed factory windows. City skyline at dusk outside, warm interior lighting mixing with blue hour light."
  },
  {
    key: "nordic-morning",
    label: { de: "Nordischer Morgen", en: "Nordic morning", es: "Mañana nórdica" },
    scene:
      "Place this kitchen in a minimalist Scandinavian house with pale wood floors and white walls. Floor-to-ceiling windows show a calm fjord and pine forest outside. Soft diffused morning light, slightly misty."
  },
  {
    key: "mediterranean-patio",
    label: {
      de: "Mediterrane Terrasse",
      en: "Mediterranean patio",
      es: "Patio mediterráneo"
    },
    scene:
      "Place this kitchen in an open Mediterranean courtyard with natural stone walls, terracotta floor tiles and olive trees. Warm late-afternoon sunlight casts long soft shadows, a hint of the sea in the distance."
  }
];

export function findPhotoPreset(key: string | undefined | null) {
  return PHOTO_PRESETS.find((preset) => preset.key === key) ?? PHOTO_PRESETS[0];
}

export function buildPhotoPrompt(
  preset: PhotoPreset,
  cabinetFinish: FinishOption,
  frontFinish: FinishOption
) {
  const frontLabel = frontFinish.label.en;
  const cabinetLabel = cabinetFinish.label.en;

  return [
    "This is a rendered 3D model of a kitchen. Turn it into a photorealistic photograph of the exact same kitchen.",
    `The kitchen fronts are ${frontLabel} with a ${frontFinish.material} finish. The cabinet body is ${cabinetLabel}.`,
    "Fill in the sink on the island and add ovens and a microwave in the tall cabinets behind it.",
    preset.scene,
    "Keep the perspective and the camera angle of the input image.",
    "Hyperrealistic, cinematic, professional interior photography."
  ].join(" ");
}
