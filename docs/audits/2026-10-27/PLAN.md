# Fix plan: every scroll site, plus the next builds

Written 2026-10-27 after independent frame-by-frame and device audits (reports in this folder). This is the
plan to pick up when Kyle tops up credits ("reup"). Update the Status column as items land.

## Where things stand
- **Credits:** about 93.5 left after the Keyroom reshoot (130.75 of its 135 cap). 1,200 more arrive with the
  Nov 22 reset.
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
| New film player (`tools/scrollfilm/film-engine.js`) in all 7 scroll sites. No wrong-scene frames, no double images, even speed, correct frames per device and orientation, no reload on rotate, bounded memory, iOS toolbar fix, overlays follow the drawn frame, jump links load first, hidden overlays inert | built; committed locally (20493d7), NOT pushed until the independent check passes |
| Keyroom reshoot | done, 130.75 cr; all four shots plus 18 showroom views staged (scratchpad/keyroom/stage; frame map film/frames.json). Option A failed (garbled plate and badge), so the drive uses option C (test frames 1-73, softer on phones). Open: wheel-vs-road speed couldn't be measured; shot 2 is a fade, not a sweep; phones show only the jet's nose in shot 4. To integrate after the engine fixes pass review, then an independent device review of the whole site |
| Footage audits: Keyroom, HVAC, cleaning, wrap, BBQ, builder, landscape | done (reports here) |
| Device audits: Keyroom, builder + landscape, wrap + BBQ, HVAC + cleaning, homepage + /work/ + studio pages | all done (reports here) |
| Engine requirement from the HVAC audit: the player must report the frame actually drawn, and every overlay (captions, hotspots, thermostat, HUD) must follow that frame, not the scroll position | to check when the engine lands |
| GSC Capital Group site | separate session ("GSC Capital Group site: finish and launch prep") |

## Phase 1a: quvlo.co itself, must be fixed before this PR merges (no credits)
See studio-home-devices.md.
1. **Security gate:** retire the legacy endpoints `/api/scan` (an open URL fetcher that can fire a paid
   enrichment webhook), `/api/lead` and `/api/stripe-webhook` by moving them to archive/.
2. **Legal:** rewrite Privacy and Terms for the current business; remove /thank-you ("Deposit received");
   fix the chat footnote.
3. **Share image and favicon:** still the old Agent Teardown card. Re-render.
4. **Concierge:**
   - Kyle sets `ANTHROPIC_API_KEY`, `RATE_SALT` and the `CONCIERGE` KV binding for the Preview environment
     in Cloudflare;
   - add an honest offline fallback;
   - arrow keys must not start the chat;
   - consider Turnstile so the $5/day cap can't be burned.
5. **Homepage:**
   - deep links (#close/#start/#work) land mid-story on Safari: reserve the section height;
   - hero collision on slow connections and with reduced motion;
   - iPhone landscape layout;
   - hero goes black while loading;
   - seam and headline over the storefront on iPad;
   - "the team" vs "talk to Kyle".
6. **Studio pieces:**
   - Basalt, Inlay, Ballast and Longhand need concept labels, and forms must say "Demo only: nothing was sent";
   - the fixed pill and bars cover content on iPhone;
   - Inlay's dead "Cloth" link;
   - Basalt's slots and dead Book button;
   - Texas med-spa/IV wording (Basalt) and weekly DXA (Ballast);
   - Basalt's cream + terracotta "Upstairs" palette.

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
- **HVAC (devices, see hvac-cleaning-devices.md):**
  - overlays from the drawn frame, and booking as its own section after Pricing;
  - hotspot cards in a bottom sheet on phones;
  - hidden 3D link catches taps;
  - times that agree with the clock;
  - "104°" on iPhone;
  - phone crops keep the capacitor and thermostat;
  - booking slots;
  - copy: $189 vs FAQ, "$0", the 104 -> 72° claim, heating;
  - 3D loads on tap with no wheel-zoom;
  - button contrast;
  - mouse-only service photos.
- **Cleaning (devices):**
  - the iPad checklist card covers the action;
  - times and "four hours";
  - the iPhone pill lags;
  - the wipe photos don't register, and the wipe is hard to finish on iPhone;
  - step 2 copy;
  - the 2-second "thirty seconds";
  - contrast;
  - Fraunces and the italic-tail heading formula read as AI-default.
- **HVAC (footage):**
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
- **Wrap (devices, see wrap-bbq-devices.md):**
  - the work order keeps the old colour; Factory White charged $3,900;
  - "Legal on every window in Texas" is false (windshield only above the AS-1 line / top 5 in);
  - the tint slider only darkens the front door glass (add rear-glass masks; split front and rear);
  - configurator covers the car on iPad, car not sticky on iPhone;
  - tint and Hold die after ~50 colour swaps (z-index);
  - caption contrast on the white car;
  - booking details (am/pm, month).
- **BBQ (devices):**
  - caption, cook log and gauge collide on iPad, and the caption covers the bark on phones;
  - the chart can't be dragged on iOS;
  - receipt rounding and "Hold a date";
  - "Fourteen hours" vs the log's 10 h 45;
  - re-encode the heavy desktop frames to ~100 KB each.
- **Wrap (footage):**
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
  - footage: re-time shot 2 to src 0-26 with no dissolve; constant-step cadence; phone crops (shot 1 pans to
    the oak, shot 5 centre ~0.75); caption "Sod down, stone set" until shot 5 is reshot;
  - game: the Show-me instant-win bug, the stored best of 0, the clock when paused, the pattern switch,
    a touch stop, the iPhone landscape trap, straightness in the score;
  - hero kicker contrast;
  - per-shot caption placement;
  - copy: four days vs the estimator, mowing price, $0 job, no mowing new sod on day 4, watering FAQ;
  - "Concept site" pill on phones;
  - accessibility list.
- **Everywhere:**
  - **The sites share one skeleton again.** Loader, 6-shot film, HUD, perforated receipt, 4 numbered steps,
    "Before you book/order", giant footer line, fragment headlines. Kyle's very first complaint was that the
    sites looked the same, so each site gets its own layout logic in the fixes, not just new colours;
  - stop reusing "Lights on" and the clipped-fragment heading formula;
  - safe-area insets for the iPhone landscape notch;
  - US spelling;
  - 44 px tap targets;
  - og:image:alt.

## Phase 2: reshoots (credits)
Each one: stills first, Kyle approves, cheap test for any motion, 4K, frame-by-frame check, then the site.

| Site | Reshoot | Credits | Status |
|---|---|---|---|
| Keyroom | see Phase 0 | 130.75 | shot and staged |
| Builder | shots 2, 3, 4, 6 as a locked time-lapse with no people or vehicles; shot 5 straight push-in | ~190 | |
| HVAC | shot 2 failed unit with a slow push; shot 3 empty pad with no people; shot 5 one static room where only the light changes; thermal pair from one plate; optional end of shot 1 | ~150 | |
| BBQ | shot 4 closed-lid night time-lapse; shot 5 wrapped brisket at sunrise, no hands; shot 3 real packer brisket, one shaker | ~140 | |
| Cleaning | shot 2 before/after with no people; shot 3 one-hand single stroke; shot 1 vacuum that stays the same; hero mess composited onto the clean master | ~130 | |
| Wrap | shot 1 straight arrival on turning wheels; Lay and Edges as hands-only close-ups | ~130 | |
| Landscape | shot 3 high locked drone time-lapse of grading (no visible machine turning, no crew); shot 5 slow push over fresh sod and the finished patio, no people; chipper beat as a person-free close-up or dropped | ~115 | |
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
