/**
 * Accurate BuildPlan from mission prompt + quiz answers.
 * Also emits Blender Python + OpenSCAD that encode every feature the user asked for.
 */
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import type { ChassisLayout } from '../types/genesis.js';

export type AssemblyPartId =
  | 'chassis'
  | 'motors'
  | 'battery'
  | 'props'
  | 'avionics'
  | 'optics'
  | 'shell';

export interface BuildPlan {
  layout: ChassisLayout;
  motorCount: number;
  wheelbaseMm: number;
  hasCamera: boolean;
  cameraType: 'none' | 'fpv' | 'hd' | 'dual' | 'action';
  hasDucts: boolean;
  material: string;
  voltage: string;
  application: string;
  parts: AssemblyPartId[];
  summary: string;
  features: string[];
  meshKit: 'whoop' | 'toothpick' | 'lift';
  blenderPython: string;
  openscadSnippet: string;
}

const LAYOUT_MOTORS: Record<string, number> = { tri: 3, quad: 4, hexa: 6, octa: 8 };

function parseLayout(raw: string | undefined, prompt: string): ChassisLayout {
  const blob = `${raw || ''} ${prompt}`.toLowerCase();
  if (blob.includes('oct')) return 'octa';
  if (blob.includes('hex')) return 'hexa';
  if (blob.includes('tri')) return 'tri';
  return 'quad';
}

function wheelbaseFor(layout: ChassisLayout, prompt: string): number {
  const p = prompt.toLowerCase();
  if (p.includes('whoop') || p.includes('65')) return 65;
  if (p.includes('75') || p.includes('indoor')) return 75;
  if (layout === 'hexa' || layout === 'octa') return 600;
  if (p.includes('7') || p.includes('long')) return 350;
  if (p.includes('5') || p.includes('race') || p.includes('freestyle')) return 250;
  return layout === 'tri' ? 330 : 250;
}

export function buildPlanFromBrief(input: {
  prompt: string;
  answers?: Record<string, string>;
  application?: string;
}): BuildPlan {
  const prompt = String(input.prompt || '');
  const answers = input.answers || {};
  const p = prompt.toLowerCase();
  const layout = parseLayout(answers.chassis, prompt);
  const motorCount = LAYOUT_MOTORS[layout] || 4;
  const wheelbaseMm = wheelbaseFor(layout, prompt);

  const cameraAns = (answers.optics || answers.camera || '').toLowerCase();
  let cameraType: BuildPlan['cameraType'] = 'fpv';
  if (cameraAns.includes('none') || p.includes('no camera') || p.includes('without camera')) cameraType = 'none';
  else if (cameraAns.includes('dual') || p.includes('fpv +') || p.includes('dual')) cameraType = 'dual';
  else if (
    cameraAns.includes('hd') ||
    cameraAns.includes('action') ||
    p.includes('gopro') ||
    p.includes('cinema') ||
    p.includes('4k') ||
    p.includes('action')
  )
    cameraType = p.includes('gopro') || p.includes('action') ? 'action' : 'hd';
  else if (cameraAns.includes('fpv') || p.includes('fpv')) cameraType = 'fpv';

  const hasCamera = cameraType !== 'none';
  const hasDucts =
    (answers.ducts || answers.armor || answers.prop_protection || '').toLowerCase().includes('duct') ||
    p.includes('whoop') ||
    p.includes('duct') ||
    p.includes('indoor') ||
    p.includes('quiet');

  const material = answers.material || (p.includes('tpu') ? 'tpu' : p.includes('titanium') ? 'titanium' : 'carbon');
  const voltage =
    answers.voltage ||
    answers.battery_config ||
    (p.includes('6s') ? '6s' : p.includes('4s') ? '4s' : p.includes('1s') ? '1s' : '6s');

  const application = input.application || 'freestyle';
  const meshKit: BuildPlan['meshKit'] =
    hasDucts || wheelbaseMm <= 100 ? 'whoop' : layout === 'hexa' || layout === 'octa' ? 'lift' : 'toothpick';

  const parts: AssemblyPartId[] = ['chassis', 'motors', 'battery', 'props', 'avionics'];
  if (hasCamera) parts.push('optics');
  parts.push('shell');

  const features: string[] = [
    `${layout} airframe (${motorCount} motors)`,
    `${wheelbaseMm}mm class wheelbase`,
    `${material} primary structure`,
    `${voltage} power system`,
  ];
  if (hasCamera) features.push(`vision: ${cameraType}`);
  else features.push('no camera / LOS');
  if (hasDucts) features.push('ducted / guarded props');
  if (p.includes('rtk')) features.push('RTK-ready avionics bay');
  if (p.includes('gopro') || cameraType === 'action') features.push('Action / GoPro mount');
  if (p.includes('payload') || p.includes('heavy')) features.push('payload bay clearance');

  const summary = `Accurate ${layout} build: ${features.slice(0, 4).join(' · ')}.`;

  const blenderPython = emitBlenderPython({
    layout,
    motorCount,
    wheelbaseMm,
    hasCamera,
    cameraType,
    hasDucts,
    material,
    prompt,
  });

  const openscadSnippet = emitOpenScad({
    layout,
    motorCount,
    wheelbaseMm,
    hasDucts,
    hasCamera,
  });

  return {
    layout,
    motorCount,
    wheelbaseMm,
    hasCamera,
    cameraType,
    hasDucts,
    material,
    voltage,
    application,
    parts,
    summary,
    features,
    meshKit,
    blenderPython,
    openscadSnippet,
  };
}

function emitBlenderPython(opts: {
  layout: string;
  motorCount: number;
  wheelbaseMm: number;
  hasCamera: boolean;
  cameraType: string;
  hasDucts: boolean;
  material: string;
  prompt: string;
}): string {
  const armLen = Math.max(40, opts.wheelbaseMm * 0.42);
  const promptEsc = opts.prompt.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  return `# Genesis Forge — accurate airframe from mission prompt
# Prompt: ${promptEsc}
# Layout: ${opts.layout} | motors: ${opts.motorCount} | wheelbase: ${opts.wheelbaseMm}mm
# Material: ${opts.material} | camera: ${opts.cameraType} | ducts: ${opts.hasDucts}
# Run in Blender Scripting (bpy) — generates REAL geometry matching the brief.

import bpy
import math

# cleanup
for obj in list(bpy.data.objects):
    bpy.data.objects.remove(obj, do_unlink=True)

MOTOR_COUNT = ${opts.motorCount}
WHEELBASE = ${opts.wheelbaseMm}
ARM_LEN = ${armLen}
HAS_CAMERA = ${opts.hasCamera ? 'True' : 'False'}
HAS_DUCTS = ${opts.hasDucts ? 'True' : 'False'}
CAMERA_TYPE = '${opts.cameraType}'

def add_cyl(name, r, d, loc, rot=(0,0,0), verts=32):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=d, location=loc)
    obj = bpy.context.active_object
    obj.name = name
    obj.rotation_euler = rot
    return obj

def add_cube(name, scale, loc):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = scale
    return obj

# Central body — plate thickness scales with wheelbase
body_r = max(18, WHEELBASE * 0.12)
add_cyl('Chassis_Core', body_r, 6, (0, 0, 0), verts=8 if MOTOR_COUNT >= 6 else 32)
add_cube('Payload_Bay', (body_r * 0.7, body_r * 0.45, 4), (0, 0, 5))

start = -math.pi / 2 if MOTOR_COUNT == 3 else math.pi / 4
for i in range(MOTOR_COUNT):
    a = start + i * (2 * math.pi / MOTOR_COUNT)
    x, y = math.cos(a) * ARM_LEN, math.sin(a) * ARM_LEN
    add_cyl(f'Carbon_Arm_{i+1}', 2.2, ARM_LEN * 0.95, (x/2, y/2, 0), rot=(math.pi/2, 0, a))
    add_cyl(f'Motor_{i+1}', 6.5, 12, (x, y, 4))
    add_cyl(f'Motor_Bell_{i+1}', 5.2, 4, (x, y, 11))
    # Prop hub + two blades — horizontal rotor disc (Blender Z-up)
    hub = add_cyl(f'Prop_Hub_{i+1}', 3.2, 2, (x, y, 14))
    # Thin in Z so the blade sleeps in the XY plane; spin later around Z
    blade_a = add_cube(f'Prop_Blade_{i+1}a', (22, 3.0, 0.45), (x, y, 14.6))
    blade_a.rotation_euler = (0, 0, a)
    blade_b = add_cube(f'Prop_Blade_{i+1}b', (22, 3.0, 0.45), (x, y, 14.6))
    blade_b.rotation_euler = (0, 0, a + math.pi / 2)
    if HAS_DUCTS:
        add_cyl(f'Prop_Duct_{i+1}', 24, 10, (x, y, 8), verts=48)
        # hollow look: inner cut is visual only in preview

# Battery — size from wheelbase
add_cube('Battery_Pack', (body_r * 0.9, body_r * 0.5, 8), (0, 0, -8))

# Avionics stack
add_cube('Flight_Controller', (body_r * 0.35, body_r * 0.35, 2), (0, 0, 8))
add_cube('ESC_4in1', (body_r * 0.4, body_r * 0.4, 2.5), (0, 0, 6))

if HAS_CAMERA:
    if CAMERA_TYPE in ('hd', 'action', 'dual'):
        add_cube('Action_Cam', (10, 6, 7), (body_r * 0.9, 0, 6))
    if CAMERA_TYPE in ('fpv', 'dual'):
        add_cyl('FPV_Cam', 4, 8, (body_r * 1.05, 0, 3), rot=(math.pi/2, 0, 0))

# Landing gear
for i, a in enumerate([math.pi/4, 3*math.pi/4, 5*math.pi/4, 7*math.pi/4][: min(4, MOTOR_COUNT)]):
    x, y = math.cos(a) * ARM_LEN * 0.55, math.sin(a) * ARM_LEN * 0.55
    add_cyl(f'Gear_Strut_{i+1}', 1.6, 18, (x, y, -12))

print(f'Genesis Forge built {MOTOR_COUNT}-motor {CAMERA_TYPE} airframe @ {WHEELBASE}mm')
`;
}

function emitOpenScad(opts: {
  layout: string;
  motorCount: number;
  wheelbaseMm: number;
  hasDucts: boolean;
  hasCamera: boolean;
}): string {
  return `// Genesis Forge OpenSCAD — ${opts.layout} / ${opts.motorCount} motors / ${opts.wheelbaseMm}mm
motor_count = ${opts.motorCount};
wheelbase = ${opts.wheelbaseMm};
has_ducts = ${opts.hasDucts ? 'true' : 'false'};
has_camera = ${opts.hasCamera ? 'true' : 'false'};
arm_len = wheelbase * 0.42;

module arm(i) {
  a = (motor_count == 3 ? -90 : 45) + i * (360 / motor_count);
  rotate([0,0,a]) translate([arm_len/2,0,0]) cube([arm_len, 6, 4], center=true);
  rotate([0,0,a]) translate([arm_len,0,4]) {
    cylinder(h=12, r=7, $fn=28);
    if (has_ducts) translate([0,0,2]) difference() {
      cylinder(h=10, r=26, $fn=48);
      translate([0,0,-1]) cylinder(h=12, r=22, $fn=48);
    }
    // prop disc
    translate([0,0,14]) cylinder(h=1.2, r=20, $fn=40);
  }
}

cylinder(h=6, r=max(18, wheelbase*0.12), $fn=32); // core
for (i = [0:motor_count-1]) arm(i);
translate([0,0,-8]) cube([max(30, wheelbase*0.2), max(16, wheelbase*0.1), 8], center=true); // battery
if (has_camera) translate([max(18, wheelbase*0.12)+8, 0, 4]) cube([12, 8, 8], center=true);
`;
}

export async function persistBuildArtifacts(
  projectRoot: string,
  jobHint: string,
  plan: BuildPlan
): Promise<{ pythonPath: string; scadPath: string }> {
  const dir = path.resolve(projectRoot, 'output', 'scripts');
  await mkdir(dir, { recursive: true });
  const stamp = `${Date.now().toString(36)}_${jobHint}`.replace(/[^a-z0-9_-]/gi, '');
  const pythonPath = path.join(dir, `genesis_${stamp}.py`);
  const scadPath = path.join(dir, `genesis_${stamp}.scad`);
  await writeFile(pythonPath, plan.blenderPython, 'utf-8');
  await writeFile(scadPath, plan.openscadSnippet, 'utf-8');
  return {
    pythonPath: `/output/scripts/${path.basename(pythonPath)}`,
    scadPath: `/output/scripts/${path.basename(scadPath)}`,
  };
}
