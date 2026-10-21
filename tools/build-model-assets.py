#!/usr/bin/env python3
"""Build the web-ready image assets for the quvlo.co scale-model homepage.

Reads the master renders (JPEG, 1520x2734 "camera space", plus the 2x desktop
hook still) and writes WebP files and a manifest into public/model/.

Run with an isolated interpreter (no cwd on sys.path):

    python3 -I tools/build-model-assets.py \
        --src  <versionA dir>   (holds img/hy3/{pull,lift}, img/hy2, img/idxbg, img/basalt-top-3x.jpg)
        --desktop-src <desktop dir>   (holds img/cam2-on.jpg)
        [--out public/model] [--jobs 4]

Needs Pillow with WebP support (python3 -c "import PIL.features; print(PIL.features.check('webp'))").
No other dependencies. Output is deterministic for a given Pillow/libwebp version.
"""
import argparse
import base64
import io
import json
import os
import re
import sys
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

from PIL import Image, ImageFilter, features

# ---------------------------------------------------------------- settings
CAM = (1520, 2734)                       # camera space every frame/still is registered to
WIDE = {"x": -264, "y": -13, "w": 2046, "h": 2747}   # wide stills' rect in camera px
VARIANTS = {"p": 0.5, "d": 0.75}         # phone 760 px wide, desktop 1140 px wide
FRAME_Q = {"p": 72, "d": 75}             # fixed per-variant quality: no quality flicker while scrubbing
STILL_Q = FRAME_Q                        # wide stills hand off from the last lift frame: same quality
SEQS = {"pull": ("img/hy3/pull/t{:03d}.jpg", 121), "lift": ("img/hy3/lift/t{:03d}.jpg", 112)}
WIDE_STILLS = {"roofOff": "img/hy2/off-wide.jpg", "night": "img/hy2/night-wide.jpg", "predawn": "img/hy2/predawn-wide.jpg"}
# The concept drew night + predawn through ctx.filter = 'brightness(1.32) sepia(.14) saturate(1.06)'.
# Safari's canvas ignores ctx.filter, so the grade is baked in here; the runtime must NOT apply it again.
GRADE = {"brightness": 1.32, "sepia": 0.14, "saturate": 1.06}
GRADED = {"night", "predawn"}
SHOP = "img/hy2/shop-cf.jpg"
SHOP_TARGET_KB = {"p": 78, "d": 150}     # first-screen poster / LCP
TV_TEX = "img/hy2/tv-480.jpg"
TVQ = "img/hy3/tvq.js"
IDX = ["ballast", "basalt", "inlay", "lacquer", "longhand", "lowtide"]
IDX_W = {"p": 1080, "d": 1600}
IDX_TARGET_KB = 115
SITE = "img/basalt-top-3x.jpg"           # Basalt site screenshot (3x of a 390 px phone)
SITE_W = {"p": 780, "d": 1170}
SITE_Q = 72
HOOK = "img/cam2-on.jpg"                 # desktop roof-on still at 2x camera space (3040x5468)
HOOK_SCALE = 1.5                         # d.webp: 2280 px wide
HOOK_TARGET_KB = 330
HOOK_CROP_TARGET_KB = 165
# desktop hook framing (desktop5.html SCENE.framing.hook) on a 1440x900 CSS viewport
HOOK_FRAMING = {"fx": 860, "fy": 1820, "s": 0.82, "sx": 1150, "sy": 470, "viewport": [1440, 900]}
HOOK_MARGIN = 0.10
# Measured once (OpenCV ECC, translation, on cam2-on downscaled to 1x vs img/hy3/lift/t001.jpg), recorded here so the
# build needs no OpenCV. Offset = where the hook's content sits relative to lift frame 1, camera px.
HOOK_ALIGN_LIFT1 = {"plinth": [-0.21, -1.0], "roof": [0.44, 2.88], "affineScaleY": 0.9972, "ecc": 0.999,
                    "measured": "2026-10-21",
                    "note": "sub-pixel at the plinth; ~0.3% vertical scale makes the roof ~3 px lower on the hook. "
                            "TV is baked on the hook but dark in the lift frames: keep the TV overlay on at the hand-off."}
METHOD = 6                               # libwebp effort (slowest, smallest)
URL_BASE = "/model/"


def enc(im, q):
    b = io.BytesIO()
    im.save(b, "WEBP", quality=q, method=METHOD)
    return b.getvalue()


def enc_target(im, target_kb, lo=30, hi=92):
    """Highest quality whose size is <= target (binary search on integer quality)."""
    best = None
    while lo <= hi:
        q = (lo + hi) // 2
        data = enc(im, q)
        if len(data) <= target_kb * 1024:
            best = (q, data)
            lo = q + 1
        else:
            hi = q - 1
    if best is None:
        best = (lo, enc(im, lo))
    return best


def size_for(scale, w, h):
    return (round(w * scale), round(h * scale))


def resize(im, size):
    return im.resize(size, Image.LANCZOS, reducing_gap=3.0)


def write(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)
    return len(data)


def rel(out, path):
    return URL_BASE + path.relative_to(out).as_posix()


def frame_job(args):
    src, dst, size, q = args
    im = Image.open(src).convert("RGB")
    if im.size != CAM:
        raise SystemExit(f"{src}: {im.size}, expected camera space {CAM}")
    return write(Path(dst), enc(resize(im, size), q))


def placeholder(im, w=20):
    h = round(im.height * w / im.width)
    tiny = im.resize((w, h), Image.LANCZOS).filter(ImageFilter.GaussianBlur(0.6))
    data = enc(tiny, 40)
    uri = "data:image/webp;base64," + base64.b64encode(data).decode()
    assert len(uri) < 2048, len(uri)
    return {"w": w, "h": h, "dataUri": uri, "bytes": len(uri)}


def css_grade(im, brightness, sepia, saturate):
    """Exact CSS Filter Effects matrices, applied in order on sRGB 0..1 values, clamped after each step
    (as feComponentTransfer / feColorMatrix do), then rounded back to 8 bits."""
    import numpy as np
    x = np.asarray(im, dtype=np.float64) / 255.0
    x = np.clip(x * brightness, 0, 1)                                   # brightness(): linear slope
    a = 1 - sepia
    sep = np.array([[0.393 + 0.607 * a, 0.769 - 0.769 * a, 0.189 - 0.189 * a],
                    [0.349 - 0.349 * a, 0.686 + 0.314 * a, 0.168 - 0.168 * a],
                    [0.272 - 0.272 * a, 0.534 - 0.534 * a, 0.131 + 0.869 * a]])
    x = np.clip(x @ sep.T, 0, 1)
    s = saturate
    sat = np.array([[0.213 + 0.787 * s, 0.715 - 0.715 * s, 0.072 - 0.072 * s],
                    [0.213 - 0.213 * s, 0.715 + 0.285 * s, 0.072 - 0.072 * s],
                    [0.213 - 0.213 * s, 0.715 - 0.715 * s, 0.072 + 0.928 * s]])
    x = np.clip(x @ sat.T, 0, 1)
    return Image.fromarray(np.round(x * 255).astype(np.uint8), "RGB")


def scale_quad(q, k):
    return [[round(x * k, 2), round(y * k, 2)] for x, y in q]


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--src", required=True, type=Path)
    ap.add_argument("--desktop-src", required=True, type=Path)
    ap.add_argument("--out", type=Path, default=Path(__file__).resolve().parent.parent / "public" / "model")
    ap.add_argument("--jobs", type=int, default=os.cpu_count() or 2)
    a = ap.parse_args()
    if not features.check("webp"):
        sys.exit("Pillow was built without WebP support")
    src, dsrc, out = a.src.resolve(), a.desktop_src.resolve(), a.out.resolve()
    out.mkdir(parents=True, exist_ok=True)
    missing = []
    man = {
        "about": "Scale-model homepage media. Every URL is site-absolute. Camera space = the 1520x2734 px frame all "
                 "sequences, stills, TV quads, rooms and framings are registered to; each variant is a uniform "
                 "scale of it (draw any variant image at the CAM size and the CFG coordinates still hold).",
        "camera": {"w": CAM[0], "h": CAM[1]},
        "variants": {},
        "sequences": {},
        "stills": {},
        "poster": {},
        "tv": {},
        "hook": {},
        "idx": {},
        "site": {},
        "totals": {},
    }
    for v, k in VARIANTS.items():
        w, h = size_for(k, *CAM)
        man["variants"][v] = {"scale": k, "w": w, "h": h, "exactW": CAM[0] * k, "exactH": CAM[1] * k,
                              "frameQuality": FRAME_Q[v]}
    totals = {}

    # ---------------------------------------------------- frame sequences
    with ProcessPoolExecutor(a.jobs) as pool:
        for name, (pat, n) in SEQS.items():
            files = [src / pat.format(i) for i in range(1, n + 1)]
            for f in files:
                if not f.exists():
                    missing.append(str(f))
            if any(not f.exists() for f in files):
                continue
            seq = {"count": n, "pattern": {}, "bytes": {}, "avgKB": {}, "maxKB": {}, "largest": {}}
            for v, k in VARIANTS.items():
                d = out / name / v
                d.mkdir(parents=True, exist_ok=True)
                keep = {f"{i:03d}.webp" for i in range(1, n + 1)}
                for old in d.glob("*.webp"):           # drop stale frames from a longer earlier build
                    if old.name not in keep:
                        old.unlink()
                size = size_for(k, *CAM)
                jobs = [(str(files[i]), str(d / f"{i + 1:03d}.webp"), size, FRAME_Q[v]) for i in range(n)]
                sizes = list(pool.map(frame_job, jobs, chunksize=4))
                seq["pattern"][v] = rel(out, d) + "/%03d.webp"
                seq["bytes"][v] = sum(sizes)
                seq["avgKB"][v] = round(sum(sizes) / n / 1024, 1)
                seq["maxKB"][v] = round(max(sizes) / 1024, 1)
                big = sorted(range(n), key=lambda i: -sizes[i])[:3]
                seq["largest"][v] = [{"frame": i + 1, "KB": round(sizes[i] / 1024, 1)} for i in big]
                totals[f"{name}.{v}"] = sum(sizes)
            seq["size"] = {v: man["variants"][v] for v in VARIANTS}
            man["sequences"][name] = seq
    man["sequences"].get("pull", {})["chain"] = "frame 1 == stills.shop; last frame == lift frame 1"
    man["sequences"].get("lift", {})["chain"] = "last frame == stills.roofOff (inside the WIDE rect)"

    # ---------------------------------------------------- shop still = first-screen poster (LCP)
    shop = Image.open(src / SHOP).convert("RGB")
    assert shop.size == CAM, shop.size
    man["stills"]["shop"] = {"rect": {"x": 0, "y": 0, "w": CAM[0], "h": CAM[1]}}
    for v, k in VARIANTS.items():
        q, data = enc_target(resize(shop, size_for(k, *CAM)), SHOP_TARGET_KB[v])
        p = out / "stills" / f"shop-{v}.webp"
        n = write(p, data)
        w, h = size_for(k, *CAM)
        man["stills"]["shop"][v] = {"src": rel(out, p), "w": w, "h": h, "bytes": n, "quality": q}
        totals["poster." + v] = n
    man["poster"] = {"note": "stills.shop doubles as the first-screen poster / LCP image; show placeholder until it decodes",
                     "p": man["stills"]["shop"]["p"]["src"], "d": man["stills"]["shop"]["d"]["src"],
                     "placeholder": placeholder(shop)}

    # ---------------------------------------------------- wide stills (scaled by the camera factor, so they stay registered)
    for name, f in WIDE_STILLS.items():
        im = Image.open(src / f).convert("RGB")
        assert im.size == (WIDE["w"], WIDE["h"]), (f, im.size)
        entry = {"rect": dict(WIDE)}
        if name in GRADED:
            im = css_grade(im, **GRADE)
            entry["graded"] = {"cssFilter": "brightness(1.32) sepia(.14) saturate(1.06)", **GRADE,
                               "note": "baked in; do not apply ctx.filter at draw time"}
        else:
            entry["graded"] = None
        for v, k in VARIANTS.items():
            w, h = size_for(k, WIDE["w"], WIDE["h"])
            p = out / "stills" / f"{name}-{v}.webp"
            n = write(p, enc(resize(im, (w, h)), STILL_Q[v]))
            entry[v] = {"src": rel(out, p), "w": w, "h": h, "bytes": n, "quality": STILL_Q[v],
                        "rect": {kk: WIDE[kk] * k for kk in WIDE}}
            totals["stills." + v] = totals.get("stills." + v, 0) + n
        man["stills"][name] = entry
    man["stills"]["note"] = ("rect = where the image sits in camera px (variant rect = same in that variant's px). "
                             "Draw each wide still at its rect (w/h may be fractional), not at its pixel size.")

    # ---------------------------------------------------- TV texture + quads
    tv = Image.open(src / TV_TEX).convert("RGB")
    p = out / "tv" / "tv.webp"
    n = write(p, enc(tv, 82))
    totals["tv"] = n
    s = (src / TVQ).read_text()
    tvq = json.loads(s[s.index("{"): s.rindex("}") + 1])
    assert len(tvq["pull"]) == SEQS["pull"][1] and len(tvq["lift"]) == SEQS["lift"][1]
    man["tv"] = {"texture": {"src": rel(out, p), "w": tv.width, "h": tv.height, "bytes": n},
                 "format": "{pull:[quad per frame], lift:[quad per frame], shop:quad, roofOff:quad}; "
                           "quad = [TL, TR, BR, BL] as [x, y]",
                 "quads": {}}
    for v, k in [("camera", 1.0)] + list(VARIANTS.items()):
        scaled = {key: ([scale_quad(q, k) for q in val] if key in ("pull", "lift") else scale_quad(val, k))
                  for key, val in tvq.items()}
        p = out / "tv" / ("tvq.json" if v == "camera" else f"tvq-{v}.json")
        n = write(p, json.dumps(scaled, separators=(",", ":")).encode())
        man["tv"]["quads"][v] = {"src": rel(out, p), "scale": k, "bytes": n}
        totals["tv"] += n

    # ---------------------------------------------------- desktop hook (roof-on, 2x camera space)
    hp = dsrc / HOOK
    if not hp.exists():
        missing.append(str(hp))
    else:
        hook = Image.open(hp).convert("RGB")
        hs = hook.width / CAM[0]
        assert abs(hook.height / CAM[1] - hs) < 1e-3, hook.size
        w, h = size_for(HOOK_SCALE, *CAM)
        q, data = enc_target(resize(hook, (w, h)), HOOK_TARGET_KB)
        p = out / "hook" / "d.webp"
        n = write(p, data)
        man["hook"]["d"] = {"src": rel(out, p), "w": w, "h": h, "scale": HOOK_SCALE, "bytes": n, "quality": q,
                            "rect": {"x": 0, "y": 0, "w": CAM[0], "h": CAM[1]}}
        totals["hook.d"] = n
        # crop: camera area visible at framing.hook on the viewport, +10% margin per side, clamped to the frame
        F = HOOK_FRAMING
        vw, vh = F["viewport"]
        x0, x1 = F["fx"] - F["sx"] / F["s"], F["fx"] + (vw - F["sx"]) / F["s"]
        y0, y1 = F["fy"] - F["sy"] / F["s"], F["fy"] + (vh - F["sy"]) / F["s"]
        mx, my = (x1 - x0) * HOOK_MARGIN, (y1 - y0) * HOOK_MARGIN
        cx0, cy0 = max(0, int(x0 - mx)), max(0, int(y0 - my))
        cx1, cy1 = min(CAM[0], int(x1 + mx + 0.999)), min(CAM[1], int(y1 + my + 0.999))
        crop = hook.crop((round(cx0 * hs), round(cy0 * hs), round(cx1 * hs), round(cy1 * hs)))
        q, data = enc_target(crop, HOOK_CROP_TARGET_KB)
        p = out / "hook" / "d-crop.webp"
        n = write(p, data)
        man["hook"]["dCrop"] = {"src": rel(out, p), "w": crop.width, "h": crop.height, "scale": hs, "bytes": n,
                                "quality": q, "rect": {"x": cx0, "y": cy0, "w": cx1 - cx0, "h": cy1 - cy0},
                                "visibleAtFraming": {"x0": round(x0, 1), "y0": round(y0, 1), "x1": round(x1, 1),
                                                     "y1": round(y1, 1)},
                                "framing": F, "margin": HOOK_MARGIN, "placeholder": placeholder(crop)}
        man["hook"]["note"] = ("Desktop only. Show dCrop (LCP) at its camera rect, swap to d (full frame) before the "
                               "code zoom-out to framing.model. TV (Basalt hero) is baked into both.")
        man["hook"]["alignToLiftFrame1"] = HOOK_ALIGN_LIFT1
        totals["hook.dCrop"] = n

    # ---------------------------------------------------- index photos
    for name in IDX:
        f = src / "img" / "idxbg" / f"{name}.jpg"
        if not f.exists():
            missing.append(str(f))
            continue
        im = Image.open(f).convert("RGB")
        entry = {}
        made = {}
        for v, w in IDX_W.items():
            tw = min(w, im.width)                      # never upscale
            if tw in made:
                entry[v] = dict(entry[made[tw]], note=f"source is only {im.width} px wide; not upscaled")
                continue
            th = round(im.height * tw / im.width)
            q, data = enc_target(resize(im, (tw, th)) if tw != im.width else im, IDX_TARGET_KB)
            p = out / "idx" / f"{name}-{tw}.webp"
            n = write(p, data)
            entry[v] = {"src": rel(out, p), "w": tw, "h": th, "bytes": n, "quality": q}
            made[tw] = v
            totals["idx"] = totals.get("idx", 0) + n
        man["idx"][name] = entry

    # ---------------------------------------------------- Basalt site screenshot
    f = src / SITE
    if not f.exists():
        missing.append(str(f))
    else:
        im = Image.open(f).convert("RGB")
        for v, w in SITE_W.items():
            tw = min(w, im.width)
            th = round(im.height * tw / im.width)
            p = out / "site" / f"basalt-top-{v}.webp"
            n = write(p, enc(resize(im, (tw, th)) if tw != im.width else im, SITE_Q))
            man["site"][v] = {"src": rel(out, p), "w": tw, "h": th, "bytes": n, "quality": SITE_Q}
            totals["site"] = totals.get("site", 0) + n

    man["totals"] = {k: {"bytes": b, "MB": round(b / 1048576, 2)} for k, b in sorted(totals.items())}
    fp = {
        "p": man["stills"]["shop"]["p"]["bytes"],
        "d": man["hook"].get("dCrop", {}).get("bytes", man["stills"]["shop"]["d"]["bytes"]),
    }
    man["firstScreenBytes"] = {"p": fp["p"], "d": fp["d"],
                               "note": "model media before interaction: phone = shop poster, desktop = hook crop; "
                                       "placeholders are inline"}
    man["missing"] = missing
    (out / "manifest.json").write_text(json.dumps(man, indent=1) + "\n")
    for k, b in sorted(totals.items()):
        print(f"{k:14s} {b / 1024:9.1f} KB")
    if missing:
        print("MISSING:", *missing, sep="\n  ")


if __name__ == "__main__":
    main()
