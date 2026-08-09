import { writeFileSync } from 'fs';
import { exec } from 'child_process';
const out = [];
const outPath = new URL('./inspect-port5000.txt', import.meta.url).pathname;
function write(msg) {
  out.push(msg);
}
function flush() {
  writeFileSync(outPath, out.join(''), { encoding: 'utf8' });
}
write(`inspect-port5000 started ${new Date().toISOString()}\n\n`);
exec('netstat -ano | findstr ":5000"', { windowsHide: true }, (err, stdout, stderr) => {
  write('=== netstat :5000 ===\n');
  write(stdout || '');
  write(stderr || '');
  write(`err=${err ? err.message : 'none'}\n\n`);
  exec('tasklist /fi "imagename eq node.exe" /fo csv', { windowsHide: true }, (err2, stdout2, stderr2) => {
    write('=== tasklist node.exe ===\n');
    write(stdout2 || '');
    write(stderr2 || '');
    write(`err2=${err2 ? err2.message : 'none'}\n\n`);
    exec('docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Ports}}"', { windowsHide: true }, (err3, stdout3, stderr3) => {
      write('=== docker ps ===\n');
      write(stdout3 || '');
      write(stderr3 || '');
      write(`err3=${err3 ? err3.message : 'none'}\n\n`);
      flush();
    });
  });
});
