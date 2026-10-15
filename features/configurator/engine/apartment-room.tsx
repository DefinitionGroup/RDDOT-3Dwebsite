"use client";

import { AccumulativeShadows, CubeCamera, RandomizedLight, useGLTF } from "@react-three/drei";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import {
  Mesh,
  MeshStandardMaterial,
  type BufferGeometry,
  type Material,
  type Object3D,
  type RectAreaLight
} from "three";
import {
  KITCHEN_MODEL_SCALE,
  KitchenModel
} from "@/features/configurator/engine/kitchen-model";
import { useWoodFloorMaps, WOOD_FLOOR_TILE_M } from "@/features/configurator/engine/wood-floor";
import type { ConfiguratorState, FinishOption } from "@/features/configurator/types";

type ApartmentRoomProps = {
  cabinetFinish: FinishOption;
  frontFinish: FinishOption;
  pathTracing?: boolean;
  reflectionProbe?: boolean;
  reflectionResolution?: number;
  state?: ConfiguratorState;
};

/**
 * The Appartement: a bright, empty room with three tall windows, taken from
 * the defgrp-3d-configurator prototype (`newroom.glb`). The plank floor, a
 * stray candle and a coffee cup were dropped and the meshes Draco-compressed
 * (10 MB to 1 MB). Unlike the former baked scene it is lit in real time: the
 * windows are the light source, the studio HDRI the fill.
 */
const APARTMENT_ROOM_MODEL_PATH = "/models/apartment-room.glb";

/**
 * The room in its source metres (Y-up): side walls at x = -3.12 and 2.55,
 * the window wall's inner face at z = -4.53, the solid back wall at
 * z = 0.82, wall base at y = 0.06, ceiling at y = 2.97.
 */
const SOURCE = {
  minX: -3.12,
  maxX: 2.55,
  windowZ: -4.53,
  curtainZ: -3.94,
  backZ: 0.82,
  floorY: 0.06,
  ceilingY: 2.97
} as const;

/** The two windows and the glazed door, as openings in the window wall. */
const SOURCE_WINDOWS = [
  { minX: -1.71, maxX: -0.86, minY: 0.8, maxY: 2.73 },
  { minX: -0.43, maxX: 0.42, minY: 0.8, maxY: 2.73 },
  { minX: 1.14, maxX: 1.99, minY: 0.09, maxY: 2.73 }
] as const;

/** The back of the kitchen's wall line, measured on the composed kitchen. */
const KITCHEN_BACK_Z = -1.79;

/**
 * The room grows with the kitchen, and 15 % beyond: at true proportions it
 * leaves the camera under two metres in front of the island. Scaled, it
 * reads as an old building with a 3.3 m ceiling, which its tall mullioned
 * windows already suggest.
 */
const S = KITCHEN_MODEL_SCALE * 1.15;

/**
 * The room turns half a revolution so the windows face the fronts, and moves
 * until its back wall meets the kitchen's back and its floor meets y = 0.
 * The longest wall line fits the back wall with room to spare.
 */
const ROOM_POSITION: [number, number, number] = [
  S * ((SOURCE.minX + SOURCE.maxX) / 2),
  -S * SOURCE.floorY,
  KITCHEN_BACK_Z - 0.005 + S * SOURCE.backZ
];
const ROOM_ROTATION: [number, number, number] = [0, Math.PI, 0];

/** A source point in scene coordinates. */
function toScene(x: number, y: number, z: number): [number, number, number] {
  return [-S * x + ROOM_POSITION[0], S * y + ROOM_POSITION[1], -S * z + ROOM_POSITION[2]];
}

const [ROOM_MAX_X, CEILING_Y, BACK_WALL_Z] = toScene(SOURCE.minX, SOURCE.ceilingY, SOURCE.backZ);
const [ROOM_MIN_X, , WINDOW_WALL_Z] = toScene(SOURCE.maxX, SOURCE.floorY, SOURCE.windowZ);
const [, , CURTAIN_Z] = toScene(0, 0, SOURCE.curtainZ);

/** Where the camera may travel: inside the walls, short of the curtain. */
export const APARTMENT_CAMERA_BOUNDS = {
  min: [ROOM_MIN_X + 0.3, 0.3, BACK_WALL_Z + 0.3] as [number, number, number],
  max: [ROOM_MAX_X - 0.3, CEILING_Y - 0.3, CURTAIN_Z - 0.2] as [number, number, number]
};

const FLOOR_MARGIN = 0.2;
const FLOOR_SIZE: [number, number] = [
  ROOM_MAX_X - ROOM_MIN_X + 2 * FLOOR_MARGIN,
  WINDOW_WALL_Z - BACK_WALL_Z + 2 * FLOOR_MARGIN
];
const FLOOR_CENTER: [number, number, number] = [
  (ROOM_MIN_X + ROOM_MAX_X) / 2,
  0,
  (BACK_WALL_Z + WINDOW_WALL_Z) / 2
];

// One panel just inside each opening, facing the kitchen (a RectAreaLight
// emits along its local -z, which the room's half turn already points at it).
const WINDOW_LIGHTS = SOURCE_WINDOWS.map((opening) => {
  const [x, y, z] = toScene(
    (opening.minX + opening.maxX) / 2,
    (opening.minY + opening.maxY) / 2,
    SOURCE.windowZ + 0.03
  );
  return {
    position: [x, y, z] as [number, number, number],
    width: S * (opening.maxX - opening.minX),
    height: S * (opening.maxY - opening.minY)
  };
});

const REFLECTION_PROBE_Y = 1.25;

export function ApartmentRoom({
  cabinetFinish,
  frontFinish,
  pathTracing = false,
  reflectionProbe = true,
  reflectionResolution = 256,
  state
}: ApartmentRoomProps) {
  const gltf = useGLTF(APARTMENT_ROOM_MODEL_PATH, "/draco/gltf/");
  const room = useMemo(() => prepareRoom(gltf.scene), [gltf.scene]);

  useEffect(() => {
    return () => {
      room.ownedMaterials.forEach((material) => material.dispose());
      room.ownedGeometries.forEach((geometry) => geometry.dispose());
    };
  }, [room]);

  return (
    <group>
      <primitive
        object={room.scene}
        position={ROOM_POSITION}
        rotation={ROOM_ROTATION}
        scale={S}
      />
      <WindowLight pathTracing={pathTracing} />
      <WoodFloor pathTracing={pathTracing} />
      {!pathTracing && (
        // Soft accumulated shadows of the kitchen, cast by light from the
        // window side; rebuilt when the line or island changes.
        <AccumulativeShadows
          alphaTest={0.68}
          color="#1a1410"
          colorBlend={1.4}
          frames={100}
          key={`${state?.wallModules.join(",") ?? ""}|${state?.islandSize ?? ""}`}
          opacity={0.85}
          position={[FLOOR_CENTER[0], 0.004, FLOOR_CENTER[2]]}
          scale={9}
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
            position={[0.8, 6, 5.5]}
            radius={7}
            size={14}
          />
        </AccumulativeShadows>
      )}
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
        <KitchenModel cabinetFinish={cabinetFinish} frontFinish={frontFinish} state={state} />
      )}
    </group>
  );
}

/**
 * Daylight through the windows and the glazed door: one soft panel per
 * opening facing the kitchen, a sky-coloured hemisphere, and a sun from the
 * window side that shapes the fronts. In raster mode a warm panel high on
 * the back wall stands in for the light the room bounces back onto the
 * window wall and the curtains; the path tracer finds that bounce itself.
 */
function WindowLight({ pathTracing }: { pathTracing: boolean }) {
  const bounceRef = useRef<RectAreaLight | null>(null);

  useLayoutEffect(() => {
    bounceRef.current?.lookAt(0, 1.4, WINDOW_WALL_Z);
  }, [pathTracing]);

  return (
    <>
      <hemisphereLight args={["#eef2f5", "#7a6a58", 0.45]} />
      {WINDOW_LIGHTS.map((light, index) => (
        <rectAreaLight
          color="#f4f6f8"
          height={light.height}
          intensity={pathTracing ? 14 : 7}
          key={index}
          position={light.position}
          width={light.width}
        />
      ))}
      <directionalLight
        castShadow={pathTracing}
        color="#fff4e8"
        intensity={pathTracing ? 1.8 : 1.4}
        position={[1.5, 4.5, 9]}
        shadow-bias={-0.0002}
        shadow-blurSamples={24}
        shadow-mapSize={[2048, 2048]}
        shadow-normalBias={0.025}
        shadow-radius={7}
      />
      {!pathTracing && (
        <rectAreaLight
          color="#fff3e6"
          height={1.2}
          intensity={3.5}
          position={[0, CEILING_Y - 0.2, BACK_WALL_Z + 0.1]}
          ref={bounceRef}
          width={ROOM_MAX_X - ROOM_MIN_X - 0.6}
        />
      )}
    </>
  );
}

/** The shared wooden floor, under the whole room and a little beyond its walls. */
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

/** Per-material adjustments, keyed by the source material names. */
const MATERIAL_TUNING: Record<string, (material: MeshStandardMaterial) => void> = {
  // Matt wall paint, not satin.
  walls: (material) => {
    material.roughness = 0.92;
  },
  // Undyed linen rather than grey cloth, so the backlit curtains glow.
  "Material.002": (material) => {
    material.color.set("#e8e2d8");
  },
  // The view behind the windows. The export lost its emission texture and
  // glows flat white; it shines its own picture instead, unaffected by the
  // room's lights.
  "Material.005": (material) => {
    material.emissiveMap = material.map;
    material.color.set("#000000");
    material.emissiveIntensity = 1.6;
  }
};

function prepareRoom(sourceScene: Object3D) {
  const scene = sourceScene.clone(true);
  const ownedMaterials: Material[] = [];
  const ownedGeometries: BufferGeometry[] = [];
  const materialCopies = new Map<Material, Material>();

  scene.traverse((object) => {
    if (!(object instanceof Mesh)) {
      return;
    }
    // Own copies, so tuning never leaks into the useGLTF cache and the path
    // tracer can merge attributes without touching the cached geometry.
    object.geometry = object.geometry.clone();
    ownedGeometries.push(object.geometry);

    const source = object.material as Material;
    let material = materialCopies.get(source);
    if (!material) {
      material = source.clone();
      if (material instanceof MeshStandardMaterial) {
        MATERIAL_TUNING[source.name]?.(material);
      }
      materialCopies.set(source, material);
      ownedMaterials.push(material);
    }
    object.material = material;
    // The shell, the curtain and the radiators would shade the whole floor
    // from the randomized lights above; only the kitchen casts.
    object.castShadow = false;
    object.receiveShadow = true;
  });

  return { scene, ownedMaterials, ownedGeometries };
}

export function preloadApartmentRoom() {
  useGLTF.preload(APARTMENT_ROOM_MODEL_PATH, "/draco/gltf/");
}
