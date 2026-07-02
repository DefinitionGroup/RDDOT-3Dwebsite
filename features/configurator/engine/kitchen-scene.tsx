"use client";

import { CameraControls, ContactShadows, Environment } from "@react-three/drei";
import { useEffect, useMemo, useRef, type ElementRef } from "react";
import {
  ClampToEdgeWrapping,
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
  signature: [4.2, 2.4, 5.6, 0, 0.35, 0],
  front: [0, 1.25, 6.4, 0, 0.4, 0],
  detail: [1.85, 1.35, 2.45, 0.92, 0.28, 0.2]
};

export function KitchenScene({ cameraView, state }: KitchenSceneProps) {
  const controlsRef = useRef<ElementRef<typeof CameraControls> | null>(null);
  const skyTexture = useMemo(() => createSkyGradientTexture(), []);
  const floorTexture = useMemo(() => createTexturedFloorTexture(), []);
  const cabinetColor = findFinish(RDTD_KITCHEN_PRODUCT.cabinetColors, state.cabinetColorKey);
  const frontColor = findFinish(RDTD_KITCHEN_PRODUCT.frontColors, state.frontColorKey);

  useEffect(() => {
    const preset = cameraPresets[cameraView];
    controlsRef.current?.setLookAt(...preset, true);
  }, [cameraView]);

  useEffect(() => {
    return () => {
      skyTexture.dispose();
      floorTexture.dispose();
    };
  }, [floorTexture, skyTexture]);

  return (
    <>
      <primitive attach="background" object={skyTexture} />
      <fog args={["#d6effc", 8, 16]} attach="fog" />
      <ambientLight intensity={0.45} />
      <directionalLight
        castShadow
        intensity={2.4}
        position={[3.8, 5.2, 3.8]}
        shadow-bias={-0.0002}
        shadow-blurSamples={16}
        shadow-mapSize={[2048, 2048]}
        shadow-normalBias={0.025}
        shadow-radius={5}
      />
      <spotLight angle={0.45} intensity={3.2} penumbra={0.7} position={[-3.2, 4.5, 3.4]} />
      <Environment environmentIntensity={0.85} preset="apartment" />

      <group position={[0, -0.7, 0]}>
        <RoomShell floorTexture={floorTexture} skyTexture={skyTexture} />
        <KitchenModel cabinetFinish={cabinetColor} frontFinish={frontColor} />
      </group>

      <ContactShadows
        blur={2.4}
        color="#393531"
        far={5.5}
        opacity={0.22}
        position={[0, -0.72, 0]}
        scale={8}
      />
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

type RoomShellProps = {
  floorTexture: Texture;
  skyTexture: Texture;
};

function RoomShell({ floorTexture, skyTexture }: RoomShellProps) {
  return (
    <group>
      <mesh position={[0, -0.04, 0]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[8.8, 7.2]} />
        <meshStandardMaterial
          bumpMap={floorTexture}
          bumpScale={0.026}
          color="#5d6263"
          map={floorTexture}
          roughness={0.96}
        />
      </mesh>
      <mesh position={[0, 1.8, -2.16]} receiveShadow>
        <boxGeometry args={[8.8, 5.1, 0.05]} />
        <meshStandardMaterial map={skyTexture} roughness={0.96} />
      </mesh>
      <mesh position={[-3.55, 1.8, 0.95]} receiveShadow rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[5, 5.1, 0.05]} />
        <meshStandardMaterial color="#d9eef7" roughness={0.97} />
      </mesh>
      <mesh position={[-2.85, 1.55, -1.48]}>
        <boxGeometry args={[0.08, 2.25, 0.08]} />
        <meshStandardMaterial color="#b8d5df" roughness={0.78} />
      </mesh>
      <mesh position={[-1.8, 1.55, -1.48]}>
        <boxGeometry args={[0.08, 2.25, 0.08]} />
        <meshStandardMaterial color="#b8d5df" roughness={0.78} />
      </mesh>
      <mesh position={[-2.32, 2.68, -1.47]}>
        <boxGeometry args={[1.16, 0.08, 0.08]} />
        <meshStandardMaterial color="#b8d5df" roughness={0.78} />
      </mesh>
    </group>
  );
}

function createSkyGradientTexture() {
  const width = 16;
  const height = 256;
  const data = new Uint8Array(width * height * 4);
  const top = [173, 219, 245];
  const mid = [219, 241, 251];
  const horizon = [248, 253, 255];

  for (let y = 0; y < height; y += 1) {
    const vertical = y / (height - 1);
    const blend = vertical < 0.58 ? vertical / 0.58 : (vertical - 0.58) / 0.42;
    const start = vertical < 0.58 ? horizon : mid;
    const end = vertical < 0.58 ? mid : top;

    for (let x = 0; x < width; x += 1) {
      const horizontal = Math.abs(x / (width - 1) - 0.46);
      const lift = Math.max(0, 1 - horizontal * 2.4) * 8;
      const offset = (y * width + x) * 4;

      data[offset] = clampByte(mix(start[0], end[0], blend) + lift);
      data[offset + 1] = clampByte(mix(start[1], end[1], blend) + lift);
      data[offset + 2] = clampByte(mix(start[2], end[2], blend) + lift);
      data[offset + 3] = 255;
    }
  }

  const texture = new DataTexture(data, width, height, RGBAFormat);
  texture.colorSpace = SRGBColorSpace;
  texture.generateMipmaps = false;
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearFilter;
  texture.needsUpdate = true;
  texture.wrapS = ClampToEdgeWrapping;
  texture.wrapT = ClampToEdgeWrapping;

  return texture;
}

function createTexturedFloorTexture() {
  const size = 256;
  const tile = 64;
  const data = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const offset = (y * size + x) * 4;
      const noise = valueNoise(x, y) * 22 - 11;
      const fineGrain = Math.sin(x * 0.17 + y * 0.04) * 5 + Math.sin((x - y) * 0.09) * 4;
      const seamDistance = Math.min(x % tile, y % tile, tile - (x % tile), tile - (y % tile));
      const seam = seamDistance < 3 ? -48 : seamDistance < 6 ? -18 : 0;
      const base = 96 + noise + fineGrain + seam;

      data[offset] = clampByte(base - 3);
      data[offset + 1] = clampByte(base);
      data[offset + 2] = clampByte(base + 1);
      data[offset + 3] = 255;
    }
  }

  const texture = new DataTexture(data, size, size, RGBAFormat);
  texture.colorSpace = SRGBColorSpace;
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearFilter;
  texture.needsUpdate = true;
  texture.repeat.set(3.2, 2.6);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;

  return texture;
}

function mix(start: number, end: number, amount: number) {
  return Math.round(start + (end - start) * amount);
}

function clampByte(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function valueNoise(x: number, y: number) {
  const value = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;

  return value - Math.floor(value);
}
