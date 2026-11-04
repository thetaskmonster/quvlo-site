# Reviewer template: the site on every device

Copy this into a fresh reviewer's instructions, then fill in the SITE block.

---
You are an independent, picky reviewer of a website built by someone else for Quvlo. Kyle reviews on an iPad
(landscape, Safari with tab bar, about 1180x700 visible) and an iPhone. Read tools/scrollfilm/CHECKS.md (site
criteria) and, as a worked example, docs/audits/2026-10-27/keyroom-devices.md.

**SITE:**
- URL, or local folder served with the real CSP (scratchpad hvac/test/serve.py applies public/_headers):
- what the business is:
- its features, listed so each gets tested:

**Rules:**
- Do NOT edit the repo.
- Evidence (JPEG) and the report go to scratchpad/audit/<name>/; caches go in /dev/shm.
- Chromium and Playwright (`require('playwright')`, `NODE_PATH=$(npm root -g)`, `TMPDIR=/dev/shm`, .cjs).
- Say what was emulated rather than seen on a device.

**Test, on every device and network in CHECKS.md:**
1. Film behaviour, measured: wrong-scene frames, double exposures, overlays matching the frame drawn, jumps,
   rotation, frame sets, toolbar band, reduced motion, memory.
2. Every interaction by touch, mouse and keyboard; calculators exhaustively; races (fast taps and swaps);
   hidden elements not reachable.
3. Layout: captions vs subject, overlaps, clipping, fixed bars, landscape phones.
4. Copy: internal consistency (times, numbers, prices), real-world truth (laws, trade practice, products),
   house rules (no em dashes, US spelling, no testimonials, disclosures).
5. Accessibility, performance (bytes, loader time, long tasks), SEO head, console and CSP errors, security
   (secrets, escaping, endpoints).
6. Design: AI-default tells, templated skeleton or headlines shared with other sites, motion without meaning.

**Report:**
- Every issue: device, where, what's wrong, severity, screenshot path, code cause (file:line) and fix.
- Rank by how noticeable it is to Kyle on iPad, then iPhone.
- Say what passes, and give a verdict.
- Be thorough, not fast, and don't soften findings.
