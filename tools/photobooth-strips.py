#!/usr/bin/env python3
"""
photobooth-strips.py — split photo booth print sheets into single strips and
build a client gallery site.

    python3 tools/photobooth-strips.py \
        --src "/Volumes/Untitled/2026_10_24 Bryanna & Ashton" \
        --couple "Bryanna & Ashton" \
        --date 2026-10-24 \
        --out ../bryanna-ashton

What it expects: 4x6 print sheets (1200x1800) holding TWO 2x6 strips side by
side, 3 poses per strip + a printed footer panel.

Output:
    <out>/strips/s001.jpg ...     600x1800 single strips
    <out>/photos/s001_1.jpg ...   600x~380 individual poses
    <out>/web/                    the gallery page (index.html, strips/, photos/, downloads/)
    <out>/manifest.json
"""

import argparse, json, os, shutil, subprocess, sys, zipfile
from pathlib import Path

import numpy as np
from PIL import Image

IMAGE_EXT = {".jpg", ".jpeg", ".png", ".webp", ".tif", ".tiff"}
STRIP_W = 600
STRIP_H = 1800
PAGE_W = 600          # per-frame export width
STRIP_Q = 82
FRAME_Q = 80


def log(msg):
    print(msg, flush=True)


def find_sheets(src: Path):
    files = [p for p in src.iterdir() if p.is_file() and p.suffix.lower() in IMAGE_EXT]
    return sorted(files, key=lambda p: p.name)


def seam_x(img: Image.Image) -> int:
    """Find the vertical cut between the two strips (darkest column near center)."""
    w, h = img.size
    a = np.asarray(img.convert("RGB")).astype(float)
    col = a.mean(axis=(0, 2))
    lo, hi = int(w * 0.42), int(w * 0.58)
    return lo + int(np.argmin(col[lo:hi]))


def frame_bands(strip: Image.Image):
    """Return [(y0, y1), ...] for the real photo rows, skipping white gaps + footer."""
    w, h = strip.size
    a = np.asarray(strip.convert("RGB")).astype(float)
    row = a.mean(axis=(1, 2))
    rowstd = a.reshape(h, -1).std(axis=1)

    # a gap row is bright and flat across the whole width
    is_gap = (row >= 232) & (rowstd < 26)
    bands, start = [], None
    for y in range(h):
        if not is_gap[y] and start is None:
            start = y
        elif is_gap[y] and start is not None:
            if y - start > 120:            # real photo, not a stray line
                bands.append((start, y))
            start = None
    if start is not None and h - start > 120:
        bands.append((start, h))

    # drop anything in the printed footer zone (the bottom branding panel)
    bands = [b for b in bands if b[0] < h * 0.74]
    if len(bands) != 3:                    # geometry fallback: three equal thirds
        top, bottom = 13, int(h * 0.74)
        step = (bottom - top) / 3.0
        bands = [(int(top + i * step), int(top + (i + 1) * step)) for i in range(3)]
    return bands


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", required=True)
    ap.add_argument("--couple", required=True)
    ap.add_argument("--date", required=True, help="YYYY-MM-DD")
    ap.add_argument("--out", required=True)
    ap.add_argument("--venue", default="")
    ap.add_argument("--limit", type=int, default=0, help="only first N sheets (testing)")
    args = ap.parse_args()

    src = Path(os.path.expanduser(args.src))
    out = Path(os.path.expanduser(args.out))
    if not src.is_dir():
        sys.exit(f"source folder not found: {src}")

    strips_dir = out / "strips"
    frames_dir = out / "photos"
    web = out / "web"
    for d in (strips_dir, frames_dir, web / "strips", web / "photos", web / "downloads"):
        d.mkdir(parents=True, exist_ok=True)

    sheets = find_sheets(src)
    if args.limit:
        sheets = sheets[: args.limit]
    if not sheets:
        sys.exit("no images found")

    log(f"  {len(sheets)} print sheet(s) found in {src}")

    manifest = []
    n = 0
    for i, sheet in enumerate(sheets, 1):
        img = Image.open(sheet).convert("RGB")
        w, h = img.size
        cut = seam_x(img)
        halves = [(0, cut - 1), (cut + 1, w)]

        for hx0, hx1 in halves:
            n += 1
            name = f"s{n:03d}"
            strip = img.crop((hx0, 0, hx1, min(h, STRIP_H)))
            if strip.size[0] != STRIP_W or strip.size[1] != STRIP_H:
                strip = strip.resize((STRIP_W, STRIP_H), Image.LANCZOS)

            strip_path = strips_dir / f"{name}.jpg"
            strip.save(strip_path, "JPEG", quality=STRIP_Q, optimize=True, progressive=True)
            strip.save(web / "strips" / f"{name}.jpg", "JPEG", quality=STRIP_Q, optimize=True, progressive=True)

            frames = []
            for j, (y0, y1) in enumerate(frame_bands(strip), 1):
                pad = 2
                box = (0, max(0, y0 + pad), STRIP_W, min(STRIP_H, y1 - pad))
                fr = strip.crop(box)
                if PAGE_W and fr.size[0] != PAGE_W:
                    fr = fr.resize((PAGE_W, int(fr.size[1] * PAGE_W / fr.size[0])), Image.LANCZOS)
                fname = f"{name}_{j}.jpg"
                fr.save(frames_dir / fname, "JPEG", quality=FRAME_Q, optimize=True, progressive=True)
                fr.save(web / "photos" / fname, "JPEG", quality=FRAME_Q, optimize=True, progressive=True)
                frames.append({"file": fname, "w": fr.size[0], "h": fr.size[1]})

            manifest.append({
                "id": n,
                "strip": f"{name}.jpg",
                "src": sheet.name,
                "half": "left" if hx0 == 0 else "right",
                "frames": frames,
            })

        if i % 12 == 0 or i == len(sheets):
            log(f"  ...{i}/{len(sheets)} sheets -> {n} strips")

    (out / "manifest.json").write_text(json.dumps(manifest, indent=1) + "\n")
    log(f"  strips: {n}   frames: {sum(len(m['frames']) for m in manifest)}")

    # zips
    def zipit(zip_name, root, files):
        zp = web / "downloads" / zip_name
        with zipfile.ZipFile(zp, "w", zipfile.ZIP_STORED) as z:
            for f in files:
                z.write(root / f, arcname=f)
        return zp.stat().st_size

    s_bytes = zipit("all-strips.zip", strips_dir, sorted(p.name for p in strips_dir.iterdir()))
    f_bytes = zipit("all-photos.zip", frames_dir, sorted(p.name for p in frames_dir.iterdir()))
    log(f"  zip: strips {s_bytes/1e6:.1f} MB   photos {f_bytes/1e6:.1f} MB")

    meta = {
        "couple": args.couple,
        "date": args.date,
        "venue": args.venue,
        "strips": n,
        "frames": sum(len(m["frames"]) for m in manifest),
        "has_strips_zip": True,
        "has_photos_zip": True,
    }
    (out / "site-meta.json").write_text(json.dumps(meta, indent=2) + "\n")
    log(f"  done -> {out}")


if __name__ == "__main__":
    main()
