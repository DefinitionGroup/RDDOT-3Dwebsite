"use client";

import { CameraControls, ContactShadows, Environment } from "@react-three/drei";
import { useEffect, useRef, type ElementRef } from "react";
import type { CameraView, ConfiguratorState } from "@/features/configurator/types";
import { findFinish, RDTD_KITCHEN_PRODUCT } from "@/features/configurator/product-definition";

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
        <KitchenLine cabinetHex={cabinetColor.hex} frontHex={frontColor.hex} />
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
      <mesh position={[0, 1.8, -1.52]} receiveShadow>
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

function KitchenLine({ cabinetHex, frontHex }: { cabinetHex: string; frontHex: string }) {
  const baseUnits = [-1.5, -0.75, 0, 0.75, 1.5];

  return (
    <group>
      <mesh castShadow position={[0, 0.68, -0.18]}>
        <boxGeometry args={[4.55, 0.08, 1.02]} />
        <meshStandardMaterial color="#c9bfb3" metalness={0.05} roughness={0.38} />
      </mesh>
      <mesh castShadow position={[-2.38, 0.38, -0.22]}>
        <boxGeometry args={[0.74, 1.92, 1.02]} />
        <meshStandardMaterial color={cabinetHex} roughness={0.68} />
      </mesh>
      <mesh castShadow position={[-2.38, 0.38, 0.315]}>
        <boxGeometry args={[0.64, 1.7, 0.045]} />
        <meshStandardMaterial color={frontHex} roughness={0.42} />
      </mesh>
      {baseUnits.map((x, index) => (
        <BaseCabinet cabinetHex={cabinetHex} frontHex={frontHex} index={index} key={x} x={x} />
      ))}
      {[-0.75, 0, 0.75, 1.5].map((x) => (
        <WallCabinet cabinetHex={cabinetHex} frontHex={frontHex} key={x} x={x} />
      ))}
      <mesh position={[0.35, 0.05, 0.36]}>
        <boxGeometry args={[3.85, 0.04, 0.08]} />
        <meshStandardMaterial color="#211f1d" roughness={0.45} />
      </mesh>
      <mesh castShadow position={[2.22, 0.35, -0.12]} rotation={[0, 0, 0.22]}>
        <boxGeometry args={[0.08, 0.96, 0.08]} />
        <meshStandardMaterial color="#ff0004" roughness={0.36} />
      </mesh>
    </group>
  );
}

function BaseCabinet({
  cabinetHex,
  frontHex,
  index,
  x
}: {
  cabinetHex: string;
  frontHex: string;
  index: number;
  x: number;
}) {
  return (
    <group position={[x, 0.28, -0.18]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.68, 0.82, 0.92]} />
        <meshStandardMaterial color={cabinetHex} roughness={0.7} />
      </mesh>
      <mesh castShadow position={[0, 0.02, 0.49]}>
        <boxGeometry args={[0.58, 0.66, 0.045]} />
        <meshStandardMaterial color={frontHex} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.38, 0.52]}>
        <boxGeometry args={[0.38, 0.018, 0.03]} />
        <meshStandardMaterial color={index % 2 ? "#eee7dd" : "#2e2a27"} roughness={0.28} />
      </mesh>
      <mesh position={[0, -0.45, 0.08]}>
        <boxGeometry args={[0.64, 0.07, 0.78]} />
        <meshStandardMaterial color="#22201e" roughness={0.65} />
      </mesh>
    </group>
  );
}

function WallCabinet({
  cabinetHex,
  frontHex,
  x
}: {
  cabinetHex: string;
  frontHex: string;
  x: number;
}) {
  return (
    <group position={[x, 1.5, -0.42]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.68, 0.72, 0.48]} />
        <meshStandardMaterial color={cabinetHex} roughness={0.76} />
      </mesh>
      <mesh castShadow position={[0, 0, 0.265]}>
        <boxGeometry args={[0.57, 0.58, 0.035]} />
        <meshStandardMaterial color={frontHex} roughness={0.42} />
      </mesh>
    </group>
  );
}
