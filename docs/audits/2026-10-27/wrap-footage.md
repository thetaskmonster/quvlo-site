# Satin & Shade (wrap) footage audit (independent reviewer, 2026-10-27)

Verdict: not ready. The car is one accurate, consistent 992 Carrera throughout; picker stills and shot 6 can ship. Evidence is in this folder. Source map: s1.mp4 0-120, s2new.mp4 1-120, s3.mp4 0-58, s4.mp4 0-120, s5p.mp4 0-50, s6.mp4 0-120 (srcmap.json). The badge is in shot 5 (161-200); shot 6 ends on the headlight.

## Blockers
- B1 Shot 4 (Edges) 138-153: bumper, mirror cap and door turn charcoal with no hands (bumper L 77->47 over 137-147); camera jolt 140->141; hands leave and return; phone crops out the heat gun. s4_bumper_wraps_itself.jpg, s4_selfwrap_138-151.jpg, s4_mirror_door.jpg. Fix: source 0-45 only, or re-render a locked hands-only close-up.
- B2 Shot 1 (Arrive) 020-040: car pivots ~40 deg with the hub travelling ~380 px on wheels that never turn (crest upright 028-040); camera locked; surges 020->021, 033->034. s1_wheel_crest_static.jpg, s1_wheel_hub_024-040.jpg. Fix: re-render driving straight in, or trim to the head-on approach plus lights.
- B3 Shot 5 (Tint): phone crop 0.13-0.47 misses installer and glass; tail bar dim -> off -> snaps on at 180->181; centre brake lamp lit throughout; wet film clears itself 167-170 with the squeegee still; caption says rear glass but it's door glass. s5_rear_lights.jpg, s5_glass_163-171.jpg, s5_installer.jpg, sheets/m_161-200.jpg. Fix: source 12-36, recentre phone crop (~0.75) or patch the light bar; better, re-render interior squeegee or a light change.

## Noticeable
- N1 Shot 3 (Lay): 083-113 frozen (31/40 frames); at 114-120 the left installer squeegees the air and turns his face to camera; nobody presses film; phone crops out the right installer and film; 1/2-frame judder. s3_film_hands.jpg, s3_left_installer_face.jpg. Fix: hands-only close-up or a still with a light sweep.
- N2 Shot 1: hood goes tan 005-011; windscreen melts 008-009. s1_hood_stain_windscreen.jpg. Fix: start at source 36+.
- N3 Stage colour: shot 4 film looks like liquid silver; shots 3 and 5 graded magenta vs neutral 1 and 6. stage_colour_compare.jpg. Fix: grade 3-5 to shot 6.
- N4 Scroll cross-fade ghosts shot 1 020-038 and shot 4 140-149. scroll_blend_ghosting.jpg. Fix: new engine.
- N5 Uneven 3/4-frame steps (surges even in shot 6 at 207, 220, 233). Fix: source 0-117 exact 3-frame steps; 0-39 for shots 3 and 5.
- N6 Sharp identifiable faces: shot 2 profile all 40 frames, shot 3 116-120, shot 5 profile. Fix: hands-only or over-shoulder.

## Nitpicks
n1 Four different installers; shot 5 short-sleeve polo. n2 Shot 2 spray hand frozen, never sprays (otherwise good; handle and mirror present). n3 Badge patch good but a grey smudge under "rrera" 165-179, "11" reads as a pi at web size, left of centre (verify vs a real 992 lid); red calipers = Carrera S. n4 Colour-shift stills read as two-tone; the 7 s timed fade isn't flip-film behaviour. n5 Tint overlay dims outside reflections. n6 Shot 2 0.3% squash.

## Correct
992 details throughout; no plates; the wrap never reverses; shot 6 steady push-in matches the picker still; picker stills aligned within 1.1 px.

## Fix plan
Trims: shot 4 src 0-45; shot 1 src 36-57; shot 5 src 12-36 plus phone crop/light-bar patch; grade 3-5; engine nearest-frame plus exact steps. Re-render only Lay and Edges as hands-only close-ups. Any car movement: straight arrival, camera orbits.
