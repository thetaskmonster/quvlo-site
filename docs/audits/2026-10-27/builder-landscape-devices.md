# Builder and landscape: device audit (independent reviewer, 2026-10-27)

Both not ready. Evidence: scratchpad/audit/devices-builder-landscape/ (start with sheets/00-top-issues.jpg; may not survive the session). Line numbers refer to the deployed files (builder.js local = deployed - 71; landscape.js local = deployed - 75 after line 147).

## Old player problems: all four apply to both (cross-scene frames, double exposure, reload on rotate, wrong frame set), plus the iOS toolbar gap. Covered by the new film engine.

## Measurements
Builder iPad 46.5 MB, loader 8-10 s, all frames 60-70 s; iPhone 23 MB, once 69 s to open (the loader waits on 40 frames with no timeout). Landscape iPad 72.4 MB, 55-104 s; iPhone 20.7 MB. Decoded memory if all kept: builder 3.5 GB, landscape 2.7 GB on iPad (tab-crash risk). Zero console or CSP errors.

## Passes
Builder estimator (558 combos) and landscape estimator (6,912) maths correct; plan square footage adds up; blueprint aligned on desktop and iPad landscape; mowing stripes look real; keyboard, touch and no page scroll while playing in portrait; forms send nothing and never inject input; no dashes, no fake testimonials, US spelling; SEO and disclosures in place.

## Issues (ranked for Kyle's iPad, then iPhone)
1. BLOCKER builder: room photos blank 2.4-4.1 s per tap and race to the wrong room (builder.js:380-386). Fix: token, cross-fade, preload the 6 photos at high priority, pause film workers on the plans.
2. BLOCKER landscape: "Show me" then Start = instant 0:00 win stored forever as best (landscape.js:339-383, 282, 301-302). Fix: always fresh lawn, ignore runs under 5 s, treat best <= 0 as empty.
3. BLOCKER both, iPhone landscape (734 px): captions hit the header and run off the top; portrait frames used (builder.css:98-107, 279-283; landscape.css:76). Fix: max-height compact layout; frame set by aspect.
4. Builder: captions cover the house on iPad; blueprint runs through the text on iPhone (builder.css:75, 98-107). Fix: captions to the top third, mask the blueprint, text-wrap: balance.
5. Builder: day numbers contradict the counter (DAY 270 over 261, etc.); the dry-in caption over bare studs (index.html:69-89 vs builder.js:192). Fix: drop the day from captions or hold the counter; start the dry-in caption at frame 148.
6. Landscape: hero kicker ~1.2:1 contrast on the white farmhouse (landscape.css:72).
7. Landscape: the Day 3 caption covers the compost blower; one fixed caption position (landscape.css:76). Fix: per-shot placement.
8. Landscape: 4 days in copy vs 8-9 in the estimator; mowing $55 vs $45 vs $65 flash; $0 job possible; "real number before we show up" vs "fixed price after walk-through" (landscape.js:583-586; index.html:151, 160, 205).
9. Landscape: mowing sod the day it's laid (wait ~2 weeks); the watering FAQ is wrong for new sod; Day 3 copy order vs footage (index.html:81-83, 229).
10. Builder: 270 vs 265 vs 255 days; FAQ 8-11 months vs estimator 200-300 days; the lot answer never changes the number (builder.js:25, 432; index.html:137, 167, 184-186, 218).
11. Builder: same room photos for every plan contradict the specs; the porch photo is a rear loggia labelled "Front porch" (builder.js:296-303).
12. Landscape game scoring: pattern switch mid-run; Esc doesn't stop the clock; dt cap vs wall clock; straightness not scored; crew turn time impossible; edging gives no feedback (landscape.js:411, 482-485, 521-529).
13. Landscape iPhone: the game traps the screen in landscape; score half off-screen; finger hides the mower; no touch stop (landscape.css:109-112).
14. Builder iPhone: unlabelled plan rooms; details land 500 px below; porch target 26-30 px; plan doesn't fit in landscape (builder.css:292).
15. Both: too heavy for iPad (new engine: iPad set, coarse-first, decode window).
16. Both a11y: invisible links in tab order (builder index.html:92; landscape :84); builder pink contrast 3.5:1 and 3.06:1 (builder.css:39, 63, 158, 203); reduced motion still scrubs; live regions announce counting; no arrow keys on chips; arrows drive the mower when the radios have focus; no aria-invalid; <nav> misused.
17. Landscape: "Concept site" pill hidden on phones (landscape.css:62).
18. Builder: 1- and 2-year warranty bars equal length (builder.css:214).
19. Both: templated headings (clipped fragments), "Lights on" reused across 4 sites, stock lines, orphans; iPhone SE header button wraps.
20. Builder: blueprint labels ~7-9 px on iPad (builder.css:79-80).

## Nitpicks
Long titles and descriptions; no og:image:alt or twitter:card on landscape; canonical and OG point to quvlo.co where the image 404s; Quvlo favicon; sub-44 px targets; stale plan hint; loader doesn't lock scroll; black steel windows at this price; 65-day framing-to-dry-in; rain FAQ wording; the Show-me overlay hides the stripes; Day 4 workload; animation loops never stop.
