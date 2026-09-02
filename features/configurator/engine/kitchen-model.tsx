"use client";

import { useGLTF, useTexture } from "@react-three/drei";
import {
  resolveSemanticRole,
  type SemanticSceneRole
} from "@/features/configurator/modules/asset-manifest";
import type { ThreeEvent } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo } from "react";
import {
  Box3,
  BoxGeometry,
  BufferAttribute,
  Color,
  DataTexture,
  Group,
  LinearFilter,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  Object3D,
  RGBAFormat,
  RepeatWrapping,
  SRGBColorSpace,
  Vector2,
  Vector3,
  type BufferGeometry,
  type Material,
  type Texture
} from "three";
import {
  computeKitchenLayout,
  getModuleManifest,
  type KitchenLayout
} from "@/features/configurator/modules/kitchen-modules";
import {
  DEFAULT_CONFIGURATOR_STATE,
  RDTD_KITCHEN_PRODUCT_V2
} from "@/features/configurator/product-definition";
import type { ConfiguratorState, FinishOption } from "@/features/configurator/types";

export type EditTarget = number | "island" | null;

export type KitchenEditProps = {
  selected: EditTarget;
  canAddStart: boolean;
  canAddEnd: boolean;
  onSelect: (target: EditTarget) => void;
  onAddSlot: (end: "start" | "end") => void;
};

type KitchenModelProps = {
  cabinetFinish: FinishOption;
  edit?: KitchenEditProps;
  environmentMap?: Texture;
  frontFinish: FinishOption;
  state?: ConfiguratorState;
};

const KITCHEN_MODEL_PATH = "/models/kitchen-modules.glb";
const MODEL_SCALE = 1.18;

const ALL_FINISHES = [
  ...RDTD_KITCHEN_PRODUCT_V2.cabinetColors,
  ...RDTD_KITCHEN_PRODUCT_V2.frontColors
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
  edit,
  environmentMap,
  frontFinish,
  state = DEFAULT_CONFIGURATOR_STATE
}: KitchenModelProps) {
  const gltf = useGLTF(KITCHEN_MODEL_PATH);
  const finishTextures = useTexture(FINISH_TEXTURE_URLS);
  const microSurfaceTexture = useMemo(() => createMicroSurfaceTexture(), []);

  const layoutKey = `${state.wallModules.join(",")}|${state.islandSize}`;
  const editActive = Boolean(edit);
  const editSelected = edit?.selected ?? null;
  const editCanAddStart = edit?.canAddStart ?? false;
  const editCanAddEnd = edit?.canAddEnd ?? false;

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
    const preparedModel = prepareKitchenModel(gltf.scene, state);
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
      appliance: new MeshPhysicalMaterial({
        clearcoat: 0.9,
        clearcoatRoughness: 0.08,
        color: "#101011",
        envMap: environmentMap ?? null,
        envMapIntensity: 1.35,
        metalness: 0.42,
        roughness: 0.12
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

    const editResources = edit
      ? applyEditTreatment(preparedModel.scene, preparedModel.layout, edit)
      : null;

    return { ...preparedModel, materials, editResources };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    cabinetFinish,
    environmentMap,
    frontFinish,
    gltf.scene,
    layoutKey,
    microSurfaceTexture,
    texturesByUrl,
    editActive,
    editSelected,
    editCanAddStart,
    editCanAddEnd
  ]);

  useLayoutEffect(() => {
    return () => {
      Object.values(model.materials).forEach((material) => material.dispose());
      model.ownedGeometries.forEach((geometry) => geometry.dispose());
      model.editResources?.dispose();
    };
  }, [model]);

  const handleSceneClick = (event: ThreeEvent<MouseEvent>) => {
    if (!edit) return;
    event.stopPropagation();
    let node: Object3D | null = event.object;
    while (node) {
      if (node.userData.ghostSlot) {
        edit.onAddSlot(node.userData.ghostSlot as "start" | "end");
        return;
      }
      if (typeof node.userData.wallIndex === "number") {
        edit.onSelect(node.userData.wallIndex);
        return;
      }
      if (node.userData.islandPart) {
        edit.onSelect("island");
        return;
      }
      node = node.parent;
    }
    edit.onSelect(null);
  };

  return (
    <group scale={MODEL_SCALE}>
      <primitive
        object={model.scene}
        onClick={edit ? handleSceneClick : undefined}
        onPointerMissed={edit ? () => edit.onSelect(null) : undefined}
        onPointerOut={edit ? () => void (document.body.style.cursor = "auto") : undefined}
        onPointerOver={edit ? () => void (document.body.style.cursor = "pointer") : undefined}
        position={model.offset}
      />
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

type ModelRole = SemanticSceneRole;

function composeKitchenScene(sourceScene: Object3D, layout: KitchenLayout) {
  const prefabs = new Map<string, Object3D>();
  for (const child of sourceScene.children) {
    prefabs.set(child.name, child);
  }
  const requirePrefab = (name: string) => {
    const prefab = prefabs.get(name);
    if (!prefab) {
      throw new Error(`Kitchen prefab missing: ${name}`);
    }
    return prefab;
  };

  const scene = new Group();
  let wallIndex = 0;
  for (const placement of layout.modules) {
    const instance = requirePrefab(placement.prefab).clone(true);
    instance.position.x = placement.x;
    if (placement.prefab.startsWith("module__wall-")) {
      instance.userData.wallIndex = wallIndex;
      wallIndex += 1;
    } else {
      instance.userData.islandPart = true;
    }
    if (placement.prefab.startsWith("module__wall-device")) {
      addApplianceFront(instance);
    }
    scene.add(instance);
  }
  for (const continuous of layout.continuous) {
    const instance = requirePrefab(continuous.prefab).clone(true);
    // Continuous prefab children carry absolute as-authored X; scaling the
    // root scales those, so the root shifts to land the left edge on x.
    instance.scale.x = continuous.scaleX;
    instance.position.x = continuous.x - continuous.scaleX * continuous.sourceXMin;
    scene.add(instance);
  }
  for (const box of layout.generated) {
    const size = [
      box.max[0] - box.min[0],
      box.max[1] - box.min[1],
      box.max[2] - box.min[2]
    ] as const;
    const mesh = new Mesh(new BoxGeometry(size[0], size[1], size[2]));
    mesh.name = `${box.role}__generated-${box.key}`;
    // Generated at runtime, so not in the Asset Manifest; the role is explicit.
    mesh.userData.configuratorRole = box.role;
    mesh.position.set(
      box.min[0] + size[0] / 2,
      box.min[1] + size[1] / 2,
      box.min[2] + size[2] / 2
    );
    scene.add(mesh);
  }
  scene.updateMatrixWorld(true);
  return scene;
}

/**
 * Stylized oven front for the device cabinet niche (local X spans the
 * module width; Y/Z are as-authored world coordinates). A dark glass
 * inset panel plus a slim handle bar make the appliance module read as
 * an appliance without pretending to be a product spec.
 */
function addApplianceFront(moduleInstance: Object3D) {
  const front = new Mesh(new BoxGeometry(0.55, 0.42, 0.018));
  front.name = "appliance__generated-oven-front";
  // Generated at runtime, so not in the Asset Manifest; roles are explicit.
  front.userData.configuratorRole = "appliance";
  front.position.set(0.319, 1.215, -4.716);
  moduleInstance.add(front);

  const handle = new Mesh(new BoxGeometry(0.48, 0.016, 0.016));
  handle.name = "handle__generated-oven-handle";
  handle.userData.configuratorRole = "handle";
  handle.position.set(0.319, 1.385, -4.7);
  moduleInstance.add(handle);
}

const defaultBoundsCache = new WeakMap<Object3D, Box3>();

function prepareKitchenModel(sourceScene: Object3D, state: ConfiguratorState) {
  const layout = computeKitchenLayout(state);
  const scene = composeKitchenScene(sourceScene, layout);

  // The stage offset comes from the default layout only: editing modules
  // must never slide the whole kitchen around the studio.
  let defaultBounds = defaultBoundsCache.get(sourceScene);
  if (!defaultBounds) {
    defaultBounds = new Box3().setFromObject(
      composeKitchenScene(sourceScene, computeKitchenLayout(DEFAULT_CONFIGURATOR_STATE))
    );
    defaultBoundsCache.set(sourceScene, defaultBounds);
  }
  const center = new Vector3();
  defaultBounds.getCenter(center);

  const ownedGeometries: BufferGeometry[] = [];
  scene.traverse((object) => {
    if (!(object instanceof Mesh)) {
      return;
    }

    // Object3D.clone() keeps geometry references shared with the useGLTF cache.
    // The path tracer adds and merges attributes while building its static scene,
    // so each render pipeline needs an isolated geometry instance.
    object.geometry = object.geometry.clone();
    ownedGeometries.push(object.geometry);
    // Model nodes resolve through the Asset Manifest; an unmapped node throws
    // rather than being guessed from its shape (ADR 0009).
    object.userData.configuratorRole ??= resolveSemanticRole(object.name);
    ensurePlanarUVs(object.geometry);
    normalizeMaterialGroups(object.geometry);
  });

  return {
    layout,
    ownedGeometries,
    scene,
    offset: [-center.x, -defaultBounds.min.y, -center.z] as [number, number, number]
  };
}


/**
 * Edit Session presentation: the kitchen keeps its real materials, with the
 * editable modules rendered slightly transparent so the scene stays true to
 * the product; the selected element carries a signature-red wireframe, and
 * translucent ghost slots at the line ends invite adding modules. Returns
 * the disposables it created.
 */
function applyEditTreatment(
  scene: Group,
  layout: KitchenLayout,
  edit: KitchenEditProps
) {
  const disposables: Array<{ dispose: () => void }> = [];
  const own = <T extends { dispose: () => void }>(resource: T): T => {
    disposables.push(resource);
    return resource;
  };

  const selectedWire = own(
    new MeshBasicMaterial({
      color: "#e2001a",
      opacity: 0.9,
      transparent: true,
      wireframe: true
    })
  );
  const slotFill = own(
    new MeshBasicMaterial({
      color: "#e2001a",
      depthWrite: false,
      opacity: 0.07,
      transparent: true
    })
  );
  const slotWire = own(
    new MeshBasicMaterial({
      color: "#e2001a",
      opacity: 0.4,
      transparent: true,
      wireframe: true
    })
  );

  // One slightly-transparent clone per source material, shared across meshes.
  const translucentClones = new Map<Material, Material>();
  const translucent = (source: Material) => {
    let clone = translucentClones.get(source);
    if (!clone) {
      clone = own(source.clone());
      clone.transparent = true;
      clone.opacity = 0.72;
      translucentClones.set(source, clone);
    }
    return clone;
  };

  for (const instance of scene.children) {
    const wallIndex = instance.userData.wallIndex as number | undefined;
    const isIsland = Boolean(instance.userData.islandPart);
    const isModule = typeof wallIndex === "number" || isIsland;
    if (!isModule) {
      continue;
    }
    const isSelected =
      (typeof wallIndex === "number" && edit.selected === wallIndex) ||
      (isIsland && edit.selected === "island");

    instance.traverse((object) => {
      if (!(object instanceof Mesh) || object.userData.holoOverlay) {
        return;
      }
      object.material = translucent(object.material as Material);
      if (isSelected) {
        const overlay = new Mesh(object.geometry, selectedWire);
        overlay.userData.holoOverlay = true;
        overlay.raycast = () => undefined;
        object.add(overlay);
      }
    });
  }

  // Ghost slots at the wall line ends.
  const wallPlacements = layout.modules.filter((placement) =>
    placement.prefab.startsWith("module__wall-")
  );
  if (wallPlacements.length > 0) {
    const first = wallPlacements[0];
    const last = wallPlacements[wallPlacements.length - 1];
    const lastEntry = getModuleManifest().find(
      (entry) => `module__${entry.key}` === last.prefab
    );
    const slotWidth = 0.3;
    const slotSpecs: Array<{ end: "start" | "end"; x: number; enabled: boolean }> = [
      { end: "start", x: first.x - slotWidth - 0.02, enabled: edit.canAddStart },
      {
        end: "end",
        x: last.x + (lastEntry?.width ?? 0.62) + 0.02,
        enabled: edit.canAddEnd
      }
    ];
    for (const spec of slotSpecs) {
      if (!spec.enabled) continue;
      const geometry = own(new BoxGeometry(slotWidth, 2.47, 0.58));
      const slot = new Mesh(geometry, slotFill);
      slot.name = "ghost-slot";
      slot.userData.ghostSlot = spec.end;
      slot.position.set(spec.x + slotWidth / 2, 0.14 + 2.47 / 2, -5.02);
      const wire = new Mesh(geometry, slotWire);
      wire.userData.holoOverlay = true;
      wire.raycast = () => undefined;
      slot.add(wire);
      scene.add(slot);
    }
  }

  return {
    dispose: () => {
      disposables.forEach((resource) => resource.dispose());
    }
  };
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
    role === "appliance" ||
    role === "backdrop" ||
    role === "cabinet" ||
    role === "countertop" ||
    role === "front" ||
    role === "handle" ||
    role === "plinth"
  );
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
