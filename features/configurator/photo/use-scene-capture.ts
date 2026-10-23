"use client";

import { useRef } from "react";
import { frameRect, visibleShare } from "@/features/configurator/engine/visible-frame";

export type SceneCaptureRef = React.MutableRefObject<(() => HTMLCanvasElement) | null>;

const TARGET_WIDTH = 1280;
const TARGET_HEIGHT = 720;
/**
 * The Source Capture now travels as bytes to object storage rather than as a
 * data URI in a JSON body, so the old ~256KB provider limit no longer applies.
 * This ceiling exists to keep uploads quick and to stay well inside the
 * module's own capture limit.
 */
const MAX_CAPTURE_BYTES = 1_500_000;
const QUALITY_STEPS = [0.9, 0.8, 0.7, 0.6, 0.45];

export type SceneCapture = {
  blob: Blob;
  /** Object URL for the in-flight preview; the caller revokes it when done. */
  previewUrl: string;
  contentType: "image/jpeg";
  byteSize: number;
};

export function useSceneCapture() {
  const captureRef: SceneCaptureRef = useRef(null);

  /**
   * `coveredRight` is what the Datenblatt covers of the canvas, in CSS pixels:
   * the scene draws its framing into the rest, so that is what is captured.
   */
  async function capturePhoto({ coveredRight = 0 }: { coveredRight?: number } = {}): Promise<SceneCapture | null> {
    const sourceCanvas = captureRef.current?.();
    if (!sourceCanvas || sourceCanvas.width === 0 || sourceCanvas.height === 0) {
      return null;
    }
    const frame = frameRect(
      sourceCanvas.width,
      sourceCanvas.height,
      visibleShare(sourceCanvas.clientWidth || sourceCanvas.width, coveredRight)
    );

    const target = document.createElement("canvas");
    target.width = TARGET_WIDTH;
    target.height = TARGET_HEIGHT;
    const context = target.getContext("2d");
    if (!context) return null;

    // Cover-crop the (possibly portrait) frame to 16:9 around its center.
    const targetAspect = TARGET_WIDTH / TARGET_HEIGHT;
    const sourceAspect = frame.width / frame.height;
    let cropWidth = frame.width;
    let cropHeight = frame.height;
    if (sourceAspect > targetAspect) {
      cropWidth = frame.height * targetAspect;
    } else {
      cropHeight = frame.width / targetAspect;
    }

    context.drawImage(
      sourceCanvas,
      frame.x + (frame.width - cropWidth) / 2,
      frame.y + (frame.height - cropHeight) / 2,
      cropWidth,
      cropHeight,
      0,
      0,
      TARGET_WIDTH,
      TARGET_HEIGHT
    );

    for (const quality of QUALITY_STEPS) {
      const blob = await new Promise<Blob | null>((resolve) => {
        target.toBlob(resolve, "image/jpeg", quality);
      });
      if (!blob) continue;
      if (blob.size <= MAX_CAPTURE_BYTES) {
        return {
          blob,
          previewUrl: URL.createObjectURL(blob),
          contentType: "image/jpeg",
          byteSize: blob.size
        };
      }
    }

    return null;
  }

  return { captureRef, capturePhoto };
}
