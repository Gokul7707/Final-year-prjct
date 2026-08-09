import { execFile } from 'node:child_process';
import { access, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PROJECT_ROOT = process.env.PROJECT_ROOT || path.resolve(__dirname, '../../..');
const MULTIROTOR_SCAD =
  process.env.MULTIROTOR_SCAD || path.join(PROJECT_ROOT, 'cad/genesis/multirotor.scad');
const OUTPUT_DIR = process.env.OUTPUT_DIR || path.join(PROJECT_ROOT, 'output/chassis');

const OPENSCAD_CANDIDATES = [
  process.env.OPENSCAD_PATH,
  'openscad',
  'C:\\Program Files\\OpenSCAD\\openscad.com',
  'C:\\Program Files\\OpenSCAD\\openscad.exe',
  '/usr/bin/openscad',
].filter(Boolean) as string[];

export interface ChassisGenParams {
  motorCount: number;
  wheelbaseMm: number;
  motorCageDiameter: number;
  motorCageDepth: number;
  batteryDimensions: [number, number];
  wallThickness: number;
  ducted?: boolean;
  landingGear?: boolean;
}

async function resolveOpenScad(): Promise<string> {
  for (const candidate of OPENSCAD_CANDIDATES) {
    try {
      if (candidate === 'openscad') {
        await execFileAsync(candidate, ['--version'], { timeout: 10_000 });
        return candidate;
      }
      await access(candidate);
      return candidate;
    } catch {
      /* next */
    }
  }
  throw new Error(
    'OpenSCAD not found. Install OpenSCAD or use the Docker backend image.'
  );
}

function buildScadSource(p: ChassisGenParams): string {
  const motors = [3, 4, 6, 8].includes(p.motorCount) ? p.motorCount : 4;
  const ducted = p.ducted ? 1 : 0;
  const gear = p.landingGear === false ? 0 : 1;
  const hub = Math.max(55, Math.min(140, p.wheelbaseMm * 0.28));
  const armW = Math.max(12, Math.min(28, p.wallThickness * 8));
  const batL = Math.max(40, p.batteryDimensions[0] * 4.5);
  const batW = Math.max(22, p.batteryDimensions[1] * 3.2);
  const batH = Math.max(18, p.wallThickness * 10);
  const includePath = MULTIROTOR_SCAD.replace(/\\/g, '/');

  return [
    `include <${includePath}>;`,
    `motor_count = ${motors};`,
    `wheelbase_mm = ${p.wheelbaseMm};`,
    `arm_width_mm = ${armW.toFixed(2)};`,
    `arm_thickness_mm = ${Math.max(4, p.wallThickness * 2.5).toFixed(2)};`,
    `hub_size_mm = ${hub.toFixed(2)};`,
    `hub_thickness_mm = ${Math.max(6, p.wallThickness * 3).toFixed(2)};`,
    `motor_mount_od_mm = ${Math.max(22, p.motorCageDiameter * 0.55).toFixed(2)};`,
    `motor_mount_id_mm = 10;`,
    `wall_mm = ${p.wallThickness};`,
    `ducted = ${ducted};`,
    `duct_od_mm = ${p.motorCageDiameter};`,
    `duct_height_mm = ${p.motorCageDepth};`,
    `battery_l_mm = ${batL.toFixed(2)};`,
    `battery_w_mm = ${batW.toFixed(2)};`,
    `battery_h_mm = ${batH.toFixed(2)};`,
    `landing_gear = ${gear};`,
    `gear_height_mm = ${Math.max(20, p.wheelbaseMm * 0.12).toFixed(2)};`,
    ``,
    `genesis_multirotor();`,
  ].join('\n');
}

/**
 * Versatile parametric chassis — one SCAD, any brief (quad/hexa/octo, size, ducts).
 * This is the prompt-based CAD pillar (not a finite GLB parts pack).
 */
export async function generateChassis(
  params: ChassisGenParams,
  jobTag?: string
): Promise<{ scadPath: string; stlPath: string; stlFilename: string; scadFilename: string; params: ChassisGenParams }> {
  await mkdir(OUTPUT_DIR, { recursive: true });

  const tag = `${params.motorCount}x_${params.wheelbaseMm}${jobTag ? `_${jobTag}` : ''}`;
  const scadFilename = `chassis_${tag}.scad`;
  const stlFilename = `chassis_${tag}.stl`;
  const scadPath = path.join(OUTPUT_DIR, scadFilename);
  const stlPath = path.join(OUTPUT_DIR, stlFilename);

  await writeFile(scadPath, buildScadSource(params), 'utf-8');

  const openscad = await resolveOpenScad();
  const libDir = path.dirname(MULTIROTOR_SCAD);
  await execFileAsync(openscad, ['-o', stlPath, scadPath], {
    timeout: 240_000,
    env: {
      ...process.env,
      OPENSCADPATH: [libDir, process.env.OPENSCADPATH].filter(Boolean).join(path.delimiter),
    },
    cwd: libDir,
  });

  return { scadPath, stlPath, stlFilename, scadFilename, params };
}

export { OUTPUT_DIR, PROJECT_ROOT, MULTIROTOR_SCAD };
