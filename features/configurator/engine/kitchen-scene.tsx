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
import { ApartmentModel } from "@/features/configurator/engine/apartment-model";
import { KitchenModel } from "@/features/configurator/engine/kitchen-model";

type KitchenSceneProps = {
  cameraView: CameraView;
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

const cameraPresets: Record<CameraView, CameraPreset> = {
  signature: [5.05, 2.75, 6.25, 0, 0.45, -0.08],
  front: [0, 1.55, 6.05, 0, 0.48, 0],
  detail: [2.05, 1.45, 3.05, 0.82, 0.38, 0.08]
};

const mobileCameraPresets: Record<CameraView, CameraPreset> = {
  signature: [7.4, 4.5, 9.2, 0, -2.45, -0.05],
  front: [0, 2.8, 9.4, 0, -1.05, 0],
  detail: [3.15, 1.7, 4.45, 0.75, -0.04, 0.04]
};

const apartmentCameraPresets: Record<CameraView, CameraPreset> = {
  signature: [6.2, 2.7, 5.2, 0, 1.12, 0],
  front: [5.8, 1.95, 0, 0, 1.15, 0],
  detail: [3.6, 1.8, 2.5, 0.2, 1.02, 0.45]
};

const mobileApartmentCameraPresets: Record<CameraView, CameraPreset> = {
  signature: [7.2, 2.9, 6.2, 0, 1.05, 0],
  front: [6.8, 2.1, 0.2, 0, 1.08, 0],
  detail: [4.3, 2, 3.2, 0.15, 0.98, 0.4]
};

export function KitchenScene({
  cameraView,
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
        ? mobileApartmentCameraPresets
        : apartmentCameraPresets
      : isCompactViewport
        ? mobileCameraPresets
        : cameraPresets;
    const preset = presets[cameraView];
    controlsRef.current?.setLookAt(...preset, !pathTracing);
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
      {!pathTracing && (
        <fog
          args={isApartment ? ["#bdc5c4", 14, 32] : ["#aeb7b3", 9.5, 21]}
          attach="fog"
        />
      )}
      {isApartment ? (
        <ApartmentLightRig pathTracing={pathTracing} />
      ) : (
        <StudioLightRig pathTracing={pathTracing} />
      )}
      {isApartment ? (
        <Environment
          background
          backgroundBlurriness={0.055}
          backgroundIntensity={0.42}
          backgroundRotation={[0, -0.55, 0]}
          environmentIntensity={pathTracing ? 1.05 : 0.68}
          environmentRotation={[0, -0.55, 0]}
          files="/hdri/qwantani_dusk_1k.hdr"
        />
      ) : (
        <StudioEnvironment compact={isCompactViewport} pathTracing={pathTracing} />
      )}

      {isApartment ? (
        <Suspense
          fallback={
            <StudioKitchen
              cabinetFinish={cabinetColor}
              floorTexture={floorTexture}
              frontFinish={frontColor}
              reflectionProbe={!pathTracing}
              reflectionResolution={reflectionResolution}
            />
          }
        >
          <ApartmentModel
            cabinetFinish={cabinetColor}
            frontFinish={frontColor}
            pathTracing={pathTracing}
            reflectionProbe={!pathTracing}
            reflectionResolution={reflectionResolution}
          />
        </Suspense>
      ) : (
        <StudioKitchen
          cabinetFinish={cabinetColor}
          floorTexture={floorTexture}
          frontFinish={frontColor}
          reflectionProbe={!pathTracing}
          reflectionResolution={reflectionResolution}
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

function ApartmentLightRig({ pathTracing }: { pathTracing: boolean }) {
  const warmFillRef = useRef<RectAreaLight | null>(null);
  const coolFillRef = useRef<RectAreaLight | null>(null);

  useEffect(() => {
    warmFillRef.current?.lookAt(-0.4, 1, 0.2);
    coolFillRef.current?.lookAt(0.6, 1.15, -0.2);
  }, []);

  return (
    <>
      <hemisphereLight args={["#d8e5eb", "#71675d", 0.52]} />
      <ambientLight color="#c7cdca" intensity={0.14} />
      <directionalLight
        castShadow
        color="#fff0dc"
        intensity={pathTracing ? 1.6 : 0.92}
        position={[4.6, 6.8, -3.6]}
        shadow-bias={-0.0002}
        shadow-blurSamples={24}
        shadow-mapSize={[3072, 3072]}
        shadow-normalBias={0.025}
        shadow-radius={9}
      />
      <rectAreaLight
        color="#ffd2a6"
        height={1.8}
        intensity={pathTracing ? 14 : 2.7}
        position={[1.8, 3.8, -3.2]}
        ref={warmFillRef}
        width={3.8}
      />
      <rectAreaLight
        color="#a9d4ef"
        height={2.4}
        intensity={pathTracing ? 8 : 1.8}
        position={[-3.8, 2.8, 2.8]}
        ref={coolFillRef}
        width={2.6}
      />
      <spotLight
        angle={0.52}
        color="#ffc998"
        intensity={pathTracing ? 4 : 0.76}
        penumbra={0.9}
        position={[-2.8, 4.5, -0.8]}
      />
    </>
  );
}

type StudioKitchenProps = {
  cabinetFinish: FinishOption;
  floorTexture: Texture;
  frontFinish: FinishOption;
  reflectionProbe: boolean;
  reflectionResolution: number;
};

function StudioKitchen({
  cabinetFinish,
  floorTexture,
  frontFinish,
  reflectionProbe,
  reflectionResolution
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
                  environmentMap={environmentMap}
                  frontFinish={frontFinish}
                />
              </group>
            )}
          </CubeCamera>
        ) : (
          <KitchenModel cabinetFinish={cabinetFinish} frontFinish={frontFinish} />
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
