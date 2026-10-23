"use client";

import {
  AccumulativeShadows,
  CameraControls,
  Environment,
  MeshReflectorMaterial,
  PerspectiveCamera,
  RandomizedLight
} from "@react-three/drei";
import {
  Bloom,
  EffectComposer,
  N8AO,
  SMAA,
  ToneMapping
} from "@react-three/postprocessing";
import { useFrame, useThree } from "@react-three/fiber";
import {
  BlendFunction,
  SMAAPreset,
  ToneMappingMode
} from "postprocessing";
import { Suspense, useEffect, useRef, type ComponentType, type ElementRef } from "react";
import { Box3, PerspectiveCamera as ThreePerspectiveCamera, RectAreaLight, Vector3 } from "three";
import type {
  CameraView,
  ConfiguratorState,
  FinishOption,
  LoftOutlook,
  VisualizationMode
} from "@/features/configurator/types";
import { findFinish, RDTD_KITCHEN_PRODUCT_V2 } from "@/features/configurator/product-definition";
import { lensShift, visibleShare } from "@/features/configurator/engine/visible-frame";
import {
  APARTMENT_CAMERA_BOUNDS,
  ApartmentRoom
} from "@/features/configurator/engine/apartment-room";
import {
  KitchenModel,
  type KitchenEditProps
} from "@/features/configurator/engine/kitchen-model";
import { LOFT_CAMERA_BOUNDS, LoftRoom } from "@/features/configurator/engine/loft-room";
import { getStudioCameraPresets } from "@/features/configurator/modules/asset-manifest";
import { TemporalAccumulation } from "@/features/configurator/engine/temporal-accumulation";
import { useWoodFloorMaps, WOOD_FLOOR_TILE_M } from "@/features/configurator/engine/wood-floor";

/**
 * Poly Haven "Brown Photostudio 02" (CC0), downsampled to 1k. Lights the
 * studio, and fills the rooms' shadows beside their window light.
 */
const STUDIO_HDRI = "/hdri/brown-photostudio-02.hdr";
const STUDIO_FLOOR_SIZE = 40;

type KitchenSceneProps = {
  cameraView: CameraView;
  /** CSS pixels of the canvas the Datenblatt covers on the right (see visible-frame.ts). */
  coveredRight?: number;
  edit?: KitchenEditProps;
  onCameraInteraction?: () => void;
  outlook: LoftOutlook;
  pathTracing: boolean;
  state: ConfiguratorState;
  visualization: VisualizationMode;
};

type CameraPreset = [number, number, number, number, number, number];

const STUDIO_STAGE_Y = -0.7;
const STUDIO_FLOOR_OFFSET = -0.04;
const STUDIO_FLOOR_Y = STUDIO_STAGE_Y + STUDIO_FLOOR_OFFSET;

// The Appartement's floor is y = 0 with the kitchen at the origin, its back
// to the wall at z = -1.8 and the curtains ahead at z = +4.7. It is shot like
// an interior: a wider lens from the window side, above eye height. Detail
// turns round and looks across the island's worktop to the windows.
const apartmentCameraPresets: Record<CameraView, CameraPreset> = {
  signature: [3.4, 2.7, 4.35, -0.5, 0.8, -1.0],
  front: [0.3, 2.35, 4.45, 0.3, 0.9, -1.2],
  detail: [2.4, 1.9, -0.55, -0.8, 1.05, 4.25]
};

// Phones see only the canvas above the sheet, and the walls keep the target
// off the floor, so these aim low between camera and kitchen to lift it into
// the upper half. Detail stays on the island: the window view would sit
// under the sheet.
const mobileApartmentCameraPresets: Record<CameraView, CameraPreset> = {
  signature: [3.3, 2.1, 4.4, 1.1, 0.35, 1.1],
  front: [0, 2.2, 4.45, 0, 0.4, 1.3],
  detail: [2.9, 1.6, 3.6, 1.3, 0.35, 1.5]
};

// The Loft's kitchen backs onto its left wall at z = -1.8; the glass facade
// runs along x = -3.2 to -3.9 on the left, the dining table stands ahead of
// the island and the record sideboard against the far wall at z = +5.8.
// Signature looks from the far corner past the table, Front from the far
// wall over the table's end, Detail across the island's worktop to the glass.
const loftCameraPresets: Record<CameraView, CameraPreset> = {
  signature: [2.75, 2.4, 5.45, -0.6, 0.85, -0.6],
  front: [0.6, 2.7, 5.45, 0.3, 1.1, -1.2],
  detail: [2.6, 2.0, 0.1, -1.6, 0.9, 1.5]
};

// Phones aim low between camera and kitchen, as in the Appartement, to lift
// the kitchen above the sheet.
const mobileLoftCameraPresets: Record<CameraView, CameraPreset> = {
  signature: [2.7, 2.1, 5.4, 0.6, 0.35, 1.3],
  front: [0.6, 2.2, 5.4, 0.3, 0.4, 1.4],
  detail: [2.6, 1.7, 3.6, 0.6, 0.35, 1.0]
};

type CameraBounds = {
  min: [number, number, number];
  max: [number, number, number];
};

function boundsBox(bounds: CameraBounds) {
  return new Box3(new Vector3(...bounds.min), new Vector3(...bounds.max));
}

/** What every room is given; a room reads only what it needs. */
type RoomProps = {
  cabinetFinish: FinishOption;
  frontFinish: FinishOption;
  outlook: LoftOutlook;
  pathTracing: boolean;
  reflectionProbe: boolean;
  reflectionResolution: number;
  state: ConfiguratorState;
};

/** Each room: its component, its framings, and the box the camera stays in. */
const ROOMS: Record<
  Exclude<VisualizationMode, "studio">,
  {
    Room: ComponentType<RoomProps>;
    presets: Record<CameraView, CameraPreset>;
    compactPresets: Record<CameraView, CameraPreset>;
    cameraBox: Box3;
  }
> = {
  apartment: {
    Room: ApartmentRoom,
    presets: apartmentCameraPresets,
    compactPresets: mobileApartmentCameraPresets,
    cameraBox: boundsBox(APARTMENT_CAMERA_BOUNDS)
  },
  loft: {
    Room: LoftRoom,
    presets: loftCameraPresets,
    compactPresets: mobileLoftCameraPresets,
    cameraBox: boundsBox(LOFT_CAMERA_BOUNDS)
  }
};

/** Vertical field of view: the rooms are shot with a wider lens. */
function cameraFov(room: boolean, compact: boolean) {
  if (room) {
    return compact ? 72 : 54;
  }
  return compact ? 50 : 38;
}

export function KitchenScene({
  cameraView,
  coveredRight = 0,
  edit,
  onCameraInteraction,
  outlook,
  pathTracing,
  state,
  visualization
}: KitchenSceneProps) {
  const controlsRef = useRef<ElementRef<typeof CameraControls> | null>(null);
  const width = useThree((rootState) => rootState.size.width);
  // The controls are rebuilt once the scene's own camera becomes the default;
  // framing follows the instance that finally drives it.
  const defaultControls = useThree((rootState) => rootState.controls);

  const cabinetColor = findFinish(RDTD_KITCHEN_PRODUCT_V2.cabinetColors, state.cabinetColorKey);
  const frontColor = findFinish(RDTD_KITCHEN_PRODUCT_V2.frontColors, state.frontColorKey);
  const isCompactViewport = width < 720;
  const room = visualization === "studio" ? null : ROOMS[visualization];
  const isRoom = room !== null;
  // Polished room finishes show the probe's texels; it is captured only once.
  const reflectionResolution = isCompactViewport ? 256 : 512;
  const layoutKey = `${state.wallModules.join(",")}|${state.islandSize}`;
  const accumulationKey = [
    layoutKey,
    state.cabinetColorKey,
    state.frontColorKey,
    visualization,
    outlook,
    edit ? `edit:${String(edit.selected)}:${edit.drag?.key ?? ""}:${edit.dragTarget ?? ""}` : ""
  ].join("|");

  useEffect(() => {
    const presets = room
      ? isCompactViewport
        ? room.compactPresets
        : room.presets
      : getStudioCameraPresets(isCompactViewport);
    const preset = presets[cameraView];
    const frame = () => {
      const controls = controlsRef.current;
      if (!controls) {
        return;
      }
      // Inside a room the camera and its target stay within the walls.
      controls.boundaryEnclosesCamera = room !== null;
      controls.setBoundary(room?.cameraBox);
      controls.setLookAt(...preset, !pathTracing);
    };
    // A first switch into a visualization suspends on its assets, which can
    // swallow the initial setLookAt (the controls remount around it). Retry
    // on a short schedule; the damped transition makes this imperceptible.
    frame();
    const retries = [300, 900, 1800].map((delay) => window.setTimeout(frame, delay));
    return () => retries.forEach((timer) => window.clearTimeout(timer));
  }, [cameraView, defaultControls, isCompactViewport, pathTracing, room]);

  // The framing is drawn into the part of the canvas the Datenblatt leaves
  // free: zoomed out to its share of the width here, centred by the lens
  // shift below. Opening or closing the panel eases between the two.
  const share = visibleShare(width, coveredRight);
  useEffect(() => {
    void controlsRef.current?.zoomTo(share, !pathTracing);
  }, [defaultControls, pathTracing, share]);

  useFrame(({ camera }) => {
    if (!(camera instanceof ThreePerspectiveCamera)) return;
    const offset = lensShift(camera, share);
    if (Math.abs(camera.filmOffset - offset) < 1e-6) return;
    camera.filmOffset = offset;
    camera.updateProjectionMatrix();
  });

  return (
    <>
      <PerspectiveCamera
        far={50}
        fov={cameraFov(isRoom, isCompactViewport)}
        makeDefault
        near={0.08}
        position={[4.2, 2.4, 5.6]}
      />
      {!pathTracing && !isRoom && (
        <fog args={["#000000", 6.5, 16]} attach="fog" />
      )}
      {!isRoom && <StudioLightRig pathTracing={pathTracing} />}
      {isRoom ? (
        <Environment environmentIntensity={pathTracing ? 0.7 : 0.6} files={STUDIO_HDRI} />
      ) : (
        <StudioEnvironment pathTracing={pathTracing} />
      )}

      {room ? (
        <Suspense fallback={null}>
          <room.Room
            cabinetFinish={cabinetColor}
            frontFinish={frontColor}
            outlook={outlook}
            pathTracing={pathTracing}
            reflectionProbe={!pathTracing}
            reflectionResolution={reflectionResolution}
            state={state}
          />
        </Suspense>
      ) : (
        <StudioKitchen
          cabinetFinish={cabinetColor}
          compact={isCompactViewport}
          edit={edit}
          frontFinish={frontColor}
          pathTracing={pathTracing}
          state={state}
        />
      )}

      {!pathTracing && !isRoom && (
        // Soft, converged ground shadows: many jittered lights averaged over
        // frames, rebuilt whenever the line or island changes.
        <AccumulativeShadows
          alphaTest={0.68}
          color="#1a1410"
          colorBlend={1.4}
          frames={isCompactViewport ? 40 : 120}
          key={layoutKey}
          opacity={0.92}
          position={[0, STUDIO_FLOOR_Y + 0.004, 0]}
          scale={18}
          temporal
        >
          <RandomizedLight
            amount={6}
            ambient={0.62}
            bias={0.001}
            intensity={Math.PI}
            position={[4, 7, 4.5]}
            radius={7}
            size={14}
          />
        </AccumulativeShadows>
      )}
      {!pathTracing && (
        <CinematicEffects
          accumulationKey={accumulationKey}
          interior={isRoom}
          compact={isCompactViewport}
        />
      )}
      <CameraControls
        dollySpeed={0.65}
        makeDefault
        maxDistance={isRoom ? 8 : isCompactViewport ? 13 : 8.4}
        maxPolarAngle={Math.PI / 2.08}
        minDistance={2.2}
        minPolarAngle={Math.PI / 8}
        onControlStart={onCameraInteraction}
        ref={controlsRef}
        smoothTime={0.85}
        truckSpeed={0.42}
      />
    </>
  );
}

function StudioLightRig({ pathTracing }: { pathTracing: boolean }) {
  const keyRef = useRef<RectAreaLight | null>(null);
  const edgeRef = useRef<RectAreaLight | null>(null);

  useEffect(() => {
    keyRef.current?.lookAt(0, 0.75, 0);
    edgeRef.current?.lookAt(0, 0.95, -0.4);
  }, []);

  return (
    <>
      <hemisphereLight args={["#fff4e6", "#000000", 0.03]} />
      <directionalLight
        castShadow={pathTracing}
        color="#fff4e6"
        intensity={pathTracing ? 2.2 : 0.75}
        position={[4.8, 6.8, 4.6]}
        shadow-bias={-0.0002}
        shadow-mapSize={[2048, 2048]}
        shadow-normalBias={0.025}
      />
      {/* Rim from behind and above: separates the line from the void. */}
      <directionalLight color="#cfe0ff" intensity={pathTracing ? 1.4 : 0.9} position={[-2.5, 6, -9]} />
      <rectAreaLight
        color="#fff1df"
        height={4.2}
        intensity={pathTracing ? 16 : 3.2}
        position={[4.3, 4.6, 4.8]}
        ref={keyRef}
        width={3.4}
      />
      <rectAreaLight
        color="#bcd8dc"
        height={3.4}
        intensity={pathTracing ? 8 : 1.4}
        position={[-4.4, 2.7, 1.1]}
        ref={edgeRef}
        width={1.4}
      />
    </>
  );
}

/** The studio: the photographed studio's light, a black stage to the eye. */
function StudioEnvironment({ pathTracing }: { pathTracing: boolean }) {
  return (
    <>
      <color args={["#000000"]} attach="background" />
      <Environment environmentIntensity={pathTracing ? 1.0 : 0.9} files={STUDIO_HDRI} />
    </>
  );
}


type StudioKitchenProps = {
  cabinetFinish: FinishOption;
  compact: boolean;
  edit?: KitchenEditProps;
  frontFinish: FinishOption;
  pathTracing: boolean;
  state: ConfiguratorState;
};

/**
 * The kitchen reflects the studio HDRI through the scene environment; the
 * former cube-camera probe only ever saw the black stage, which is why the
 * fronts read flat. The rooms keep a probe, so fronts mirror the room.
 */
function StudioKitchen({
  cabinetFinish,
  compact,
  edit,
  frontFinish,
  pathTracing,
  state
}: StudioKitchenProps) {
  return (
    <group position={[0, STUDIO_STAGE_Y, 0]}>
      <AtmosphericStage compact={compact} pathTracing={pathTracing} />
      <group position={[0, STUDIO_FLOOR_OFFSET, 0]}>
        <KitchenModel
          cabinetFinish={cabinetFinish}
          edit={edit}
          frontFinish={frontFinish}
          state={state}
        />
      </group>
    </group>
  );
}

/**
 * The effects chain. No multisampling: its depth resolve is refused on
 * some GPUs and silently leaves SMAA alone. Instead the frame is
 * supersampled over time — ambient occlusion first so its noise converges
 * too — then bloom, AgX tone mapping and SMAA for the frames in motion.
 */
function CinematicEffects({
  accumulationKey,
  compact,
  interior
}: {
  accumulationKey: string;
  compact: boolean;
  interior: boolean;
}) {
  return (
    <EffectComposer multisampling={0}>
      <N8AO
        aoRadius={interior ? 0.4 : 0.28}
        color={interior ? "#4d4945" : "#000000"}
        distanceFalloff={0.82}
        intensity={interior ? 1.18 : 0.8}
        quality={compact ? "medium" : "high"}
      />
      <TemporalAccumulation resetKey={accumulationKey} samples={compact ? 16 : 32} />
      <Bloom
        blendFunction={BlendFunction.ADD}
        intensity={0.035}
        luminanceSmoothing={0.3}
        luminanceThreshold={1.02}
        mipmapBlur
      />
      <ToneMapping mode={ToneMappingMode.AGX} />
      <SMAA preset={SMAAPreset.HIGH} />
    </EffectComposer>
  );
}

type AtmosphericStageProps = {
  compact: boolean;
  pathTracing: boolean;
};

/**
 * A varnished wooden floor that faintly mirrors the kitchen — blurred,
 * fading with distance — under a black stage. The path tracer gets a plain
 * physical version of the same floor it can integrate.
 */
function AtmosphericStage({ compact, pathTracing }: AtmosphericStageProps) {
  const repeat = STUDIO_FLOOR_SIZE / WOOD_FLOOR_TILE_M;
  const wood = useWoodFloorMaps(repeat, repeat);
  return (
    <>
      <mesh
        position={[0, STUDIO_FLOOR_OFFSET, 0]}
        receiveShadow
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[STUDIO_FLOOR_SIZE, STUDIO_FLOOR_SIZE]} />
        {pathTracing ? (
          <meshPhysicalMaterial
            clearcoat={0.35}
            clearcoatRoughness={0.3}
            color="#ffffff"
            map={wood.map}
            metalness={0}
            normalMap={wood.normalMap}
            roughness={1}
            roughnessMap={wood.roughnessMap}
          />
        ) : (
          <MeshReflectorMaterial
            blur={[420, 140]}
            color="#ffffff"
            depthScale={1.2}
            depthToBlurRatioBias={0.3}
            envMapIntensity={0.6}
            map={wood.map}
            maxDepthThreshold={1.8}
            metalness={0}
            minDepthThreshold={0.6}
            mirror={compact ? 0.18 : 0.28}
            mixBlur={1.2}
            mixStrength={compact ? 0.45 : 0.6}
            normalMap={wood.normalMap}
            resolution={compact ? 512 : 1024}
            roughness={1}
            roughnessMap={wood.roughnessMap}
          />
        )}
      </mesh>
      {/* The void wall: unlit, so no light ever turns it grey. */}
      <mesh position={[0, 3.46, -3.35]}>
        <planeGeometry args={[40, 7]} />
        <meshBasicMaterial color="#030303" />
      </mesh>
    </>
  );
}
