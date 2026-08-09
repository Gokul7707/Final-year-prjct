import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateWhoopChassis } from '../src/cad/generateWhoop.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tempDir = path.join(__dirname, 'tmp-output');

test('generateWhoopChassis creates an STL artifact even without OpenSCAD installed', async () => {
  rmSync(tempDir, { recursive: true, force: true });
  process.env.OUTPUT_DIR = tempDir;
  process.env.OPENSCAD_PATH = 'C:/definitely/missing/openscad.exe';

  const result = await generateWhoopChassis({ wheelbase: 75, motorCageDiameter: 40, motorCageDepth: 16, batteryDimensions: [15, 7], strutCount: 4, wallThickness: 1.75 }, 'test');

  assert.equal(existsSync(result.stlPath), true);
  const stlText = readFileSync(result.stlPath, 'utf8');
  assert.match(stlText, /solid /i);
});
