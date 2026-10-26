"""Turn the six 4K shots into scroll frames for the HVAC page.

Usage: python3 -I tools/scrollfilm/build_frames.py public/work/hvac <folder with s1.mp4 ... s6.mp4>

Desktop: 2560 wide WebP. Phone: 1080x1920 crops, framed per shot (with a pan where the
subject moves), so phones get their own composition instead of a squashed desktop frame.
Writes frames.json with the crop of every phone frame so the page can place the live
thermostat number and the hotspots on either version.
"""
import json, os, sys
from concurrent.futures import ProcessPoolExecutor
import cv2
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from skymask import sky_mask
FG_FROM = 28  # shot 1 frames from here on get a sky cut-out, for the 104 behind the roof

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = sys.argv[1]  # public/work/hvac
VID = sys.argv[2] if len(sys.argv) > 2 else os.path.join(HERE, 'vid')
PER = 40
SHOTS = [  # file, phone crop centre x (start, end) as a fraction of source width
    ('s1', 0.50, 0.47),
    ('s2', 0.50, 0.50),
    ('s3', 0.45, 0.70),
    ('s4', 0.50, 0.60),
    ('s5', 0.30, 0.70),
    ('s6', 0.40, 0.46),
]
DQ, MQ = 74, 72


def read_all(path):
    cap = cv2.VideoCapture(path)
    frames = []
    while True:
        ok, f = cap.read()
        if not ok:
            break
        frames.append(cv2.cvtColor(f, cv2.COLOR_BGR2RGB))
    return frames


def smooth_pop(frames, a, b):
    """Replace frames a+1..b-1 with a dissolve from frame a to frame b."""
    fa, fb = frames[a].astype(np.float32), frames[b].astype(np.float32)
    for i in range(a + 1, b):
        k = (i - a) / (b - a)
        k = k * k * (3 - 2 * k)
        frames[i] = (fa * (1 - k) + fb * k).astype(np.uint8)


def save_one(job):
    rgb, n, x0, cw, fg = job
    H, W = rgb.shape[:2]
    im = Image.fromarray(rgb)
    dw, dh = 2560, int(round(H * 2560 / W))
    im.resize((dw, dh), Image.LANCZOS).save(os.path.join(OUT, f'f/d/{n:03d}.webp'), quality=DQ, method=4)
    im.crop((x0, 0, x0 + cw, H)).resize((1080, 1920), Image.LANCZOS).save(os.path.join(OUT, f'f/m/{n:03d}.webp'), quality=MQ, method=4)
    if fg:
        a = sky_mask(cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR))
        fim = Image.fromarray(np.dstack([rgb, a]), 'RGBA')
        fim.resize((dw, dh), Image.LANCZOS).save(os.path.join(OUT, f'fg/d/{n:03d}.webp'), quality=DQ, method=4)
        fim.crop((x0, 0, x0 + cw, H)).resize((1080, 1920), Image.LANCZOS).save(os.path.join(OUT, f'fg/m/{n:03d}.webp'), quality=MQ, method=4)
    return n


def main():
    os.makedirs(os.path.join(OUT, 'f/d'), exist_ok=True)
    os.makedirs(os.path.join(OUT, 'f/m'), exist_ok=True)
    os.makedirs(os.path.join(OUT, 'fg/d'), exist_ok=True)
    os.makedirs(os.path.join(OUT, 'fg/m'), exist_ok=True)
    manifest = {'per': PER, 'shots': len(SHOTS), 'd': {}, 'm': {'crop': []}, 'src': None}
    n = 0
    for name, c0, c1 in SHOTS:
        frames = read_all(os.path.join(VID, name + '.mp4'))
        if name == 's5':
            smooth_pop(frames, 40, 44)  # the window pops from blinds to curtains at frame 42
        H, W = frames[0].shape[:2]
        manifest['src'] = [W, H]
        idx = np.round(np.linspace(0, len(frames) - 1, PER)).astype(int)
        cw = int(round(H * 9 / 16))
        jobs = []
        for j, i in enumerate(idx):
            n += 1
            k = j / (PER - 1)
            k = k * k * (3 - 2 * k)
            cx = (c0 + (c1 - c0) * k) * W
            x0 = int(round(min(max(cx - cw / 2, 0), W - cw)))
            manifest['m']['crop'].append(round(x0 / W, 5))
            fg = name == 's1' and j >= FG_FROM
            if fg:
                manifest.setdefault('fg', []).append(n)
            jobs.append((frames[i], n, x0, cw, fg))
        with ProcessPoolExecutor(max_workers=os.cpu_count()) as ex:
            list(ex.map(save_one, jobs))
        print(name, 'done', n, flush=True)
    manifest['count'] = n
    manifest['d'] = {'w': 2560, 'h': int(round(manifest['src'][1] * 2560 / manifest['src'][0]))}
    manifest['m']['w'], manifest['m']['h'] = 1080, 1920
    manifest['m']['cropW'] = round((manifest['src'][1] * 9 / 16) / manifest['src'][0], 5)
    json.dump(manifest, open(os.path.join(OUT, 'frames.json'), 'w'), separators=(',', ':'))


if __name__ == '__main__':
    main()
