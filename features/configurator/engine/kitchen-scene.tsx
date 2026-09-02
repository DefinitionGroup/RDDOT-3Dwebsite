"use client";

import {
  CameraControls,
  ContactShadows,
  CubeCamera,
  Environment,
  Lightformer,
  PerspectiveCamera
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
const STUDIO_REFLECTION_PROBE_Y = 1.15;

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
        <fog args={["#aeb7b3", 9.5, 21]} attach="fog" />
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
        <StudioEnvironment compact={isCompactViewport} pathTracing={pathTracing} />
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
          edit={edit}
          floorTexture={floorTexture}
          frontFinish={frontColor}
          reflectionProbe={!pathTracing}
          reflectionResolution={reflectionResolution}
          state={state}
        />
      )}

      {!pathTracing && !isApartment && (
        <ContactShadows
          blur={3.2}
          color="#514b45"
          far={4.2}
          opacity={0.15}
          position={[0, STUDIO_FLOOR_Y + 0.002, 0]}
          scale={9}
        />
      )}
      {!pathTracing && (
        <CinematicEffects
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
      <hemisphereLight args={["#e8f0ef", "#625d56", 0.22]} />
      <ambientLight intensity={0.025} />
      <directionalLight
        castShadow
        color="#fff4e6"
        intensity={pathTracing ? 2.2 : 1.15}
        position={[4.8, 6.8, 4.6]}
        shadow-bias={-0.0002}
        shadow-blurSamples={24}
        shadow-mapSize={[3072, 3072]}
        shadow-normalBias={0.025}
        shadow-radius={7}
      />
      <rectAreaLight
        color="#fff1df"
        height={4.2}
        intensity={pathTracing ? 16 : 5.2}
        position={[4.3, 4.6, 4.8]}
        ref={keyRef}
        width={3.4}
      />
      <rectAreaLight
        color="#bcd8dc"
        height={3.4}
        intensity={pathTracing ? 8 : 2.4}
        position={[-4.4, 2.7, 1.1]}
        ref={edgeRef}
        width={1.4}
      />
    </>
  );
}

function StudioEnvironment({
  compact,
  pathTracing
}: {
  compact: boolean;
  pathTracing: boolean;
}) {
  return (
    <>
      <color args={["#aeb7b3"]} attach="background" />
      <Environment
        environmentIntensity={pathTracing ? 1.15 : 0.82}
        resolution={compact ? 256 : 512}
      >
        <Lightformer
          color="#fff6e8"
          form="rect"
          intensity={4.5}
          position={[0, 5, -4]}
          rotation={[Math.PI / 2, 0, 0]}
          scale={[8, 3, 1]}
        />
        <Lightformer
          color="#d8eef0"
          form="rect"
          intensity={3.2}
          position={[-4.5, 1.8, 1.5]}
          rotation={[0, Math.PI / 2, 0]}
          scale={[4, 2.2, 1]}
        />
        <Lightformer
          color="#fff0dc"
          form="rect"
          intensity={2.8}
          position={[4.5, 2.5, 2.4]}
          rotation={[0, -Math.PI / 2.5, 0]}
          scale={[2.4, 5, 1]}
        />
        <Lightformer
          color="#71817f"
          form="ring"
          intensity={1.2}
          position={[0, 1, -5]}
          scale={8}
        />
      </Environment>
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
  edit?: KitchenEditProps;
  floorTexture: Texture;
  frontFinish: FinishOption;
  reflectionProbe: boolean;
  reflectionResolution: number;
  state: ConfiguratorState;
};

function StudioKitchen({
  cabinetFinish,
  edit,
  floorTexture,
  frontFinish,
  reflectionProbe,
  reflectionResolution,
  state
}: StudioKitchenProps) {
  return (
    <group position={[0, STUDIO_STAGE_Y, 0]}>
      <AtmosphericStage floorTexture={floorTexture} />
      <group position={[0, STUDIO_FLOOR_OFFSET, 0]}>
        {reflectionProbe ? (
          <CubeCamera
            frames={1}
            position={[0, STUDIO_REFLECTION_PROBE_Y, 0]}
            resolution={reflectionResolution}
          >
            {(environmentMap) => (
              // CubeCamera moves its children with the probe; cancel that lift for the model.
              <group position={[0, -STUDIO_REFLECTION_PROBE_Y, 0]}>
                <KitchenModel
                  cabinetFinish={cabinetFinish}
                  edit={edit}
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
            edit={edit}
            frontFinish={frontFinish}
            state={state}
          />
        )}
      </group>
    </group>
  );
}

function CinematicEffects({ apartment, compact }: { apartment: boolean; compact: boolean }) {
  return (
    <EffectComposer multisampling={compact ? 0 : 4}>
      <N8AO
        aoRadius={apartment ? 0.4 : 0.28}
        color={apartment ? "#4d4945" : "#5a5853"}
        distanceFalloff={0.82}
        intensity={apartment ? 1.18 : 0.92}
        quality={compact ? "medium" : "high"}
      />
      <Bloom
        blendFunction={BlendFunction.ADD}
        intensity={0.035}
        luminanceSmoothing={0.3}
        luminanceThreshold={1.02}
        mipmapBlur
      />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <SMAA preset={SMAAPreset.HIGH} />
    </EffectComposer>
  );
}

type AtmosphericStageProps = {
  floorTexture: Texture;
};

function AtmosphericStage({ floorTexture }: AtmosphericStageProps) {
  return (
    <>
      <mesh
        position={[0, STUDIO_FLOOR_OFFSET, 0]}
        receiveShadow
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[16, 12]} />
        <meshPhysicalMaterial
          bumpMap={floorTexture}
          bumpScale={0.004}
          clearcoat={0.05}
          color="#aaa79f"
          map={floorTexture}
          metalness={0}
          roughness={0.68}
        />
      </mesh>
      <mesh position={[0, 3.46, -3.35]} receiveShadow>
        <planeGeometry args={[16, 7]} />
        <meshStandardMaterial color="#a6afab" metalness={0} roughness={0.9} />
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
