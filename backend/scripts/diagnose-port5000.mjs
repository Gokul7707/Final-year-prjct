import { exec } from 'child_process';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const outPath = `${__dirname}/diagnose-port5000.txt`;

function write(message) {
  writeFileSync(outPath, message, { encoding: 'utf8' });
}

function append(message) {
  writeFileSync(outPath, message, { encoding: 'utf8', flag: 'a' });
}

write(`diagnose-port5000 started at ${new Date().toISOString()}\n\n`);

exec('netstat -ano', { windowsHide: true }, (error, stdout, stderr) => {
  append('=== netstat -ano ===\n');
  append(stdout || '');
  append(stderr || '');
  append('\n');

  exec('tasklist /fi "imagename eq node.exe" /fo list', { windowsHide: true }, (taskErr, taskOut, taskErrOut) => {
    append('=== tasklist node.exe ===\n');
    append(taskOut || '');
    append(taskErrOut || '');
    append('\n');

    exec('powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue | Select-Object LocalAddress,LocalPort,RemoteAddress,State,OwningProcess | Format-Table -AutoSize | Out-String"', { windowsHide: true }, (psErr, psOut, psErrOut) => {
      append('=== Get-NetTCPConnection port 5000 ===\n');
      append(psOut || '');
      append(psErrOut || '');
      append('\n');

      append('=== done ===\n');
    });
  });
});
