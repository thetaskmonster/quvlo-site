# Keyroom: site audit (devices, motion, layout, copy)

Live page tested: https://claude-compassionate-thompso.quvlo.pages.dev/work/rental/ (byte-identical to `/home/user/quvlo-site/public/work/rental/`). Date: 2026-10-27.
Evidence folder: `/tmp/claude-0/-home-user/f1e55b73-3220-5c66-a5a2-f56661dd3103/scratchpad/keyroom/audit` (screenshots in `shots/<device>/`, contact sheets in `sheets/`, scripts in `scripts/`).

**Start here:** `/tmp/claude-0/-home-user/f1e55b73-3220-5c66-a5a2-f56661dd3103/scratchpad/keyroom/audit/sheets/00-top-issues.jpg`, a 9-panel sheet of the worst problems.

**What I could and couldn't test.** Only Chromium is installed (Playwright, no WebKit), so Safari-specific behaviour is emulated: iPad/iPhone viewports, DPR, touch, isMobile and a Safari user agent. Three things are inferred from the code plus a simulation rather than seen on a real device: the iOS toolbar collapse (svh vs lvh), Safari's image-memory limits and real decode speed. Headless Chromium has no GPU, so the long-task counts overstate real cost.

Viewports tested: iPad 1180x700 (Kyle's: landscape with Safari bars), 1180x820, 820x1180, 820x1106, 1366x1024; iPhone 15 Pro 393x659 and 393x780 (bars collapsed), iPhone 15 Pro landscape 734x343; iPhone SE 375x553 and 667x375; 320x568; desktop 1440x900 at 2x and 1920x1080.

## What passes (checked, no action needed)
- **Console and CSP:** no console errors, page errors, failed requests or CSP violations on any of the 13 viewports. The `_headers` CSP is respected.
- **Quote math:** correct in all 756 combinations (6 cars x 1-14 days x 3 delivery options x 3 cover options).
  - The total always equals round(1.1 x (rent + cover + delivery)), and the line items always add up to the total.
  - Deposit and included miles are right for every car.
- **Car sync:** quote, turntable and reserve form stay in sync (picking Bronco in the quote updates the key row, the name and `#rCar`).
- **Showroom pinning in Chromium:** the stage sits at top 0 through the whole range, with no jump on entry or exit. The car doesn't turn while the section scrolls in or out.
- **Contrast:** every text style measured passes, at 5.1:1 or better.
- **Key-row tap targets:** at least 46x71 px everywhere (46 px wide at 320).
- **No em dashes** anywhere in visitor copy.
- **Disclosures:** noindex in both the meta tag and the X-Robots-Tag header. Concept disclosures are in the title, the header pill, the reserve note and the footer. The footer also covers the fictional business, AI footage and trademarks.
- **Specs are plausible for 2025-26 models:**
  - Escalade 6.2 V8 420 hp, 55 in OLED, 22 in wheels
  - Tahoe High Country 6.2 V8 420 hp, 22 in
  - E 53 Hybrid 577 hp with boost, 0-60 in 3.7 s, 20 in
  - i5 eDrive40 335 hp RWD
  - Bronco 2.3 turbo 300 hp
  - Model Y dual motor, 19 in
  - Small caveats are in the nitpicks.

## Measurements

| Device | Film set | Spin set | Bytes before the first car swap | Loader opens | All film frames loaded* |
|---|---|---|---|---|---|
| iPad 1180x700 / 1180x820 / 1366x1024 | d 2240x1260, 240 frames | d 1280x716 | **24.7 MB** (film 21.4 + spin 3.2) | 1.4-3.5 s | 12.8-28 s |
| iPad portrait 820x1180 | **m** 1080x1920, 120 frames | **d** | 9.4 MB | 2.7-4.7 s | 11-16 s |
| iPhone 15 Pro / SE / 320 | m | m 720x576 | 7.9 MB | 1.8-2.3 s | 10-15 s |
| iPhone landscape 734x343 / 667x375 | **m** (portrait frames) | m | 7.9 MB | 1.9-4.6 s | 10-16 s |
| Desktop 1440 / 1920 | d | d | 24.7 MB | 2.1-3.0 s | 23-26 s |

\*Datacenter network. Raw throughput is not the limit: 40 frames arrive in under 1 s with parallel curl. The bottleneck is the site's own loader, which runs 4 serial workers that each await `decode()`.

- **Extra download per car opened:** +3.2-3.6 MB (desktop/iPad) or +1.6-1.9 MB (phone). Opening all six cars on iPad comes to about 41 MB.
- **Upscaling (canvas pixels ÷ source pixels):**
  - Film on iPad 1180x700: 1.11x
  - Film on 1366x1024: 1.63x
  - Film on iPad portrait (phone frames): 1.52x
  - Spin on iPad 1180x700: **1.96x**
  - Spin on 1440@2x: 2.25-2.5x
  - Spin on 1366@2x: **2.86x**
  - Spin on iPad portrait: **3.3x**
- **Decoded image memory, if everything stays decoded:**
  - iPad/desktop film set: 240 x 11.3 MB = **2.7 GB**. Each desktop spin car adds 264 MB.
  - Phone film set: about 1.0 GB, plus 119 MB per car.
  - `load()` calls `decode()` on every frame and keeps every `Image`. This is an iOS Safari tab-crash risk that I could not verify on a device.
- **Renderer RSS after a full pass (Chromium):** about 765-845 MB on iPad viewports and 666 MB on iPhone.
- **Long tasks while scrubbing a fully loaded film:** 216 long tasks (max 98-147 ms) on the iPad and 1366 viewports, against 1 on iPhone. They are compositor raster of the 2360-2732 px canvases (`drawImage` itself takes about 0.1 ms in JS). They are probably much lighter on a real iPad GPU, but they show how much the iPad path costs compared with the phone path.

---

## Issues, ranked by how noticeable they are to Kyle (iPad landscape first, then iPhone)

### 1. BLOCKER. Fast scrolling shows the wrong scene under the captions (all devices, worst on iPad)
- **Where:** the film, any scroll position past shot 0, during the first 5-20 s after the loader closes.
- **What:**
  - The loader closes after only 10 frames of shot 0 (`keyroom.js:52-56`). The rest load in strict index order (`:58-62`).
  - Meanwhile `nearestLoaded()` (`:76-80`) searches across shot boundaries, so it falls back to whatever loaded frame is closest, even from a different scene.
  - Scroll fast and you get the garage under "Wherever you land." or "Keys in hand.", then a jump to the right scene.
- **Measured** (fraction of animation frames showing a frame from the wrong shot / with a caption that doesn't match the footage):
  - iPad 1180x700, whole film in 4 s right after load: **73% / 64%** at 10 Mbps, **69% / 59%** unthrottled, **77%** at 50 Mbps.
  - Same, at a reading pace of 20 s for the whole film at 10 Mbps: still **71%** on iPad (only 174 of 240 frames loaded by the end), against 3.5% on iPhone.
  - iPhone 15 Pro, whole film in 4-6 s: **71% / 61%** at 10 Mbps, 62% at 25 Mbps.
  - Once every frame has loaded, it falls to 3-10%, and that remainder is only the deliberate smoothing lag.
  - Also caught unthrottled on iPhone, about 4 s after load: the city-street frame under "Keys in hand." (`/tmp/claude-0/-home-user/f1e55b73-3220-5c66-a5a2-f56661dd3103/scratchpad/keyroom/audit/shots/iphone15pro-tall/SIM-svh-gap-film.jpg`).
- **Evidence:**
  - `/tmp/claude-0/-home-user/f1e55b73-3220-5c66-a5a2-f56661dd3103/scratchpad/keyroom/audit/sheets/ipad-kyle-land-scrub10.jpg`
  - `/tmp/claude-0/-home-user/f1e55b73-3220-5c66-a5a2-f56661dd3103/scratchpad/keyroom/audit/shots/ipad-kyle-land/scrub-10mbps-4s/03-t2581.jpg` (garage under "Wherever you land."), `.../04-t3241.jpg` and `.../05-t3896.jpg` (cover reveal under "Keys in hand.")
  - `/tmp/claude-0/-home-user/f1e55b73-3220-5c66-a5a2-f56661dd3103/scratchpad/keyroom/audit/shots/*/scrub-*.json` (raw traces)
- **Fix:**
  1. Load coarse-to-fine across the **whole** film: every 8th frame of all 6 shots before the loader closes (30 frames), then every 4th, then fill the rest. Order the fill by distance from the current scroll position, not by index.
  2. Restrict `nearestLoaded` to the same shot (`Math.floor(i/PER)`). If nothing in the shot is loaded, keep the last good frame and hold the caption off.
  3. Drop the per-image `await decode()` from the critical path, or run 6-8 workers.
  4. Serve iPad landscape a lighter set (see #7). 21 MB is the root of the iPad gap.

### 2. BLOCKER. Changing car turns the lights off for 3-6.5 s, and quick taps show the wrong car under the label (all devices)
- **Where:** showroom key row.
- **What:**
  - `select()` awaits `sets[id].ready` (`keyroom.js:232-234`). That promise only resolves after **all 72** views have loaded and decoded (`:137-138`). The "every 4th view first" ordering never helps.
  - Isolated swap after the film had fully loaded: lights down for **3.2 s (Tahoe) and 6.5 s (Model Y)** on iPad 1180x700 with an unthrottled network, 3.6 s at 50 Mbps, and 3.0-6.3 s on iPhone. iPhone at 10 Mbps took **7.9 s**.
  - The name and price change instantly, so for those seconds the label says "Tahoe High Country" over a dimmed Escalade.
  - **Race:** tap Bronco, then E 53, then i5 within 250 ms. Every `select()` runs `go()` when its own set finishes, so nothing cancels the earlier ones.
    - The turntable then showed Tahoe with the lights **up** while the label read "BMW i5". It was followed by Bronco, then E 53, then finally i5, about 10.8 s after the tap.
    - On iPhone at 10 Mbps it stayed dark for 10 s, then cycled through Tahoe, Bronco and E 53 before reaching i5.
    - Arrow keys on the key row hit the same race.
- **Evidence:**
  - `/tmp/claude-0/-home-user/f1e55b73-3220-5c66-a5a2-f56661dd3103/scratchpad/keyroom/audit/sheets/ipad-show-swap.jpg`
  - `/tmp/claude-0/-home-user/f1e55b73-3220-5c66-a5a2-f56661dd3103/scratchpad/keyroom/audit/shots/ipad-kyle-land/show-0mbps/swap1-2-t1486.jpg`
  - `/tmp/claude-0/-home-user/f1e55b73-3220-5c66-a5a2-f56661dd3103/scratchpad/keyroom/audit/shots/ipad-kyle-land/show-0mbps.json` and `/tmp/claude-0/-home-user/f1e55b73-3220-5c66-a5a2-f56661dd3103/scratchpad/keyroom/audit/shots/iphone15pro/show-10mbps.json` (the `quick.timeline` field)
- **Fix:**
  1. Resolve a separate "coarse" promise after the first 18 views and swap on that.
  2. Add a request token (`const token = ++selSeq`) and have `go()` bail out if `token !== selSeq`.
  3. Change the name and price inside `go()`, not before it.
  4. Prefetch the other five cars' coarse 18 views (about 0.8 MB each on desktop) once the film has finished loading.
  5. Cap the dark period at about 600 ms with a visible "bringing it round" state, or crossfade.

### 3. BLOCKER on iPad portrait. The showroom shows only the doors, and the film is soft phone footage
- **Where:** iPad 820x1180 / 820x1106, film and showroom. This also hits Kyle whenever he rotates the iPad (see #11).
- **What:**
  - **Spin:**
    - The spin picks its frame set by width only (`kindS = innerWidth < 760`, `keyroom.js:132`), so a portrait iPad gets the 16:9 desktop frames. These are cover-fitted into a portrait canvas (`:200`), which shows only the middle 39% of the frame at a **3.3x** upscale.
    - The car never fits: at side views you see the doors only.
    - Wheel callouts render off-screen at x = 870-1005 px on an 820 px viewport (the overflow check in `shots/ipad-port/tour.json`).
    - The turn arrows sit on the car body.
  - **Film:** `pick()` (`:43`) sends portrait iPads the 9:16 phone crops, upscaled 1.52x, with visible blocking. The car is cut on both sides in shots 3 and 5.
- **Evidence:**
  - `/tmp/claude-0/-home-user/f1e55b73-3220-5c66-a5a2-f56661dd3103/scratchpad/keyroom/audit/sheets/ipad-port-rest.jpg`
  - `/tmp/claude-0/-home-user/f1e55b73-3220-5c66-a5a2-f56661dd3103/scratchpad/keyroom/audit/sheets/ipad-port-film.jpg`
  - `/tmp/claude-0/-home-user/f1e55b73-3220-5c66-a5a2-f56661dd3103/scratchpad/keyroom/audit/sheets/ipad-port-f136-crop100.jpg` (softness at 100%)
- **Fix:**
  - Use one shared device-class function for film and spin.
  - On portrait tablets, draw the spin with a contain-fit (the phone code path, `:191-199`) using the desktop frames.
  - Give portrait tablets either a 3:4 film crop set or the desktop set with a softer cover (anchor the crop on the subject and allow letterboxing).

### 4. BLOCKER on iPhone landscape. The film becomes unreadable close-ups, and the showroom car sits under the key row
- **Where:** iPhone 15 Pro landscape (734x343) and SE landscape (667x375).
- **What:**
  - `pick()` returns `'m'` for any width under 760 (`keyroom.js:43`), so landscape phones get **portrait** frames cover-fitted into a letterbox strip. The result is a steering wheel, a grille, a fuselage. The story is gone.
  - The showroom uses the phone layout in landscape: the car is a giant crop behind the name, and the key row covers it.
  - The "Concept site" pill disappears against bright frames.
- **Evidence:** `/tmp/claude-0/-home-user/f1e55b73-3220-5c66-a5a2-f56661dd3103/scratchpad/keyroom/audit/sheets/iphone15pro-land-film.jpg`, `/tmp/claude-0/-home-user/f1e55b73-3220-5c66-a5a2-f56661dd3103/scratchpad/keyroom/audit/sheets/iphone15pro-land-rest.jpg`, `/tmp/claude-0/-home-user/f1e55b73-3220-5c66-a5a2-f56661dd3103/scratchpad/keyroom/audit/sheets/iphonese-land-film.jpg`
- **Fix:**
  - Decide by aspect ratio, not width: landscape gets `'d'` (or a mid-size 1280 px desktop set).
  - Lay the showroom out by orientation: in landscape the key row goes in a side column or a single compact row, and the info block shrinks.

### 5. NOTICEABLE (high). Spec callouts point at the wrong parts, slide off them as the car turns, and collide on iPhone
- **Where:** showroom, at every callout angle. Measured by drawing the code's own anchor maths on the source frames.
- **Wrong part at the exact angle:**
  - Escalade "55 in Curved OLED display": the dot is on the **roof**, above the windshield.
  - Escalade "7 seats" and Tahoe "7 seats": both dots are on the **licence plate**.
  - Bronco "Removable roof and doors": the dot is on the **spare wheel**.
  - Tahoe "22 in Wheels": the dot is about 25 px to the right of the tyre, on the bumper.
  - The rest land correctly: hubs, hoods and grilles.
- **Drift:**
  - Callouts stay on for ±15° (`keyroom.js:163-164`), but each anchor is one fixed point. By ±10-15° the Bronco tyre dot is on the floor, the Model Y wheel dot is below the arch and the Escalade wheel dot is on the rim edge.
  - Kyle's iPad at the p=0.125 scroll position catches the Escalade wheel dot already on the rim.
- **Collisions:**
  - The Escalade has two callouts at the same angle (340°, `spin.json`).
  - On phones the second card flips downward (`:176`) and lands on the first one's card, and the two leader lines cross in an X. This shows on iPhone 15 Pro, SE and 320.
  - On iPad 1180x700 the two cards cover the windshield and grille: the car's face.
- **Evidence:**
  - `/tmp/claude-0/-home-user/f1e55b73-3220-5c66-a5a2-f56661dd3103/scratchpad/keyroom/audit/sheets/callouts-anchor-zoom.jpg`
  - `/tmp/claude-0/-home-user/f1e55b73-3220-5c66-a5a2-f56661dd3103/scratchpad/keyroom/audit/sheets/callouts-source-annotated.jpg`
  - `/tmp/claude-0/-home-user/f1e55b73-3220-5c66-a5a2-f56661dd3103/scratchpad/keyroom/audit/sheets/callouts-drift-window.jpg`
  - `/tmp/claude-0/-home-user/f1e55b73-3220-5c66-a5a2-f56661dd3103/scratchpad/keyroom/audit/shots/iphone15pro/39-show-p0.94.jpg`
  - `/tmp/claude-0/-home-user/f1e55b73-3220-5c66-a5a2-f56661dd3103/scratchpad/keyroom/audit/sheets/phones-showroom.jpg`
  - `/tmp/claude-0/-home-user/f1e55b73-3220-5c66-a5a2-f56661dd3103/scratchpad/keyroom/audit/shots/ipad-kyle-land/39-show-p0.94.jpg`
- **Fix:**
  1. Store anchors per view (5° steps, interpolated) or at least for deg-10, deg and deg+10, and narrow the window to ±8°.
  2. Re-anchor the four wrong ones:
     - Seats: the third-row side glass, at a side angle.
     - OLED: through the windshield on the dash (about y 0.31 at 340°), or drop it from the exterior turn.
     - Bronco roof: the roof line at a 3/4 rear angle.
     - Tahoe wheel: the hub.
  3. Never show two callouts at once on phones. Stagger them by 20°.
  4. Lay the cards out in a fixed rail (top-right) with leaders, rather than letting them float over the car.

### 6. NOTICEABLE (high). Scrolling the driving shots shows double exposures, then snaps sharp
- **Where:** film, any shot with motion, worst in shot 3 (city drive) and the end of shot 5. Phones are worse.
- **What:**
  - While scrolling, `draw()` paints frame i0, then i1 at alpha k (`keyroom.js:96`). Every displayed image is a double exposure: two Cadillac crests, doubled headlights.
  - When the scroll settles, `:286` rounds to a whole frame, so the image visibly **snaps** sharp.
  - On phones the stride is 2, so the blend is across frames 2 apart, which doubles the ghost distance.
  - This is a big part of why "the driving" looks off.
- **Evidence:** `/tmp/claude-0/-home-user/f1e55b73-3220-5c66-a5a2-f56661dd3103/scratchpad/keyroom/audit/sheets/crossfade-ghosting.jpg` (pairs of single vs blended frames: shot 5 phone, shot 3 phone, shot 5 desktop).
- **Fix:** don't blend frames that contain motion. Draw the nearest whole frame (`Math.round`). If you want smoothness, add frames (stride 1 on phones; the phone set is only 6 MB) rather than blending.

### 7. NOTICEABLE (high). The motion pacing is uneven: the car lurches, freezes, then shoots away
- **Where:** film shots 3, 4 and 5, on all devices.
- **What:** every shot gets exactly 40 frames per 100vh of scroll (`keyroom.js:88`, `frames.json per:40`), whatever the footage is doing. Measured frame-to-frame change:
  - **Shot 3 (driving):** motion jumps **2.5x** at frame 139 (from 2.9 to about 7.5 per step), so the same thumb movement suddenly moves the car more than twice as far.
  - **Shot 4:** frames 194-198 are nearly frozen.
  - **Shot 5:** the last 8 frames (231-238) move **4x** the shot's median, so the car lunges away in the final 20vh of scroll.
  - **Shot 0 (lights):** almost static (median 0.8), yet it gets the same scroll budget as the drive.
  - **Phones:** the per-frame crop pans multiply motion. In shot 4 the crop sweeps from 0.46 to 0.15 of the width in 40 frames, nearly **3x** the motion of the desktop shot, and shot 1 gets 1.6x.
- **Evidence:** the per-shot medians and spikes are in this report (method: `scripts/` plus the frame diffs run in the audit), and `/tmp/claude-0/-home-user/f1e55b73-3220-5c66-a5a2-f56661dd3103/scratchpad/keyroom/audit/sheets/iphone15pro-film.jpg` (frames 162-190).
- **Fix:**
  - Time-remap each shot to constant on-screen motion (equalise by optical flow, or drop or duplicate frames).
  - Give each shot a scroll length in proportion to its content rather than 100vh each.
  - Smooth the phone crop paths (`m.crop`) and cap them at about 0.003 of the width per frame.
  - Pass this to the footage reviewer too.

### 8. NOTICEABLE. The rev counter means nothing, and it redlines a parked Escalade
- **Where:** film, bottom right (bottom on phones).
- **What:**
  - rpm is a function of scroll only: 800 + 6800·t² (`keyroom.js:110`).
  - It climbs while the car is under a cover (1,120 rpm), while it is parked with the doors open (6,150-6,870 rpm, in red as the passenger boards) and on a car that is already stopped.
  - It reaches 7,600 rpm. A 6.2 V8 Escalade redlines around 6,000.
  - This breaks CLAUDE.md rule 15 ("Motion must mean something"), and no premium chauffeur or rental brand would show its car on the limiter beside a client.
- **Evidence:** `/tmp/claude-0/-home-user/f1e55b73-3220-5c66-a5a2-f56661dd3103/scratchpad/keyroom/audit/shots/iphone15pro/27-film-f212.jpg`, `/tmp/claude-0/-home-user/f1e55b73-3220-5c66-a5a2-f56661dd3103/scratchpad/keyroom/audit/shots/ipad-kyle-land/09-film-f52.jpg`
- **Fix:** remove it, or drive it from a per-frame engine state: off while covered, an idle blip at start-up (shot 2), cruising rpm in shot 3, idle at the jet, a modest rise as the car pulls away, and redline under about 6,000.

### 9. NOTICEABLE. Captions cover the action
- **Where and what:**
  - On iPad 1180x700, "Uncovered for you." sits directly over the gloved hands that are pulling the cover, which is the whole point of shot 1 (`keyroom.css:68`, bottom-left placement).
  - On phones every caption sits at bottom 52px (`:203`). "Keys in hand." and its "See the cars" button cover the Escalade's front end in shot 5.
  - At 4:3 (1366x1024) the captions orphan: "Uncovered for / you." and "Wherever you / land." (`.cap max-width: 520px`).
- **Evidence:** `/tmp/claude-0/-home-user/f1e55b73-3220-5c66-a5a2-f56661dd3103/scratchpad/keyroom/audit/shots/ipad-kyle-land/09-film-f52.jpg`, `/tmp/claude-0/-home-user/f1e55b73-3220-5c66-a5a2-f56661dd3103/scratchpad/keyroom/audit/shots/iphone15pro/27-film-f212.jpg`, `/tmp/claude-0/-home-user/f1e55b73-3220-5c66-a5a2-f56661dd3103/scratchpad/keyroom/audit/sheets/ipad-1366-film.jpg`
- **Fix:**
  - Place captions per shot: shot 1 top-left over the wall, and the jet shots already use top placement.
  - On phones, move the shot 5 caption to the top (where the sky is).
  - Use `text-wrap: balance` with a max-width in `ch`.

### 10. NOTICEABLE. The phone crops lose the story
- **Where:** iPhone portrait film.
- **What:**
  - **Shot 0:** the garage looks empty, because the covered cars are cropped to slivers at the edges.
  - **Shot 1:** the chauffeur's hands are cropped out, so the cover appears to lift itself.
  - **Shot 4:** opens on the jet only, and the car enters half off the left edge (frame 180).
  - **Shot 5:** the traveller is partly cut off at the right edge.
- **Evidence:** `/tmp/claude-0/-home-user/f1e55b73-3220-5c66-a5a2-f56661dd3103/scratchpad/keyroom/audit/sheets/iphone15pro-keyframes.jpg`, `/tmp/claude-0/-home-user/f1e55b73-3220-5c66-a5a2-f56661dd3103/scratchpad/keyroom/audit/sheets/iphone15pro-film.jpg`
- **Fix:** re-path `m.crop` so it holds the hands in shot 1 and the car's entry in shot 4, or accept partial letterboxing so the key action stays in frame.

### 11. NOTICEABLE. Rotating or resizing reloads the whole page
- **What:**
  - `size()` calls `location.reload()` whenever `pick()` changes (`keyroom.js:72`).
  - Rotating Kyle's iPad from landscape to portrait triggered a full reload: the loader shows again and the portrait set (6 MB) downloads on top of the 21 MB already fetched.
  - Split View, Stage Manager and dragging a desktop window across 760 px do the same.
  - Scroll position was restored by number, but the page heights differ, so you land somewhere else in the story.
- **Fix:** swap frame sets in place. Keep both arrays, draw from whichever has the nearest loaded frame, and load the new set coarse-first without reloading.

### 12. NOTICEABLE. Showroom layout on Kyle's iPad (1180x700) and desktop
- **What:**
  - On a short landscape viewport the car fills the height. The info block (name 66px, price, "Price this car" pill, `keyroom.css:97-99`) then sits **on the car**: the button lands on the rear pillar in side views.
  - The turn arrows (vertically centred, right, `:101`) crowd or overlap the nose, sitting right beside the "22 in" card.
  - "Tahoe High Country" wraps to 2 lines on iPad, pushing everything further onto the car.
  - At 1440x900 "Cadillac Escalade" wraps to 2 lines (`max-width: 520px` against an 80px font) and overlaps the roof in rear 3/4 views.
  - At 1366x1024 (4:3) cover-fit crops the car at every side view.
- **Evidence:** `/tmp/claude-0/-home-user/f1e55b73-3220-5c66-a5a2-f56661dd3103/scratchpad/keyroom/audit/shots/ipad-kyle-land/32-show-p0.125.jpg`, `/tmp/claude-0/-home-user/f1e55b73-3220-5c66-a5a2-f56661dd3103/scratchpad/keyroom/audit/sheets/desk-1440-rest.jpg`, `/tmp/claude-0/-home-user/f1e55b73-3220-5c66-a5a2-f56661dd3103/scratchpad/keyroom/audit/sheets/ipad-1366-rest.jpg`, `/tmp/claude-0/-home-user/f1e55b73-3220-5c66-a5a2-f56661dd3103/scratchpad/keyroom/audit/sheets/ipad-show-swap.jpg`
- **Fix:**
  - Size the car with contain-fit (plus a margin) inside the area left between the info block and the key row, rather than cover-fitting the whole stage.
  - Widen `.show__info`, or cap the name with `clamp()` tied to viewport height.
  - Move the arrows down beside the key row.

### 13. NOTICEABLE. The showroom photos are soft on every iPad and Retina screen
- **What:**
  - The spin frames are 1280x716 and get cover-fitted into a 2x canvas: 1.96x upscale on 1180x700, 2.86x on 1366x1024, 2.25-2.5x on a 1440 Retina screen.
  - The result is visibly mushy next to the crisp type, for example the 100% view of `/tmp/claude-0/-home-user/f1e55b73-3220-5c66-a5a2-f56661dd3103/scratchpad/keyroom/audit/shots/ipad-kyle-land/39-show-p0.94.jpg`.
  - The film on 1366x1024 is 1.63x upscaled.
- **Fix:**
  - Ship a 1920-2048 px spin set for tablets and desktops at quality around 70 (about +60% bytes), but only load it after the coarse set.
  - Alternatively, contain-fit smaller, which also fixes #12.

### 14. NOTICEABLE. The story contradicts the brand promise and the product
- **"Ready before you land."** (h1) against shot 4, where the traveller is already standing on the apron when the car pulls in (frames 160-190). The car is late.
- **"Keys in hand."** against shot 5, where a driver opens the rear door, the traveller gets in the back and is driven away.
  - That is a chauffeur service, but the rest of the site sells self-drive rental: "25 or older, full licence", miles included, deposit, "Hand it back… we collect it".
  - Pick one. Either change the footage or caption (for example "Your car, your keys" with the traveller taking the driver's seat), or reposition the brand.
- **"Set your way. Full charge…"** (`index.html:53`) over a V8 Escalade's cabin. Use "Full tank".
- **Evidence:** `/tmp/claude-0/-home-user/f1e55b73-3220-5c66-a5a2-f56661dd3103/scratchpad/keyroom/audit/sheets/story-shots45.jpg`, `/tmp/claude-0/-home-user/f1e55b73-3220-5c66-a5a2-f56661dd3103/scratchpad/keyroom/audit/shots/iphone15pro/27-film-f212.jpg`

### 15. NOTICEABLE. The quote copy says things the quote doesn't do
- `"Deposit, miles and insurance included."` (`index.html:101`): the deposit is **not** in the total. It is a separate hold. Suggested: "Delivery, cover, tax and miles in one number. The refundable deposit is shown separately."
- "Your own policy" shows **"Included"** as its price (`keyroom.js:313`). Nothing is included; the customer brings their own. Use "$0, your policy".
- "Estimated tax and fees (10%)" folds unnamed "fees" into a section that sells "every cost up front". Either name them or drop "fees".

### 16. NOTICEABLE on iPhone (inferred from code plus a simulation). The 100svh stage leaves a dark band when Safari's bars collapse, and the frame jumps when they move
- **What:**
  - The sections are sized in `vh` (lvh on iOS: `.film` 700vh and `.show` 340vh), but the sticky stages are `100svh` (`keyroom.css:62,92`).
  - When Safari collapses its toolbar on scroll, the viewport grows to lvh while the stage stays at svh. That leaves a strip of about 80-100 px of bare background under the film and under the key row.
  - `filmProgress()` and `showProgress()` divide by `innerHeight`, which changes as the bars move. That gives a progress jump of about 1.7%: 2-4 frames, plus a few degrees on the turntable.
- **Evidence:** `/tmp/claude-0/-home-user/f1e55b73-3220-5c66-a5a2-f56661dd3103/scratchpad/keyroom/audit/sheets/SIM-iphone-svh-gap.jpg` (labelled SIMULATION: viewport 780, stage forced to 680).
- **Fix:**
  - Use `height: 100lvh` (or 100dvh) on the stages, and compute progress against a cached `document.documentElement.clientHeight`, or against `stage.offsetHeight` measured once per orientation.
  - Verify on a real iPhone.

### 17. NOTICEABLE. Empty space and small car on tall phones
- **What:**
  - On iPhone 15 Pro with the bars collapsed (393x780), the car is drawn at a fixed 1.16x width, centred at 53% (`keyroom.js:194`). That leaves a dead band of about 120 px between the turntable and the key row, plus a dark band above the car. The Pro Max will be worse.
  - On SE the key labels wrap ("AMG E / 53"). On 320 "Model / Y" wraps, and so do the header pill and the "Get a quote" button.
- **Evidence:** `/tmp/claude-0/-home-user/f1e55b73-3220-5c66-a5a2-f56661dd3103/scratchpad/keyroom/audit/sheets/phones-showroom.jpg`, `/tmp/claude-0/-home-user/f1e55b73-3220-5c66-a5a2-f56661dd3103/scratchpad/keyroom/audit/sheets/iphone15pro-tall-rest.jpg`
- **Fix:**
  - Scale the car to the free height between `.show__info` and `.keyrow` (bounded by width), and centre it in that gap.
  - Use shorter key labels: "E 53", "i5", "Model Y" with `white-space: nowrap`.

### 18. NOTICEABLE. Reduced motion is only half honoured
- **What:**
  - With `prefers-reduced-motion`, the film is still a 700vh full-screen scrub of driving footage. That is the vestibular trigger the setting exists to avoid.
  - The showroom swap skips the dim, so the old car stays fully visible under the new name ("Ford Bronco") for 3.0-3.7 s.
- **Fix:**
  - Under reduced motion, show one still per shot as a stacked sequence (no scrub), and drop the 700vh height.
  - In `select()`, keep the label change until `go()`.

### 19. NOTICEABLE. Drag, momentum, buttons and keyboard on the turntable
- **What:**
  - **Momentum after a pause:** `vel` isn't decayed when the finger stops (`keyroom.js:218-224`). Drag, hold for 400 ms and release: the car still flung **85°** on iPhone and 25° on iPad.
  - **Buttons and arrow keys** jump 30° (6 views) in one frame, with no easing (`:226`). The button measured 61 → 67 within 30 ms.
  - **The stage is focusable** (`tabindex=0`, `:250`) but has no role, label or instructions. A screen reader reads the whole stage's text, and nothing says the arrow keys turn the car.
- **Fix:**
  - Zero `vel` on pointerup if more than 80 ms has passed since the last move.
  - Animate `nudge` towards a target angle with the same easing as momentum.
  - Give the stage `role="group"`, `aria-roledescription="360° viewer"` and `aria-label="Turn the car with the left and right arrow keys"`.

### 20. NOTICEABLE. Keyboard and form accessibility
- **What:**
  - **Invisible link in the tab order:** the hidden "See the cars" link in caption 5 stays focusable while it's invisible (opacity 0 at the top of the page). It is the 3rd tab stop.
  - **Errors aren't tied to fields:** there is no `aria-invalid` and no `aria-describedby`, and focus isn't moved to the first problem.
  - **Field highlighting misses custom rules:** a 1-character name, a 2-digit phone, "a@b" or a past date all pass `:invalid`, so no field turns red, yet the message lists all five.
  - **The message misreads input:** it says "Please add your name" when a name *was* typed. It also lacks an "and": "…, a start date from today on, where to meet you."
  - **No minimum date:** the date input has no `min`.
- **Evidence:** `/tmp/claude-0/-home-user/f1e55b73-3220-5c66-a5a2-f56661dd3103/scratchpad/keyroom/audit/shots/iphonese/misc-form-bad.jpg`, `/tmp/claude-0/-home-user/f1e55b73-3220-5c66-a5a2-f56661dd3103/scratchpad/keyroom/audit/shots/iphonese/misc.json` (`tabTrail`, `form`)
- **Fix:**
  - Add `inert` (or `tabindex=-1`) to captions that are off.
  - Use `setCustomValidity` per field so `:invalid` matches the rules, set `aria-invalid` and per-field hint text, focus the first invalid field, and set `min` to today on the date.
  - Rewrite the message, for example: "Check your name, mobile, email, start date (today or later) and where to meet you."

### 21. NOTICEABLE (design polish). Things that read as templated
- **Heading formula:** every heading is a clipped fragment with a full stop: "Lights on." "Uncovered for you." "Set your way." "Keys in hand." "The whole price. Up front." "No counter. No shuttle." "Questions." "Reserve." That is 12 in a row. It's a recognisable AI/template cadence. On phones the last word orphans ("Up / front.", "No / shuttle.").
- **Ragged left edges:** FAQ and Reserve sit in a centred 820px column (`.wrap--narrow`, `keyroom.css:37`), so their headings start at x=227 on iPad while Quote and How start at x=47.
- **Key-fob thumbnails:** all six photos have a **white paper corner** in the top right. They are rectangular photo tiles, not cut-outs (`/tmp/claude-0/-home-user/f1e55b73-3220-5c66-a5a2-f56661dd3103/scratchpad/keyroom/audit/sheets/keys.jpg`).
- **Fix:**
  - Vary the headline grammar, and keep the full stops for one or two lines.
  - Use one left edge for every section.
  - Re-crop the fobs on a transparent or matched background.

### 22. NOTICEABLE (copy locale). British spellings on a US-dollar, mph, EPA site
- "full **licence**" (`index.html:168`). "Full licence" is also a UK concept; in the US it would be a full (unrestricted) driver's license.
- "6.2-**litre**", "2.3-**litre**" and "All-terrain **tyres**" (`spin.json`).
- **Fix:** use US English: license, liter or "6.2L", tires.

---

## Nitpicks
- **Tap targets under 44 px:**
  - Header "Get a quote" is 38 px tall on every device (`.btn--sm`, `keyroom.css:41`).
  - "Price this car" is 42 px on phones (`:214`).
  - The days slider is 28 px.
  - The footer links are 17 px.
- **"Lights on."** appears at frame 19, after the lights have finished coming on (frames 6-12). Frames 15-18 show neither the hero nor a caption (`keyroom.js:104,107`).
- **Car names are inconsistent:**
  - Showroom: "Cadillac Escalade" / "Tahoe High Country" / "AMG E 53 Hybrid".
  - Key row: "BMW i5" is the only label that includes the make.
  - Quote: "Chevrolet Tahoe High Country" / "Ford Bronco 4-door".
  - Pick one pattern.
- **Flight number:** the placeholder `N123KR` is an aircraft tail number. Label the field "Flight or tail number".
- **FAQ uses "fuel"** for the deposit deductions, but two of the six cars are EVs. Use "fuel or charge".
- **Footer:** "Keyroom is a fictional business" appears twice (`index.html:207-208`).
- **Spec fine print:** the i5's 295 mi EPA figure is for the smaller wheels; the callout pairs it with 20 in wheels. Say "Up to 295 mi". Model Y Long Range AWD is 327 mi EPA; "320 mi" is fine as "about".
- **Head tags:**
  - The meta description is 236 characters (truncates around 155).
  - `canonical` and `og:image` point at quvlo.co/work/rental/, which 404s until production is deployed, so a preview-link share shows no image. Expected, but note it.
  - There is no `twitter:card`, no `og:image:width/height` and no `og:image:alt`.
  - The favicon is Quvlo's, not Keyroom's.
- **Screen-reader noise:** `aria-live` on the receipt re-announces the whole receipt on every slider step. Announce only the total, debounced.
- **Battery:** the rAF loop never stops, and does 4-6 `getBoundingClientRect` calls per frame plus a `querySelector('.show__info')` per callout render (`keyroom.js:157-161, 280-292`). Idle the loop when nothing is in view or changing.
- **Duplicate field name:** `name="where"` is used in both forms (harmless today).
- **iOS date input:** an empty `type=date` renders blank with no placeholder on iOS Safari (couldn't verify in Chromium).
- **Edge case:** if frames.json fails to load, the loader opens onto a black page with no message (`keyroom.js:48`).

## Overall verdict
**Not ready to show a client on an iPad or iPhone.** The parts built from code are sound:
- the quote engine is correct in every combination
- the CSP is clean
- contrast and tap targets mostly pass
- the disclosures are thorough

The motion Kyle flagged is genuinely broken, for reasons in the code rather than only in the footage:
- frames from other scenes appear while loading (#1)
- double-exposure blending and uneven per-shot timing make the drive lurch (#6, #7)
- the car swap goes dark for 3-6 s and can show the wrong car (#2)
- the callouts point at licence plates and roofs and collide on phones (#5)

Portrait iPad and landscape iPhone each get the wrong frame set (#3, #4), and rotating reloads the page (#11). The rev counter contradicts rule 15 (#8), and the film's story contradicts both the headline and the product (#14).

**Fix order:**
1. #1, #2, #6 and #3/#4/#11 (loading, swapping, blending and device-class selection: mostly `keyroom.js`)
2. #5 and #7 (anchors and re-timing)
3. #8, #9, #12-#17 (layout)
4. The copy items

Then re-test on a real iPad in Safari for the svh, memory and decode questions this environment couldn't answer.
