/* Caliche & Clover Landscapes (concept by Quvlo). Scroll position is the job: the footage, the
   day tracker and the tallies all read from one number. Below it, a mowing game where stripes
   come from the direction the blades lay the grass. No libraries. */
(() => {
  'use strict';
  // Bump when any film frame changes, so browsers fetch the new frames instead of cached ones.
  const FV = '2026102801';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const ease = k => k * k * (3 - 2 * k);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fmtTime = s => { s = Math.max(0, Math.round(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

  /* =========================================================== Film */
  const PER = 40, SHOTS = 6;
  const film = $('#film'), canvas = $('#filmCanvas');
  const loader = $('#loader'), loadPct = $('#loadPct'), loadBar = $('#loadBar');
  const bar = $('.bar'), hero = $('#hero'), track = $('#track'), trackCut = $('#trackCut');
  const caps = $$('.cap'), days = $$('.track__days li'), clock = $('#clock');
  const tallies = caps.map(c => $('.tally', c));

  let N = 240;
  let opened = false;
  function openLoader() {
    if (opened) return; opened = true;
    document.body.classList.remove('is-loading');
    loader.classList.add('is-open');
  }

  // Day 4 clock for the last shot: 4:30 pm to 7:10 pm
  const clockText = m => { const h = Math.floor(m / 60), mm = Math.round(m % 60); return `${h % 12 || 12}:${String(mm).padStart(2, '0')} pm`; };

  function ui(f) {
    const shot = Math.min(SHOTS - 1, Math.floor(f / PER)), local = clamp((f - shot * PER) / (PER - 1));
    hero.classList.toggle('is-off', f > 22);
    track.classList.toggle('is-hidden', f < 24);
    caps.forEach((cap, n) => {
      const s = +cap.dataset.shot;
      const on = s === SHOTS - 1 ? f >= (SHOTS - 1) * PER + 10 : shot === s && local > 0.06 && local < 0.94;
      cap.classList.toggle('is-on', on);
      const t = tallies[n];
      if (t && shot === s) {
        // The tally runs with the work in the footage
        const v = lerp(+t.dataset.from, +t.dataset.to, ease(clamp((local - 0.08) / 0.8)));
        const r = Math.round(v / (t.dataset.sep ? 50 : 1)) * (t.dataset.sep ? 50 : 1);
        t.textContent = t.dataset.sep ? r.toLocaleString('en-US') : String(r);
      } else if (t && shot > s) {
        t.textContent = t.dataset.sep ? (+t.dataset.to).toLocaleString('en-US') : t.dataset.to;
      }
    });
    days.forEach(li => {
      const s = +li.dataset.shot;
      li.classList.toggle('is-now', s === shot);
      li.classList.toggle('is-done', s < shot);
    });
    trackCut.style.width = (clamp(f / Math.max(1, N - 1)) * 100).toFixed(2) + '%';
    if (shot === SHOTS - 1) clock.textContent = clockText(lerp(16 * 60 + 30, 19 * 60 + 10, local));
  }

  window.FilmEngine.create({
    section: film, stage: $('.film__stage'), canvas, FV, range: [0.01, 0.92], rate: 8, mStride: 2,
    lift: '.cap, .hero, .track',
    overlays: { '.cap': 'is-on' },
    onGate: k => { const p = Math.round(k * 100); loadPct.textContent = String(p); loadBar.style.width = p + '%'; },
    onReady: openLoader,
    onFrame: v => { N = v.N; ui(v.f); },
  });
  setTimeout(openLoader, 9000); // never trap a visitor behind the loader on a very slow connection
  const solid = () => bar.classList.toggle('is-solid', film.getBoundingClientRect().bottom < 70);
  addEventListener('scroll', solid, { passive: true }); solid();
  ui(0);

  /* =========================================================== Mow it yourself */
  const BW = 1920, BH = 1080;          // board image size
  const SS = 0.5;                       // stripe layer scale
  const DECK = 72;                      // cutting width, board px
  const VMAX = 430, ACC = 1100, TURN = 2.7;
  const AWAY = (() => { const x = 0.38, y = -1, l = Math.hypot(x, y); return [x / l, y / l]; })(); // "away from the viewer"
  const PATTERNS = { straight: [0], diagonal: [Math.PI / 4], checker: [0, Math.PI / 2], diamond: [Math.PI / 4, -Math.PI / 4] };

  const board = $('#board'), mc = $('#mowCanvas'), mctx = mc.getContext('2d');
  const startBox = $('#mowStart'), goBtn = $('#mowGo'), showBtn = $('#mowShow'), resetBtn = $('#mowReset');
  const sCov = $('#sCov'), sStr = $('#sStr'), sTime = $('#sTime'), doneEl = $('#mowDone'), bestEl = $('#best'), crewLine = $('#crewLine');

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
  let tStart = 0, tNow = 0, finished = false;
  let strSum = 0, strW = 0;
  const keys = new Set();
  let pointer = null;
  let view = { s: 1, x: 0, y: 0 }, mcw = 0, mch = 0, mdpr = 1;
  let crewSecs = 0;

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
    strSum = 0; strW = 0; tStart = 0; tNow = 0; finished = false;
    mower.x = 960; mower.y = 905; mower.a = 0; mower.v = 0;
    doneEl.classList.remove('is-on');
    gameDirty = true;
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
  function stamp(x0, y0, x1, y1) {
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
        if (lawnCell[k] && !cut[k]) { cut[k] = 1; cutCount++; }
      }
    }
    gameDirty = true;
  }

  function straightness(heading, w) {
    // Angle between the travel line and the nearest guide line for this pattern
    let best = Math.PI;
    for (const th of PATTERNS[pattern]) {
      let dd = Math.abs(((heading - th) % Math.PI + Math.PI) % Math.PI);
      dd = Math.min(dd, Math.PI - dd);
      best = Math.min(best, dd);
    }
    const sc = 1 - Math.min(best, 0.42) / 0.42;
    strSum += sc * w; strW += w;
  }

  function score(force) {
    const cov = lawnTotal ? cutCount / lawnTotal : 0;
    sCov.textContent = String(Math.floor(cov * 100));
    sStr.textContent = String(strW ? Math.round(strSum / strW * 100) : 0);
    sTime.textContent = fmtTime(tNow);
    if (!finished && cov >= 0.9 && !auto && tStart && !force) finish();
  }

  function readBest() {
    try { const o = JSON.parse(localStorage.getItem('cc-mow-best') || '{}'); return (o && typeof o === 'object') ? o : {}; } catch { return {}; }
  }
  function writeBest(o) { try { localStorage.setItem('cc-mow-best', JSON.stringify(o)); } catch { /* storage blocked: scores just aren't kept */ } }
  function showBest() {
    const b = readBest()[pattern];
    bestEl.textContent = Number.isFinite(b) && b > 0 ? `Your best on ${patternName()}: ${fmtTime(b)}` : '';
  }
  const patternName = () => ({ straight: 'straight', diagonal: 'diagonal', checker: 'checkerboard', diamond: 'diamond' })[pattern];

  function finish() {
    finished = true;
    const secs = tNow, str = strW ? Math.round(strSum / strW * 100) : 0;
    const beat = crewSecs && secs < crewSecs;
    doneEl.textContent = beat ? `Done in ${fmtTime(secs)}. You beat the crew.` : `Done in ${fmtTime(secs)} with ${str}% straight lines.`;
    doneEl.classList.add('is-on');
    const o = readBest();
    if (!Number.isFinite(o[pattern]) || secs < o[pattern]) { o[pattern] = Math.round(secs); writeBest(o); }
    showBest();
    stopPlay();
  }

  // ---- Auto-mow: serpentine passes along each guide direction, like a crew would run it
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
  function crewTime(segs) {
    let L = 0;
    segs.forEach(([a, b]) => { L += Math.hypot(b[0] - a[0], b[1] - a[1]); });
    return L / (VMAX * 0.94) + segs.length * 0.9;
  }

  function startAuto() {
    stopPlay();
    freshLawn();
    const segs = planPath();
    if (reduce) {
      segs.forEach(([a, b]) => { stamp(a[0], a[1], b[0], b[1]); straightness(Math.atan2(b[0] - a[0], -(b[1] - a[1])), Math.hypot(b[0] - a[0], b[1] - a[1])); });
      tNow = crewSecs;
      const last = segs[segs.length - 1];
      if (last) { mower.x = last[1][0]; mower.y = last[1][1]; mower.a = Math.atan2(last[1][0] - last[0][0], -(last[1][1] - last[0][1])); }
      score(true); return;
    }
    // Played back as a time-lapse, about 6x real speed
    auto = { segs, i: 0, t: 0, speed: VMAX * 6 };
    board.classList.add('is-auto');
    startBox.hidden = true;
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
      stamp(x0, y0, x1, y1);
      mower.x = x1; mower.y = y1; mower.a = Math.atan2(b[0] - a[0], -(b[1] - a[1]));
      straightness(mower.a, Math.hypot(x1 - x0, y1 - y0));
      left -= t1 - auto.t; auto.t = t1;
      if (auto.t >= L - 0.01) { auto.i++; auto.t = 0; }
    }
    // the clock shows the crew's pace, not the time-lapse
    tNow = crewSecs * Math.min(1, (auto.i + (auto.segs[auto.i] ? auto.t / Math.hypot(auto.segs[auto.i][1][0] - auto.segs[auto.i][0][0], auto.segs[auto.i][1][1] - auto.segs[auto.i][0][1]) : 0)) / auto.segs.length);
    if (auto.i >= auto.segs.length) { auto = null; board.classList.remove('is-auto'); startBox.hidden = false; }
  }

  // ---- Player
  function startPlay() {
    if (!ready) return;
    auto = null; board.classList.remove('is-auto'); startBox.hidden = false;
    if (finished) freshLawn();
    playing = true;
    board.classList.add('is-playing');
    mc.focus({ preventScroll: true });
  }
  function stopPlay() {
    playing = false; keys.clear(); pointer = null;
    board.classList.remove('is-playing');
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
        let diff = ((want - mower.a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
        turn = clamp(diff * 3, -1, 1);
        fwd = clamp(dist / 160, 0, 1) * Math.max(0, Math.cos(diff));
      }
    }
    const da = turn * TURN * dt;
    mower.a += da;
    const vt = fwd * VMAX;
    mower.v += clamp(vt - mower.v, -ACC * dt, ACC * dt);
    if (Math.abs(mower.v) < 1 && !fwd) mower.v = 0;
    if (!mower.v) return;
    const nx = mower.x + Math.sin(mower.a) * mower.v * dt, ny = mower.y - Math.cos(mower.a) * mower.v * dt;
    // Beds, patio and the house are off limits: the mower stops at the steel edging
    if (maskAt(nx, ny) < 90) { mower.v = 0; return; }
    if (!tStart) tStart = performance.now();
    stamp(mower.x, mower.y, nx, ny);
    const d = Math.hypot(nx - mower.x, ny - mower.y);
    if (mower.v > 0 && Math.abs(da) < 0.02) straightness(mower.a, d);
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

  let mLast = performance.now(), scoreT = 0;
  function mloop(now) {
    const dt = Math.min(0.05, (now - mLast) / 1000); mLast = now;
    if (ready && boardVisible) {
      if (auto) stepAuto(dt);
      else if (playing) { stepPlayer(dt); if (tStart && !finished) tNow = (now - tStart) / 1000; }
      follow(dt);
      if (playing || auto) gameDirty = true;
      if (gameDirty) { render(); gameDirty = false; }
      scoreT += dt;
      if (scoreT > 0.1) { score(false); scoreT = 0; }
    }
    requestAnimationFrame(mloop);
  }

  // ---- Input
  const KEYMAP = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' };
  addEventListener('keydown', e => {
    if (!playing) return;
    if (e.code === 'Escape') { stopPlay(); return; }
    const k = KEYMAP[e.code];
    if (k) { keys.add(k); e.preventDefault(); }
  });
  addEventListener('keyup', e => { const k = KEYMAP[e.code]; if (k) keys.delete(k); });
  addEventListener('blur', () => keys.clear());
  const toBoard = e => {
    const r = mc.getBoundingClientRect();
    return { x: view.x + (e.clientX - r.left) * mdpr / view.s, y: view.y + (e.clientY - r.top) * mdpr / view.s };
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
  showBtn.addEventListener('click', startAuto);
  resetBtn.addEventListener('click', () => { stopPlay(); auto = null; board.classList.remove('is-auto'); startBox.hidden = false; freshLawn(); });
  $$('input[name="pat"]').forEach(r => r.addEventListener('change', () => {
    if (!r.checked) return;
    pattern = r.value;
    buildGuide();
    if (ready) crewSecs = crewTime(planPath());
    crewLine.textContent = crewSecs ? `The crew does it in ${fmtTime(crewSecs)}.` : "Beat the crew's time.";
    showBest();
    syncPattern();
  }));

  new IntersectionObserver(es => { boardVisible = es[0].isIntersecting; if (boardVisible) { msize(); gameDirty = true; } else stopPlay(); }).observe(board);
  addEventListener('resize', msize);

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
    ready = true;
    freshLawn();
    buildGuide();
    crewSecs = crewTime(planPath());
    crewLine.textContent = `The crew does it in ${fmtTime(crewSecs)}.`;
    showBest();
    msize();
    view.x = clamp(mower.x - mcw / view.s / 2, 0, BW - mcw / view.s);
    view.y = clamp(mower.y - mch / view.s / 2, 0, BH - mch / view.s);
  });
  requestAnimationFrame(mloop);

  /* =========================================================== Estimator */
  const est = $('#est'), totalEl = $('#total'), daysEl = $('#days'), mowRate = $('#mowRate'), mowPat = $('#mowPat');
  const trees = $('#trees'), treesOut = $('#treesOut');
  function syncPattern() { mowPat.textContent = patternName(); }
  let shown = 0, raf = 0;
  function calc() {
    const fd = new FormData(est);
    const S = +fd.get('size') || 5000;
    const nTrees = clamp(Math.round(+trees.value || 0), 0, 8);
    const sod = +fd.get('sod') || 0;
    const lawnA = S * 0.62, bedA = S * 0.16;
    let sum = 0;
    sum += nTrees * 950;
    if (fd.get('grade')) sum += S * 0.45;
    if (sod) sum += lawnA * sod;
    if (fd.get('beds')) sum += bedA * 14;
    if (fd.get('patio')) sum += 300 * 28;
    if (fd.get('pit')) sum += 3200;
    if (fd.get('lights')) sum += 2800;
    if (fd.get('fence')) sum += Math.sqrt(S) * 1.1 * 38;
    sum = Math.round(sum / 50) * 50;
    let d = 2 + nTrees * 0.3 + S / 5000 * 1.2 + (fd.get('patio') ? 0.6 : 0) + (fd.get('fence') ? 0.5 : 0);
    d = clamp(Math.round(d), 1, 12);
    daysEl.textContent = `${d} working ${d === 1 ? 'day' : 'days'}`;
    mowRate.textContent = '$' + (S <= 2500 ? 45 : S <= 5000 ? 55 : S <= 10000 ? 75 : 120);
    const from = shown, t0 = performance.now();
    cancelAnimationFrame(raf);
    const step = now => { const k = reduce ? 1 : ease(clamp((now - t0) / 450)); shown = lerp(from, sum, k); totalEl.textContent = Math.round(shown).toLocaleString('en-US'); if (k < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
  }
  $$('.step__b').forEach(b => b.addEventListener('click', () => {
    const v = clamp((+trees.value || 0) + +b.dataset.step, 0, 8);
    trees.value = String(v); treesOut.textContent = String(v); calc();
  }));
  est.addEventListener('input', calc);
  est.addEventListener('change', calc);
  est.addEventListener('submit', e => e.preventDefault());
  syncPattern();
  calc();

  const book = $('#book');
  $('#bookBtn').addEventListener('click', () => { if (book.showModal) book.showModal(); });
})();
