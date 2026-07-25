/**
 * WCAG 2.1 contrast audit for the ScrollStory step text (and its active-state
 * baseline), measured in a real Chrome against real computed styles.
 *
 * Zero dependencies: spawns Chrome headless, drives it over CDP with the
 * built-in fetch + global WebSocket (Node >= 22).
 *
 * Usage:
 *   npm run build && npm run preview     (terminal 1)
 *   node tools/contrast-audit.mjs        (terminal 2)
 *
 * NOTE: `vite preview` binds IPv6 [::1] only, so http://127.0.0.1:4173 refuses
 * the connection while http://localhost:4173 works. The harness therefore
 * probes several candidate origins and uses the first that answers. Do not
 * hardcode 127.0.0.1 here.
 *
 * Options (env):
 *   URL=http://localhost:5173/   force one origin (skips candidate probing)
 *   CHROME=<path to chrome.exe>  default: C:/Program Files/Google/Chrome/Application/chrome.exe
 *   PORT=9222                    devtools port
 *   JSON=1                       also dump raw JSON results
 *   REDUCED_MOTION=reduce        emulate prefers-reduced-motion: reduce.
 *                                Under `reduce` every step renders ACTIVE, so
 *                                no dimmed state exists and the precondition
 *                                assertion below deliberately fails (exit 2).
 *   PROBE_INJECT="<js>"          run JS in the page before probing. The
 *                                harness's own positive control, e.g.
 *                                PROBE_INJECT="document.querySelectorAll('#process [data-i] h3').forEach(n=>n.style.opacity=0.35)"
 *                                must drive those rows below 4.5:1.
 *
 * What it measures, per element:
 *   - getComputedStyle(el).color
 *   - the ACTUAL rendered background: walks the ancestor chain, composites every
 *     semi-transparent background layer, and multiplies in any ancestor
 *     opacity < 1 (an ancestor opacity dims the text itself, so the text colour
 *     is composited against the resolved background before the ratio is taken).
 *   - flags any ancestor filter/backdrop-filter/mix-blend-mode, which this model
 *     cannot composite arithmetically.
 *   - WCAG 2.1 relative luminance ratio (L1 + 0.05) / (L2 + 0.05).
 *   - the worst INTERPOLATED colour seen mid-transition (sampled every animation
 *     frame while the active step changes), not just the two settled endpoints.
 *
 * KNOWN LIMITATION, do not mistake this output for full coverage: the model
 * composites ANCESTORS only. It is blind to overlapping fixed/sticky SIBLINGS
 * that paint over the text. At 1440x900 the sticky SiteHeader
 * (bg-obsidian/70 + backdrop-blur-md, src/components/SiteHeader.tsx:34) can
 * cover a step number while this tool still reports the unoccluded ratio for
 * it. That is ordinary sticky-header occlusion, not a 1.4.3 failure, but any
 * element that can sit UNDER a translucent overlay needs a pixel-level check
 * (decode a screenshot), not this tool.
 */

import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CHROME =
  process.env.CHROME ??
  "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = Number(process.env.PORT ?? 9222);
const THRESHOLD = 4.5;
const REDUCED_MOTION = process.env.REDUCED_MOTION ?? "no-preference";

/* `vite preview` binds [::1]; `vite dev` binds otherwise. Try the lot. */
const CANDIDATE_URLS = process.env.URL
  ? [process.env.URL]
  : [
      "http://localhost:4173/",
      "http://127.0.0.1:4173/",
      "http://localhost:5173/",
      "http://127.0.0.1:5173/",
    ];

const VIEWPORTS = [
  { label: "1440x900", width: 1440, height: 900 },
  { label: "375x812", width: 375, height: 812 },
];

/* ---------------------------------------------------------------- CDP glue */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function resolveOrigin(urls, tries = 40) {
  for (let i = 0; i < tries; i++) {
    for (const url of urls) {
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(1500) });
        if (res.ok) return url;
      } catch {
        /* not this one */
      }
    }
    await sleep(250);
  }
  throw new Error(
    `no server answered on any of: ${urls.join(", ")} - run "npm run build && npm run preview" first`,
  );
}

class CDP {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    ws.addEventListener("message", (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(JSON.stringify(msg.error)));
        else resolve(msg.result);
      }
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
  }
  async eval(expression, awaitPromise = true) {
    const r = await this.send("Runtime.evaluate", {
      expression,
      awaitPromise,
      returnByValue: true,
    });
    if (r.exceptionDetails) {
      throw new Error(
        r.exceptionDetails.exception?.description ??
          JSON.stringify(r.exceptionDetails),
      );
    }
    return r.result.value;
  }
}

async function pickTarget(port) {
  for (let i = 0; i < 60; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      const page = list.find((t) => t.type === "page");
      if (page) return page;
    } catch {
      /* chrome not ready */
    }
    await sleep(250);
  }
  throw new Error("no chrome page target found");
}

async function connect(port) {
  const ws = new WebSocket((await pickTarget(port)).webSocketDebuggerUrl);
  await new Promise((res, rej) => {
    ws.addEventListener("open", res, { once: true });
    ws.addEventListener("error", rej, { once: true });
  });
  return new CDP(ws);
}

/* --------------------------------------------- the in-page probe (verbatim) */
/* Runs inside the page. Returns JSON-serialisable results. */
const PROBE = `(async () => {
  const raf = () => new Promise((r) => requestAnimationFrame(r));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  /* --- colour parsing -------------------------------------------------
     STRICT. A silent misparse in a contrast tool is the exact failure mode
     this harness exists to catch, so anything unrecognised THROWS rather
     than returning a plausible-looking wrong number. Chrome currently
     serialises computed colours as legacy rgb()/rgba(), but that is not
     guaranteed forever: color(srgb 0.1 0.2 0.3) would be wrong by a factor
     of 255 if it were waved through. */
  const alphaOf = (v) => (v.trim().endsWith("%") ? parseFloat(v) / 100 : parseFloat(v));
  const parse = (css) => {
    const s = String(css).trim();
    if (s === "transparent" || s === "none") return { r: 0, g: 0, b: 0, a: 0 };
    const m = /^rgba?\\(([^)]*)\\)$/i.exec(s);
    if (!m) throw new Error("unsupported colour format (extend parse()): " + css);
    const slash = m[1].split("/");
    if (slash.length > 2) throw new Error("unparseable colour: " + css);
    const nums = slash[0].trim().split(/[\\s,]+/).filter(Boolean);
    if (nums.length !== 3 && nums.length !== 4) throw new Error("unparseable colour: " + css);
    const chan = (v) => (v.endsWith("%") ? (parseFloat(v) * 255) / 100 : parseFloat(v));
    const c = {
      r: chan(nums[0]),
      g: chan(nums[1]),
      b: chan(nums[2]),
      a: slash.length === 2 ? alphaOf(slash[1]) : nums.length === 4 ? alphaOf(nums[3]) : 1,
    };
    for (const k of ["r", "g", "b"]) {
      if (!Number.isFinite(c[k]) || c[k] < 0 || c[k] > 255) {
        throw new Error("channel out of 0-255 range in: " + css);
      }
    }
    if (!Number.isFinite(c.a) || c.a < 0 || c.a > 1) {
      throw new Error("alpha out of 0-1 range in: " + css);
    }
    return c;
  };

  /* parser self-test, runs every time so a regression here is loud */
  const selftest = () => {
    const eq = (got, exp, label) => {
      for (const k of ["r", "g", "b", "a"]) {
        if (Math.abs(got[k] - exp[k]) > 0.01) {
          throw new Error("parser selftest failed (" + label + "): " + JSON.stringify(got));
        }
      }
    };
    eq(parse("rgb(138, 147, 160)"), { r: 138, g: 147, b: 160, a: 1 }, "legacy rgb");
    eq(parse("rgba(12, 15, 19, 0.6)"), { r: 12, g: 15, b: 19, a: 0.6 }, "legacy rgba");
    eq(parse("rgb(1 2 3 / 50%)"), { r: 1, g: 2, b: 3, a: 0.5 }, "modern slash alpha");
    eq(parse("rgb(100% 0% 50%)"), { r: 255, g: 0, b: 127.5, a: 1 }, "percent channels");
    eq(parse("transparent"), { r: 0, g: 0, b: 0, a: 0 }, "transparent");
    const rejects = ["color(srgb 0.1 0.2 0.3)", "oklch(0.7 0.1 60)", "lab(50 20 -30)", "rgb(300 0 0)"];
    let threw = 0;
    for (const bad of rejects) {
      try { parse(bad); } catch { threw++; }
    }
    if (threw !== rejects.length) {
      throw new Error("parser selftest failed: silently accepted an unsupported colour format");
    }
    return "parser selftest: 9 cases OK (5 parsed, 4 correctly rejected)";
  };
  const selftestResult = selftest();

  const over = (c, bg) => ({
    r: c.r * c.a + bg.r * (1 - c.a),
    g: c.g * c.a + bg.g * (1 - c.a),
    b: c.b * c.a + bg.b * (1 - c.a),
    a: 1,
  });
  const lum = (c) => {
    const f = (v) => {
      const s = v / 255;
      return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  };
  const ratio = (a, b) => {
    const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
    return (l1 + 0.05) / (l2 + 0.05);
  };
  const hex = (c) =>
    "#" + [c.r, c.g, c.b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");

  /* --- resolve the ACTUALLY RENDERED background (ancestors only) ------- */
  const resolveBg = (el) => {
    const chain = [];
    for (let n = el; n; n = n.parentElement) chain.unshift(n);
    const notes = [];
    let bg = { r: 255, g: 255, b: 255, a: 1 }; // canvas default before any paint
    let opacityChain = 1;
    for (const n of chain) {
      const s = getComputedStyle(n);
      const o = parseFloat(s.opacity);
      if (!Number.isNaN(o) && o < 1) {
        opacityChain *= o;
        notes.push(n.tagName.toLowerCase() + " opacity:" + o);
      }
      if (s.filter && s.filter !== "none") notes.push(n.tagName.toLowerCase() + " filter:" + s.filter);
      if (s.backdropFilter && s.backdropFilter !== "none") notes.push(n.tagName.toLowerCase() + " backdrop-filter");
      if (s.mixBlendMode && s.mixBlendMode !== "normal") notes.push(n.tagName.toLowerCase() + " blend:" + s.mixBlendMode);
      if (s.backgroundImage && s.backgroundImage !== "none") notes.push(n.tagName.toLowerCase() + " background-image");
      const c = parse(s.backgroundColor);
      if (c.a > 0) bg = over({ ...c, a: c.a * opacityChain }, bg);
    }
    return { bg, opacityChain, notes: [...new Set(notes)] };
  };

  const sample = (el, label) => {
    const cs = getComputedStyle(el);
    const { bg, opacityChain, notes } = resolveBg(el);
    const raw = parse(cs.color);
    const text = over({ ...raw, a: raw.a * opacityChain }, bg);
    const size = parseFloat(cs.fontSize);
    const weight = Number(cs.fontWeight) || 400;
    return {
      label,
      state: /text-ink-500/.test(el.className) ? "dimmed" : "active",
      color: cs.color,
      colorHex: hex(text),
      bgHex: hex(bg),
      fontPx: size,
      weight,
      largeText: size >= 24 || (size >= 18.66 && weight >= 700),
      opacityChain: Number(opacityChain.toFixed(4)),
      notes,
      ratio: Math.round(ratio(text, bg) * 100) / 100,
    };
  };

  /* --- targets --------------------------------------------------------- */
  const steps = [...document.querySelectorAll("#process [data-i]")];
  if (steps.length !== 3) throw new Error("expected 3 steps, found " + steps.length);
  const targets = [];
  steps.forEach((s, i) => {
    targets.push(
      { el: s.querySelector("span.font-mono") || s.querySelector("span"), label: "step " + (i + 1) + " number" },
      { el: s.querySelector("h3"), label: "step " + (i + 1) + " title" },
      { el: s.querySelector("p"), label: "step " + (i + 1) + " body" },
    );
  });
  if (targets.some((t) => !t.el)) throw new Error("a step is missing its number/title/body");

  /* --- drive the IntersectionObserver, sampling every frame ------------ */
  const results = [];
  const mid = new Map(); // label -> worst interpolated frame + distinct colours seen

  for (let target = 0; target < steps.length; target++) {
    const r = steps[target].getBoundingClientRect();
    const top = Math.max(0, window.scrollY + r.top + r.height / 2 - window.innerHeight / 2);
    window.scrollTo({ top, behavior: "instant" });

    // sample every animation frame across the 500ms transition window
    const bgs = targets.map((t) => resolveBg(t.el));
    const seen = targets.map(() => new Set());
    const t0 = performance.now();
    while (performance.now() - t0 < 800) {
      await raf();
      targets.forEach((t, i) => {
        const cs = getComputedStyle(t.el).color;
        seen[i].add(cs);
        const raw = parse(cs);
        const { bg, opacityChain } = bgs[i];
        const txt = over({ ...raw, a: raw.a * opacityChain }, bg);
        const rr = Math.round(ratio(txt, bg) * 100) / 100;
        const prev = mid.get(t.label);
        if (!prev || rr < prev.ratio) {
          mid.set(t.label, {
            label: t.label,
            ratio: rr,
            color: cs,
            bgHex: hex(bg),
            distinctColours: prev ? prev.distinctColours : 0,
          });
        }
      });
    }
    targets.forEach((t, i) => {
      const m = mid.get(t.label);
      m.distinctColours = Math.max(m.distinctColours ?? 0, seen[i].size);
    });

    // settled endpoint sample (IO callback + the 500ms transition, with margin)
    await sleep(400);
    for (const t of targets) results.push({ ...sample(t.el, t.label), scrolledTo: target + 1 });
  }

  return {
    selftest: selftestResult,
    reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
    innerWidth: window.innerWidth,
    tokenInk500: getComputedStyle(document.documentElement)
      .getPropertyValue("--color-ink-500")
      .trim(),
    results,
    midTransition: [...mid.values()],
  };
})()`;

/* ------------------------------------------------------- precondition gate */
/**
 * The audit is only meaningful if it actually observed the dimmed state. A run
 * that never produced a dimmed row (reduced motion, a stale selector, an
 * IntersectionObserver that never fired) would otherwise print a triumphant
 * ALL PASS while having measured nothing. Fail loudly instead: exit 2.
 */
function assertPreconditions(vpResult) {
  const where = `viewport ${vpResult.viewport}`;
  if (vpResult.reducedMotion) {
    throw new Error(
      `${where}: prefers-reduced-motion is 'reduce', which renders every step ACTIVE. ` +
        `The dimmed state under test does not exist in this mode, so the run proves nothing.`,
    );
  }
  const dimmed = vpResult.results.filter((r) => r.state === "dimmed");
  if (dimmed.length === 0) {
    throw new Error(
      `${where}: no element was ever sampled in its dimmed state. The observer never ` +
        `dimmed a step, or the selectors are stale. Nothing was measured.`,
    );
  }
  const token = (vpResult.tokenInk500 || "").toLowerCase();
  if (!/^#[0-9a-f]{6}$/.test(token)) {
    throw new Error(
      `${where}: could not read the --color-ink-500 token (got "${vpResult.tokenInk500}")`,
    );
  }
  const expected = [1, 3, 5].map((i) => parseInt(token.slice(i, i + 2), 16));
  const bad = dimmed.filter((r) => {
    const got = (r.color.match(/-?[\d.]+/g) || []).slice(0, 3).map(Number);
    return got.length !== 3 || got.some((v, i) => Math.abs(v - expected[i]) > 0.51);
  });
  if (bad.length) {
    throw new Error(
      `${where}: dimmed text colour ${bad[0].color} does not match the --color-ink-500 ` +
        `token ${token} (rgb ${expected.join(",")}). The harness is measuring something ` +
        `other than the dimmed state it claims to.`,
    );
  }
  return `${where}: precondition OK (${dimmed.length} dimmed samples, all equal to --color-ink-500 ${token})`;
}

/* ------------------------------------------------------------------- main */

const userDataDir = mkdtempSync(join(tmpdir(), "quvlo-cdp-"));
let chrome;

function cleanup() {
  try {
    chrome?.kill("SIGKILL");
  } catch {
    /* already gone */
  }
  try {
    rmSync(userDataDir, { recursive: true, force: true });
  } catch {
    /* windows file lock, harmless */
  }
}

try {
  const origin = await resolveOrigin(CANDIDATE_URLS);
  console.log(`target: ${origin}`);

  chrome = spawn(
    CHROME,
    [
      "--headless=new",
      `--remote-debugging-port=${PORT}`,
      `--user-data-dir=${userDataDir}`,
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-extensions",
      "--hide-scrollbars",
      "--force-device-scale-factor=1",
      "about:blank",
    ],
    { stdio: "ignore" },
  );

  const cdp = await connect(PORT);
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: REDUCED_MOTION }],
  });

  const all = [];
  for (const vp of VIEWPORTS) {
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: vp.width,
      height: vp.height,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await cdp.send("Page.navigate", { url: origin });
    await sleep(2500); // load, fonts, hydration, images
    if (process.env.PROBE_INJECT) await cdp.eval(process.env.PROBE_INJECT, false);
    all.push({ viewport: vp.label, ...(await cdp.eval(PROBE)) });
  }

  /* ---- gate FIRST, then report ---- */
  const gate = all.map(assertPreconditions); // throws -> exit 2
  console.log(all[0].selftest);
  gate.forEach((g) => console.log(g));

  let fails = 0;
  for (const vpResult of all) {
    console.log(`\n=== ${vpResult.viewport} (innerWidth ${vpResult.innerWidth}) ===`);
    const worst = new Map();
    for (const r of vpResult.results) {
      const key = `${r.label} [${r.state}]`;
      const prev = worst.get(key);
      if (!prev || r.ratio < prev.ratio) worst.set(key, r);
    }
    const rows = [...worst.values()].sort((a, b) =>
      `${a.label}${a.state}`.localeCompare(`${b.label}${b.state}`),
    );
    console.log(
      "element                  state    color                bg          ratio   4.5:1",
    );
    for (const r of rows) {
      const pass = r.ratio >= THRESHOLD;
      if (!pass) fails++;
      console.log(
        [
          r.label.padEnd(24),
          r.state.padEnd(8),
          r.color.padEnd(20),
          r.bgHex.padEnd(10),
          r.ratio.toFixed(2).padStart(7),
          pass ? "  PASS" : "  FAIL",
          r.notes.length ? `  notes: ${r.notes.join("; ")}` : "",
        ].join(" "),
      );
    }

    console.log("  -- worst INTERPOLATED colour seen mid-transition --");
    const midRows = [...vpResult.midTransition].sort((a, b) =>
      a.label.localeCompare(b.label),
    );
    for (const m of midRows) {
      const pass = m.ratio >= THRESHOLD;
      if (!pass) fails++;
      console.log(
        [
          ("  " + m.label).padEnd(24),
          "mid".padEnd(8),
          m.color.padEnd(20),
          m.bgHex.padEnd(10),
          m.ratio.toFixed(2).padStart(7),
          pass ? "  PASS" : "  FAIL",
          `  ${m.distinctColours} distinct colours sampled`,
        ].join(" "),
      );
    }
  }
  if (process.env.JSON) console.log("\n" + JSON.stringify(all, null, 2));
  console.log(
    `\n${fails === 0 ? "ALL PASS" : fails + " FAILING"} at the ${THRESHOLD}:1 threshold.`,
  );
  cleanup();
  process.exit(fails === 0 ? 0 : 1);
} catch (err) {
  console.error("audit failed (precondition or harness error):", err.message);
  cleanup();
  process.exit(2);
}
