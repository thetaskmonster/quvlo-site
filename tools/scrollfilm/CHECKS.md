# Checks: built into every build, verified after every build

Kyle's rule (2026-10-27): the checks are part of the instructions given to whoever builds, and the work is
checked again by someone else after it's built. Nothing reaches the preview or Kyle until both have passed.
This came from the October audit (docs/audits/2026-10-27/): every scroll site had motion that wasn't real,
and the builders' own QA had passed all of it.

## The flow
1. **Plan, approved by Kyle** (PLAYBOOK.md step 1), with his references found and compared first.
2. **Build brief.** Every instruction to a builder includes:
   - the relevant checks below, copied in as the acceptance criteria;
   - the devices and networks to test;
   - the evidence to hand back (contact sheets, measured numbers, file paths).
   A brief without checks is not a complete brief.
3. **Builder self-check.** The builder runs every check and reports the numbers. This is necessary but never
   sufficient.
4. **Independent review.** A fresh reviewer who did not build it, with no stake in it passing, using the
   templates in `review/`:
   - `review/footage.md`: every frame, measured motion and physics;
   - `review/devices.md`: the live or locally served site on every device;
   - `review/change.md`: for a change to existing code, which proves the fix and hunts regressions old vs new.
   Reviewers never edit the work; they report.
5. **Fix, then re-review.** Fixes go back to the builder. The same reviewer's scripts are re-run on the fixed
   build. Repeat until it passes.
6. **Push to the preview, then Kyle checks on his iPhone and iPad.** Only now is it shown to him.
7. **Record.** Lessons go into PLAYBOOK.md's table. Reports go into docs/audits/<date>/ so they survive the
   session.

## Acceptance criteria

### Footage (every clip, every frame, before it's used)
- **Physics:**
  - things move only when something moves them, in the right direction, at a believable speed;
  - wheels turn at road speed and stay planted, with no sideways sliding or scale pops;
  - feet planted; hands touch and grip what they act on;
  - doors, lids, cloth, water, smoke, steam and fire behave as they really do;
  - light switches on as real fixtures do (by circuit, not one by one at random).
- **Smoothness, measured:**
  - optical flow per frame;
  - no jumps or surges over 1.4x their neighbours;
  - no stalls or reversals and no dead holds longer than 10% of a shot;
  - exact integer source steps or a measured time map;
  - no dissolves that ghost.
- **Accuracy:**
  - real products match current official photos front, side and rear;
  - no garbled badges or text, no readable plates.
- **Continuity:** the same people, props, building, time of day and weather across shots; nothing appears or
  vanishes.
- **People:** avoid them. If unavoidable: faces turned away, no morphing, no identity changes.
- **Phone, iPad portrait and landscape crops** keep the subject and the action.
- **Avoid in prompts** what AI video fails at: cloth, hands doing tasks, people interacting with objects or each
  other, doors, impacts, full rotations, vehicles turning.
- **Prefer** what it does well: light changes, slow camera moves, locked-camera time-lapses, simple straight
  motion.

### Site (every device, every feature)
- **Devices:**
  - iPhone 15 Pro portrait 393x659 (Safari bars) and landscape 734x343;
  - iPhone SE 375x553;
  - iPad 1180x700 (Kyle's, landscape with tab bar), 1180x820 and 820x1180;
  - 1366x1024, 1440x900 and 1920x1080;
  - touch emulated.
- **Networks:** unthrottled, 25 Mbps and 10 Mbps; scroll fast right after load.
- **Film:**
  - 0 wrong-scene frames and 0 double exposures;
  - overlays (captions, hotspots, clocks, gauges) match the frame actually drawn;
  - jump links land correctly;
  - rotating never reloads and keeps the position;
  - the right frame set per device;
  - no band when Safari's toolbar collapses;
  - reduced motion shows stills;
  - bounded memory (decoded frames well under 500 MB).
- **Layout:**
  - captions never cover the subject or the action;
  - no overlaps, clipped text or orphans;
  - fixed bars never cover content;
  - landscape phone layouts exist.
- **Interactions:**
  - every control works by touch, mouse and keyboard;
  - every calculator is tested exhaustively across its options;
  - no races (tap fast, swap fast);
  - hidden things are not focusable or tappable;
  - forms say plainly that nothing is sent on a concept.
- **Copy:**
  - numbers, times and prices agree everywhere on the page and with the footage;
  - real-world claims are true (laws, trade practice, product facts);
  - no em dashes, US spelling, no testimonials;
  - concept and AI disclosures present.
- **Accessibility:**
  - AA contrast (4.5:1 text, 3:1 large text and UI);
  - focus visible;
  - 44 px tap targets;
  - no live regions announcing animations.
- **Quality:**
  - 0 console and CSP errors;
  - `node --check` and oxlint clean;
  - loader under ~5 s at 25 Mbps on iPad.
- **Design:**
  - no AI-default tells (CLAUDE.md rule 14);
  - no shared skeleton or reused headline formula across sites;
  - motion means something (rule 15).
- **Head:** one H1, unique title and description, canonical, OG image with alt, noindex on concepts.
- **Security** (CLAUDE.md rules 1-8): no secrets in front-end code, inputs escaped, no unused endpoints
  deployed.
