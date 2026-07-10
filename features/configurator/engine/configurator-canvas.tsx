"use client";

import { Pathtracer, usePathtracer } from "@react-three/gpu-pathtracer";
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
  onCameraInteraction?: () => void;
  pathTracing: boolean;
  state: ConfiguratorState;
  visualization: VisualizationMode;
};

export function ConfiguratorCanvas({
  cameraView,
  captureRef,
  onCameraInteraction,
  pathTracing,
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
        <RenderPipeline
          cameraView={cameraView}
          onCameraInteraction={onCameraInteraction}
          pathTracing={pathTracing}
          state={state}
          visualization={visualization}
        />
        {captureRef ? <CaptureBridge captureRef={captureRef} /> : null}
      </Suspense>
    </Canvas>
  );
}

type RenderPipelineProps = {
  cameraView: CameraView;
  onCameraInteraction?: () => void;
  pathTracing: boolean;
  state: ConfiguratorState;
  visualization: VisualizationMode;
};

function RenderPipeline({
  cameraView,
  onCameraInteraction,
  pathTracing,
  state,
  visualization
}: RenderPipelineProps) {
  const width = useThree((rootState) => rootState.size.width);
  const isCompactViewport = width < 720;

  if (!pathTracing) {
    return (
      <KitchenScene
        cameraView={cameraView}
        pathTracing={false}
        state={state}
        visualization={visualization}
      />
    );
  }

  return (
    <PathTracingPipeline
      cameraView={cameraView}
      compact={isCompactViewport}
      onCameraInteraction={onCameraInteraction}
      state={state}
      visualization={visualization}
    />
  );
}

function PathTracingPipeline({
  cameraView,
  compact,
  onCameraInteraction,
  state,
  visualization
}: Omit<RenderPipelineProps, "pathTracing"> & { compact: boolean }) {
  return (
    <Pathtracer
      bounces={compact ? 3 : 5}
      dynamicLowRes
      fadeDuration={240}
      filteredGlossyFactor={0.45}
      minSamples={2}
      rasterizeScene
      resolutionFactor={compact ? 0.55 : visualization === "apartment" ? 0.78 : 0.9}
      samples={compact ? 24 : visualization === "apartment" ? 48 : 72}
      tiles={compact ? [1, 1] : [2, 1]}
    >
      <KitchenScene
        cameraView={cameraView}
        onCameraInteraction={onCameraInteraction}
        pathTracing
        state={state}
        visualization={visualization}
      />
      <PathTracingSync state={state} visualization={visualization} />
    </Pathtracer>
  );
}

function PathTracingSync({
  state,
  visualization
}: {
  state: ConfiguratorState;
  visualization: VisualizationMode;
}) {
  const { update } = usePathtracer();

  useEffect(() => {
    const frame = window.requestAnimationFrame(update);
    return () => window.cancelAnimationFrame(frame);
  }, [state.cabinetColorKey, state.frontColorKey, update, visualization]);

  return null;
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
