"""Build the lighter 16:9 frame set ("l") that phones in landscape use, from the full 16:9 set ("d").

usage: python3 -I tools/scrollfilm/make-lite.py public/work/<site> [--width 1440] [--quality 78]

An iPhone in landscape is about 1,470 device pixels wide (the engine caps pixel density at 2), so the
2,240-2,560 px desktop frames are far more than it can show. This writes f/l/NNN.webp at --width, keeps
the d set untouched, and records "l": {"w", "h"} in frames.json so the film engine offers the set.
"""
import json, os, sys
from concurrent.futures import ProcessPoolExecutor
from PIL import Image


def one(args):
    src, dst, width, quality = args
    im = Image.open(src).convert('RGB')
    h = round(im.height * width / im.width)
    im.resize((width, h), Image.LANCZOS).save(dst, 'WEBP', quality=quality, method=5)
    return width, h


def main():
    a = sys.argv[1:]
    site = a[0]
    width = int(a[a.index('--width') + 1]) if '--width' in a else 1440
    quality = int(a[a.index('--quality') + 1]) if '--quality' in a else 78
    sd, sl = os.path.join(site, 'f', 'd'), os.path.join(site, 'f', 'l')
    os.makedirs(sl, exist_ok=True)
    names = sorted(n for n in os.listdir(sd) if n.endswith('.webp'))
    jobs = [(os.path.join(sd, n), os.path.join(sl, n), width, quality) for n in names]
    with ProcessPoolExecutor() as ex:
        sizes = list(ex.map(one, jobs, chunksize=8))
    meta_p = os.path.join(site, 'frames.json')
    M = json.load(open(meta_p))
    M['l'] = {'w': sizes[0][0], 'h': sizes[0][1]}
    json.dump(M, open(meta_p, 'w'), separators=(',', ':'))
    tot = sum(os.path.getsize(os.path.join(sl, n)) for n in names)
    print(f'{site}: {len(names)} frames at {sizes[0][0]}x{sizes[0][1]}, {tot / 1e6:.1f} MB')


if __name__ == '__main__':
    main()
