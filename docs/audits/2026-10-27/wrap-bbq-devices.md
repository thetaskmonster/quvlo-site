# Wrap and BBQ: device audit (independent reviewer, 2026-10-27)

Both not ready; BBQ worse on Kyle's devices. Evidence: scratchpad/audit/devices-wrap-bbq/ (start with sheets/00-top-issues.jpg; may not survive the session). Line numbers refer to the deployed files ("now :N" = working tree).

## Old player problems: all four apply (62-73% wrong-shot draws on a first scroll; 19-28% blended draws, BBQ across cuts too; reload on rotate; wrong frame sets), plus the svh band and reduced motion not honoured. Covered by the new engine.

## Passes
No console/CSP errors on 9 devices x 2 sites; noindex, one H1, disclosures, no testimonials, US spelling; Porsche trademark line correct; "not on Porsche's standard paint list" accurate as worded (never say "Porsche doesn't offer": Paint to Sample); Texas front side >=25% correct (Texas DPS https://www.dps.texas.gov/node/385); wrap estimator (96 combos) and BBQ catering totals (2,610) correct; colour stills pixel-aligned and the glass mask fits; swap 62-193 ms.

## Measurements
Wrap iPad 25.6 MB (loader 8-9 s, all 66-98 s); iPhone 12.8 MB. BBQ iPad 40.7 MB (10.7 MB before the loader, 8-16 s), iPhone 20.6 MB. Decoded if all kept: 3.5 GB desktop set, 2.0 GB phone set; renderer 700-960 MB (iPad Safari crash risk). BBQ frames average 168 KB vs wrap 100 KB. img/ and fonts/ served max-age=0.

## Issues
1. BLOCKER BBQ iPad/desktop: caption, cook log and gauge collide and cover the meat (bbq.css:79/83, 88, 99). Fix: constrain the caption, collapse the log under ~900 px height, gauge top-right on tablets, per-shot placement.
2. BLOCKER BBQ phones and iPad portrait: "Watch the bark set." covers the brisket; kickers 1.3-2.9:1 (bbq.css:234). Fix: top-anchor shot 2 and 3 captions on phones.
3. BLOCKER shared player (rebuild).
4. Wrap tint slider changes only the front door glass (0.9% of frame), brightness 69->62; "Rear glass only" at 20%/5% while the front darkens (glass-dark asset; wrap.js:258). Fix: rear-glass masks, split front (clamped >=25%) and rear, multiply darkening.
5. Wrap "Legal on every window in Texas." is false (wrap.js:260): the windshield is only above AS-1 / top 5 in; VLT is measured with the glass. Fix copy and add the windshield rule to the FAQ (index.html:199).
6. Wrap work order keeps the old colour; Gloss + Teal shows "Satin Dark Teal"; Factory White charged $3,900 (wrap.js:271-274, 281). Fix: renderTicket() in apply(), White = keep paint $0.
7. Wrap configurator: iPad 1180x700 swatches, chip and tint panel cover the car's nose, Hold below the fold; iPhone car not sticky, tail cropped; iPad portrait 120 px swatches (wrap.css:95, 110, 115, 218-224). Fix: sticky car (~45svh) on phones, contain-fit car plus left rail on tablet, swatches ~56 px.
8. Unreadable captions: "Panels clean." 2.1:1 over the white door, its kicker 1.2:1; iPhone kicker 1.4:1; BBQ hero 1.9:1; BBQ concept pill vanishes; wrap pill 7.5 px on phones (wrap.css:66, 208). Fix: per-caption scrim, bone kickers, header backdrop, >=10 px pill.
9. BBQ copy vs footage and facts: "Nobody opens the lid" over an open lid (index.html:104); "Fourteen hours" vs the log's 10 h 45; a 30-min rest; "11:00 am" while the clock reads 10:47; tooltip says resting before cooking (bbq.js:378); 6:00 sunrise too early.
10. BBQ chart: an opacity-0 range input (bbq.css:156) likely can't be dragged on iOS; preserveAspectRatio="none" squashes text (index.html:128); fake plateaus from per-segment easing (bbq.js:25); 0.1% keyboard steps, invisible focus. Fix: pointer events plus a visible role=slider, HTML text, monotone cubic.
11. Wrap job card covers installers on iPad; iPhone shots 2 and 4 lose the action; "Panels 23/23" while the bumper is still white (wrap.js:124). Fix: re-path m.crop for shots 2 and 4.
12. BBQ receipt: rounded lbs vs unrounded prices (bbq.js:409); lines $1 off the total in 84 combos; "pick two or more" not enforced; "Hold a date" has no date and confirms a mid-animation total (:428-430); catering per-lb prices differ from the menu; pit service at 20 guests vs FAQ.
13. Wrap tint and Hold die after ~50 colour swaps (z-index climbs past layers; wrap.js:207, 197, 244). Fix: fixed z roles.
14. BBQ "Tap the dots" shows 1 of 5 on SE; hidden pins stay focusable (bbq.css:120; bbq.js:213-214).
15. Uneven pacing (wrap shots 2 and 4 near-still; BBQ shot 3 slow, shot 5 frozen then a lurch). Fix: scroll length per content (engine time maps and weights).
16. BBQ phones: gauge readout overlaps its ticks (bbq.css:229); SE "Cater it" clipped; 4 px right margin on the 15 Pro.
17. iPhone landscape notch: viewport-fit=cover with no safe-area insets.
18. a11y: invisible focusable links (wrap "Pick your color", BBQ pins and caption button); no arrow keys on radiogroups; aria-live announces the count-up; Hold has no pressed state; many targets under 44 px.
19. Design reads as a template across wrap, BBQ and Keyroom (loader, 6-shot film, HUD, perforated receipt, 4 numbered steps, "Before you book/order", giant footer line, fragment headlines, "Nothing else" x3); misleading H1 "Every panel, a new color."; BBQ embers float over indoor scenes (rule 15).
20. Wrap booking: no am/pm, no month, mentions tint when unchecked, no estimate carried (wrap.js:316-330).

## Nitpicks
171-character descriptions; canonical/og point to quvlo.co (404 today); no twitter:card, og:image:alt or dimensions; Quvlo favicon; OG images lack a concept label and wrap's shows the Porsche crest; "fictional business" twice in the wrap footer; flat finish surcharge, $3,900 low for a 911 colour change; Martian Mono not preloaded; "Sides $5 / $9" unexplained, "cambros" is a trademark; tooltip covers "THE STALL" on iPad; animation loops never stop, BBQ particles every frame.

## Fix order
Wrap: #6, #5, #4, #7, #13, then #8, #11 after the player rebuild. BBQ: #1, #2, #10, then #9, #12, re-encode desktop frames to ~100 KB, then #14-#16. Re-test on a real iPad in Safari.
