const prompt = process.argv.slice(2).join(' ') || 'Build me a long-range photo drone with FPV and HD camera support.';
const port = process.env.API_PORT || '5004';
const url = `http://127.0.0.1:${port}/api/ai-build-drone`;

console.log('Sending prompt to', url);
console.log('Prompt:', prompt);

const response = await fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ prompt }),
});

console.log('Status:', response.status, response.statusText);
const contentType = response.headers.get('content-type');
console.log('Content-Type:', contentType);

const text = await response.text();
console.log('Response body:\n', text);

try {
  const json = JSON.parse(text);
  console.log('\nParsed JSON:');
  console.dir(json, { depth: 5 });
} catch (err) {
  console.warn('\nFailed to parse response as JSON:', err.message);
}
