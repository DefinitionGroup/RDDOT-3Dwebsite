"use client";

import { useGLTF, useTexture } from "@react-three/drei";
import { useEffect, useLayoutEffect, useMemo } from "react";
import {
  Box3,
  BufferAttribute,
  Color,
  DataTexture,
  Group,
  LinearFilter,
  Mesh,
  MeshPhysicalMaterial,
  Object3D,
  RGBAFormat,
  RepeatWrapping,
  SRGBColorSpace,
  Vector2,
  Vector3,
  type BufferGeometry,
  type Texture
} from "three";
import {
  getContinuousManifest,
  getDefaultModuleLayout
} from "@/features/configurator/modules/kitchen-modules";
import { RDTD_KITCHEN_PRODUCT } from "@/features/configurator/product-definition";
import type { FinishOption } from "@/features/configurator/types";

type KitchenModelProps = {
  cabinetFinish: FinishOption;
  environmentMap?: Texture;
  frontFinish: FinishOption;
};

const KITCHEN_MODEL_PATH = "/models/kitchen-modules.glb";
const MODEL_SCALE = 1.18;

const ALL_FINISHES = [
  ...RDTD_KITCHEN_PRODUCT.cabinetColors,
  ...RDTD_KITCHEN_PRODUCT.frontColors
];

// Albedo maps are sRGB photos; normal/roughness maps stay linear.
const SRGB_TEXTURE_URLS = new Set(
  ALL_FINISHES.flatMap((finish) => (finish.textureUrl ? [finish.textureUrl] : []))
);

const FINISH_TEXTURE_URLS = [
  ...new Set(
    ALL_FINISHES.flatMap((finish) =>
      [finish.textureUrl, finish.normalMapUrl, finish.roughnessMapUrl].filter(
        (url): url is string => Boolean(url)
      )
    )
  )
];

export function KitchenModel({
  cabinetFinish,
  environmentMap,
  frontFinish
}: KitchenModelProps) {
  const gltf = useGLTF(KITCHEN_MODEL_PATH);
  const finishTextures = useTexture(FINISH_TEXTURE_URLS);
  const microSurfaceTexture = useMemo(() => createMicroSurfaceTexture(), []);

  const texturesByUrl = useMemo(() => {
    const entries = FINISH_TEXTURE_URLS.map((url, index) => {
      const texture = finishTextures[index].clone();
      if (SRGB_TEXTURE_URLS.has(url)) {
        texture.colorSpace = SRGBColorSpace;
      }
      texture.wrapS = RepeatWrapping;
      texture.wrapT = RepeatWrapping;
      texture.anisotropy = 8;
      texture.needsUpdate = true;
      return [url, texture] as const;
    });

    return new Map<string, Texture>(entries);
  }, [finishTextures]);

  useEffect(() => {
    return () => {
      texturesByUrl.forEach((texture) => texture.dispose());
      microSurfaceTexture.dispose();
    };
  }, [microSurfaceTexture, texturesByUrl]);

  const model = useMemo(() => {
    const preparedModel = prepareKitchenModel(gltf.scene);
    const materials = {
      cabinet: createFinishMaterial(
        cabinetFinish,
        texturesByUrl,
        "cabinet",
        environmentMap,
        microSurfaceTexture
      ),
      front: createFinishMaterial(
        frontFinish,
        texturesByUrl,
        "front",
        environmentMap,
        microSurfaceTexture
      ),
      handle: new MeshPhysicalMaterial({
        color: "#171614",
        envMap: environmentMap ?? null,
        envMapIntensity: 1.2,
        metalness: 0.92,
        roughness: 0.23
      }),
      countertop: new MeshPhysicalMaterial({
        bumpMap: microSurfaceTexture,
        bumpScale: 0.0018,
        clearcoat: 0.16,
        clearcoatRoughness: 0.32,
        color: "#b8b3aa",
        envMap: environmentMap ?? null,
        envMapIntensity: 1.05,
        metalness: 0,
        roughness: 0.36,
        specularIntensity: 0.72
      }),
      plinth: new MeshPhysicalMaterial({
        color: "#24221f",
        envMap: environmentMap ?? null,
        envMapIntensity: 0.9,
        metalness: 0.22,
        roughness: 0.34
      }),
      backdrop: new MeshPhysicalMaterial({
        bumpMap: microSurfaceTexture,
        bumpScale: 0.0012,
        color: "#8f918c",
        envMap: environmentMap ?? null,
        envMapIntensity: 0.48,
        metalness: 0,
        roughness: 0.78
      })
    } satisfies Record<ModelRole, MeshPhysicalMaterial>;

    preparedModel.scene.traverse((object) => {
      if (!(object instanceof Mesh)) {
        return;
      }

      const role = getModelRole(object);
      object.material = materials[role];
      object.castShadow = role !== "backdrop";
      object.receiveShadow = true;
    });

    return { ...preparedModel, materials };
  }, [
    cabinetFinish,
    environmentMap,
    frontFinish,
    gltf.scene,
    microSurfaceTexture,
    texturesByUrl
  ]);

  useLayoutEffect(() => {
    return () => {
      Object.values(model.materials).forEach((material) => material.dispose());
      model.ownedGeometries.forEach((geometry) => geometry.dispose());
    };
  }, [model]);

  return (
    <group scale={MODEL_SCALE}>
      <primitive object={model.scene} position={model.offset} />
    </group>
  );
}

function createFinishMaterial(
  finish: FinishOption,
  texturesByUrl: Map<string, Texture>,
  surface: "cabinet" | "front",
  environmentMap: Texture | undefined,
  microSurfaceTexture: Texture
) {
  const map = finish.textureUrl ? texturesByUrl.get(finish.textureUrl) ?? null : null;
  const normalMap = finish.normalMapUrl
    ? texturesByUrl.get(finish.normalMapUrl) ?? null
    : null;
  const roughnessMap = finish.roughnessMapUrl
    ? texturesByUrl.get(finish.roughnessMapUrl) ?? null
    : null;
  const profile = getFinishProfile(finish, surface, Boolean(map));

  const color = map
    ? new Color("#ffffff")
    : new Color(finish.hex).multiplyScalar(profile.colorScale);

  return new MeshPhysicalMaterial({
    bumpMap: normalMap ? null : microSurfaceTexture,
    bumpScale: normalMap ? 0 : profile.bumpScale,
    clearcoat: profile.clearcoat,
    clearcoatRoughness: profile.clearcoatRoughness,
    color,
    envMap: environmentMap ?? null,
    envMapIntensity: profile.envMapIntensity,
    ior: 1.46,
    map,
    normalMap,
    normalScale: new Vector2(profile.normalScale, profile.normalScale),
    // With a roughness map the texel value carries the finish; without it the
    // scalar does.
    roughness: roughnessMap ? 0.68 : profile.roughness,
    roughnessMap,
    specularIntensity: profile.specularIntensity
  });
}

function getFinishProfile(
  finish: FinishOption,
  surface: "cabinet" | "front",
  hasColorMap: boolean
) {
  if (finish.material === "structured") {
    return {
      clearcoat: 0.28,
      clearcoatRoughness: 0.38,
      colorScale: 0.88,
      envMapIntensity: 0.92,
      normalScale: 0.32,
      roughness: 0.48,
      specularIntensity: 0.7,
      bumpScale: 0.0028
    };
  }

  if (finish.material === "satin") {
    return {
      clearcoat: 0.38,
      clearcoatRoughness: 0.24,
      colorScale: 0.84,
      envMapIntensity: 1.15,
      normalScale: 0.2,
      roughness: surface === "front" ? 0.26 : 0.31,
      specularIntensity: 0.82,
      bumpScale: 0.0014
    };
  }

  return {
    clearcoat: 0.08,
    clearcoatRoughness: 0.42,
    colorScale: hasColorMap ? 0.92 : 0.86,
    envMapIntensity: 0.88,
    normalScale: 0.22,
    roughness: hasColorMap ? 0.52 : 0.48,
    specularIntensity: 0.62,
    bumpScale: 0.002
  };
}

type ModelRole =
  | "backdrop"
  | "cabinet"
  | "countertop"
  | "front"
  | "handle"
  | "plinth";

function prepareKitchenModel(sourceScene: Object3D) {
  const prefabs = new Map<string, Object3D>();
  for (const child of sourceScene.children) {
    prefabs.set(child.name, child);
  }

  // Compose the kitchen from module prefabs. Each prefab root carries the
  // module's X offset; placements re-position it, so slice S4 can rearrange
  // modules by changing the layout alone.
  const scene = new Group();
  for (const placement of getDefaultModuleLayout()) {
    const prefab = prefabs.get(placement.prefab);
    if (!prefab) {
      throw new Error(`Kitchen module prefab missing: ${placement.prefab}`);
    }
    const instance = prefab.clone(true);
    instance.position.x = placement.x;
    scene.add(instance);
  }
  for (const continuous of getContinuousManifest()) {
    const prefab = prefabs.get(continuous.prefab);
    if (!prefab) {
      throw new Error(`Kitchen continuous prefab missing: ${continuous.prefab}`);
    }
    scene.add(prefab.clone(true));
  }
  scene.updateMatrixWorld(true);

  const ownedGeometries: BufferGeometry[] = [];
  const bounds = new Box3().setFromObject(scene);
  const center = new Vector3();
  bounds.getCenter(center);

  scene.traverse((object) => {
    if (!(object instanceof Mesh)) {
      return;
    }

    // Object3D.clone() keeps geometry references shared with the useGLTF cache.
    // The path tracer adds and merges attributes while building its static scene,
    // so each render pipeline needs an isolated geometry instance.
    object.geometry = object.geometry.clone();
    ownedGeometries.push(object.geometry);
    object.userData.configuratorRole = getBakedRole(object) ?? classifyMesh(object);
    ensurePlanarUVs(object.geometry);
    normalizeMaterialGroups(object.geometry);
  });

  return {
    ownedGeometries,
    scene,
    offset: [-center.x, -bounds.min.y, -center.z] as [number, number, number]
  };
}

/** Roles are baked into mesh names by the segmentation step: `<role>__<name>`. */
function getBakedRole(mesh: Mesh): ModelRole | null {
  const separator = mesh.name.indexOf("__");
  if (separator <= 0) {
    return null;
  }
  const prefix = mesh.name.slice(0, separator);
  return isModelRole(prefix) ? prefix : null;
}

function normalizeMaterialGroups(geometry: BufferGeometry) {
  const indexCount = geometry.index?.count;
  const vertexCount = geometry.getAttribute("position")?.count;
  const drawCount = indexCount ?? vertexCount;

  if (!drawCount) {
    return;
  }

  geometry.clearGroups();
  geometry.addGroup(0, drawCount, 0);
}

/**
 * The source GLB ships without texture coordinates, so finish textures would
 * sample a single texel. Projects each mesh onto its two largest local axes,
 * mapping the full 0..1 texture across every panel face.
 */
function ensurePlanarUVs(geometry: BufferGeometry) {
  if (geometry.getAttribute("uv")) {
    return;
  }

  geometry.computeBoundingBox();
  const bounds = geometry.boundingBox;
  const position = geometry.getAttribute("position");

  if (!bounds || !position) {
    return;
  }

  const min = [bounds.min.x, bounds.min.y, bounds.min.z];
  const size = [
    bounds.max.x - bounds.min.x,
    bounds.max.y - bounds.min.y,
    bounds.max.z - bounds.min.z
  ];
  const normalAxis = size.indexOf(Math.min(...size));
  const remaining = [0, 1, 2].filter((axis) => axis !== normalAxis);
  const vAxis = remaining.includes(1) ? 1 : remaining[1];
  const uAxis = remaining.find((axis) => axis !== vAxis) ?? remaining[0];

  const uv = new Float32Array(position.count * 2);

  for (let index = 0; index < position.count; index += 1) {
    const point = [position.getX(index), position.getY(index), position.getZ(index)];
    uv[index * 2] = (point[uAxis] - min[uAxis]) / (size[uAxis] || 1);
    uv[index * 2 + 1] = (point[vAxis] - min[vAxis]) / (size[vAxis] || 1);
  }

  geometry.setAttribute("uv", new BufferAttribute(uv, 2));
}

function getModelRole(mesh: Mesh): ModelRole {
  const role = mesh.userData.configuratorRole;
  return isModelRole(role) ? role : "cabinet";
}

function isModelRole(role: unknown): role is ModelRole {
  return (
    role === "backdrop" ||
    role === "cabinet" ||
    role === "countertop" ||
    role === "front" ||
    role === "handle" ||
    role === "plinth"
  );
}

function classifyMesh(mesh: Mesh): ModelRole {
  const bounds = new Box3().setFromObject(mesh);
  const size = new Vector3();
  const center = new Vector3();
  bounds.getSize(size);
  bounds.getCenter(center);

  const name = mesh.name.toLowerCase();
  const isLine = name.startsWith("line");
  const isLargeBackPlane =
    name === "plane559" || (size.z <= 0.025 && size.x >= 2.8 && size.y >= 1.8);
  const isCountertop =
    size.y <= 0.12 &&
    center.y >= 0.82 &&
    center.y <= 1.08 &&
    (size.x >= 1.2 || (size.x >= 0.54 && size.z >= 0.45));
  const isPlinth =
    size.y <= 0.16 && center.y <= 0.2 && (size.x >= 1.2 || size.z >= 0.7);
  const isDoorLikePanel =
    size.z <= 0.04 &&
    size.x >= 0.12 &&
    size.x <= 1.2 &&
    size.y >= 0.25 &&
    center.y >= 0.25;

  if (isLine) {
    return "handle";
  }

  if (isLargeBackPlane) {
    return "backdrop";
  }

  if (isCountertop || name.startsWith("plane")) {
    return "countertop";
  }

  if (isPlinth) {
    return "plinth";
  }

  if (isDoorLikePanel) {
    return "front";
  }

  return "cabinet";
}

function createMicroSurfaceTexture() {
  const size = 128;
  const data = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const offset = (y * size + x) * 4;
      const grain = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
      const value = 118 + (grain - Math.floor(grain)) * 20;

      data[offset] = value;
      data[offset + 1] = value;
      data[offset + 2] = value;
      data[offset + 3] = 255;
    }
  }

  const texture = new DataTexture(data, size, size, RGBAFormat);
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearFilter;
  texture.repeat.set(14, 14);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.needsUpdate = true;
  return texture;
}

useGLTF.preload(KITCHEN_MODEL_PATH);
FINISH_TEXTURE_URLS.forEach((url) => useTexture.preload(url));
