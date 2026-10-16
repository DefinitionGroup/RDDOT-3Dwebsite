"""Prepare the "57-estancia_comedor" OBJ room as the Loft's GLB.

Pipeline (headless Blender):
  1. Import the 3ds Max OBJ (160 MB, centimetres, wire colours only).
  2. Drop the living half where the kitchen and island stand (sofa, carpet,
     coffee table, armchair, wall shelves) and the unfinished zone behind
     the back wall; close the room with new walls and a ceiling.
  3. Give every object a real material by name, decimate the heavy meshes,
     shade by angle (the export smoothed even the boxes).
  4. Place it in the kitchen's source metres: the kitchen's back on the left
     wall at z = -1.517, its line centred on that wall at x = 0.
  5. Join one mesh per (room | furniture, material) and export a Draco GLB.

Run:
  Blender --background --factory-startup --python scripts/prepare-loft-room.py -- \
      <room.obj> <out.glb>

Source axes after the import: x across the room (left wall 378 -> right
wall 1022), y deeper (glass facade ~520-580 -> back wall), z up.
"""

import math
import sys

import bmesh
import bpy
from mathutils import Matrix, Vector

argv = sys.argv[sys.argv.index("--") + 1 :]
OBJ_IN, GLB_OUT = argv[0], argv[1]

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.wm.obj_import(filepath=OBJ_IN, forward_axis="NEGATIVE_Z", up_axis="Y")

# ---------------------------------------------------------------- selection

ARCH_KEEP = {"Ventana_1"}
ARCH_PREFIXES = ("ventana_", "carp")
# Replaced by clean boxes below (the back zone behind Muro_1 was never
# finished: no walls on its open side). Plane001 is the untextured backdrop
# outside the glass; the configurator shows a city panorama there instead.
ARCH_DROP = {"Muro_1", "Muro_2", "Muro_003", "muro_de_puerta", "muro_detras", "piso", "Techo", "Plane001"}


def is_arch(name):
    return name in ARCH_KEEP or name in ARCH_DROP or name.startswith(ARCH_PREFIXES)


def world_bounds(obj):
    corners = [obj.matrix_world @ Vector(c) for c in obj.bound_box]
    return (
        Vector([min(c[i] for c in corners) for i in range(3)]),
        Vector([max(c[i] for c in corners) for i in range(3)]),
    )


meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
removed = 0
for obj in meshes:
    lo, hi = world_bounds(obj)
    # The living-room half (sofa, carpet, coffee table, armchair, wall
    # shelves) stands where the kitchen and its island go.
    if obj.name in ARCH_DROP or (not is_arch(obj.name) and hi.x < 710):
        bpy.data.objects.remove(obj, do_unlink=True)
        removed += 1
print("removed", removed)

# ---------------------------------------------------------------- materials


def material(name, color, roughness=0.6, metallic=0.0, **extra):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    r, g, b = (int(color[i : i + 2], 16) / 255 for i in (1, 3, 5))
    # Hex values are sRGB; Blender stores linear.
    lin = [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in (r, g, b)]
    bsdf.inputs["Base Color"].default_value = (*lin, 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    for key, value in extra.items():
        bsdf.inputs[key].default_value = value
    return mat


MATERIALS = {
    "wall": material("wall", "#ebe7e0", 0.92),
    "ceiling": material("ceiling", "#f1efea", 0.95),
    "window-frame": material("window-frame", "#2a2a2a", 0.45, 0.5),
    "glass": material("glass", "#dfe7ea", 0.05),
    "table": material("table", "#2b2623", 0.62),
    "chair-shell": material("chair-shell", "#e6e2da", 0.48),
    "metal-black": material("metal-black", "#1c1c1c", 0.42, 0.6),
    "sideboard": material("sideboard", "#4a3426", 0.6),
    "record-light": material("record-light", "#d7cfc1", 0.75),
    "record-dark": material("record-dark", "#2f2c29", 0.7),
    "record-clay": material("record-clay", "#a85c41", 0.75),
    "aluminium": material("aluminium", "#b8b8b4", 0.35, 1.0),
    "rubber": material("rubber", "#161616", 0.8),
    "plinth": material("plinth", "#6b4a33", 0.55),
    "plant": material("plant", "#7f8f6c", 0.7),
    "foliage": material("foliage", "#8b9a7d", 0.75),
    "terracotta": material("terracotta", "#b9785a", 0.8),
    "ceramic": material("ceramic", "#c9cfd1", 0.32),
    "ceramic-rose": material("ceramic-rose", "#c49b8e", 0.4),
    "straw": material("straw", "#b39a6f", 0.9),
    "print-sand": material("print-sand", "#dcd2c2", 0.85),
    "print-sage": material("print-sage", "#c8cec2", 0.85),
    "print-rose": material("print-rose", "#dccbc0", 0.85),
}

EXACT = {
    "Ventana_1": "glass",
    "Box7685": "table",
    "Object086": "metal-black",
    "Object103": "straw",
    "002": "foliage",
    "Line012": "ceramic-rose",
    "Goods_Pure_Carafe_Set": "ceramic",
    "Rectangle007": "plinth",
    "Plane008": "aluminium",
    "Circle003": "rubber",
    "Loft001": "rubber",
    "Object040": "terracotta",
    "Object041": "ceramic",
    "rama": "print-sand",
    "rama001": "print-sage",
    "rama002": "print-rose",
}
RECORDS = ["record-light", "record-dark", "record-clay"]


def classify(name, lo, hi):
    if name in EXACT:
        return EXACT[name]
    if name.startswith("ventana_"):
        return "glass"
    if name.startswith("carp"):
        return "window-frame"
    if name.startswith("Plane01") and name[5:].isdigit():  # Plane013..018
        return "chair-shell"
    if name.startswith("Object08") or name.startswith("Object09"):  # 087..092 legs
        return "metal-black"
    if name.startswith(("Box008", "Box009", "Box010", "Box014", "detal", "Cylinder00", "Cylinder01")) and hi.z < 95:
        return "metal-black"
    if name.startswith("box0"):
        return "sideboard"
    if name.startswith("ChamferBox"):
        return RECORDS[int(name[-3:]) % 3]
    if name.startswith("succulent"):
        return "plant"
    # Everything else on top of the sideboard is the turntable's hardware.
    if lo.x > 955 and lo.z > 85:
        return "aluminium"
    return None


group_of = {}
unassigned = []
for obj in [o for o in bpy.context.scene.objects if o.type == "MESH"]:
    lo, hi = world_bounds(obj)
    key = classify(obj.name, lo, hi)
    if key is None:
        unassigned.append((obj.name, tuple(round(v) for v in lo), tuple(round(v) for v in hi)))
        key = "aluminium"
    obj.data.materials.clear()
    obj.data.materials.append(MATERIALS[key])
    group_of[obj.name] = "room" if is_arch(obj.name) else "furniture"
print("unassigned", unassigned)

# ---------------------------------------------------------------- new shell


def box(name, lo, hi, mat):
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    size = Vector(hi) - Vector(lo)
    obj.location = (Vector(lo) + Vector(hi)) / 2
    obj.scale = size
    obj.data.materials.append(MATERIALS[mat])
    group_of[name] = "room"
    return obj


BACK_FACE = 1120  # inner face of the new back wall
box("wall_left", (366, 572, 0), (378, BACK_FACE + 12, 300), "wall")
box("wall_back", (366, BACK_FACE, 0), (1034, BACK_FACE + 12, 300), "wall")
box("wall_right", (1022, 516, 0), (1034, BACK_FACE + 12, 300), "wall")
box("ceiling", (366, 500, 299), (1034, BACK_FACE + 12, 311), "ceiling")

# ---------------------------------------------------------------- geometry

# Targets per source object (polygon count). Unlisted heavy meshes get a
# generic budget; tiny parts never need thousands of faces.
DECIMATE = {
    "002": 0.025,
    "Box7685": 0.1,
    "Plane018": 0.12,
    "Plane008": 0.05,
    "Circle003": 0.05,
    "Circle013": 0.03,
    "Circle023": 0.03,
}

bpy.ops.object.select_all(action="DESELECT")
for obj in [o for o in bpy.context.scene.objects if o.type == "MESH"]:
    faces = len(obj.data.polygons)
    lo, hi = world_bounds(obj)
    diag = (hi - lo).length
    ratio = DECIMATE.get(obj.name)
    if ratio is None and faces > 1500:
        target = 300 if diag < 10 else 1000 + 0.08 * faces
        ratio = min(1.0, target / faces)
    if ratio and ratio < 1.0:
        mod = obj.modifiers.new("decimate", "DECIMATE")
        mod.ratio = ratio
        mod.use_collapse_triangulate = True
    # 3ds Max smoothed even the boxes: shade by angle instead.
    if obj.data.has_custom_normals:
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)
        bpy.ops.mesh.customdata_custom_splitnormals_clear()
        obj.select_set(False)

for obj in [o for o in bpy.context.scene.objects if o.type == "MESH"]:
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    for mod in list(obj.modifiers):
        bpy.ops.object.modifier_apply(modifier=mod.name)
    obj.select_set(False)
    for poly in obj.data.polygons:
        poly.use_smooth = True
    obj.data.set_sharp_from_angle(angle=math.radians(35))
    obj.data.validate(clean_customdata=False)
    # UVs only matter with textures, and there are none.
    while obj.data.uv_layers:
        obj.data.uv_layers.remove(obj.data.uv_layers[0])

# ---------------------------------------------------------------- placement

# Kitchen source metres, Y-up after export: the kitchen's back meets the left
# wall at z = -1.517 (scene -1.79 / 1.18) and its line is centred on the wall
# between the facade frame (y 581) and the back wall (y 1120).
LEFT_WALL_X = 378
KITCHEN_BACK = -1.517
LINE_CENTER = (581 + BACK_FACE) / 2
place = (
    Matrix.Translation((-LINE_CENTER / 100, LEFT_WALL_X / 100 - KITCHEN_BACK, 0))
    @ Matrix.Rotation(-math.pi / 2, 4, "Z")
    @ Matrix.Scale(0.01, 4)
)
for obj in [o for o in bpy.context.scene.objects if o.type == "MESH"]:
    obj.matrix_world = place @ obj.matrix_world
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
bpy.ops.object.select_all(action="DESELECT")

# One mesh per (group, material): a few dozen draw calls instead of 150.
buckets = {}
for obj in [o for o in bpy.context.scene.objects if o.type == "MESH"]:
    key = (group_of.get(obj.name, "furniture"), obj.data.materials[0].name)
    buckets.setdefault(key, []).append(obj)
for (group, mat), objs in buckets.items():
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objs:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    if len(objs) > 1:
        bpy.ops.object.join()
    joined = bpy.context.view_layer.objects.active
    joined.name = f"{group}__{mat}"
    joined.data.name = joined.name

tris = 0
for obj in [o for o in bpy.context.scene.objects if o.type == "MESH"]:
    count = sum(len(p.vertices) - 2 for p in obj.data.polygons)
    tris += count
    lo, hi = world_bounds(obj)
    print(f"{obj.name:28s} {count:7d}  {tuple(round(v, 3) for v in lo)} {tuple(round(v, 3) for v in hi)}")
print("triangles", tris)

for orphan in [m for m in bpy.data.materials if m.users == 0]:
    bpy.data.materials.remove(orphan)

bpy.ops.export_scene.gltf(
    filepath=GLB_OUT,
    export_format="GLB",
    export_apply=True,
    export_yup=True,
    export_texcoords=False,
    export_normals=True,
    export_materials="EXPORT",
    export_cameras=False,
    export_lights=False,
    export_draco_mesh_compression_enable=True,
    export_draco_mesh_compression_level=6,
    export_draco_position_quantization=14,
    export_draco_normal_quantization=10,
)
