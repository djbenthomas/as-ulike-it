#!/usr/bin/env node
/** validate.mjs — pre-push gate. Exit code 1 on any failure. */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const pages = readdirSync(ROOT).filter((f) => f.endsWith('.html'));

// Canonical host comes from the sitemap's first <loc>, so switching domains
// (github.io -> as-ulikeit.com) doesn't require editing this file again.
const SITEMAP = readFileSync(join(ROOT, 'sitemap.xml'), 'utf8');
const SITE = (SITEMAP.match(/<loc>(.*?)<\/loc>/) || [])[1] || 'https://djbenthomas.github.io/as-ulike-it/';
const titles = new Map(), descs = new Map();
let fail = 0;
const bad = (m) => { console.log('✗ ' + m); fail++; };

for (const f of pages) {
  const h = readFileSync(join(ROOT, f), 'utf8');

  const title = (h.match(/<title>([\s\S]*?)<\/title>/) || [])[1];
  const desc = (h.match(/<meta name="description" content="([\s\S]*?)">/) || [])[1];
  if (!title || !desc) bad(`${f}: missing title/description`);
  if (titles.has(title)) bad(`${f}: duplicate title with ${titles.get(title)}`); else titles.set(title, f);
  if (descs.has(desc)) bad(`${f}: duplicate description with ${descs.get(desc)}`); else descs.set(desc, f);
  if (title && title.length > 75) bad(`${f}: title ${title.length} chars (>75)`);
  const descLen = desc ? desc.replace(/&amp;/g, '&').replace(/&mdash;/g, '—').replace(/&ndash;/g, '–').replace(/&#39;|&rsquo;/g, "'").length : 0;
  if (desc && (descLen < 70 || descLen > 200)) bad(`${f}: description ${descLen} chars (want 70–200)`);

  for (const need of ['canonical', 'name="robots"', 'name="keywords"', 'name="geo.region"',
    'property="og:title"', 'property="og:image"', 'property="og:url"', 'name="twitter:card"',
    'application/ld+json', 'name="theme-color"']) {
    if (!h.includes(need)) bad(`${f}: missing ${need}`);
  }

  // no duplicated meta tags
  for (const tag of ['property="og:title"', 'property="og:description"', 'name="keywords"', 'name="robots"', 'rel="canonical"']) {
    const n = h.split(tag).length - 1;
    if (n !== 1) bad(`${f}: ${tag} appears ${n}×, expected 1`);
  }

  const canonical = (h.match(/<link rel="canonical" href="([^"]+)">/) || [])[1];
  const want = `${SITE}${f === 'index.html' ? '' : f}`;
  const wantClean = want.replace(/\.html$/, ''); // GitHub Pages serves extensionless URLs
  if (canonical !== want && canonical !== wantClean) bad(`${f}: canonical ${canonical} ≠ ${want}`);

  const blocks = [...h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  if (blocks.length !== 1) bad(`${f}: ${blocks.length} JSON-LD blocks (want 1)`);
  try { JSON.parse(blocks[0][1]); } catch (e) { bad(`${f}: invalid JSON-LD — ${e.message}`); }

  for (const m of h.matchAll(/(?:href|src)="((?!https?:|mailto:|sms:|tel:|#)[^"]+)"/g)) {
    const ref = m[1].split('#')[0];
    if (!ref) continue;
    const refHtml = /\.html$/.test(ref) ? ref : ref + '.html';
    if (!existsSync(join(ROOT, ref)) && !existsSync(join(ROOT, refHtml))) bad(`${f}: dead local ref → ${ref}`);
  }

  if ((h.match(/<h1>/g) || []).length !== 1) bad(`${f}: H1 count ≠ 1`);
  if (!h.trimEnd().endsWith('</html>')) bad(`${f}: truncated file`);
  if (h.includes('serve Gallatin, Goodlettsville, Sumner County, Nashville')) bad(`${f}: stale FAQ copy`);
  if (!h.includes('photo-booth.html')) bad(`${f}: no link to photo-booth.html`);
}

// sitemap ↔ disk
const locs = [...SITEMAP.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
for (const f of pages) {
  const url = `${SITE}${f === 'index.html' ? '' : f}`;
  if (!locs.includes(url) && !locs.includes(url.replace(/\.html$/, ''))) bad(`sitemap: missing ${f}`);
}
for (const l of locs) {
  const rel = l.replace(SITE, '');
  if (rel && !existsSync(join(ROOT, rel)) && !existsSync(join(ROOT, rel + '.html'))) bad(`sitemap: ghost entry ${rel}`);
}

// booth gallery
const booth = readdirSync(join(ROOT, 'assets/booth')).filter((f) => f.endsWith('.jpg'));
const pb = readFileSync(join(ROOT, 'photo-booth.html'), 'utf8');
const used = (pb.match(/assets\/booth\/[^"]+\.jpg/g) || []).length;
if (booth.length < 1) bad('booth: no photos found');
if (used < booth.length) bad(`photo-booth.html shows ${used} of ${booth.length} photos`);
if (!pb.includes('"@type": "ImageGallery"')) bad('photo-booth.html: no ImageGallery schema');

// robots.txt
const rb = readFileSync(join(ROOT, 'robots.txt'), 'utf8');
if (!rb.includes('Sitemap:')) bad('robots.txt: no Sitemap directive');

console.log(`\n${pages.length} pages | ${booth.length} booth photos | ${locs.length} sitemap urls | ${fail} failures`);
process.exit(fail ? 1 : 0);
