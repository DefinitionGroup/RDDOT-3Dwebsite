"use client";

import { AccumulativeShadows, Environment, RandomizedLight, useGLTF } from "@react-three/drei";
import { useLoader } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import {
  EquirectangularReflectionMapping,
  Shape,
  SRGBColorSpace,
  TextureLoader,
  Vector2,
  type Mesh
} from "three";
import { KITCHEN_MODEL_SCALE } from "@/features/configurator/engine/kitchen-model";
import {
  ROOM_DRACO_PATH,
  RoomKitchen,
  useRoomScene,
  type MaterialTuning
} from "@/features/configurator/engine/room-kitchen";
import { useWoodFloorMaps, WOOD_FLOOR_TILE_M } from "@/features/configurator/engine/wood-floor";
import type { ConfiguratorState, FinishOption } from "@/features/configurator/types";

type LoftRoomProps = {
  cabinetFinish: FinishOption;
  frontFinish: FinishOption;
  pathTracing?: boolean;
  reflectionProbe?: boolean;
  reflectionResolution?: number;
  state?: ConfiguratorState;
};

/**
 * The Loft: a dining room behind a full-height glass facade of six windows,
 * from the 3ds Max OBJ "57-estancia_comedor" (160 MB). Prepared in Blender:
 * the living half (sofa, carpet, armchair, wall shelves) dropped where the
 * kitchen stands, the unfinished zone behind the back wall closed off with
 * new walls and ceiling, real materials in place of the export's wire
 * colours, heavy meshes decimated and joined per material, Draco (0.9 MB).
 * The dining table, its chairs and the record sideboard stay. Berlin shows
 * through the glass.
 *
 * The GLB is authored in the kitchen's source metres, Y-up: the kitchen
 * backs onto the left wall at z = -1.517 with its line centred at x = 0, so
 * the room scales with the kitchen about the origin. Meshes named
 * `furniture__*` cast shadows, `room__*` do not.
 */
const LOFT_ROOM_MODEL_PATH = "/models/loft-room.glb";

const S = KITCHEN_MODEL_SCALE;

/**
 * Poly Haven "Potsdamer Platz" (CC0, Greg Zaal), its tonemapped JPG cut to
 * 4K: the scene background, seen only through the glass. 8K would hold
 * about 170 MB of GPU memory once three turns it into a cube map.
 */
const CITY_VIEW_URL = "/hdri/potsdamer-platz.jpg";
/** Turns the panorama so the towers stand in the facade's windows. */
const CITY_VIEW_YAW = 4.15;
/**
 * Well above 1: tone mapping pulls the JPG's whites to grey, and the
 * daylight outside should read brighter than the room, as it does.
 */
const CITY_VIEW_INTENSITY = 3;

/** The room's inner faces in its GLB metres. */
const ROOM = {
  kitchenWallZ: -1.517,
  rightWallZ: 4.923,
  backWallX: 2.695,
  ceilingY: 2.99
} as const;

/** The glazing's inner face leans 5° off square to the kitchen wall. */
const FACADE_SLOPE = -0.0878;
function facadeX(z: number) {
  return -2.695 + FACADE_SLOPE * (z + 1.487);
}

/** The six windows' z extents, lit in pairs: one soft panel per two openings. */
const WINDOW_PAIRS = [
  [-1.457, 0.653],
  [0.713, 2.743],
  [2.803, 4.863]
] as const;
const WINDOW_Y = [0.07, 2.93] as const;

// A RectAreaLight emits along its local -z; this turns it square to the
// leaning glass, facing into the room.
const WINDOW_LIGHT_YAW = Math.atan2(-1, FACADE_SLOPE);

const WINDOW_LIGHTS = WINDOW_PAIRS.map(([near, far]) => {
  const z = (near + far) / 2;
  return {
    position: [
      S * (facadeX(z) + 0.05),
      S * ((WINDOW_Y[0] + WINDOW_Y[1]) / 2),
      S * z
    ] as [number, number, number],
    width: S * (far - near),
    height: S * (WINDOW_Y[1] - WINDOW_Y[0])
  };
});

/** Where the camera may travel: inside the walls, clear of the glass. */
export const LOFT_CAMERA_BOUNDS = {
  min: [S * facadeX(ROOM.kitchenWallZ) + 0.3, 0.3, S * ROOM.kitchenWallZ + 0.3] as [
    number,
    number,
    number
  ],
  max: [S * ROOM.backWallX - 0.3, S * ROOM.ceilingY - 0.3, S * ROOM.rightWallZ - 0.3] as [
    number,
    number,
    number
  ]
};

/** The floor follows the facade, reaching under the walls and the sill. */
const FLOOR_MARGIN = 0.1;
const FLOOR_SHAPE = (() => {
  const near = ROOM.kitchenWallZ - FLOOR_MARGIN;
  const far = ROOM.rightWallZ + FLOOR_MARGIN;
  const back = ROOM.backWallX + FLOOR_MARGIN;
  // Shape space is the floor seen from above: x, and -z once laid flat.
  const corners = [
    [facadeX(near) - 0.05, near],
    [back, near],
    [back, far],
    [facadeX(far) - 0.05, far]
  ];
  return new Shape(corners.map(([x, z]) => new Vector2(S * x, -S * z)));
})();

const FLOOR_CENTER: [number, number, number] = [
  (S * (facadeX(1.7) + ROOM.backWallX)) / 2,
  0,
  (S * (ROOM.kitchenWallZ + ROOM.rightWallZ)) / 2
];

const castsShadow = (mesh: Mesh) => mesh.name.startsWith("furniture__");

export function LoftRoom({
  cabinetFinish,
  frontFinish,
  pathTracing = false,
  reflectionProbe = true,
  reflectionResolution = 256,
  state
}: LoftRoomProps) {
  // Unlike the Appartement's empty shell, the table, chairs and sideboard
  // cast: without contact shadows they would float on the floor.
  const roomScene = useRoomScene(LOFT_ROOM_MODEL_PATH, MATERIAL_TUNING, castsShadow);

  return (
    <group>
      <CityView />
      <primitive object={roomScene} scale={S} />
      <FacadeDaylight pathTracing={pathTracing} />
      <WoodFloor pathTracing={pathTracing} />
      {!pathTracing && (
        // Soft accumulated shadows of the kitchen and the furniture, cast by
        // light from the facade; rebuilt when the line or island changes.
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
          {/* Six lights at most: each carries a shadow map every lit material samples. */}
          <RandomizedLight
            amount={6}
            ambient={0.62}
            bias={0.001}
            intensity={Math.PI}
            position={[-6, 6, 2.5]}
            radius={7}
            size={14}
          />
        </AccumulativeShadows>
      )}
      <RoomKitchen
        cabinetFinish={cabinetFinish}
        frontFinish={frontFinish}
        reflectionProbe={reflectionProbe}
        reflectionResolution={reflectionResolution}
        state={state}
      />
    </group>
  );
}

/**
 * Daylight through the glass: one soft panel per pair of windows, a
 * sky-coloured hemisphere, and a low sun from the facade side that rakes
 * across the fronts.
 */
function FacadeDaylight({ pathTracing }: { pathTracing: boolean }) {
  return (
    <>
      <hemisphereLight args={["#eef2f5", "#7a6a58", 0.45]} />
      {WINDOW_LIGHTS.map((light, index) => (
        <rectAreaLight
          color="#f4f6f8"
          height={light.height}
          intensity={pathTracing ? 8 : 4}
          key={index}
          position={light.position}
          rotation={[0, WINDOW_LIGHT_YAW, 0]}
          width={light.width}
        />
      ))}
      <directionalLight
        castShadow={pathTracing}
        color="#fff4e8"
        intensity={pathTracing ? 1.8 : 1.3}
        position={[-8, 5.5, 5]}
        shadow-bias={-0.0002}
        shadow-blurSamples={24}
        shadow-mapSize={[2048, 2048]}
        shadow-normalBias={0.025}
        shadow-radius={7}
      />
    </>
  );
}

/**
 * The city as the scene background, leaving the studio HDRI as the light.
 * drei reads any .jpg as an HDR gain map, so the panorama loads as a plain
 * texture and is handed over ready-mapped.
 */
function CityView() {
  const source = useLoader(TextureLoader, CITY_VIEW_URL);
  const panorama = useMemo(() => {
    const texture = source.clone();
    texture.mapping = EquirectangularReflectionMapping;
    texture.colorSpace = SRGBColorSpace;
    texture.needsUpdate = true;
    return texture;
  }, [source]);

  useEffect(() => () => panorama.dispose(), [panorama]);

  return (
    <Environment
      background="only"
      backgroundIntensity={CITY_VIEW_INTENSITY}
      backgroundRotation={[0, CITY_VIEW_YAW, 0]}
      map={panorama}
    />
  );
}

/** The shared wooden floor, cut along the leaning facade. */
function WoodFloor({ pathTracing }: { pathTracing: boolean }) {
  // Shape UVs are scene metres.
  const wood = useWoodFloorMaps(1 / WOOD_FLOOR_TILE_M, 1 / WOOD_FLOOR_TILE_M);
  return (
    <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
      <shapeGeometry args={[FLOOR_SHAPE]} />
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

const MATERIAL_TUNING: MaterialTuning = {
  // Barely there: the facade should read as open to the city.
  glass: (material) => {
    material.transparent = true;
    material.opacity = 0.06;
    material.depthWrite = false;
  }
};

export function preloadLoftRoom() {
  useGLTF.preload(LOFT_ROOM_MODEL_PATH, ROOM_DRACO_PATH);
  useLoader.preload(TextureLoader, CITY_VIEW_URL);
}
