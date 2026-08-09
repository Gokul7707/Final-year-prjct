import bpy
import bmesh
import math
from mathutils import Vector, Matrix

def clear_scene():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    for block in (bpy.data.meshes, bpy.data.materials, bpy.data.curves):
        for b in list(block):
            if b.users == 0:
                block.remove(b)

def mat(name, color, rough=0.35, metal=0.05, emit=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*color, 1.0)
    bsdf.inputs['Roughness'].default_value = rough
    bsdf.inputs['Metallic'].default_value = metal
    if 'Emission Strength' in bsdf.inputs:
        bsdf.inputs['Emission Strength'].default_value = emit
    if emit > 0 and 'Emission Color' in bsdf.inputs:
        bsdf.inputs['Emission Color'].default_value = (*color, 1.0)
    return m

def shade_smooth(obj, angle=30):
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.shade_smooth()
    if hasattr(obj.data, 'use_auto_smooth'):
        obj.data.use_auto_smooth = True
        obj.data.auto_smooth_angle = math.radians(angle)
    obj.select_set(False)

def join_selected(name):
    bpy.ops.object.join()
    obj = bpy.context.active_object
    obj.name = name
    obj.data.name = name
    return obj

def apply_boolean(target, cutter, op='UNION'):
    mod = target.modifiers.new(name='Bool', type='BOOLEAN')
    mod.operation = op
    mod.solver = 'EXACT'
    mod.object = cutter
    bpy.context.view_layer.objects.active = target
    bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.data.objects.remove(cutter, do_unlink=True)

def make_body(white):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 0.02))
    body = bpy.context.active_object
    body.name = 'BodyCore'
    body.scale = (0.42, 0.42, 0.14)
    bpy.ops.object.transform_apply(scale=True)
    bpy.ops.object.modifier_add(type='BEVEL')
    body.modifiers['Bevel'].width = 0.045
    body.modifiers['Bevel'].segments = 5
    bpy.ops.object.modifier_apply(modifier='Bevel')
    bpy.ops.object.modifier_add(type='SUBSURF')
    body.modifiers['Subdivision'].levels = 2
    body.modifiers['Subdivision'].render_levels = 3
    bpy.ops.object.modifier_apply(modifier='Subdivision')
    shade_smooth(body)
    body.data.materials.append(white)

    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 0.11))
    lid = bpy.context.active_object
    lid.name = 'BodyLid'
    lid.scale = (0.22, 0.22, 0.035)
    bpy.ops.object.transform_apply(scale=True)
    bpy.ops.object.modifier_add(type='BEVEL')
    lid.modifiers['Bevel'].width = 0.012
    lid.modifiers['Bevel'].segments = 3
    bpy.ops.object.modifier_apply(modifier='Bevel')
    shade_smooth(lid)
    lid.data.materials.append(white)

    bpy.ops.mesh.primitive_cylinder_add(radius=0.08, depth=0.06, location=(0, 0.18, 0.0), vertices=32)
    nose = bpy.context.active_object
    nose.name = 'Nose'
    nose.rotation_euler[0] = math.radians(90)
    bpy.ops.object.transform_apply(rotation=True)
    bpy.ops.object.modifier_add(type='BEVEL')
    nose.modifiers['Bevel'].width = 0.015
    nose.modifiers['Bevel'].segments = 3
    bpy.ops.object.modifier_apply(modifier='Bevel')
    shade_smooth(nose)
    nose.data.materials.append(white)

    body.select_set(True)
    lid.select_set(True)
    nose.select_set(True)
    bpy.context.view_layer.objects.active = body
    return join_selected('ChassisBody')

def make_arm(angle_deg, length, white, dark):
    rad = math.radians(angle_deg)
    root = Vector((math.sin(rad) * 0.18, math.cos(rad) * 0.18, 0.0))
    tip = Vector((math.sin(rad) * length, math.cos(rad) * length, 0.0))
    mid = (root + tip) * 0.5
    direction = tip - root
    arm_len = direction.length

    bpy.ops.mesh.primitive_cube_add(size=1, location=mid)
    arm = bpy.context.active_object
    arm.name = f'Arm_{angle_deg}'
    arm.scale = (0.055, arm_len * 0.5, 0.04)
    bpy.ops.object.transform_apply(scale=True)
    arm.rotation_euler[2] = rad
    bpy.ops.object.transform_apply(rotation=True)
    bpy.ops.object.modifier_add(type='BEVEL')
    arm.modifiers['Bevel'].width = 0.012
    arm.modifiers['Bevel'].segments = 4
    bpy.ops.object.modifier_apply(modifier='Bevel')
    bpy.ops.object.modifier_add(type='SUBSURF')
    arm.modifiers['Subdivision'].levels = 1
    bpy.ops.object.modifier_apply(modifier='Subdivision')
    shade_smooth(arm)
    arm.data.materials.append(white)

    bpy.ops.mesh.primitive_cylinder_add(radius=0.065, depth=0.07, location=tip + Vector((0, 0, 0.01)), vertices=48)
    nacelle = bpy.context.active_object
    nacelle.name = f'Nacelle_{angle_deg}'
    bpy.ops.object.modifier_add(type='BEVEL')
    nacelle.modifiers['Bevel'].width = 0.008
    nacelle.modifiers['Bevel'].segments = 3
    bpy.ops.object.modifier_apply(modifier='Bevel')
    shade_smooth(nacelle)
    nacelle.data.materials.append(dark)

    bpy.ops.mesh.primitive_cylinder_add(radius=0.035, depth=0.055, location=tip + Vector((0, 0, 0.045)), vertices=32)
    motor = bpy.context.active_object
    motor.name = f'Motor_{angle_deg}'
    shade_smooth(motor)
    motor.data.materials.append(dark)

    bpy.ops.mesh.primitive_cylinder_add(radius=0.012, depth=0.04, location=tip + Vector((0, 0, 0.08)), vertices=16)
    hub = bpy.context.active_object
    hub.name = f'Hub_{angle_deg}'
    hub.data.materials.append(dark)

    props = []
    for i in range(2):
        bpy.ops.mesh.primitive_cube_add(size=1, location=tip + Vector((0, 0, 0.095)))
        blade = bpy.context.active_object
        blade.name = f'Blade_{angle_deg}_{i}'
        blade.scale = (0.22, 0.022, 0.004)
        bpy.ops.object.transform_apply(scale=True)
        blade.rotation_euler[2] = rad + math.radians(i * 90)
        blade.rotation_euler[0] = math.radians(8 if i == 0 else -8)
        bpy.ops.object.transform_apply(rotation=True)
        bpy.ops.object.modifier_add(type='BEVEL')
        blade.modifiers['Bevel'].width = 0.003
        blade.modifiers['Bevel'].segments = 2
        bpy.ops.object.modifier_apply(modifier='Bevel')
        shade_smooth(blade)
        blade.data.materials.append(dark)
        props.append(blade)

    arm.select_set(True)
    nacelle.select_set(True)
    motor.select_set(True)
    hub.select_set(True)
    for p in props:
        p.select_set(True)
    bpy.context.view_layer.objects.active = arm
    return join_selected(f'ArmAsm_{angle_deg}'), tip

def make_landing_gear(white):
    parts = []
    for side, y in (('L', 0.12), ('R', -0.12)):
        bpy.ops.mesh.primitive_torus_add(
            major_radius=0.16,
            minor_radius=0.012,
            major_segments=48,
            minor_segments=12,
            location=(0, y, -0.18),
            rotation=(math.radians(90), 0, 0),
        )
        skid = bpy.context.active_object
        skid.name = f'Skid_{side}'
        skid.scale = (1.15, 1.0, 0.55)
        bpy.ops.object.transform_apply(scale=True, rotation=True)
        shade_smooth(skid)
        skid.data.materials.append(white)
        parts.append(skid)

        for x in (-0.1, 0.1):
            bpy.ops.mesh.primitive_cylinder_add(
                radius=0.008,
                depth=0.22,
                location=(x, y, -0.05),
                vertices=16,
            )
            leg = bpy.context.active_object
            leg.name = f'Leg_{side}_{x}'
            leg.rotation_euler[1] = math.radians(18 if x > 0 else -18)
            bpy.ops.object.transform_apply(rotation=True)
            shade_smooth(leg)
            leg.data.materials.append(white)
            parts.append(leg)

    for p in parts:
        p.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    return join_selected('LandingGear')

def make_gimbal(dark, lens_mat):
    bpy.ops.mesh.primitive_cylinder_add(radius=0.03, depth=0.04, location=(0, 0.02, -0.12), vertices=24)
    yoke = bpy.context.active_object
    yoke.name = 'GimbalYoke'
    yoke.rotation_euler[0] = math.radians(90)
    bpy.ops.object.transform_apply(rotation=True)
    shade_smooth(yoke)
    yoke.data.materials.append(dark)

    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0.05, -0.14))
    cam = bpy.context.active_object
    cam.name = 'CameraBody'
    cam.scale = (0.055, 0.04, 0.04)
    bpy.ops.object.transform_apply(scale=True)
    bpy.ops.object.modifier_add(type='BEVEL')
    cam.modifiers['Bevel'].width = 0.006
    cam.modifiers['Bevel'].segments = 3
    bpy.ops.object.modifier_apply(modifier='Bevel')
    shade_smooth(cam)
    cam.data.materials.append(dark)

    bpy.ops.mesh.primitive_cylinder_add(radius=0.018, depth=0.02, location=(0, 0.075, -0.14), vertices=32)
    lens = bpy.context.active_object
    lens.name = 'Lens'
    lens.rotation_euler[0] = math.radians(90)
    bpy.ops.object.transform_apply(rotation=True)
    shade_smooth(lens)
    lens.data.materials.append(lens_mat)

    bpy.ops.mesh.primitive_cylinder_add(radius=0.006, depth=0.08, location=(0, 0, -0.08), vertices=12)
    stalk = bpy.context.active_object
    stalk.name = 'GimbalStalk'
    shade_smooth(stalk)
    stalk.data.materials.append(dark)

    yoke.select_set(True)
    cam.select_set(True)
    lens.select_set(True)
    stalk.select_set(True)
    bpy.context.view_layer.objects.active = yoke
    return join_selected('CameraGimbal')

def setup_world():
    world = bpy.data.worlds.new('StudioWorld')
    bpy.context.scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes['Background']
    bg.inputs[0].default_value = (0.85, 0.88, 0.92, 1)
    bg.inputs[1].default_value = 0.8

    bpy.ops.object.light_add(type='AREA', location=(2.5, -1.5, 3.0))
    key = bpy.context.active_object
    key.data.energy = 250
    key.data.size = 2.5
    key.rotation_euler = (math.radians(45), 0, math.radians(35))

    bpy.ops.object.light_add(type='AREA', location=(-2.0, 2.0, 1.5))
    fill = bpy.context.active_object
    fill.data.energy = 80
    fill.data.size = 3.0

    bpy.ops.object.camera_add(location=(1.6, -1.8, 1.0))
    cam = bpy.context.active_object
    cam.rotation_euler = (math.radians(60), 0, math.radians(40))
    bpy.context.scene.camera = cam

def build():
    clear_scene()
    white = mat('ShellWhite', (0.92, 0.93, 0.95), rough=0.28, metal=0.0)
    dark = mat('MotorDark', (0.08, 0.09, 0.1), rough=0.4, metal=0.55)
    lens_mat = mat('LensGlass', (0.05, 0.05, 0.08), rough=0.05, metal=0.9)

    body = make_body(white)
    arms = []
    for ang in (45, 135, 225, 315):
        arm, _ = make_arm(ang, 0.55, white, dark)
        arms.append(arm)

    gear = make_landing_gear(white)
    gimbal = make_gimbal(dark, lens_mat)

    body.select_set(True)
    for a in arms:
        a.select_set(True)
    gear.select_set(True)
    gimbal.select_set(True)
    bpy.context.view_layer.objects.active = body
    drone = join_selected('ConsumerQuad_Drone')
    drone.location = (0, 0, 0.22)

    bpy.ops.object.origin_set(type='ORIGIN_GEOMETRY', center='BOUNDS')
    shade_smooth(drone)

    setup_world()
    bpy.ops.view3d.view_all(center=False) if hasattr(bpy.ops.view3d, 'view_all') else None
    print(f"Built {drone.name}: verts={len(drone.data.vertices)} faces={len(drone.data.polygons)}")
    return drone

if __name__ == '__main__':
    build()
