#!/usr/bin/env node
/**
 * build-city-pages.mjs — generate the outlying service-area pages from the
 * Gallatin page template, and keep shared chrome (footer service-area links,
 * contact chips, "what areas do you serve" FAQ) in sync on every page.
 *
 * Source of truth for city data: tools/cities.mjs
 * Run: node tools/build-city-pages.mjs
 * Then: node tools/add-seo-head.mjs   (canonical + JSON-LD for every page)
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ALL_CITIES, NEW_CITIES } from './cities.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TEMPLATE = 'wedding-dj-gallatin-tn.html';

const read = (f) => readFileSync(join(ROOT, f), 'utf8');
const write = (f, s) => writeFileSync(join(ROOT, f), s);

function must(html, needle, file) {
  if (!html.includes(needle)) throw new Error(`${file}: expected string missing → ${needle.slice(0, 90)}`);
}

/* ---------- shared chrome ---------- */

const footerLinks = () =>
  ['<div style="margin: 0 0 8px;"><a href="index.html">Home</a> &nbsp;&bull;&nbsp; <a href="photo-booth.html">Photo Booth</a> &nbsp;&bull;&nbsp; ' +
    ALL_CITIES.map((c) => `<a href="${c.file}">${c.name}, TN</a>`).join(' &nbsp;&bull;&nbsp; ') +
    '</div>'];

// Contact-section city chips: home market + the 5 nearest, per page.
const AREA_CHIPS = {
  'hendersonville-tn': ['Hendersonville', 'Gallatin', 'Goodlettsville', 'Old Hickory', 'Mt. Juliet', 'Nashville'],
  'gallatin-tn': ['Gallatin', 'Hendersonville', 'White House', 'Portland', 'Westmoreland', 'Sumner County'],
  'goodlettsville-tn': ['Goodlettsville', 'Hendersonville', 'Millersville', 'Madison', 'Nashville', 'Sumner County'],
  'nashville-tn': ['Nashville', 'Hendersonville', 'Madison', 'Hermitage', 'Mt. Juliet', 'Middle TN'],
  'sumner-county-tn': ['Hendersonville', 'Gallatin', 'Portland', 'Westmoreland', 'White House', 'Millersville'],
};

const chipsFor = (city) =>
  AREA_CHIPS[city.slug] || [city.name, 'Hendersonville', 'Gallatin', 'Goodlettsville', 'Sumner County', 'Middle TN'];

const FAQ_ANSWER =
  "We're based in Hendersonville, TN and serve the whole Nashville-area ring: Gallatin, Goodlettsville, " +
  'White House, Millersville, Greenbrier, Cross Plains, Portland, Westmoreland, Mt. Juliet, Lebanon, ' +
  'Old Hickory, Madison, Hermitage, Springfield, Sumner County, and all of Middle Tennessee. ' +
  "Most of those are a 10–25 minute drive for us, so there's no travel markup. We're happy to travel further for the right event.";

const OLD_FAQ_ANSWER =
  "We're based in Hendersonville, TN and serve Gallatin, Goodlettsville, Sumner County, Nashville, and all of Middle Tennessee. We're happy to travel for the right event.";

/* ---------- generate the new pages ---------- */

const template = read(TEMPLATE);

function localSection(c) {
  const chips = c.venues.map((v) => `<span>${v}</span>`).join('');
  const notes = (c.venueNotes || []).map(([n, d]) =>
    `<li><strong>${n}</strong> &mdash; ${d}</li>`).join('');
  return `<section class="about" id="${c.slug.replace(/-tn$/, '')}">
  <div class="wrap">
    <div class="eyebrow">Local &amp; Trusted</div>
    <h2>${c.name} Couples, <span class="gold">We Know the Roads In</span></h2>
    <div class="divider"></div>
    <p>${c.intro}</p>
    ${c.intro2 ? `<p style="margin-top:16px;">${c.intro2}</p>` : ''}
    <p style="margin-top:26px;"><strong>${c.venueLabel}:</strong></p>
    <div class="areas" style="margin-top:10px;">
      ${chips}
    </div>
    ${notes ? `<ul class="venue-notes" style="list-style:none; margin-top:22px; padding:0;">${notes}</ul>` : ''}
    <p style="margin-top:22px;"><strong>What ${c.name} couples get:</strong> ${c.what}</p>
    <div class="ctas" style="margin-top:24px;">
      <a class="btn btn-gold" href="#contact">Check ${c.name} Availability</a>
      <a class="btn btn-ghost" href="#reviews">Read Reviews</a>
    </div>
  </div>
</section>`;
}

const built = [];
for (const c of NEW_CITIES) {
  let html = template;

  const replaceOnce = (from, to, label) => {
    must(html, from, `${c.file} ← ${TEMPLATE} (${label})`);
    html = html.split(from).join(to);
  };

  // <head>
  replaceOnce('<title>Wedding DJ in Gallatin, TN | AS·U·LIKE·IT Entertainment</title>',
    `<title>Wedding DJ in ${c.name}, TN | AS·U·LIKE·IT Entertainment</title>`, 'title');
  replaceOnce('content="Gallatin\'s trusted wedding DJ — 15+ years, 900+ events. MC, custom playlists, lighting &amp; photo booth. DJ Ben Thomas serves Gallatin, Hendersonville, Sumner County &amp; all of Middle Tennessee."',
    `content="${c.desc}"`, 'meta description');

  // Hero
  replaceOnce('<div class="eyebrow">Wedding DJ &amp; Photo Booth &bull; Gallatin, TN</div>',
    `<div class="eyebrow">${c.heroTag}</div>`, 'hero eyebrow');
  replaceOnce('<h1>Wedding DJ in <span class="amp">Gallatin</span>, TN</h1>',
    `<h1>Wedding DJ in <span class="amp">${c.name}</span>, TN</h1>`, 'h1');
  replaceOnce('<p class="tagline">Gallatin and Sumner County\'s hometown DJ &mdash; 15+ years, 900+ events. Ceremony to reception, your dance floor stays full.</p>',
    `<p class="tagline">${c.tagline}</p>`, 'tagline');

  // Local section
  html = html.replace(/<section class="about" id="gallatin">[\s\S]*?<\/section>/,
    () => localSection(c));
  if (html.includes('id="gallatin"')) throw new Error(`${c.file}: local section not replaced`);

  if (!html.includes('.venue-notes li')) {
    html = html.replace('</style>', '  .venue-notes li { padding: 12px 16px; margin-bottom: 10px; background: #fff; border-left: 3px solid #B98A3E; border-radius: 4px; font-size: 15px; color: #6E635A; }\n  .venue-notes li strong { color: #2A2520; }\n</style>');
  }
  if (c.localFaq && c.localFaq.length) {
    const items = c.localFaq.map(([q, a]) => `  [${JSON.stringify(q)}, ${JSON.stringify(a)}],`).join('\n');
    html = html.replace('var faqs = [\n', 'var faqs = [\n' + items + '\n');
  }
  built.push([c.file, html]);
}

for (const [file, html] of built) write(file, html);
console.log(`generated ${built.length} pages`);

/* ---------- sync shared chrome on every page ---------- */

const pages = readdirSync(ROOT).filter((f) => f === 'index.html' || f.startsWith('wedding-dj-'));
const report = [];

for (const file of pages) {
  let html = read(file);
  const before = html;

  // 1. Footer service-area link row
  const linkRow = /<div style="margin: 0 0 8px;">.*?<\/div>/;
  if (linkRow.test(html)) {
    html = html.replace(linkRow, footerLinks()[0]);
  } else {
    report.push(`  ! ${file}: no footer link row found`);
  }

  // 2. Contact chips + footer serving line
  const city = ALL_CITIES.find((c) => c.file === file);
  if (city) {
    html = html.replace(/<div class="areas">\s*<span>[\s\S]*?<\/div>/,
      `<div class="areas">\n      ${chipsFor(city).map((n) => `<span>${n.replace(/&/g, '&amp;')}</span>`).join('')}\n    </div>`);
    html = html.replace(
      /<div style="margin: 8px 0 4px;">Wedding DJ &bull; MC &bull; Photo Booth &mdash; Serving [^<]*<\/div>/,
      `<div style="margin: 8px 0 4px;">Wedding DJ &bull; MC &bull; Photo Booth &mdash; Serving ${city.name} &amp; all of Middle Tennessee</div>`);
  }

  // 3. "What areas do you serve" FAQ (JSON-LD + JS array both use the same sentence)
  html = html.split(OLD_FAQ_ANSWER).join(FAQ_ANSWER);
  html = html.split(OLD_FAQ_ANSWER.replace(/"/g, '&quot;')).join(FAQ_ANSWER);

  if (html !== before) { write(file, html); report.push(`  ~ ${file}`); }
}

console.log(report.length ? report.join('\n') : '  (no chrome changes)');
console.log(`pages on disk: ${pages.length}`);
