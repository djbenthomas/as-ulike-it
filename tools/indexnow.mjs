#!/usr/bin/env node
/**
 * indexnow.mjs — ping IndexNow (Bing / Yandex / Seznam / Naver) with every URL in sitemap.xml.
 *
 * Why: DuckDuckGo's index is Bing's index, and that is what the daily rank sweep reads.
 * Search Console covers Google (still unverified), IndexNow covers the other half for free,
 * needs no login, and is the fastest legitimate way to say "these pages exist, crawl them".
 *
 * The key file must already be live at https://<host>/<key>.txt with the key as its only content.
 * Run: node tools/indexnow.mjs [--dry]
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DRY = process.argv.includes('--dry');

const sitemap = readFileSync(join(ROOT, 'sitemap.xml'), 'utf8');
const urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1].trim());
const host = new URL(urls[0]).host;

// key = the 32-hex .txt file sitting in the repo root
const keyName = readdirSync(ROOT).find((f) => /^[0-9a-f]{32}\.txt$/.test(f));
if (!keyName) {
  console.error('✗ no IndexNow key file (<32 hex>.txt) in repo root');
  process.exit(1);
}
const key = keyName.replace(/\.txt$/, '');
const keyLocation = `https://${host}/${keyName}`;

console.log(`host: ${host}`);
console.log(`key:  ${key}`);
console.log(`urls: ${urls.length}`);
if (DRY) {
  console.log(urls.join('\n'));
  process.exit(0);
}

const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host, key, keyLocation, urlList: urls }),
});

const text = (await res.text()).trim();
console.log(`status: ${res.status} ${res.statusText}${text ? ` — ${text.slice(0, 200)}` : ''}`);
// 200 = accepted, 202 = accepted (key pending validation)
if (res.status !== 200 && res.status !== 202) process.exit(1);
console.log('✓ submitted');
