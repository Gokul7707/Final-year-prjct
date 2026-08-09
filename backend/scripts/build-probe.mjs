import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const cwd = path.resolve('D:/Final-year-prjct/backend');
const logPath = path.join(cwd, 'build-probe.log');
fs.writeFileSync(logPath, `Starting build probe at ${new Date().toISOString()}\n`);
const child = spawn('npx', ['tsc', '-p', 'tsconfig.json', '--pretty', 'false'], { cwd, shell: true });
child.stdout.on('data', (chunk) => fs.appendFileSync(logPath, chunk));
child.stderr.on('data', (chunk) => fs.appendFileSync(logPath, chunk));
child.on('close', (code) => {
  fs.appendFileSync(logPath, `BUILD EXIT ${code}\n`);
});
