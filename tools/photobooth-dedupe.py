#!/usr/bin/env python3
"""
photobooth-dedupe.py — find strips that are the same print saved more than once
(the booth re-prints / re-saves a strip, so the same 3 poses show up on several
sheets). Keeps the first occurrence in the gallery and moves every later copy to
<out>/duplicates/, then rewrites manifest.json + npm-free zips.

    python3 tools/photobooth-dedupe.py --out ../skyler-emely
    python3 tools/photobooth-dedupe.py --out ../skyler-emely --threshold 0.90 --dry-run

Comparison: downscaled grayscale (150x450), mean-subtracted, shift-tolerant
normalized correlation — same metric photobooth-strips.py uses for the
left/right halves of a sheet. 1.0 = identical, ~0.9 = same print.
"""

import argparse
import json
import os
import shutil
import sys
import zipfile
from pathlib import Path

import numpy as np
from PIL import Image

SIZE = (150, 450)
SHIFTS = (-3, -2, -1, 0, 1, 2, 3)


def signature(path: Path):
    a = np.asarray(Image.open(path).convert("L").resize(SIZE, Image.LANCZOS), dtype=np.float32)
    a -= a.mean()
    return a


def similarity(va, vb):
    best = -1.0
    for dx in SHIFTS:
        aa = va[:, 4 + dx:146 + dx]
        bb = vb[:, 4:146]
        den = float(np.sqrt((aa * aa).sum() * (bb * bb).sum())) + 1e-9
        best = max(best, float((aa * bb).sum()) / den)
    return best


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    ap.add_argument("--threshold", type=float, default=0.92)
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--report", action="store_true", help="print every pair above 0.80")
    args = ap.parse_args()

    out = Path(os.path.expanduser(args.out))
    strips_dir = out / "strips"
    web = out / "web"
    dupes_dir = out / "duplicates"
    manifest_path = out / "manifest.json"

    if not strips_dir.is_dir():
        sys.exit(f"no strips in {strips_dir}")

    manifest = json.loads(manifest_path.read_text())
    by_strip = {m["strip"]: m for m in manifest}
    files = sorted(p for p in strips_dir.iterdir() if p.suffix.lower() == ".jpg")

    print(f"  comparing {len(files)} strips (threshold {args.threshold})", flush=True)

    sigs, kept, dupes = {}, [], []   # kept/dupes: list of (name, matched_name, score)
    for p in files:
        v = signature(p)
        best_name, best_score = None, -1.0
        for kname, kv in sigs.items():
            s = similarity(kv, v)
            if s > best_score:
                best_name, best_score = kname, s
        if best_score >= args.threshold:
            dupes.append((p.name, best_name, best_score))
        else:
            kept.append(p.name)
            sigs[p.name] = v
        if args.report and best_score >= 0.80:
            tag = "DUP " if best_score >= args.threshold else "near"
            print(f"    {tag} {p.name} ~ {best_name} ({best_score:.3f})")

    print(f"  unique: {len(kept)}   duplicates: {len(dupes)}")
    for name, match, score in dupes:
        print(f"    {name} = copy of {match} ({score:.3f})")

    if args.dry_run:
        return

    if dupes:
        dupes_dir.mkdir(exist_ok=True)
        for name, match, score in dupes:
            src = strips_dir / name
            if not src.exists():
                continue
            meta = by_strip.get(name, {})
            stem = src.stem
            # keep the frame files with the duplicate, out of the gallery
            for fr in meta.get("frames", []):
                f = out / "photos" / fr["file"]
                if f.exists():
                    shutil.move(str(f), str(dupes_dir / fr["file"]))
                wf = web / "photos" / fr["file"]
                if wf.exists():
                    wf.unlink()
            shutil.move(str(src), str(dupes_dir / name))
            ws = web / "strips" / name
            if ws.exists():
                ws.unlink()
            by_strip.pop(name, None)

    # rewrite manifest with unique strips only, renumbered
    new_manifest = []
    for i, name in enumerate(kept, 1):
        m = by_strip.get(name)
        if not m:
            continue
        m2 = dict(m)
        m2["id"] = i
        new_manifest.append(m2)
    manifest_path.write_text(json.dumps(new_manifest, indent=1) + "\n")

    def zipit(zip_name, root, names):
        zp = web / "downloads" / zip_name
        zp.parent.mkdir(parents=True, exist_ok=True)
        with zipfile.ZipFile(zp, "w", zipfile.ZIP_STORED) as z:
            for f in names:
                rp = root / f
                if rp.exists():
                    z.write(rp, arcname=f)
        return zp.stat().st_size

    s = zipit("all-strips.zip", strips_dir, sorted(p.name for p in strips_dir.iterdir()))
    fr_names = sorted({f["file"] for m in new_manifest for f in m["frames"]})
    f = zipit("all-photos.zip", out / "photos", fr_names)
    print(f"  zips rebuilt: strips {s/1e6:.1f} MB   photos {f/1e6:.1f} MB")
    print(f"  done — {len(dupes)} duplicate strip(s) moved to {dupes_dir}")


if __name__ == "__main__":
    main()
