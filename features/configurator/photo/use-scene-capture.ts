"use client";

import { useRef } from "react";

export type SceneCaptureRef = React.MutableRefObject<(() => HTMLCanvasElement) | null>;

const TARGET_WIDTH = 1280;
const TARGET_HEIGHT = 720;
// Replicate accepts data URIs only up to ~256KB; base64 inflates by 4/3.
const MAX_DATA_URL_CHARS = 340_000;
const QUALITY_STEPS = [0.85, 0.75, 0.65, 0.5, 0.35];

export function useSceneCapture() {
  const captureRef: SceneCaptureRef = useRef(null);

  function capturePhoto(): string | null {
    const sourceCanvas = captureRef.current?.();
    if (!sourceCanvas || sourceCanvas.width === 0 || sourceCanvas.height === 0) {
      return null;
    }

    const target = document.createElement("canvas");
    target.width = TARGET_WIDTH;
    target.height = TARGET_HEIGHT;
    const context = target.getContext("2d");
    if (!context) {
      return null;
    }

    // Cover-crop the (possibly portrait) canvas to 16:9 around the center.
    const targetAspect = TARGET_WIDTH / TARGET_HEIGHT;
    const sourceAspect = sourceCanvas.width / sourceCanvas.height;
    let cropWidth = sourceCanvas.width;
    let cropHeight = sourceCanvas.height;
    if (sourceAspect > targetAspect) {
      cropWidth = sourceCanvas.height * targetAspect;
    } else {
      cropHeight = sourceCanvas.width / targetAspect;
    }
    const cropX = (sourceCanvas.width - cropWidth) / 2;
    const cropY = (sourceCanvas.height - cropHeight) / 2;

    context.drawImage(
      sourceCanvas,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      0,
      0,
      TARGET_WIDTH,
      TARGET_HEIGHT
    );

    for (const quality of QUALITY_STEPS) {
      const dataUrl = target.toDataURL("image/jpeg", quality);
      if (dataUrl.length <= MAX_DATA_URL_CHARS) {
        return dataUrl;
      }
    }

    return null;
  }

  return { captureRef, capturePhoto };
}
