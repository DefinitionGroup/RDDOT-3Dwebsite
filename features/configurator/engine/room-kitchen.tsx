"use client";

import { useCubeCamera, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type ReactNode } from "react";
import {
  Mesh,
  MeshStandardMaterial,
  type BufferGeometry,
  type Group,
  type Material,
  type Object3D,
  type Texture
} from "three";
import { KitchenModel } from "@/features/configurator/engine/kitchen-model";
import type { ConfiguratorState, FinishOption } from "@/features/configurator/types";

export const ROOM_DRACO_PATH = "/draco/gltf/";

const REFLECTION_PROBE_Y = 1.25;

/**
 * How much brighter the view outside is in the probe than to the eye. The
 * panoramas are tonemapped JPGs, about as bright as the lit walls, where
 * real daylight is an order of magnitude brighter; in reflections the
 * windows should read as the light they are.
 */
const PROBE_DAYLIGHT_GAIN = 10;

type RoomKitchenProps = {
  cabinetFinish: FinishOption;
  frontFinish: FinishOption;
  /** The probe captures once; a new key captures the room again. */
  probeKey?: string;
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
  probeKey,
  reflectionProbe,
  reflectionResolution,
  state
}: RoomKitchenProps) {
  if (!reflectionProbe) {
    return <KitchenModel cabinetFinish={cabinetFinish} frontFinish={frontFinish} state={state} />;
  }
  return (
    <ReflectionProbe key={probeKey} resolution={reflectionResolution}>
      {(environmentMap) => (
        <KitchenModel
          cabinetFinish={cabinetFinish}
          environmentMap={environmentMap}
          frontFinish={frontFinish}
          state={state}
        />
      )}
    </ReflectionProbe>
  );
}

/**
 * drei's CubeCamera, captured once per mount with the view outside raised
 * by PROBE_DAYLIGHT_GAIN. Its children are hidden while it captures.
 */
function ReflectionProbe({
  children,
  resolution
}: {
  children: (environmentMap: Texture) => ReactNode;
  resolution: number;
}) {
  const { camera, fbo, update } = useCubeCamera({ resolution });
  const contents = useRef<Group>(null);
  const captured = useRef(false);

  useFrame(({ scene }) => {
    if (captured.current || !contents.current) return;
    // The first frame runs before the scene's matrices are; place the probe.
    camera.updateWorldMatrix(true, false);
    const intensity = scene.backgroundIntensity;
    scene.backgroundIntensity = intensity * PROBE_DAYLIGHT_GAIN;
    contents.current.visible = false;
    update();
    contents.current.visible = true;
    scene.backgroundIntensity = intensity;
    captured.current = true;
  });

  return (
    <group position={[0, REFLECTION_PROBE_Y, 0]}>
      <primitive object={camera} />
      {/* Cancel the probe's lift for the contents. */}
      <group position={[0, -REFLECTION_PROBE_Y, 0]} ref={contents}>
        {children(fbo.texture)}
      </group>
    </group>
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
