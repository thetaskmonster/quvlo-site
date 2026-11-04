# Norther Comfort Co. (HVAC) footage audit (independent reviewer, 2026-10-27)

Verdict: fails as shipped. Evidence paths are relative to this folder. Cached source frames (~150 MB) are in scratchpad/audit_tmp/hvac/ (delete only with Kyle's OK).

## Blockers
- B1 Shot 5 room changes in one step at site 174->175 (src 42->43): sunlight becomes dusk, the window and view change, sheers start billowing, lamps switch on, the thermostat lights up, an outlet vanishes, the dog jumps pose. Page blend shows two rooms. crops/s5_pop_src36-47.jpg, crops/s5_site174-176_dissolve.jpg. Fix: replace with one locked static plate (src 0-40); dusk as a grade ramp or cross-fade of the same plate.
- B2 Shot 5 curtains billow in a sealed room with the fan off (175-200). Fix: replace, no cloth.
- B3 Shot 5 dog sprints, rears onto the sofa and is asleep within ~1 s (src 36-66, site 172-182). crops/s5_dog_src44-66.jpg. Fix: dog asleep and still, or removed.
- B4 3D unit (img/unit.glb, image-to-3D) has a fan front AND back, coil on both ends, no service valves, smeared blades; auto-rotate shows it in ~9 s under the "Turn it around" heading. crops/unit3d_front_vs_back.jpg, crops/unit3d_12views.jpg. Fix: licensed/modelled unit or a still with hotspots.

## Noticeable
- N1 Three different old units (shots 1, 2, 3) and two new units (shot 4 side-discharge with line set; shot 6 / og.jpg / svc-new.webp white top-discharge on grass with no line set or electrical). crops/unit_continuity.jpg, crops/s6_unit_and_walk_220.jpg. Fix: composite the shot 4 unit into shot 6 and images; rebuild shots 2-3 from the shot 1 unit.
- N2 Shot 3: unit carried like an empty crate by fingertips; dust cloud from nowhere; caption "one dolly" but no dolly; tech A's face identifiable 089-104. crops/people_faces_continuity.jpg. Fix: caption now; replace with a slow push on the empty pad.
- N3 Shot 3 dead scroll 112-120 (23%); phone: tech exits the crop at 101, half the shot is wall. Fix: rebuild from src 0-92 and track the tech.
- N4 Phone: thermostat out of the crop 161-186, so the countdown is never seen. Fix: phone crop centre ~0.75 held.
- N5 Shot 4 fan appears at full speed at src 44 (site 135->136), no ramp; the guard blurs with the blades; blob blades. crops/s4_fan_src.jpg. Fix: composite a real rotating fan with a ramp and a static guard layer.
- N6 Page blend across cuts and in motion. Fix: new engine.
- N7 Shot 1 tree jitters and snaps out (src 74-84), a roof flickers (src 80-82), smeared leaves 024-027. crops/s1_src78-87.jpg.
- N8 Thermal images are colourised photos (see-through glass, blinds, print patterns); the halves don't match (lamp shifts ~60 px). crops/thermal_detail.jpg, crops/thermal_lamp_shift.jpg. Fix: proper thermal render from one plate.
- N9 Shot 2 rusted coil looks melted (wax drips) under the "Coil" hotspot; haze puffs sideways and stops (src 0-32). Fix: replace with a realistic failed condenser plus a slow push.

## Nitpicks
n1 Clock vs sky (DFW July sunset ~8:35 pm; 6:30 dusk, 7:15 blue hour too early). n2 Shot 6 front walk glistens wet, everything else dry. n3 Shot 6 8-frame cadence shimmer. n4 fg mask drops twigs; fg frames not cross-faded. n5 Shot 4 gauge hoses not connected. n6 Phone shot 6 crop excludes the new unit. n7 iPad portrait upscaled phone set. n8 Uneven 3/4 source-frame rounding. n9 Low dust haze 036-040 (harmless).

## Fine
Shot 1 aerial (varied houses, static cars), house continuity 1 vs 6, shot 3 feet and hands, shot 4 camera, thermostat overlay exact, hard cuts.

## Fix plan
1 Copy (dolly, times, Coil hotspot). 2 Code (engine; phone crops; trim shot 3; fg cross-fade). 3 Composite (new unit into shot 6 and images, real fan ramp, paint out the wet walk, rebuild shot 5 as a static plate with light grade and dog asleep). 4 Replace (shot 2, shot 3 empty pad, thermal pair, 3D model). 5 Optional shot 1 end re-render.
