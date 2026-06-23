"use client";

import { CameraControls, ContactShadows, Environment } from "@react-three/drei";
import { useEffect, useRef, type ElementRef } from "react";
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
  const cabinetColor = findFinish(RDTD_KITCHEN_PRODUCT.cabinetColors, state.cabinetColorKey);
  const frontColor = findFinish(RDTD_KITCHEN_PRODUCT.frontColors, state.frontColorKey);

  useEffect(() => {
    const preset = cameraPresets[cameraView];
    controlsRef.current?.setLookAt(...preset, true);
  }, [cameraView]);

  return (
    <>
      <color args={["#f2eee8"]} attach="background" />
      <fog args={["#f2eee8", 7, 15]} attach="fog" />
      <ambientLight intensity={1.6} />
      <directionalLight
        castShadow
        intensity={3.2}
        position={[3.8, 5.2, 3.8]}
        shadow-mapSize={[2048, 2048]}
      />
      <spotLight angle={0.45} intensity={8} penumbra={0.7} position={[-3.2, 4.5, 3.4]} />
      <Environment preset="apartment" />

      <group position={[0, -0.7, 0]}>
        <RoomShell />
        <KitchenModel cabinetHex={cabinetColor.hex} frontHex={frontColor.hex} />
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

function RoomShell() {
  return (
    <group>
      <mesh position={[0, -0.04, 0]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[8.8, 7.2]} />
        <meshStandardMaterial color="#ded7ce" roughness={0.82} />
      </mesh>
      <mesh position={[0, 1.8, -2.16]} receiveShadow>
        <boxGeometry args={[8.8, 5.1, 0.05]} />
        <meshStandardMaterial color="#f5f1ea" roughness={0.94} />
      </mesh>
      <mesh position={[-3.55, 1.8, 0.95]} receiveShadow rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[5, 5.1, 0.05]} />
        <meshStandardMaterial color="#ebe4db" roughness={0.96} />
      </mesh>
      <mesh position={[-2.85, 1.55, -1.48]}>
        <boxGeometry args={[0.08, 2.25, 0.08]} />
        <meshStandardMaterial color="#d7cfc5" roughness={0.72} />
      </mesh>
      <mesh position={[-1.8, 1.55, -1.48]}>
        <boxGeometry args={[0.08, 2.25, 0.08]} />
        <meshStandardMaterial color="#d7cfc5" roughness={0.72} />
      </mesh>
      <mesh position={[-2.32, 2.68, -1.47]}>
        <boxGeometry args={[1.16, 0.08, 0.08]} />
        <meshStandardMaterial color="#d7cfc5" roughness={0.72} />
      </mesh>
    </group>
  );
}
