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
if (shots.length < 1) throw new Error('no booth photo found in assets/booth');

const gallery = shots.map((f, i) =>
  `      <figure class="pb-single"><picture><source srcset="assets/booth/${f.replace(/\.jpg$/, '.webp')}" type="image/webp"><img src="assets/booth/${f}" alt="The AS·U·LIKE·IT inflatable photo booth backdrop set up at an event" width="1322" height="1400" loading="eager" decoding="async"></picture></figure>`
).join('\n');

const footerLinks = ['<div style="margin: 0 0 8px;"><a href="index.html">Home</a> &nbsp;&bull;&nbsp; <a href="photo-booth.html">Photo Booth</a> &nbsp;&bull;&nbsp; ' +
  ALL_CITIES.map((c) => `<a href="${c.file}">${c.name}, TN</a>`).join(' &nbsp;&bull;&nbsp; ') + '</div>'][0];

const title = 'Photo Booth Rental in Hendersonville, TN | AS·U·LIKE·IT Entertainment';
const desc = 'Photo booth rental in Hendersonville, Gallatin, and the Nashville area — $100/hour with a 3-hour minimum, so $300 to start. Inflatable backdrop, props, printed strips, self-serve, plus your own photo website with every digital image.';

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<meta name="description" content="${desc}">
<meta property="og:title" content="Photo Booth Rental — AS·U·LIKE·IT Entertainment">
<meta property="og:description" content="Inflatable backdrop booth, printed strips in minutes, self-serve, and a personal photo website with every digital image. $100/hour, 3-hour minimum — starts at $300.">
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
  .pb-single { margin: 0; border-radius: 14px; overflow: hidden; border: 1px solid rgba(185,138,62,.22); box-shadow: 0 24px 60px rgba(42,37,32,.14); background: var(--cream-2); }
  .pb-single img { width: 100%; height: auto; display: block; }
  .pb-single { max-width: 720px; margin-left: auto; margin-right: auto; }
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
/* ---------- Inquiry form ---------- */
  .inq { max-width: 760px; margin: 38px auto 8px; text-align: left; }
  .inq-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
  @media (max-width: 640px) { .inq-grid { grid-template-columns: 1fr; } }
  .inq label { display: block; font-size: 11.5px; letter-spacing: 2px; text-transform: uppercase; color: rgba(255,255,255,.62); margin-bottom: 6px; }
  .inq input, .inq select, .inq textarea {
    width: 100%; padding: 13px 15px; border-radius: 8px; font-family: 'Jost', sans-serif;
    font-size: 15px; color: #fff; background: rgba(255,255,255,.07);
    border: 1px solid rgba(255,255,255,.22); outline: none;
  }
  .inq input:focus, .inq select:focus, .inq textarea:focus { border-color: var(--gold); background: rgba(255,255,255,.1); }
  .inq input::placeholder, .inq textarea::placeholder { color: rgba(255,255,255,.38); }
  .inq select option { color: #2A2520; }
  .inq .full { grid-column: 1 / -1; }
  .inq button {
    margin-top: 6px; width: 100%; padding: 15px 30px; border: 0; border-radius: 999px;
    background: var(--gold); color: #fff; font-family: 'Jost', sans-serif; font-weight: 500;
    letter-spacing: 2px; font-size: 13.5px; text-transform: uppercase; cursor: pointer; transition: background .2s;
  }
  .inq button:hover { background: #A5782F; }
  .inq-note { font-size: 12.5px; color: rgba(255,255,255,.55); margin-top: 12px; text-align: center; }
  .inq-or { text-align:center; color: rgba(255,255,255,.5); font-size: 12px; letter-spacing: 2.5px; text-transform: uppercase; margin: 34px 0 20px; }
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
    <p class="tagline" style="font-size:clamp(18px,2.8vw,24px); color:#fff; max-width:760px; margin:0 auto;"><strong>Your party doesn&rsquo;t end at 8 &mdash; and neither does your photo booth.</strong></p>
    <p class="tagline" style="margin-top:10px;">Ours stays through the end of your event, with nobody hovering over you.</p>
    <div class="stats">
      <div><div class="stat-num">$300</div><div class="stat-label">Starting</div></div>
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

<section class="services" id="included" style="padding:64px 0 56px;">
  <div class="wrap">
    <div class="eyebrow">In Every Booking</div>
    <h2>Instant Prints, <span class="gold">Custom Everything</span></h2>
    <div class="divider"></div>
    <div class="svc-grid">
      <div class="svc-card"><div class="svc-icon">🖨️</div><h3>Instant Prints</h3><p>Strips in your hands in seconds &mdash; not a link to check later.</p></div>
      <div class="svc-card"><div class="svc-icon">✒️</div><h3>Customized Designs</h3><p>Your names, date, or monogram printed on every strip.</p></div>
      <div class="svc-card"><div class="svc-icon">🎭</div><h3>Props Included</h3><p>A full prop box your guests actually dig through.</p></div>
      <div class="svc-card"><div class="svc-icon">🌐</div><h3>Online Photo Gallery</h3><p>Every shot in digital on your own personal photo website.</p></div>
    </div>
  </div>
</section>

<section class="about" id="what">
  <div class="wrap">
    <div class="eyebrow">What You Get</div>
    <h2>Everything's <span class="gold">Included</span></h2>
    <div class="divider"></div>
    <p class="lead">No hidden add-ons. $100 an hour with a three-hour minimum, and travel included within 30 minutes of Hendersonville.</p>
    <div class="svc-grid">
      <div class="svc-card"><div class="svc-icon">🖨️</div><h3>Prints in Minutes</h3><p>Photo strips print on the spot &mdash; your guests walk away with one.</p></div>
      <div class="svc-card"><div class="svc-icon">🎈</div><h3>Inflatable Backdrop</h3><p>A full enclosed backdrop booth &mdash; clean, evenly lit shots every time, in any room.</p></div>
      <div class="svc-card"><div class="svc-icon">🎭</div><h3>Props Included</h3><p>A full prop box your guests actually dig through.</p></div>
      <div class="svc-card"><div class="svc-icon">🙌</div><h3>Self-Serve</h3><p>Nobody hovering, nobody rushing you. Your guests run it themselves &mdash; that&rsquo;s what makes it fun.</p></div>
      <div class="svc-card"><div class="svc-icon">🌐</div><h3>Your Own Photo Site</h3><p>A personalized website with every single photo from the night, in digital &mdash; yours to keep and share.</p></div>
      <div class="svc-card"><div class="svc-icon">🚚</div><h3>Setup &amp; Teardown</h3><p>We deliver, set up, and take it down. You don't lift a finger.</p></div>
      <div class="svc-card"><div class="svc-icon">🎧</div><h3>DJ Combo</h3><p>Bundle the booth with your DJ package and save &mdash; one team, one timeline.</p></div>
    </div>
  </div>
</section>

<section class="about" id="backdrop">
  <div class="wrap">
    <div class="eyebrow">The Setup</div>
    <h2>The Inflatable <span class="gold">Backdrop</span></h2>
    <div class="divider"></div>
    <div class="about-grid">
      <picture><source srcset="assets/booth/${shots[0].replace(/\.jpg$/, '.webp')}" type="image/webp"><img class="about-img" src="assets/booth/${shots[0]}" alt="Inflatable photo booth backdrop at a Middle Tennessee wedding" width="1322" height="1400" loading="lazy" decoding="async"></picture>
      <div class="about-text">
        <p>This isn&rsquo;t a curtain on a flimsy frame. It&rsquo;s a <strong>full inflatable backdrop booth</strong> &mdash; a soft, enclosed shell that your guests step into. It inflates into shape and holds itself up, which is why it works in places a traditional booth can&rsquo;t go.</p>
        <p>What that means for your photos: the background is <strong>clean and identical in every single shot</strong>. No cluttered wall behind it, no ceiling lights blowing out half the frame, no shadows from somebody&rsquo;s phone. The booth lights the shot the same way at 6 PM and at midnight, so the photos from the first hour and the last hour actually look like they belong together.</p>
        <p>It also sets up almost anywhere &mdash; tight banquet rooms, barns, tents, a driveway, out on the lawn &mdash; because it doesn&rsquo;t need a wall to hang anything on and there&rsquo;s no rig to trip over. And because the walls are inflated, it&rsquo;s forgiving in a crowded room.</p>
        <div class="sig">&mdash; and no attendant hovering</div>
      </div>
    </div>
  </div>
</section>

<section class="services" id="website">
  <div class="wrap">
    <div class="eyebrow">Yours to Keep</div>
    <h2>Your Own <span class="gold">Photo Website</span></h2>
    <div class="divider"></div>
    <p class="lead">Every photo taken in the booth &mdash; all of them, in digital &mdash; goes onto a personalized website built for your event.</p>
    <div class="svc-grid">
      <div class="svc-card"><div class="svc-icon">🌐</div><h3>One Link for Everyone</h3><p>Send it to your guests. No app, no download, no logins to fight with.</p></div>
      <div class="svc-card"><div class="svc-icon">🖼️</div><h3>Every Single Photo</h3><p>Not a highlight reel &mdash; the whole night, every shot the booth took.</p></div>
      <div class="svc-card"><div class="svc-icon">⬇️</div><h3>Download &amp; Reprint</h3><p>Full-resolution files, yours to save, print, post, or frame.</p></div>
    </div>
    <p class="note">Your site, your photos. We don&rsquo;t watermark them and we don&rsquo;t hold them hostage.</p>
    <style>
      .gal-links { max-width: 720px; margin: 22px auto 0; display: grid; gap: 10px; }
      .gal-link { display: flex; align-items: center; gap: 12px; padding: 14px 20px;
        background: #fff; border: 1px solid rgba(35,32,28,.14); border-radius: 10px;
        color: var(--ink); text-decoration: none; font-size: 14px; letter-spacing: .2px;
        transition: transform .2s, border-color .2s, box-shadow .2s; }
      .gal-link:hover { transform: translateY(-2px); border-color: var(--gold);
        box-shadow: 0 10px 24px rgba(35,32,28,.10); }
      .gal-link .gal-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--gold); flex: none; }
      .gal-link .gal-arr { margin-left: auto; color: var(--gold); font-size: 17px; }
      .gal-cap { margin: 18px auto 0; text-align: center; font-size: 12px;
        letter-spacing: .22em; text-transform: uppercase; color: var(--ink-soft); opacity: .8; }
    </style>
    <p class="gal-cap">Real galleries &mdash; tap one</p>
    <div class="gal-links">
      <a class="gal-link" href="https://djbenthomas.github.io/bryanna-ashton-photobooth/" target="_blank" rel="noopener">
        <span class="gal-dot"></span> Bryanna &amp; Ashton &middot; October 2026 <span class="gal-arr">&rarr;</span>
      </a>
      <a class="gal-link" href="https://djbenthomas.github.io/samantha-wyatt-photobooth/" target="_blank" rel="noopener">
        <span class="gal-dot"></span> Samantha &amp; Wyatt &middot; October 2026 <span class="gal-arr">&rarr;</span>
      </a>
      <a class="gal-link" href="https://djbenthomas.github.io/michelle-aaron-photobooth/" target="_blank" rel="noopener">
        <span class="gal-dot"></span> Michelle &amp; Aaron &middot; September 2026 <span class="gal-arr">&rarr;</span>
      </a>
    </div>
  </div>
</section>

<section class="services" id="gallery">
  <div class="wrap">
    <div class="eyebrow">Real Events</div>
    <h2>The Booth, <span class="gold">Set Up</span></h2>
    <div class="divider"></div>
    <p class="lead">What shows up at your venue &mdash; the full inflatable backdrop, lit and ready.</p>
    <div class="pb-gallery">
${gallery}
    </div>
    <p class="note">The inflatable photo booth backdrop &mdash; set up, lit, and ready for your guests.</p>
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
    <h2>Starts at <span class="gold">$300</span></h2>
    <div class="divider"></div>
    <div class="price-card">
      <div class="amt">$300<small>Starting &bull; 3-Hour Minimum</small></div>
      <ul>
        <li>Setup, operation &amp; teardown</li>
        <li>Unlimited printed strips</li>
        <li>Inflatable backdrop booth</li>
        <li>Props included</li>
        <li>Self-serve &mdash; no attendant hovering</li>
        <li>Personalized photo website with every digital image</li>
        <li>Digital gallery after the event</li>
        <li>Hendersonville, Gallatin, Goodlettsville &amp; Nashville area</li>
      </ul>
      <p style="font-family:'Cormorant Garamond',serif; font-size:20px; font-style:italic; color:var(--ink); margin:0 0 20px;">Your party doesn&rsquo;t end at 8 &mdash; and neither does your photo booth. Ours stays through the end of your event, with nobody hovering over you.</p>
      <p style="font-size:14px; color:var(--ink-soft); margin:0 0 22px; line-height:1.7;"><strong style="color:var(--ink);">$100/hour</strong>, three-hour minimum. Travel included within 30 minutes of Hendersonville &mdash; farther out, we add travel. Need a fourth hour? $100, no games.</p>
      <a class="btn btn-gold" href="#contact">Book the Booth</a>
    </div>
    <p class="note">Outside 30 minutes of Hendersonville? We still travel &mdash; we just add the drive. Booking the DJ too? Ask about the combo price; it's cheaper than both separately.</p>
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
    <div class="inq-or">Or reach us directly</div>
<form class="inq" action="https://formsubmit.co/djbenthomas@gmail.com" method="POST">
      <input type="hidden" name="_subject" value="New booking inquiry — as-ulikeit.com">
      <input type="hidden" name="_template" value="table">
      <input type="hidden" name="_captcha" value="false">
      <input type="text" name="_honey" style="display:none">
      <div class="inq-grid">
        <div><label for="inq-name">Your name</label><input id="inq-name" type="text" name="name" required placeholder="First and last"></div>
        <div><label for="inq-email">Email</label><input id="inq-email" type="email" name="email" required placeholder="you@email.com"></div>
        <div><label for="inq-phone">Phone</label><input id="inq-phone" type="tel" name="phone" placeholder="(615) 555-0123"></div>
        <div><label for="inq-date">Event date</label><input id="inq-date" type="date" name="event_date" required></div>
        <div><label for="inq-venue">Venue / location</label><input id="inq-venue" type="text" name="venue" placeholder="Venue name or city"></div>
        <div><label for="inq-guests">Guest count</label><input id="inq-guests" type="text" name="guests" placeholder="Approximate"></div>
        <div class="full"><label for="inq-services">Services needed</label>
          <select id="inq-services" name="services" multiple size="5" style="height:auto;">
            <option value="Wedding DJ & MC">Wedding DJ &amp; MC</option>
            <option value="Ceremony sound">Ceremony sound</option>
            <option value="Reception DJ + MC">Reception DJ + MC</option>
            <option value="Photo booth">Photo booth</option>
            <option value="Lighting / uplighting">Lighting / uplighting</option>
            <option value="Corporate or private party">Corporate or private party</option>
          </select>
        </div>
        <div class="full"><label for="inq-msg">Anything else?</label><textarea id="inq-msg" name="message" rows="3" placeholder="Tell us about your day"></textarea></div>
      </div>
      <button type="submit">Send Inquiry</button>
      <p class="inq-note">We reply fast &mdash; usually within the hour. No spam, ever.</p>
    </form>
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
  ["How much does the photo booth cost?", "$100 an hour with a three-hour minimum, so $300 to start — that covers setup, the inflatable backdrop booth, props, unlimited printed strips, teardown, and your own photo website with every digital image. Travel is included within 30 minutes of Hendersonville; beyond that we add a travel fee. Extra hours are $100 each."],
  ["How many hours do we get?", "The standard booking runs three hours of booth time. Need longer? Add hours when you book and we'll quote it upfront."],
  ["What kind of photos do we get?", "Printed strips in minutes at the booth — plus every single photo in digital form on your own personalized photo website afterward. You keep all of them, share the link with guests, download, and reprint anything you want."],
  ["Can we customize the strip?", "Yes. Names, wedding date, monogram, or your event logo printed on the strip — just tell us what you want and we'll design it."],
  ["Is anyone running the booth?", "No &mdash; and that's on purpose. The booth is self-serve, so your guests walk up and use it whenever they want, however many times they want. No one standing there watching, no one telling anybody to hurry up. Guests tell us that's exactly what makes it fun &mdash; and the photos come out looser and more personal because of it. We set it up, test it, and it runs itself all night."],
  ["How do we get our photos?", "Every photo lands on a personalized photo website built for your event &mdash; one link you can share with guests. All the images, in digital, full resolution, no watermark. Download, reprint, or post whatever you want."],
  ["Do you bring props?", "A full prop box comes with every booking. If you have a theme, we'll match it."],
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
