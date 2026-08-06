import type { DroneConfig, DroneSpecs } from './types';

export function calculateDroneSpecs(config: DroneConfig): DroneSpecs {
  // Calculate total weight safely
  const frameWeight = config.frame?.weight || 0;
  const motorWeight = Array.isArray(config.motors) ? config.motors.reduce((sum, m) => sum + (m?.weight || 0), 0) : 0;
  const batteryWeight = config.battery?.weight || 0;
  const propellerWeight = Array.isArray(config.propellers) ? config.propellers.reduce((sum, p) => sum + (p?.weight || 0), 0) : 0;
  const escWeight = Array.isArray(config.escs) ? config.escs.reduce((sum, e) => sum + (e?.weight || 0), 0) : 0;
  const cameraWeight = config.camera?.weight || 0;
  const canopyWeight = config.canopy?.weight || 0;
  const harnessWeight = config.cameraHarness?.weight || 0;
  const whoopWeight = config.whoop?.weight || 0;

  const totalWeight =
    frameWeight + motorWeight + batteryWeight + propellerWeight + escWeight + cameraWeight + canopyWeight + harnessWeight + whoopWeight;

  const activeMotors = Array.isArray(config.motors) ? config.motors.filter((m) => m && m.thrustMax > 0) : [];
  const motorCount = activeMotors.length;
  const maxThrust = activeMotors.reduce((sum, m) => sum + m.thrustMax, 0);
  const thrustToWeight = totalWeight > 0 && maxThrust > 0 ? maxThrust / totalWeight : 0;

  // —— Hover current: prop-load model. For a propeller, shaft power scales with
  // thrust^1.5, so current at hover ≈ I_max × (T_hover / T_max)^1.5 per motor.
  const hoverThrustPerMotor = motorCount > 0 ? totalWeight / motorCount : 0;
  const refMotor = activeMotors[0];
  const hoverLoad = refMotor && refMotor.thrustMax > 0 ? hoverThrustPerMotor / refMotor.thrustMax : 1;
  const canHover = hoverLoad < 1 && motorCount > 0;
  const motorHoverCurrent = canHover ? refMotor.currentMax * Math.pow(hoverLoad, 1.5) : 0;
  const AVIONICS_DRAW_A = 0.6; // FC + RX + VTX baseline
  const hoverCurrent = canHover ? motorHoverCurrent * motorCount + AVIONICS_DRAW_A : 0;
  const maxCurrentDraw = activeMotors.reduce((sum, m) => sum + m.currentMax, 0) + AVIONICS_DRAW_A;

  // —— Flight time: usable capacity (80% for LiPo health) over hover draw.
  const capacityAh = (config.battery?.capacity || 0) / 1000;
  const estimatedFlightTime =
    canHover && hoverCurrent > 0 && capacityAh > 0
      ? Math.min((capacityAh * 0.8) / hoverCurrent * 60, 90)
      : 0;

  // —— Max speed: pitch speed (RPM × prop pitch) derated to ~72% for real-world
  // drag, sag, and prop slip — matches measured FPV top speeds.
  const refProp = Array.isArray(config.propellers)
    ? config.propellers.find((p) => p && p.diameter > 0)
    : undefined;
  const batteryVoltage = config.battery?.voltage || 0;
  const rpm = (refMotor?.kv || 0) * batteryVoltage;
  const pitchSpeedMs = (rpm / 60) * ((refProp?.pitch || 0) * 0.0254);
  const maxSpeed = canHover ? pitchSpeedMs * 3.6 * 0.72 : 0;

  // —— Live BOM cost (props ×2 sets: crash spares are part of every real build)
  const buildCost =
    (config.frame?.price || 0) +
    (Array.isArray(config.motors) ? config.motors.reduce((sum, m) => sum + (m?.price || 0), 0) : 0) +
    (config.battery?.price || 0) +
    (Array.isArray(config.propellers) ? config.propellers.reduce((sum, p) => sum + (p?.price || 0), 0) : 0) * 2 +
    (Array.isArray(config.escs) ? config.escs.reduce((sum, e) => sum + (e?.price || 0), 0) : 0) +
    (config.camera?.price || 0) +
    (config.canopy?.price || 0) +
    (config.cameraHarness?.price || 0) +
    (config.whoop?.price || 0);

  return {
    totalWeight: Math.round(totalWeight),
    maxThrust: Math.round(maxThrust),
    thrustToWeight: Math.round((thrustToWeight + Number.EPSILON) * 100) / 100,
    estimatedFlightTime: Math.round((estimatedFlightTime + Number.EPSILON) * 10) / 10,
    maxSpeed: Math.round((maxSpeed + Number.EPSILON) * 10) / 10,
    buildCost: Math.round(buildCost),
    hoverCurrent: Math.round((hoverCurrent + Number.EPSILON) * 10) / 10,
    hoverThrottle: canHover ? Math.round(Math.pow(hoverLoad, 0.5) * 100) : 0,
    maxCurrentDraw: Math.round((maxCurrentDraw + Number.EPSILON) * 10) / 10,
  };
}

export function generateBOM(config: DroneConfig): string {
  const specs = calculateDroneSpecs(config);
  
  const bom = `
DRONE BUILD - BILL OF MATERIALS
================================
Date: ${new Date().toLocaleDateString()}

COMPONENTS:
-----------
Frame: ${config.frame.name} - ₹${config.frame.price}
Motors (${config.motors.length}x): ${config.motors[0].name} - ₹${config.motors[0].price} each
Battery: ${config.battery.name} - ₹${config.battery.price}
Propellers (${config.propellers.length} types - 2 sets): ${config.propellers.map(p => `${p.name} (₹${p.price})`).join(', ')}
ESCs (${config.escs.length}x): ${config.escs.map(e => `${e.name} (₹${e.price})`).join(', ')}
Camera: ${config.camera.name} - ₹${config.camera.price}
Canopy: ${config.canopy?.name || 'None'} - ₹${config.canopy?.price || 0}
Camera Harness: ${config.cameraHarness?.name || 'None'} - ₹${config.cameraHarness?.price || 0}
Whoop Guards: ${config.whoop?.name || 'None'} - ₹${config.whoop?.price || 0}

SPECIFICATIONS:
---------------
Total Weight: ${specs.totalWeight}g
Max Thrust: ${specs.maxThrust}g
Thrust-to-Weight Ratio: ${specs.thrustToWeight}
Estimated Flight Time: ${specs.estimatedFlightTime} minutes
Max Speed: ${specs.maxSpeed} km/h
Build Cost: ₹${specs.buildCost}

BUILD NOTES:
-----------
- Ensure all components are compatible with selected voltage (${config.battery.cells}S)
- Check motor mounting compatibility with frame
- Verify ESC amp ratings match motor current requirements
- Test all connections before first flight
- Balance propellers for optimal performance
`;

  return bom;
}
