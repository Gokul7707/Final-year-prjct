import assert from 'node:assert/strict';
import { buildDroneConfiguration, generateDroneAssembly } from '../src/cad/generateWhoop.ts';

const config = buildDroneConfiguration({
  droneType: 'quadcopter',
  frameType: 'x',
  numberOfMotors: 4,
  armLength: 240,
  armWidth: 18,
  armThickness: 3,
  frameLength: 130,
  frameWidth: 130,
  frameThickness: 8,
  motorSize: 28,
  propellerDiameter: 254,
  propellerPitch: 4.5,
  batteryLength: 70,
  batteryWidth: 30,
  batteryHeight: 20,
  batteryPosition: 'center',
  flightControllerPosition: 'center',
  escPosition: 'rear',
  gpsPosition: 'front',
  cameraPosition: 'front',
  antennaPosition: 'rear',
  landingGearType: 'leg',
  landingGearHeight: 28,
  payloadWeight: 600,
  material: 'carbon-fiber-composite',
  color: 'carbon',
  manufacturingMethod: '3d-print',
  cameraEnabled: true,
  gpsEnabled: true,
  antennaEnabled: true,
}, 'test-quad');

const result = await generateDroneAssembly(config, 'test-quad');
assert.equal(result.validation.motorCount, 4);
assert.equal(result.validation.armCount, 4);
assert.match(result.scadSource, /module arm/);
assert.match(result.scadSource, /module motor_mount/);
console.log('generateDroneAssembly config-driven unit test passed');
