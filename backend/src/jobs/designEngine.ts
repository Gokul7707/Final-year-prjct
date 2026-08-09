import {
  droneFrames,
  motors,
  batteries,
  propellers,
  escs,
} from '../shared/database.js';
import { calculateDroneSpecs } from '../shared/calculator.js';
import type { DroneConfig } from '../shared/types.js';
import type {
  BomLine,
  ChassisParams,
  DesignAlternative,
  DesignBrief,
  DesignPartIds,
} from '../types/genesis.js';

interface Candidate {
  name: string;
  tagline: string;
  parts: DesignPartIds;
  chassis: Omit<ChassisParams, 'material' | 'manufacturing'>;
}

const DEFAULTS = {
  cameraId: 'camera-fpv-1',
  canopyId: 'canopy-none',
  whoopId: 'whoop-none',
};

function candidate(
  name: string,
  tagline: string,
  parts: Partial<DesignPartIds>,
  chassis: Omit<ChassisParams, 'material' | 'manufacturing'>
): Candidate {
  return {
    name,
    tagline,
    chassis,
    parts: {
      frameId: 'frame-quad-250',
      motorId: 'motor-2306-1750kv',
      batteryId: 'battery-1400-6s',
      propellerId: 'prop-5045',
      escId: 'esc-60a',
      ...DEFAULTS,
      ...parts,
    },
  };
}

const CANDIDATES: Record<DesignBrief['application'], Candidate[]> = {
  racing: [
    candidate('GX-1 Vector', '6S race chassis — pitch speed first', {}, {
      wheelbaseMm: 250, motorCageDiameter: 56, motorCageDepth: 16, batteryDimensions: [15.6, 7.4], strutCount: 4, wallThickness: 1.75, motorMounts: 4,
    }),
    candidate('GX-1 Striker', '4S classic — durable print walls', {
      motorId: 'motor-2204-2300kv', batteryId: 'battery-1500-4s', escId: 'esc-40a',
    }, {
      wheelbaseMm: 220, motorCageDiameter: 52, motorCageDepth: 15, batteryDimensions: [15.6, 7.4], strutCount: 4, wallThickness: 2.0, motorMounts: 4,
    }),
    candidate('GX-1 Compact', '5\" tight-gate chassis', {
      batteryId: 'battery-1500-4s', escId: 'esc-40a',
    }, {
      wheelbaseMm: 210, motorCageDiameter: 48, motorCageDepth: 14, batteryDimensions: [11.9, 7.0], strutCount: 3, wallThickness: 1.5, motorMounts: 4,
    }),
  ],
  freestyle: [
    candidate('GX-2 Flow', '6S freestyle daily chassis', { canopyId: 'canopy-clear' }, {
      wheelbaseMm: 250, motorCageDiameter: 56, motorCageDepth: 16, batteryDimensions: [15.6, 7.4], strutCount: 4, wallThickness: 1.75, motorMounts: 4,
    }),
    candidate('GX-2 Punch', 'High-draw tune, thicker arms', { escId: 'esc-60a', canopyId: 'canopy-smoked' }, {
      wheelbaseMm: 255, motorCageDiameter: 58, motorCageDepth: 17, batteryDimensions: [15.6, 7.4], strutCount: 4, wallThickness: 2.0, motorMounts: 4,
    }),
    candidate('GX-2 Cruiser', '4S softer park flyer', {
      motorId: 'motor-2204-2300kv', batteryId: 'battery-1500-4s', escId: 'esc-40a', canopyId: 'canopy-clear',
    }, {
      wheelbaseMm: 230, motorCageDiameter: 52, motorCageDepth: 15, batteryDimensions: [15.6, 7.4], strutCount: 4, wallThickness: 1.75, motorMounts: 4,
    }),
  ],
  cinema: [
    candidate('GX-3 Director', 'Imaging platform, stabilized pack bay', {
      frameId: 'frame-quad-450', motorId: 'motor-2312-1000kv', batteryId: 'battery-4250-6s',
      propellerId: 'prop-10inch', escId: 'esc-40a', cameraId: 'camera-4k', canopyId: 'canopy-clear',
    }, {
      wheelbaseMm: 450, motorCageDiameter: 72, motorCageDepth: 22, batteryDimensions: [22, 12], strutCount: 4, wallThickness: 2.2, motorMounts: 4,
    }),
    candidate('GX-3 LongTake', 'Endurance pack geometry', {
      frameId: 'frame-quad-450', motorId: 'motor-2312-1000kv', batteryId: 'battery-6750-6s',
      propellerId: 'prop-10inch', escId: 'esc-40a', cameraId: 'camera-4k', canopyId: 'canopy-clear',
    }, {
      wheelbaseMm: 480, motorCageDiameter: 74, motorCageDepth: 22, batteryDimensions: [24, 14], strutCount: 4, wallThickness: 2.2, motorMounts: 4,
    }),
    candidate('GX-3 Whisper', 'Ducted quiet set chassis', {
      frameId: 'frame-quad-450', motorId: 'motor-2312-1000kv', batteryId: 'battery-4250-6s',
      propellerId: 'prop-8x45', escId: 'esc-40a', cameraId: 'camera-4k', whoopId: 'whoop-ducted',
    }, {
      wheelbaseMm: 380, motorCageDiameter: 68, motorCageDepth: 28, batteryDimensions: [22, 12], strutCount: 4, wallThickness: 2.0, motorMounts: 4,
    }),
  ],
  'long-range': [
    candidate('GX-4 Nomad', 'Efficiency cruiser chassis', {
      frameId: 'frame-quad-450', motorId: 'motor-2312-1000kv', batteryId: 'battery-6750-6s',
      propellerId: 'prop-10x55', escId: 'esc-40a', canopyId: 'canopy-clear',
    }, {
      wheelbaseMm: 500, motorCageDiameter: 74, motorCageDepth: 20, batteryDimensions: [24, 14], strutCount: 4, wallThickness: 2.0, motorMounts: 4,
    }),
    candidate('GX-4 Sprint', 'Long-range with pace', {
      frameId: 'frame-quad-450', motorId: 'motor-2312-1000kv', batteryId: 'battery-4250-6s',
      propellerId: 'prop-9x50', escId: 'esc-60a', canopyId: 'canopy-clear',
    }, {
      wheelbaseMm: 460, motorCageDiameter: 70, motorCageDepth: 19, batteryDimensions: [22, 12], strutCount: 4, wallThickness: 1.9, motorMounts: 4,
    }),
    candidate('GX-4 Ultra', 'Maximum capacity bay', {
      frameId: 'frame-quad-450', motorId: 'motor-2312-1000kv', batteryId: 'battery-10000-6s',
      propellerId: 'prop-10x55', escId: 'esc-40a', canopyId: 'canopy-clear',
    }, {
      wheelbaseMm: 550, motorCageDiameter: 78, motorCageDepth: 22, batteryDimensions: [28, 16], strutCount: 4, wallThickness: 2.3, motorMounts: 4,
    }),
  ],
  'heavy-lift': [
    candidate('GX-5 Atlas', 'Hexa lift workhorse', {
      frameId: 'frame-hexa-600', motorId: 'motor-5008-340kv', batteryId: 'battery-10000-6s',
      propellerId: 'prop-12x50', escId: 'esc-80a', cameraId: 'camera-none', canopyId: 'canopy-carbon',
    }, {
      wheelbaseMm: 600, motorCageDiameter: 90, motorCageDepth: 28, batteryDimensions: [32, 18], strutCount: 4, wallThickness: 2.5, motorMounts: 6,
    }),
    candidate('GX-5 Titan', 'Bigger discs, more margin', {
      frameId: 'frame-hexa-600', motorId: 'motor-5008-340kv', batteryId: 'battery-10000-6s',
      propellerId: 'prop-14inch', escId: 'esc-80a', cameraId: 'camera-none', canopyId: 'canopy-carbon',
    }, {
      wheelbaseMm: 680, motorCageDiameter: 100, motorCageDepth: 30, batteryDimensions: [32, 18], strutCount: 4, wallThickness: 2.6, motorMounts: 6,
    }),
    candidate('GX-5 Scout', 'Lift + imaging bay', {
      frameId: 'frame-hexa-600', motorId: 'motor-4006-340kv', batteryId: 'battery-6750-6s',
      propellerId: 'prop-12x50', escId: 'esc-80a', cameraId: 'camera-4k', canopyId: 'canopy-carbon',
    }, {
      wheelbaseMm: 620, motorCageDiameter: 88, motorCageDepth: 28, batteryDimensions: [28, 16], strutCount: 4, wallThickness: 2.4, motorMounts: 6,
    }),
  ],
  industrial: [
    candidate('GX-6 Rig', 'Octo redundancy chassis', {
      frameId: 'frame-octo-800', motorId: 'motor-5008-340kv', batteryId: 'battery-10000-6s',
      propellerId: 'prop-12x50', escId: 'esc-80a', cameraId: 'camera-4k', canopyId: 'canopy-carbon',
    }, {
      wheelbaseMm: 800, motorCageDiameter: 100, motorCageDepth: 30, batteryDimensions: [34, 20], strutCount: 4, wallThickness: 2.8, motorMounts: 8,
    }),
    candidate('GX-6 Surveyor', 'Slow survey geometry', {
      frameId: 'frame-octo-800', motorId: 'motor-5008-340kv', batteryId: 'battery-10000-6s',
      propellerId: 'prop-14inch', escId: 'esc-80a', cameraId: 'camera-4k', canopyId: 'canopy-carbon',
    }, {
      wheelbaseMm: 860, motorCageDiameter: 110, motorCageDepth: 32, batteryDimensions: [34, 20], strutCount: 4, wallThickness: 2.8, motorMounts: 8,
    }),
    candidate('GX-6 Compact', 'Hexa when octo is overkill', {
      frameId: 'frame-hexa-600', motorId: 'motor-5008-340kv', batteryId: 'battery-10000-6s',
      propellerId: 'prop-12x50', escId: 'esc-80a', cameraId: 'camera-4k', canopyId: 'canopy-carbon',
    }, {
      wheelbaseMm: 650, motorCageDiameter: 92, motorCageDepth: 28, batteryDimensions: [32, 18], strutCount: 4, wallThickness: 2.5, motorMounts: 6,
    }),
  ],
};

/** Infer layout overrides from free-text mission notes (prompt-based). */
function resolveApplication(brief: DesignBrief): DesignBrief['application'] {
  const n = (brief.notes || '').toLowerCase();
  if (/octo|octa|8[- ]?rotor|agricultur|spray|farm/.test(n)) return 'industrial';
  if (/hexa|6[- ]?rotor|heavy.?lift|cargo|payload/.test(n)) return 'heavy-lift';
  if (/cine|film|gimbal|whoop|duct/.test(n)) return 'cinema';
  if (/race|freestyle|fpv gate/.test(n)) return 'racing';
  if (/long.?range|endurance|cruise/.test(n)) return 'long-range';
  return brief.application;
}

function buildConfig(parts: DesignPartIds): DroneConfig | null {
  const frame = droneFrames.find((f) => f.id === parts.frameId);
  const motor = motors.find((m) => m.id === parts.motorId);
  const battery = batteries.find((b) => b.id === parts.batteryId);
  const prop = propellers.find((p) => p.id === parts.propellerId);
  const esc = escs.find((e) => e.id === parts.escId);
  if (!frame || !motor || !battery || !prop || !esc) return null;
  const n = Math.max(1, frame.motorMounts);
  return {
    frame,
    motors: Array(n).fill(motor),
    battery,
    propellers: Array(n).fill(prop),
    escs: Array(n).fill(esc),
    camera: {
      id: parts.cameraId,
      name: parts.cameraId.includes('4k') ? 'HD Camera' : parts.cameraId.includes('none') ? 'No Camera' : 'FPV Camera',
      type: parts.cameraId.includes('4k') ? 'HD' : parts.cameraId.includes('none') ? 'NONE' : 'FPV',
      weight: parts.cameraId.includes('none') ? 0 : parts.cameraId.includes('4k') ? 25 : 15,
      fov: parts.cameraId.includes('none') ? 0 : 145,
      price: parts.cameraId.includes('4k') ? 15000 : parts.cameraId.includes('none') ? 0 : 8000,
      tags: [],
    },
  };
}

function bomFromConfig(config: DroneConfig): BomLine[] {
  const n = config.motors.length;
  return [
    { label: 'Frame', detail: config.frame.name, price: config.frame.price },
    { label: `Motors ×${n}`, detail: config.motors[0].name, price: config.motors.reduce((s, m) => s + m.price, 0) },
    { label: 'Battery', detail: config.battery.name, price: config.battery.price },
    { label: 'Props (2 sets)', detail: config.propellers[0].name, price: config.propellers.reduce((s, p) => s + p.price, 0) * 2 },
    { label: `ESC ×${n}`, detail: config.escs[0].name, price: config.escs.reduce((s, e) => s + e.price, 0) },
  ].filter((l) => l.price > 0);
}

function safetyChecks(config: DroneConfig): DesignAlternative['safety'] {
  const motor = config.motors[0];
  const esc = config.escs[0];
  const battery = config.battery;
  const checks: DesignAlternative['safety'] = [];

  const headroom = motor.currentMax > 0 ? esc.ampRating / motor.currentMax : 99;
  if (headroom < 1) {
    checks.push({ severity: 'fail', title: 'ESC undersized', detail: `${esc.ampRating}A ESC vs ${motor.currentMax}A motor peak.` });
  } else if (headroom < 1.2) {
    checks.push({ severity: 'warn', title: 'Thin ESC headroom', detail: `${headroom.toFixed(2)}× current margin — aim for ≥1.2×.` });
  } else {
    checks.push({ severity: 'pass', title: 'ESC headroom', detail: `${headroom.toFixed(1)}× current margin.` });
  }

  const specs = calculateDroneSpecs(config);
  if (specs.thrustToWeight < 1.05) {
    checks.push({ severity: 'fail', title: 'Will not hover', detail: `T/W ${specs.thrustToWeight.toFixed(2)}:1.` });
  } else if (specs.thrustToWeight < 1.6) {
    checks.push({ severity: 'warn', title: 'Low thrust margin', detail: `T/W ${specs.thrustToWeight.toFixed(2)}:1.` });
  } else {
    checks.push({ severity: 'pass', title: 'Thrust-to-weight', detail: `${specs.thrustToWeight.toFixed(2)}:1.` });
  }

  const available = (battery.capacity / 1000) * battery.maxDischarge;
  const peak = motor.currentMax * config.motors.length;
  if (peak > available * 1.3) {
    checks.push({ severity: 'fail', title: 'Battery C-limit', detail: `Peak ${Math.round(peak)}A vs ${Math.round(available)}A pack.` });
  } else {
    checks.push({ severity: 'pass', title: 'Battery discharge', detail: `${Math.round(available)}A available.` });
  }

  return checks;
}

/** Plan 2–3 alternatives from the brief (catalog + physics). CAD fills stlUrl later. */
export function planAlternatives(brief: DesignBrief): DesignAlternative[] {
  const app = resolveApplication(brief);
  const list = CANDIDATES[app] || CANDIDATES.freestyle;
  const notesHint = app !== brief.application ? `Notes remapped application → ${app}. ` : '';

  const alts = list.map((c, idx) => {
    const config = buildConfig(c.parts);
    if (!config) {
      return {
        id: `alt-${idx + 1}`,
        name: c.name,
        tagline: c.tagline,
        score: 10,
        chassisParams: { ...c.chassis, material: brief.material, manufacturing: brief.manufacturing },
        partIds: c.parts,
        bom: [],
        specs: { totalWeight: 0, maxThrust: 0, thrustToWeight: 0, estimatedFlightTime: 0, maxSpeed: 0, buildCost: 0 },
        safety: [{ severity: 'fail', title: 'Catalog miss', detail: 'Part IDs missing from backend catalog.' }],
        justification: 'Could not resolve parts from catalog.',
        stlUrl: null,
        scadUrl: null,
      } satisfies DesignAlternative;
    }

    const specs = calculateDroneSpecs(config);
    const safety = safetyChecks(config);
    const bom = bomFromConfig(config);
    let score = 100;
    const reasons: string[] = notesHint ? [notesHint.trim()] : [];

    const fails = safety.filter((s) => s.severity === 'fail').length;
    const warns = safety.filter((s) => s.severity === 'warn').length;
    score -= fails * 15 + warns * 4;
    if (fails === 0 && warns === 0) reasons.push('Compatibility checks pass.');
    else reasons.push(`${fails} hard fault(s), ${warns} caution(s) from the solver.`);

    if (brief.budgetInr > 0 && specs.buildCost > brief.budgetInr) {
      const over = (specs.buildCost / brief.budgetInr - 1) * 100;
      score -= Math.min(30, over * 0.5);
      reasons.push(`₹${specs.buildCost.toLocaleString('en-IN')} over ₹${brief.budgetInr.toLocaleString('en-IN')} budget.`);
    } else if (brief.budgetInr > 0) {
      reasons.push(`Within budget at ₹${specs.buildCost.toLocaleString('en-IN')}.`);
    }

    if (brief.flightTimeMin > 0) {
      if (specs.estimatedFlightTime < brief.flightTimeMin) {
        score -= Math.min(25, (1 - specs.estimatedFlightTime / brief.flightTimeMin) * 50);
        reasons.push(`Hover ${specs.estimatedFlightTime} min vs ${brief.flightTimeMin} min target.`);
      } else {
        reasons.push(`Meets endurance: ${specs.estimatedFlightTime} min hover.`);
      }
    }

    const usable = Math.max(0, specs.maxThrust / 2 - specs.totalWeight);
    if (brief.payloadG > 0) {
      if (usable < brief.payloadG) {
        score -= 20;
        reasons.push(`~${Math.round(usable)}g safe payload vs ${brief.payloadG}g required.`);
      } else {
        reasons.push(`Carries ${brief.payloadG}g payload with margin.`);
      }
    }

    // Prefer 3D-print wall thickness for print manufacturing
    if (brief.manufacturing === '3d-print' && c.chassis.wallThickness >= 1.5) {
      reasons.push('Wall thickness suitable for FDM print.');
    }

    score = Math.round(Math.max(5, Math.min(99, score)));

    return {
      id: `alt-${idx + 1}`,
      name: c.name,
      tagline: c.tagline,
      score,
      chassisParams: { ...c.chassis, material: brief.material, manufacturing: brief.manufacturing },
      partIds: c.parts,
      bom,
      specs,
      safety,
      justification: reasons.join(' '),
      stlUrl: null,
      scadUrl: null,
    } satisfies DesignAlternative;
  });

  return alts.sort((a, b) => b.score - a.score);
}
