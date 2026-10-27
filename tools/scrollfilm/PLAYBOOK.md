# Scroll-film playbook

How every scroll-film site is made, so it ships right the first time. Written 2026-10-26 after the first
four sites (HVAC, cleaning, wrap, BBQ), where about a third of the Higgsfield credits went to redoing shots.

## What went wrong before, and the rule that prevents it
| Problem | Cost | Rule |
|---|---|---|
| Wrap car resembled a Lucid Air; old detailing car resembled an Aston Martin | ~220 | Hero objects are checked against real brands before any video (step 2) |
| Extra AC units appeared in the carry-away shot | ~60 | Every shot has a pinned start and end frame (step 4) |
| A cleaner's vacuum vanished; uniform colours drifted | ~90 | A continuity sheet per site (step 2) |
| Cloned, identical houses in the opening drone shot | ~40 | Varied, lived-in settings are written into the continuity sheet (step 2) |
| BBQ knife shot looked fake | ~30 | Risky motion gets a cheap test first (step 5) |
| Rental Tahoe, Escalade and Model Y were older generations; plane landed in a few feet of runway | ~280 (site redone) | Real products are matched to current official photos, and every shot gets a physics and scale check, at the stills stage (step 3) |
| Rental concept kept its airport look after Kyle upgraded the fleet to premium | (same) | When the brief changes, re-derive the design from it, and look at Kyle's references before planning (step 1) |
| Keyroom: cover moved by itself, car glided and jumped, showroom spin uneven, all found by Kyle on his iPad | ~115 to redo | Frame-by-frame physics and smoothness checks (step 6) and an independent multi-device review (step 8) |

## Steps, for every site
1. **Design plan, approved before any credits.** One message to Kyle: look, colours, fonts, signature
   interaction, and the six-shot list. Nothing is generated until he says yes. (CLAUDE.md rule 13.)
   First find every reference Kyle sent for that kind of site, including in his other sessions, and say
   what the plan does better than each one.
2. **Continuity sheet**, written before the first image:
   - People: exact clothing and colours. Faces turned away or natural, never a real person's likeness.
   - Props that must appear in every shot they belong to (the vacuum, the gauges, the tools).
   - The hero object (car, house, room), described once. List the real brands it must not resemble and
     check every still against them. No badges, logos or recognisable grilles or light signatures.
   - Settings: real, varied and lived-in. No cloned buildings, cars or furniture.
3. **Stills first.** Generate every keyframe (about 4 credits each), make one contact sheet, check it
   against the continuity sheet, and send it to Kyle for a quick yes or "change X". Before sending:
   - any real product (a car model, an appliance) is compared side by side with current official photos
     of the model year we claim, so no outgoing generation slips through;
   - every shot passes a realism check: sizes, distances and speeds a viewer would believe;
   - ask honestly whether the set beats Kyle's reference. If not, say so before he sees it. Fixing a still costs
   4 credits; fixing a 4K shot costs 30, and a hero object across a whole film costs 200 or more.
4. **Pin both ends of every shot.** Each Kling clip gets a start frame and an end frame from the
   approved stills, so the model cannot invent or drop objects in between.
5. **Test risky motion cheaply.** Hands, tools, blades, people carrying things and fast motion get a
   `pro` test (about 9 credits) before the 4K render.
6. **Check every clip before it is used, frame by frame, not just a strip:**
   - **Physics and motion** (the check that was missing; Keyroom's cover crawled off on its own and its
     car glided sideways):
     - things move only when something moves them, and in the right direction;
     - wheels turn at the speed the car travels, tyres stay planted, no sideways sliding or scale pops;
     - feet planted, hands touch what they act on, doors and cloth behave like real ones;
     - reflections, shadows, steam and water move with the objects.
     Cloth, hands and complex mechanics are the weak spots of AI video: prefer shots that avoid them.
   - **Smoothness, measured:** frame-difference or optical-flow per frame, listing jumps, stalls,
     reversals and pops; loop seams for spins; even rotation steps.
   - **Accuracy at every angle:** real products checked front, side and rear against current photos;
     no garbled badges, morphing panels or readable plates.
   - **Continuity** against the sheet, and logo or look-alike checks.
   A clip that fails is redone before it goes into the site, never after Kyle has seen it.
7. **Budget per site plus a 15% retake buffer.** If a site would go over, stop and ask.
8. **Site QA before "done", by a reviewer who did not build it** (an agent that grades its own work
   misses things; Kyle's iPad caught what the builder's QA passed):
   - every device Kyle uses: iPhone (with Safari bars), **iPad landscape and portrait**, and desktop,
     with touch emulated; scroll fast and on a throttled network to catch stale or jumping frames;
   - every interaction, every number in calculators, every line of copy;
   - screenshots across the scroll and every section, under the
     site's real CSP (`scratchpad/.../hvac/test/serve.py` serves `public/` with the `_headers` policy);
   - `node --check` and `npx oxlint` clean; no console or CSP errors;
   - one H1, noindex, canonical, OG image, "Concept site" label, footer says fictional business,
     AI-generated footage and sample prices; no testimonials; no em dashes in visitor copy;
   - Kyle opens the preview on his iPhone. Only then is the site marked done.

## Updating a live site
- Frames are cached by browsers for a week, so a replaced frame with the same file name keeps showing the
  old picture. Whenever any frame changes, bump `FV` at the top of the site's JS (frame URLs and
  `frames.json` carry `?v=FV`). Learned 2026-10-26: Kyle saw the old wrap car mixed with the new 911.

## Pipeline
- Stills: `nano_banana_pro` at 4K for new scenes; `gpt_image_2_5` (quality high) for edits of an existing
  still (same room at a different time, objects removed).
- Video: `kling3_0`, `mode: 4k`, `sound: off`, 5 seconds, start and end frames. Decline preset
  suggestions and generate literally.
- Frames: `build_frames.py` (40 frames per shot, 2560-wide WebP for desktop, 1080x1920 crops for phones,
  `frames.json` with each phone crop). Adapt the shot list and phone crop centres per site.
- Each site gets its own HTML, CSS, JS and self-hosted fonts. Reuse the pipeline, not the layout.
