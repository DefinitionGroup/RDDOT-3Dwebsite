"use client";

import { useGLTF, useTexture } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import {
  Box3,
  BufferAttribute,
  Color,
  Mesh,
  MeshPhysicalMaterial,
  Object3D,
  RepeatWrapping,
  SRGBColorSpace,
  Vector2,
  Vector3,
  type BufferGeometry,
  type Texture
} from "three";
import { RDTD_KITCHEN_PRODUCT } from "@/features/configurator/product-definition";
import type { FinishOption } from "@/features/configurator/types";

type KitchenModelProps = {
  cabinetFinish: FinishOption;
  frontFinish: FinishOption;
};

const KITCHEN_MODEL_PATH = "/models/kitchen-line.glb";
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

export function KitchenModel({ cabinetFinish, frontFinish }: KitchenModelProps) {
  const gltf = useGLTF(KITCHEN_MODEL_PATH);
  const model = useMemo(() => prepareKitchenModel(gltf.scene), [gltf.scene]);
  const finishTextures = useTexture(FINISH_TEXTURE_URLS);

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
    };
  }, [texturesByUrl]);

  useEffect(() => {
    const materials = {
      cabinet: createFinishMaterial(cabinetFinish, texturesByUrl, "cabinet"),
      front: createFinishMaterial(frontFinish, texturesByUrl, "front"),
      handle: new MeshPhysicalMaterial({
        color: "#26231f",
        envMapIntensity: 1.75,
        metalness: 0.78,
        roughness: 0.15
      }),
      neutral: new MeshPhysicalMaterial({
        clearcoat: 0.92,
        clearcoatRoughness: 0.06,
        color: "#c9c3ba",
        envMapIntensity: 1.8,
        roughness: 0.13
      })
    } satisfies Record<ModelRole, MeshPhysicalMaterial>;

    model.scene.traverse((object) => {
      if (!(object instanceof Mesh)) {
        return;
      }

      const role = getModelRole(object);
      object.material = materials[role];
      object.castShadow = role !== "neutral";
      object.receiveShadow = true;
    });

    return () => {
      Object.values(materials).forEach((material) => material.dispose());
    };
  }, [cabinetFinish, frontFinish, model.scene, texturesByUrl]);

  return (
    <group scale={MODEL_SCALE}>
      <primitive object={model.scene} position={model.offset} />
    </group>
  );
}

function createFinishMaterial(
  finish: FinishOption,
  texturesByUrl: Map<string, Texture>,
  surface: "cabinet" | "front"
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
    clearcoat: profile.clearcoat,
    clearcoatRoughness: profile.clearcoatRoughness,
    color,
    envMapIntensity: profile.envMapIntensity,
    ior: 1.46,
    map,
    normalMap,
    normalScale: new Vector2(profile.normalScale, profile.normalScale),
    // With a roughness map the texel value carries the finish; without it the
    // scalar does.
    roughness: roughnessMap ? 0.76 : profile.roughness,
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
      clearcoatRoughness: 0.3,
      colorScale: 0.94,
      envMapIntensity: 1.2,
      normalScale: 0.38,
      roughness: 0.48,
      specularIntensity: 0.8
    };
  }

  if (finish.material === "satin") {
    return {
      clearcoat: 0.96,
      clearcoatRoughness: 0.05,
      colorScale: 0.82,
      envMapIntensity: 1.85,
      normalScale: 0.24,
      roughness: surface === "front" ? 0.11 : 0.16,
      specularIntensity: 1
    };
  }

  return {
    clearcoat: hasColorMap ? 0.56 : 0.58,
    clearcoatRoughness: hasColorMap ? 0.15 : 0.17,
    colorScale: hasColorMap ? 1 : 0.9,
    envMapIntensity: hasColorMap ? 1.6 : 1.65,
    normalScale: 0.28,
    roughness: hasColorMap ? 0.3 : 0.28,
    specularIntensity: 0.95
  };
}

type ModelRole = "cabinet" | "front" | "handle" | "neutral";

function prepareKitchenModel(sourceScene: Object3D) {
  const scene = sourceScene.clone(true);
  const bounds = new Box3().setFromObject(scene);
  const center = new Vector3();
  bounds.getCenter(center);

  scene.traverse((object) => {
    if (!(object instanceof Mesh)) {
      return;
    }

    object.userData.configuratorRole = classifyMesh(object);
    ensurePlanarUVs(object.geometry);
  });

  return {
    scene,
    offset: [-center.x, -bounds.min.y, -center.z] as [number, number, number]
  };
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
  return role === "cabinet" || role === "front" || role === "handle" || role === "neutral";
}

function classifyMesh(mesh: Mesh): ModelRole {
  const bounds = new Box3().setFromObject(mesh);
  const size = new Vector3();
  const center = new Vector3();
  bounds.getSize(size);
  bounds.getCenter(center);

  const name = mesh.name.toLowerCase();
  const isLine = name.startsWith("line");
  const isPlane = name.startsWith("plane");
  const isFlatCounterOrPlinth = size.y <= 0.16 && size.x >= 1.2;
  const isLargeBackPlane = size.z <= 0.025 && size.x >= 2.8 && size.y >= 1.8;
  const isDoorLikePanel =
    size.z <= 0.04 &&
    size.x >= 0.12 &&
    size.x <= 1.2 &&
    size.y >= 0.25 &&
    center.y >= 0.25;

  if (isLine) {
    return "handle";
  }

  if (isPlane || isFlatCounterOrPlinth || isLargeBackPlane) {
    return "neutral";
  }

  if (isDoorLikePanel) {
    return "front";
  }

  return "cabinet";
}

useGLTF.preload(KITCHEN_MODEL_PATH);
FINISH_TEXTURE_URLS.forEach((url) => useTexture.preload(url));
