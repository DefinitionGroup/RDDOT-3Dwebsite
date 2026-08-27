"""Segment kitchen-line.glb into named module prefabs.

Blender headless: clusters meshes into cabinet modules by measured X
intervals, bakes semantic roles into mesh names, normalizes each module's
X origin, and exports kitchen-modules.glb plus a JSON manifest.

Coordinate note: the glTF importer converts Y-up glTF to Z-up Blender:
  gltf(x, y, z) -> blender(x, -z, y)
So the kitchen's glTF depth axis z=-5.3 (wall) becomes blender y=+5.3,
and height becomes blender z.

Run: Blender --background --python segment_kitchen.py -- <src.glb> <dst.glb> <manifest.json>
"""
import json
import sys

import bpy
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1 :]
SRC, DST, MANIFEST = argv[0], argv[1], argv[2]

EPS = 0.008

# Wall line module boundaries measured in glTF X (see plan): 8 modules.
WALL_BOUNDS = [2.10, 2.72, 3.36, 3.66, 3.96, 4.26, 4.56, 5.20, 5.82]
WALL_KEYS = [
    ("wall-big-L", "wall-big"),
    ("wall-device-A", "wall-device"),
    ("wall-small-1", "wall-small"),
    ("wall-small-2", "wall-small"),
    ("wall-small-3", "wall-small"),
    ("wall-small-4", "wall-small"),
    ("wall-device-B", "wall-device"),
    ("wall-big-R", "wall-big"),
]

# Island rows. Boundaries shifted +0.03 past each divider so a divider is
# assigned to the unit on its left.
ISLAND_FRONT_BOUNDS = [2.32, 3.1149, 3.8804, 4.6499, 5.44]
ISLAND_FRONT_KEYS = [
    ("island-front-1", "island-front"),
    ("island-front-2", "island-front"),
    ("island-front-3", "island-front"),
    ("island-front-4", "island-front"),
]
ISLAND_BACK_BOUNDS = [2.32, 3.2599, 3.8804, 4.4999, 5.44]
ISLAND_BACK_KEYS = [
    ("island-back-90-L", "island-back-90"),
    ("island-back-60-1", "island-back-60"),
    ("island-back-60-2", "island-back-60"),
    ("island-back-90-R", "island-back-90"),
]

# Meshes that intentionally span multiple modules -> kept whole, replaced
# procedurally once layouts change. Keyed by original object name.
CONTINUOUS_ROLES = {
    "Plane559": ("wall-backwall", "backdrop"),
    "Box117": ("wall-backpanel", "backdrop"),
    "Box121": ("wall-plinth-strip", "plinth"),
    "Box021": ("island-countertop", "countertop"),
    "Box059": ("island-midpanel", "cabinet"),
    "Box036": ("island-back-plinth", "plinth"),
}


def world_bounds(obj):
    corners = [obj.matrix_world @ Vector(c) for c in obj.bound_box]
    xs = [c.x for c in corners]
    ys = [c.y for c in corners]
    zs = [c.z for c in corners]
    return (min(xs), min(ys), min(zs)), (max(xs), max(ys), max(zs))


def gltf_bounds(obj):
    """Bounds expressed in glTF coordinates (x, height y, depth z)."""
    mn, mx = world_bounds(obj)
    # blender(x, y, z) -> gltf(x, z, -y)
    return {
        "x": (mn[0], mx[0]),
        "y": (mn[2], mx[2]),
        "z": (-mx[1], -mn[1]),
    }


def classify(obj, b):
    """Port of the runtime classifyMesh heuristic, in glTF coordinates."""
    name = obj.name.lower()
    sx = b["x"][1] - b["x"][0]
    sy = b["y"][1] - b["y"][0]
    sz = b["z"][1] - b["z"][0]
    cy = (b["y"][0] + b["y"][1]) / 2

    if name.startswith("line"):
        return "handle"
    if obj.name == "Plane559" or (sz <= 0.025 and sx >= 2.8 and sy >= 1.8):
        return "backdrop"
    is_countertop = (
        sy <= 0.12 and 0.82 <= cy <= 1.08 and (sx >= 1.2 or (sx >= 0.54 and sz >= 0.45))
    )
    if is_countertop or name.startswith("plane"):
        return "countertop"
    if sy <= 0.16 and cy <= 0.2 and (sx >= 1.2 or sz >= 0.7):
        return "plinth"
    if sz <= 0.04 and 0.12 <= sx <= 1.2 and sy >= 0.25 and cy >= 0.25:
        return "front"
    return "cabinet"


def interval_index(bounds_list, x_min, x_max):
    """Index of the interval containing [x_min, x_max].

    Falls back to center assignment (biased left, so boundary-straddling
    divider panels join the unit on their left) when the mesh is narrow;
    returns None only for genuinely spanning meshes."""
    for i in range(len(bounds_list) - 1):
        if x_min >= bounds_list[i] - EPS and x_max <= bounds_list[i + 1] + EPS:
            return i
    width = x_max - x_min
    max_interval = max(
        bounds_list[i + 1] - bounds_list[i] for i in range(len(bounds_list) - 1)
    )
    if width > max_interval + 0.1:
        return None
    center = (x_min + x_max) / 2 - 0.02
    for i in range(len(bounds_list) - 1):
        if bounds_list[i] <= center < bounds_list[i + 1]:
            return i
    return None


bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SRC)

meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
print(f"imported {len(meshes)} meshes")

assignments = {}  # object -> (module_key, module_type)
unassigned = []

for obj in meshes:
    b = gltf_bounds(obj)
    x_min, x_max = b["x"]
    z_min, z_max = b["z"]
    z_center = (z_min + z_max) / 2

    if obj.name in CONTINUOUS_ROLES:
        key, _role = CONTINUOUS_ROLES[obj.name]
        assignments[obj] = (f"continuous:{key}", "continuous")
        continue

    if z_center < -4.3:  # wall line
        idx = interval_index(WALL_BOUNDS, x_min, x_max)
        if idx is None:
            unassigned.append((obj.name, "wall-span", b))
            continue
        assignments[obj] = WALL_KEYS[idx]
        continue

    # island region
    depth = z_max - z_min
    if depth > 0.9:  # spans both rows -> island end panel
        key = "island-end-L" if x_min < 3.0 else "island-end-R"
        assignments[obj] = (key, "island-end")
        continue

    if z_center > -2.85:  # front row (gltf z in [-2.85, -2.28])
        idx = interval_index(ISLAND_FRONT_BOUNDS, x_min, x_max)
        if idx is None:
            unassigned.append((obj.name, "island-front-span", b))
            continue
        assignments[obj] = ISLAND_FRONT_KEYS[idx]
        continue

    idx = interval_index(ISLAND_BACK_BOUNDS, x_min, x_max)
    if idx is None:
        unassigned.append((obj.name, "island-back-span", b))
        continue
    assignments[obj] = ISLAND_BACK_KEYS[idx]

if unassigned:
    print("UNASSIGNED MESHES:")
    for name, reason, b in unassigned:
        print(f"  {name} [{reason}] x={b['x']} z={b['z']}")
    raise SystemExit("segmentation incomplete - aborting")

# Bake roles into mesh names, make data single-user.
for obj in meshes:
    role = (
        CONTINUOUS_ROLES[obj.name][1]
        if obj.name in CONTINUOUS_ROLES
        else classify(obj, gltf_bounds(obj))
    )
    if obj.data.users > 1:
        obj.data = obj.data.copy()
    obj.name = f"{role}__{obj.name}"

# Group objects by module, create root empties, normalize module X origin.
modules = {}
for obj, (key, mtype) in assignments.items():
    modules.setdefault(key, {"type": mtype, "objects": []})["objects"].append(obj)

manifest = {"modules": [], "continuous": []}

for key in sorted(modules):
    info = modules[key]
    objs = info["objects"]
    x_min = min(gltf_bounds(o)["x"][0] for o in objs)
    x_max = max(gltf_bounds(o)["x"][1] for o in objs)

    is_continuous = key.startswith("continuous:")
    clean_key = key.split(":", 1)[1] if is_continuous else key
    empty = bpy.data.objects.new(
        ("continuous__" if is_continuous else "module__") + clean_key, None
    )
    bpy.context.scene.collection.objects.link(empty)

    # The empty carries the module's world X offset; children hold their
    # world transform shifted by -x_min, so empty.x + child.x reproduces the
    # original world position and the composer can re-place modules by
    # moving only the empty. Continuous meshes keep absolute positions.
    offset = 0.0 if is_continuous else x_min
    empty.location.x = offset
    for obj in objs:
        world = obj.matrix_world.copy()
        obj.parent = empty
        world.translation.x -= offset
        obj.matrix_basis = world

    if not is_continuous:
        manifest["modules"].append(
            {
                "key": clean_key,
                "type": info["type"],
                "prefab": "module__" + clean_key,
                "xMin": round(x_min, 4),
                "width": round(x_max - x_min, 4),
                "meshCount": len(objs),
            }
        )
    else:
        manifest["continuous"].append(
            {
                "key": clean_key,
                "prefab": "continuous__" + clean_key,
                "xMin": round(x_min, 4),
                "width": round(x_max - x_min, 4),
            }
        )

# Drop leftover import-hierarchy objects (empties whose meshes were
# reparented) so the export contains only module/continuous roots.
for obj in list(bpy.context.scene.objects):
    if obj.type != "MESH" and not obj.name.startswith(("module__", "continuous__")):
        bpy.data.objects.remove(obj, do_unlink=True)

# Report per-type consistency (are the four smalls identical?)
by_type = {}
for entry in manifest["modules"]:
    by_type.setdefault(entry["type"], []).append(entry)
for mtype, entries in sorted(by_type.items()):
    widths = sorted({e["width"] for e in entries})
    counts = sorted({e["meshCount"] for e in entries})
    print(f"type {mtype}: n={len(entries)} widths={widths} meshCounts={counts}")

manifest["modules"].sort(key=lambda e: e["xMin"])
manifest["continuous"].sort(key=lambda e: e["xMin"])

with open(MANIFEST, "w") as fh:
    json.dump(manifest, fh, indent=2)
print("manifest written:", MANIFEST)

bpy.ops.export_scene.gltf(filepath=DST, export_format="GLB")
print("exported", DST)
