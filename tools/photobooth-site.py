#!/usr/bin/env python3
"""
photobooth-site.py — build the client-facing gallery page from a manifest.

    python3 tools/photobooth-site.py --out ../bryanna-ashton

Reads <out>/site-meta.json + <out>/manifest.json, writes <out>/web/index.html.
"""

import argparse, html, json, os, sys
from datetime import date
from pathlib import Path


def esc(s):
    return html.escape(str(s), quote=True)


def pretty_date(iso):
    y, m, d = (int(x) for x in iso.split("-"))
    return date(y, m, d).strftime("%B %-d, %Y")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    ap.add_argument("--palette", default="plum", choices=["plum", "green", "navy"])
    ap.add_argument("--mode", default="full", choices=["full", "strips"],
                    help="strips = only single strips, each with its own download button")
    ap.add_argument("--review-url", default="https://www.google.com/maps/search/?api=1&query=AS%20U%20LIKE%20IT%20Entertainment%20Hendersonville%20TN",
                    help="Google review link shown to the couple")
    args = ap.parse_args()

    out = Path(os.path.expanduser(args.out))
    meta = json.loads((out / "site-meta.json").read_text())
    manifest = json.loads((out / "manifest.json").read_text())

    review_url = esc(args.review_url)
    couple = meta["couple"]
    parts = [p.strip() for p in couple.replace(" and ", " & ").split("&")]
    if len(parts) == 2:
        names_html = f'<span class="nm">{esc(parts[0])}</span><span class="amp">&amp;</span><span class="nm">{esc(parts[1])}</span>'
        short = f"{esc(parts[0])} <span class=\"amp-inline\">&amp;</span> {esc(parts[1])}"
    else:
        names_html = f'<span class="nm">{esc(couple)}</span>'
        short = esc(couple)

    d = meta["date"]
    dlabel = pretty_date(d)
    dot = d.replace("-", " &middot; ")

    frames = []
    for s in manifest:
        for fr in s["frames"]:
            frames.append({"f": fr["file"], "strip": s["id"]})

    strips = [s["strip"] for s in manifest]
    nf, ns = len(frames), len(strips)

    palettes = {
        "plum":   {"ink": "#150f12", "ink2": "#20161a", "cream": "#f7f1e8", "cream2": "#ebe0d2",
                   "accent": "#c98b8b", "accent2": "#e3abab", "gold": "#cfa55e", "bg2": "#1b1216"},
        "green":  {"ink": "#12211a", "ink2": "#1c3327", "cream": "#f6f0e2", "cream2": "#efe6d2",
                   "accent": "#e08a4a", "accent2": "#e08a4a", "gold": "#c9a24a", "bg2": "#16281f"},
        "navy":   {"ink": "#101826", "ink2": "#17233a", "cream": "#f4f1ea", "cream2": "#e4dfd2",
                   "accent": "#a8b8cf", "accent2": "#c3cfe0", "gold": "#c8a96a", "bg2": "#131d2e"},
    }
    p = palettes[args.palette]

    strips_only = args.mode == "strips"

    hero_sub = (f"Every strip from the night &mdash; <b>{ns}</b> keepsakes, each one yours to download."
                if strips_only else
                f"Every laugh, every pose &mdash; <b>{nf}</b> moments caught in the booth.")

    frame_html = "" if strips_only else "".join(
        f'<a class="shot" href="photos/{esc(fr["f"])}" data-i="{i}" data-strip="{fr["strip"]}">'
        f'<img loading="lazy" decoding="async" src="photos/{esc(fr["f"])}" alt="{esc(couple)} photo booth, frame {i+1}"></a>'
        for i, fr in enumerate(frames)
    )
    strip_html = "".join(
        f'<div class="stripcard">'
        f'<a class="stripimg" href="strips/{esc(s)}" target="_blank" rel="noopener">'
        f'<img loading="lazy" decoding="async" src="strips/{esc(s)}" '
        f'alt="{esc(couple)} photo booth strip {i+1}"></a>'
        f'<a class="stripdl" href="strips/{esc(s)}" download="{esc(s)}">&#11015; Download</a>'
        f'</div>'
        for i, s in enumerate(strips)
    )

    html_doc = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{esc(couple)} &middot; {esc(dlabel)}</title>
<meta name="description" content="Photo booth gallery from the wedding of {esc(couple)} — {esc(dlabel)}. {ns} keepsake strips, {nf} moments. By AS·U·LIKE·IT Entertainment.">
<meta name="robots" content="noindex, follow">
<meta name="theme-color" content="{p['ink']}">
<meta property="og:type" content="website">
<meta property="og:title" content="{esc(couple)} — Photo Booth Gallery">
<meta property="og:description" content="{ns} keepsake strips, {nf} moments from {esc(dlabel)}.">
<meta property="og:image" content="strips/{esc(strips[0])}">
<style>
:root{{
  --ink:{p['ink']}; --ink2:{p['ink2']}; --cream:{p['cream']}; --cream2:{p['cream2']};
  --accent:{p['accent']}; --accent2:{p['accent2']}; --gold:{p['gold']}; --bg2:{p['bg2']};
}}
*{{box-sizing:border-box}}
html{{scroll-behavior:smooth}}
body{{margin:0;background:var(--ink);color:var(--cream);
  font-family:"Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif;
  -webkit-font-smoothing:antialiased}}
img{{display:block;max-width:100%;height:auto}}

/* hero */
.hero{{position:relative;overflow:hidden;padding:clamp(46px,8vw,96px) 20px clamp(38px,5vw,66px);
  text-align:center;background:
    radial-gradient(1100px 560px at 50% -8%, {p['ink2']} 0%, transparent 62%),
    linear-gradient(180deg,{p['bg2']} 0%,var(--ink) 100%);}}
.hero:before,.hero:after{{content:"";position:absolute;pointer-events:none;opacity:.34;
  width:280px;height:280px;border-radius:50%;filter:blur(66px)}}
.hero:before{{background:var(--accent);left:-70px;top:-50px}}
.hero:after{{background:var(--gold);right:-80px;top:30px}}
.hero-inner{{position:relative;max-width:920px;margin:0 auto}}
.eyebrow{{margin:0 0 16px;letter-spacing:.42em;text-transform:uppercase;
  font-size:clamp(10px,1.5vw,12.5px);color:var(--gold)}}
.hero h1{{margin:0;font-weight:400;line-height:.98;font-size:clamp(38px,9vw,88px);
  letter-spacing:.01em;display:flex;flex-direction:column;align-items:center}}
.hero h1 .nm{{display:block}}
.hero h1 .amp{{display:block;font-size:.42em;font-style:italic;line-height:1.2;
  color:var(--gold);opacity:.92;transform:translateY(-.05em)}}
.rule{{display:flex;align-items:center;gap:16px;justify-content:center;margin:22px auto 0;max-width:430px}}
.rule i{{flex:1;height:1px;background:linear-gradient(90deg,transparent,var(--gold),transparent)}}
.date{{margin:0;font-size:clamp(14px,2.3vw,19px);letter-spacing:.3em;color:var(--cream2)}}
.sub{{margin:24px auto 0;max-width:600px;color:#dfd7d1;font-size:15px;line-height:1.75}}
.sub b{{color:var(--gold);font-weight:400}}
.cardwrap{{margin:32px auto 0;display:inline-block;text-align:center}}
.hero .card{{width:clamp(150px,17vw,190px);border-radius:10px;
  box-shadow:0 26px 60px rgba(0,0,0,.55);border:1px solid rgba(247,241,232,.16);
  transition:transform .5s cubic-bezier(.2,.7,.3,1)}}
.hero .card:hover{{transform:translateY(-6px) rotate(-.7deg)}}
.cardcap{{margin:14px 0 0;font-size:10.5px;letter-spacing:.28em;text-transform:uppercase;
  color:var(--gold);opacity:.85}}

/* sections */
section{{padding:clamp(42px,5vw,70px) 20px}}
.wrap{{max-width:1180px;margin:0 auto}}
.sechead{{text-align:center;margin-bottom:clamp(26px,4.5vw,48px)}}
.sechead:before{{content:"";display:block;width:64px;height:1px;margin:0 auto 22px;
  background:linear-gradient(90deg,transparent,var(--gold),transparent)}}
.sechead h2{{margin:0;font-weight:400;font-size:clamp(24px,4vw,37px);letter-spacing:.02em}}
.sechead p{{margin:12px 0 0;color:#b3a9a2;font-size:12.5px;letter-spacing:.14em;text-transform:uppercase}}

.grid{{display:grid;gap:12px;grid-template-columns:repeat(auto-fill,minmax(190px,1fr))}}
.shot{{position:relative;overflow:hidden;border-radius:10px;background:#0c080a;
  border:1px solid rgba(247,241,232,.08);cursor:zoom-in;
  transition:transform .35s cubic-bezier(.2,.7,.3,1),box-shadow .35s,border-color .35s}}
.shot img{{width:100%;height:100%;object-fit:cover;aspect-ratio:3/2;
  transition:transform .5s cubic-bezier(.2,.7,.3,1)}}
.shot:hover{{transform:translateY(-4px);border-color:rgba(207,165,94,.55);
  box-shadow:0 18px 40px rgba(0,0,0,.5)}}
.shot:hover img{{transform:scale(1.05)}}

.strips{{display:grid;gap:18px;grid-template-columns:repeat(auto-fill,minmax(148px,1fr))}}
.stripcard{{display:flex;flex-direction:column;border-radius:9px;overflow:hidden;background:#0c080a;
  border:1px solid rgba(247,241,232,.08);
  transition:transform .35s,box-shadow .35s,border-color .35s}}
.stripcard:hover{{transform:translateY(-5px);border-color:rgba(207,165,94,.55);
  box-shadow:0 22px 44px rgba(0,0,0,.55)}}
.stripcard .stripimg{{display:block;line-height:0}}
.stripcard img{{width:100%}}
.stripdl{{display:block;text-align:center;padding:11px 8px;font-size:10px;letter-spacing:.18em;
  text-transform:uppercase;color:var(--gold);text-decoration:none;
  border-top:1px solid rgba(247,241,232,.09);transition:.2s}}
.stripdl:hover{{background:var(--gold);color:{p['ink']}}}

.dl{{display:flex;flex-wrap:wrap;gap:14px;justify-content:center;padding:0 20px 10px}}
.btn{{display:inline-flex;align-items:center;gap:9px;padding:14px 26px;border-radius:999px;
  border:1px solid rgba(247,241,232,.28);color:var(--cream);text-decoration:none;
  font-size:11.5px;letter-spacing:.2em;text-transform:uppercase;transition:.25s}}
.btn:hover{{border-color:var(--gold);color:var(--gold)}}
.btn.solid{{background:var(--gold);border-color:var(--gold);color:{p['ink']};font-weight:600}}
.btn.solid:hover{{background:var(--accent2);border-color:var(--accent2);color:{p['ink']}}}

/* review ask */
.reviewband{{background:linear-gradient(180deg,var(--ink) 0%,{p['bg2']} 100%);text-align:center;
  padding:clamp(42px,6vw,72px) 20px;border-top:1px solid rgba(247,241,232,.07)}}
.reviewband .eyebrow{{margin-bottom:14px}}
.reviewband h2{{margin:0 0 14px;font-weight:400;font-size:clamp(23px,3.6vw,34px)}}
.reviewband p{{margin:0 auto 26px;max-width:520px;color:#cfc5be;font-size:14.5px;line-height:1.7}}

footer{{padding:60px 20px 78px;text-align:center;background:{p['bg2']};
  border-top:1px solid rgba(247,241,232,.09)}}
footer .name{{font-size:22px;letter-spacing:.08em;color:var(--cream)}}
footer .cred{{margin-top:14px;color:#9d948e;font-size:13.5px;line-height:1.9}}
footer a{{color:var(--accent2);text-decoration:none;border-bottom:1px solid rgba(227,171,171,.4)}}
.amp-inline{{color:var(--gold);font-style:italic}}
.top{{display:inline-block;margin-top:24px;font-size:11.5px;letter-spacing:.22em;
  text-transform:uppercase;color:#a79e97;text-decoration:none;border:0}}

/* lightbox */
#lb{{position:fixed;inset:0;background:rgba(8,5,6,.965);display:none;align-items:center;
  justify-content:center;z-index:99;padding:24px}}
#lb.on{{display:flex}}
#lb img{{max-width:min(94vw,980px);max-height:82vh;border-radius:9px;
  box-shadow:0 30px 80px rgba(0,0,0,.7)}}
#lb button{{position:absolute;background:rgba(247,241,232,.08);color:var(--cream);
  border:1px solid rgba(247,241,232,.18);width:52px;height:52px;border-radius:50%;
  font-size:24px;cursor:pointer;display:grid;place-items:center;transition:.25s}}
#lb button:hover{{background:rgba(207,165,94,.28);border-color:var(--gold)}}
#prev{{left:3vw}} #next{{right:3vw}} #close{{top:3vh;right:3vw}}
#count{{position:absolute;bottom:3vh;left:50%;transform:translateX(-50%);
  color:#a79e97;font-size:12.5px;letter-spacing:.2em}}
#dlone{{position:absolute;top:3vh;left:3vw;text-decoration:none;color:var(--cream);
  font-size:11.5px;letter-spacing:.18em;text-transform:uppercase;border:1px solid rgba(247,241,232,.2);
  padding:11px 18px;border-radius:999px}}
@media(max-width:640px){{.grid{{grid-template-columns:repeat(2,1fr);gap:8px}}
  #prev{{left:8px}} #next{{right:8px}} .strips{{grid-template-columns:repeat(2,1fr);gap:10px}}}}
</style>
</head>
<body>

<header class="hero">
  <div class="hero-inner">
    <p class="eyebrow">The Wedding Of</p>
    <h1>{names_html}</h1>
    <div class="rule"><i></i><span class="date">{dot}</span><i></i></div>
    <p class="sub">{hero_sub}
      Thank you for letting us be part of it. Here&rsquo;s the whole night, one frame at a time.</p>
    <div class="cardwrap">
      <img class="card" src="strips/{esc(strips[min(9, ns - 1)])}" alt="{esc(couple)}, {esc(dlabel)}">
      <p class="cardcap">The Booth Keepsake</p>
    </div>
  </div>
</header>

{'' if strips_only else f'''<section id="photos">
  <div class="wrap">
    <div class="sechead">
      <h2>The Moments</h2>
      <p>{nf} photos &middot; tap to enlarge</p>
    </div>
    <div class="grid">{frame_html}</div>
  </div>
</section>'''}

<section id="strips" style="background:{p['bg2']}">
  <div class="wrap">
    <div class="sechead">
      <h2>{'The Strips' if strips_only else 'The Strips'}</h2>
      <p>{ns} keepsake strips &middot; tap a strip to open it, or download any one</p>
    </div>
    <div class="strips">{strip_html}</div>
  </div>
</section>

<section>
  <div class="dl">
    <a class="btn solid" href="downloads/all-strips.zip" download>&#11015; Download All Strips</a>
    {'' if strips_only else '<a class="btn" href="downloads/all-photos.zip" download>&#11015; Download All Photos</a>'}
  </div>
</section>

<section class="reviewband">
  <p class="eyebrow">One Small Favor</p>
  <h2>Did the booth make your night?</h2>
  <p>A 30-second Google review is the whole marketing budget around here &mdash;
     it&rsquo;s how the next couple finds us.</p>
  <a class="btn solid" href="{review_url}" target="_blank" rel="noopener">&#9733; Leave a Review</a>
</section>

<footer>
  <div class="name">{short}</div>
  <div class="cred">{esc(dlabel)}{(' &middot; ' + esc(meta['venue'])) if meta.get('venue') else ''}<br>
    Photo booth by AS&middot;U&middot;LIKE&middot;IT Entertainment<br>
    <a href="https://as-ulikeit.com">as-ulikeit.com</a> &middot;
    <a href="{review_url}" target="_blank" rel="noopener">Leave a review</a></div>
  <a class="top" href="#top">Back to top</a>
</footer>

<div id="lb" role="dialog" aria-modal="true" aria-label="Photo viewer">
  <button id="prev" aria-label="Previous">&#8249;</button>
  <img id="lbimg" alt="">
  <button id="next" aria-label="Next">&#8250;</button>
  <button id="close" aria-label="Close">&#10005;</button>
  <a id="dlone" href="#" download>Download</a>
  <div id="count"></div>
</div>

<script>
var FRAMES = {json.dumps(frames)};
var lb = document.getElementById('lb'), img = document.getElementById('lbimg'),
    count = document.getElementById('count'), dl = document.getElementById('dlone'), i = 0;

function show(n) {{
  i = (n + FRAMES.length) % FRAMES.length;
  img.src = 'photos/' + FRAMES[i].f;
  dl.href = img.src;
  dl.setAttribute('download', FRAMES[i].f);
  count.textContent = (i + 1) + ' / ' + FRAMES.length;
}}
function openLb(n) {{ show(n); lb.classList.add('on'); document.body.style.overflow = 'hidden'; }}
function closeLb() {{ lb.classList.remove('on'); document.body.style.overflow = ''; }}

document.querySelectorAll('.shot').forEach(function (a) {{
  a.addEventListener('click', function (e) {{
    e.preventDefault();
    openLb(parseInt(a.dataset.i, 10));
  }});
}});

document.getElementById('prev').onclick = function (e) {{ e.stopPropagation(); show(i - 1); }};
document.getElementById('next').onclick = function (e) {{ e.stopPropagation(); show(i + 1); }};
document.getElementById('close').onclick = closeLb;
lb.addEventListener('click', function (e) {{ if (e.target === lb) closeLb(); }});
document.addEventListener('keydown', function (e) {{
  if (!lb.classList.contains('on')) return;
  if (e.key === 'Escape') closeLb();
  if (e.key === 'ArrowLeft') show(i - 1);
  if (e.key === 'ArrowRight') show(i + 1);
}});
var x0 = null;
lb.addEventListener('touchstart', function (e) {{ x0 = e.touches[0].clientX; }}, {{passive: true}});
lb.addEventListener('touchend', function (e) {{
  if (x0 === null) return;
  var dx = e.changedTouches[0].clientX - x0;
  if (Math.abs(dx) > 45) show(i + (dx > 0 ? -1 : 1));
  x0 = null;
}});
</script>
</body>
</html>
"""

    (out / "web" / "index.html").write_text(html_doc)
    print(f"  wrote {out/'web'/'index.html'}  ({len(html_doc)/1024:.0f} KB, {ns} strips, {nf} frames)")


if __name__ == "__main__":
    main()
