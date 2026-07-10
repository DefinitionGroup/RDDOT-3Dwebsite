"use client";

import { CubeCamera, useGLTF } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import {
  Mesh,
  MeshStandardMaterial,
  RepeatWrapping,
  type Object3D,
  type Texture
} from "three";
import { KitchenModel } from "@/features/configurator/engine/kitchen-model";
import type { FinishOption } from "@/features/configurator/types";

type ApartmentModelProps = {
  cabinetFinish: FinishOption;
  frontFinish: FinishOption;
  reflectionProbe?: boolean;
  reflectionResolution?: number;
};

const APARTMENT_MODEL_PATH = "/kitchen1.glb";
const APARTMENT_ORIGIN: [number, number, number] = [6.94, -0.595, 2.216];
const REPLACEMENT_KITCHEN_POSITION: [number, number, number] = [-6.94, 0.595, -2.216];
const REPLACEMENT_KITCHEN_ROTATION: [number, number, number] = [0, Math.PI / 2, 0];
const REFLECTION_PROBE_Y = 1.25;
const CONCRETE_WALL_OBJECTS = new Set(["Walls"].map(normalizeObjectName));
const REMOVED_APARTMENT_OBJECTS = new Set(
  [
    "Modern Kitchen.001",
    "Modern Kitchen.002",
    "Extractor",
    "Cylinder.001",
    "Pendant Lamp Dixon Black and Gold-03",
    "Pendant Lamp Dixon Black and Gold-03.001",
    "Pendant Lamp Dixon Black and Gold-03.002"
  ].map(normalizeObjectName)
);

export function ApartmentModel({
  cabinetFinish,
  frontFinish,
  reflectionProbe = true,
  reflectionResolution = 256
}: ApartmentModelProps) {
  const gltf = useGLTF(APARTMENT_MODEL_PATH, "/draco/gltf/", true);
  const apartment = useMemo(() => prepareApartmentScene(gltf.scene), [gltf.scene]);

  useEffect(() => {
    return () => {
      apartment.ownedMaterials.forEach((material) => material.dispose());
      apartment.ownedTextures.forEach((texture) => texture.dispose());
    };
  }, [apartment]);

  return (
    <group position={APARTMENT_ORIGIN}>
      <primitive object={apartment.scene} />
      <group
        position={REPLACEMENT_KITCHEN_POSITION}
        rotation={REPLACEMENT_KITCHEN_ROTATION}
      >
        {reflectionProbe ? (
          <CubeCamera
            frames={1}
            position={[0, REFLECTION_PROBE_Y, 0]}
            resolution={reflectionResolution}
          >
            {(environmentMap) => (
              // CubeCamera moves its children with the probe; cancel that lift for the model.
              <group position={[0, -REFLECTION_PROBE_Y, 0]}>
                <KitchenModel
                  cabinetFinish={cabinetFinish}
                  environmentMap={environmentMap}
                  frontFinish={frontFinish}
                />
              </group>
            )}
          </CubeCamera>
        ) : (
          <KitchenModel cabinetFinish={cabinetFinish} frontFinish={frontFinish} />
        )}
      </group>
    </group>
  );
}

export function preloadApartmentModel() {
  useGLTF.preload(APARTMENT_MODEL_PATH, "/draco/gltf/", true);
}

function prepareApartmentScene(sourceScene: Object3D) {
  const scene = sourceScene.clone(true);
  const objectsToRemove: Object3D[] = [];
  const concreteWall = createConcreteWallMaterial(scene);
  const concreteWallMaterial = concreteWall?.material ?? null;

  scene.traverse((object) => {
    if (REMOVED_APARTMENT_OBJECTS.has(normalizeObjectName(object.name))) {
      objectsToRemove.push(object);
    }
  });

  objectsToRemove.forEach((object) => object.removeFromParent());

  scene.traverse((object) => {
    if (!(object instanceof Mesh)) {
      return;
    }

    if (
      concreteWallMaterial &&
      CONCRETE_WALL_OBJECTS.has(normalizeObjectName(object.name))
    ) {
      object.material = concreteWallMaterial;
    }

    const materials = Array.isArray(object.material) ? object.material : [object.material];
    const isTransparent = materials.some(
      (material) => material.transparent || material.opacity < 1
    );

    object.castShadow = !isTransparent;
    object.receiveShadow = true;
  });

  return {
    ownedMaterials: concreteWallMaterial ? [concreteWallMaterial] : [],
    ownedTextures: concreteWall?.textures ?? [],
    scene
  };
}

function createConcreteWallMaterial(scene: Object3D) {
  const sourceMaterials: MeshStandardMaterial[] = [];

  scene.traverse((object) => {
    if (!(object instanceof Mesh) || sourceMaterials.length > 0) {
      return;
    }

    const materials = Array.isArray(object.material) ? object.material : [object.material];
    const sourceMaterial = materials.find(
      (material): material is MeshStandardMaterial =>
        material instanceof MeshStandardMaterial &&
        normalizeObjectName(material.name) === normalizeObjectName("concrete_floor_worn_001")
    );

    if (sourceMaterial) {
      sourceMaterials.push(sourceMaterial);
    }
  });

  const sourceMaterial = sourceMaterials[0];
  if (!sourceMaterial) {
    return null;
  }

  const material = sourceMaterial.clone();
  const map = cloneWallTexture(sourceMaterial.map);
  const normalMap = cloneWallTexture(sourceMaterial.normalMap);
  const roughnessMap = cloneWallTexture(sourceMaterial.roughnessMap);

  material.name = "Configurator Concrete Walls";
  material.color.set("#aaa9a4");
  material.envMapIntensity = 0.55;
  material.map = map;
  material.metalness = 0;
  material.metalnessMap = null;
  material.normalMap = normalMap;
  material.normalScale.set(0.48, 0.48);
  material.roughness = 0.88;
  material.roughnessMap = roughnessMap;
  material.needsUpdate = true;

  return {
    material,
    textures: [map, normalMap, roughnessMap].filter(
      (texture): texture is Texture => Boolean(texture)
    )
  };
}

function cloneWallTexture(sourceTexture: Texture | null) {
  if (!sourceTexture) {
    return null;
  }

  const texture = sourceTexture.clone();
  texture.offset.set(0, 0);
  texture.repeat.set(6, 6);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.needsUpdate = true;

  return texture;
}

function normalizeObjectName(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, "_").replace(/[\[\].:/]/g, "");
}
