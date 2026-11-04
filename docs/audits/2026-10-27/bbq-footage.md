# Post Oak & Pepper (BBQ) footage audit (independent reviewer, 2026-10-27)

Verdict: not yet. Evidence is in this folder.
Shots: 1 splitting oak + truck to smoker (s1); 2 hand loads firebox, door shuts (s2); 3 seasoning raw beef (s3); 4 time-lapse, lid open (s4, power-remapped); 5 gloved hands with pink paper at sunrise (s5); 6 whole brisket -> dissolve -> sliced push-in (s6a src 0-14, then s6b). No service shot exists.

## Blockers
- B1 Shot 1 (under the H1): the log splits on the maul's upswing (src 21-24) and halves fly sideways; the maul lands on an empty block (src 48-57); pieces fade out; camera whips (flow 13.1 at 033->034); phone crop misses the log. s1_split_maul.jpg, s1_pieces_vanish.jpg, phone_crop_problems.jpg. Fix: start at src ~60 or a locked dusk stacked-oak shot; never prompt an impact.
- B2 Shot 2: the firebox door slams itself shut (src 66-87) after a fireball (60-75) with no one there; the closed door doesn't fit; log becomes a block; hand sits in flames ~1 s (src 20-32). s2_door_src.jpg, s2_hand_src.jpg. Fix: src 36-57 (fire and sparks, no hand), or re-render the door staying open.
- B3 Shot 5: the wrap never wraps; paper sinks into meat at src 61; warped thumb src 64-67 (site 182-183); phone loses the brisket 194-200. s5_wrap_src.jpg, s5_warped_thumb_src64-67.jpg. Fix: locked sunrise shot of an already-wrapped brisket, smoke drift, push-in, no hands.
- B4 Shot 6: ghost knife from s6a src 10-14 shows on site 208-214; the brisket morphs into a different pre-sliced one 212-215; the push-in accelerates to the last frame (flow 0.4 -> 11). s6_ghost_knife_and_dissolve_206-217.jpg. Fix: s6b only, hard cut, ease-out sampling or trim the last ~20 src frames.
- B5 Shot 4 "overnight": daylight sky (L* 18.6 -> 50.5 at 121->123, 68 at 160); lid open all 40 frames under "Nobody opens the lid"; fire inside the cook chamber; flame flicker; smoke hangs and reverses. s4_sky_pop_and_daylight.jpg, s4_bark.txt, smoke_flow.txt. Fix: re-render a closed-lid night time-lapse; interim crop sky, grade darker, drop the power remap.

## Noticeable
- N1 Bark: 85% of darkening done by 141; 145-160 dead; bark jumps red->black at the 6:00 cut 160->161; the brisket shape changes every shot, no shrinkage. brisket_continuity.jpg. Fix: one brisket reference for shots 3-6; pin shot 4's end to shot 5's start; linear sampling.
- N2 Shot 3 shaker morphs (metal -> jar -> can -> canister) and the rub falls from the fingers; lurch 100->101. s3_shaker_morph.jpg. Fix: src 64-120 rubbing only, or re-render.
- N3 Shot 3 meat reads as chuck/ribeye, no fat cap (contradicts the cook log). s3_hands_zoom.jpg.
- N4 Shot 5 stack morphs out of smoke; smoke billows from the base, drift flips, sinks. s5_stack_smoke_src.jpg.
- N5 Scroll surges from 4-frame steps (+7, +20, +33 in each shot); shot 3 judder; cross-fade ghosting. Fix: 118-frame trims or fractional sampling; engine nearest frame.
- N6 Phone/iPad-portrait crops lose the log (1), door (2), brisket (5); shot 6 ends on 1.5 slices.
- N7 img/og.jpg has a solid black band on the bottom 23% (rows 483-629). og_black_band.jpg. Fix: re-export 1200x630.
- N8 Shot 1 face visible 019-021 (removed by the B1 re-time).

## Nitpicks
Lid dial pseudo-text and a sun shadow at midnight; slices look cut with the grain; shot 3 hands read as a different person; shot 2 caption "thin blue smoke" vs a roaring fire; thumb knob in shot 3; cross-shot one-frame dissolves.

## Holds up
s6b sliced push-in (steam rises cleanly), shot 2 fire and sparks before the door moves, dusk and sunrise skies, darkening direction.

## Plan
1 Re-cut in code (shot 1 from src 60; shot 2 src 36-57; shot 6 s6b only with ease-out; fix 4-frame steps; no cross-fade; og.jpg). 2 Re-render shots 4 and 5 as light-and-smoke, no hands, one brisket reference. 3 Re-time or re-render shot 3 with a real packer.
