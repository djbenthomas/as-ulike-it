#!/usr/bin/env node
/**
 * wedding.mjs — create and maintain a wedding gallery site.
 *
 *   node tools/wedding.mjs new "Cameron & Desiree" 2026-10-24
 *   node tools/wedding.mjs add cameron-desiree ~/Downloads/photobooth
 *   node tools/wedding.mjs add cameron-desiree ~/Desktop/more-photos
 *   node tools/wedding.mjs list
 *   node tools/wedding.mjs build
 *
 * Design goals:
 *  - After `add`, the page is already updated. No code editing, ever.
 *  - Re-running `add` on the same folder is safe: files are de-duplicated by
 *    name, so you can drop in a second batch months later.
 *  - Photos are resized on this machine (macOS `sips`) into full + thumbnail.
 *  - Works with local files now, and with absolute R2 URLs later: if a photo
 *    entry starts with http, it is used as-is and never copied.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const WEDDINGS = path.join(ROOT, 'weddings');
const FULL_MAX = 1800;
const THUMB_MAX = 640;
const JPEG_QUALITY = 78;

const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.heic', '.heif', '.webp', '.tif', '.tiff']);
const VIDEO_EXT = new Set(['.mp4', '.mov', '.m4v', '.webm']);

/* ------------------------------------------------------------------ utils */

const slugify = (s) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

function prettyName(file) {
  return path.basename(file, path.extname(file)).replace(/[-_]+/g, ' ').trim();
}

function sips(args) {
  try {
    execFileSync('sips', args, { stdio: 'ignore' });
    return true;
  } catch (e) {
    return false;
  }
}

function humanSize(bytes) {
  if (bytes > 1e9) return (bytes / 1e9).toFixed(2) + ' GB';
  if (bytes > 1e6) return (bytes / 1e6).toFixed(1) + ' MB';
  return Math.round(bytes / 1e3) + ' KB';
}

function readManifest(dir) {
  const p = path.join(dir, 'manifest.json');
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function writeManifest(dir, m) {
  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(m, null, 2) + '\n');
}

function ensureDirs(dir) {
  for (const d of ['photos/full', 'photos/thumb', 'videos', 'downloads']) {
    fs.mkdirSync(path.join(dir, d), { recursive: true });
  }
}

/* --------------------------------------------------------------- commands */

function cmdNew(name, date, opts) {
  if (!name) die('Usage: wedding.mjs new "Couple Name" YYYY-MM-DD [--private]');
  let slug = slugify(name);
  if (opts.private) slug += '-' + Math.random().toString(36).slice(2, 8);

  const dir = path.join(WEDDINGS, slug);
  if (fs.existsSync(dir)) die(`That wedding already exists: ${slug}`);

  ensureDirs(dir);
  const manifest = {
    slug,
    couple: name,
    date: date || new Date().toISOString().slice(0, 10),
    venue: '',
    createdAt: new Date().toISOString(),
    noindex: true,
    photos: [],
    videos: [],
    note: '',
  };
  writeManifest(dir, manifest);
  buildPage(dir, manifest);

  console.log(`\n  Created ${slug}`);
  console.log(`  Page:  weddings/${slug}/`);
  console.log(`  Next:  node tools/wedding.mjs add ${slug} <folder-or-files>\n`);
  return slug;
}

function cmdAdd(slug, input, opts) {
  const dir = path.join(WEDDINGS, slug);
  if (!fs.existsSync(dir)) die(`No wedding called "${slug}". Run: node tools/wedding.mjs list`);

  const manifest = readManifest(dir);
  ensureDirs(dir);

  const files = [];
  for (const target of input) {
    const p = path.resolve(target.replace(/^~/, process.env.HOME || '~'));
    if (!fs.existsSync(p)) { console.warn(`  ! not found: ${target}`); continue; }
    if (fs.statSync(p).isDirectory()) {
      for (const f of fs.readdirSync(p).sort()) {
        const full = path.join(p, f);
        if (fs.statSync(full).isFile()) files.push(full);
      }
    } else files.push(p);
  }

  if (!files.length) die('Nothing to import.');

  let addedPhotos = 0, addedVideos = 0, skipped = 0, dupes = 0;

  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    const base = slugify(prettyName(file)) || 'photo';

    if (IMAGE_EXT.has(ext)) {
      // already imported? (same original filename) -> skip silently
      if (manifest.photos.some((p) => p.source === path.basename(file))) { dupes++; continue; }

      // otherwise find a free target name
      let name = base + '.jpg';
      let n = 2;
      while (manifest.photos.some((p) => p.file === name)) name = `${base}-${n++}.jpg`;

      const fullOut = path.join(dir, 'photos/full', name);
      const thumbOut = path.join(dir, 'photos/thumb', name);

      const ok = sips(['-Z', String(FULL_MAX), '-s', 'format', 'jpeg', '-s', 'formatOptions', String(JPEG_QUALITY), file, '--out', fullOut]);
      if (!ok) { console.warn(`  ! could not read ${path.basename(file)}`); continue; }
      sips(['-Z', String(THUMB_MAX), '-s', 'format', 'jpeg', '-s', 'formatOptions', String(JPEG_QUALITY - 6), file, '--out', thumbOut]);

      const dims = sips(['-g', 'pixelWidth', '-g', 'pixelHeight', fullOut])
        ? execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', fullOut]).toString()
        : '';
      const w = Number((dims.match(/pixelWidth:\s*(\d+)/) || [])[1]) || 0;
      const h = Number((dims.match(/pixelHeight:\s*(\d+)/) || [])[1]) || 0;

      manifest.photos.push({
        file: name,
        source: path.basename(file),
        caption: '',
        w, h,
        bytes: fs.statSync(fullOut).size,
      });
      addedPhotos++;

    } else if (VIDEO_EXT.has(ext)) {
      if (manifest.videos.some((v) => v.source === path.basename(file))) { dupes++; continue; }
      let name = base + ext;
      let n = 2;
      while (manifest.videos.some((v) => v.file === name)) name = `${base}-${n++}${ext}`;

      const dest = path.join(dir, 'videos', name);
      fs.copyFileSync(file, dest);
      manifest.videos.push({
        file: name,
        source: path.basename(file),
        title: prettyName(file),
        bytes: fs.statSync(dest).size,
      });
      addedVideos++;
    } else {
      skipped++;
    }
  }

  if (opts.reverse) manifest.photos.reverse();
  writeManifest(dir, manifest);
  buildPage(dir, manifest);

  if (opts.zip) makeZip(dir, manifest);

  const totalBytes = manifest.photos.reduce((a, p) => a + (p.bytes || 0), 0)
    + manifest.videos.reduce((a, v) => a + (v.bytes || 0), 0);

  console.log(`\n  ${manifest.couple} — ${manifest.date}`);
  console.log(`  added: ${addedPhotos} photo(s), ${addedVideos} video(s)`);
  if (dupes) console.log(`  already here: ${dupes} file(s) skipped`);
  if (skipped) console.log(`  skipped: ${skipped} unsupported file(s)`);
  console.log(`  total: ${manifest.photos.length} photos, ${manifest.videos.length} videos, ${humanSize(totalBytes)}`);
  console.log(`  page rebuilt: weddings/${slug}/index.html\n`);
}

function makeZip(dir, manifest) {
  const zipName = 'all-photos.zip';
  const zipPath = path.join(dir, 'downloads', zipName);
  try {
    if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
    const names = manifest.photos.map((p) => path.join('photos/full', p.file));
    execFileSync('zip', ['-j', '-q', zipPath, ...names], { cwd: dir, stdio: 'ignore' });
    console.log(`  zip: ${humanSize(fs.statSync(zipPath).size)}`);
    return zipName;
  } catch (e) {
    console.warn('  ! zip failed — guests can still download one at a time');
    return null;
  }
}

function cmdList() {
  if (!fs.existsSync(WEDDINGS)) return console.log('No weddings yet.');
  const rows = fs.readdirSync(WEDDINGS)
    .filter((d) => !d.startsWith('_') && fs.existsSync(path.join(WEDDINGS, d, 'manifest.json')))
    .map((d) => readManifest(path.join(WEDDINGS, d)));

  if (!rows.length) return console.log('No weddings yet.');

  console.log('\n  ' + 'SLUG'.padEnd(28) + 'COUPLE'.padEnd(26) + 'DATE'.padEnd(13) + 'MEDIA');
  console.log('  ' + '-'.repeat(80));
  for (const m of rows) {
    console.log('  ' + m.slug.padEnd(28) + String(m.couple).slice(0, 24).padEnd(26) + String(m.date).padEnd(13) + `${m.photos.length}p / ${m.videos.length}v`);
  }
  console.log();
}

function cmdBuild() {
  if (!fs.existsSync(WEDDINGS)) return console.log('No weddings yet.');
  let n = 0;
  for (const d of fs.readdirSync(WEDDINGS)) {
    if (d.startsWith('_')) continue;
    const dir = path.join(WEDDINGS, d);
    const m = readManifest(dir);
    if (!m) continue;
    buildPage(dir, m);
    n++;
  }
  console.log(`  rebuilt ${n} wedding page(s)`);
}

/* ----------------------------------------------------------- page builder */

function buildPage(dir, m) {
  const totalPhotos = m.photos.length;
  const zipPath = path.join(dir, 'downloads', 'all-photos.zip');
  const hasZip = fs.existsSync(zipPath);

  const dateLabel = formatDate(m.date);

  const photosJson = JSON.stringify(m.photos.map((p) => ({
    file: p.file, caption: p.caption || '', w: p.w || 0, h: p.h || 0,
  })));

  const videosJson = JSON.stringify(m.videos.map((v) => ({
    file: v.file, title: v.title || '', kind: v.kind || 'local', url: v.url || '',
  })));

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(m.couple)} — Photo Booth Gallery</title>
${m.noindex ? '<meta name="robots" content="noindex, nofollow, noarchive">\n<meta name="googlebot" content="noindex, nofollow">' : '<meta name="robots" content="index, follow">'}
<meta name="description" content="Photo booth gallery for ${esc(m.couple)}, ${esc(dateLabel)}. Photos by AS·U·LIKE·IT Entertainment.">
<meta name="theme-color" content="#1E2820">
<meta property="og:title" content="${esc(m.couple)} — Photo Booth Gallery">
<meta property="og:description" content="Relive the night. ${totalPhotos} photo booth memories from ${esc(dateLabel)}.">
<meta property="og:type" content="website">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=Jost:wght@300;400;500;600&display=swap" rel="stylesheet">
<style>
  :root{
    --cream:#FBF7EF; --cream-2:#F2EADB; --ink:#23201C; --ink-soft:#6B6157;
    --gold:#B08D4A; --gold-soft:#E6D3A8; --sage:#1E2820; --white:#fff;
  }
  *{margin:0;padding:0;box-sizing:border-box}
  img{max-width:100%;height:auto}
  body{font-family:'Jost',sans-serif;background:var(--cream);color:var(--ink);line-height:1.6;font-weight:300;-webkit-font-smoothing:antialiased}
  .wrap{max-width:1120px;margin:0 auto;padding:0 20px}
  h1,h2,h3{font-family:'Cormorant Garamond',serif;font-weight:500;line-height:1.12}

  header{
    background:linear-gradient(168deg,#243026 0%,#161E18 100%);
    color:#fff;text-align:center;padding:64px 20px 56px;position:relative;overflow:hidden;
  }
  header::after{content:"";position:absolute;left:0;right:0;bottom:0;height:1px;
    background:linear-gradient(90deg,transparent,rgba(176,141,74,.6),transparent)}
  .eyebrow{font-size:10.5px;letter-spacing:3.4px;text-transform:uppercase;color:var(--gold-soft);font-weight:500}
  h1{font-size:clamp(34px,7vw,58px);margin:14px 0 8px}
  h1 .amp{color:var(--gold-soft);font-style:italic}
  .date{font-size:13px;letter-spacing:3px;text-transform:uppercase;color:rgba(255,255,255,.62)}
  .stat-line{margin-top:18px;font-size:13.5px;color:rgba(255,255,255,.55);letter-spacing:1px}

  .toolbar{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;padding:26px 20px 6px}
  .tbtn{
    display:inline-flex;align-items:center;gap:8px;padding:12px 22px;border-radius:999px;
    border:1px solid rgba(35,32,28,.22);background:#fff;color:var(--ink);text-decoration:none;
    font-family:'Jost',sans-serif;font-size:12px;letter-spacing:1.6px;text-transform:uppercase;
    font-weight:500;cursor:pointer;transition:all .2s;
  }
  .tbtn:hover{border-color:var(--gold);color:var(--gold)}
  .tbtn.primary{background:var(--gold);border-color:var(--gold);color:#fff}
  .tbtn.primary:hover{background:#9A7940;color:#fff}

  .grid{
    display:grid;grid-template-columns:repeat(auto-fill,minmax(168px,1fr));
    gap:12px;padding:26px 0 60px;
  }
  @media (min-width:640px){ .grid{grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px} }
  .ph{
    position:relative;border-radius:10px;overflow:hidden;background:var(--cream-2);
    border:1px solid rgba(35,32,28,.08);cursor:pointer;display:block;width:100%;
    padding:0;transition:transform .22s, box-shadow .22s;
  }
  .ph:hover{transform:translateY(-3px);box-shadow:0 14px 30px rgba(35,32,28,.14)}
  .ph img{display:block;width:100%;height:auto;aspect-ratio:3/4;object-fit:cover;background:var(--cream-2)}

  .videos{padding:0 0 50px}
  .videos h2{font-size:28px;margin-bottom:6px}
  .videos p.sub{color:var(--ink-soft);font-size:14.5px;margin-bottom:22px}
  .vgrid{display:grid;gap:18px;grid-template-columns:repeat(auto-fit,minmax(280px,1fr))}
  .vcard{background:#fff;border:1px solid rgba(35,32,28,.1);border-radius:12px;overflow:hidden}
  .vcard video{width:100%;display:block;background:#000}
  .vmeta{padding:14px 16px;display:flex;justify-content:space-between;align-items:center;gap:12px}
  .vmeta span{font-size:14.5px;color:var(--ink-soft)}
  .vmeta a{font-size:11.5px;letter-spacing:1.6px;text-transform:uppercase;color:var(--gold);text-decoration:none;white-space:nowrap}

  footer{background:#161E18;color:rgba(255,255,255,.55);text-align:center;padding:34px 20px;font-size:13px;letter-spacing:1px}
  footer .co{color:var(--gold);font-family:'Cormorant Garamond',serif;font-size:17px}
  footer a{color:rgba(255,255,255,.72);text-decoration:none}
  footer a:hover{color:var(--gold)}

  /* lightbox */
  .lb{position:fixed;inset:0;background:rgba(12,14,12,.96);z-index:100;display:none;flex-direction:column}
  .lb.on{display:flex}
  .lb-top{display:flex;justify-content:space-between;align-items:center;padding:14px 16px;color:#fff;font-size:13px;letter-spacing:1px}
  .lb-top button,.lb-top a{background:rgba(255,255,255,.1);border:0;color:#fff;border-radius:999px;
    width:42px;height:42px;font-size:17px;cursor:pointer;display:flex;align-items:center;justify-content:center;
    text-decoration:none}
  .lb-top button:hover,.lb-top a:hover{background:rgba(255,255,255,.22)}
  .lb-body{flex:1;display:flex;align-items:center;justify-content:center;padding:0 12px;position:relative;min-height:0}
  .lb-body img{max-width:100%;max-height:100%;object-fit:contain;border-radius:6px}
  .lb-nav{position:absolute;top:50%;transform:translateY(-50%);background:rgba(255,255,255,.12);
    border:0;color:#fff;width:48px;height:48px;border-radius:50%;font-size:24px;cursor:pointer}
  .lb-nav:hover{background:rgba(255,255,255,.25)}
  #lbPrev{left:6px} #lbNext{right:6px}
  .lb-count{color:rgba(255,255,255,.6);font-size:12px;letter-spacing:2px;text-align:center;padding:12px}
  .hidden{display:none!important}
</style>
</head>
<body>

<header>
  <div class="eyebrow">The Photo Booth</div>
  <h1>${m.couple.split(/\s*&\s*|\s+and\s+/i).length === 2
      ? m.couple.split(/\s*&\s*|\s+and\s+/i).map(esc).join(' <span class="amp">&amp;</span> ')
      : esc(m.couple)}</h1>
  <div class="date">${esc(dateLabel)}</div>
  <div class="stat-line">${totalPhotos} photo booth ${totalPhotos === 1 ? 'memory' : 'memories'}${m.videos.length ? ` &bull; ${m.videos.length} video${m.videos.length === 1 ? '' : 's'}` : ''}</div>
</header>

<div class="toolbar">
  ${hasZip ? `<a class="tbtn primary" href="downloads/all-photos.zip" download>&#11015; Download All Photos</a>` : ''}
  <button class="tbtn" id="shareBtn">&#10150; Share This Gallery</button>
</div>

<main class="wrap">
  <div class="grid" id="grid"></div>

  ${m.videos.length ? `<section class="videos">
    <h2>Wedding Videos</h2>
    <p class="sub">Tap to play, or download and keep.</p>
    <div class="vgrid">${m.videos.map((v) => `
      <div class="vcard">
        <video controls playsinline preload="metadata" ${v.kind === 'remote' ? `src="${esc(v.url)}"` : `src="videos/${esc(v.file)}"`}></video>
        <div class="vmeta"><span>${esc(v.title || 'Wedding video')}</span>
          <a href="${v.kind === 'remote' ? esc(v.url) : 'videos/' + esc(v.file)}" download>Download</a></div>
      </div>`).join('')}
    </div>
  </section>` : ''}
</main>

<footer>
  <div class="co">AS&middot;U&middot;LIKE&middot;IT Entertainment</div>
  <div style="margin-top:6px;">Photo Booth &bull; DJ &bull; Gallatin, TN</div>
  <div style="margin-top:8px;"><a href="https://as-ulikeit.com">as-ulikeit.com</a></div>
</footer>

<div class="lb" id="lb">
  <div class="lb-top">
    <button id="lbClose" aria-label="Close">&#10005;</button>
    <span id="lbCaption"></span>
    <a id="lbDl" href="#" download aria-label="Download this photo">&#11015;</a>
  </div>
  <div class="lb-body">
    <button class="lb-nav" id="lbPrev" aria-label="Previous">&#8249;</button>
    <img id="lbImg" alt="">
    <button class="lb-nav" id="lbNext" aria-label="Next">&#8250;</button>
  </div>
  <div class="lb-count" id="lbCount"></div>
</div>

<script>
var PHOTOS = ${photosJson};
var VIDEOS = ${videosJson};

var grid = document.getElementById('grid');
PHOTOS.forEach(function (p, i) {
  var b = document.createElement('button');
  b.className = 'ph';
  b.type = 'button';
  b.setAttribute('aria-label', 'View photo ' + (i + 1));
  var img = document.createElement('img');
  img.src = 'photos/thumb/' + encodeURIComponent(p.file);
  img.loading = 'lazy';
  img.decoding = 'async';
  img.width = p.w || 600;
  img.height = p.h || 800;
  img.alt = p.caption || ('Photo booth photo ' + (i + 1));
  b.appendChild(img);
  b.addEventListener('click', function () { openLb(i); });
  grid.appendChild(b);
});

/* lightbox */
var lb = document.getElementById('lb');
var lbImg = document.getElementById('lbImg');
var lbDl = document.getElementById('lbDl');
var lbCount = document.getElementById('lbCount');
var lbCaption = document.getElementById('lbCaption');
var idx = 0;

function fullUrl(p) { return 'photos/full/' + encodeURIComponent(p.file); }

function openLb(i) {
  idx = i;
  var p = PHOTOS[i];
  lbImg.src = fullUrl(p);
  lbDl.href = fullUrl(p);
  lbDl.setAttribute('download', p.file);
  lbCaption.textContent = p.caption || '';
  lbCount.textContent = (i + 1) + ' of ' + PHOTOS.length;
  lb.classList.add('on');
  document.body.style.overflow = 'hidden';
}

function closeLb() {
  lb.classList.remove('on');
  document.body.style.overflow = '';
}

function step(d) {
  idx = (idx + d + PHOTOS.length) % PHOTOS.length;
  openLb(idx);
}

document.getElementById('lbClose').addEventListener('click', closeLb);
document.getElementById('lbPrev').addEventListener('click', function (e) { e.stopPropagation(); step(-1); });
document.getElementById('lbNext').addEventListener('click', function (e) { e.stopPropagation(); step(1); });
lb.addEventListener('click', function (e) { if (e.target === lb) closeLb(); });
document.addEventListener('keydown', function (e) {
  if (!lb.classList.contains('on')) return;
  if (e.key === 'Escape') closeLb();
  if (e.key === 'ArrowLeft') step(-1);
  if (e.key === 'ArrowRight') step(1);
});

/* swipe */
var x0 = null;
lb.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
lb.addEventListener('touchend', function (e) {
  if (x0 === null) return;
  var dx = e.changedTouches[0].clientX - x0;
  if (Math.abs(dx) > 45) step(dx > 0 ? -1 : 1);
  x0 = null;
});

/* share */
document.getElementById('shareBtn').addEventListener('click', async function () {
  var data = {
    title: ${JSON.stringify(m.couple + ' — Photo Booth Gallery')},
    text: 'Our photo booth pictures!',
    url: location.href
  };
  if (navigator.share) {
    try { await navigator.share(data); return; } catch (e) {}
  }
  try {
    await navigator.clipboard.writeText(location.href);
    this.innerHTML = '&#10003; Link Copied';
    var self = this;
    setTimeout(function () { self.innerHTML = '&#10150; Share This Gallery'; }, 2200);
  } catch (e) {
    prompt('Copy this link:', location.href);
  }
});
</script>
</body>
</html>`;

  fs.writeFileSync(path.join(dir, 'index.html'), html);
}

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(d) {
  const parts = String(d).split('-');
  if (parts.length !== 3) return d;
  const dt = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  return dt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function die(msg) {
  console.error('\n  ✗ ' + msg + '\n');
  process.exit(1);
}

/* ------------------------------------------------------------------- main */

const [cmd, ...rest] = process.argv.slice(2);
const opts = {
  private: rest.includes('--private'),
  zip: !rest.includes('--no-zip'),
  reverse: rest.includes('--reverse'),
};
const args = rest.filter((a) => !a.startsWith('--'));

switch (cmd) {
  case 'new': cmdNew(args[0], args[1], opts); break;
  case 'add': cmdAdd(args[0], args.slice(1), opts); break;
  case 'list': case 'ls': cmdList(); break;
  case 'build': cmdBuild(); break;
  default:
    console.log(`
  AS·U·LIKE·IT — wedding galleries

    node tools/wedding.mjs new "Couple Name" 2026-10-24
    node tools/wedding.mjs add <slug> <folder-or-files...>
    node tools/wedding.mjs list
    node tools/wedding.mjs build

  Options
    --private    add a random suffix to the URL
    --reverse    newest photo first
    --no-zip     skip the "download all" zip
`);
}
