#!/usr/bin/env node
/**
 * add-seo-head.mjs — inject the full SEO head block into every page.
 * Idempotent: re-running replaces the generated block and de-dupes any
 * hand-written og/twitter/geo meta tags that predate this script.
 *
 * Blocks generated per page:
 *   canonical, robots, author, keywords, geo.*, ICBM, theme-color, favicon,
 *   Open Graph (site_name/locale/url/type/title/description/image),
 *   Twitter card, JSON-LD @graph (LocalBusiness + page-specific node)
 *
 * Usage: node tools/add-seo-head.mjs [--host https://djbenthomas.github.io/as-ulike-it/]
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ALL_CITIES } from './cities.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const argHost = process.argv.indexOf('--host');
const HOST = (argHost > -1 ? process.argv[argHost + 1]
  : 'https://djbenthomas.github.io/as-ulike-it/').replace(/\/?$/, '/');

const BRAND = 'AS·U·LIKE·IT Entertainment';
const PHONE = '+1-661-533-0100';
const EMAIL = 'djbenthomas@gmail.com';
const CITY = 'Hendersonville';

const BIZ = {
  '@type': ['LocalBusiness', 'EntertainmentBusiness'],
  name: BRAND,
  alternateName: ['As You Like It Entertainment', 'DJ Ben Thomas', 'AS U LIKE IT'],
  description: 'Wedding and event DJ in Hendersonville, TN. 15+ years and 900+ events. Professional MC, custom playlists, sound and lighting, plus photo booth rentals. Serving Sumner County, Wilson County, Robertson County, Davidson County, and all of Middle Tennessee.',
  telephone: PHONE,
  email: EMAIL,
  address: { '@type': 'PostalAddress', addressLocality: CITY, addressRegion: 'TN', addressCountry: 'US' },
  geo: { '@type': 'GeoCoordinates', latitude: 36.3048, longitude: -86.62 },
  image: HOST + 'assets/canva-hero.jpg',
  logo: HOST + 'assets/canva-logo.png',
  priceRange: '$$',
  currenciesAccepted: 'USD',
  paymentAccepted: 'Cash, Check, Credit Card',
  areaServed: [...ALL_CITIES.map((c) => c.name), 'Middle Tennessee'].map((n) => ({ '@type': 'City', name: n })),
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

const FAQ = [
  ['What areas do you serve?', "We're based in Hendersonville, TN and serve the whole Nashville-area ring: Gallatin, Goodlettsville, White House, Millersville, Greenbrier, Cross Plains, Portland, Westmoreland, Mt. Juliet, Lebanon, Old Hickory, Madison, Hermitage, Springfield, Sumner County, and all of Middle Tennessee. Most of those are a 10–25 minute drive for us, so there's no travel markup. We're happy to travel further for the right event."],
  ['How long have you been doing this?', "15+ years and 900+ events — weddings, corporate events, private parties, and more. We've seen it all and know how to keep any crowd dancing."],
  ['Do you provide ceremony music too?', 'Absolutely. Ceremony sound, processional and candle lighting cues, and reception — one DJ for your whole day, so nothing falls through the cracks.'],
  ['Do you act as MC?', 'Yes. Ben is an experienced MC who handles announcements, toasts, introductions, and keeping the timeline moving — so you and your guests just enjoy the night.'],
  ['Can you work with our venue and planner?', 'We work with venues all over Sumner County and Middle Tennessee. We coordinate directly with venue staff and planners so setup, timeline, and flow are seamless.'],
  ['Do you take song requests?', 'Always. We build custom playlists around your taste — and we read the room, mixing in requests that keep the dance floor packed.'],
  ['Do you offer photo booth rentals?', 'Yes! DJ + photo booth combo packages available. Printed photo strips, fun props, and a full inflatable backdrop. The booth is self-serve — nobody standing there watching — which people tell us makes it more fun and more personal. Ask about our current special.'],
  ['What equipment do you bring?', "Professional sound system, wireless mics, DJ lighting and uplighting — sized to your venue, set up and torn down by us. You don't lift a finger."],
  ['How much do you charge?', 'Every event is different — venue size, hours, ceremony plus reception, photo booth add-ons. Contact us for a custom quote. We\'re upfront and work with most budgets.'],
  ['How far in advance should we book?', "Popular wedding dates go fast — 6 to 12 months out is ideal. But always ask about last-minute availability; we've saved plenty of events!"],
  ['Do you require a deposit?', 'A deposit reserves your date. Details are shared in your quote — no surprises.'],
  ['Are you insured?', "Yes, we carry liability insurance — many venues require it, and we've got you covered."],
  ['What if our event is outdoors?', 'We do outdoor ceremonies and receptions regularly — weather backup plans are included in our coordination with the venue.'],
  ['Can we meet before booking?', "Absolutely. We'll chat about your event, music style, and timeline before you book — so you know exactly who's running your night."],
];

/* ---------- per-page config ---------- */

const BOOTH_KEYWORDS = [
  'photo booth rental hendersonville tn', 'photo booth rental nashville', 'photo booth rental gallatin tn',
  'photo booth rental near me', 'photo booth rental sumner county', 'photo booth rental goodlettsville tn',
  'photo booth rental mt juliet tn', 'wedding photo booth nashville', 'affordable photo booth rental nashville',
  'photo booth rental price nashville', 'photo booth with props', 'self serve photo booth', 'inflatable photo booth', 'inflatable backdrop photo booth',
  'dj and photo booth combo', 'photo booth for grad party', 'photo booth for corporate event nashville',
  'photo booth rental springfield tn', 'photo booth rental lebanon tn', 'photo booth rental portland tn',
];

const HOME_KEYWORDS = [
  'wedding dj hendersonville tn', 'wedding dj nashville', 'wedding dj near me', 'hendersonville tn dj',
  'wedding mc nashville', 'wedding reception dj', 'sumner county wedding dj', 'dj and photo booth combo',
  'affordable wedding dj nashville', 'wedding dj gallatin tn', 'wedding dj goodlettsville tn',
  'corporate event dj nashville', 'party dj hendersonville tn', 'school dance dj nashville',
  'wedding dj mt juliet tn', 'wedding dj lebanon tn', 'nashville wedding entertainment',
  'ceremony music dj nashville', 'uplighting rental nashville wedding', '15 years 900 events dj',
];

const CHRISTMAS_KEYWORDS = [
  'christmas murder mystery party nashville', 'corporate christmas party entertainment nashville',
  'office christmas party ideas nashville', 'holiday party host nashville',
  'murder mystery dinner party nashville', 'company christmas party hendersonville tn',
  'corporate holiday party gallatin tn', 'christmas party goodlettsville tn',
  'employee appreciation event nashville', 'interactive christmas party games',
  'holiday team party entertainment', 'christmas mystery party middle tennessee',
];

function keywordsFor(file) {
  if (file === 'index.html') return HOME_KEYWORDS;
  if (file === 'photo-booth.html') return BOOTH_KEYWORDS;
  if (file === 'christmas-office-parties.html') return CHRISTMAS_KEYWORDS;
  const c = ALL_CITIES.find((x) => x.file === file);
  if (!c) return HOME_KEYWORDS;
  const n = c.name;
  const county = (c.county || 'Sumner County').replace(' & ', ' ');
  const nearby = ALL_CITIES.filter((x) => x.file !== file).slice(0, 5).map((x) => x.name);
  return [
    `wedding dj ${n} tn`, `${n} wedding dj`, `wedding dj near ${n} tn`, `dj for wedding ${n} tn`,
    `wedding mc ${n} tn`, `wedding reception dj ${n} tn`, `photo booth rental ${n} tn`,
    `affordable wedding dj ${n} tn`, `wedding dj ${county}`, `${n} tn dj`,
    `ceremony music ${n} tn`, `uplighting ${n} wedding`,
    ...nearby.map((x) => `wedding dj ${x} tn`),
  ];
}

const SITE_IMAGE = {
  'index.html': 'assets/canva-hero.jpg',
  'photo-booth.html': 'assets/booth/booth-01.jpg',
  'christmas-office-parties.html': 'assets/canva-hero.jpg',
};

const MARK_START = '<!-- seo:head:start (generated by tools/add-seo-head.mjs) -->';
const MARK_END = '<!-- seo:head:end -->';

/* ---------- helpers ---------- */

function stripBlock(html, file) {
  let out = html;
  for (;;) {
    const s = out.indexOf(MARK_START);
    if (s === -1) break;
    const e = out.indexOf(MARK_END, s);
    if (e === -1) throw new Error(`${file}: malformed existing SEO block`);
    let end = e + MARK_END.length;
    if (out[end] === '\n') end += 1;
    out = out.slice(0, s) + out.slice(end);
  }
  return out;
}

// Remove hand-written meta tags this script now owns, so nothing is duplicated.
function stripLegacyMeta(html) {
  return html
    .replace(/^[ \t]*<meta (?:property="og:[^"]*"|name="twitter:[^"]*"|name="keywords"|name="robots"|name="author"|name="geo\.[^"]*"|name="ICBM"|name="theme-color")[^>]*>\s*$\n?/gim, '');
}

function pageMeta(html, file) {
  const title = (html.match(/<title>([\s\S]*?)<\/title>/) || [])[1];
  const desc = (html.match(/<meta name="description" content="([\s\S]*?)">/) || [])[1];
  if (!title || !desc) throw new Error(`${file}: missing title or description`);
  return { title, desc };
}

/* Pages published at an extensionless address (GitHub Pages serves foo.html at /foo). */
const CLEAN_URL_PAGES = new Set(['christmas-office-parties.html']);

function pageUrl(file) {
  if (file === 'index.html') return HOST;
  if (CLEAN_URL_PAGES.has(file)) return HOST + file.replace(/\.html$/, '');
  return HOST + file;
}

function headBlock({ title, desc, file, image, graph, keywords }) {
  const url = pageUrl(file);
  const img = HOST + (image || 'assets/canva-hero.jpg');
  const L = [];
  L.push(MARK_START);
  L.push(`<link rel="canonical" href="${url}">`);
  L.push(`<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">`);
  L.push(`<meta name="author" content="Ben Thomas — ${BRAND}">`);
  L.push(`<meta name="keywords" content="${keywords.join(', ')}">`);
  L.push(`<meta name="geo.region" content="US-TN">`);
  L.push(`<meta name="geo.placename" content="${CITY}, Tennessee">`);
  L.push(`<meta name="geo.position" content="36.3048;-86.6200">`);
  L.push(`<meta name="ICBM" content="36.3048, -86.6200">`);
  L.push(`<meta name="theme-color" content="#B98A3E">`);
  L.push(`<link rel="icon" type="image/png" href="assets/canva-logo.png">`);
  L.push(`<link rel="apple-touch-icon" href="assets/canva-logo.png">`);
  L.push(`<meta property="og:site_name" content="${BRAND}">`);
  L.push(`<meta property="og:locale" content="en_US">`);
  L.push(`<meta property="og:type" content="website">`);
  L.push(`<meta property="og:url" content="${url}">`);
  L.push(`<meta property="og:title" content="${title}">`);
  L.push(`<meta property="og:description" content="${desc}">`);
  L.push(`<meta property="og:image" content="${img}">`);
  L.push(`<meta property="og:image:alt" content="${BRAND} — wedding DJ and photo booth in ${CITY}, TN">`);
  L.push(`<meta name="twitter:card" content="summary_large_image">`);
  L.push(`<meta name="twitter:title" content="${title}">`);
  L.push(`<meta name="twitter:description" content="${desc}">`);
  L.push(`<meta name="twitter:image" content="${img}">`);
  L.push(`<script type="application/ld+json">`);
  L.push(JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }, null, 2));
  L.push(`</script>`);
  L.push(MARK_END);
  return L.join('\n');
}

function serviceNode(name, serviceType, url, cityName) {
  return {
    '@type': 'Service',
    name,
    serviceType,
    provider: { '@type': 'LocalBusiness', name: BRAND },
    areaServed: { '@type': 'City', name: cityName },
    url,
  };
}

function pageGraph(file, title) {
  const url = pageUrl(file);
  const biz = Object.assign({ '@id': HOST + '#business' }, BIZ);

  if (file === 'index.html') {
    return [
      biz,
      { '@type': 'WebSite', name: BRAND, url: HOST },
      {
        '@type': 'FAQPage',
        mainEntity: FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
      },
    ];
  }

  if (file === 'photo-booth.html') {
    const images = existsSync(join(ROOT, 'assets/booth'))
      ? readdirSync(join(ROOT, 'assets/booth')).filter((f) => f.endsWith('.jpg')).sort().map((f) => HOST + 'assets/booth/' + f)
      : [];
    return [
      biz,
      {
        '@type': 'Service',
        name: 'Photo Booth Rental',
        serviceType: 'Photo Booth Rental',
        description: 'Photo booth rental with printed strips, props, and an inflatable backdrop booth. Self-serve, so guests run it themselves — no attendant hovering. $300 flat rate in the Hendersonville and Nashville area.',
        provider: { '@type': 'LocalBusiness', name: BRAND },
        areaServed: ALL_CITIES.map((c) => ({ '@type': 'City', name: c.name })),
        offers: { '@type': 'Offer', price: '300', priceCurrency: 'USD', availability: 'https://schema.org/InStock' },
        url,
        image: images.slice(0, 12),
      },
      { '@type': 'ImageGallery', name: `${BRAND} photo booth gallery`, image: images.slice(0, 12), url },
    ];
  }

  if (file === 'christmas-office-parties.html') {
    return [
      biz,
      {
        '@type': 'Service',
        name: 'Christmas Murder Mystery Party',
        serviceType: 'Corporate holiday party entertainment',
        description: "A hosted two-hour Christmas murder mystery experience for company holiday parties of 30\u201350 total guests, brought to the client's office or chosen venue. Dinner, drinks, and venue arranged by the client; we provide the entertainment.",
        provider: { '@type': 'LocalBusiness', name: BRAND },
        areaServed: [
          { '@type': 'City', name: 'Nashville' },
          { '@type': 'City', name: 'Hendersonville' },
          { '@type': 'City', name: 'Gallatin' },
          { '@type': 'City', name: 'Goodlettsville' },
          { '@type': 'AdministrativeArea', name: 'Middle Tennessee' },
        ],
        audience: { '@type': 'BusinessAudience', name: 'Companies planning employee holiday parties' },
        url,
      },
      {
        '@type': 'FAQPage',
        mainEntity: [
          ['What exactly is a Christmas Murder Mystery party?', 'A hosted two-hour whodunit dinner party run in your space. Guests eat, question costumed characters, gather clues through short team games, and vote at the end. It is comedy-forward and holiday-themed, and nobody has to act.'],
          ['Do we need dinner and a venue?', 'Yes. Dinner, drinks, and the venue are arranged by the client. We provide the entertainment.'],
          ['How many guests can you handle?', 'Ideal attendance is 30 to 50 total guests, counting employees and their significant others together.'],
          ['Is the story scary or gory?', 'No. It is a playful holiday mystery with laughs and a puzzle to solve, with no blood or horror imagery.'],
          ['How much does it cost?', 'Weeknight packages start at $1,295 for DJ entertainment and games, $1,795 for our Christmas murder mystery and games, or $2,795 for the Ultimate Christmas Party. These starting prices apply Monday through Thursday. Weekend pricing varies by date and availability. Dinner, drinks, and venue are arranged separately.'],
          ['Are you licensed and insured?', 'Yes. We are fully licensed and insured, and can provide a certificate of insurance for your venue or building management on request.'],
          ['Do you travel outside Nashville?', 'We are based in Hendersonville and cover Nashville, Hendersonville, Gallatin, Goodlettsville, and the rest of Middle Tennessee.'],
        ].map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
      },
    ];
  }

  const c = ALL_CITIES.find((x) => x.file === file);
  const graph = [
    biz,
    serviceNode(`Wedding DJ Services in ${c.name}, TN`, 'Wedding DJ', url, c.name),
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: HOST },
        { '@type': 'ListItem', position: 2, name: `Wedding DJ in ${c.name}, TN`, item: url },
      ],
    },
  ];
  if (c.localFaq && c.localFaq.length) {
    graph.push({
      '@type': 'FAQPage',
      mainEntity: c.localFaq.map(([q, ans]) => ({
        '@type': 'Question', name: q,
        acceptedAnswer: { '@type': 'Answer', text: ans },
      })),
    });
  }
  return graph;
}

/* ---------- run ---------- */

const pages = readdirSync(ROOT).filter((f) => (f === 'index.html' || f.endsWith('.html')) && f !== 'index-offline.html');
const results = [];

for (const file of pages) {
  const raw = readFileSync(join(ROOT, file), 'utf8');
  const stripped = stripLegacyMeta(stripBlock(raw, file));
  const { title, desc } = pageMeta(stripped, file);
  const block = headBlock({
    title,
    desc,
    file,
    image: SITE_IMAGE[file],
    graph: pageGraph(file, title),
    keywords: keywordsFor(file),
  });
  const headAt = stripped.indexOf('</head>');
  if (headAt === -1) throw new Error(`${file}: no </head>`);
  const out = stripped.slice(0, headAt) + block + '\n' + stripped.slice(headAt);
  if (out !== raw) writeFileSync(join(ROOT, file), out);
  results.push({ file, changed: out !== raw, keywords: keywordsFor(file).length, nodes: pageGraph(file, title).length });
}

for (const r of results) {
  console.log(`${r.changed ? 'ok  ' : 'same'} ${r.file.padEnd(36)} ${String(r.keywords).padStart(2)} keywords  ${r.nodes} schema nodes`);
}
console.log(`${results.length} pages | host: ${HOST}`);
