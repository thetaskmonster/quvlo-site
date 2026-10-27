# HVAC and cleaning: device audit (independent reviewer, 2026-10-27)

HVAC: not ready for Kyle's iPad or iPhone. Cleaning: closer, fine on desktop, not ready on iPad. Evidence: scratchpad/audit/devices-hvac-cleaning/ (start with sheets/00-top-issues.jpg; may not survive the session). Line numbers refer to the deployed build (copy in live/).

## Old player problems: all four apply (HVAC 70-71% wrong-scene frames on a fast scroll after load at 25 Mbps; cleaning 36%; double exposure; reload on rotate; wrong frame sets), plus the svh band and reduced motion. NOTE: HVAC overlays follow scroll position, not the drawn frame, so the engine must report the frame drawn and drive overlays from it.

## Passes
HVAC estimator (27 combos) and cleaning estimator (480) correct; hotspots, thermal slider, 3D drag, wipe hero (mouse, touch sideways swipe, "Do it for me"), room tabs and both booking flows work and say nothing was sent; cleaning has a clean tab order and no console errors; no sideways scroll; disclosures complete; noindex; no testimonials, no em dashes; one H1, canonical, OG.

## Measurements
HVAC iPad 50.3 MB (10.7 MB before first view; loader 2.9 s fast / 15.7 s at 25 Mbps), iPhone 25.1 MB. Cleaning iPad 39.9 MB, iPhone 18.5 MB (starts downloading at once; Safari's bar ~18 s). Decoded if all kept: ~3.5 GB iPad, ~2.0 GB iPhone.

## Issues
1. BLOCKER HVAC: Book and fast scrolling show the wrong scene with "Cool by dinner." on top; a "73°" thermostat floats over the old-unit scene; hotspots pinned onto the old unit (hvac.js:114-118, 140, 141, 228-274, 279-303, 331-336). Fix: overlays from the drawn frame; load dusk frames first on Book; better, booking as its own section after Pricing.
2. BLOCKER HVAC iPhone: hotspot cards print over the headline and slide under the HUD (hvac.js:256-266; hvac.css:248). Fix: one card at a time in a bottom sheet; check HUD and caption every pass.
3. HVAC: the hidden "Turn it around in 3D" link catches taps through the whole film (jumps ~6,000-7,500 px) and is an invisible tab stop (hvac.css:100, 102). Fix: visibility:hidden or inert.
4. HVAC times contradict (3:52 vs HUD 4:21; "Out by half past four." at 5:07; 5:20 caption at 6:05-6:21; timeline 4:05 vs 3:52) (hvac.js:17, 289; index.html:55). Fix: hold the clock per caption.
5. HVAC iPhone landscape: HUD over the H1, booking taller than the screen, portrait crops (hvac.css:242-257). Fix: landscape-phone layout.
6. HVAC iPhone: the giant "104°" reads "04°" (behind the HUD, clipped; missing in landscape; measured before the font stretch; canvas font-stretch may be unsupported in Safari) (hvac.js:144-173). Works on iPad.
7. HVAC iPhone crops drop the capacitor hotspot, line set and thermostat until frame 195. Fix: re-path phone crops.
8. HVAC keyboard: 7 invisible hotspots, 1 invisible link and 11 off-screen booking controls in the tab order; focusing booking shifts the stage 401 px (hvac.css:72, 113, 126). Fix: overflow:clip; inert.
9. HVAC booking: Pricing/footer Book jumps ~8,000 px up into the film; ignores the estimate; offers "Today" past slots, pre-selects "Today 1-3 pm" at 9 pm; "10-12" lacks am/pm; Sundays skipped vs FAQ (hvac.js:340, 352-362, 355; hvac.css:255, 257).
10. HVAC copy: "$189 flat, parts and labor" vs FAQ "trip and diagnosis"; New system "$0" (show "Free"); a whole unit replaced over a $12 capacitor against the FAQ's own rule; 104 -> 72° in 70 min is implausible (~20°F design delta; end ~78° or "cooling by dinner"); "AC & heating" with no heating service; "Pinch or scroll" on touch; the dog moved.
11. Cleaning iPad: the 300x330 "Today's visit" card covers the cleaner, kitchen and bed (cleaning.css:116). Fix: compact pill or a slim row at <= 820 px height.
12. Cleaning times contradict and the "four hours" claim (film 8:30-1:40, clock to 1:55) (cleaning.js:101, 199, 256; index.html:81-86).
13. HVAC 3D: auto-downloads 4.6 MB (hvac.js:464); the CSP blocks a WebAssembly part (console error; needs 'wasm-unsafe-eval' site-wide or accept); the wheel zooms instead of scrolling; the model doesn't match the film unit. Fix: load on tap; disable zoom.
14. Cleaning iPhone: the checklist pill lags a scene behind (cleaning.js:249-255; index.html:70-75).
15. Cleaning wipe photos don't register (tiles differ, bowl moves, clean +32% brighter). Fix: make the clean photo from the messy one.
16. Cleaning wipe on iPhone hard to finish (6 swipes -> 73% of the 85% needed; only part of the brush counts); "100%" collides with the ring; the wipe area near the edge may trigger Safari back (cleaning.js:62, 135; cleaning.css:228-229).
17. Cleaning step 2 copy contradicts the booking promise (index.html:180 vs 192). Fix: "The same two vetted cleaners every visit. You get their names before the first one."
18. Cleaning "30 seconds" clock declares victory after 2.6 s, then freezes; sits in a live region (cleaning.js:309, 317-323; index.html:130).
19. HVAC service-row photos are mouse-only (never on iPad or iPhone), clip 123 px at 1440, rows look clickable but aren't (hvac.js:424, 430).
20. Cleaning iPhone landscape: no headline on the first screen; portrait crops (cleaning.css:223-225).
21. Cleaning kitchen footage AI smears and ghosts (42-62), the dust blast, "The grout counts." over squeegeeing glass.
22. HVAC buttons fail AA (white on #ff6a13 2.87:1, on #2e9be6 3.02:1; small labels 2.45-2.72:1) (hvac.css:45, 141, 219). Fix: #c2410c, #1a6aa8.
23. Cleaning small green labels and chips 3.8:1 (cleaning.css:40). Fix: #3f6b59.
24. HVAC iPhone: the total is below the options. Fix: a sticky total bar.
25. Performance and iOS (engine targets most; consider 1600-1920 px iPad frames; HVAC loop never stops).
26. Reduced motion still scrubs both films.
27. Templated: fragment headings ("Cool by dinner." x4); cleaning's "Plain words, italic green tail" formula, Fraunces (AI-default font), "Like nobody lives here." twice; FAQ column misaligned on both; the same golden retriever on both sites.
28. HVAC iPad: captions on the units; the timeline crowds the cards.

## Nitpicks
Tap targets (32 px dots, 40/42 px header buttons); thermal slider 1% steps (step="5"), iOS thumb-only drag; cards auto-open vs "Tap the dots"; logo shrinks to "Norther"; booking days scroll with no hint, "Sat 31" cut on SE; live regions read count-ups; cleaning estimator "per visit" on Once, $189 HTML default vs $207, move-out listed under How often, oven/fridge charged on a deep clean, no studio option; % meter read every step; "30 seconds" vs "thirty seconds"; long titles and descriptions, no twitter:card or og:image:alt, canonical/OG point to quvlo.co (the HVAC image 404s), Quvlo favicon; "colour" in code comments; the thermal window shows cool while it's 104° outside.

## Fix order
HVAC: #1 (with the engine), #2, #3, #8, then #4, #6, #7, then #9, #10, then #5, #13, rest. Cleaning: engine, #11, #12, #14, then #15, #16, then #17, #18, then #21, contrast. Re-test on a real iPad in Safari.
