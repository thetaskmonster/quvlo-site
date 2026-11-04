# Brightside (cleaning) footage audit (independent reviewer, 2026-10-27)

Verdict: fails "moves in the real way". Evidence paths are relative to this folder.

## Blockers
- B1 Shot 2 kitchen (041-075): time-lapse crew are melting translucent ghosts (legs dissolve 054,056,060,065,069-073; half bodies 059,066; overlaps 065,072; grey hair at 051); both vanish 074->075 with +15 L flash; vase (063), lemon bowl (~049) pop in; towel/backpack/kibble vanish; flow surges 052,062,068. Phone crop centred on ghosts. crops/s2_53-66.jpg, crops/s2_67-80.jpg, sheets/m_shot2.jpg. Fix: replace with people-free before/after (light change or hard cut, or slow push-in on clean kitchen).
- B2 Shot 2 (042-053): white plume like smoke off counter during wipe; mug shelf changes behind it (044-045 vs 048). crops/s2_cloud_41-52.jpg, crops/s2_mugshelf_44-53.jpg. Fix: replace (as B1).
- B3 Shot 1 (016->021): vacuum changes model (charcoal red/teal base -> blob 017-020 -> silver bagless 021-040). crops/s1_vacuum_morph_14-25.jpg. Fix: trim to 001-016 (source 0-46) and re-spread, or re-render with pinned reference / cordless stick carried.
- B4 Shot 5 (180->181): duvet teleports onto bed, she jumps ~30 cm; diff 9.1 vs 3-4; wall -7 L after +30 L ramp 169-177; page blend shows two women. crops/s5_pop_178-183.jpg, crops/s5_light_168-185.jpg. Fix: trim to 181-200 (or 161-179) and re-spread.

## Noticeable
- N1 Crew continuity: 4-5 different people; shot 1 left cleaner changes hair/trousers/build/carried item within shot (019-021, 031, 040); contradicts "Two of us" / "same vetted cleaners every visit". crops/crew_continuity.jpg, crops/s1_leftcleaner_identity.jpg, crops/s1_left_cleaner_carry.jpg. Fix: two reference identities or hands only after shot 1, or change caption.
- N2 Shot 4 bathroom: water streams whole shot; cleared band floats, water never crosses it (133-160); squeegee snaps back up 147-149 (+2.4 L flash); button-front work shirt not polo; grimy towel in "clean" bathroom. crops/s4_glass_reclean.jpg, crops/s4_water_121-132.jpg, crops/s4_143-152.jpg. Fix: trim to 121-140, or one slow pass on misted glass / fogged mirror light change; swap towel.
- N3 Shot 3 counter: cloth waved in the air 089-093; glove/arm swaps 092->094 (diff 19.3); spray hand appears/disappears 089-113; arm surges 100->101 (26.9 vs 9.0), 104-107, 117-118; jittery tilt, stall 105-107; crumbs never wiped. crops/s3_81-96.jpg, crops/s3_97-120.jpg, crops/s3_bottlehand_topright.jpg. Fix: re-render one hand, cloth flat, single slow stroke leaving a clean path, locked camera; or trim to source 0-80.
- N4 Hero wipe: mess and clean are separate renders; shelf 19 px off, floor 10 px, window 3.5 px; partial wipe shows stepped shelf, ghost objects, arch wall colour changes. crops/hero_partial_wipe_sim.jpg, crops/hero_seams_shelf_floor.jpg, crops/hero_split_mess_top_clean_bottom.jpg, crops/hero_edge_overlay.jpg. Fix: clean image as master; composite/inpaint clutter only on counters and floor with matched grade.
- N5 Page blending: drawFilm() in cleaning.js blends i with i+1 across shot boundaries (two rooms superimposed at 040/041, 080/081, 120/121, 160/161, 200/201) and doubles fast motion. crops/scroll_blend_ghosting.jpg. Fix: covered by the new film engine.
- N6 Phone crops lose action in shots 2, 3, 5 (counter out of crop, cleaner cut in half 041-060; bottle out 083-089, hand leaves 107-108, 114-116; she's cut in half 191-200). sheets/m_shot2.jpg, m_shot3.jpg, m_shot5.jpg. Fix: subject-tracked re-framing.

## Nitpicks
- n1 Faces partly visible: shot 4 lower face 141-146; shot 5 identifiable profile 177-200; room-bed.webp profile. crops/faces.jpg, crops/img_rooms_details.jpg.
- n2 Grimy towel in room-bath.webp. crops/img_towel_og_idx.jpg.
- n3 Time of day: shot 6 "1:40 pm" has low golden sun; shot 5 "11:20 am" long low beams.
- n4 Shot 2 wall brightens +18.6 L; 6-frame dead hold 075-080.
- n5 Shot 1 Steadicam sway, small lurch 033->034 (acceptable).
- n6 Illegible pseudo-text on hood badge, fridge note, bread bag (fine at size).
- n7 s2_fit ~1% squashed; shot 1 1425 vs 1426 px.
- n8 scratchpad/cleaning/fix/urls.txt holds expired pre-signed upload URLs: never copy anywhere public.

## Holds up
Shot 6 push-in; shot 1 001-016; shot 5 181-200; shot 3 081-088 mist; kitchen consistent across hero/shots/cards; uniform colour sage, no teal.

## Cheapest path
1 Replace shot 2 (no people). 2 Trim shots 1 (001-016), 4 (121-140), 5 (181-200), re-spread. 3 Re-render shot 3 one-hand single stroke. 4 No blending across cuts. 5 Rebuild hero mess as composite. 6 Crew identities or hands only, or change caption.
