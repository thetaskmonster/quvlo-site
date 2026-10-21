# /model: scale-model homepage media

Generated files. Don't edit by hand; rebuild them with `tools/build-model-assets.py`.
`manifest.json` lists every file with its pixel size, byte size, WebP quality and camera-space rect.

## What's here

| Path | What it is |
|---|---|
| `pull/{p,d}/001..121.webp` | Storefront → model pull-back. Canvas scrub frames, in order. |
| `lift/{p,d}/001..112.webp` | Roof lift. Canvas scrub frames, in order. |
| `stills/shop-{p,d}.webp` | Storefront still. It is also the first-screen poster (LCP). Its blurred placeholder is inlined as `poster.placeholder.dataUri`. |
| `stills/{roofOff,night,predawn}-{p,d}.webp` | Wide stills. Draw each one at its `rect` (it extends past the camera frame). **night and predawn have the grade `brightness(1.32) sepia(.14) saturate(1.06)` baked in.** Do not apply `ctx.filter` to them again. |
| `tv/tv.webp`, `tv/tvq*.json` | Basalt screen texture, plus one screen quad per frame (TL, TR, BR, BL). There is one JSON in camera px and one scaled for each variant. |
| `hook/d-crop.webp`, `hook/d.webp` | Desktop only: the roof-on still at 2x / 1.5x. The crop is the desktop LCP. The full frame is for the zoom-out. |
| `idx/*.webp` | Index background photos. The sources are 1080 px wide, so they are not upscaled to 1600. |
| `site/basalt-top-{p,d}.webp` | Basalt site screenshot (780 / 1170 px wide). |

The variants are uniform scales of the 1520x2734 camera space:

- `p` = 0.5, which gives 760x1367.
- `d` = 0.75, which gives 1140x2050 (the exact height would be 2050.5).

If you draw any variant at the CAM size, all camera-px coordinates (rooms, framings, quads) still apply unchanged.

## Regenerate

You need Python 3 with Pillow built with WebP support (`python3 -c "import PIL.features; print(PIL.features.check('webp'))"`), plus numpy for the grade. Nothing else is required. Run from the repo root:

```sh
python3 -I tools/build-model-assets.py \
  --src         <versionA master dir>   # img/hy3/{pull,lift}/tNNN.jpg, img/hy2/*, img/idxbg/*.jpg, img/basalt-top-3x.jpg
  --desktop-src <desktop master dir>    # img/cam2-on.jpg (3040x5468, 2x camera space)
```

`--out` defaults to `public/model`. `--jobs` defaults to the CPU count. The build overwrites files in place and removes stale frames past the current count. It takes about 2 minutes on 4 cores.

To change the frame counts, sizes, qualities or byte targets, edit the settings block at the top of the script.

Settings:

- Sequence frames use one fixed quality per variant, so quality doesn't flicker while scrubbing.
- Poster, hook and index photos are binary-searched to a byte target.
