# Cinematic Instrument — hero prototype

Concept v0.1 of a redesigned Quvlo homepage hero: the **Instant Teardown**.
Visitor pastes a URL, watches a cinematic scan, gets an accessibility +
performance scorecard, and is invited to the free full teardown.

- `cinematic-instrument-hero.html` — self-contained, open it directly in a browser.
- Design: obsidian + tungsten amber, monospace telemetry, additive scanner
  reticle (augments the system cursor, never hides it).
- Accessible by design: real label + button, `aria-live` results, visible
  focus, full `prefers-reduced-motion` fallback (no scan, instant results,
  cursor off). That is the product thesis: beautiful AND provably compliant.
- Scorecard data here is an illustrative sample. The production version wires
  the real audit engine (the script used on the DFW prospect batch) server-side.

Not wired into the live site. Prototype only.
