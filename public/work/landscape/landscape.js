/* Caliche & Clover Landscapes (concept by Quvlo). Scroll position is the job: the footage, the
   day tracker and the tallies all read from the frame actually drawn. Below it, a mowing game where
   stripes come from the direction the blades lay the grass. No libraries. */
(() => {
  'use strict';
  // Bump when any film frame changes, so browsers fetch the new frames instead of cached ones.
  const FV = '2026102813';   // also the ?v= on landscape.css, film-engine.js and landscape.js in index.html
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const ease = k => k * k * (3 - 2 * k);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fmtTime = s => { s = Math.max(0, Math.round(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

  /* =========================================================== Film */
  const PER = 40, SHOTS = 6;
  // Real frames per shot. Must match "lens" in frames.json: shots 2 and 4 are shorter than 40 frames.
  const LENS = [40, 21, 40, 39, 40, 40];
  const film = $('#film'), stage = $('.film__stage'), canvas = $('#filmCanvas');
  const loader = $('#loader'), loadPct = $('#loadPct'), loadBar = $('#loadBar');
  const bar = $('.bar'), hero = $('#hero'), track = $('#track'), trackCut = $('#trackCut');
  const caps = $$('.cap'), days = $$('.track__days li'), clock = $('#clock');
  const tallies = caps.map(c => $('.tally', c));

  let opened = false;
  function openLoader() {
    if (opened) return; opened = true;
    document.body.classList.remove('is-loading');
    loader.classList.add('is-open');
  }

  // Last shot's clock: 4:30 pm to 7:10 pm, handover at dusk
  const clockText = m => { const h = Math.floor(m / 60), mm = Math.round(m % 60); return `${h % 12 || 12}:${String(mm).padStart(2, '0')} pm`; };

  // The stage counts as on screen while most of it is in view. Once the film has scrolled away, no caption
  // stays "on", so its link can't be tabbed to off screen (the engine makes hidden captions inert).
  const stageOn = () => { const r = stage.getBoundingClientRect(); return r.bottom > innerHeight * 0.6 && r.top < innerHeight * 0.4; };

  let lastF = 0, lastShot = 0, engine = null;
  const shotAtScroll = () => {
    if (!engine || !engine.meta) return lastShot;
    const len = Math.max(1, film.offsetHeight - stage.offsetHeight), p = clamp(-film.getBoundingClientRect().top / len);
    return Math.min(SHOTS - 1, Math.floor(engine.frameAt(p) / PER));
  };
  // offOnly: called from scroll, where the frame on screen hasn't caught up yet; it may hide captions, never show them
  function ui(f, shotIn, offOnly) {
    lastF = f;
    const shot = shotIn == null ? Math.min(SHOTS - 1, Math.floor(f / PER)) : shotIn;
    lastShot = shot;
    const local = clamp((f - shot * PER) / Math.max(1, LENS[shot] - 1));
    // a caption shows only while the scroll position is in the same shot as the picture on screen: after a
    // jump (Home, a link), the old picture can hold for a frame or two and its caption must not come with it
    const onScreen = stageOn() && shotAtScroll() === shot;
    hero.classList.toggle('is-off', shot > 0 || local > 0.55);
    track.classList.toggle('is-hidden', shot === 0 && local < 0.6);
    caps.forEach((cap, n) => {
      const s = +cap.dataset.shot;
      // data-early: on from the shot's first frame (Day 1 on phones covers the top band of its picture)
      const on = onScreen && (s === SHOTS - 1 ? shot === s && local > 0.22 : shot === s && (cap.hasAttribute('data-early') || local > 0.06) && local < 0.94);
      if (!offOnly) cap.classList.toggle('is-on', on); else if (!on) cap.classList.remove('is-on');
      const t = tallies[n];
      if (!t) return;
      const from = +t.dataset.from, to = +t.dataset.to, sep = !!t.dataset.sep;
      // The tally runs with the work in the footage; with reduced motion each shot is a still, so it shows the total
      let v = from;
      if (shot > s || (shot === s && reduce)) v = to;
      else if (shot === s) v = lerp(from, to, ease(clamp((local - 0.08) / 0.8)));
      const r = sep ? Math.round(v / 50) * 50 : Math.round(v);
      const txt = sep ? r.toLocaleString('en-US') : String(r);
      if (t.textContent !== txt) t.textContent = txt;
    });
    days.forEach(li => {
      const s = +li.dataset.shot;
      li.classList.toggle('is-now', s === shot);
      li.classList.toggle('is-done', s < shot);
      if (s === shot) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
    });
    trackCut.style.width = (clamp((shot + local) / SHOTS) * 100).toFixed(2) + '%';
    if (shot === SHOTS - 1) clock.textContent = clockText(lerp(16 * 60 + 30, 19 * 60 + 10, reduce ? 1 : local));
  }

  engine = window.FilmEngine.create({
    section: film, stage, canvas, FV, range: [0.01, 0.92], rate: 8, mStride: 2,
    bandY: 0.22,   // portrait tablets: the picture band sits high, so the captions fit below it
    lift: '.cap, .hero, .track',
    overlays: { '.cap': 'is-on' },
    onGate: k => { const p = Math.round(k * 100); loadPct.textContent = String(p); loadBar.style.width = p + '%'; },
    onReady: openLoader,
    onFrame: v => ui(v.f, v.shot),
  });
  setTimeout(openLoader, 9000); // never trap a visitor behind the loader on a very slow connection
  const onScroll = () => {
    bar.classList.toggle('is-solid', film.getBoundingClientRect().bottom < 70);
    ui(lastF, lastShot, true);   // the stage may have scrolled away under a held frame: hide, never show
  };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  onScroll();

  /* =========================================================== Mow it yourself */
  const BW = 1920, BH = 1080;          // board image size
  const SS = 0.5;                       // stripe layer scale
  const DECK = 72;                      // cutting width, board px
  const VMAX = 430, ACC = 1100, TURN = 2.7;
  const STRAIGHT_MIN = 75;              // % of the cut lawn striped along the guides for a run to count
  const AWAY = (() => { const x = 0.38, y = -1, l = Math.hypot(x, y); return [x / l, y / l]; })(); // "away from the viewer"
  const PATTERNS = { straight: [0], diagonal: [Math.PI / 4], checker: [0, Math.PI / 2], diamond: [Math.PI / 4, -Math.PI / 4] };

  const board = $('#board'), mc = $('#mowCanvas'), mctx = mc.getContext('2d');
  const startBox = $('#mowStart'), goBtn = $('#mowGo'), showBtn = $('#mowShow'), resetBtn = $('#mowReset'), stopBtn = $('#mowStop');
  const sCov = $('#sCov'), sStr = $('#sStr'), sTime = $('#sTime'), doneEl = $('#mowDone'), bestEl = $('#best'), crewLine = $('#crewLine');
  const hudCov = $('#hudCov'), hudTime = $('#hudTime'), hudMsg = $('#hudMsg');

  const lawnImg = new Image(), maskImg = new Image();
  // One stripe layer per pass direction, so a cross-cut (checkerboard, diamond) keeps both passes.
  const mkLayer = () => { const c = document.createElement('canvas'); c.width = BW * SS; c.height = BH * SS; return c; };
  const layers = [mkLayer(), mkLayer()];
  const lctx = layers.map(c => c.getContext('2d'));
  const stripe = layers[0];
  const guide = document.createElement('canvas'); guide.width = BW * SS; guide.height = BH * SS;
  const gctx = guide.getContext('2d');
  let maskData = null;                   // Uint8 alpha at stripe scale
  const CELL = 16, GW = Math.ceil(BW / CELL), GH = Math.ceil(BH / CELL);
  let lawnCell = null, cut = null, lawnTotal = 0, cutCount = 0;
  let ready = false, playing = false, auto = null, boardVisible = false, gameDirty = true;
  let pattern = 'diagonal';
  const mower = { x: 960, y: 900, a: 0, v: 0 };
  // tNow is mowing time: it only runs while you are driving (paused, hidden or tabbed away, it stops),
  // and it advances by the same capped step the mower moves by, so the clock and the mower always agree.
  let started = false, tNow = 0, finished = false, demo = false;
  // Straight lines are scored from the stripes left on the lawn: every cell remembers whether the last pass
  // over it ran along a guide line (within 15 degrees, judged over the last 0.3 s of travel so a wiggle can't
  // fake it). Passes made while swinging round (more than 25 degrees of turn in 0.6 s) never overwrite a cell
  // that is already cut, the way a U-turn at the end of a row doesn't spoil the row, and grass first cut in a
  // turn isn't scored until a straight pass goes over it. Up to 15% of the lawn may stay unscored like that
  // (the turning strips at the ends of the rows); past that, unscored grass counts as not straight, so
  // driving in circles can't dodge the score.
  // The headland, the strip within 1.5 deck widths of the edging, is where every row ends and the mower swings
  // round, often in a gentle arc: there a pass off the guides never spoils a cell and isn't scored either.
  let okCount = 0, scored = 0, okCell = null, headland = null;   // okCell: 0 off the guides, 1 along them, 2 unscored
  const trail = [];
  const ALIGN = Math.cos(15 * Math.PI / 180);
  const keys = new Set();
  let pointer = null;
  let view = { s: 1, x: 0, y: 0 }, mcw = 0, mch = 0, mdpr = 1;
  let crewSecs = 0, minSecs = 5, msgT = 0;

  const maskAt = (x, y) => {
    if (!maskData) return 0;
    const ix = Math.round(x * SS), iy = Math.round(y * SS);
    if (ix < 0 || iy < 0 || ix >= stripe.width || iy >= stripe.height) return 0;
    return maskData[iy * stripe.width + ix];
  };

  function freshLawn() {
    lctx.forEach(c => {
      c.globalCompositeOperation = 'source-over';
      c.clearRect(0, 0, stripe.width, stripe.height);
      c.fillStyle = 'rgb(128,128,128)';
      c.fillRect(0, 0, stripe.width, stripe.height);
      c.globalCompositeOperation = 'destination-in';
      c.drawImage(maskImg, 0, 0, stripe.width, stripe.height);
    });
    cut = new Uint8Array(GW * GH); cutCount = 0;
    okCell = new Uint8Array(GW * GH); okCount = 0; scored = 0; trail.length = 0; started = false; tNow = 0; finished = false; demo = false;
    mower.x = 960; mower.y = 905; mower.a = 0; mower.v = 0;
    doneEl.classList.remove('is-on'); doneEl.textContent = '';
    gameDirty = true;
    syncStart();
    score(true);
  }

  function buildGuide() {
    gctx.globalCompositeOperation = 'source-over';
    gctx.clearRect(0, 0, guide.width, guide.height);
    gctx.strokeStyle = 'rgba(255,255,255,0.85)';
    gctx.lineWidth = 1.2;
    gctx.setLineDash([6, 8]);
    const cx = guide.width / 2, cy = guide.height / 2, R = Math.hypot(guide.width, guide.height) / 2, step = DECK * SS;
    for (const th of PATTERNS[pattern]) {
      const ux = Math.sin(th), uy = -Math.cos(th), px = -uy, py = ux;
      for (let o = -R; o <= R; o += step) {
        gctx.beginPath();
        gctx.moveTo(cx + px * o - ux * R, cy + py * o - uy * R);
        gctx.lineTo(cx + px * o + ux * R, cy + py * o + uy * R);
        gctx.stroke();
      }
    }
    gctx.globalCompositeOperation = 'destination-in';
    gctx.drawImage(maskImg, 0, 0, guide.width, guide.height);
    gameDirty = true;
  }

  // Lay the grass under the deck. Blades bent away from the viewer read light, toward reads dark.
  // Each pass goes to the layer of the pattern direction it is closest to.
  function stamp(x0, y0, x1, y1, ok, turning) {
    const dx = x1 - x0, dy = y1 - y0, d = Math.hypot(dx, dy);
    if (d < 0.01) return;
    const ux = dx / d, uy = dy / d;
    const axes = PATTERNS[pattern];
    let li = 0, best = -1, ax = 0, ay = 0;
    axes.forEach((th, n) => {
      let vx = Math.sin(th), vy = -Math.cos(th);
      if (vx * AWAY[0] + vy * AWAY[1] < 0) { vx = -vx; vy = -vy; }   // point each axis "away"
      const c = Math.abs(ux * vx + uy * vy);
      if (c > best) { best = c; li = n; ax = vx; ay = vy; }
    });
    const shade = Math.round(128 + 46 * (ux * ax + uy * ay));
    const c = lctx[li];
    c.save();
    c.globalCompositeOperation = 'source-atop';
    c.translate((x0 + x1) / 2 * SS, (y0 + y1) / 2 * SS);
    c.rotate(Math.atan2(uy, ux));
    c.fillStyle = `rgb(${shade},${shade},${shade})`;
    c.fillRect(-(d / 2 + 1.5) * SS, -DECK / 2 * SS, (d + 3) * SS, DECK * SS);
    c.restore();
    // coverage
    const px = -uy, py = ux;
    const n = Math.max(1, Math.ceil(d / (CELL * 0.7)));
    for (let i = 0; i <= n; i++) {
      const bx = x0 + dx * i / n, by = y0 + dy * i / n;
      for (let t = -0.5; t <= 0.5001; t += 0.125) {
        const gx = Math.floor((bx + px * t * DECK) / CELL), gy = Math.floor((by + py * t * DECK) / CELL);
        if (gx < 0 || gy < 0 || gx >= GW || gy >= GH) continue;
        const k = gy * GW + gx;
        if (!lawnCell[k]) continue;
        const v = ok ? 1 : 0, skip = turning || (!ok && headland[k]);
        if (!cut[k]) {
          cut[k] = 1; cutCount++;
          if (skip) okCell[k] = 2; else { okCell[k] = v; scored++; okCount += v; }
        } else if (!skip && okCell[k] !== v) {
          if (okCell[k] === 2) scored++; else okCount -= okCell[k];
          okCell[k] = v; okCount += v;
        }
      }
    }
    gameDirty = true;
  }

  // does a travel direction run along a guide line of this pattern?
  function along(dx, dy) {
    const d = Math.hypot(dx, dy); if (d < 1e-6) return false;
    return PATTERNS[pattern].some(th => Math.abs((dx * Math.sin(th) - dy * Math.cos(th)) / d) >= ALIGN);
  }
  const strPct = () => (cutCount ? Math.round(okCount / Math.max(scored, cutCount * 0.85) * 100) : 0);

  function score(force) {
    const cov = lawnTotal ? cutCount / lawnTotal : 0, c = String(Math.floor(cov * 100)), t = fmtTime(tNow), s = String(strPct());
    if (sCov.textContent !== c) { sCov.textContent = c; hudCov.textContent = c; }
    if (sStr.textContent !== s) sStr.textContent = s;
    if (sTime.textContent !== t) { sTime.textContent = t; hudTime.textContent = t; }
    if (!force && playing && started && !finished && !demo && cov >= 0.9) finish();
  }

  // Best times per pattern. Anything that isn't a real, possible run (missing, zero, negative, faster than the
  // mower can physically cover the lawn) is treated as no best at all.
  function readBest() {
    let o = {};
    try { o = JSON.parse(localStorage.getItem('cc-mow-best') || '{}'); } catch { o = {}; }
    const out = {};
    if (o && typeof o === 'object') Object.keys(PATTERNS).forEach(k => { const v = +o[k]; if (Number.isFinite(v) && v >= minSecs) out[k] = v; });
    return out;
  }
  function writeBest(o) { try { localStorage.setItem('cc-mow-best', JSON.stringify(o)); } catch { /* storage blocked: scores just aren't kept */ } }
  const patternName = () => ({ straight: 'straight', diagonal: 'diagonal', checker: 'checkerboard', diamond: 'diamond' })[pattern];
  function showBest() {
    const b = readBest()[pattern];
    bestEl.textContent = b ? `Your best on ${patternName()}: ${fmtTime(b)}` : '';
  }

  function finish() {
    finished = true;
    const secs = tNow, str = strPct(), t = fmtTime(secs);
    let msg;
    if (secs < minSecs) msg = 'Done, but too fast to be real, so it doesn’t count.';
    else if (str < STRAIGHT_MIN) msg = `Done in ${t}, but only ${str}% straight. The crew keeps it over ${STRAIGHT_MIN}%.`;
    else {
      msg = crewSecs && secs < crewSecs ? `Done in ${t}, ${str}% straight. You beat the crew.` : `Done in ${t} with ${str}% straight lines.`;
      const o = readBest();
      if (!o[pattern] || secs < o[pattern]) { o[pattern] = Math.round(secs * 10) / 10; writeBest(o); }
    }
    doneEl.textContent = msg;
    doneEl.classList.add('is-on');
    showBest();
    stopPlay();
  }

  // ---- Auto-mow ("Show me"): serpentine passes along each guide direction, like a crew would run it
  function planPath() {
    const segs = [];
    let bx0 = BW, by0 = BH, bx1 = 0, by1 = 0;
    for (let gy = 0; gy < GH; gy++) for (let gx = 0; gx < GW; gx++) if (lawnCell[gy * GW + gx]) {
      bx0 = Math.min(bx0, gx * CELL); by0 = Math.min(by0, gy * CELL); bx1 = Math.max(bx1, (gx + 1) * CELL); by1 = Math.max(by1, (gy + 1) * CELL);
    }
    const cx = (bx0 + bx1) / 2, cy = (by0 + by1) / 2, R = Math.hypot(bx1 - bx0, by1 - by0) / 2 + DECK;
    for (const th of PATTERNS[pattern]) {
      const ux = Math.sin(th), uy = -Math.cos(th), px = -uy, py = ux;
      let flip = false;
      for (let o = -R + DECK / 2; o <= R; o += DECK) {
        // walk the line, keep the stretch that is on lawn
        let a = null, b = null;
        for (let t = -R; t <= R; t += 8) {
          const x = cx + px * o + ux * t, y = cy + py * o + uy * t;
          if (maskAt(x, y) > 128) { if (a === null) a = t; b = t; }
        }
        if (a === null || b - a < DECK * 0.6) continue;
        const p0 = [cx + px * o + ux * a, cy + py * o + uy * a], p1 = [cx + px * o + ux * b, cy + py * o + uy * b];
        segs.push(flip ? [p1, p0] : [p0, p1]);
        flip = !flip;
      }
    }
    return segs;
  }
  // The crew drives the same mower you do: a steady 85% of top speed on the stripes, and every turn at the
  // end of a pass costs what this mower needs to brake, swing round and get back up to speed.
  function crewTime(segs) {
    const v = VMAX * 0.85, turn = Math.PI / TURN + 2 * VMAX / ACC;
    let t = 0;
    segs.forEach(([a, b], i) => {
      t += Math.hypot(b[0] - a[0], b[1] - a[1]) / v;
      // between passes: swing round, and drive across to the next pass (a long hop where the pattern crosses over)
      if (i < segs.length - 1) { const n = segs[i + 1][0]; t += turn + Math.max(0, Math.hypot(n[0] - b[0], n[1] - b[1]) - DECK) / v; }
    });
    return t;
  }

  function startAuto() {
    stopPlay();
    freshLawn();
    demo = true;
    const segs = planPath();
    if (reduce) {
      segs.forEach(([a, b]) => stamp(a[0], a[1], b[0], b[1], true, false));
      tNow = crewSecs;
      const last = segs[segs.length - 1];
      if (last) { mower.x = last[1][0]; mower.y = last[1][1]; mower.a = Math.atan2(last[1][0] - last[0][0], -(last[1][1] - last[0][1])); }
      syncStart(); score(true); showBoard(); return;
    }
    // Played back as a time-lapse, about 6x real speed
    auto = { segs, i: 0, t: 0, speed: VMAX * 6 };
    board.classList.add('is-auto');
    startBox.hidden = true;
    showBoard();
    wake();
  }
  function stepAuto(dt) {
    let left = auto.speed * dt, guard = 0;
    // left > 0.01, not > 0: float leftovers below that would never advance auto.t
    while (left > 0.01 && auto.i < auto.segs.length && guard++ < 500) {
      const [a, b] = auto.segs[auto.i];
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const t1 = Math.min(L, auto.t + left);
      const k0 = auto.t / L, k1 = t1 / L;
      const x0 = lerp(a[0], b[0], k0), y0 = lerp(a[1], b[1], k0), x1 = lerp(a[0], b[0], k1), y1 = lerp(a[1], b[1], k1);
      stamp(x0, y0, x1, y1, true, false);
      mower.x = x1; mower.y = y1; mower.a = Math.atan2(b[0] - a[0], -(b[1] - a[1]));
      left -= t1 - auto.t; auto.t = t1;
      if (auto.t >= L - 0.01) { auto.i++; auto.t = 0; }
    }
    // the clock shows the crew's pace, not the time-lapse
    const seg = auto.segs[auto.i];
    tNow = crewSecs * Math.min(1, (auto.i + (seg ? auto.t / Math.hypot(seg[1][0] - seg[0][0], seg[1][1] - seg[0][1]) : 0)) / auto.segs.length);
    if (auto.i >= auto.segs.length) { auto = null; board.classList.remove('is-auto'); startBox.hidden = false; syncStart(); }
  }

  // ---- Player
  // A run in progress (started, not finished, not the "Show me" lawn) can be paused and picked up again.
  const inRun = () => started && !finished && !demo;
  function syncStart() { goBtn.textContent = inRun() ? 'Keep mowing' : 'Start mowing'; }
  function startPlay() {
    if (!ready) return;
    auto = null; board.classList.remove('is-auto'); startBox.hidden = false;
    if (finished || demo) freshLawn();
    playing = true;
    board.classList.add('is-playing');
    stopBtn.hidden = false;
    mc.focus({ preventScroll: true });
    showBoard();
    wake();
  }
  // the whole lawn, its Pause button and the clock need to be on screen, clear of the fixed header
  function showBoard() {
    const r = board.getBoundingClientRect(), top = bar.getBoundingClientRect().bottom + 8;
    if (r.top < top || r.bottom > innerHeight) scrollBy({ top: r.top - top - Math.max(0, (innerHeight - top - r.height) / 2), behavior: reduce ? 'auto' : 'smooth' });
  }
  function stopPlay() {
    const was = playing;
    playing = false; keys.clear(); pointer = null; mower.v = 0;
    board.classList.remove('is-playing');
    stopBtn.hidden = true;
    syncStart();
    // keyboard users land back on the button that resumes
    if (was && document.activeElement === mc && !finished) goBtn.focus({ preventScroll: true });
  }
  function flash(text) {
    if (hudMsg.textContent !== text) hudMsg.textContent = text;
    msgT = 0.9;
  }
  function stepPlayer(dt) {
    let fwd = 0, turn = 0;
    if (keys.has('up')) fwd += 1;
    if (keys.has('down')) fwd -= 0.6;
    if (keys.has('left')) turn -= 1;
    if (keys.has('right')) turn += 1;
    if (pointer) {
      const dx = pointer.x - mower.x, dy = pointer.y - mower.y, dist = Math.hypot(dx, dy);
      if (dist > 10) {
        const want = Math.atan2(dx, -dy);
        const diff = ((want - mower.a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
        turn = clamp(diff * 3, -1, 1);
        fwd = clamp(dist / 160, 0, 1) * Math.max(0, Math.cos(diff));
      }
    }
    if (started) tNow += dt;
    const da = turn * TURN * dt;
    mower.a += da;
    const vt = fwd * VMAX;
    mower.v += clamp(vt - mower.v, -ACC * dt, ACC * dt);
    if (Math.abs(mower.v) < 1 && !fwd) mower.v = 0;
    if (!mower.v) return;
    let nx = mower.x + Math.sin(mower.a) * mower.v * dt, ny = mower.y - Math.cos(mower.a) * mower.v * dt;
    // Beds, patio and the house are off limits. At the steel edging the mower slides along it (steering the way
    // the driver is turning first) instead of sticking in a corner; only head-on into a notch does it stop.
    if (maskAt(nx, ny) < 90) {
      flash('Steel edging. Turn away.');
      const sg = turn < 0 ? -1 : 1;
      let slid = false;
      for (const dd of [0.5 * sg, -0.5 * sg, 1.0 * sg, -1.0 * sg]) {
        const a2 = mower.a + dd, sx = mower.x + Math.sin(a2) * mower.v * 0.6 * dt, sy = mower.y - Math.cos(a2) * mower.v * 0.6 * dt;
        if (maskAt(sx, sy) >= 90) { nx = sx; ny = sy; mower.a += dd * 0.2; mower.v *= 0.92; slid = true; break; }
      }
      if (!slid) { mower.v = 0; return; }
    }
    started = true;
    // travel over the last 0.3 s and the 0.3 s before it
    trail.push({ t: tNow, x: nx, y: ny });
    while (trail.length > 2 && trail[1].t < tNow - 0.6) trail.shift();
    const at = t => { for (let i = trail.length - 1; i >= 0; i--) if (trail[i].t <= t) return trail[i]; return trail[0]; };
    const p1 = at(tNow - 0.3), p0 = at(tNow - 0.6);
    const ax = nx - p1.x, ay = ny - p1.y, bx = p1.x - p0.x, by = p1.y - p0.y;
    const la = Math.hypot(ax, ay), lb = Math.hypot(bx, by);
    const ok = la > 6 ? along(ax, ay) : along(nx - mower.x, ny - mower.y);
    const turning = la > 6 && lb > 6 && (ax * bx + ay * by) / (la * lb) < Math.cos(25 * Math.PI / 180);
    stamp(mower.x, mower.y, nx, ny, ok, turning);
    mower.x = nx; mower.y = ny;
  }

  // ---- Drawing
  function msize() {
    mdpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = mc.getBoundingClientRect();
    mcw = Math.round(r.width * mdpr); mch = Math.round(r.height * mdpr);
    if (mc.width !== mcw || mc.height !== mch) { mc.width = mcw; mc.height = mch; }
    view.s = Math.max(mcw / BW, mch / BH);
    gameDirty = true;
  }
  function follow(dt) {
    const vw = mcw / view.s, vh = mch / view.s;
    const tx = clamp(mower.x - vw / 2, 0, BW - vw), ty = clamp(mower.y - vh / 2, 0, BH - vh);
    const k = reduce ? 1 : 1 - Math.exp(-dt * 4);
    const nx = lerp(view.x, tx, k), ny = lerp(view.y, ty, k);
    if (Math.abs(nx - view.x) > 0.05 || Math.abs(ny - view.y) > 0.05) gameDirty = true;
    view.x = nx; view.y = ny;
  }
  function drawMower() {
    const g = mctx;
    g.save();
    g.translate(mower.x, mower.y);
    g.rotate(mower.a);
    const D = DECK;
    g.fillStyle = 'rgba(0,0,0,0.28)';
    g.beginPath(); g.ellipse(4, 6, D * 0.55, D * 0.62, 0, 0, Math.PI * 2); g.fill();
    // rear drive wheels
    g.fillStyle = '#121512';
    g.fillRect(-D * 0.52, D * 0.08, D * 0.18, D * 0.42); g.fillRect(D * 0.34, D * 0.08, D * 0.18, D * 0.42);
    // deck
    g.fillStyle = '#2c312d';
    g.beginPath(); g.roundRect(-D / 2, -D * 0.62, D, D * 0.5, D * 0.12); g.fill();
    g.fillStyle = '#3a403b'; g.fillRect(-D * 0.42, -D * 0.6, D * 0.84, D * 0.06);
    // front casters
    g.fillStyle = '#121512';
    g.fillRect(-D * 0.46, -D * 0.74, D * 0.12, D * 0.16); g.fillRect(D * 0.34, -D * 0.74, D * 0.12, D * 0.16);
    // body
    g.fillStyle = '#3d5cb4';
    g.beginPath(); g.roundRect(-D * 0.32, -D * 0.2, D * 0.64, D * 0.72, D * 0.1); g.fill();
    // seat and operator's hard hat
    g.fillStyle = '#1b1f1c';
    g.beginPath(); g.roundRect(-D * 0.2, D * 0.12, D * 0.4, D * 0.3, D * 0.08); g.fill();
    g.fillStyle = '#f4f5f0';
    g.beginPath(); g.arc(0, D * 0.2, D * 0.13, 0, Math.PI * 2); g.fill();
    g.restore();
  }
  function render() {
    const g = mctx;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = '#2c4a39'; g.fillRect(0, 0, mcw, mch);
    g.setTransform(view.s, 0, 0, view.s, -view.x * view.s, -view.y * view.s);
    g.drawImage(lawnImg, 0, 0, BW, BH);
    g.globalCompositeOperation = 'overlay';
    g.drawImage(layers[0], 0, 0, BW, BH);
    g.drawImage(layers[1], 0, 0, BW, BH);
    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = 0.22;
    g.drawImage(guide, 0, 0, BW, BH);
    g.globalAlpha = 1;
    drawMower();
  }

  // The game loop runs only while the board is on screen.
  let mLast = performance.now(), scoreT = 0, looping = false;
  function mloop(now) {
    if (!boardVisible) { looping = false; return; }
    const dt = Math.min(0.05, (now - mLast) / 1000); mLast = now;
    if (ready) {
      if (auto) stepAuto(dt);
      else if (playing) stepPlayer(dt);
      follow(dt);
      if (playing || auto) gameDirty = true;
      if (gameDirty) { render(); gameDirty = false; }
      if (msgT > 0) { msgT -= dt; if (msgT <= 0) hudMsg.textContent = ''; }
      scoreT += dt;
      if (scoreT > 0.1) { score(false); scoreT = 0; }
    }
    requestAnimationFrame(mloop);
  }
  function wake() {
    if (looping || !boardVisible) return;
    looping = true; mLast = performance.now();
    requestAnimationFrame(mloop);
  }

  // ---- Input. Keys drive the mower only while the lawn itself has focus, never the radios or buttons.
  const KEYMAP = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' };
  mc.addEventListener('keydown', e => {
    if (!playing) {
      if (e.code === 'Enter' || e.code === 'Space') { e.preventDefault(); if (!auto) startPlay(); }
      return;
    }
    if (e.code === 'Escape') { e.preventDefault(); stopPlay(); return; }
    // keys that would scroll the page away from the lawn do nothing mid-run
    if (['Space', 'PageUp', 'PageDown', 'Home', 'End'].includes(e.code)) { e.preventDefault(); return; }
    const k = KEYMAP[e.code];
    if (k) { keys.add(k); e.preventDefault(); }
  });
  mc.addEventListener('keyup', e => { const k = KEYMAP[e.code]; if (k) keys.delete(k); });
  // tabbing or clicking away pauses the run (and its clock)
  mc.addEventListener('blur', () => { if (playing && !pointer) stopPlay(); });
  addEventListener('blur', () => { keys.clear(); if (playing) stopPlay(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && playing) stopPlay(); });
  // A finger aims the mower at a spot just above it, so the finger never covers the mower.
  const LIFT = 56;
  const toBoard = e => {
    const r = mc.getBoundingClientRect(), lift = e.pointerType === 'mouse' ? 0 : LIFT;
    return { x: view.x + (e.clientX - r.left) * mdpr / view.s, y: view.y + (e.clientY - r.top - lift) * mdpr / view.s };
  };
  mc.addEventListener('pointerdown', e => {
    if (!playing) return;
    pointer = toBoard(e);
    try { mc.setPointerCapture(e.pointerId); } catch { /* not supported */ }
  });
  mc.addEventListener('pointermove', e => { if (pointer) pointer = toBoard(e); });
  const up = () => { pointer = null; };
  mc.addEventListener('pointerup', up);
  mc.addEventListener('pointercancel', up);
  goBtn.addEventListener('click', startPlay);
  stopBtn.addEventListener('click', stopPlay);
  showBtn.addEventListener('click', startAuto);
  resetBtn.addEventListener('click', () => { stopPlay(); auto = null; board.classList.remove('is-auto'); startBox.hidden = false; freshLawn(); });
  // A new pattern means a new lawn: guides, stripes, straightness and the clock all belong to one pattern.
  $$('input[name="pat"]').forEach(r => r.addEventListener('change', () => {
    if (!r.checked) return;
    pattern = r.value;
    stopPlay(); auto = null; board.classList.remove('is-auto'); startBox.hidden = false;
    if (ready) { freshLawn(); buildGuide(); crewSecs = crewTime(planPath()); }
    crewLine.textContent = crewSecs ? `The crew does it in ${fmtTime(crewSecs)}.` : 'Then try to beat the crew.';
    showBest();
    syncPattern();
  }));

  // the game runs while the lawn is on screen; a run pauses once less than half of it is
  new IntersectionObserver(es => {
    const e = es[es.length - 1];
    const was = boardVisible;
    boardVisible = e.isIntersecting;
    if (boardVisible && !was) { msize(); gameDirty = true; wake(); }
    if (playing && e.intersectionRatio < 0.5) stopPlay();
  }, { threshold: [0, 0.5] }).observe(board);
  addEventListener('resize', () => { if (boardVisible) msize(); });

  Promise.all([
    new Promise(res => { lawnImg.onload = res; lawnImg.onerror = res; lawnImg.src = 'img/lawn.webp'; }),
    new Promise(res => { maskImg.onload = res; maskImg.onerror = res; maskImg.src = 'img/lawn-mask.png'; })
  ]).then(() => {
    if (!maskImg.naturalWidth || !lawnImg.naturalWidth) return;
    // read the mask once, at stripe scale, for collisions and coverage
    const t = document.createElement('canvas'); t.width = stripe.width; t.height = stripe.height;
    const tc = t.getContext('2d', { willReadFrequently: true });
    tc.drawImage(maskImg, 0, 0, t.width, t.height);
    const px = tc.getImageData(0, 0, t.width, t.height).data;
    maskData = new Uint8Array(t.width * t.height);
    for (let i = 0; i < maskData.length; i++) maskData[i] = px[i * 4];
    lawnCell = new Uint8Array(GW * GH); lawnTotal = 0;
    for (let gy = 0; gy < GH; gy++) for (let gx = 0; gx < GW; gx++) {
      if (maskAt((gx + 0.5) * CELL, (gy + 0.5) * CELL) > 128) { lawnCell[gy * GW + gx] = 1; lawnTotal++; }
    }
    // the headland: lawn cells within 1.5 deck widths of the edging
    headland = new Uint8Array(GW * GH);
    const HR = Math.ceil(DECK * 1.5 / CELL);
    for (let gy = 0; gy < GH; gy++) for (let gx = 0; gx < GW; gx++) {
      if (!lawnCell[gy * GW + gx]) continue;
      search: for (let dy = -HR; dy <= HR; dy++) for (let dx = -HR; dx <= HR; dx++) {
        if (dx * dx + dy * dy > HR * HR) continue;
        const x = gx + dx, y = gy + dy;
        if (x < 0 || y < 0 || x >= GW || y >= GH || !lawnCell[y * GW + x]) { headland[gy * GW + gx] = 1; break search; }
      }
    }
    // The fastest any run could be: 90% of the lawn under the deck at full speed in dead-straight lines.
    minSecs = Math.max(5, 0.9 * lawnTotal * CELL * CELL / (DECK * VMAX));
    ready = true;
    freshLawn();
    buildGuide();
    crewSecs = crewTime(planPath());
    crewLine.textContent = `The crew does it in ${fmtTime(crewSecs)}.`;
    showBest();
    msize();
    view.x = clamp(mower.x - mcw / view.s / 2, 0, BW - mcw / view.s);
    view.y = clamp(mower.y - mch / view.s / 2, 0, BH - mch / view.s);
    gameDirty = true;
    wake();
  });

  /* =========================================================== Estimator */
  const est = $('#est'), totalEl = $('#total'), estN = $('#estN'), daysEl = $('#days'), mowLine = $('#mowLine'), estSay = $('#estSay');
  const trees = $('#trees'), treesOut = $('#treesOut');
  function syncPattern() { const p = $('#mowPat'); if (p) p.textContent = patternName(); }
  let shown = 0, raf = 0, sayT = 0;
  function calc() {
    const fd = new FormData(est);
    const S = +fd.get('size') || 5000;
    const nTrees = clamp(Math.round(+trees.value || 0), 0, 8);
    const sod = +fd.get('sod') || 0;
    const lawnA = S * 0.62, bedA = S * 0.16;
    const has = k => !!fd.get(k);
    let sum = 0;
    sum += nTrees * 1200;
    if (has('grade')) sum += S * 0.45;
    if (sod) sum += lawnA * sod;
    if (has('irr')) sum += (lawnA + bedA) * 0.6;   // sprinkler zones over the lawn and beds
    if (has('beds')) sum += bedA * 14;
    if (has('patio')) sum += 300 * 28;
    if (has('pit')) sum += 3200;
    if (has('lights')) sum += 4200;
    if (has('fence')) sum += Math.sqrt(S) * 1.1 * 38;
    sum = Math.round(sum / 50) * 50;
    // Working days, the way three crews run a job: trees first, then grading, then the planting and sod
    // crew works alongside the stone and lighting crew, the irrigator and the fence crew. The film's yard
    // (about 12,000 sq ft, two trees, grading, sprinklers, beds, sod, patio, fire pit, lights and a new
    // cedar fence) comes out at four days.
    const clear = nTrees ? 0.5 + 0.25 * (nTrees - 1) : 0;
    const grade = has('grade') ? Math.max(0.5, S / 12000) : 0;
    const soft = (has('beds') ? Math.max(0.5, bedA / 2000) : 0) + (sod ? Math.max(0.5, lawnA / 8000) : 0);
    const hard = (has('patio') ? 1.5 : 0) + (has('pit') ? 0.5 : 0);
    const lights = has('lights') ? 1 : 0;
    const irr = has('irr') ? Math.max(0.5, (lawnA + bedA) / 8000) : 0;
    const fence = has('fence') ? 1 : 0;
    const d = Math.ceil(clear + grade + Math.max(soft, hard, lights, irr, fence) - 1e-9);
    const empty = sum === 0;
    estN.classList.toggle('is-empty', empty);
    daysEl.textContent = empty ? 'Pick some work above to see a price.' : `${d} working ${d === 1 ? 'day' : 'days'}`;
    const rate = '$' + (S <= 2500 ? 45 : S <= 5000 ? 55 : S <= 12000 ? 75 : 120);
    mowLine.textContent = '';
    mowLine.append(sod ? 'Weekly mowing once the sod roots: ' : 'Weekly mowing: ');
    const b = document.createElement('span'); b.textContent = rate; mowLine.append(b, ' a visit, ');
    const p = document.createElement('span'); p.id = 'mowPat'; p.textContent = patternName(); mowLine.append(p, ' stripes');
    const from = shown, t0 = performance.now();
    cancelAnimationFrame(raf);
    const step = now => { const k = reduce ? 1 : ease(clamp((now - t0) / 450)); shown = lerp(from, sum, k); totalEl.textContent = Math.round(shown).toLocaleString('en-US'); if (k < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
    // screen readers hear the settled result once, not the count
    clearTimeout(sayT);
    sayT = setTimeout(() => { estSay.textContent = empty ? 'No work picked yet.' : `Estimate $${sum.toLocaleString('en-US')}, ${d} working ${d === 1 ? 'day' : 'days'}.`; }, 700);
  }
  $$('.step__b').forEach(b => b.addEventListener('click', () => {
    const v = clamp((+trees.value || 0) + +b.dataset.step, 0, 8);
    trees.value = String(v); treesOut.textContent = String(v); calc();
  }));
  est.addEventListener('change', calc);
  // one tap sets the estimator to the yard in the film
  $('#filmYard').addEventListener('click', () => {
    est.querySelector('input[name="size"][value="12000"]').checked = true;
    est.querySelector('input[name="sod"][value="1.6"]').checked = true;
    const on = { grade: 1, irr: 1, beds: 1, patio: 1, pit: 1, lights: 1, fence: 1 };
    Object.keys(on).forEach(k => { est.querySelector(`input[name="${k}"]`).checked = !!on[k]; });
    trees.value = '2'; treesOut.textContent = '2';
    calc();
  });
  est.addEventListener('submit', e => e.preventDefault());
  calc();
  estSay.textContent = '';

  const book = $('#book');
  $('#bookBtn').addEventListener('click', () => { if (book.showModal) book.showModal(); });
})();
