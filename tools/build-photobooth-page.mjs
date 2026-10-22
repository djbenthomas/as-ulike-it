#!/usr/bin/env node
/**
 * build-photobooth-page.mjs — generates photo-booth.html.
 * Reuses the stylesheet from index.html so the page matches the site exactly.
 * Run: node tools/build-photobooth-page.mjs && node tools/add-seo-head.mjs
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ALL_CITIES } from './cities.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const css = (readFileSync(join(ROOT, 'index.html'), 'utf8').match(/<style>[\s\S]*?<\/style>/) || [])[0];
if (!css) throw new Error('could not extract <style> from index.html');

const shots = readdirSync(join(ROOT, 'assets/booth')).filter((f) => f.endsWith('.jpg')).sort();
if (shots.length < 8) throw new Error('need at least 8 booth photos in assets/booth');

const gallery = shots.map((f, i) =>
  `      <figure class="pbc"><img src="assets/booth/${f}" alt="Guests in the AS·U·LIKE·IT photo booth at a Nashville-area event" loading="${i < 4 ? 'eager' : 'lazy'}"></figure>`
).join('\n');

const footerLinks = ['<div style="margin: 0 0 8px;"><a href="index.html">Home</a> &nbsp;&bull;&nbsp; <a href="photo-booth.html">Photo Booth</a> &nbsp;&bull;&nbsp; ' +
  ALL_CITIES.map((c) => `<a href="${c.file}">${c.name}, TN</a>`).join(' &nbsp;&bull;&nbsp; ') + '</div>'][0];

const title = 'Photo Booth Rental in Hendersonville, TN | AS·U·LIKE·IT Entertainment';
const desc = 'Photo booth rental in Hendersonville, Gallatin, and the Nashville area — $300 flat, setup and teardown included, printed strips, props, attendant, and a digital gallery.';

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<meta name="description" content="${desc}">
<meta property="og:title" content="Photo Booth Rental — AS·U·LIKE·IT Entertainment">
<meta property="og:description" content="Printed strips in minutes, props, an attendant, and a digital gallery. $300 flat in the Hendersonville / Nashville area.">
<meta property="og:type" content="website">
<meta property="og:image" content="https://djbenthomas.github.io/as-ulike-it/assets/booth/${shots[0]}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=Jost:wght@300;400;500;600&display=swap" rel="stylesheet">
${css}
<style>
  /* ---------- Photo booth page ---------- */
  .hero.pb { background-image: linear-gradient(rgba(42,37,32,.62), rgba(42,37,32,.78)), url('assets/booth/${shots[0]}'); background-position: center 40%; }
  .price-card { background: var(--white); border: 1px solid rgba(185,138,62,.25); border-radius: 14px; padding: 40px 32px; text-align: center; box-shadow: 0 18px 44px rgba(42,37,32,.08); max-width: 420px; margin: 0 auto; }
  .price-card .amt { font-family: 'Cormorant Garamond', serif; font-size: 66px; line-height: 1; color: var(--gold); }
  .price-card .amt small { font-size: 16px; letter-spacing: 2px; text-transform: uppercase; color: var(--ink-soft); display: block; margin-top: 8px; font-family: 'Jost', sans-serif; }
  .price-card ul { list-style: none; margin: 26px 0 30px; text-align: left; }
  .price-card li { padding: 9px 0; border-bottom: 1px solid rgba(185,138,62,.16); font-size: 15.5px; color: var(--ink-soft); }
  .price-card li::before { content: "✦ "; color: var(--gold); }
  .pb-gallery { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 14px; margin-top: 40px; }
  .pbc { margin: 0; border-radius: 10px; overflow: hidden; background: var(--cream-2); border: 1px solid rgba(185,138,62,.18); aspect-ratio: 4/3; }
  .pbc img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform .35s ease; }
  .pbc:hover img { transform: scale(1.04); }
  .steps { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 22px; margin-top: 44px; counter-reset: step; }
  .step { background: var(--white); border-radius: 12px; padding: 30px 26px; border: 1px solid rgba(185,138,62,.18); position: relative; }
  .step::before { counter-increment: step; content: counter(step); font-family: 'Cormorant Garamond', serif; font-size: 46px; color: var(--gold-soft); position: absolute; top: 10px; right: 20px; line-height: 1; }
  .step h3 { font-family: 'Cormorant Garamond', serif; font-size: 21px; margin-bottom: 8px; }
  .step p { color: var(--ink-soft); font-size: 15px; }
  .note { max-width: 720px; margin: 34px auto 0; text-align: center; font-size: 13.5px; color: var(--ink-soft); letter-spacing: .3px; }
</style>
</head>
<body>

<nav>
  <div class="wrap">
    <a class="nav-logo" href="index.html"><img class="nav-mark" src="assets/canva-logo.png" alt="AS·U·LIKE·IT Entertainment logo">AS·U·LIKE·IT <span>Entertainment</span></a>
    <div class="nav-links">
      <a href="index.html#about">About</a>
      <a href="index.html#services">Services</a>
      <a href="photo-booth.html">Photo Booth</a>
      <a href="index.html#reviews">Reviews</a>
      <a href="index.html#faq">FAQ</a>
      <a class="nav-cta" href="#contact">Book Your Date</a>
    </div>
  </div>
</nav>

<header class="hero pb">
  <div class="wrap">
    <div class="eyebrow">Photo Booth Rental &bull; Hendersonville, TN</div>
    <h1>The Photo <span class="amp">Booth</span></h1>
    <p class="tagline">Printed strips in minutes, props people actually use, and a digital gallery of every shot &mdash; $300 flat, setup included.</p>
    <div class="stats">
      <div><div class="stat-num">$300</div><div class="stat-label">Flat Rate</div></div>
      <div><div class="stat-num">3+</div><div class="stat-label">Hours</div></div>
      <div><div class="stat-num">Unlimited</div><div class="stat-label">Prints</div></div>
    </div>
    <div class="ctas">
      <a class="btn btn-gold" href="#contact">Check Your Date</a>
      <a class="btn btn-ghost" href="#gallery">See the Booth</a>
    </div>
  </div>
  <div class="scroll-hint">Scroll</div>
</header>

<section class="about" id="what">
  <div class="wrap">
    <div class="eyebrow">What You Get</div>
    <h2>Everything's <span class="gold">Included</span></h2>
    <div class="divider"></div>
    <p class="lead">No add-ons, no surprise line items. The price on this page is the price.</p>
    <div class="svc-grid">
      <div class="svc-card"><div class="svc-icon">🖨️</div><h3>Prints in Minutes</h3><p>Photo strips print on the spot &mdash; your guests walk away with one.</p></div>
      <div class="svc-card"><div class="svc-icon">🎭</div><h3>Props &amp; Backdrop</h3><p>A full prop box plus a backdrop that fits your theme.</p></div>
      <div class="svc-card"><div class="svc-icon">🙋</div><h3>Booth Attendant</h3><p>Someone runs the booth all night, so nothing jams and nobody waits.</p></div>
      <div class="svc-card"><div class="svc-icon">📱</div><h3>Digital Gallery</h3><p>Every photo delivered digitally, so you keep the whole night.</p></div>
      <div class="svc-card"><div class="svc-icon">🚚</div><h3>Setup &amp; Teardown</h3><p>We deliver, set up, and take it down. You don't lift a finger.</p></div>
      <div class="svc-card"><div class="svc-icon">🎧</div><h3>DJ Combo</h3><p>Bundle the booth with your DJ package and save &mdash; one team, one timeline.</p></div>
    </div>
  </div>
</section>

<section class="services" id="gallery">
  <div class="wrap">
    <div class="eyebrow">Real Events</div>
    <h2>Inside the <span class="gold">Booth</span></h2>
    <div class="divider"></div>
    <p class="lead">Actual strips and shots from recent weddings and parties around Middle Tennessee.</p>
    <div class="pb-gallery">
${gallery}
    </div>
    <p class="note">Photos shared with permission from hosts. Guests who'd rather not appear can ask us to pull any shot &mdash; just say the word.</p>
  </div>
</section>

<section class="about" id="how">
  <div class="wrap">
    <div class="eyebrow">How It Works</div>
    <h2>Three Steps, <span class="gold">Done</span></h2>
    <div class="divider"></div>
    <div class="steps">
      <div class="step"><h3>Pick Your Date</h3><p>Text or email us the date, venue, and hours. We confirm availability and hold it with a deposit.</p></div>
      <div class="step"><h3>We Build It Your Way</h3><p>Choose your backdrop and props. Want your names, monogram, or wedding date printed on the strip? We'll do the design.</p></div>
      <div class="step"><h3>We Run the Night</h3><p>We arrive early, set up, keep the booth running, and hand you the digital gallery afterward.</p></div>
    </div>
  </div>
</section>

<section class="services" id="pricing">
  <div class="wrap">
    <div class="eyebrow">Simple Pricing</div>
    <h2>$300, <span class="gold">All In</span></h2>
    <div class="divider"></div>
    <div class="price-card">
      <div class="amt">$300<small>Flat Rate &bull; Local</small></div>
      <ul>
        <li>Setup, operation &amp; teardown</li>
        <li>Unlimited printed strips</li>
        <li>Props &amp; backdrop included</li>
        <li>Booth attendant on site</li>
        <li>Digital gallery after the event</li>
        <li>Hendersonville, Gallatin, Goodlettsville &amp; Nashville area</li>
      </ul>
      <a class="btn btn-gold" href="#contact">Book the Booth</a>
    </div>
    <p class="note">Outside the local area? We still travel &mdash; ask for a quote. Booking the DJ too? Ask about the combo price; it's cheaper than both separately.</p>
  </div>
</section>

<section class="faq" id="faq">
  <div class="wrap">
    <div class="eyebrow">Good to Know</div>
    <h2>Booth <span class="gold">Questions</span></h2>
    <div class="divider"></div>
    <div class="faq-list" id="faqList"></div>
  </div>
</section>

<section class="contact" id="contact">
  <div class="wrap">
    <div class="eyebrow" style="color: var(--gold-soft);">Let's Talk</div>
    <h2>Book the <span class="gold">Booth</span></h2>
    <div class="divider"></div>
    <p>Tell us the date, venue, and how many hours you need. We'll confirm availability and send a quote &mdash; usually within the hour.</p>
    <div class="areas">
      <span>Hendersonville</span><span>Gallatin</span><span>Goodlettsville</span><span>Nashville</span><span>Sumner County</span><span>Middle TN</span>
    </div>
    <div class="contact-ctas">
      <a class="btn btn-gold" href="sms:6615330100">📱 Text Us</a>
      <a class="btn btn-white" href="mailto:djbenthomas@gmail.com?subject=Photo%20Booth%20Inquiry%20%E2%80%94%20AS%C2%B7U%C2%B7LIKE%C2%B7IT%20Entertainment">✉️ Email Us</a>
      <a class="btn btn-ghost" href="tel:6615330100">Call</a>
    </div>
    <p class="contact-links"><a href="sms:6615330100">661-533-0100</a> &nbsp;&bull;&nbsp; <a href="mailto:djbenthomas@gmail.com">djbenthomas@gmail.com</a></p>
  </div>
</section>

<footer>
  <div class="co">AS·U·LIKE·IT Entertainment</div>
  <div style="margin: 8px 0 4px;">Wedding DJ &bull; MC &bull; Photo Booth &mdash; Serving Hendersonville &amp; all of Middle Tennessee</div>
  ${footerLinks}
  <div><a href="https://as-ulikeit.com">as-ulikeit.com</a> &nbsp;&bull;&nbsp; <a href="sms:6615330100">661-533-0100</a> &nbsp;&bull;&nbsp; <a href="mailto:djbenthomas@gmail.com">djbenthomas@gmail.com</a></div>
</footer>

<script>
var faqs = [
  ["How much does the photo booth cost?", "$300 flat for the local area — that covers setup, the attendant, unlimited printed strips, props, the backdrop, teardown, and your digital gallery. No hidden add-ons."],
  ["How many hours do we get?", "The standard booking runs three hours of booth time. Need longer? Add hours when you book and we'll quote it upfront."],
  ["What kind of photos do we get?", "Printed strips in minutes, plus a digital copy of every shot delivered after the event so you can share and reprint them."],
  ["Can we customize the strip?", "Yes. Names, wedding date, monogram, or your event logo printed on the strip — just tell us what you want and we'll design it."],
  ["Do you bring props?", "A full prop box and a backdrop come with every booking. If you have a theme, we'll match it."],
  ["How much space does it need?", "About a 10x10 foot footprint with access to a standard outlet. We'll confirm the layout with your venue ahead of time."],
  ["Do you travel outside Hendersonville?", "We serve Hendersonville, Gallatin, Goodlettsville, Nashville, and the surrounding Middle Tennessee area. Further out is doable — ask for a travel quote."],
  ["Can we book the DJ and the booth together?", "Yes, and it's the better deal. One team, one timeline, one point of contact — ask about the combo price."],
  ["Does the booth work outdoors?", "It does. We'll plan for power, shade, and a weather backup with your venue."],
  ["How do we reserve a date?", "Text or email us the date and venue. A deposit holds it — details come with your quote."]
];
var faqList = document.getElementById('faqList');
faqs.forEach(function (f) {
  var item = document.createElement('div');
  item.className = 'faq-item';
  item.innerHTML = '<button class="faq-q">' + f[0] + '<span class="plus">+</span></button>' +
    '<div class="faq-a"><p>' + f[1] + '</p></div>';
  var q = item.querySelector('.faq-q');
  var a = item.querySelector('.faq-a');
  q.addEventListener('click', function () {
    var open = item.classList.contains('open');
    document.querySelectorAll('.faq-item.open').forEach(function (o) {
      o.classList.remove('open'); o.querySelector('.faq-a').style.maxHeight = '0';
    });
    if (!open) { item.classList.add('open'); a.style.maxHeight = a.scrollHeight + 'px'; }
  });
  faqList.appendChild(item);
});
<\/script>
</body>
</html>
`;

writeFileSync(join(ROOT, 'photo-booth.html'), html);
console.log(`photo-booth.html written — ${shots.length} gallery photos`);
