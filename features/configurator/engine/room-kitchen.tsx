"use client";

import { CubeCamera, useGLTF } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import {
  Mesh,
  MeshStandardMaterial,
  type BufferGeometry,
  type Material,
  type Object3D
} from "three";
import { KitchenModel } from "@/features/configurator/engine/kitchen-model";
import type { ConfiguratorState, FinishOption } from "@/features/configurator/types";

export const ROOM_DRACO_PATH = "/draco/gltf/";

const REFLECTION_PROBE_Y = 1.25;

type RoomKitchenProps = {
  cabinetFinish: FinishOption;
  frontFinish: FinishOption;
  reflectionProbe: boolean;
  reflectionResolution: number;
  state?: ConfiguratorState;
};

/**
 * The kitchen inside a room. With the probe its fronts mirror the room
 * around them rather than the studio HDRI the scene environment carries.
 */
export function RoomKitchen({
  cabinetFinish,
  frontFinish,
  reflectionProbe,
  reflectionResolution,
  state
}: RoomKitchenProps) {
  if (!reflectionProbe) {
    return <KitchenModel cabinetFinish={cabinetFinish} frontFinish={frontFinish} state={state} />;
  }
  return (
    <CubeCamera frames={1} position={[0, REFLECTION_PROBE_Y, 0]} resolution={reflectionResolution}>
      {(environmentMap) => (
        // CubeCamera moves its children with the probe; cancel that lift.
        <group position={[0, -REFLECTION_PROBE_Y, 0]}>
          <KitchenModel
            cabinetFinish={cabinetFinish}
            environmentMap={environmentMap}
            frontFinish={frontFinish}
            state={state}
          />
        </group>
      )}
    </CubeCamera>
  );
}

/** Per-material adjustments, keyed by the source material names. */
export type MaterialTuning = Record<string, (material: MeshStandardMaterial) => void>;

const NEVER_CASTS = () => false;

/**
 * A room GLB's scene with geometry and materials of its own, so tuning never
 * leaks into the useGLTF cache and the path tracer can merge attributes
 * without touching the cached geometry. Disposed with the room.
 */
export function useRoomScene(
  path: string,
  tuning: MaterialTuning,
  castsShadow: (mesh: Mesh) => boolean = NEVER_CASTS
) {
  const gltf = useGLTF(path, ROOM_DRACO_PATH);
  const room = useMemo(
    () => prepareRoomScene(gltf.scene, tuning, castsShadow),
    [gltf.scene, tuning, castsShadow]
  );

  useEffect(() => {
    return () => {
      room.ownedMaterials.forEach((material) => material.dispose());
      room.ownedGeometries.forEach((geometry) => geometry.dispose());
    };
  }, [room]);

  return room.scene;
}

function prepareRoomScene(
  sourceScene: Object3D,
  tuning: MaterialTuning,
  castsShadow: (mesh: Mesh) => boolean
) {
  const scene = sourceScene.clone(true);
  const ownedMaterials: Material[] = [];
  const ownedGeometries: BufferGeometry[] = [];
  const materialCopies = new Map<Material, Material>();

  scene.traverse((object) => {
    if (!(object instanceof Mesh)) {
      return;
    }
    object.geometry = object.geometry.clone();
    ownedGeometries.push(object.geometry);

    const source = object.material as Material;
    let material = materialCopies.get(source);
    if (!material) {
      material = source.clone();
      if (material instanceof MeshStandardMaterial) {
        tuning[source.name]?.(material);
      }
      materialCopies.set(source, material);
      ownedMaterials.push(material);
    }
    object.material = material;
    object.castShadow = castsShadow(object);
    object.receiveShadow = true;
  });

  return { scene, ownedMaterials, ownedGeometries };
}
