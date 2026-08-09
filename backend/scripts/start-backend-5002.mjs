import { spawn } from 'child_process';
import path from 'path';

const cwd = path.resolve('D:/Final-year-prjct/backend');
const child = spawn('node', ['dist/server.js'], {
  cwd,
  env: { ...process.env, PORT: '5002' },
  stdio: ['ignore', 'inherit', 'inherit'],
});

child.on('exit', (code, signal) => {
  console.log(`Backend process exited with code=${code} signal=${signal}`);
});
