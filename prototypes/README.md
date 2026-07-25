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

---

## Agent Teardown — cinematic 3D hero (concept v0.2)

`agent-teardown-hero.html` — the committed direction: **Cinematic 3D (Igloo)** art
direction + the **Agent Teardown** concept.

- Thesis: "Can an AI actually use your website?" By 2027 the customer is often an
  agent booking on someone's behalf. The semantics that make a site usable by a
  screen reader are the same ones that make it usable by an AI agent. So the scan
  sends an agent to attempt a real task (book an appointment) and narrates where it
  fails, then scores **Human-ready** and **Agent-ready**.
- Visual: deep-space ground, a metallic 3D object rendered with a hand-written
  WebGL raymarch shader (no external libraries, stays self-contained), restrained
  champagne-platinum palette. Deliberately not the near-black + one-accent AI look.
- Accessible by design: labelled input, `aria-live` transcript, visible focus,
  full `prefers-reduced-motion` fallback (static object, instant transcript).
- Prototype scan is scripted. Production wires the real agent + audit engine
  server-side (headless browser + axe-core + an LLM agent loop, orchestrated in n8n).

---

## Full site — cinematic concept v0.3

`agent-teardown-site.html` — the full scrolling site, not just the hero.
Sections: agent-teardown hero, who we are (operator story), services (web +
compliance lead, automation/AI secondary per Kyle 2026-07-24), concept work
(labelled Concept), honest thesis ("run the teardown on us", no fabricated
score), pricing (Landing $1,500 / Business $3,000 / Care $150-$650), final CTA.
Scroll-reactive WebGL object + IntersectionObserver section reveals, sticky nav.
Accessible by design throughout. Scan is scripted; production wires the real
agent + audit engine server-side.
