import { execFile } from 'node:child_process';
import { access, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PROJECT_ROOT = process.env.PROJECT_ROOT || path.resolve(__dirname, '../../..');
const BLENDER_SCRIPT =
  process.env.BLENDER_SCRIPT || path.join(PROJECT_ROOT, 'cad/blender/generate_multirotor.py');
const OUTPUT_DIR = process.env.OUTPUT_DIR || path.join(PROJECT_ROOT, 'output/chassis');

const BLENDER_CANDIDATES = [
  process.env.BLENDER_PATH,
  'blender',
  'C:\\Program Files\\Blender Foundation\\Blender 4.3\\blender.exe',
  'C:\\Program Files\\Blender Foundation\\Blender 4.2\\blender.exe',
  'C:\\Program Files\\Blender Foundation\\Blender 4.1\\blender.exe',
  'C:\\Program Files\\Blender Foundation\\Blender 4.0\\blender.exe',
  'C:\\Program Files\\Blender Foundation\\Blender 3.6\\blender.exe',
  '/usr/bin/blender',
].filter(Boolean) as string[];

export interface BlenderChassisParams {
  motorCount: number;
  wheelbaseMm: number;
  motorCageDiameter: number;
  motorCageDepth: number;
  batteryDimensions: [number, number];
  wallThickness: number;
  ducted?: boolean;
  landingGear?: boolean;
}

async function resolveBlender(): Promise<string> {
  for (const candidate of BLENDER_CANDIDATES) {
    try {
      if (candidate === 'blender') {
        await execFileAsync(candidate, ['--version'], { timeout: 15_000 });
        return candidate;
      }
      await access(candidate);
      return candidate;
    } catch {
      /* next */
    }
  }
  throw new Error(
    'Blender not found. Install Blender and set BLENDER_PATH, or use the Docker image with Blender.'
  );
}

function toScriptParams(p: BlenderChassisParams, stlPath: string, glbPath: string) {
  const hub = Math.max(55, Math.min(160, p.wheelbaseMm * 0.28));
  return {
    motorCount: [3, 4, 6, 8].includes(p.motorCount) ? p.motorCount : 4,
    wheelbaseMm: p.wheelbaseMm,
    armWidthMm: Math.max(12, Math.min(32, p.wallThickness * 8)),
    hubSizeMm: hub,
    motorMountOdMm: Math.max(22, p.motorCageDiameter * 0.55),
    wallMm: p.wallThickness,
    ducted: !!p.ducted,
    ductOdMm: p.motorCageDiameter,
    ductHeightMm: p.motorCageDepth,
    batteryLMm: Math.max(40, p.batteryDimensions[0] * 4.5),
    batteryWMm: Math.max(22, p.batteryDimensions[1] * 3.2),
    batteryHMm: Math.max(18, p.wallThickness * 10),
    landingGear: p.landingGear !== false,
    gearHeightMm: Math.max(20, p.wheelbaseMm * 0.12),
    outStl: stlPath.replace(/\\/g, '/'),
    outGlb: glbPath.replace(/\\/g, '/'),
  };
}

/**
 * Phase 1 CAD via headless Blender (not the interactive Python Console).
 * Flow: brief params JSON → blender -b -P generate_multirotor.py -- params.json
 */
export async function generateBlenderChassis(
  params: BlenderChassisParams,
  jobTag?: string
): Promise<{
  stlPath: string;
  glbPath: string;
  stlFilename: string;
  glbFilename: string;
  scadFilename: string;
  paramsPath: string;
}> {
  await mkdir(OUTPUT_DIR, { recursive: true });

  const tag = `${params.motorCount}x_${params.wheelbaseMm}${jobTag ? `_${jobTag}` : ''}`;
  const stlFilename = `chassis_${tag}.stl`;
  const glbFilename = `chassis_${tag}.glb`;
  const paramsFilename = `chassis_${tag}.json`;
  const stlPath = path.join(OUTPUT_DIR, stlFilename);
  const glbPath = path.join(OUTPUT_DIR, glbFilename);
  const paramsPath = path.join(OUTPUT_DIR, paramsFilename);

  const payload = toScriptParams(params, stlPath, glbPath);
  await writeFile(paramsPath, JSON.stringify(payload, null, 2), 'utf-8');

  const blender = await resolveBlender();
  await execFileAsync(
    blender,
    ['-b', '-P', BLENDER_SCRIPT, '--', paramsPath],
    {
      timeout: 300_000,
      env: { ...process.env, GENESIS_CAD_JSON: paramsPath },
      maxBuffer: 20 * 1024 * 1024,
    }
  );

  await access(stlPath);

  let glbReady = glbFilename;
  try {
    await access(glbPath);
  } catch {
    glbReady = '';
  }

  return {
    stlPath,
    glbPath,
    stlFilename,
    glbFilename: glbReady,
    scadFilename: paramsFilename,
    paramsPath,
  };
}

export { OUTPUT_DIR, PROJECT_ROOT, BLENDER_SCRIPT };
