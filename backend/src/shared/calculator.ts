import type { DroneConfig, DroneSpecs } from './types.js';

export function calculateDroneSpecs(config: DroneConfig): DroneSpecs {
  // Calculate total weight
  const frameWeight = config.frame.weight;
  const motorWeight = config.motors.reduce((sum, m) => sum + m.weight, 0);
  const batteryWeight = config.battery.weight;
  const propellerWeight = config.propellers.reduce((sum, p) => sum + p.weight, 0);
  const escWeight = config.escs.reduce((sum, e) => sum + e.weight, 0);
  const cameraWeight = config.camera?.weight || 0;
  
  const totalWeight = frameWeight + motorWeight + batteryWeight + propellerWeight + escWeight + cameraWeight;

  // Calculate max thrust (sum of max thrust from all motors)
  const maxThrust = config.motors.reduce((sum, m) => sum + m.thrustMax, 0);

  // Calculate thrust to weight ratio
  const thrustToWeight = maxThrust / totalWeight;

  // Hover current via prop-load model: shaft power scales with thrust^1.5,
  // so hover current ≈ I_max × (T_hover / T_max)^1.5 per motor.
  const motorCount = config.motors.length;
  const refMotor = config.motors[0];
  const hoverLoad = refMotor && refMotor.thrustMax > 0 ? totalWeight / motorCount / refMotor.thrustMax : 1;
  const canHover = hoverLoad < 1 && motorCount > 0;
  const AVIONICS_DRAW_A = 0.6;
  const hoverCurrent = canHover ? refMotor.currentMax * Math.pow(hoverLoad, 1.5) * motorCount + AVIONICS_DRAW_A : 0;

  // Flight time from usable capacity (80%) over hover draw
  const capacityAh = config.battery.capacity / 1000;
  const estimatedFlightTime =
    canHover && hoverCurrent > 0 ? Math.min(((capacityAh * 0.8) / hoverCurrent) * 60, 90) : 0;

  // Max speed: pitch speed derated to ~72% for drag/sag/prop slip
  const refProp = config.propellers[0];
  const rpm = (refMotor?.kv || 0) * config.battery.voltage;
  const pitchSpeedMs = (rpm / 60) * ((refProp?.pitch || 0) * 0.0254);
  const maxSpeed = canHover ? pitchSpeedMs * 3.6 * 0.72 : 0;

  // Calculate build cost
  const buildCost = 
    config.frame.price +
    config.motors.reduce((sum, m) => sum + m.price, 0) +
    config.battery.price +
    config.propellers.reduce((sum, p) => sum + p.price, 0) * 2 + // 2 sets of propellers
    config.escs.reduce((sum, e) => sum + e.price, 0) +
    (config.camera?.price || 0);

  return {
    totalWeight: Math.round(totalWeight),
    maxThrust: Math.round(maxThrust),
    thrustToWeight: Math.round((thrustToWeight + Number.EPSILON) * 100) / 100,
    estimatedFlightTime: Math.round((estimatedFlightTime + Number.EPSILON) * 10) / 10,
    maxSpeed: Math.round((maxSpeed + Number.EPSILON) * 10) / 10,
    buildCost: Math.round(buildCost),
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
