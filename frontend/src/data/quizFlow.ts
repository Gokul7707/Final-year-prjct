import type { DroneClassId } from './droneTypes';

export type AssemblyPartId =
  | 'chassis'
  | 'motors'
  | 'battery'
  | 'props'
  | 'avionics'
  | 'optics'
  | 'shell';

export interface QuizOption {
  id: string;
  label: string;
  hint?: string;
}

export interface QuizStep {
  id: string;
  part: AssemblyPartId;
  partLabel: string;
  question: string;
  subtext: string;
  options: QuizOption[];
}

export const ASSEMBLY_ORDER: { id: AssemblyPartId; label: string; icon: string }[] = [
  { id: 'chassis', label: 'Chassis Core', icon: '⬡' },
  { id: 'motors', label: 'Propulsion', icon: '⚙' },
  { id: 'battery', label: 'Power Cell', icon: '⚡' },
  { id: 'props', label: 'Rotors', icon: '◎' },
  { id: 'avionics', label: 'Avionics', icon: '◈' },
  { id: 'optics', label: 'Optics', icon: '◉' },
  { id: 'shell', label: 'Armor Shell', icon: '▣' },
];

/**
 * Chassis-first quiz aligned with real FPV/UAV build order
 * (frame → voltage/KV → battery → props → ESC headroom → camera → protection)
 * Sources: Oscar Liang motor/frame guides, ESC–prop matching practice.
 */
const BASE_QUIZ: QuizStep[] = [
  {
    id: 'wheelbase',
    part: 'chassis',
    partLabel: 'Chassis Core',
    question: 'What wheelbase class is the chassis?',
    subtext: 'Frame size sets max prop diameter and motor stator range (motor-to-motor diagonal).',
    options: [
      { id: '5in', label: '5″ freestyle / race (~210–250mm)', hint: 'Most common build' },
      { id: '7in', label: '7″ long-range (~300–350mm)', hint: 'Efficiency & cruise' },
      { id: 'cine', label: 'Cine / imaging frame (450mm class)', hint: 'Stable hover' },
      { id: 'heavy', label: 'Hex / heavy-lift (>600mm)', hint: 'Payload first' },
    ],
  },
  {
    id: 'material',
    part: 'chassis',
    partLabel: 'Chassis Core',
    question: 'Which chassis material stack?',
    subtext: 'Stiffness vs crash survivability — carbon plates are the industrial default.',
    options: [
      { id: 'carbon', label: 'Carbon fiber plates', hint: 'Stiff & light' },
      { id: 'hybrid', label: 'Carbon + aluminum standoffs', hint: 'Serviceable' },
      { id: 'tpu', label: 'TPU / flexible whoop body', hint: 'Indoor soft crashes' },
      { id: 'titanium', label: 'Carbon + titanium hardware', hint: 'Enterprise duty' },
    ],
  },
  {
    id: 'voltage',
    part: 'battery',
    partLabel: 'Power Cell',
    question: 'Which pack voltage will the chassis run?',
    subtext: 'Cell count drives motor KV choice — higher S needs lower KV for the same prop.',
    options: [
      { id: '4s', label: '4S (~14.8V)', hint: 'Punchy, classic' },
      { id: '6s', label: '6S (~22.2V)', hint: 'Less sag, modern' },
      { id: '6s-endurance', label: '6S high capacity', hint: 'Long sortie' },
      { id: '12s', label: 'High-voltage lift pack', hint: 'Heavy platforms' },
    ],
  },
  {
    id: 'kv',
    part: 'motors',
    partLabel: 'Propulsion Units',
    question: 'Pick the motor KV profile for that voltage',
    subtext: 'Rule of thumb: larger props / higher S → lower KV; racing 5″ on 4S → higher KV.',
    options: [
      { id: 'high', label: 'High KV (snap / race)', hint: 'Smaller props' },
      { id: 'mid', label: 'Mid KV (freestyle balance)', hint: '5″ sweet spot' },
      { id: 'low', label: 'Low KV (torque / efficiency)', hint: '7″+ & cine' },
      { id: 'ultra-low', label: 'Ultra-low KV (lift motors)', hint: 'Hex / octo' },
    ],
  },
  {
    id: 'props',
    part: 'props',
    partLabel: 'Rotor Blades',
    question: 'Prop diameter × pitch priority?',
    subtext: 'Bigger diameter = efficiency; higher pitch = speed but more current draw.',
    options: [
      { id: 'race', label: '5″ high pitch — top speed', hint: 'Hot amps' },
      { id: 'freestyle', label: '5″ mid pitch — balanced', hint: 'Daily driver' },
      { id: 'lr', label: '7–10″ low pitch — endurance', hint: 'Long range' },
      { id: 'quiet', label: 'Ducted / low tip-speed', hint: 'Quiet cinema' },
    ],
  },
  {
    id: 'esc',
    part: 'avionics',
    partLabel: 'Flight Computer',
    question: 'ESC continuous rating headroom?',
    subtext: 'Size ESC ≥ ~1.2–1.5× peak motor current so MOSFETs don’t thermal-throttle mid-punch.',
    options: [
      { id: '20a', label: '20A class (whoop / light)', hint: 'Small builds' },
      { id: '40a', label: '40–45A class (5″ standard)', hint: 'Most freestyle' },
      { id: '60a', label: '55–60A class (race / cine)', hint: 'High draw' },
      { id: '80a', label: '80A+ class (lift)', hint: 'Heavy motors' },
    ],
  },
  {
    id: 'camera',
    part: 'optics',
    partLabel: 'Vision Module',
    question: 'What vision stack mounts on the nose?',
    subtext: 'FPV for piloting latency; HD/cinema glass for recording — dual if budget allows.',
    options: [
      { id: 'none', label: 'No camera', hint: 'Line of sight' },
      { id: 'fpv', label: 'Low-latency FPV only', hint: 'Race / freestyle' },
      { id: 'hd', label: 'Stabilized HD / 4K', hint: 'Imaging' },
      { id: 'dual', label: 'FPV + HD dual', hint: 'Pro film' },
    ],
  },
  {
    id: 'armor',
    part: 'shell',
    partLabel: 'Armor Shell',
    question: 'How should the airframe be protected?',
    subtext: 'Open carbon for weight; ducts/canopy for indoor and enterprise durability.',
    options: [
      { id: 'open', label: 'Open frame', hint: 'Max cooling' },
      { id: 'canopy', label: 'Electronics canopy', hint: 'Weather splash' },
      { id: 'ducts', label: 'Full prop ducts / guards', hint: 'Indoor safe' },
      { id: 'armor', label: 'Carbon armored shell', hint: 'Field abuse' },
    ],
  },
];

export function getQuizForClass(droneClass: DroneClassId | null): QuizStep[] {
  // Prefer class-relevant defaults via label nudges; same technical questions for all.
  if (droneClass === 'racing-fpv') {
    return BASE_QUIZ.map((s) =>
      s.id === 'wheelbase'
        ? {
            ...s,
            options: s.options.map((o) =>
              o.id === '5in' ? { ...o, label: '5″ freestyle / race (recommended)' } : o
            ),
          }
        : s
    );
  }
  if (droneClass === 'cinewhoop' || droneClass === 'photography') {
    return BASE_QUIZ.map((s) =>
      s.id === 'wheelbase'
        ? {
            ...s,
            options: s.options.map((o) =>
              o.id === 'cine' ? { ...o, label: 'Cine / imaging frame (recommended)' } : o
            ),
          }
        : s
    );
  }
  if (droneClass === 'heavy-lift' || droneClass === 'industrial') {
    return BASE_QUIZ.map((s) =>
      s.id === 'wheelbase'
        ? {
            ...s,
            options: s.options.map((o) =>
              o.id === 'heavy' ? { ...o, label: 'Hex / heavy-lift (recommended)' } : o
            ),
          }
        : s
    );
  }
  return BASE_QUIZ;
}

export function resolvePartsFromAnswers(
  answers: Record<string, string>,
  preferredFrameId: string
): {
  frameId: string;
  motorId: string;
  batteryId: string;
  propellerId: string;
  escId: string;
  cameraId: string;
  canopyId: string;
  whoopId: string;
} {
  const frameFromWheelbase: Record<string, string> = {
    '5in': 'frame-quad-250',
    '7in': 'frame-quad-450',
    cine: 'frame-quad-450',
    heavy: 'frame-hexa-600',
  };

  const motorFromKv: Record<string, string> = {
    high: 'motor-2204-2300kv',
    mid: 'motor-2306-1750kv',
    low: 'motor-2312-1000kv',
    'ultra-low': 'motor-5008-340kv',
  };

  const batteryFromVoltage: Record<string, string> = {
    '4s': 'battery-1500-4s',
    '6s': 'battery-1400-6s',
    '6s-endurance': 'battery-6750-6s',
    '12s': 'battery-10000-6s',
  };

  const propFromChoice: Record<string, string> = {
    race: 'prop-5045',
    freestyle: 'prop-6x4',
    lr: 'prop-10x55',
    quiet: 'prop-6x35',
  };

  const escFromChoice: Record<string, string> = {
    '20a': 'esc-20a',
    '40a': 'esc-40a',
    '60a': 'esc-60a',
    '80a': 'esc-80a',
  };

  const cameraFromChoice: Record<string, string> = {
    none: 'camera-none',
    fpv: 'camera-fpv-1',
    hd: 'camera-4k',
    dual: 'camera-4k',
  };

  const armor = answers.armor || 'canopy';
  const wheelbase = answers.wheelbase;

  return {
    frameId: (wheelbase && frameFromWheelbase[wheelbase]) || preferredFrameId || 'frame-quad-250',
    motorId: motorFromKv[answers.kv || 'mid'] || 'motor-2204-2300kv',
    batteryId: batteryFromVoltage[answers.voltage || '6s'] || 'battery-4250-6s',
    propellerId: propFromChoice[answers.props || 'freestyle'] || 'prop-6x4',
    escId: escFromChoice[answers.esc || '40a'] || 'esc-40a',
    cameraId: cameraFromChoice[answers.camera || 'fpv'] || 'camera-fpv-1',
    canopyId: armor === 'open' ? 'canopy-none' : armor === 'armor' ? 'canopy-carbon' : 'canopy-clear',
    whoopId: armor === 'ducts' ? 'whoop-ducted' : 'whoop-none',
  };
}
