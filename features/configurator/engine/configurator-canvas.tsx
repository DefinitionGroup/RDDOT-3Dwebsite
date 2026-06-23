"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import type { CameraView, ConfiguratorState } from "@/features/configurator/types";
import { KitchenScene } from "@/features/configurator/engine/kitchen-scene";

type ConfiguratorCanvasProps = {
  cameraView: CameraView;
  state: ConfiguratorState;
};

export function ConfiguratorCanvas({ cameraView, state }: ConfiguratorCanvasProps) {
  return (
    <Canvas
      camera={{ fov: 38, position: [4.2, 2.4, 5.6] }}
      dpr={[1, 1.7]}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      shadows
    >
      <Suspense fallback={null}>
        <KitchenScene cameraView={cameraView} state={state} />
      </Suspense>
    </Canvas>
  );
}
