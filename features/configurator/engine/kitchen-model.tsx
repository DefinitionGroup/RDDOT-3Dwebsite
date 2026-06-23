"use client";

import { useGLTF } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import {
  Box3,
  Color,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  Vector3
} from "three";

type KitchenModelProps = {
  cabinetHex: string;
  frontHex: string;
};

type ModelRole = "cabinet" | "front" | "handle" | "neutral";

const KITCHEN_MODEL_PATH = "/models/kitchen-line.glb";
const MODEL_SCALE = 1.18;

export function KitchenModel({ cabinetHex, frontHex }: KitchenModelProps) {
  const gltf = useGLTF(KITCHEN_MODEL_PATH);
  const model = useMemo(() => prepareKitchenModel(gltf.scene), [gltf.scene]);

  useEffect(() => {
    const materials = {
      cabinet: new MeshStandardMaterial({
        color: new Color(cabinetHex),
        roughness: 0.68
      }),
      front: new MeshStandardMaterial({
        color: new Color(frontHex),
        roughness: 0.42
      }),
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
  }, [cabinetHex, frontHex, model.scene]);

  return (
    <group scale={MODEL_SCALE}>
      <primitive object={model.scene} position={model.offset} />
    </group>
  );
}

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
  });

  return {
    scene,
    offset: [-center.x, -bounds.min.y, -center.z] as [number, number, number]
  };
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

