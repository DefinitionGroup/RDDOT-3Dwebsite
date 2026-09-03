"""Bevels every cabinet edge of kitchen-modules.glb by a millimetre and a half.

Real fronts are never knife-sharp: the small chamfer is what catches the
light along a door's edge and separates one front from the next. The
segmented prefabs stay exactly where they are — a bevel cuts inward, so
every module's bounds, origin and name are unchanged — only the triangle
count grows.

Run: Blender --background --python scripts/bevel-kitchen-modules.py -- <src.glb> <dst.glb> [width_m]
"""

import math
import sys

import bpy

argv = sys.argv[sys.argv.index("--") + 1 :]
SRC, DST = argv[0], argv[1]
WIDTH = float(argv[2]) if len(argv) > 2 else 0.0015

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SRC)

view_layer = bpy.context.view_layer
count = 0
for obj in list(bpy.data.objects):
    if obj.type != "MESH":
        continue
    view_layer.objects.active = obj
    obj.select_set(True)
    modifier = obj.modifiers.new("EdgeBevel", "BEVEL")
    modifier.width = WIDTH
    modifier.segments = 2
    modifier.limit_method = "ANGLE"
    modifier.angle_limit = math.radians(40)
    modifier.use_clamp_overlap = True
    modifier.miter_outer = "MITER_ARC"
    modifier.harden_normals = True
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    obj.select_set(False)
    count += 1

bpy.ops.export_scene.gltf(
    filepath=DST,
    export_format="GLB",
    export_apply=True,
    export_materials="NONE",
    export_texcoords=False,
    export_normals=True,
    export_yup=True,
)
print(f"bevelled {count} meshes -> {DST}")
