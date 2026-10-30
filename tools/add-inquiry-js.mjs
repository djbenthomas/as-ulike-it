#!/usr/bin/env node
/* Adds the resilient inquiry-form script to every page that has a form.inq.
 * Idempotent: skips files that already reference assets/inquiry.js.
 * Usage: node tools/add-inquiry-js.mjs [--check]
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const TAG = '<script src="assets/inquiry.js" defer></script>';
const checkOnly = process.argv.includes('--check');

const pages = fs.readdirSync(ROOT)
  .filter(f => f.endsWith('.html'))
  .filter(f => fs.readFileSync(path.join(ROOT, f), 'utf8').includes('class="inq"'));

let changed = 0, already = 0, failed = [];

for (const f of pages) {
  const p = path.join(ROOT, f);
  let html = fs.readFileSync(p, 'utf8');

  if (html.includes('assets/inquiry.js')) { already++; continue; }

  const idx = html.lastIndexOf('</body>');
  if (idx === -1) { failed.push(f); continue; }

  const patched = html.slice(0, idx) + TAG + '\n' + html.slice(idx);
  if (!checkOnly) fs.writeFileSync(p, patched);
  changed++;
}

console.log(`inquiry.js inject: ${pages.length} pages with forms | ${changed} ${checkOnly ? 'would change' : 'patched'} | ${already} already ok | ${failed.length} failed`);
if (failed.length) { console.log('no </body>: ' + failed.join(', ')); process.exit(1); }
