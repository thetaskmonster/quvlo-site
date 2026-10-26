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

## Steps, for every site
1. **Design plan, approved before any credits.** One message to Kyle: look, colours, fonts, signature
   interaction, and the six-shot list. Nothing is generated until he says yes. (CLAUDE.md rule 13.)
2. **Continuity sheet**, written before the first image:
   - People: exact clothing and colours. Faces turned away or natural, never a real person's likeness.
   - Props that must appear in every shot they belong to (the vacuum, the gauges, the tools).
   - The hero object (car, house, room), described once. List the real brands it must not resemble and
     check every still against them. No badges, logos or recognisable grilles or light signatures.
   - Settings: real, varied and lived-in. No cloned buildings, cars or furniture.
3. **Stills first.** Generate every keyframe (about 4 credits each), make one contact sheet, check it
   against the continuity sheet, and send it to Kyle for a quick yes or "change X". Fixing a still costs
   4 credits; fixing a 4K shot costs 30, and a hero object across a whole film costs 200 or more.
4. **Pin both ends of every shot.** Each Kling clip gets a start frame and an end frame from the
   approved stills, so the model cannot invent or drop objects in between.
5. **Test risky motion cheaply.** Hands, tools, blades, people carrying things and fast motion get a
   `pro` test (about 9 credits) before the 4K render.
6. **Check every clip before it is used:**
   - frame strip (every 15 to 30 frames) and frame-difference jump check;
   - logo and look-alike check;
   - continuity check against the sheet.
   A clip that fails is redone before it goes into the site, never after Kyle has seen it.
7. **Budget per site plus a 15% retake buffer.** If a site would go over, stop and ask.
8. **Site QA before "done":**
   - screenshots at 1440x900 (2x) and 390x844 (3x) across the scroll and every section, under the
     site's real CSP (`scratchpad/.../hvac/test/serve.py` serves `public/` with the `_headers` policy);
   - `node --check` and `npx oxlint` clean; no console or CSP errors;
   - one H1, noindex, canonical, OG image, "Concept site" label, footer says fictional business,
     AI-generated footage and sample prices; no testimonials; no em dashes in visitor copy;
   - Kyle opens the preview on his iPhone. Only then is the site marked done.

## Pipeline
- Stills: `nano_banana_pro` at 4K for new scenes; `gpt_image_2_5` (quality high) for edits of an existing
  still (same room at a different time, objects removed).
- Video: `kling3_0`, `mode: 4k`, `sound: off`, 5 seconds, start and end frames. Decline preset
  suggestions and generate literally.
- Frames: `build_frames.py` (40 frames per shot, 2560-wide WebP for desktop, 1080x1920 crops for phones,
  `frames.json` with each phone crop). Adapt the shot list and phone crop centres per site.
- Each site gets its own HTML, CSS, JS and self-hosted fonts. Reuse the pipeline, not the layout.
