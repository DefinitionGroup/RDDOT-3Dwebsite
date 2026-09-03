"use client";

import { useTexture } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import { RepeatWrapping, SRGBColorSpace, type Texture } from "three";

/**
 * Poly Haven "Wooden Floor 01" (CC0), converted to web sizes: 2k diffuse,
 * 2k OpenGL normal, 1k roughness. One tile spans about two metres.
 */
export const WOOD_FLOOR_TILE_M = 2.0;

const WOOD_FLOOR_URLS = [
  "/textures/wood-floor-diff.jpg",
  "/textures/wood-floor-normal.jpg",
  "/textures/wood-floor-rough.jpg"
] as const;

export type WoodFloorMaps = {
  map: Texture;
  normalMap: Texture;
  roughnessMap: Texture;
};

/** The three maps, cloned and repeated for one surface. Disposed with it. */
export function useWoodFloorMaps(repeatX: number, repeatY: number): WoodFloorMaps {
  const [diffuse, normal, roughness] = useTexture([...WOOD_FLOOR_URLS]);
  const maps = useMemo(() => {
    const prepare = (source: Texture, srgb: boolean) => {
      const texture = source.clone();
      texture.colorSpace = srgb ? SRGBColorSpace : source.colorSpace;
      texture.wrapS = RepeatWrapping;
      texture.wrapT = RepeatWrapping;
      texture.repeat.set(repeatX, repeatY);
      texture.anisotropy = 16;
      texture.needsUpdate = true;
      return texture;
    };
    return {
      map: prepare(diffuse, true),
      normalMap: prepare(normal, false),
      roughnessMap: prepare(roughness, false)
    };
  }, [diffuse, normal, roughness, repeatX, repeatY]);

  useEffect(() => {
    return () => {
      Object.values(maps).forEach((texture) => texture.dispose());
    };
  }, [maps]);

  return maps;
}

WOOD_FLOOR_URLS.forEach((url) => useTexture.preload(url));
