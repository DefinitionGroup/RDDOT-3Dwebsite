"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { PerspectiveCamera, Vector2 } from "three";
import { AccumulationPass } from "@/features/configurator/engine/accumulation-pass";

/** Halton sequence: well-spread sub-pixel offsets in (0, 1). */
function halton(index: number, base: number) {
  let result = 0;
  let fraction = 1 / base;
  let i = index;
  while (i > 0) {
    result += fraction * (i % base);
    i = Math.floor(i / base);
    fraction /= base;
  }
  return result;
}

const EPSILON = 1e-7;

/**
 * Jitters the camera by a sub-pixel offset while nothing moves and feeds
 * the frames to an AccumulationPass. Place it among the composer's
 * children after the ambient-occlusion pass and before the effects that
 * encode the output. Any change to `resetKey`, the camera or the viewport
 * starts the accumulation over.
 */
export function TemporalAccumulation({
  resetKey,
  samples = 32
}: {
  resetKey: string;
  samples?: number;
}) {
  const pass = useMemo(() => new AccumulationPass(samples), [samples]);
  const camera = useThree((rootState) => rootState.camera);
  const gl = useThree((rootState) => rootState.gl);
  const previousMatrix = useRef<number[]>([]);
  const previousKey = useRef(resetKey);
  const size = useMemo(() => new Vector2(), []);

  useEffect(() => () => pass.dispose(), [pass]);

  useFrame(() => {
    if (!(camera instanceof PerspectiveCamera)) return;

    const matrix = camera.matrixWorld.elements;
    const moved =
      previousMatrix.current.length !== 16 ||
      matrix.some((value, index) => Math.abs(value - previousMatrix.current[index]) > EPSILON);
    if (moved) previousMatrix.current = Array.from(matrix);

    if (moved || previousKey.current !== resetKey) {
      previousKey.current = resetKey;
      pass.reset();
    }

    if (pass.sample === 0) {
      // The first frame of a fresh accumulation is shown unjittered, so a
      // moving camera never smears.
      if (camera.view?.enabled) {
        camera.clearViewOffset();
      }
      return;
    }

    gl.getDrawingBufferSize(size);
    const jitterX = halton(pass.sample, 2) - 0.5;
    const jitterY = halton(pass.sample, 3) - 0.5;
    camera.setViewOffset(size.x, size.y, jitterX, jitterY, size.x, size.y);
  });

  return <primitive object={pass} />;
}
