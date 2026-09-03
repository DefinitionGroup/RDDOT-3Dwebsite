"use client";

import { AccumulativeShadows, CubeCamera, RandomizedLight, useGLTF } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import {
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  SRGBColorSpace,
  type Material,
  type Object3D,
  type Texture
} from "three";
import { KitchenModel } from "@/features/configurator/engine/kitchen-model";
import { useWoodFloorMaps, WOOD_FLOOR_TILE_M } from "@/features/configurator/engine/wood-floor";
import type { ConfiguratorState, FinishOption } from "@/features/configurator/types";

type Appartement2ModelProps = {
  cabinetFinish: FinishOption;
  frontFinish: FinishOption;
  pathTracing?: boolean;
  reflectionProbe?: boolean;
  reflectionResolution?: number;
  state?: ConfiguratorState;
};

/**
 * Cycles-baked living-room environment (scripts/bake-appartement2.py). All
 * lighting and texture information lives in the baked base-color maps, so
 * the environment renders unlit; the dynamic kitchen is lit by the baked
 * panorama plus a reflection probe standing inside the room.
 */
const APARTMENT2_MODEL_PATH = "/models/appartement2.glb";

// Source scene is Z-up Blender; the exporter converts to Y-up. The painting
// wall's inner face sits at x ~ -4.42, the walkable floor at y = -1.369
// (raycast-measured), the room's depth midline at z ~ 0.55. The kitchen
// rotates 90deg so its wall line backs onto the painting wall.
const KITCHEN_POSITION: [number, number, number] = [-2.63, -1.369, 0.55];
const KITCHEN_ROTATION: [number, number, number] = [0, Math.PI / 2, 0];
const REFLECTION_PROBE_Y = 1.25;

// Scene furniture that occupies the kitchen zone: the two full-height slat
// room dividers standing across the room center.
const REMOVED_OBJECTS = new Set(["Cube021", "Cube022", "Cube.021", "Cube.022"]);

// The room shell (walls, ceiling and the baked floor) must not cast onto the
// new floor: its ceiling would shade the whole room.
const SHELL_OBJECTS = new Set(["Cube.017", "Cube017", "face"]);

// The room's footprint (measured on the baked mesh): x −4.4…2.09, z −5.94…5.11.
const FLOOR_Y = -1.369;
const FLOOR_CENTER: [number, number, number] = [-1.16, FLOOR_Y + 0.003, -0.42];
const FLOOR_SIZE: [number, number] = [6.42, 10.98];

export function Appartement2Model({
  cabinetFinish,
  frontFinish,
  pathTracing = false,
  reflectionProbe = true,
  reflectionResolution = 256,
  state
}: Appartement2ModelProps) {
  const gltf = useGLTF(APARTMENT2_MODEL_PATH, "/draco/gltf/", true);
  const environment = useMemo(
    () => prepareEnvironment(gltf.scene, pathTracing),
    [gltf.scene, pathTracing]
  );

  useEffect(() => {
    return () => {
      environment.ownedMaterials.forEach((material) => material.dispose());
    };
  }, [environment]);

  return (
    <group>
      <primitive object={environment.scene} />
      <WoodFloor pathTracing={pathTracing} />
      {!pathTracing && (
        // Soft accumulated shadows of the kitchen and the furniture on the
        // new floor; rebuilt when the line or island changes.
        <AccumulativeShadows
          alphaTest={0.68}
          color="#1a1410"
          colorBlend={1.4}
          frames={100}
          key={`${state?.wallModules.join(",") ?? ""}|${state?.islandSize ?? ""}`}
          opacity={0.9}
          position={[FLOOR_CENTER[0], FLOOR_Y + 0.006, FLOOR_CENTER[2]]}
          scale={13}
          temporal
        >
          {/* Six lights at most: each carries a shadow map that every lit material
              samples, and a front with map, normal, roughness and environment
              already holds five of the sixteen units a GPU guarantees. */}
          <RandomizedLight
            amount={6}
            ambient={0.62}
            bias={0.001}
            intensity={Math.PI}
            position={[1.5, 6, 2.5]}
            radius={7}
            size={14}
          />
        </AccumulativeShadows>
      )}
      <group position={KITCHEN_POSITION} rotation={KITCHEN_ROTATION}>
        {reflectionProbe ? (
          <CubeCamera
            frames={1}
            position={[0, REFLECTION_PROBE_Y, 0]}
            resolution={reflectionResolution}
          >
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
        ) : (
          <KitchenModel
            cabinetFinish={cabinetFinish}
            frontFinish={frontFinish}
            state={state}
          />
        )}
      </group>
    </group>
  );
}

/**
 * The baked floor stays under a fresh, lit wooden floor the shadows can land
 * on. Tiles run along the room's long side.
 */
function WoodFloor({ pathTracing }: { pathTracing: boolean }) {
  const wood = useWoodFloorMaps(
    FLOOR_SIZE[0] / WOOD_FLOOR_TILE_M,
    FLOOR_SIZE[1] / WOOD_FLOOR_TILE_M
  );
  return (
    <mesh position={FLOOR_CENTER} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={FLOOR_SIZE} />
      <meshPhysicalMaterial
        clearcoat={pathTracing ? 0.35 : 0.25}
        clearcoatRoughness={0.3}
        color="#ffffff"
        envMapIntensity={0.7}
        map={wood.map}
        metalness={0}
        normalMap={wood.normalMap}
        roughness={1}
        roughnessMap={wood.roughnessMap}
      />
    </mesh>
  );
}

function prepareEnvironment(sourceScene: Object3D, pathTracing: boolean) {
  const scene = sourceScene.clone(true);
  const ownedMaterials: Material[] = [];
  const convertedByTexture = new Map<Texture | null, Material>();

  const removed: Object3D[] = [];
  scene.traverse((object) => {
    if (REMOVED_OBJECTS.has(object.name)) {
      removed.push(object);
    }
  });
  removed.forEach((object) => object.parent?.remove(object));

  scene.traverse((object) => {
    if (!(object instanceof Mesh)) {
      return;
    }
    const source = object.material as MeshStandardMaterial;
    const map = (source.map ?? null) as Texture | null;
    if (map) {
      map.colorSpace = SRGBColorSpace;
      map.anisotropy = 8;
      map.needsUpdate = true;
    }

    let converted = convertedByTexture.get(map);
    if (!converted) {
      // Unlit for realtime: the bake already contains the lighting. The
      // path tracer needs a lit material so the panorama illuminates it.
      converted = pathTracing
        ? new MeshStandardMaterial({ map, metalness: 0, roughness: 1 })
        : new MeshBasicMaterial({ map });
      // The bakes are already display-referred; the ACES pass must not
      // tone-map them a second time.
      converted.toneMapped = false;
      convertedByTexture.set(map, converted);
      ownedMaterials.push(converted);
    }
    object.material = converted;
    // Furniture casts onto the wooden floor; the shell would shade the room.
    object.castShadow = !SHELL_OBJECTS.has(object.name);
    object.receiveShadow = true;
  });

  return { scene, ownedMaterials };
}

export function preloadAppartement2Model() {
  useGLTF.preload(APARTMENT2_MODEL_PATH, "/draco/gltf/", true);
}
