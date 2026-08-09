import { writeFileSync } from 'fs';
const outPath = new URL('./check-backend-ports.txt', import.meta.url).pathname;
const urls = ['http://127.0.0.1:5000/health', 'http://127.0.0.1:5000/api/server-debug', 'http://127.0.0.1:5001/health', 'http://127.0.0.1:5001/api/server-debug'];
async function main() {
  let out = `check-backend-ports started ${new Date().toISOString()}\n\n`;
  for (const url of urls) {
    try {
      const res = await fetch(url, { method: 'GET' });
      const text = await res.text();
      out += `URL=${url}\nSTATUS=${res.status}\nBODY=${text}\n\n`;
    } catch (err) {
      out += `URL=${url}\nERROR=${err.stack || err}\n\n`;
    }
  }
  writeFileSync(outPath, out, { encoding: 'utf8' });
}
await main();
