import bpy
import json
import math
import os
import sys


def parse_params():
    defaults = {
        "motorCount": 4,
        "wheelbaseMm": 250,
        "armWidthMm": 18,
        "hubSizeMm": 70,
        "motorMountOdMm": 28,
        "wallMm": 2.2,
        "ducted": False,
        "ductOdMm": 55,
        "ductHeightMm": 18,
        "batteryLMm": 90,
        "batteryWMm": 40,
        "batteryHMm": 28,
        "landingGear": True,
        "gearHeightMm": 35,
        "outStl": "",
        "outGlb": "",
    }
    argv = sys.argv
    if "--" in argv:
        args = argv[argv.index("--") + 1 :]
        if args:
            path = args[0]
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
            defaults.update(data)
            return defaults
    env = os.environ.get("GENESIS_CAD_JSON")
    if env and os.path.isfile(env):
        with open(env, "r", encoding="utf-8") as f:
            defaults.update(json.load(f))
    return defaults


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for block in (bpy.data.meshes, bpy.data.materials):
        for b in list(block):
            if b.users == 0:
                block.remove(b)


def mat(name, color, rough=0.35, metal=0.1):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Metallic"].default_value = metal
    return m


def shade(obj):
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.shade_smooth()
    obj.select_set(False)


def mm(v):
    return float(v) * 0.001


def add_box(name, size, loc, material):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = size
    bpy.ops.object.transform_apply(scale=True)
    obj.data.materials.append(material)
    shade(obj)
    return obj


def add_cyl(name, radius, depth, loc, material, vertices=32):
    bpy.ops.mesh.primitive_cylinder_add(radius=radius, depth=depth, location=loc, vertices=vertices)
    obj = bpy.context.active_object
    obj.name = name
    obj.data.materials.append(material)
    shade(obj)
    return obj


def build(p):
    clear_scene()
    white = mat("Shell", (0.85, 0.87, 0.9), 0.3, 0.05)
    dark = mat("Motor", (0.1, 0.11, 0.12), 0.4, 0.55)

    motors = int(p["motorCount"])
    if motors not in (3, 4, 6, 8):
        motors = 4
    wb = mm(p["wheelbaseMm"])
    arm_w = mm(p["armWidthMm"])
    hub = mm(p["hubSizeMm"])
    mount = mm(p["motorMountOdMm"])
    wall = mm(max(1.5, p["wallMm"]))
    arm_thick = wall * 2.8
    hub_thick = wall * 3.5
    span = wb / 2

    parts = []

    hub_obj = add_cyl("Hub", hub / 2, hub_thick, (0, 0, 0), white, 48)
    parts.append(hub_obj)

    bay = add_box(
        "BatteryBay",
        (mm(p["batteryLMm"]) + wall * 2, mm(p["batteryWMm"]) + wall * 2, mm(p["batteryHMm"])),
        (0, 0, -hub_thick / 2 - mm(p["batteryHMm"]) / 2),
        white,
    )
    parts.append(bay)

    for i in range(motors):
        ang = i * (2 * math.pi / motors) + (math.pi / 4 if motors == 4 else 0)
        tip = (math.sin(ang) * span, math.cos(ang) * span, 0)
        mid = (tip[0] * 0.55, tip[1] * 0.55, 0)
        arm_len = span * 0.7
        arm = add_box(f"Arm_{i}", (arm_w, arm_len, arm_thick), mid, white)
        arm.rotation_euler[2] = ang
        bpy.context.view_layer.objects.active = arm
        arm.select_set(True)
        bpy.ops.object.transform_apply(rotation=True)
        arm.select_set(False)
        parts.append(arm)

        nacelle = add_cyl(f"Nacelle_{i}", mount / 2, arm_thick * 1.2, tip, dark, 40)
        parts.append(nacelle)
        motor = add_cyl(f"Motor_{i}", mount * 0.35, arm_thick * 0.9, (tip[0], tip[1], arm_thick * 0.7), dark, 28)
        parts.append(motor)

        if p.get("ducted"):
            duct_r = mm(p["ductOdMm"]) / 2
            duct_h = mm(p["ductHeightMm"])
            bpy.ops.mesh.primitive_cylinder_add(
                radius=duct_r, depth=duct_h, location=(tip[0], tip[1], duct_h * 0.2), vertices=48
            )
            outer = bpy.context.active_object
            outer.name = f"DuctOuter_{i}"
            bpy.ops.mesh.primitive_cylinder_add(
                radius=max(0.001, duct_r - wall),
                depth=duct_h + 0.002,
                location=(tip[0], tip[1], duct_h * 0.2),
                vertices=48,
            )
            inner = bpy.context.active_object
            inner.name = f"DuctInner_{i}"
            mod = outer.modifiers.new("Bool", "BOOLEAN")
            mod.operation = "DIFFERENCE"
            mod.object = inner
            bpy.context.view_layer.objects.active = outer
            bpy.ops.object.modifier_apply(modifier=mod.name)
            bpy.data.objects.remove(inner, do_unlink=True)
            outer.data.materials.append(white)
            shade(outer)
            parts.append(outer)

        for bi in range(2):
            blade = add_box(
                f"Blade_{i}_{bi}",
                (mount * 3.2, mount * 0.25, wall * 0.4),
                (tip[0], tip[1], arm_thick * 1.15),
                dark,
            )
            blade.rotation_euler[2] = ang + bi * (math.pi / 2)
            bpy.context.view_layer.objects.active = blade
            blade.select_set(True)
            bpy.ops.object.transform_apply(rotation=True)
            blade.select_set(False)
            parts.append(blade)

    if p.get("landingGear", True):
        gh = mm(p["gearHeightMm"])
        for side in (-1, 1):
            y = side * (mm(p["batteryWMm"]) / 2 + wall * 3)
            leg = add_box(
                f"Leg_{side}",
                (mm(p["batteryLMm"]) * 0.55, wall * 1.5, gh),
                (0, y, -hub_thick / 2 - mm(p["batteryHMm"]) - gh / 2),
                white,
            )
            parts.append(leg)
            skid = add_cyl(
                f"Skid_{side}",
                wall * 1.1,
                mm(p["batteryLMm"]) * 0.75,
                (0, y, -hub_thick / 2 - mm(p["batteryHMm"]) - gh),
                white,
                16,
            )
            skid.rotation_euler[1] = math.pi / 2
            bpy.context.view_layer.objects.active = skid
            skid.select_set(True)
            bpy.ops.object.transform_apply(rotation=True)
            skid.select_set(False)
            parts.append(skid)

    for o in parts:
        o.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    drone = bpy.context.active_object
    drone.name = "GenesisMultirotor"
    bpy.ops.object.origin_set(type="ORIGIN_GEOMETRY", center="BOUNDS")
    return drone


def export(drone, p):
    out_stl = p.get("outStl") or ""
    out_glb = p.get("outGlb") or ""
    bpy.ops.object.select_all(action="DESELECT")
    drone.select_set(True)
    bpy.context.view_layer.objects.active = drone
    if out_stl:
        os.makedirs(os.path.dirname(out_stl) or ".", exist_ok=True)
        try:
            bpy.ops.export_mesh.stl(filepath=out_stl, use_selection=True, ascii=False)
        except Exception:
            bpy.ops.wm.stl_export(filepath=out_stl, export_selected_objects=True, ascii_format=False)
    if out_glb:
        os.makedirs(os.path.dirname(out_glb) or ".", exist_ok=True)
        try:
            bpy.ops.export_scene.gltf(filepath=out_glb, use_selection=True, export_format="GLB")
        except Exception as exc:
            print(f"GENESIS_WARN glb_export_failed: {exc}")


def main():
    p = parse_params()
    drone = build(p)
    export(drone, p)
    print(
        f"GENESIS_OK motors={p['motorCount']} wb={p['wheelbaseMm']} "
        f"stl={p.get('outStl')} glb={p.get('outGlb')}"
    )


if __name__ == "__main__":
    main()
