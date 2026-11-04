# Keyroom footage audit: scroll film and showroom spins

Audited 2026-10-27, read-only. Nothing under `/home/user/quvlo-site` was changed.

All evidence paths below are relative to `/tmp/claude-0/-home-user/f1e55b73-3220-5c66-a5a2-f56661dd3103/scratchpad/keyroom/audit/`.

## How to read the frame numbers

- **Site frame:** `f/d/NNN.webp`. The phone set `f/m/` holds only the odd numbers.
- **Source frame:** the frame in the builder's Kling clip (`vid/sN.mp4` or `spin/*.mp4`, 24 fps, 121 frames).
- **Shots 1 to 5:** site frame = shot × 40 + j + 1, and source frame ≈ 3.08 × j.
- **Shot 6:** source frames 0–86 map to site frames 201–231. The dissolve sits on site frames 232–234. Source frames 104–120 map to site frames 235–240.
- **Spins:** a "view" is `spin/<car>/d/VV.webp`, numbered 00–71.

## How it was checked

- **Contact sheets:** every frame of all 6 shots on desktop and phone, and all 72 views of each of the 6 spins.
- **Full-resolution crops:** taken from the 4K source clips.
- **Film motion:** Farneback optical flow and frame differences between every pair of consecutive site frames (`film_flow.json`).
- **Per-object flow at 24 fps:** measured in the source clips for the car, the cloth and the hands.
- **Car tracking in shot 4:** the DRL pair, followed at 24 fps.
- **Spin views:** I rebuilt the source-frame index of every view by re-running the builder's own `pick()` logic, without writing anything (`spin_steps.txt`). I measured optical flow for every step, plus the brightness and colour of a static patch of wall, which shows exposure pops.
- **Page logic:** I read `keyroom.js` to see how the page plays the frames, including the cross-fade between frames while scrolling and the phone stride.

---

## Ranked findings (most noticeable to a normal iPhone or iPad scroller first)

### BLOCKERS

**B1. Shot 6: the car teleports and the chauffeur vanishes at the dissolve, and the car drives off without its driver.**
- **Where:** site frames 228–235. The phone sees 229 → 231 → 233 → 235.
- **What happens:**
  - At 228–232 the Escalade is parked at three-quarter view, pointing left. It is already starting to roll: car flow starts at source frame 78, while the chauffeur walks away from it towards the jet.
  - Frame 233 is a double exposure: two semi-transparent Escalades and a fading chauffeur.
  - At 234 the car is suddenly head-on, about 30% bigger, in a different place, and the chauffeur is gone.
- **Why it fails:** an 8-frame dissolve squeezed into a 40-frame shot lasts about 1 site frame on desktop and half a step on phone. It reads as a jump cut with a ghost, not as time passing.
- **Logic problem:** the car starts moving while its chauffeur walks the other way, so it is effectively driverless. Source frames 88–103, which the builder trimmed, made this worse, but it already starts at 78.
- **Evidence:** `s6_dissolve.jpg`, `s6_door_close_src.jpg` (rows 3–4), `scroll_blend_ghosting.jpg` (last panel).
- **Fix:** **replace the shot idea.**
  - Make the departure its own clean shot: the chauffeur closes the door, walks round the front and gets in the driver's side, then cut.
  - Then use a separate, simple shot of the car pulling away from a locked-off camera. A rear three-quarter tracking shot is the most reliable thing Kling does.
  - Use a hard cut between them, never a dissolve inside a 40-frame scroll shot.
  - The cheapest version is to end the film on the door closing: trim at source frame 70 and drop the drive-off.

**B2. Shot 2: the cover reveal runs backwards to physics (Kyle's complaint, confirmed and worse).**
- **Where:** site frames 041–080, source frames 0–120.
- **Cloth moves away from the hands:**
  - The hands hold the hem at the front-left bumper. From site frame 048 to 060 the cloth on the roof travels right, toward the rear of the car and away from the hands: +1 to +2.5 px per frame at 960 px wide, source 22–60.
  - At 062–064 it briefly moves back toward the hands, at 064–071 away again, and at 071–073 back again.
  - From 073 to 080 it drops back down over the roof and rear (+y, +x, source 99–120). The car is being re-covered at the end of the reveal.
  - The shot ends at 080 with the rear half and the roof still under the cover.
- **Hands do nothing:** the hands and arms are frozen in the same pose for all 5 seconds. Flow in the hand region is about 1 px, and the 001 and 121 crops are identical. Nothing pulls. The fabric animates itself.
- **The cover changes material in the hands:**
  - 041–047: a matte grey felt fitted cover with mirror pockets.
  - From about 050: a glossy black satin drape. By 054 the whole cover has changed colour and weight.
- **The cloth billows on the roof** at 072–074 as if in wind, inside a closed garage.
- **Phone:** the 9:16 crop (x 0.34–0.66) cuts the hands out entirely, so phones see a cover that slides off by itself.
- **Smaller points:** the car's DRLs are on while it is parked under a cover. The two disembodied arms come in from the frame edge with no body.
- **Evidence:** `s2_key.jpg`, `s2_hands.jpg`, `film_shot2.jpg`, `phone_s1-3.jpg` (row 2).
- **Fix:** **do not re-render cloth physics in Kling.** It will keep failing. More reliable options:
  1. A light reveal: the covered car sits in the dark, the bay lights snap on in sequence and the cover is simply gone in the next shot. A hard cut, with no cloth on screen.
  2. A slow push-in on the already uncovered car as its own lights wake: DRL animation, puddle lamps.
  3. If a cover pull is required, shoot it for real, or use a 3D cloth simulation (Blender) on a licensed Escalade model.

  Kling cannot keep the hands, the pull and the cloth consistent.

**B3. Bronco spin reverses direction halfway, so it never turns all the way round.**
- **Where:** `spin/bronco/`, views 00–30 then 31–71.
- **What happens:**
  - The Bronco turns from front three-quarter (00), through the right side (04–10), past the rear (22) to the rear three-quarter on the other side (30).
  - Then it turns **back the way it came**: rear again at 40–46, the same side again at 48–66, front three-quarter at 71.
  - Optical flow changes sign at view 30. Step 30→31 is a stall at 0.06× the neighbouring steps.
  - The car's left side is never shown. Dragging the "turntable" makes the car rock back and forth.
- **Cause:** the closing clip `bronco_b` (`92189cfd`) turned the car back the other way. This is the same failure that got `e53_b` rejected, but it was missed here. The a→b junction sits exactly at view 30→31.
- **Wrong callout:** the "Removable roof and doors" callout (deg 210) lands on a rear view, because the car never reaches 210°.
- **Evidence:** `spin_bronco_reversal.jpg`, `spin_bronco.jpg`, `spin_steps.txt`.
- **Fix:** re-render the closing clip. See the spin method note under N1. Better still, replace AI spins with a real 360° asset (see verdict).

**B4. E53 spin loop seam: a double-exposure crossfade from a side view into a front three-quarter view.**
- **Where:** `spin/e53/` views 68–71 → 00.
- **What happens:**
  - Views 68–71 are a side profile (front pointing left), and 70–71 show two cars superimposed.
  - View 00 is a front three-quarter view, a jump of roughly 60–80° in one step.
- **Cause:** the 8-frame blend in `build_spin.py`, used when `e53_c` did not come all the way round.
- **Also:** step 71→00 is 0.46× its neighbours, and the brightness jumps +3.3 L at the seam.
- **Evidence:** `spin_loop_seams.jpg` (row 3), `spin_e53.jpg`.
- **Fix:** re-render the closing clip so the car physically reaches the start pose. Never blend a spin seam.

**B5. Shot 4: the hero "driving" shot glides and weaves instead of driving.**
- **Where:** site frames 121–160, source `s4.mp4` 0–120.
- **The car weaves without steering.** I tracked the DRL pair at 24 fps; lateral position is in DRL-separation units, about 1.75 m:
  - Source 0–37: +0.15, about 0.26 m to the right.
  - Source 37–86: −0.51, about 0.9 m to the left.
  - Source 86–110: about 8 cm back to the right while the car is almost stopped.
  - There is no matching yaw. The ratio of left to right DRL heights stays at 1.03–1.05 throughout, and the visible flank never changes side. The car crabs left and right.
  - Site frames: right drift 121–133, left drift 133–149, creep back right 149–157.
- **Wheels don't turn.** The front wheel's spoke pattern is identical across source frames 0–3 (`s4_wheel_static_src1-4.jpg`), so the car slides on locked wheels. At this oblique angle strobing can't be ruled out completely, but it reads as gliding.
- **Speed is uneven:**
  - Approach speed (Δscale / scale²) is steady until about source 80.
  - Then the car brakes to a full stop in about 1 s (source 80–104) with no visible nose dive.
  - It sits stationary in mid-street for the last 17 source frames, site 155–160. About 15% of the shot's scroll shows a parked car.
  - Site-frame flow surges at 138–147: 2–3× the flow at 121–137, with a spike at 140→141 of 2.38 against 1.04 and 1.64 either side.
- **Evidence:** `s4_key.jpg`, `s4_src_car.jpg`, `s4_wheel_static_src1-4.jpg`, `s4_wheel_src0-7.jpg`, `film_flow.json`.
- **Fix:** **re-render** with:
  - A side or rear three-quarter tracking angle, where wheel rotation reads.
  - Constant speed in the prompt, no stop.
  - Both ends pinned to frames with the car in the same lane.
  - Alternatively, trim to source 0–80, re-spread the 40 frames across that range, and accept a shorter, steady approach.

**B6. Shot 6: people behave impossibly while boarding.**
- **Where:** site frames 201–227, source 0–75.
- **The traveller walks on the spot.** His legs stride, but he moves only about 40 px of a 1920 frame in 26 frames (source 1–26, site 201–209). He moonwalks.
- **He merges into the chauffeur and vanishes.** From source 34 to 39 (site ~213–214) his body melts into the chauffeur's back and the door. He "gets in" within about 4 frames (0.17 s) with no step up, no bending and no sitting.
- **The bag disappears.** The carry-on in his left hand (visible at source 1–18) is gone by source 20 (site ~208). Nobody puts it anywhere.
- **The door closes by itself.** The rear door is open at source 68 and shut at 72 (site 225–226), while the chauffeur is already a metre away with his back to it.
- **The chauffeur leaves the car.** At 221–232 he walks away toward the jet. The car then leaves without him (B1).
- **Evidence:** `s6_traveller_entry_src.jpg`, `s6_door_close_src.jpg`, `s6_people.jpg`, `s6_faces_and_boarding.jpg`.
- **Fix:** **replace.** Boarding with a door, two people and a bag is exactly the complex hand and body interaction Kling gets wrong. Simpler, more reliable beats:
  - A close-up of a gloved hand on the door handle, then a hard cut.
  - Or an interior shot from the back seat as the door closes, with no faces.
  - Or a still with a slow push-in.

### NOTICEABLE

**N1. All six spins judder: uneven 5° steps that alternate big and small.**
- **Cause:** `build_spin.py` picks views by the cumulative grey-level frame difference, then rounds each one to a whole source frame. With about 2.7 source frames per view, the chosen frames alternate between 1-frame and 2-frame gaps. So alternate steps differ by about 2:1.
- **The proxy is also wrong:** frame difference is not proportional to angle. Front and rear views produce more change per degree than side views.
- **Measured by optical flow.** The table lists the steps more than 1.45× or less than 0.65× their neighbouring steps; full per-step numbers are in `spin_steps.txt`:

| Car | Uneven steps (view → view, ratio to neighbours) |
|---|---|
| Escalade | Alternating judder at 17→18 through 27→28 (0.48 to 1.95×). Also 9→10 (1.81), 58→59 (2.10), 63→64 (0.50), 69→70 (0.53). 26 of 72 steps are off by more than 35%. |
| Tahoe | 13→14 (0.48), 26→27 (2.06), 30→31 (2.01), 36→37 (2.01), 39→40 (1.95), 49→50 (0.47), 55→60 alternating. |
| E53 | 2→3 (0.47), 17→18 (0.48), 54→55 (1.96), 70→71 (1.87), 71→00 (0.46). |
| i5 | 0→1 (1.71), 68→69 (1.85), 16→27 alternating (about 0.52). |
| Bronco | 30→31 stall (0.06, the reversal), then strict 1-2-2 alternation from 33 to 56 (about 0.5×). |
| Model Y | Alternating 46→55 (0.54 / 1.92), plus 18→19 (1.84) and 36→37 (1.86). |

- **Exposure flashes at clip junctions.** Every car has a whole-bay brightness and colour pop where clip a meets clip b or c. The static wall patch jumps 2.2–2.5 ΔE against a median of 0.15:
  - Escalade 52→53, Tahoe 7→8, E53 28→29, i5 43→44, Bronco 30→31, Model Y 16→17.
  - Evidence: `spin_clip_junctions.jpg`.
- **Loop seams (71 → 00).** Frame 00 is the pinned still, which does not match the clip's exposure, colour or light state:
  - Escalade: brighter, with the DRL shape changing.
  - i5: the paint shifts from dark Brooklyn Grey to a warm bronze-grey.
  - Bronco: the headlamp rings switch off.
  - Model Y: the front light bar switches on.
  - Evidence: `spin_loop_seams.jpg`, `spin_modely_60-08.jpg`.
- **Wobble, scale and centring:** the car stays centred to within about 2–3% of the frame width (`spin_centre_grid.jpg`). Front and rear straight-on widths differ by 5–8% on the E53 and Model Y (`spin_front_rear_width.jpg`), a small scale breathe. These are nitpicks next to the steps.
- **Callouts:** anchors are fixed points shown for ±15°, so the dot drifts off the wheel or grille as the car turns. Because the steps are not really 5°, the `deg` values are wrong too (`spin_callout_anchors.jpg`).
- **Fix:**
  - **Re-time in code:** estimate the true angle per source frame. Use wheel or landmark tracking, or silhouette width, rather than frame difference. Interpolate views at true 5° steps, or at least resample with sub-frame cross-blending only between adjacent 24 fps frames.
  - **Re-render** the closing clips so they end on the start pose.
  - Grade every clip to match the still, or drop the still and close the loop on a clip frame.
  - **Best:** use a real 360° photo set or a 3D model render for the showroom. AI video will not give an exact, even, rigid turntable.

**N2. Chauffeur continuity: three different men.**
- **Shot 5** (source 30–81, site 170–187): dark hair, full beard, lighter skin, grey suit, black gloves.
- **Shot 6 start** (source 1–30, site 201–211): shaved head, darker skin, lighter grey suit.
- **Shot 6 later** (source 60–74, site 222–226): short black hair, darker skin, near-black suit.
- **Same-angle jump cut at 200 → 201:** the shots share a locked-off camera, so the change pops. The rear door snaps open and the traveller appears from nowhere.
- **Evidence:** `chauffeur_continuity.jpg`, `s6_people.jpg` (first two panels).
- **Fix:** re-render with a reference image of the same person in every shot, or keep people out of shot (see B6). If shots 5 and 6 stay, change the camera angle at the cut.

**N3. Faces are visible and possibly identifiable, against the brief.**
- Chauffeur in profile, with beard and nose, at shot 5 source 51 and 81 (site about 177 and 187).
- Traveller in profile at shot 6 source 24–30 (site about 209–211).
- **Evidence:** `s5_chauffeur_profile.jpg`, `s6_faces_and_boarding.jpg`, `people_faces.jpg`.
- **Fix:** re-render with the people facing away, or crop.

**N4. Shot 5: the arrival has wheel smear and an odd path; the "waiting chauffeur" logic doesn't hold.**
- **The car pops in from the frame edge** at site 165–168 (source 7–11).
- **The wheels never rotate as a rigid wheel.** The spokes smear into a different blob every frame (`s5_wheel_smear_src16-20.jpg`).
- **The path weaves:**
  - Lateral flow runs +10 px per frame (at 960 px wide), easing to 0 at source 56 (site 179). It then reverses to −4.6 px per frame and stops at source 76 (site 186).
  - The heading does follow the curve, so this is less bad than shot 4. But the site frames show a stall at 177–180 (flow 0.6–0.7) and then a surge at 180→181 (1.94).
  - After stopping, the body bobs vertically at source 78–85 (about 1.6 px at 960 px wide).
- **Logic:** the chauffeur waits at the jet while the car arrives. So someone else drove it, but that driver never gets out, and in shot 6 the car leaves without the chauffeur.
- **Evidence:** `s5_key.jpg`, `s5_car_src40-63.jpg`, `s5_car_entry_src10-24.jpg`, `s5_wheel_smear_src16-20.jpg`.
- **Fix:** re-render with the chauffeur as the driver: the car arrives, the chauffeur steps out. Or arrive with the car already parked at the jet and cut straight to the door. Ask for a steady approach in a shorter arc.

**N5. Scroll blending creates double images whenever anything moves.**
- **Cause:** `draw()` cross-fades frames i and i+1 while scrolling. On desktop the frames are about 3 source frames (0.125 s) apart; on phones (STRIDE 2) about 6 (0.25 s). Moving cars therefore show two sets of DRLs and wheels.
- **Where:** shot 4 at 138–149, shot 5 at 165–186, shot 6 at 232–240, and the cloth at 048–073.
- **Evidence:** `scroll_blend_ghosting.jpg`.
- **Fix:** **re-time in code.**
  - Ship more frames for the motion shots: 24 fps source, at least 80 frames per shot on desktop.
  - Or replace the cross-fade with nearest-frame display, which is crisper.
  - Or use optical-flow interpolation offline when building the frames.
  - On phones, stop dropping every second frame in the motion shots.

**N6. Phone crops hide the story.**
- **Shot 2:** the hands are cropped out, so the cover moves by itself.
- **Shot 4 (site 141–159):** the car is wider than the 9:16 window and is cut off on both sides.
- **Shot 5 (161–176):** the chauffeur waiting at the stairs is outside the crop, and the car enters from the edge.
- **Shot 6 (201–215):** the boarding happens on the crop's right edge, with the people cut in half.
- **iPad portrait** also gets the phone set (aspect below 0.85), upscaled about 1.5× and further cropped top and bottom.
- **Evidence:** `phone_s1-3.jpg`, `phone_s4-6.jpg`.
- **Fix:** re-frame per shot with a subject track. Better still, generate vertical versions natively.

**N7. Shot 3 (cabin) is a dead scroll with a cracked-looking screen and impossible seats.**
- **Dead scroll:** site 081–096 (16 of 40 frames, 40% of the shot) show no change. Flow is about 0.06 px, the same as compression noise.
- **Cracked-looking screen:** the display wakes at 097–104. By 110–120 its graphic is orange, forked lines that read like a cracked screen.
- **Impossible seats:** the "front seats" in the foreground are quilted cushions with no backrests or headrests, although the camera is behind them.
- **Small pop:** a slight pop at 081→082 (flow −0.16 px vertical, frame difference 3.98 against about 0.7).
- **Evidence:** `s3_key.jpg`, `s3_seats_and_dash.jpg`, `film_shot3.jpg`.
- **Fix:** re-time in code by starting the shot at source frame about 45. Re-render the screen with a calm, slow graphic. Frame from the driver's seat over the wheel, where seat geometry isn't visible.

**N8. Car accuracy problems across angles.**
- **Escalade spin:**
  - The left door mirror is missing in the rear view (view 31; the right mirror is present).
  - Bright machined silver wheels, while the film's hero car has dark wheels (shots 2 and 4–6). So the showroom Escalade is not the same car.
  - Evidence: `spin_front_rear_width.jpg` (row 1), `spin_escalade.jpg`, `escalade_wheels_compare.jpg` (last two panels; the three film crops in that image missed the wheels, so use `s2_key.jpg` and `s4_key.jpg` for the film's dark wheels).
- **BMW i5:**
  - The rear shows exhaust tips at both corners of the bumper, on an electric car (view 33).
  - The rear plate glows blue.
  - A front plate with pseudo-text appears in views 68–71 but not in view 00.
  - Evidence: `spin_front_rear_width.jpg` (row 4), `spin_loop_seams.jpg` (row 4).
- **Model Y:**
  - The rear view (42) shows separate tail lamps with no continuous full-width rear light bar, which the 2026 car has.
  - The front light bar is off for views 58–71 and on for 00–23.
  - Evidence: `spin_front_rear_width.jpg` (row 5), `spin_modely_60-08.jpg`.
- **Garbled pseudo-text plates:** Escalade 31, Tahoe 32, E53 45, i5 33 and 69, Model Y 42, Bronco 22 and 42 (`spin_plates_zoom.jpg`, `spin_front_rear_width.jpg`). They are illegible, but clearly fake text: an AI tell.
- **Tahoe rear (views 28–34):** soft and smeared, including the tailgate and the plate.
- **Checked and correct where visible:**
  - Escalade front: vertical stacked lamps and a big grille.
  - Tahoe: J-shaped top DRL and a squared grille.
  - i5: illuminated kidney outline.
  - E53: Panamericana grille.
  - Bronco: 4-door with the BRONCO grille lettering.
  - Steering wheel on the left in shot 3.
- **Fix:** **replace** the spins with real photography or licensed 3D. Otherwise re-render the views, using the reference photo at every quadrant, and blank the plates.

### NITPICKS

- **n1. Shot 1 lighting:**
  - Frame 001 already has the near-left bay fully lit, so it is not a dark garage. The "bay by bay" switch-on is really one cold-to-warm change on the right bay at 007→008 (frame-difference spike of 3.81).
  - The right bay's roll-up door rises by itself at 008–023, revealing a ceiling strip that was already lit.
  - The covered cars are low sedan or crossover shapes; none reads as the Escalade's tall, boxy silhouette.
  - Evidence: `s1_key.jpg`, `s1_rightbay_strip.jpg`.
  - Fix: trim to frames where everything starts dark, or re-render with "all lights off at frame 1".
- **n2. Time of day runs backwards:** a dark night street (shot 4), then an orange sunset glow at the apron (shots 5–6). Fix: grade shot 4 to blue hour, or the apron to post-dusk.
- **n3. Shot 6 indicator:** the amber lamp in the right headlamp flashes irregularly (on from source 35 to 48, off from 50, and intermittent before that) instead of at a steady 1.5 Hz. Fix: trim, or ignore.
- **n4. Aspect ratio:** the 3856×2148 and 3848×2152 sources are resized non-uniformly to 3840×2160, a 0.8–1.3% vertical stretch on every film frame. Fix: crop instead of resizing when building the frames.
- **n5. Shot 2 DRLs:** the parked car's DRLs glow under the cover.
- **n6. Shot 5 → 6 cut:** frame difference is 6.0 against about 1 within the shot (see N2).
- **n7. Spin wall glow:** the white headlight glow on the back wall in the rear views (Escalade 14–23 and 36–44; Tahoe likewise) is physically plausible, but it flickers between steps because of the step unevenness.

---

## Overall verdict

**No. This footage would not pass for a real premium brand's site.**

A normal viewer scrolling on an iPhone will see:
- a cover that peels itself off, retreats and re-covers;
- a hero car that glides on unturning wheels and drifts sideways;
- an ending where the car jumps position through a ghosted double frame and drives away from its own chauffeur;
- a showroom Bronco that rocks back and forth instead of turning;
- an E53 that dissolves from side-on to front-on.

Any one of these would be caught in a brand review at Cadillac, Mercedes or a luxury rental house. Together they read unmistakably as AI.

The judder, the exposure flashes, the changing chauffeur, the visible faces, the exhaust tips on an EV and the pseudo-text plates would each, on their own, get a shot sent back by a premium client.

### What holds up
- The locked-off framing and art direction of shots 1, 3 and 5.
- The Escalade front-end accuracy in shot 4.
- The car identities in the spins at their hero angles.

### Recommendation
1. **Cut the shots that depend on complex physical interaction** (cloth, doors, boarding, bags) and replace them with lighting reveals, close details and hard cuts.
2. **Re-render the two driving shots** with steady, side-on or rear-three-quarter motion where wheel rotation reads, with no stops and no dissolves.
3. **Re-time the film in code:** more frames for the motion shots, and nearest-frame display.
4. **Replace the AI turntables** with real 360° photography or licensed 3D renders. Kling cannot hold a rigid, evenly turning car for 360°.
