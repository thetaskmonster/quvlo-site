#!/usr/bin/env bash
# Generate ONE video leg — leg 2, "Descent" — for the Quvlo worldflight.
#
# Descent is chosen as the proof because it carries the most camera motion: a
# still can't fall, a clip can, so it's the truest test of whether photoreal
# video earns its cost against Quvlo's matte champagne brand.
#
# Runs the same on Kyle's desktop (his key + ffmpeg already there) or here (a
# rotatable KIE_AI_API_KEY in .env + ffmpeg installed). One command, four steps:
# credit probe -> seed still -> 5s camera move -> scrub encode + poster.
#
#   bash generate-leg2.sh
#
# Cost guard: one still (~$0.02-0.05) + one 5s Kling 2.1 Pro clip (~$0.25).
# Budget for 2-4 rerolls of the clip. Hard stop this proof at ~$5.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
SKILL="$HERE/../../../plugins/nateherk-design/skills/scrollcraft"
KIE="$SKILL/scripts/kie.mjs"
ENCODE="$SKILL/scripts/encode.sh"
OUT="$HERE/out"; ASSETS="$HERE/assets"
mkdir -p "$OUT" "$ASSETS"
NODE="${NODE:-node}"

# --- the aesthetic, said once. Matte champagne instrument, NOT glowing sci-fi.
STILL_PROMPT="A precise instrument seen in near-darkness: a matte champagne-gold aperture, like a planetarium orrery or an architectural section drawing, opening downward into deep near-black space. Fine concentric rings and thin radial spokes in warm champagne light on a near-black ground (#05070d). At the very top, small and far above, the faint rectangle of a web page rendered as stacked light bars. Engineered, physical, quietly luxurious, Dieter Rams restraint. Matte surfaces, no glow, no neon, no gradients, no text. Generous empty near-black space in the lower left for a caption. Cinematic, controlled, high detail."

SHOT_PROMPT="The camera falls slowly and steadily straight down through the champagne aperture, one single continuous smooth dolly-descent, the concentric rings passing outward past the edges of the frame as we sink inward. The central structure stays in frame throughout. Matte champagne light on near-black, engineered and physical, no glow or neon. One continuous take, no cuts, no camera shake, no zoom snap. Slow, cinematic, controlled, a camera already in flight."

echo "== 0. credit before =="
$NODE "$KIE" probe || true

echo "== 1. seed still (seedream) =="
$NODE "$KIE" still "$STILL_PROMPT" "$OUT/leg2.png" --ar 16:9

echo "== 2. camera move (kling v2.1 pro, 5s) =="
$NODE "$KIE" shot "$SHOT_PROMPT" "$OUT/leg2.png" "$OUT/leg2.mp4" --dur 5

echo "== 3. encode for scrubbing (dense GOP) + mobile =="
bash "$ENCODE" "$OUT/leg2.mp4" "$ASSETS/leg2.mp4"
bash "$ENCODE" "$OUT/leg2.mp4" "$ASSETS/leg2-m.mp4" mobile

echo "== 4. poster = the clip's OWN first frame (no jump when it paints) =="
FF="${SCROLLCRAFT_FFMPEG:-ffmpeg}"
"$FF" -y -i "$ASSETS/leg2.mp4" -frames:v 1 -q:v 2 "$ASSETS/leg2-poster.png"

echo "== credit after =="
$NODE "$KIE" probe || true
echo
echo "Done. Files in $ASSETS :"
ls -la "$ASSETS"/leg2* 2>/dev/null || true
echo "Next: wire <video> into leg 2 of index.html and re-run the harness."
