"""Measure on-screen motion in a scroll film and write per-shot time maps so the motion is even.

usage: python3 -I tools/scrollfilm/timemap.py public/work/<site> [--apply] [--strength 0.7] [--weights 0.5]

For every shot it measures how far the picture moves between neighbouring frames (dense optical flow on
the desktop frames, ignoring the outer 8% where captions and vignettes sit). It then builds:
  tm      - for each shot, 41 frame positions (0..per-1) to show at evenly spaced scroll steps, so each
            step moves the picture about the same amount. "strength" blends this with plain linear
            playback (1.0 = fully even motion, 0 = unchanged), which keeps near-static stretches moving.
  weights - each shot's share of the scroll, so nearly static shots get less scroll than busy ones
            ("weights" sets how strongly, clamped to 0.7-1.3 of the average).
It prints how uneven each shot is before and after (max step / median step). --apply writes "tm" and
"weights" into frames.json; the film engine reads them. Without --apply it only reports.
"""
import json, os, sys
import cv2
import numpy as np

K = 40  # scroll steps per shot in the map


def flow_mag(a, b):
    f = cv2.calcOpticalFlowFarneback(a, b, None, 0.5, 3, 21, 3, 5, 1.1, 0)
    m = np.hypot(f[..., 0], f[..., 1])
    h, w = m.shape
    mh, mw = int(h * 0.08), int(w * 0.08)
    return float(np.mean(m[mh:h - mh, mw:w - mw]))


def gray(path, w=480):
    im = cv2.imread(path, cv2.IMREAD_GRAYSCALE)
    if im is None:
        return None
    h = int(round(im.shape[0] * w / im.shape[1]))
    return cv2.resize(im, (w, h), interpolation=cv2.INTER_AREA)


def main():
    args = sys.argv[1:]
    site = args[0]
    apply = '--apply' in args
    strength = float(args[args.index('--strength') + 1]) if '--strength' in args else 0.7
    wstr = float(args[args.index('--weights') + 1]) if '--weights' in args else 0.5
    meta_p = os.path.join(site, 'frames.json')
    M = json.load(open(meta_p))
    per, shots = M.get('per', 40), M.get('shots', 6)
    tms, totals, report = [], [], []
    for s in range(shots):
        frames = [gray(os.path.join(site, 'f', 'd', f'{s * per + k + 1:03d}.webp')) for k in range(per)]
        m = np.array([flow_mag(frames[k], frames[k + 1]) for k in range(per - 1)])
        m = np.maximum(m, 1e-4)
        # A cut or dissolve inside a shot reads as one huge step. It should pass instantly, not soak up
        # scroll, so steps are capped at 4x the shot's median before evening the rest out.
        m = np.minimum(m, 4 * np.median(m))
        C = np.concatenate([[0], np.cumsum(m)])
        tot = C[-1]
        totals.append(tot)
        lin = np.linspace(0, 1, per)
        Cn = (1 - strength) * lin + strength * (C / tot)
        tm = np.interp(np.linspace(0, 1, K + 1), Cn, np.arange(per))
        tms.append([round(float(x), 3) for x in tm])
        # unevenness: motion per scroll step, before (linear) and after (mapped)
        def steps(pos):
            c = np.interp(pos, np.arange(per), C)
            return np.diff(c)
        before = steps(np.linspace(0, per - 1, K + 1))
        after = steps(np.array(tm))
        med_b, med_a = np.median(before) or 1e-4, np.median(after) or 1e-4
        static = float(np.mean(m < 0.15 * np.median(m)))
        report.append({'shot': s, 'motion_total': round(float(tot), 1), 'median_step': round(float(np.median(m)), 3),
                       'max_over_median_before': round(float(before.max() / med_b), 2),
                       'max_over_median_after': round(float(after.max() / med_a), 2),
                       'static_fraction': round(static, 2)})
    totals = np.array(totals)
    rel = np.sqrt(totals / np.median(totals))
    weights = np.clip(1 + wstr * (rel - 1), 0.7, 1.3)
    weights = weights / weights.mean()
    for r, w in zip(report, weights):
        r['weight'] = round(float(w), 3)
    print(json.dumps({'site': site, 'strength': strength, 'shots': report}, indent=1))
    if apply:
        M['tm'] = tms
        M['weights'] = [round(float(w), 3) for w in weights]
        json.dump(M, open(meta_p, 'w'), separators=(',', ':'))
        print('wrote', meta_p)


if __name__ == '__main__':
    main()
