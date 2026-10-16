#!/usr/bin/env node
/**
 * add-seo-head.mjs — inject rel=canonical + JSON-LD structured data into the
 * AS·U·LIKE·IT site pages. Idempotent: re-running replaces existing blocks.
 *
 * Host note: canonical/sitemap currently point at the live host
 * (djbenthomas.github.io/as-ulike-it). After the as-ulikeit.com DNS switch,
 * re-run with HOST=https://as-ulikeit.com/ .
 *
 * Usage: node tools/add-seo-head.mjs [--host https://djbenthomas.github.io/as-ulike-it/]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const argHost = process.argv.indexOf('--host');
const HOST = (argHost > -1 ? process.argv[argHost + 1]
  : 'https://djbenthomas.github.io/as-ulike-it/').replace(/\/?$/, '/');

const BIZ = {
  '@type': ['LocalBusiness', 'EntertainmentBusiness'],
  name: 'AS·U·LIKE·IT Entertainment',
  alternateName: ['As You Like It Entertainment', 'DJ Ben Thomas', 'AS U LIKE IT'],
  description: 'Wedding and event DJ in Hendersonville, TN. 15+ years and 900+ events. Professional MC, custom playlists, sound and lighting, plus photo booth rentals. Serving Sumner County and all of Middle Tennessee.',
  telephone: '+1-661-533-0100',
  email: 'djbenthomas@gmail.com',
  address: { '@type': 'PostalAddress', addressLocality: 'Hendersonville', addressRegion: 'TN', addressCountry: 'US' },
  image: HOST + 'assets/canva-hero.jpg',
  logo: HOST + 'assets/canva-logo.png',
  priceRange: '$$',
  areaServed: ['Hendersonville','Gallatin','Goodlettsville','Sumner County','Nashville','Middle Tennessee'].map(
    (n) => ({ '@type': 'City', name: n })),
  sameAs: [
    'https://www.facebook.com/asyoulikeitentertainment',
    'https://www.thebash.com/dj/as-you-like-it-dj',
    'https://www.theknot.com/marketplace/as-you-like-it-entertainment-hendersonville-tn-578924',
  ],
  makesOffer: [
    { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Wedding DJ & MC Services' } },
    { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Event DJ Services' } },
    { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Photo Booth Rental' } },
  ],
};

const CITY = {
  'wedding-dj-hendersonville-tn.html': { name: 'Hendersonville', title: 'Wedding DJ in Hendersonville, TN' },
  'wedding-dj-gallatin-tn.html':       { name: 'Gallatin',      title: 'Wedding DJ in Gallatin, TN' },
  'wedding-dj-sumner-county-tn.html':  { name: 'Sumner County', title: 'Wedding DJ in Sumner County, TN' },
  'wedding-dj-goodlettsville-tn.html': { name: 'Goodlettsville',title: 'Wedding DJ in Goodlettsville, TN' },
  'wedding-dj-nashville-tn.html':      { name: 'Nashville',     title: 'Wedding DJ in Nashville, TN' },
};

// FAQPage data mirrors the on-page FAQ list in index.html (Q/A pairs, in order).
const FAQ = [
  ['What areas do you serve?', "We're based in Hendersonville, TN and serve Gallatin, Goodlettsville, Sumner County, Nashville, and all of Middle Tennessee. We're happy to travel for the right event."],
  ['How long have you been doing this?', "15+ years and 900+ events — weddings, corporate events, private parties, and more. We've seen it all and know how to keep any crowd dancing."],
  ['Do you provide ceremony music too?', 'Absolutely. Ceremony sound, processional and candle lighting cues, and reception — one DJ for your whole day, so nothing falls through the cracks.'],
  ['Do you act as MC?', 'Yes. Ben is an experienced MC who handles announcements, toasts, introductions, and keeping the timeline moving — so you and your guests just enjoy the night.'],
  ['Can you work with our venue and planner?', 'We work with venues all over Sumner County and Middle Tennessee. We coordinate directly with venue staff and planners so setup, timeline, and flow are seamless.'],
  ['Do you take song requests?', 'Always. We build custom playlists around your taste — and we read the room, mixing in requests that keep the dance floor packed.'],
  ['Do you offer photo booth rentals?', 'Yes! DJ + photo booth combo packages available. Printed photo strips, fun props, and a booth attendant. Ask about our current special.'],
  ['What equipment do you bring?', "Professional sound system, wireless mics, DJ lighting and uplighting — sized to your venue, set up and torn down by us. You don't lift a finger."],
  ['How much do you charge?', 'Every event is different — venue size, hours, ceremony plus reception, photo booth add-ons. Contact us for a custom quote. We\'re upfront and work with most budgets.'],
  ['How far in advance should we book?', "Popular wedding dates go fast — 6 to 12 months out is ideal. But always ask about last-minute availability; we've saved plenty of events!"],
  ['Do you require a deposit?', 'A deposit reserves your date. Details are shared in your quote — no surprises.'],
  ['Are you insured?', "Yes, we carry liability insurance — many venues require it, and we've got you covered."],
  ['What if our event is outdoors?', 'We do outdoor ceremonies and receptions regularly — weather backup plans are included in our coordination with the venue.'],
  ['Can we meet before booking?', "Absolutely. We'll chat about your event, music style, and timeline before you book — so you know exactly who's running your night."],
];

const MARK_START = '<!-- seo:head:start (generated by tools/add-seo-head.mjs) -->';
const MARK_END = '<!-- seo:head:end -->';

function block(host, canonicalRel, graph) {
  return [
    MARK_START,
    `<link rel="canonical" href="${canonicalRel}">`,
    `<script type="application/ld+json">`,
    JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }, null, 2),
    `</script>`,
    MARK_END,
  ].join('\n');
}

function serviceNode(city, url) {
  return {
    '@type': 'Service',
    name: `Wedding DJ Services in ${city}, TN`,
    serviceType: 'Wedding DJ',
    provider: { '@type': 'LocalBusiness', name: 'AS·U·LIKE·IT Entertainment' },
    areaServed: { '@type': 'City', name: city },
    url,
  };
}

function stripBlock(html, file) {
  let stripped = html;
  for (;;) {
    const s = stripped.indexOf(MARK_START);
    if (s === -1) break;
    const e = stripped.indexOf(MARK_END, s);
    if (e === -1) throw new Error(`${file}: malformed existing SEO block (no end marker)`);
    let end = e + MARK_END.length;
    if (stripped[end] === '\n') end += 1;
    stripped = stripped.slice(0, s) + stripped.slice(end);
  }
  return stripped;
}

function inject(file, canonicalRel, graph) {
  const path = join(ROOT, file);
  const html = readFileSync(path, 'utf8');
  const stripped = stripBlock(html, file);
  const headAt = stripped.indexOf('</head>');
  if (headAt === -1) throw new Error(`${file}: no </head>`);
  const out = stripped.slice(0, headAt) + block(HOST, canonicalRel, graph) + '\n' + stripped.slice(headAt);
  const changed = out !== html;
  if (changed) writeFileSync(path, out);
  return { file, canonical: canonicalRel, graphNodes: graph.length, changed };
}

const results = [];
// Home page: LocalBusiness + WebSite + FAQPage
results.push(inject('index.html', HOST, [
  Object.assign({ '@id': HOST + '#business' }, BIZ),
  { '@type': 'WebSite', name: 'AS·U·LIKE·IT Entertainment', url: HOST },
  {
    '@type': 'FAQPage',
    mainEntity: FAQ.map(([q, a]) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  },
]));

// City landing pages: LocalBusiness + Service focused on that city
for (const [file, city] of Object.entries(CITY)) {
  const url = HOST + file;
  results.push(inject(file, url, [
    Object.assign({ '@id': HOST + '#business' }, BIZ),
    serviceNode(city.name, url),
  ]));
}

for (const r of results) console.log(`${r.changed ? 'ok  ' : 'same'} ${r.file.padEnd(36)} ${r.graphNodes} nodes  ${r.canonical}`);
console.log(`host: ${HOST}`);
