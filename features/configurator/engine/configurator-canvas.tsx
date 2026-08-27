"use client";

import { Pathtracer, usePathtracer } from "@react-three/gpu-pathtracer";
import { Canvas, useThree } from "@react-three/fiber";
import { Suspense, useEffect } from "react";
import type { WebGLPathTracer } from "three-gpu-pathtracer";
import type {
  CameraView,
  ConfiguratorState,
  VisualizationMode
} from "@/features/configurator/types";
import type { SceneCaptureRef } from "@/features/configurator/photo/use-scene-capture";
import type { KitchenEditProps } from "@/features/configurator/engine/kitchen-model";
import { KitchenScene } from "@/features/configurator/engine/kitchen-scene";

type ConfiguratorCanvasProps = {
  cameraView: CameraView;
  captureRef?: SceneCaptureRef;
  edit?: KitchenEditProps;
  onCameraInteraction?: () => void;
  pathTracing: boolean;
  state: ConfiguratorState;
  visualization: VisualizationMode;
};

type ConfigurablePathTracer = WebGLPathTracer & {
  _generator: {
    bvhOptions: {
      maxLeafTris?: number;
      strategy?: number;
    };
  };
};

// three-mesh-bvh CENTER strategy. The path tracer defaults to an expensive
// SAH build with one triangle per leaf, which stalls the main thread on this
// prototype's many small cabinet meshes.
const BVH_CENTER_STRATEGY = 0;

function configurePathTracer(pathTracer: WebGLPathTracer | null) {
  if (!pathTracer) {
    return;
  }

  const generator = (pathTracer as ConfigurablePathTracer)._generator;
  generator.bvhOptions = {
    ...generator.bvhOptions,
    maxLeafTris: 8,
    strategy: BVH_CENTER_STRATEGY
  };
}

export function ConfiguratorCanvas({
  cameraView,
  captureRef,
  edit,
  onCameraInteraction,
  pathTracing,
  state,
  visualization
}: ConfiguratorCanvasProps) {
  return (
    <Canvas
      camera={{ far: 50, fov: 38, near: 0.08, position: [4.2, 2.4, 5.6] }}
      dpr={pathTracing ? [1, 1.35] : [1, 2]}
      gl={{
        alpha: false,
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
          edit={edit}
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
  edit?: KitchenEditProps;
  onCameraInteraction?: () => void;
  pathTracing: boolean;
  state: ConfiguratorState;
  visualization: VisualizationMode;
};

function RenderPipeline({
  cameraView,
  edit,
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
        edit={edit}
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
      bounces={compact ? 4 : visualization === "apartment" ? 4 : 5}
      dynamicLowRes
      fadeDuration={320}
      filteredGlossyFactor={0.32}
      minSamples={2}
      rasterizeScene
      ref={configurePathTracer}
      resolutionFactor={compact ? 0.68 : visualization === "apartment" ? 0.62 : 0.82}
      samples={compact ? 32 : visualization === "apartment" ? 40 : 72}
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
  }, [
    state.cabinetColorKey,
    state.frontColorKey,
    state.islandSize,
    state.wallModules,
    update,
    visualization
  ]);

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
