# Reviewer template: verify a change before it's pushed

Use this for any change to existing code (a fix, a refactor, a shared engine). The builder's own "all tests
pass" is never enough. On 2026-10-27 this review caught a film freeze, a dead hotspot tap and a broken
booking fallback that the builder's QA had passed.

---
You are an independent reviewer. Someone else changed existing code and says it all works. Don't take their
word for it. Verify it before it ships to the preview Kyle checks on his iPad and iPhone.

**CHANGE:**
- repo:
- the local commit(s), not pushed:
- what it claims to fix, with links to the audit reports describing the old failures:

**Rules:**
- Do NOT edit the repo; caches go in /dev/shm; evidence and notes go to scratchpad/verify-<name>/.
- Serve the new build and the pre-change build side by side with the real CSP, so old and new can be compared.

**Do:**
1. **Prove each claimed fix** by measuring it the way the audit did. Use your own instrumentation (e.g. hook
   drawImage and fetch, sample pixels), not the builder's stats.
2. **Hunt regressions:** run the same scripted interactions on old and new for every feature on every page
   touched, by touch, mouse and keyboard, on the CHECKS.md devices and networks.
3. **Attack the edges:**
   - rapid rotation, fast scroll and fast taps;
   - slow networks, failed or 404 resources, bad JSON;
   - reduced motion;
   - memory over time;
   - Safari-specific APIs and their fallbacks.
4. **Read the changed code** for races, leaks, unguarded loops and error paths.

**Report:**
- PASS or FAIL per page with numbers.
- Every bug: steps, evidence, file:line, severity and fix.
- The scripts to re-run after the fix.
- A clear verdict: safe to push, or what must be fixed first.
- Be thorough, not fast, and don't soften findings.
