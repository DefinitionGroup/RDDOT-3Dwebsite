"use client";

import { CameraControls, ContactShadows, Environment } from "@react-three/drei";
import { EffectComposer, N8AO, ToneMapping } from "@react-three/postprocessing";
import { useThree } from "@react-three/fiber";
import { ToneMappingMode } from "postprocessing";
import { useEffect, useMemo, useRef, type ElementRef } from "react";
import {
  DataTexture,
  LinearFilter,
  RepeatWrapping,
  RGBAFormat,
  SRGBColorSpace,
  type Texture
} from "three";
import type { CameraView, ConfiguratorState } from "@/features/configurator/types";
import { findFinish, RDTD_KITCHEN_PRODUCT } from "@/features/configurator/product-definition";
import { KitchenModel } from "@/features/configurator/engine/kitchen-model";

type KitchenSceneProps = {
  cameraView: CameraView;
  state: ConfiguratorState;
};

const cameraPresets: Record<CameraView, [number, number, number, number, number, number]> = {
  signature: [5.05, 2.75, 6.25, 0, 0.45, -0.08],
  front: [0, 1.55, 6.05, 0, 0.48, 0],
  detail: [2.05, 1.45, 3.05, 0.82, 0.38, 0.08]
};

const mobileCameraPresets: Record<CameraView, [number, number, number, number, number, number]> = {
  signature: [5.6, 2.55, 7.05, 0, -0.22, -0.12],
  front: [0, 1.45, 6.8, 0, 0.05, 0],
  detail: [2.7, 1.45, 3.85, 0.75, 0.02, 0.04]
};

export function KitchenScene({ cameraView, state }: KitchenSceneProps) {
  const controlsRef = useRef<ElementRef<typeof CameraControls> | null>(null);
  const width = useThree((rootState) => rootState.size.width);
  const floorTexture = useMemo(() => createTexturedFloorTexture(), []);
  const cabinetColor = findFinish(RDTD_KITCHEN_PRODUCT.cabinetColors, state.cabinetColorKey);
  const frontColor = findFinish(RDTD_KITCHEN_PRODUCT.frontColors, state.frontColorKey);
  const isCompactViewport = width < 720;

  useEffect(() => {
    const preset = isCompactViewport ? mobileCameraPresets[cameraView] : cameraPresets[cameraView];
    controlsRef.current?.setLookAt(...preset, true);
  }, [cameraView, isCompactViewport]);

  useEffect(() => {
    return () => {
      floorTexture.dispose();
    };
  }, [floorTexture]);

  return (
    <>
      <fog args={["#d7e8e9", 8.5, 19]} attach="fog" />
      <hemisphereLight args={["#f6fbff", "#857a6e", 1.05]} />
      <ambientLight intensity={0.2} />
      <directionalLight
        castShadow
        intensity={2.55}
        position={[4.8, 6.2, 3.9]}
        shadow-bias={-0.0002}
        shadow-blurSamples={16}
        shadow-mapSize={[3072, 3072]}
        shadow-normalBias={0.025}
        shadow-radius={6}
      />
      <spotLight
        angle={0.48}
        color="#fff1dd"
        intensity={3.15}
        penumbra={0.78}
        position={[-3.6, 4.7, 3.8]}
      />
      <pointLight color="#bfe6ff" intensity={0.75} position={[3.6, 2.4, -3.8]} />
      {/* Test mode: use the HDRI as both the visible background and the
          environment source for lighting/reflections. */}
      <Environment
        background
        backgroundIntensity={0.82}
        environmentIntensity={0.78}
        files="/hdri/qwantani_dusk_2_puresky_2k.hdr"
      />

      <group position={[0, -0.7, 0]}>
        <AtmosphericStage floorTexture={floorTexture} />
        <KitchenModel cabinetFinish={cabinetColor} frontFinish={frontColor} />
      </group>

      <ContactShadows
        blur={2.4}
        color="#393531"
        far={5.5}
        opacity={0.3}
        position={[0, -0.72, 0]}
        scale={9}
      />
      <EffectComposer>
        <N8AO aoRadius={0.55} distanceFalloff={0.72} intensity={2.45} />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      </EffectComposer>
      <CameraControls
        dollySpeed={0.65}
        maxDistance={8.4}
        maxPolarAngle={Math.PI / 2.08}
        minDistance={2.2}
        minPolarAngle={Math.PI / 8}
        ref={controlsRef}
        smoothTime={0.85}
        truckSpeed={0.42}
      />
    </>
  );
}

type AtmosphericStageProps = {
  floorTexture: Texture;
};

function AtmosphericStage({ floorTexture }: AtmosphericStageProps) {
  return (
    <group>
      <mesh position={[0, -0.04, 0]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[16, 12]} />
        <meshStandardMaterial
          bumpMap={floorTexture}
          bumpScale={0.018}
          color="#756f65"
          map={floorTexture}
          metalness={0.02}
          roughness={0.88}
        />
      </mesh>
      <mesh position={[0, -0.02, -3.9]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[4.8, 96]} />
        <meshBasicMaterial color="#f3f1e8" opacity={0.16} transparent />
      </mesh>
    </group>
  );
}

function createTexturedFloorTexture() {
  const size = 256;
  const tile = 64;
  const data = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const offset = (y * size + x) * 4;
      const noise = valueNoise(x, y) * 14 - 7;
      const fineGrain = Math.sin(x * 0.13 + y * 0.035) * 3 + Math.sin((x - y) * 0.07) * 2;
      const seamDistance = Math.min(x % tile, y % tile, tile - (x % tile), tile - (y % tile));
      const seam = seamDistance < 2 ? -22 : seamDistance < 5 ? -9 : 0;
      const base = 112 + noise + fineGrain + seam;

      data[offset] = clampByte(base + 5);
      data[offset + 1] = clampByte(base + 1);
      data[offset + 2] = clampByte(base - 4);
      data[offset + 3] = 255;
    }
  }

  const texture = new DataTexture(data, size, size, RGBAFormat);
  texture.colorSpace = SRGBColorSpace;
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearFilter;
  texture.needsUpdate = true;
  texture.repeat.set(4.1, 3.2);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;

  return texture;
}

function clampByte(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function valueNoise(x: number, y: number) {
  const value = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;

  return value - Math.floor(value);
}
