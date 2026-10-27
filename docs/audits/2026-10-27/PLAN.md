# Fix plan: every scroll site, plus the next builds

Written 2026-10-27 after independent frame-by-frame and device audits (reports in this folder). This is the
plan to pick up when Kyle tops up credits ("reup"). Update the Status column as items land.

## Where things stand
- **Credits:** about 224 before the Keyroom reshoot. The reshoot (approved, cap 135) is running, so about 90
  will be left. 1,200 more arrive with the Nov 22 reset.
- **The problem:** AI video made motion that isn't real on every scroll site: cloth and doors moving by
  themselves, cars sliding on wheels that don't turn, people morphing, gliding or turning into other people,
  objects changing model mid-shot. The page code also showed frames from the wrong scene, blended two frames
  into double images, reloaded on rotate, and gave iPads and sideways iPhones the wrong pictures.
- **The rule from now on** (tools/scrollfilm/PLAYBOOK.md):
  - shoot only what AI video does convincingly: light changes, slow camera moves, locked time-lapses, simple
    straight motion;
  - no cloth, hands doing things, people interacting, doors, or full rotations;
  - every clip is checked frame by frame with measured motion, and every site is reviewed by someone who
    didn't build it, on iPhone, iPad (both orientations) and desktop, before Kyle sees it.

## Phase 0: running now (no decisions needed)
| Item | Status |
|---|---|
| New film player (`tools/scrollfilm/film-engine.js`) in all 7 scroll sites. No wrong-scene frames, no double images, even speed, correct frames per device and orientation, no reload on rotate, bounded memory, iOS toolbar fix | in progress (uncommitted) |
| Keyroom reshoot: garage lights, light reveal, riverside tracking drive (test first), parked arrival push-in, plus 18 showroom views (stills done) | in progress, cap 135 |
| Remaining audits: landscape footage; devices for HVAC + cleaning and wrap + BBQ; homepage, /work/ and studio pages | running |
| GSC Capital Group site | separate session ("GSC Capital Group site: finish and launch prep") |

## Phase 1: free fixes (code, trims, copy); do these first, no credits
- **Keyroom:**
  - new showroom with fixed front, side and rear views (stills made);
  - self-drive story copy;
  - rev gauge that follows the car;
  - captions off the action;
  - quote copy (deposit not "included", own-policy line);
  - US spelling;
  - form errors tied to their fields;
  - race-safe car swap.
- **HVAC:**
  - drop "one dolly";
  - clock times that match the DFW sky;
  - rethink the "Coil" hotspot;
  - phone crops (hold on the thermostat in shot 5, track the tech in shot 3, widen shot 6);
  - trim shot 3 to src 0-92;
  - soften the fg matte;
  - paint out the wet walk;
  - replace the 3D model with a still plus hotspots until a real model exists;
  - composite the correct unit and line set into shot 6, og.jpg and svc-new.webp.
- **Cleaning:**
  - trim shot 1 to 001-016, shot 4 to 121-140 and shot 5 to 181-200, then re-spread;
  - change "same cleaners every visit" or show hands only;
  - retouch the grimy towel;
  - fix the clock times;
  - phone crops for shots 2, 3 and 5.
- **Wrap:**
  - trim shot 1 to src 36-57, shot 4 to src 0-45, and shot 5 to src 12-36 with the phone crop re-centred and
    the light bar patched;
  - grade shots 3-5 to match shot 6;
  - exact 3-frame steps;
  - caption: door glass, not rear glass;
  - clean the badge smudge;
  - check the badge position against a real 992 lid (red calipers mean Carrera S).
- **BBQ:**
  - shot 1 from src 60;
  - shot 2 src 36-57 only;
  - shot 6 from s6b only, hard cut, ease-out;
  - re-export og.jpg without the black band;
  - captions ("thin blue smoke", "nobody opens the lid");
  - exact steps.
- **Builder:**
  - trim shot 5 to src 0-45;
  - fade the blueprint out by frame 110;
  - fix the day numbers against the counter;
  - one build length everywhere;
  - room photo race bug (token, preload, cross-fade);
  - captions off the house, plus an iPhone landscape layout;
  - pink contrast;
  - room photos that match each plan or a neutral caption;
  - warranty bars;
  - accessibility list.
- **Landscape:**
  - game: the Show-me instant-win bug, the stored best of 0, the clock when paused, the pattern switch,
    a touch stop, the iPhone landscape trap, straightness in the score;
  - hero kicker contrast;
  - per-shot caption placement;
  - copy: four days vs the estimator, mowing price, $0 job, no mowing new sod on day 4, watering FAQ;
  - "Concept site" pill on phones;
  - accessibility list.
- **Everywhere:**
  - stop reusing "Lights on" and the clipped-fragment heading formula;
  - US spelling;
  - 44 px tap targets;
  - og:image:alt.

## Phase 2: reshoots (credits)
Each one: stills first, Kyle approves, cheap test for any motion, 4K, frame-by-frame check, then the site.

| Site | Reshoot | Credits | Status |
|---|---|---|---|
| Keyroom | see Phase 0 | 135 | running |
| Builder | shots 2, 3, 4, 6 as a locked time-lapse with no people or vehicles; shot 5 straight push-in | ~190 | |
| HVAC | shot 2 failed unit with a slow push; shot 3 empty pad with no people; shot 5 one static room where only the light changes; thermal pair from one plate; optional end of shot 1 | ~150 | |
| BBQ | shot 4 closed-lid night time-lapse; shot 5 wrapped brisket at sunrise, no hands; shot 3 real packer brisket, one shaker | ~140 | |
| Cleaning | shot 2 before/after with no people; shot 3 one-hand single stroke; shot 1 vacuum that stays the same; hero mess composited onto the clean master | ~130 | |
| Wrap | shot 1 straight arrival on turning wheels; Lay and Edges as hands-only close-ups | ~130 | |
| Landscape | pending its footage audit | ~100 (estimate) | |
| Retake buffer | | ~120 | |
| **Total** | | **~1,100** | |

**Credit options** (Kyle to choose):
1. Buy another 2,000 pack (about $105). It covers every reshoot now, and the Nov 22 credits stay free for new sites.
2. Worst first as credits allow.
3. Phase 1 only until the reset.

## Phase 3: before anything goes back to Kyle
- An independent device review of each fixed site: iPhone portrait and landscape, iPad 1180x700 (Kyle's),
  iPad portrait, desktop.
- Kyle checks on his iPhone and iPad.
- Commit, push, PR check.

## Phase 4: the build list resumes (after the fixes)
- **Upgrades:** Basalt (plan sent, ~140, includes fixing its cream + terracotta drift and the Texas
  med-spa/IV disclosures), Inlay, Ballast.
- **Next:** templates, luxury concierge, condo developer.
- **After the reset:** dentist, real estate listing, Red Dirt.
- **Below the line:** remodeler, Neap therapy, Longhand, 3D product page, Papito/Northline, Rive illustration.
- **Separately:** GSC (its own session).
- **Every site:** the playbook's full check sequence.

## Housekeeping
- The disk allowance is tight. Keep caches and video work in /dev/shm (RAM, cleared on restart; re-download
  from job IDs). Deleting anything outside the scratchpad needs Kyle's yes.
- Higgsfield job IDs for every still and clip are in the scratchpad PHASE*.md notes. Copy the important ones
  here if the scratchpad may be reclaimed.
