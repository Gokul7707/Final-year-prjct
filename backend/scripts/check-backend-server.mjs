import { writeFileSync } from 'fs';
import fetch from 'node-fetch';
const urlBase = 'http://127.0.0.1:5000';
const outPath = new URL('./check-backend-server.txt', import.meta.url).pathname;
function write(msg) { writeFileSync(outPath, msg, { encoding: 'utf8' }); }
function append(msg) { writeFileSync(outPath, msg, { encoding: 'utf8', flag: 'a' }); }
write(`check-backend-server started ${new Date().toISOString()}\n\n`);
for (const path of ['/health', '/api/parts', '/api/server-debug']) {
  try {
    const res = await fetch(urlBase + path, { method: 'GET' });
    const text = await res.text();
    append(`=== ${path} ===\nSTATUS=${res.status}\n${text}\n\n`);
  } catch (err) {
    append(`=== ${path} ERROR ===\n${err.stack || err}\n\n`);
  }
}
