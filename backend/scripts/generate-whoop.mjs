/**
 * Quick test: node scripts/generate-whoop.mjs 65
 * Generates STL in output/chassis/
 */
import { execFile } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');
const preset = process.argv[2] || '75';

const PRESETS = {
  '75mm': {
    wheelbase: 75,
    motorCageDiameter: 43,
    motorCageDepth: 15,
    batteryDimensions: [15.6, 7.4],
    strutCount: 4,
    wallThickness: 1.75,
  },
  '65mm': {
    wheelbase: 65,
    motorCageDiameter: 33,
    motorCageDepth: 13.5,
    batteryDimensions: [11.9, 7.0],
    strutCount: 3,
    wallThickness: 1.5,
  },
};

const params = PRESETS[`${preset}mm`] ?? PRESETS['75mm'];
const outDir = path.join(root, 'output/chassis');
await mkdir(outDir, { recursive: true });

const lines = ['include <whoop.scad>;', '', '// Auto-generated'];
if (params.wheelbase) lines.push(`whoop_xy_wheelbase = ${params.wheelbase};`);
if (params.motorCageDiameter) lines.push(`motor_cage_xy_diameter = ${params.motorCageDiameter};`);
if (params.motorCageDepth) lines.push(`motor_cage_z_depth = ${params.motorCageDepth};`);
if (params.batteryDimensions) lines.push(`battery_cage_xz_dimensions = [${params.batteryDimensions.join(', ')}];`);
if (params.strutCount) {
  lines.push(`motor_cage_strut_count = ${params.strutCount};`);
  if (params.strutCount === 3) lines.push('motor_cage_strut_z_angle = 0;');
}
if (params.wallThickness) {
  lines.push(`motor_base_z_thickness = ${params.wallThickness};`);
  lines.push(`motor_cage_xyz_thickness = ${params.wallThickness};`);
  lines.push(`battery_cage_xz_thickness = ${params.wallThickness};`);
}
lines.push('', 'whoop();');

const scadPath = path.join(outDir, `whoop_${params.wheelbase}mm.scad`);
const stlPath = path.join(outDir, `whoop_${params.wheelbase}mm.stl`);
await writeFile(scadPath, lines.join('\n'));

const openscad = process.env.OPENSCAD_PATH || 'C:\\Program Files\\OpenSCAD\\openscad.com';
const whoopDir = path.join(root, 'cad/whoop');
console.log(`Generating ${params.wheelbase}mm whoop...`);
await execFileAsync(openscad, ['-I', whoopDir, '-o', stlPath, scadPath], {
  timeout: 120_000,
});

console.log('Done!');
console.log('  SCAD:', scadPath);
console.log('  STL:', stlPath);
