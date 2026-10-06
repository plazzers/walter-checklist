// Rebuild data/checklist.js from CHECKLIST_CONTENT.md.
// Usage (from the repo folder):  node tools/build-checklist.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { parseChecklist, toModuleSource } = require('./checklist-parser.js');

const root = new URL('..', import.meta.url);
const md = readFileSync(new URL('CHECKLIST_CONTENT.md', root), 'utf8');
const data = parseChecklist(md);

if (data.errors.length) {
  console.error('Problems found in CHECKLIST_CONTENT.md:\n' + data.errors.join('\n'));
  process.exit(1);
}
writeFileSync(new URL('data/checklist.js', root), toModuleSource(data));
const count = data.areas.reduce((n, a) => n + a.items.length, 0);
console.log(`Wrote data/checklist.js: ${data.areas.length} areas, ${count} items, ${data.sellerQuestions.length} seller questions.`);
