"use client";

import {
  CameraControls,
  ContactShadows,
  CubeCamera,
  Environment
} from "@react-three/drei";
import {
  Bloom,
  BrightnessContrast,
  EffectComposer,
  LUT,
  N8AO,
  SMAA,
  ToneMapping,
  Vignette
} from "@react-three/postprocessing";
import { useThree } from "@react-three/fiber";
import {
  BlendFunction,
  LookupTexture,
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
import { findFinish, RDTD_KITCHEN_PRODUCT } from "@/features/configurator/product-definition";
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
  signature: [5.6, 2.55, 7.05, 0, -0.22, -0.12],
  front: [0, 1.45, 6.8, 0, 0.05, 0],
  detail: [2.7, 1.45, 3.85, 0.75, 0.02, 0.04]
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
  const cabinetColor = findFinish(RDTD_KITCHEN_PRODUCT.cabinetColors, state.cabinetColorKey);
  const frontColor = findFinish(RDTD_KITCHEN_PRODUCT.frontColors, state.frontColorKey);
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
      {!pathTracing && (
        <fog
          args={isApartment ? ["#bdc5c4", 14, 32] : ["#d7e8e9", 8.5, 19]}
          attach="fog"
        />
      )}
      {isApartment ? (
        <ApartmentLightRig pathTracing={pathTracing} />
      ) : (
        <StudioLightRig pathTracing={pathTracing} />
      )}
      <Environment
        background
        backgroundBlurriness={0.035}
        backgroundIntensity={isApartment ? 0.46 : 0.72}
        backgroundRotation={[0, -0.55, 0]}
        environmentIntensity={
          pathTracing ? (isApartment ? 1.15 : 1.05) : isApartment ? 0.74 : 0.96
        }
        environmentRotation={[0, -0.55, 0]}
        files="/hdri/qwantani_dusk_1k.hdr"
      />

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
        maxDistance={isApartment ? 11 : 8.4}
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
  return (
    <>
      <hemisphereLight args={["#f6fbff", "#857a6e", 0.35]} />
      <ambientLight intensity={0.04} />
      <directionalLight
        castShadow
        intensity={pathTracing ? 1.8 : 1.35}
        position={[4.8, 6.2, 3.9]}
        shadow-bias={-0.0002}
        shadow-blurSamples={24}
        shadow-mapSize={[3072, 3072]}
        shadow-normalBias={0.025}
        shadow-radius={8}
      />
      <spotLight
        angle={0.48}
        color="#fff1dd"
        intensity={pathTracing ? 2 : 0.82}
        penumbra={0.78}
        position={[-3.6, 4.7, 3.8]}
      />
      <pointLight
        color="#bfe6ff"
        intensity={pathTracing ? 0.45 : 0.22}
        position={[3.6, 2.4, -3.8]}
      />
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
  const lut = useMemo(() => createCinematicLut(), []);

  useEffect(() => {
    return () => lut.dispose();
  }, [lut]);

  return (
    <EffectComposer multisampling={compact ? 0 : 4}>
      <N8AO
        aoRadius={apartment ? 0.42 : 0.35}
        color={apartment ? "#4d4945" : "#625b54"}
        distanceFalloff={0.9}
        intensity={apartment ? 1.28 : 1.08}
        quality={compact ? "medium" : "high"}
      />
      <Bloom
        blendFunction={BlendFunction.ADD}
        intensity={0.09}
        luminanceSmoothing={0.3}
        luminanceThreshold={0.94}
        mipmapBlur
      />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <BrightnessContrast brightness={-0.035} contrast={0.055} />
      <LUT lut={lut} tetrahedralInterpolation />
      <Vignette darkness={0.28} eskil={false} offset={0.32} />
      <SMAA preset={SMAAPreset.HIGH} />
    </EffectComposer>
  );
}

type AtmosphericStageProps = {
  floorTexture: Texture;
};

function AtmosphericStage({ floorTexture }: AtmosphericStageProps) {
  return (
    <mesh
      position={[0, STUDIO_FLOOR_OFFSET, 0]}
      receiveShadow
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <planeGeometry args={[16, 12]} />
      <meshStandardMaterial
        bumpMap={floorTexture}
        bumpScale={0.006}
        color="#d0ccc4"
        map={floorTexture}
        metalness={0.01}
        roughness={0.74}
      />
    </mesh>
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

function createCinematicLut() {
  const lut = LookupTexture.createNeutral(16);
  const data = lut.image.data as Float32Array;

  for (let index = 0; index < data.length; index += 4) {
    let red = addContrast(data[index]);
    let green = addContrast(data[index + 1]);
    let blue = addContrast(data[index + 2]);
    const luminance = red * 0.2126 + green * 0.7152 + blue * 0.0722;
    const highlight = smoothStep(clampUnit((luminance - 0.42) / 0.58));
    const shadow = 1 - smoothStep(clampUnit(luminance / 0.52));

    red = luminance + (red - luminance) * 1.035;
    green = luminance + (green - luminance) * 1.025;
    blue = luminance + (blue - luminance) * 1.03;

    data[index] = clampUnit(red + highlight * 0.012 - shadow * 0.008);
    data[index + 1] = clampUnit(green + highlight * 0.004);
    data[index + 2] = clampUnit(blue - highlight * 0.014 + shadow * 0.012);
  }

  lut.name = "Signature cinematic neutral";
  lut.needsUpdate = true;
  return lut;
}

function addContrast(value: number) {
  return clampUnit((value - 0.5) * 1.045 + 0.5);
}

function clampUnit(value: number) {
  return Math.max(0, Math.min(1, value));
}
