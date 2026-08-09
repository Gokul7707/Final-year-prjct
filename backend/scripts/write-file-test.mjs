import { writeFileSync } from 'fs';
writeFileSync(new URL('./write-file-output.txt', import.meta.url), 'OK', 'utf8');
