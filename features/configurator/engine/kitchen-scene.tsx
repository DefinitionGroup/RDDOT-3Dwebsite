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
import { Suspense, useEffect, useMemo, useRef, type ElementRef } from "react";
import {
  DataTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  RectAreaLight,
  RGBAFormat,
  SRGBColorSpace,
  type Texture
} from "three";
import type {
  CameraView,
  ConfiguratorState,
  FinishOption,
  VisualizationMode
} from "@/features/configurator/types";
import { findFinish, RDTD_KITCHEN_PRODUCT_V2 } from "@/features/configurator/product-definition";
import { Appartement2Model } from "@/features/configurator/engine/appartement2-model";
import {
  KitchenModel,
  type KitchenEditProps
} from "@/features/configurator/engine/kitchen-model";
import { getStudioCameraPresets } from "@/features/configurator/modules/asset-manifest";
import { TemporalAccumulation } from "@/features/configurator/engine/temporal-accumulation";

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

// Floor level in the baked scene is y = -1.369; eye heights are relative to it.
const apartment2CameraPresets: Record<CameraView, CameraPreset> = {
  signature: [1.85, 0.55, 3.4, -3.0, -0.3, 0.1],
  front: [1.1, 0.15, 0.55, -2.63, 0.05, 0.55],
  detail: [-0.7, 0.05, 1.9, -3.3, -0.25, 0.2]
};

const mobileApartment2CameraPresets: Record<CameraView, CameraPreset> = {
  signature: [1.2, 0.6, 4.6, -2.6, -0.3, 0.3],
  front: [1.4, 0.25, 0.55, -2.63, -0.1, 0.55],
  detail: [0.2, 0.15, 2.7, -3.2, -0.3, 0.2]
};

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

  const floorTexture = useMemo(() => createTexturedFloorTexture(), []);
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
        ? mobileApartment2CameraPresets
        : apartment2CameraPresets
      : getStudioCameraPresets(isCompactViewport);
    const preset = presets[cameraView];
    // A first switch into a visualization suspends on its assets, which can
    // swallow the initial setLookAt (the controls remount around it). Retry
    // on a short schedule; the damped transition makes this imperceptible.
    controlsRef.current?.setLookAt(...preset, !pathTracing);
    const retries = [300, 900, 1800].map((delay) =>
      window.setTimeout(() => {
        controlsRef.current?.setLookAt(...preset, !pathTracing);
      }, delay)
    );
    return () => retries.forEach((timer) => window.clearTimeout(timer));
  }, [cameraView, isApartment, isCompactViewport, pathTracing]);

  useEffect(() => {
    return () => {
      floorTexture.dispose();
    };
  }, [floorTexture]);

  return (
    <>
      <PerspectiveCamera
        far={50}
        fov={isCompactViewport ? 50 : 38}
        makeDefault
        near={0.08}
        position={[4.2, 2.4, 5.6]}
      />
      {!pathTracing && !isApartment && (
        <fog args={["#000000", 6.5, 16]} attach="fog" />
      )}
      {isApartment ? (
        <Appartement2LightRig pathTracing={pathTracing} />
      ) : (
        <StudioLightRig pathTracing={pathTracing} />
      )}
      {isApartment ? (
        <Environment
          environmentIntensity={pathTracing ? 1.1 : 1.2}
          files="/hdri/appartement2_pano.hdr"
        />
      ) : (
        <StudioEnvironment pathTracing={pathTracing} />
      )}

      {isApartment ? (
        <Suspense fallback={null}>
          <Appartement2Model
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
          floorTexture={floorTexture}
          frontFinish={frontColor}
          pathTracing={pathTracing}
          state={state}
        />
      )}

      {!pathTracing && !isApartment && (
        // Soft, converged ground shadows: many jittered lights averaged over
        // frames, rebuilt whenever the line or island changes.
        <AccumulativeShadows
          alphaTest={0.72}
          color="#000000"
          colorBlend={1}
          frames={isCompactViewport ? 40 : 100}
          key={layoutKey}
          opacity={0.85}
          position={[0, STUDIO_FLOOR_Y + 0.004, 0]}
          scale={16}
          temporal
        >
          <RandomizedLight
            amount={8}
            ambient={0.55}
            bias={0.001}
            intensity={Math.PI}
            position={[4.5, 6.5, 5]}
            radius={5}
            size={12}
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
        maxDistance={isApartment ? 11 : isCompactViewport ? 13 : 8.4}
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
      <hemisphereLight args={["#fff4e6", "#000000", 0.06]} />
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

/**
 * The studio's light: an authored soft-studio HDRI (scripts/generate-studio-assets.py)
 * — three softboxes and a rim panel over a graded cyclorama — so lacquer
 * reflects something continuous. The stage stays black to the eye.
 */
function StudioEnvironment({ pathTracing }: { pathTracing: boolean }) {
  return (
    <>
      <color args={["#000000"]} attach="background" />
      <Environment
        environmentIntensity={pathTracing ? 1.15 : 1.0}
        files="/hdri/studio-soft.hdr"
      />
    </>
  );
}

function Appartement2LightRig({ pathTracing }: { pathTracing: boolean }) {
  return (
    <>
      <hemisphereLight args={["#e8ecef", "#6d6862", 0.6]} />
      <ambientLight color="#d9dce0" intensity={0.22} />
      <directionalLight
        castShadow
        color="#fff2e2"
        intensity={pathTracing ? 1.8 : 1.55}
        position={[0.8, 4.6, -8.5]}
        shadow-bias={-0.0002}
        shadow-blurSamples={24}
        shadow-mapSize={[2048, 2048]}
        shadow-normalBias={0.025}
        shadow-radius={7}
      />
      <directionalLight
        color="#e6ecf2"
        intensity={pathTracing ? 0.9 : 0.4}
        position={[5.0, 3.0, 4.2]}
      />
    </>
  );
}

type StudioKitchenProps = {
  cabinetFinish: FinishOption;
  compact: boolean;
  edit?: KitchenEditProps;
  floorTexture: Texture;
  frontFinish: FinishOption;
  pathTracing: boolean;
  state: ConfiguratorState;
};

/**
 * The kitchen reflects the studio HDRI through the scene environment; the
 * former cube-camera probe only ever saw the black stage, which is why the
 * fronts read flat. The reflection probe remains for the Appartement.
 */
function StudioKitchen({
  cabinetFinish,
  compact,
  edit,
  floorTexture,
  frontFinish,
  pathTracing,
  state
}: StudioKitchenProps) {
  return (
    <group position={[0, STUDIO_STAGE_Y, 0]}>
      <AtmosphericStage compact={compact} floorTexture={floorTexture} pathTracing={pathTracing} />
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
  floorTexture: Texture;
  pathTracing: boolean;
};

/**
 * A dark floor that faintly mirrors the kitchen — blurred, fading with
 * distance — is what makes a black stage read as a room rather than a
 * void. The path tracer gets a plain physical floor it can integrate.
 */
function AtmosphericStage({ compact, floorTexture, pathTracing }: AtmosphericStageProps) {
  return (
    <>
      <mesh
        position={[0, STUDIO_FLOOR_OFFSET, 0]}
        receiveShadow
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[40, 40]} />
        {pathTracing ? (
          <meshPhysicalMaterial
            bumpMap={floorTexture}
            bumpScale={0.004}
            clearcoat={0.18}
            clearcoatRoughness={0.35}
            color="#121212"
            map={floorTexture}
            metalness={0}
            roughness={0.5}
          />
        ) : (
          <MeshReflectorMaterial
            blur={[320, 90]}
            bumpMap={floorTexture}
            bumpScale={0.003}
            color="#090909"
            depthScale={1.1}
            depthToBlurRatioBias={0.25}
            envMapIntensity={0.18}
            maxDepthThreshold={1.6}
            metalness={0.05}
            minDepthThreshold={0.5}
            mirror={compact ? 0.25 : 0.38}
            mixBlur={1}
            mixStrength={compact ? 0.6 : 0.85}
            resolution={compact ? 512 : 1024}
            roughness={0.8}
          />
        )}
      </mesh>
      <mesh position={[0, 3.46, -3.35]} receiveShadow>
        <planeGeometry args={[40, 7]} />
        <meshStandardMaterial color="#070707" metalness={0} roughness={0.95} />
      </mesh>
    </>
  );
}

function createTexturedFloorTexture() {
  const size = 512;
  const data = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const offset = (y * size + x) * 4;
      const broadVariation = fractalNoise(x, y) * 18 - 9;
      const mineralCloud = Math.sin(x * 0.018 + y * 0.011 + broadVariation * 0.08) * 2.4;
      const fineGrain = (hashNoise(x, y) - 0.5) * 2.2;
      const base = 148 + broadVariation + mineralCloud + fineGrain;

      data[offset] = clampByte(base + 5);
      data[offset + 1] = clampByte(base + 3);
      data[offset + 2] = clampByte(base);
      data[offset + 3] = 255;
    }
  }

  const texture = new DataTexture(data, size, size, RGBAFormat);
  texture.anisotropy = 8;
  texture.colorSpace = SRGBColorSpace;
  texture.generateMipmaps = true;
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.needsUpdate = true;

  return texture;
}

function clampByte(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function fractalNoise(x: number, y: number) {
  let amplitude = 0.5;
  let frequency = 1 / 96;
  let total = 0;
  let weight = 0;

  for (let octave = 0; octave < 4; octave += 1) {
    total += smoothNoise(x * frequency, y * frequency) * amplitude;
    weight += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }

  return total / weight;
}

function smoothNoise(x: number, y: number) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const tx = smoothStep(x - x0);
  const ty = smoothStep(y - y0);
  const top = mix(hashNoise(x0, y0), hashNoise(x0 + 1, y0), tx);
  const bottom = mix(hashNoise(x0, y0 + 1), hashNoise(x0 + 1, y0 + 1), tx);

  return mix(top, bottom, ty);
}

function hashNoise(x: number, y: number) {
  const value = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;

  return value - Math.floor(value);
}

function smoothStep(value: number) {
  return value * value * (3 - 2 * value);
}

function mix(start: number, end: number, amount: number) {
  return start + (end - start) * amount;
}
