"use client";

import { Canvas, useThree } from "@react-three/fiber";
import { Suspense, useEffect } from "react";
import type {
  CameraView,
  ConfiguratorState,
  VisualizationMode
} from "@/features/configurator/types";
import type { SceneCaptureRef } from "@/features/configurator/photo/use-scene-capture";
import { KitchenScene } from "@/features/configurator/engine/kitchen-scene";

type ConfiguratorCanvasProps = {
  cameraView: CameraView;
  captureRef?: SceneCaptureRef;
  state: ConfiguratorState;
  visualization: VisualizationMode;
};

export function ConfiguratorCanvas({
  cameraView,
  captureRef,
  state,
  visualization
}: ConfiguratorCanvasProps) {
  return (
    <Canvas
      camera={{ fov: 38, position: [4.2, 2.4, 5.6] }}
      dpr={[1, 2]}
      gl={{
        antialias: true,
        powerPreference: "high-performance",
        // Keeps the composited frame readable for the photo capture.
        preserveDrawingBuffer: true
      }}
      shadows="variance"
    >
      <Suspense fallback={null}>
        <KitchenScene cameraView={cameraView} state={state} visualization={visualization} />
        {captureRef ? <CaptureBridge captureRef={captureRef} /> : null}
      </Suspense>
    </Canvas>
  );
}

function CaptureBridge({ captureRef }: { captureRef: SceneCaptureRef }) {
  const gl = useThree((rootState) => rootState.gl);

  useEffect(() => {
    captureRef.current = () => gl.domElement;
    return () => {
      captureRef.current = null;
    };
  }, [captureRef, gl]);

  return null;
}
