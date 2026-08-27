import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";
import {
  buildPhotoPrompt,
  findPhotoPreset
} from "@/features/configurator/photo/photo-presets";
import {
  findFinish,
  RDTD_KITCHEN_PRODUCT_V2
} from "@/features/configurator/product-definition";

export const maxDuration = 120;

const MODEL = "qwen/qwen-image-2-pro";
const RUN_TIMEOUT_MS = 90_000;
// Base64 of the ~250KB capture plus data-URI overhead.
const MAX_IMAGE_CHARS = 400_000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${label} timed out`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId);
  });
}

function extractOutputUrl(output: unknown): string | null {
  const candidate = Array.isArray(output) ? output[0] : output;

  if (typeof candidate === "string") {
    return candidate;
  }

  if (candidate && typeof candidate === "object" && "url" in candidate) {
    const url = (candidate as { url: unknown }).url;
    if (typeof url === "function") {
      const result = url.call(candidate);
      if (result instanceof URL) return result.href;
      if (typeof result === "string") return result;
    }
    if (typeof url === "string") return url;
  }

  return null;
}

export async function POST(request: NextRequest) {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "REPLICATE_API_TOKEN is not configured on the server." },
      { status: 500 }
    );
  }

  let body: {
    image?: unknown;
    presetKey?: unknown;
    cabinetColorKey?: unknown;
    frontColorKey?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { image, presetKey, cabinetColorKey, frontColorKey } = body;

  if (typeof image !== "string" || !image.startsWith("data:image/jpeg;base64,")) {
    return NextResponse.json(
      { error: "image must be a JPEG data URL." },
      { status: 400 }
    );
  }
  if (image.length > MAX_IMAGE_CHARS) {
    return NextResponse.json({ error: "image is too large." }, { status: 413 });
  }

  const preset = findPhotoPreset(typeof presetKey === "string" ? presetKey : null);
  const cabinetFinish = findFinish(
    RDTD_KITCHEN_PRODUCT_V2.cabinetColors,
    typeof cabinetColorKey === "string" ? cabinetColorKey : ""
  );
  const frontFinish = findFinish(
    RDTD_KITCHEN_PRODUCT_V2.frontColors,
    typeof frontColorKey === "string" ? frontColorKey : ""
  );
  const prompt = buildPhotoPrompt(preset, cabinetFinish, frontFinish);

  try {
    const replicate = new Replicate({ auth: token });
    const output = await withTimeout(
      replicate.run(MODEL, {
        input: {
          image,
          prompt,
          aspect_ratio: "16:9",
          negative_prompt: "",
          match_input_image: false,
          enable_prompt_expansion: true
        }
      }),
      RUN_TIMEOUT_MS,
      "Replicate generation"
    );

    const outputUrl = extractOutputUrl(output);
    if (!outputUrl) {
      throw new Error("Replicate returned no output image");
    }

    // Replicate delivery URLs expire after ~1h; return the bytes instead so
    // the popover image and download keep working without any storage.
    const imageResponse = await withTimeout(
      fetch(outputUrl),
      30_000,
      "Output download"
    );
    if (!imageResponse.ok) {
      throw new Error(`Output download failed with ${imageResponse.status}`);
    }
    const mime = imageResponse.headers.get("content-type") ?? "image/webp";
    const buffer = Buffer.from(await imageResponse.arrayBuffer());

    return NextResponse.json({
      image: `data:${mime};base64,${buffer.toString("base64")}`,
      presetKey: preset.key,
      prompt
    });
  } catch (error) {
    console.error("Photo generation failed:", error);
    const message = error instanceof Error ? error.message : "Generation failed";
    const timedOut = message.toLowerCase().includes("timed out");
    return NextResponse.json(
      { error: timedOut ? "Generation timed out." : "Generation failed." },
      { status: timedOut ? 504 : 502 }
    );
  }
}
