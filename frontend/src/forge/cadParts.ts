import type { AssemblyPartId } from '@/data/quizFlow';

export type ChassisLayout = 'tri' | 'quad' | 'hexa' | 'octa';

export const LAYOUT_MOTORS: Record<ChassisLayout, number> = {
  tri: 3,
  quad: 4,
  hexa: 6,
  octa: 8,
};

export const LAYOUT_FRAME_ID: Record<ChassisLayout, string> = {
  tri: 'frame-tri-330',
  quad: 'frame-quad-250',
  hexa: 'frame-hexa-600',
  octa: 'frame-octo-800',
};

export type MeshKit = 'cognifly' | 'toothpick' | 'cinema';

/** Real printable CAD from CogniFly + parametric toothpick + JeNo TPU */
export const CAD_PART_MESHES: Record<
  AssemblyPartId,
  { urls: string[]; label: string; color: number; note: string }
> = {
  chassis: {
    urls: [
      '/models/cad/toothpick/frame_75.stl',
      '/models/cad/cognifly/chassis_main.stl',
      '/models/cad/cognifly/frame_connector.stl',
    ],
    label: 'Chassis core',
    color: 0x0ea5e9,
    note: 'Toothpick 75mm frame + CogniFly core — real printable CAD',
  },
  motors: {
    urls: ['/models/cad/cognifly/motor_base.stl'],
    label: 'Motor mounts',
    color: 0xf59e0b,
    note: 'CogniFly TPU motor bases — one per arm (tri→octa)',
  },
  battery: {
    urls: ['/models/cad/cognifly/battery_holder.stl', '/models/cad/cognifly/battery_cap.stl'],
    label: 'Battery cradle',
    color: 0x22d3ee,
    note: 'CogniFly battery holder stack',
  },
  props: {
    urls: ['/models/cad/toothpick/prop_guards_75.stl'],
    label: 'Rotors + guards',
    color: 0x38bdf8,
    note: 'Prop guards (toothpick) + spinning blades at each motor',
  },
  avionics: {
    urls: ['/models/cad/cognifly/avionics_support.stl'],
    label: 'Avionics bay',
    color: 0x34d399,
    note: 'CogniFly FC / Pi support',
  },
  optics: {
    urls: [
      '/models/cad/jeno/JeNo5_1.5__Action2_25deg.stl',
      '/models/cad/cognifly/camera_l.stl',
      '/models/cad/jeno/JeNo5_1.5__Softmount_O4_O3.stl',
    ],
    label: 'Camera mount',
    color: 0x818cf8,
    note: 'JeNo Action2 / O3 softmount + CogniFly camera CAD',
  },
  shell: {
    urls: [
      '/models/cad/jeno/JeNo5_1.6_Bumper_Front_Cine.stl',
      '/models/cad/jeno/JeNo5_1.5__Bumper_Back.stl',
      '/models/cad/cognifly/landing_foot.stl',
      '/models/cad/cognifly/corner_support.stl',
    ],
    label: 'Landing & armor',
    color: 0x64748b,
    note: 'JeNo bumpers + CogniFly TPU feet',
  },
};

export const BUILD_TASKS: { id: AssemblyPartId; title: string; token: string }[] = [
  { id: 'chassis', title: 'Frame the airframe', token: 'CHASSIS' },
  { id: 'motors', title: 'Dock propulsion mounts', token: 'MOTORS' },
  { id: 'battery', title: 'Seat the power cell', token: 'BATTERY' },
  { id: 'props', title: 'Spin up rotors + guards', token: 'PROPS' },
  { id: 'avionics', title: 'Mount flight computer', token: 'AVIONICS' },
  { id: 'optics', title: 'Lock the vision stack', token: 'OPTICS' },
  { id: 'shell', title: 'Armor the airframe', token: 'SHELL' },
];

export function parseChassisLayout(raw: string | undefined | null): ChassisLayout {
  const v = (raw || '').toLowerCase();
  if (v.includes('oct')) return 'octa';
  if (v.includes('hex')) return 'hexa';
  if (v.includes('tri')) return 'tri';
  if (v.includes('quad') || v.includes('4') || v.includes('whoop')) return 'quad';
  return 'quad';
}

export type BuildPlan = {
  layout: ChassisLayout;
  motorCount: number;
  wheelbaseMm: number;
  hasCamera: boolean;
  hasDucts: boolean;
  material: string;
  voltage: string;
  parts: AssemblyPartId[];
  summary: string;
  features: string[];
  blenderPython: string;
  openscadSnippet: string;
};
