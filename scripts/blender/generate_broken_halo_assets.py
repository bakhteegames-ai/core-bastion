import math
import os
import sys

import bpy


DEG = math.pi / 180.0


def parse_args():
  args = sys.argv
  if "--" in args:
    args = args[args.index("--") + 1:]
  else:
    args = []

  if len(args) < 2:
    raise SystemExit("Usage: blender --background --python generate_broken_halo_assets.py -- <out_dir> <kitbash_dir>")

  return os.path.abspath(args[0]), os.path.abspath(args[1])


def purge_scene():
  bpy.ops.object.select_all(action="SELECT")
  bpy.ops.object.delete(use_global=False)
  for collection in list(bpy.data.collections):
    if collection.users == 0:
      bpy.data.collections.remove(collection)
  bpy.ops.outliner.orphans_purge(do_recursive=True)


def setup_scene():
  scene = bpy.context.scene
  scene.render.engine = "BLENDER_EEVEE"
  scene.world.color = (0.01, 0.015, 0.025)


def radians(rotation):
  return tuple(component * DEG for component in rotation)


def material(name, base, metallic=0.65, roughness=0.45, emission=None, emission_strength=0.0, alpha=1.0, transmission=0.0):
  mat = bpy.data.materials.new(name=name)
  mat.use_nodes = True
  nodes = mat.node_tree.nodes
  principled = nodes["Principled BSDF"]
  principled.inputs["Base Color"].default_value = (base[0], base[1], base[2], alpha)
  principled.inputs["Metallic"].default_value = metallic
  principled.inputs["Roughness"].default_value = roughness
  principled.inputs["Alpha"].default_value = alpha

  if emission:
    principled.inputs["Emission Color"].default_value = (emission[0], emission[1], emission[2], 1.0)
    principled.inputs["Emission Strength"].default_value = emission_strength

  if transmission > 0:
    principled.inputs["Transmission Weight"].default_value = transmission
    principled.inputs["IOR"].default_value = 1.16

  if alpha < 0.999:
    mat.blend_method = "BLEND"
    if hasattr(mat, "shadow_method"):
      mat.shadow_method = "HASHED"

  return mat


def assign_material(obj, mat):
  if obj.data.materials:
    obj.data.materials[0] = mat
  else:
    obj.data.materials.append(mat)


def auto_smooth(obj):
  bpy.context.view_layer.objects.active = obj
  obj.select_set(True)
  try:
    bpy.ops.object.shade_auto_smooth(angle=math.radians(36))
  except Exception:
    bpy.ops.object.shade_smooth()
  obj.select_set(False)


def beveled_cube(name, location, dimensions, material_ref, rotation=(0, 0, 0), bevel=0.06):
  bpy.ops.mesh.primitive_cube_add(size=1, location=location, rotation=radians(rotation))
  obj = bpy.context.active_object
  obj.name = name
  obj.scale = dimensions
  bevel_mod = obj.modifiers.new(name="Bevel", type="BEVEL")
  bevel_mod.width = min(bevel, max(0.015, min(dimensions) * 0.18))
  bevel_mod.segments = 3
  bevel_mod.profile = 0.72
  assign_material(obj, material_ref)
  auto_smooth(obj)
  return obj


def cylinder(name, location, radius, depth, material_ref, rotation=(0, 0, 0), vertices=24, bevel=0.04):
  bpy.ops.mesh.primitive_cylinder_add(
    vertices=vertices,
    radius=radius,
    depth=depth,
    location=location,
    rotation=radians(rotation)
  )
  obj = bpy.context.active_object
  obj.name = name
  if bevel > 0:
    bevel_mod = obj.modifiers.new(name="Bevel", type="BEVEL")
    bevel_mod.width = bevel
    bevel_mod.segments = 2
    bevel_mod.profile = 0.7
  assign_material(obj, material_ref)
  auto_smooth(obj)
  return obj


def torus(name, location, major_radius, minor_radius, material_ref, rotation=(0, 0, 0), major_segments=36, minor_segments=12):
  bpy.ops.mesh.primitive_torus_add(
    major_segments=major_segments,
    minor_segments=minor_segments,
    major_radius=major_radius,
    minor_radius=minor_radius,
    location=location,
    rotation=radians(rotation)
  )
  obj = bpy.context.active_object
  obj.name = name
  assign_material(obj, material_ref)
  auto_smooth(obj)
  return obj


def sphere(name, location, radius, material_ref, rotation=(0, 0, 0), alpha=None):
  bpy.ops.mesh.primitive_uv_sphere_add(
    segments=28,
    ring_count=14,
    radius=radius,
    location=location,
    rotation=radians(rotation)
  )
  obj = bpy.context.active_object
  obj.name = name
  assign_material(obj, material_ref)
  auto_smooth(obj)
  return obj


def plane(name, location, size_x, size_y, material_ref, rotation=(0, 0, 0)):
  bpy.ops.mesh.primitive_plane_add(
    size=1,
    location=location,
    rotation=radians(rotation)
  )
  obj = bpy.context.active_object
  obj.name = name
  obj.scale = (size_x, size_y, 1)
  assign_material(obj, material_ref)
  return obj


def import_gltf(filepath, name, location=(0, 0, 0), rotation=(0, 0, 0), scale=(1, 1, 1)):
  if not os.path.exists(filepath):
    return None

  existing = {obj.name for obj in bpy.data.objects}
  bpy.ops.import_scene.gltf(filepath=filepath, merge_vertices=True)
  imported = [obj for obj in bpy.data.objects if obj.name not in existing]
  if not imported:
    return None

  parent = bpy.data.objects.new(name, None)
  bpy.context.scene.collection.objects.link(parent)
  parent.location = location
  parent.rotation_euler = radians(rotation)
  parent.scale = scale

  roots = [obj for obj in imported if obj.parent is None]
  for root in roots:
    root.parent = parent

  return parent


def export_selected(filepath):
  bpy.ops.object.select_all(action="DESELECT")
  exportables = [obj for obj in bpy.context.scene.objects if obj.type in {"MESH", "EMPTY"}]
  for obj in exportables:
    obj.select_set(True)

  bpy.ops.export_scene.gltf(
    filepath=filepath,
    export_format="GLB",
    use_selection=True,
    export_apply=True,
    export_texcoords=False,
    export_normals=True,
    export_materials="EXPORT",
    export_cameras=False,
    export_lights=False,
    export_yup=True
  )


def build_environment(out_dir, kitbash_dir):
  purge_scene()
  setup_scene()

  mats = {
    "hull": material("Hull", (0.12, 0.16, 0.21), metallic=0.78, roughness=0.42),
    "plating": material("Plating", (0.2, 0.25, 0.31), metallic=0.72, roughness=0.36),
    "trim": material("Trim", (0.28, 0.34, 0.41), metallic=0.82, roughness=0.28, emission=(0.06, 0.09, 0.12), emission_strength=0.7),
    "dark": material("Dark", (0.04, 0.055, 0.07), metallic=0.22, roughness=0.82),
    "cyan": material("Cyan", (0.24, 0.86, 0.93), metallic=0.08, roughness=0.2, emission=(0.2, 0.82, 0.94), emission_strength=2.8),
    "cyan_soft": material("CyanSoft", (0.1, 0.3, 0.36), metallic=0.12, roughness=0.28, emission=(0.08, 0.32, 0.38), emission_strength=1.7, alpha=0.72),
    "orange": material("Orange", (0.92, 0.34, 0.18), metallic=0.04, roughness=0.32, emission=(0.52, 0.17, 0.08), emission_strength=2.2),
    "glass": material("Glass", (0.33, 0.88, 0.96), metallic=0.0, roughness=0.04, emission=(0.18, 0.78, 0.9), emission_strength=1.4, alpha=0.28, transmission=0.55)
  }

  deck_blocks = [
    ("OuterDeck", (-9.6, -0.3, 7.3), (6.1, 0.38, 4.2), (0, 0, 0), "hull"),
    ("BreachSpur", (-6.3, -0.15, 10.4), (2.4, 0.2, 1.0), (0, 0, -4), "plating"),
    ("BridgeDeck", (1.1, -0.12, 1.6), (4.8, 0.22, 3.1), (0, 0, 0), "plating"),
    ("InnerDeck", (8.8, -0.25, -3.6), (5.2, 0.34, 4.4), (0, 0, 0), "hull"),
    ("InnerSpur", (10.9, -0.16, -7.5), (1.7, 0.2, 2.2), (0, 16, 0), "plating")
  ]
  for name, loc, dims, rot, mat_key in deck_blocks:
    beveled_cube(name, loc, dims, mats[mat_key], rot, bevel=0.05)

  plane("UnderglowNorth", (0.2, -0.98, 4.5), 5.2, 1.45, mats["cyan_soft"], (90, 0, 0))
  plane("UnderglowSouth", (4.6, -1.05, -0.9), 3.7, 2.15, mats["cyan_soft"], (90, 90, 0))

  trench_blocks = [
    ("NorthTrench", (0.4, -1.55, 4.6), (4.9, 1.45, 1.55), (0, 0, 0)),
    ("SouthTrench", (4.6, -1.6, -1.0), (3.3, 1.55, 2.25), (0, 0, 0))
  ]
  for name, loc, dims, rot in trench_blocks:
    beveled_cube(name, loc, dims, mats["dark"], rot, bevel=0.02)

  walls = [
    ("WestWallNorth", (-15.0, 1.55, 10.9), (0.55, 1.65, 2.25), (0, 0, 0)),
    ("WestWallSouth", (-15.0, 1.55, 2.4), (0.55, 1.65, 4.2), (0, 0, 0)),
    ("NorthWall", (-8.2, 1.55, 12.5), (6.4, 1.55, 0.5), (0, 0, 0)),
    ("SouthWall", (2.0, 1.45, -11.4), (12.1, 1.45, 0.45), (0, 0, 0)),
    ("EastWall", (13.8, 1.55, -4.2), (0.45, 1.55, 5.1), (0, 0, 0)),
    ("BridgeShieldNorth", (-2.4, 1.35, 6.0), (1.3, 1.4, 0.35), (0, 0, 0)),
    ("BridgeShieldSouth", (6.5, 1.35, -3.8), (1.3, 1.4, 0.35), (0, 0, 0))
  ]
  for name, loc, dims, rot in walls:
    beveled_cube(name, loc, dims, mats["plating"], rot, bevel=0.04)

  skyline = [
    ("SkyFinNW", (-14.8, 3.0, 12.1), (0.38, 3.1, 0.54), (0, 10, 0)),
    ("SkyFinN", (-6.2, 2.7, 12.2), (0.32, 2.8, 0.48), (0, -8, 0)),
    ("SkyFinBridge", (7.9, 2.4, 6.2), (0.34, 2.6, 0.46), (0, 8, 0)),
    ("SkyFinSE", (12.8, 2.9, -7.4), (0.36, 3.0, 0.52), (0, -9, 0)),
    ("SkyFinS", (6.9, 2.4, -10.6), (0.32, 2.6, 0.44), (0, 7, 0))
  ]
  for name, loc, dims, rot in skyline:
    beveled_cube(name, loc, dims, mats["trim"], rot, bevel=0.03)

  bridge_shell = [
    ("BridgeMain", (1.1, 0.42, 1.4), (3.9, 0.14, 1.2), (0, -26, 0)),
    ("BridgeRailL", (0.0, 0.76, 3.25), (3.8, 0.08, 0.12), (0, -34, 0)),
    ("BridgeRailR", (2.2, 0.76, -0.5), (3.9, 0.08, 0.12), (0, -34, 0)),
    ("BridgeBraceL", (-1.0, -0.25, 2.9), (0.09, 1.2, 0.09), (0, 0, 28)),
    ("BridgeBraceR", (3.4, -0.25, -0.2), (0.09, 1.2, 0.09), (0, 0, -28))
  ]
  for name, loc, dims, rot in bridge_shell:
    beveled_cube(name, loc, dims, mats["trim"], rot, bevel=0.025)

  torus("InnerHaloRing", (9.35, 0.22, -4.45), 2.95, 0.14, mats["cyan"], (90, 0, 0))
  cylinder("InnerHaloDeck", (9.35, 0.08, -4.45), 3.65, 0.18, mats["plating"], vertices=28, bevel=0.03)
  for angle in (18, 78, 138, 198, 258, 318):
    radians_y = angle * DEG
    x = 9.35 + math.cos(radians_y) * 3.2
    z = -4.45 + math.sin(radians_y) * 3.2
    beveled_cube(
      f"InnerHaloRib_{angle}",
      (x, 1.35, z),
      (0.18, 1.45, 0.42),
      mats["trim"],
      (0, -angle, 8),
      bevel=0.025
    )

  breach_frame = [
    ("BreachStrutA", (-13.8, 2.0, 5.3), (0.24, 2.1, 0.36), (0, 0, 6)),
    ("BreachStrutB", (-13.1, 1.8, 9.8), (0.22, 1.9, 0.34), (0, 0, -8)),
    ("BreachLintel", (-13.1, 3.65, 7.5), (1.5, 0.22, 0.34), (0, 0, -4)),
    ("BreachCableA", (-12.5, 2.6, 5.4), (0.1, 0.85, 0.1), (0, 22, 18)),
    ("BreachCableB", (-11.7, 3.0, 9.1), (0.1, 1.0, 0.1), (0, -20, -14))
  ]
  for name, loc, dims, rot in breach_frame:
    beveled_cube(name, loc, dims, mats["hull"], rot, bevel=0.02)

  for idx, spec in enumerate([
    (-12.8, 0.22, 7.0, 0.95, 0.28, 0.42, (12, 34, 14)),
    (-10.8, 0.15, 5.8, 0.7, 0.18, 0.35, (-8, 12, -11)),
    (-9.4, 0.18, 8.8, 0.72, 0.16, 0.28, (0, -18, 8)),
    (-12.2, 0.05, 8.7, 1.2, 0.08, 0.14, (0, 28, 0))
  ]):
    x, y, z, sx, sy, sz, rot = spec
    beveled_cube(f"BreachDebris_{idx}", (x, y, z), (sx, sy, sz), mats["orange"], rot, bevel=0.015)

  kit_specs = [
    ("grim_shade_rooftop_kit.glb", "OuterBreachSuperstructure", (-3.8, 0.08, 5.4), (0, -26, 0), (0.76, 0.76, 0.76)),
    ("grim_shade_rooftop_kit.glb", "InnerHaloBulkhead", (8.0, 0.12, -6.1), (0, 88, 0), (0.44, 0.44, 0.44)),
    ("gs_catwalk_a.glb", "OuterCatwalk_A", (-10.8, 0.24, 6.2), (0, -26, 0), (1.18, 1.18, 1.18)),
    ("gs_catwalk_a.glb", "OuterCatwalk_B", (-8.0, 0.24, 7.1), (0, -26, 0), (1.18, 1.18, 1.18)),
    ("gs_catwalk_a.glb", "BridgeCatwalk_A", (-1.8, 0.28, 4.1), (0, -34, 0), (1.08, 1.08, 1.08)),
    ("gs_catwalk_a.glb", "BridgeCatwalk_B", (1.0, 0.28, 1.9), (0, -34, 0), (1.08, 1.08, 1.08)),
    ("gs_catwalk_a.glb", "InnerCatwalk", (7.4, 0.24, -3.7), (0, -28, 0), (1.08, 1.08, 1.08)),
    ("gs_relay_housing_a.glb", "BreachRelay", (-12.6, 0.12, 10.6), (0, 136, 0), (1.0, 1.0, 1.0)),
    ("gs_relay_housing_a.glb", "KillboxRelay", (0.6, 0.16, 5.0), (0, -18, 0), (0.94, 0.94, 0.94)),
    ("gs_relay_housing_a.glb", "CoreRelay", (9.7, 0.14, -7.3), (0, 88, 0), (1.0, 1.0, 1.0)),
    ("gs_pipe_bracket_a.glb", "NorthPipeBracket", (0.2, 0.05, 5.3), (0, 0, 0), (1.15, 1.15, 1.15)),
    ("gs_pipe_bracket_a.glb", "SouthPipeBracket", (4.8, 0.05, -1.1), (0, 92, 0), (1.15, 1.15, 1.15)),
    ("gs_dish_support_a.glb", "CoreDishSupport", (11.3, 0.12, -8.7), (0, 132, 0), (1.02, 1.02, 1.02)),
    ("gs_dish_support_a.glb", "BreachDishSupport", (-13.4, 0.12, 4.9), (0, -46, 0), (0.92, 0.92, 0.92))
  ]
  for file_name, name, loc, rot, scale in kit_specs:
    import_gltf(os.path.join(kitbash_dir, file_name), name, loc, rot, scale)

  export_selected(os.path.join(out_dir, "broken_halo_env.glb"))


def build_reactor(out_dir):
  purge_scene()
  setup_scene()

  mats = {
    "hull": material("Hull", (0.15, 0.18, 0.23), metallic=0.8, roughness=0.35),
    "trim": material("Trim", (0.28, 0.33, 0.4), metallic=0.82, roughness=0.24, emission=(0.05, 0.1, 0.12), emission_strength=0.9),
    "core": material("Core", (0.24, 0.86, 0.94), metallic=0.04, roughness=0.12, emission=(0.2, 0.82, 0.95), emission_strength=3.0, alpha=0.34, transmission=0.4),
    "warning": material("Warning", (0.74, 0.56, 0.22), metallic=0.5, roughness=0.36, emission=(0.18, 0.12, 0.04), emission_strength=1.2)
  }

  cylinder("ReactorBase", (0, 0.22, 0), 1.35, 0.44, mats["hull"], vertices=28, bevel=0.04)
  cylinder("ReactorPedestal", (0, 0.82, 0), 0.86, 0.74, mats["trim"], vertices=24, bevel=0.03)
  cylinder("ReactorChamberShell", (0, 1.75, 0), 0.62, 1.75, mats["core"], vertices=24, bevel=0.02)
  sphere("ReactorCoreOrb", (0, 1.78, 0), 0.44, mats["core"])
  torus("ReactorRingLower", (0, 1.1, 0), 1.45, 0.08, mats["warning"], (90, 0, 0))
  torus("ReactorRingUpper", (0, 2.35, 0), 1.95, 0.06, mats["trim"], (90, 0, 0))
  cylinder("ReactorCap", (0, 2.76, 0), 0.42, 0.26, mats["trim"], vertices=20, bevel=0.03)

  for angle in (45, 135, 225, 315):
    rad = angle * DEG
    x = math.cos(rad) * 1.85
    z = math.sin(rad) * 1.85
    beveled_cube(f"ReactorPylon_{angle}", (x, 0.95, z), (0.22, 0.92, 0.22), mats["hull"], (0, angle, 0), bevel=0.02)
    beveled_cube(f"ReactorArm_{angle}", (math.cos(rad) * 1.1, 1.65, math.sin(rad) * 1.1), (0.12, 0.55, 0.46), mats["trim"], (0, -angle, 18), bevel=0.015)

  for angle in (0, 90, 180, 270):
    rad = angle * DEG
    beveled_cube(f"ReactorVane_{angle}", (math.cos(rad) * 1.12, 1.78, math.sin(rad) * 1.12), (0.08, 0.58, 0.32), mats["warning"], (0, -angle, 22), bevel=0.012)

  export_selected(os.path.join(out_dir, "broken_halo_reactor.glb"))


def build_portal(out_dir):
  purge_scene()
  setup_scene()

  mats = {
    "hull": material("Hull", (0.14, 0.16, 0.2), metallic=0.74, roughness=0.38),
    "orange": material("Orange", (0.92, 0.35, 0.18), metallic=0.04, roughness=0.28, emission=(0.5, 0.17, 0.08), emission_strength=2.6),
    "amber": material("Amber", (0.78, 0.56, 0.2), metallic=0.24, roughness=0.3, emission=(0.2, 0.14, 0.05), emission_strength=1.5),
    "glass": material("PortalGlass", (0.95, 0.46, 0.2), metallic=0.0, roughness=0.08, emission=(0.58, 0.18, 0.08), emission_strength=2.2, alpha=0.24, transmission=0.36)
  }

  cylinder("PortalBase", (0, 0.24, 0), 1.18, 0.48, mats["hull"], vertices=24, bevel=0.04)
  cylinder("PortalPedestal", (0, 0.62, 0), 0.64, 0.26, mats["amber"], vertices=20, bevel=0.03)
  torus("PortalRingOuter", (0, 1.55, 0), 1.38, 0.12, mats["orange"], (90, 0, 0), major_segments=32, minor_segments=10)
  torus("PortalRingInner", (0, 1.55, 0), 0.98, 0.08, mats["glass"], (90, 0, 0), major_segments=28, minor_segments=10)

  for angle in (35, 145, 225, 325):
    rad = angle * DEG
    x = math.cos(rad) * 0.98
    z = math.sin(rad) * 0.98
    beveled_cube(f"PortalShard_{angle}", (x, 1.62, z), (0.09, 0.42, 0.14), mats["amber"], (angle * 0.18, angle, 20), bevel=0.012)

  beveled_cube("PortalFrameLeft", (-1.18, 1.55, 0), (0.11, 1.18, 0.11), mats["hull"], (0, 0, 0), bevel=0.02)
  beveled_cube("PortalFrameRight", (1.18, 1.55, 0), (0.11, 1.18, 0.11), mats["hull"], (0, 0, 0), bevel=0.02)
  beveled_cube("PortalFrameTop", (0, 2.62, 0), (0.98, 0.1, 0.1), mats["hull"], (0, 0, 0), bevel=0.02)
  export_selected(os.path.join(out_dir, "broken_halo_portal.glb"))


def build_pad(out_dir):
  purge_scene()
  setup_scene()

  mats = {
    "hull": material("Hull", (0.16, 0.19, 0.24), metallic=0.78, roughness=0.36),
    "trim": material("Trim", (0.27, 0.33, 0.4), metallic=0.8, roughness=0.22, emission=(0.06, 0.1, 0.12), emission_strength=0.8),
    "cyan": material("PadCyan", (0.24, 0.86, 0.94), metallic=0.06, roughness=0.18, emission=(0.2, 0.82, 0.95), emission_strength=2.4)
  }

  cylinder("PadBase", (0, 0.12, 0), 0.98, 0.24, mats["hull"], vertices=8, bevel=0.03)
  cylinder("PadInner", (0, 0.24, 0), 0.68, 0.08, mats["trim"], vertices=12, bevel=0.02)
  torus("PadRing", (0, 0.26, 0), 0.72, 0.05, mats["cyan"], (90, 0, 0), major_segments=24, minor_segments=10)
  sphere("PadCore", (0, 0.34, 0), 0.12, mats["cyan"])

  for angle in (45, 135, 225, 315):
    rad = angle * DEG
    x = math.cos(rad) * 0.68
    z = math.sin(rad) * 0.68
    beveled_cube(f"PadFin_{angle}", (x, 0.13, z), (0.08, 0.18, 0.24), mats["trim"], (0, -angle, 0), bevel=0.012)

  export_selected(os.path.join(out_dir, "broken_halo_pad.glb"))


def build_beacon(out_dir):
  purge_scene()
  setup_scene()

  mats = {
    "hull": material("Hull", (0.18, 0.22, 0.26), metallic=0.78, roughness=0.32),
    "trim": material("Trim", (0.28, 0.35, 0.42), metallic=0.8, roughness=0.24),
    "cyan": material("BeaconCyan", (0.24, 0.86, 0.94), metallic=0.06, roughness=0.16, emission=(0.2, 0.82, 0.94), emission_strength=2.0),
    "orange": material("BeaconOrange", (0.92, 0.35, 0.18), metallic=0.04, roughness=0.26, emission=(0.42, 0.14, 0.08), emission_strength=1.2)
  }

  beveled_cube("BeaconBase", (0, 0.12, 0), (0.22, 0.12, 0.22), mats["hull"], bevel=0.015)
  beveled_cube("BeaconStem", (0, 0.85, 0), (0.11, 0.82, 0.11), mats["trim"], bevel=0.012)
  sphere("BeaconTip", (0, 1.54, 0), 0.08, mats["cyan"])
  beveled_cube("BeaconCrossA", (0, 1.02, 0), (0.24, 0.02, 0.05), mats["orange"], bevel=0.006)
  beveled_cube("BeaconCrossB", (0, 1.02, 0), (0.05, 0.02, 0.24), mats["orange"], bevel=0.006)
  export_selected(os.path.join(out_dir, "broken_halo_beacon.glb"))


def main():
  out_dir, kitbash_dir = parse_args()
  os.makedirs(out_dir, exist_ok=True)

  build_environment(out_dir, kitbash_dir)
  build_reactor(out_dir)
  build_portal(out_dir)
  build_pad(out_dir)
  build_beacon(out_dir)


if __name__ == "__main__":
  main()
