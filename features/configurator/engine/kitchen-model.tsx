"use client";

import { useGLTF, useTexture } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import {
  Box3,
  BufferAttribute,
  Color,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  RepeatWrapping,
  SRGBColorSpace,
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

const FINISH_TEXTURE_URLS = [
  ...new Set(
    [...RDTD_KITCHEN_PRODUCT.cabinetColors, ...RDTD_KITCHEN_PRODUCT.frontColors].flatMap(
      (finish) => (finish.textureUrl ? [finish.textureUrl] : [])
    )
  )
];

export function KitchenModel({ cabinetFinish, frontFinish }: KitchenModelProps) {
  const gltf = useGLTF(KITCHEN_MODEL_PATH);
  const model = useMemo(() => prepareKitchenModel(gltf.scene), [gltf.scene]);
  const finishTextures = useTexture(FINISH_TEXTURE_URLS);

  const texturesByUrl = useMemo(() => {
    const entries = FINISH_TEXTURE_URLS.map((url, index) => {
      const texture = finishTextures[index];
      texture.colorSpace = SRGBColorSpace;
      texture.wrapS = RepeatWrapping;
      texture.wrapT = RepeatWrapping;
      texture.anisotropy = 8;
      texture.needsUpdate = true;
      return [url, texture] as const;
    });

    return new Map<string, Texture>(entries);
  }, [finishTextures]);

  useEffect(() => {
    const materials = {
      cabinet: createFinishMaterial(cabinetFinish, texturesByUrl, 0.68),
      front: createFinishMaterial(frontFinish, texturesByUrl, 0.42),
      handle: new MeshStandardMaterial({
        color: "#26231f",
        metalness: 0.12,
        roughness: 0.34
      }),
      neutral: new MeshStandardMaterial({
        color: "#d8d0c6",
        roughness: 0.62
      })
    } satisfies Record<ModelRole, MeshStandardMaterial>;

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
  roughness: number
) {
  const texture = finish.textureUrl ? texturesByUrl.get(finish.textureUrl) ?? null : null;

  return new MeshStandardMaterial({
    color: new Color(texture ? "#ffffff" : finish.hex),
    map: texture,
    roughness: finish.material === "structured" ? Math.max(roughness, 0.58) : roughness
  });
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
