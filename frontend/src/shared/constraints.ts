import type { DroneConfig } from './types';

export type CheckSeverity = 'pass' | 'warn' | 'fail';

export interface CompatCheck {
  id: string;
  severity: CheckSeverity;
  title: string;
  detail: string;
}

export interface CompatibilityReport {
  status: 'ok' | 'warnings' | 'critical';
  checks: CompatCheck[];
}

/** Parse voltage range strings like "3S-4S", "6S", "3S-6S" into [min, max] cells. */
function parseCellRange(voltage: string): [number, number] | null {
  const matches = voltage.match(/(\d+)\s*S/gi);
  if (!matches || matches.length === 0) return null;
  const cells = matches.map((m) => parseInt(m, 10)).filter((n) => n > 0);
  if (cells.length === 0) return null;
  return [Math.min(...cells), Math.max(...cells)];
}

const IN_TO_MM = 25.4;
// ~65% of the speed of sound — beyond this prop tips cavitate, scream, and shed efficiency.
const TIP_SPEED_LIMIT_MS = 220;

/**
 * Real build-compatibility solver: the same checks a human runs before
 * soldering — voltage windows, ESC headroom, prop clearance, RPM/tip-speed
 * limits, battery C-rate, hover margin, and payload budget.
 */
export function evaluateBuild(config: DroneConfig): CompatibilityReport {
  const checks: CompatCheck[] = [];
  const motor = config.motors[0];
  const esc = config.escs[0];
  const prop = config.propellers[0];
  const battery = config.battery;
  const frame = config.frame;
  const motorCount = config.motors.filter((m) => m && m.thrustMax > 0).length;

  const hasCore =
    frame?.armLength > 0 && motor?.thrustMax > 0 && battery?.cells > 0 && prop?.diameter > 0 && esc?.ampRating > 0;
  if (!hasCore) {
    return {
      status: 'warnings',
      checks: [
        {
          id: 'incomplete',
          severity: 'warn',
          title: 'Incomplete build',
          detail: 'Select a frame, motors, battery, props and ESC to run the full compatibility solve.',
        },
      ],
    };
  }

  // 1. Battery cells vs motor voltage window
  const motorRange = parseCellRange(motor.voltage);
  if (motorRange) {
    if (battery.cells < motorRange[0] || battery.cells > motorRange[1]) {
      checks.push({
        id: 'motor-voltage',
        severity: 'fail',
        title: 'Motor voltage mismatch',
        detail: `${battery.cells}S pack is outside the ${motor.name} window (${motor.voltage}). Over-volting burns windings; under-volting kills thrust.`,
      });
    } else {
      checks.push({
        id: 'motor-voltage',
        severity: 'pass',
        title: 'Motor voltage window',
        detail: `${battery.cells}S sits inside the motor's rated ${motor.voltage} range.`,
      });
    }
  }

  // 2. Battery cells vs ESC voltage window
  const escRange = parseCellRange(esc.voltage);
  if (escRange) {
    if (battery.cells < escRange[0] || battery.cells > escRange[1]) {
      checks.push({
        id: 'esc-voltage',
        severity: 'fail',
        title: 'ESC voltage mismatch',
        detail: `${battery.cells}S exceeds the ${esc.name} rating (${esc.voltage}). MOSFETs will pop on the first punch-out.`,
      });
    } else {
      checks.push({
        id: 'esc-voltage',
        severity: 'pass',
        title: 'ESC voltage window',
        detail: `${battery.cells}S is within the ESC's ${esc.voltage} rating.`,
      });
    }
  }

  // 3. ESC current headroom (industry rule: ≥1.2× motor peak current)
  const headroom = motor.currentMax > 0 ? esc.ampRating / motor.currentMax : Infinity;
  if (headroom < 1) {
    checks.push({
      id: 'esc-headroom',
      severity: 'fail',
      title: 'ESC undersized',
      detail: `${esc.ampRating}A ESC vs ${motor.currentMax}A motor peak — it will thermal-throttle or desync under load.`,
    });
  } else if (headroom < 1.2) {
    checks.push({
      id: 'esc-headroom',
      severity: 'warn',
      title: 'Thin ESC headroom',
      detail: `${esc.ampRating}A on a ${motor.currentMax}A motor is only ${headroom.toFixed(2)}× — aim for ≥1.2× to avoid hot MOSFETs.`,
    });
  } else {
    checks.push({
      id: 'esc-headroom',
      severity: 'pass',
      title: 'ESC headroom',
      detail: `${headroom.toFixed(1)}× current headroom (${esc.ampRating}A ESC / ${motor.currentMax}A motor peak).`,
    });
  }

  // 4. Prop clearance vs wheelbase (~0.62× wheelbase keeps blades off each other and the arms)
  const propMm = prop.diameter * IN_TO_MM;
  const maxPropMm = frame.armLength * 0.62;
  if (propMm > maxPropMm) {
    checks.push({
      id: 'prop-clearance',
      severity: 'fail',
      title: 'Props overlap the frame',
      detail: `${prop.diameter}″ props (${Math.round(propMm)}mm) exceed the ~${Math.round(maxPropMm)}mm clearance of a ${frame.armLength}mm-class frame.`,
    });
  } else if (propMm > maxPropMm * 0.92) {
    checks.push({
      id: 'prop-clearance',
      severity: 'warn',
      title: 'Tight prop clearance',
      detail: `${prop.diameter}″ props barely clear on this frame — flexy arms may let blades kiss under hard maneuvers.`,
    });
  } else {
    checks.push({
      id: 'prop-clearance',
      severity: 'pass',
      title: 'Prop clearance',
      detail: `${prop.diameter}″ props fit the ${frame.armLength}mm frame with margin.`,
    });
  }

  // 5. KV × voltage vs prop RPM / tip speed
  const rpm = motor.kv * battery.voltage;
  const tipSpeed = (rpm / 60) * Math.PI * (propMm / 1000);
  if (prop.maxRPM > 0 && rpm > prop.maxRPM) {
    checks.push({
      id: 'prop-rpm',
      severity: 'fail',
      title: 'Prop over-revved',
      detail: `${motor.kv}KV on ${battery.cells}S spins ~${Math.round(rpm).toLocaleString()} RPM — past the prop's ${prop.maxRPM.toLocaleString()} RPM rating. Blades can shed.`,
    });
  } else if (tipSpeed > TIP_SPEED_LIMIT_MS) {
    checks.push({
      id: 'prop-rpm',
      severity: 'warn',
      title: 'High tip speed',
      detail: `Prop tips reach ~${Math.round(tipSpeed)} m/s — loud and inefficient. Lower KV or smaller pitch fixes it.`,
    });
  } else {
    checks.push({
      id: 'prop-rpm',
      severity: 'pass',
      title: 'RPM / tip speed',
      detail: `~${Math.round(rpm).toLocaleString()} RPM unloaded, tips at ~${Math.round(tipSpeed)} m/s — inside safe limits.`,
    });
  }

  // 6. Battery C-rate vs total draw. Continuous C ratings carry ~30% burst
  // headroom, and all motors rarely peak together — so fail only past that.
  const availableAmps = (battery.capacity / 1000) * battery.maxDischarge;
  const peakDraw = motor.currentMax * motorCount;
  if (peakDraw > availableAmps * 1.3) {
    checks.push({
      id: 'battery-c',
      severity: 'fail',
      title: 'Battery can\u2019t feed the motors',
      detail: `${motorCount}× motors can pull ${Math.round(peakDraw)}A but the pack delivers ${Math.round(availableAmps)}A (${battery.capacity}mAh × ${battery.maxDischarge}C). Expect brutal sag.`,
    });
  } else if (peakDraw > availableAmps * 0.9) {
    checks.push({
      id: 'battery-c',
      severity: 'warn',
      title: 'Battery near C-limit',
      detail: `Peak draw ${Math.round(peakDraw)}A vs ${Math.round(availableAmps)}A continuous — full-throttle punches will sag the pack.`,
    });
  } else {
    checks.push({
      id: 'battery-c',
      severity: 'pass',
      title: 'Battery discharge margin',
      detail: `${Math.round(availableAmps)}A available vs ${Math.round(peakDraw)}A peak draw.`,
    });
  }

  // 7. Thrust-to-weight
  const totalWeight =
    frame.weight +
    config.motors.reduce((s, m) => s + (m?.weight || 0), 0) +
    battery.weight +
    config.propellers.reduce((s, p) => s + (p?.weight || 0), 0) +
    config.escs.reduce((s, e) => s + (e?.weight || 0), 0) +
    (config.camera?.weight || 0) +
    (config.canopy?.weight || 0) +
    (config.cameraHarness?.weight || 0) +
    (config.whoop?.weight || 0);
  const maxThrust = config.motors.reduce((s, m) => s + (m?.thrustMax || 0), 0);
  const twr = totalWeight > 0 ? maxThrust / totalWeight : 0;
  if (twr < 1.05) {
    checks.push({
      id: 'twr',
      severity: 'fail',
      title: 'Won\u2019t hover',
      detail: `Thrust-to-weight is ${twr.toFixed(2)}:1 — below 1.05 the airframe never leaves the bench. Bigger motors or lighter pack.`,
    });
  } else if (twr < 1.6) {
    checks.push({
      id: 'twr',
      severity: 'warn',
      title: 'Sluggish thrust margin',
      detail: `${twr.toFixed(2)}:1 hovers but has no authority for wind or maneuvers. 2:1 is the practical floor.`,
    });
  } else {
    checks.push({
      id: 'twr',
      severity: 'pass',
      title: 'Thrust-to-weight',
      detail: `${twr.toFixed(2)}:1 — ${twr > 6 ? 'race-grade snap' : twr > 3 ? 'strong freestyle authority' : 'stable flight margin'}.`,
    });
  }

  // 8. Frame payload budget (everything the arms carry except the plates themselves)
  const carried = totalWeight - frame.weight;
  if (frame.maxPayload > 0 && carried > frame.maxPayload) {
    checks.push({
      id: 'payload',
      severity: 'warn',
      title: 'Frame payload exceeded',
      detail: `Components total ${Math.round(carried)}g vs the frame's ${frame.maxPayload}g budget — arms will flex and resonate.`,
    });
  } else if (frame.maxPayload > 0) {
    checks.push({
      id: 'payload',
      severity: 'pass',
      title: 'Payload budget',
      detail: `${Math.round(carried)}g carried of ${frame.maxPayload}g frame budget.`,
    });
  }

  const status = checks.some((c) => c.severity === 'fail')
    ? 'critical'
    : checks.some((c) => c.severity === 'warn')
      ? 'warnings'
      : 'ok';

  return { status, checks };
}
