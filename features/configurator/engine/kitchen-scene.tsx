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
import { useThree } from "@react-three/fiber";
import {
  BlendFunction,
  SMAAPreset,
  ToneMappingMode
} from "postprocessing";
import { Suspense, useEffect, useRef, type ElementRef } from "react";
import { Box3, RectAreaLight, Vector3 } from "three";
import type {
  CameraView,
  ConfiguratorState,
  FinishOption,
  VisualizationMode
} from "@/features/configurator/types";
import { findFinish, RDTD_KITCHEN_PRODUCT_V2 } from "@/features/configurator/product-definition";
import {
  APARTMENT_CAMERA_BOUNDS,
  ApartmentRoom
} from "@/features/configurator/engine/apartment-room";
import {
  KitchenModel,
  type KitchenEditProps
} from "@/features/configurator/engine/kitchen-model";
import { getStudioCameraPresets } from "@/features/configurator/modules/asset-manifest";
import { TemporalAccumulation } from "@/features/configurator/engine/temporal-accumulation";
import { useWoodFloorMaps, WOOD_FLOOR_TILE_M } from "@/features/configurator/engine/wood-floor";

/**
 * Poly Haven "Brown Photostudio 02" (CC0), downsampled to 1k. Lights the
 * studio, and fills the Appartement's shadows beside its window light.
 */
const STUDIO_HDRI = "/hdri/brown-photostudio-02.hdr";
const STUDIO_FLOOR_SIZE = 40;

type KitchenSceneProps = {
  cameraView: CameraView;
  edit?: KitchenEditProps;
  onCameraInteraction?: () => void;
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

const APARTMENT_CAMERA_BOX = new Box3(
  new Vector3(...APARTMENT_CAMERA_BOUNDS.min),
  new Vector3(...APARTMENT_CAMERA_BOUNDS.max)
);

/** Vertical field of view per visualization: the Appartement's wider lens. */
function cameraFov(apartment: boolean, compact: boolean) {
  if (apartment) {
    return compact ? 72 : 54;
  }
  return compact ? 50 : 38;
}

export function KitchenScene({
  cameraView,
  edit,
  onCameraInteraction,
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
  const isApartment = visualization === "apartment";
  const reflectionResolution = isCompactViewport ? 128 : 256;
  const layoutKey = `${state.wallModules.join(",")}|${state.islandSize}`;
  const accumulationKey = [
    layoutKey,
    state.cabinetColorKey,
    state.frontColorKey,
    visualization,
    edit ? `edit:${String(edit.selected)}:${edit.drag?.key ?? ""}:${edit.dragTarget ?? ""}` : ""
  ].join("|");

  useEffect(() => {
    const presets = isApartment
      ? isCompactViewport
        ? mobileApartmentCameraPresets
        : apartmentCameraPresets
      : getStudioCameraPresets(isCompactViewport);
    const preset = presets[cameraView];
    const frame = () => {
      const controls = controlsRef.current;
      if (!controls) {
        return;
      }
      // Inside the Appartement the camera and its target stay within the walls.
      controls.boundaryEnclosesCamera = isApartment;
      controls.setBoundary(isApartment ? APARTMENT_CAMERA_BOX : undefined);
      controls.setLookAt(...preset, !pathTracing);
    };
    // A first switch into a visualization suspends on its assets, which can
    // swallow the initial setLookAt (the controls remount around it). Retry
    // on a short schedule; the damped transition makes this imperceptible.
    frame();
    const retries = [300, 900, 1800].map((delay) => window.setTimeout(frame, delay));
    return () => retries.forEach((timer) => window.clearTimeout(timer));
  }, [cameraView, defaultControls, isApartment, isCompactViewport, pathTracing]);

  return (
    <>
      <PerspectiveCamera
        far={50}
        fov={cameraFov(isApartment, isCompactViewport)}
        makeDefault
        near={0.08}
        position={[4.2, 2.4, 5.6]}
      />
      {!pathTracing && !isApartment && (
        <fog args={["#000000", 6.5, 16]} attach="fog" />
      )}
      {!isApartment && <StudioLightRig pathTracing={pathTracing} />}
      {isApartment ? (
        <Environment environmentIntensity={pathTracing ? 0.7 : 0.6} files={STUDIO_HDRI} />
      ) : (
        <StudioEnvironment pathTracing={pathTracing} />
      )}

      {isApartment ? (
        <Suspense fallback={null}>
          <ApartmentRoom
            cabinetFinish={cabinetColor}
            frontFinish={frontColor}
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

      {!pathTracing && !isApartment && (
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
          apartment={isApartment}
          compact={isCompactViewport}
        />
      )}
      <CameraControls
        dollySpeed={0.65}
        makeDefault
        maxDistance={isApartment ? 8 : isCompactViewport ? 13 : 8.4}
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
 * fronts read flat. The Appartement keeps a probe, so fronts mirror the room.
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
  apartment,
  compact
}: {
  accumulationKey: string;
  apartment: boolean;
  compact: boolean;
}) {
  return (
    <EffectComposer multisampling={0}>
      <N8AO
        aoRadius={apartment ? 0.4 : 0.28}
        color={apartment ? "#4d4945" : "#000000"}
        distanceFalloff={0.82}
        intensity={apartment ? 1.18 : 0.8}
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
