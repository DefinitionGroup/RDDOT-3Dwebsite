"""Bake the Appartement2 environment scene to an unlit GLB plus an HDR panorama.

Pipeline (headless Blender, Cycles):
  1. Clean the source scene: convert curves, decimate extreme-poly meshes,
     drop cameras.
  2. Give every mesh a dedicated bake UV layer (Smart UV Project) and its own
     bake image sized by surface area.
  3. Cycles-bakes COMBINED lighting+color per object.
  4. Replaces all materials with rough Principled materials carrying the bake
     as base color (the runtime renders them unlit), then exports a
     Draco-compressed GLB with cameras/lights stripped.
  5. Renders an equirectangular HDR panorama from the kitchen anchor for
     lighting the dynamic kitchen model.

Run:
  Blender --background --python scripts/bake-appartement2.py -- \
      <src.blend> <out.glb> <out_pano.hdr> [quality]

quality: "draft" (fast smoke test) or "final" (default).
"""
import math
import sys
import time

import bpy
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1 :]
BLEND, OUT_GLB, OUT_PANO = argv[0], argv[1], argv[2]
QUALITY = argv[3] if len(argv) > 3 else "final"

DRAFT = QUALITY == "draft"
BAKE_SAMPLES = 32 if DRAFT else 256
PANO_SAMPLES = 64 if DRAFT else 512
MAX_TEX = 512 if DRAFT else 2048
PANO_RES = (768, 384) if DRAFT else (2048, 1024)

# Kitchen anchor in the source scene (Blender coords, meters): room center in
# front of the painting wall, at standing eye height for the panorama.
# Floor sits at z=-1.369 in the source scene; pano eye ~1.45m above it.
KITCHEN_ANCHOR = Vector((-2.0, -0.55, 0.08))

# Objects whose polycount is wildly out of budget get decimated to this.
DECIMATE_OVER = 20000
DECIMATE_TARGET = 3000

start_time = time.time()


def log(message):
    print(f"[bake +{time.time() - start_time:6.1f}s] {message}", flush=True)


bpy.ops.wm.open_mainfile(filepath=BLEND)
scene = bpy.context.scene
scene.render.engine = "CYCLES"
prefs = bpy.context.preferences.addons["cycles"].preferences
prefs.compute_device_type = "METAL"
prefs.get_devices()
for device in prefs.devices:
    device.use = True
scene.cycles.device = "GPU"
scene.cycles.samples = BAKE_SAMPLES
scene.cycles.use_denoising = False  # bakes are denoised by resolution/margin
scene.render.bake.margin = 8

# ---- 1. cleanup ----------------------------------------------------------
for obj in list(scene.objects):
    if obj.type == "CAMERA":
        bpy.data.objects.remove(obj, do_unlink=True)

# Plane.002 is a glossy overlay coplanar with the shell's wood floor: it has
# no diffuse response, bakes black, and would hide the real floor when
# rendered unlit. The walkable floor surface lives in the shell (Cube.017).
overlay = scene.objects.get("Plane.002")
if overlay:
    bpy.data.objects.remove(overlay, do_unlink=True)
    log("removed glossy floor overlay Plane.002")

# Remove the east and south walls of the room shell so orbiting the kitchen
# never puts a wall between camera and product (dollhouse cut). The painting
# wall (west), window wall (north), floor, and ceiling stay.
shell = scene.objects.get("Cube.017")
if shell:
    import bmesh

    bm = bmesh.new()
    bm.from_mesh(shell.data)
    doomed_faces = []
    for face in bm.faces:
        center = shell.matrix_world @ face.calc_center_median()
        if center.x > 1.9 or center.y < -4.85:
            doomed_faces.append(face)
    bmesh.ops.delete(bm, geom=doomed_faces, context="FACES")
    bm.to_mesh(shell.data)
    bm.free()
    log(f"removed {len(doomed_faces)} blocking wall faces from shell")

for obj in list(scene.objects):
    if obj.type == "CURVE":
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)
        try:
            bpy.ops.object.convert(target="MESH")
            log(f"converted curve {obj.name} to mesh")
        except RuntimeError:
            bpy.data.objects.remove(obj, do_unlink=True)
        finally:
            for selected in bpy.context.selected_objects:
                selected.select_set(False)

meshes = [o for o in scene.objects if o.type == "MESH" and not o.hide_render]
for obj in meshes:
    if obj.data.users > 1:
        obj.data = obj.data.copy()
    if len(obj.data.polygons) > DECIMATE_OVER:
        ratio = DECIMATE_TARGET / len(obj.data.polygons)
        modifier = obj.modifiers.new("BakeDecimate", "DECIMATE")
        modifier.ratio = ratio
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=modifier.name)
        log(f"decimated {obj.name} to {len(obj.data.polygons)} polys")

# ---- 2. bake UVs + images ------------------------------------------------


def surface_area(obj):
    return sum(p.area for p in obj.data.polygons) * (
        obj.scale.x * obj.scale.y * obj.scale.z or 1
    )


def bake_resolution(obj):
    area = surface_area(obj)
    if area > 30:
        return MAX_TEX
    if area > 5:
        return MAX_TEX // 2
    if area > 0.5:
        return max(MAX_TEX // 4, 256)
    return max(MAX_TEX // 8, 128)


# The window backdrop uses camera-ray-only visibility, so GI rays (and
# bakes) see black. Its original photo material exports fine as-is.
BAKE_EXCLUDE = {"face"}

bake_targets = []
for obj in meshes:
    if not obj.data.polygons or obj.name in BAKE_EXCLUDE:
        continue
    bpy.context.view_layer.objects.active = obj
    for selected in bpy.context.selected_objects:
        selected.select_set(False)
    obj.select_set(True)

    layer = obj.data.uv_layers.new(name="BakeUV")
    obj.data.uv_layers.active = layer
    layer.active_render = False  # source UVs keep driving existing textures
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.02)
    bpy.ops.object.mode_set(mode="OBJECT")

    resolution = bake_resolution(obj)
    image = bpy.data.images.new(
        f"bake_{obj.name}", width=resolution, height=resolution, alpha=False
    )
    bake_targets.append((obj, image))

    if not obj.data.materials:
        material = bpy.data.materials.new(f"baked_{obj.name}")
        material.use_nodes = True
        obj.data.materials.append(material)

    for material in obj.data.materials:
        if material is None:
            continue
        if not material.use_nodes:
            material.use_nodes = True
        nodes = material.node_tree.nodes
        node = nodes.new("ShaderNodeTexImage")
        node.image = image
        node.name = "BakeTarget"
        uv_node = nodes.new("ShaderNodeUVMap")
        uv_node.uv_map = "BakeUV"
        material.node_tree.links.new(uv_node.outputs["UV"], node.inputs["Vector"])
        nodes.active = node

log(f"prepared {len(bake_targets)} bake targets")

# ---- 3. bake -------------------------------------------------------------
import numpy as np


def tonemap_bake(image):
    """Filmic-style exposure curve: scene-referred radiance would otherwise
    clip to white in the 8-bit export (bakes bypass the view transform)."""
    pixels = np.empty(image.size[0] * image.size[1] * 4, dtype=np.float32)
    image.pixels.foreach_get(pixels)
    rgb = pixels.reshape(-1, 4)[:, :3]
    mean = float(rgb.mean())
    rgb[:] = 1.0 - np.exp(-1.25 * rgb)
    pixels.reshape(-1, 4)[:, :3] = rgb
    image.pixels.foreach_set(pixels)
    image.update()
    return mean


for index, (obj, image) in enumerate(bake_targets):
    for selected in bpy.context.selected_objects:
        selected.select_set(False)
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.bake(type="COMBINED", uv_layer="BakeUV")
    mean = tonemap_bake(image)
    flag = "  [WARN: near-black bake]" if mean < 0.02 else ""
    log(f"baked {index + 1}/{len(bake_targets)}: {obj.name} ({image.size[0]}px, mean {mean:.3f}){flag}")

# ---- 4. rebuild materials + export --------------------------------------
for obj, image in bake_targets:
    material = bpy.data.materials.new(f"baked_{obj.name}")
    material.use_nodes = True
    nodes = material.node_tree.nodes
    links = material.node_tree.links
    nodes.clear()
    output = nodes.new("ShaderNodeOutputMaterial")
    principled = nodes.new("ShaderNodeBsdfPrincipled")
    principled.inputs["Roughness"].default_value = 1.0
    principled.inputs["Metallic"].default_value = 0.0
    tex = nodes.new("ShaderNodeTexImage")
    tex.image = image
    uv_node = nodes.new("ShaderNodeUVMap")
    uv_node.uv_map = "BakeUV"
    links.new(uv_node.outputs["UV"], tex.inputs["Vector"])
    links.new(tex.outputs["Color"], principled.inputs["Base Color"])
    links.new(principled.outputs["BSDF"], output.inputs["Surface"])
    obj.data.materials.clear()
    obj.data.materials.append(material)
    # The bake UV becomes the only UV set the exporter needs.
    for layer in list(obj.data.uv_layers):
        if layer.name != "BakeUV":
            obj.data.uv_layers.remove(layer)
    obj.data.uv_layers["BakeUV"].active_render = True

for obj in list(scene.objects):
    if obj.type == "LIGHT":
        bpy.data.objects.remove(obj, do_unlink=True)

bpy.ops.export_scene.gltf(
    filepath=OUT_GLB,
    export_format="GLB",
    export_image_format="JPEG",
    export_jpeg_quality=85,
    export_draco_mesh_compression_enable=True,
    export_lights=False,
    export_cameras=False,
)
log(f"exported {OUT_GLB}")

# ---- 5. panorama ---------------------------------------------------------
bpy.ops.wm.open_mainfile(filepath=BLEND)  # fresh scene incl. lights
scene = bpy.context.scene
scene.render.engine = "CYCLES"
prefs = bpy.context.preferences.addons["cycles"].preferences
prefs.compute_device_type = "METAL"
prefs.get_devices()
for device in prefs.devices:
    device.use = True
scene.cycles.device = "GPU"
scene.cycles.samples = PANO_SAMPLES
scene.cycles.use_denoising = True

camera_data = bpy.data.cameras.new("PanoCam")
camera_data.type = "PANO"
camera_data.panorama_type = "EQUIRECTANGULAR"
camera = bpy.data.objects.new("PanoCam", camera_data)
scene.collection.objects.link(camera)
camera.location = KITCHEN_ANCHOR
camera.rotation_euler = (math.radians(90), 0, 0)
scene.camera = camera
scene.render.resolution_x, scene.render.resolution_y = PANO_RES
scene.render.image_settings.file_format = "HDR"
scene.render.filepath = OUT_PANO
bpy.ops.render.render(write_still=True)
log(f"panorama written {OUT_PANO}")
log("done")
