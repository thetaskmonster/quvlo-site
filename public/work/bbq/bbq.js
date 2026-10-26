/* Post Oak & Pepper (concept by Quvlo). One clock drives everything: scroll position is the
   time of the cook, from 8:40 pm to 11:00 am. The footage, the gauge, the cook log, the
   embers and the chart all read from that clock. No libraries. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const ease = k => k * k * (3 - 2 * k);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- The cook ---------- */
  // Minutes since 8:40 pm at the first frame of each shot, and at the end.
  const SHOT_T = [0, 25, 160, 185, 560, 830, 860];
  const START_MIN = 20 * 60 + 40;
  // Brisket internal temperature (°F) against minutes since 8:40 pm. The flat part is the stall.
  const TEMP_KEYS = [[0, 38], [185, 42], [260, 96], [330, 132], [380, 150], [450, 160], [500, 162], [560, 165], [640, 176], [740, 192], [830, 203], [860, 203]];
  function tempAt(t) {
    if (t <= TEMP_KEYS[0][0]) return TEMP_KEYS[0][1];
    for (let i = 1; i < TEMP_KEYS.length; i++) {
      const [t1, v1] = TEMP_KEYS[i], [t0, v0] = TEMP_KEYS[i - 1];
      if (t <= t1) return lerp(v0, v1, ease((t - t0) / (t1 - t0)));
    }
    return TEMP_KEYS[TEMP_KEYS.length - 1][1];
  }
  function pitAt(t) {
    if (t < 25) return 0;
    if (t < 160) return lerp(80, 275, ease((t - 25) / 135));
    return 275 + Math.sin(t / 37) * 4;
  }
  function stateAt(t, temp) {
    if (t < 185) return ['Cold from the box', false];
    if (t < 380) return [temp < 110 ? 'Taking smoke' : 'Bark setting', false];
    if (t < 450) return ['Bark setting', false];
    if (t < 560) return ['The stall. Hold steady.', true];
    if (t < 820) return ['Wrapped, pushing through', false];
    if (t < 840) return ['Probe tender at 203°', false];
    return ['Resting, then slice', false];
  }
  const clockText = t => {
    const m = Math.round(START_MIN + t) % 1440, h = Math.floor(m / 60), mm = m % 60;
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${String(mm).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
  };

  /* ---------- Film ---------- */
  const PER = 40;
  const film = $('#film'), canvas = $('#filmCanvas'), ctx = canvas.getContext('2d', { alpha: false });
  const fx = $('#fxCanvas'), fctx = fx.getContext('2d');
  const stage = $('.film__stage');
  const caps = $$('.cap'), logItems = $$('#log li');
  const loader = $('#loader'), loadPct = $('#loadPct'), loadBar = $('#loadBar');
  const bar = $('.bar');
  const gTemp = $('#gTemp'), gState = $('#gState'), gPit = $('#gPit'), gClock = $('#gClock');
  const gNeedle = $('#gNeedle'), gFill = $('#gFill');

  let M = null, kind = 'd', N = 0;
  const imgs = [];
  let target = 0, cur = 0, lastF = -1, lastP = -1, dirty = true, filmVisible = true;
  const pick = () => (innerWidth / innerHeight < 0.85 || innerWidth < 760) ? 'm' : 'd';
  const frameUrl = i => `f/${kind}/${String(i + 1).padStart(3, '0')}.webp`;

  function load(url) {
    return new Promise(res => {
      const im = new Image();
      im.decoding = 'async';
      im.onload = () => { (im.decode ? im.decode() : Promise.resolve()).catch(() => {}).then(() => res(im)); };
      im.onerror = () => res(null);
      im.src = url;
    });
  }

  async function boot() {
    try { M = await (await fetch('frames.json', { cache: 'force-cache' })).json(); } catch { M = null; }
    if (!M) { openLoader(); return; }
    kind = pick(); N = M.count;
    let done = 0;
    const tick = () => { done++; const p = Math.min(100, Math.round(done / PER * 100)); loadPct.textContent = String(p); loadBar.style.width = p + '%'; };
    await Promise.all(Array.from({ length: PER }, (_, i) => load(frameUrl(i)).then(im => { imgs[i] = im; dirty = true; tick(); })));
    openLoader();
    let next = PER;
    const worker = async () => { while (next < N) { const i = next++; imgs[i] = await load(frameUrl(i)); dirty = true; } };
    await Promise.all([worker(), worker(), worker(), worker(), worker()]);
  }
  function openLoader() {
    document.body.classList.remove('is-loading');
    loader.classList.add('is-open');
  }

  let cw = 0, ch = 0, dpr = 1;
  function size() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = canvas.getBoundingClientRect();
    cw = Math.round(r.width * dpr); ch = Math.round(r.height * dpr);
    if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
    fx.width = Math.round(r.width); fx.height = Math.round(r.height);
    if (M && pick() !== kind) location.reload();
    dirty = true;
  }
  function fit(fw, fh) {
    const s = Math.max(cw / fw, ch / fh);
    return { s, x: (cw - fw * s) / 2, y: (ch - fh * s) / 2, fw, fh };
  }
  function toScreen(u, v, i, F) {
    let x = u;
    if (kind === 'm') x = (u - M.m.crop[i]) / M.m.cropW;
    return [(F.x + x * F.fw * F.s) / dpr, (F.y + v * F.fh * F.s) / dpr];
  }
  function nearestLoaded(i) {
    if (imgs[i]) return i;
    for (let d = 1; d < N; d++) { if (imgs[i - d]) return i - d; if (imgs[i + d]) return i + d; }
    return -1;
  }
  const frameFromProgress = p => clamp((p - 0.01) / 0.9) * (N - 1);
  // Time of the cook at a (fractional) frame
  function timeAt(f) {
    const shot = Math.min(5, Math.floor(f / PER));
    const k = clamp((f - shot * PER) / (PER - 1));
    return lerp(SHOT_T[shot], SHOT_T[shot + 1], k);
  }

  let F = null;
  function draw(f) {
    if (!N) return;
    const i0 = Math.floor(f), i1 = Math.min(N - 1, i0 + 1), k = f - i0;
    const a = nearestLoaded(i0);
    if (a < 0) return;
    const A = imgs[a];
    F = fit(A.naturalWidth, A.naturalHeight);
    ctx.globalAlpha = 1;
    ctx.drawImage(A, F.x, F.y, F.fw * F.s, F.fh * F.s);
    if (k > 0.02 && imgs[i1] && a === i0) { ctx.globalAlpha = k; ctx.drawImage(imgs[i1], F.x, F.y, F.fw * F.s, F.fh * F.s); ctx.globalAlpha = 1; }
  }

  /* ---------- Gauge ---------- */
  const G_MIN = 0, G_MAX = 250, A0 = -135, A1 = 135; // degrees clockwise from 12 o'clock; the gap sits at the bottom
  const angFor = v => lerp(A0, A1, clamp((v - G_MIN) / (G_MAX - G_MIN)));
  const pt = (a, r) => { const rad = (a - 90) * Math.PI / 180; return [100 + r * Math.cos(rad), 100 + r * Math.sin(rad)]; };
  const arc = (a0, a1, r) => { const [x0, y0] = pt(a0, r), [x1, y1] = pt(a1, r); return `M${x0.toFixed(2)},${y0.toFixed(2)} A${r},${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1.toFixed(2)},${y1.toFixed(2)}`; };
  (function buildGauge() {
    $('#gArc').setAttribute('d', arc(A0, A1, 70));
    $('#gStall').setAttribute('d', arc(angFor(150), angFor(170), 70));
    const ns = 'http://www.w3.org/2000/svg', g = $('#gTicks');
    for (let v = 0; v <= 250; v += 25) {
      const a = angFor(v), major = v % 50 === 0;
      const [x0, y0] = pt(a, major ? 58 : 61), [x1, y1] = pt(a, 64);
      const l = document.createElementNS(ns, 'line');
      l.setAttribute('x1', x0); l.setAttribute('y1', y0); l.setAttribute('x2', x1); l.setAttribute('y2', y1);
      g.append(l);
      if (major) {
        const [tx, ty] = pt(a, 48);
        const t = document.createElementNS(ns, 'text');
        t.setAttribute('x', tx.toFixed(1)); t.setAttribute('y', ty.toFixed(1)); t.textContent = String(v);
        g.append(t);
      }
    }
  })();
  let lastTempTxt = '', lastClock = '', lastState = '', lastPit = '';
  function gauge(t) {
    const temp = tempAt(t);
    const a = angFor(temp);
    gNeedle.style.transform = `rotate(${a}deg)`;
    gFill.setAttribute('d', a - A0 > 0.5 ? arc(A0, a, 70) : '');
    const tt = String(Math.round(temp));
    if (tt !== lastTempTxt) { gTemp.textContent = tt; lastTempTxt = tt; }
    const [st, stall] = stateAt(t, temp);
    if (st !== lastState) { gState.textContent = st; gState.classList.toggle('is-stall', stall); lastState = st; }
    const p = pitAt(t), pt2 = p < 1 ? 'cold' : String(Math.round(p));
    if (pt2 !== lastPit) { gPit.textContent = pt2; lastPit = pt2; }
    const c = clockText(t);
    if (c !== lastClock) { gClock.textContent = c; lastClock = c; }
  }

  /* ---------- Notes tied to points in the footage ---------- */
  const NOTES = [
    { shot: 2, a: [0.53, 0.27], b: [0.39, 0.40], at: 0.12, t: 'Salt and pepper, 1:1', d: 'Kosher salt and coarse black pepper, nothing else.', rot: -2 },
    { shot: 2, a: [0.42, 0.66], b: [0.36, 0.72], at: 0.32, t: '16-mesh pepper', d: 'Coarse enough to build a crust overnight.', rot: 1.5 },
    { shot: 2, a: [0.30, 0.62], b: [0.27, 0.66], at: 0.52, t: 'Prime packer', d: 'About 14 lb, fat trimmed to a quarter inch.', rot: -1 },
    { shot: 5, from: 0.55, a: [0.344, 0.563], b: [0.43, 0.62], at: 0.62, t: 'Smoke ring', d: 'The pink band from a clean post oak fire.', rot: 1.5 },
    { shot: 5, from: 0.55, a: [0.564, 0.643], b: [0.65, 0.30], at: 0.74, t: 'Bark', d: 'Pepper, salt, smoke and rendered fat. Nothing else.', rot: -2 }
  ];
  const notesEl = $('#filmSpots');
  const noteEls = NOTES.map(n => {
    const el = document.createElement('div'); el.className = 'note';
    el.style.setProperty('--rot', n.rot + 'deg');
    const line = document.createElement('span'); line.className = 'note__line';
    const pin = document.createElement('button'); pin.type = 'button'; pin.className = 'note__pin';
    pin.setAttribute('aria-label', n.t); pin.setAttribute('aria-expanded', 'false');
    const card = document.createElement('div'); card.className = 'note__card';
    const b = document.createElement('b'); b.textContent = n.t;
    card.append(b, document.createTextNode(n.d));
    el.append(line, pin, card); notesEl.append(el);
    const st = { el, line, pin, card, forced: null };
    pin.addEventListener('click', () => { st.forced = !el.classList.contains('is-open'); });
    return st;
  });
  function notes(f) {
    if (!F) return;
    const shot = Math.min(5, Math.floor(f / PER)), local = (f - shot * PER) / (PER - 1), i = Math.round(f);
    const small = kind === 'm';
    let capTop = innerHeight;
    const capOn = caps.find(c => c.classList.contains('is-on'));
    if (capOn) capTop = capOn.getBoundingClientRect().top;
    const placed = [];
    NOTES.forEach((n, j) => {
      const s = noteEls[j];
      const on = n.shot === shot && local > (n.from || 0.04) && local < 0.985;
      const k = ease(clamp(local));
      const [X, Y] = toScreen(lerp(n.a[0], n.b[0], k), lerp(n.a[1], n.b[1], k), i, F);
      const topMin = small ? 240 : 70;
      const vis = on && X > 10 && X < innerWidth - 10 && Y > topMin && Y < capTop - 10;
      s.el.classList.toggle('is-on', vis);
      if (!on) s.forced = null;
      const open = vis && (s.forced !== null ? s.forced : local >= n.at);
      s.el.classList.toggle('is-open', open);
      s.pin.setAttribute('aria-expanded', String(open));
      if (!vis) return;
      s.el.style.transform = `translate3d(${X}px, ${Y}px, 0)`;
      const w = s.card.offsetWidth || 200, h = s.card.offsetHeight || 60;
      const left = X > innerWidth * 0.5;
      let dx = left ? -(small ? 30 : 70) - w : (small ? 30 : 70);
      let dy = -h - (small ? 30 : 50);
      dx = clamp(X + dx, 10, innerWidth - 10 - w) - X;
      dy = clamp(Y + dy, topMin, capTop - 14 - h) - Y;
      for (let tries = 0; tries < 4; tries++) {
        const r = { l: X + dx, t: Y + dy, r: X + dx + w, b: Y + dy + h };
        const o = placed.find(q => r.l < q.r + 8 && r.r > q.l - 8 && r.t < q.b + 8 && r.b > q.t - 8);
        if (!o) break;
        dy = (r.t < o.t ? o.t - h - 10 : o.b + 10) - Y;
      }
      if (open) placed.push({ l: X + dx, t: Y + dy, r: X + dx + w, b: Y + dy + h });
      s.card.style.left = dx + 'px'; s.card.style.top = dy + 'px';
      const ax = dx > 0 ? dx : dx + w, ay = dy > 0 ? dy : dy + h;
      const len = Math.hypot(ax, ay);
      s.line.style.width = len + 'px';
      s.line.style.transform = `rotate(${Math.atan2(ay, ax)}rad)`;
    });
  }

  /* ---------- Embers and smoke: driven by the fire and by how fast you scroll ---------- */
  const embers = [], smoke = [];
  let vel = 0, lastScrollP = 0;
  function fireAt(t) {
    // 0 to 1: how hard the fire is burning in frame
    if (t < 25) return 0.15;
    if (t < 160) return 1;
    if (t < 185) return 0.35;
    if (t < 560) return 0.7;
    if (t < 830) return 0.3;
    return 0.08;
  }
  function smokeAt(t) {
    if (t < 25) return 0.1;
    if (t < 160) return 0.45;
    if (t < 185) return 0.15;
    if (t < 560) return 1;
    if (t < 830) return 0.6;
    return 0.35; // steam off the slices
  }
  function spawnEmber(W, H, heat) {
    embers.push({ x: Math.random() * W, y: H + 10, vx: (Math.random() - 0.5) * 18, vy: -(40 + Math.random() * 90) * (0.6 + heat), life: 0, max: 2 + Math.random() * 3, r: 0.8 + Math.random() * 1.8, wob: Math.random() * 6.28 });
  }
  function spawnSmoke(W, H) {
    smoke.push({ x: W * (0.15 + Math.random() * 0.7), y: H * (0.75 + Math.random() * 0.3), vx: (Math.random() - 0.3) * 14, vy: -(10 + Math.random() * 16), r: 80 + Math.random() * 140, life: 0, max: 7 + Math.random() * 5 });
  }
  function particles(dt, t) {
    const W = fx.width, H = fx.height;
    fctx.clearRect(0, 0, W, H);
    if (reduce || !filmVisible) return;
    const heat = fireAt(t), sm = smokeAt(t);
    const boost = clamp(Math.abs(vel) * 40, 0, 2.5);
    const maxE = Math.round(10 + 40 * heat), maxS = Math.round(2 + 6 * sm);
    if (embers.length < maxE && Math.random() < (heat * 0.9 + boost * 0.4)) spawnEmber(W, H, heat);
    if (smoke.length < maxS && Math.random() < 0.05 * sm + boost * 0.02) spawnSmoke(W, H);
    fctx.globalCompositeOperation = 'source-over';
    for (let i = smoke.length - 1; i >= 0; i--) {
      const p = smoke[i];
      p.life += dt; p.x += p.vx * dt; p.y += (p.vy - boost * 30) * dt; p.r += 8 * dt;
      const a = Math.sin(Math.PI * clamp(p.life / p.max)) * 0.07 * (0.4 + sm);
      if (p.life > p.max) { smoke.splice(i, 1); continue; }
      const g = fctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
      g.addColorStop(0, `rgba(170,190,206,${a})`); g.addColorStop(1, 'rgba(170,190,206,0)');
      fctx.fillStyle = g; fctx.beginPath(); fctx.arc(p.x, p.y, p.r, 0, 6.283); fctx.fill();
    }
    fctx.globalCompositeOperation = 'lighter';
    for (let i = embers.length - 1; i >= 0; i--) {
      const p = embers[i];
      p.life += dt; p.wob += dt * 3;
      p.x += (p.vx + Math.sin(p.wob) * 14) * dt; p.y += (p.vy * (1 + boost)) * dt;
      if (p.life > p.max || p.y < -20) { embers.splice(i, 1); continue; }
      const k = 1 - p.life / p.max;
      const g = fctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 5);
      g.addColorStop(0, `rgba(255,214,140,${0.9 * k})`); g.addColorStop(0.3, `rgba(255,110,40,${0.5 * k})`); g.addColorStop(1, 'rgba(255,80,20,0)');
      fctx.fillStyle = g; fctx.beginPath(); fctx.arc(p.x, p.y, p.r * 5, 0, 6.283); fctx.fill();
    }
    fctx.globalCompositeOperation = 'source-over';
  }

  /* ---------- Captions, log, letterbox ---------- */
  function ui(f, p) {
    const t = timeAt(f);
    gauge(t);
    const shot = Math.min(5, Math.floor(f / PER)), local = (f - shot * PER) / PER;
    caps.forEach(cap => {
      const s = +cap.dataset.shot;
      let on;
      if (s === 0) on = f < 26;
      else if (s === 5) on = f >= 222;
      else on = shot === s && local > 0.08 && local < 0.88;
      cap.classList.toggle('is-on', on);
    });
    let now = -1;
    logItems.forEach((li, n) => { if (t >= +li.dataset.t) now = n; });
    logItems.forEach((li, n) => { li.classList.toggle('is-done', n < now); li.classList.toggle('is-now', n === now); });
    $('#log').classList.toggle('is-hidden', f < 22 || now < 0);
    const lb = f < 14 ? 1 - ease(f / 14) : 0;
    stage.style.setProperty('--lb', lb.toFixed(3));
    stage.style.setProperty('--glow', fireAt(t).toFixed(2));
    vel = p - lastScrollP; lastScrollP = p;
  }

  function filmProgress() {
    const r = film.getBoundingClientRect();
    return clamp(-r.top / (film.offsetHeight - innerHeight));
  }
  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    target = filmProgress();
    if (reduce) cur = target;
    else { cur += (target - cur) * (1 - Math.exp(-dt * 8)); if (Math.abs(target - cur) < 0.00005) cur = target; }
    const f = frameFromProgress(cur);
    if (filmVisible && (dirty || Math.abs(f - lastF) > 0.001)) { draw(f); lastF = f; dirty = false; }
    if (Math.abs(cur - lastP) > 0.00003) { ui(f, cur); lastP = cur; } else vel *= 0.9;
    if (filmVisible) { notes(f); particles(dt, timeAt(f)); }
    bar.classList.toggle('is-solid', film.getBoundingClientRect().bottom < 70);
    requestAnimationFrame(loop);
  }
  new IntersectionObserver(es => { filmVisible = es[0].isIntersecting; if (filmVisible) dirty = true; }).observe(film);
  addEventListener('resize', size);
  size();
  ui(0, 0);
  requestAnimationFrame(loop);
  boot();

  /* ---------- The cook chart ---------- */
  const svg = $('#chartSvg'), tip = $('#chartTip'), range = $('#chartRange'), chartBox = $('#chart');
  if (svg && range) {
    const ns = 'http://www.w3.org/2000/svg';
    const W = 1200, H = 420, PL = 50, PR = 20, PT = 20, PB = 40;
    const T0 = 140, T1 = 860; // 11:00 pm to 11:00 am
    const X = t => PL + (t - T0) / (T1 - T0) * (W - PL - PR);
    const Y = v => PT + (1 - (v - 0) / 220) * (H - PT - PB);
    const el = (n, a) => { const e = document.createElementNS(ns, n); for (const k in a) e.setAttribute(k, a[k]); svg.append(e); return e; };
    const defs = document.createElementNS(ns, 'defs');
    const lg = document.createElementNS(ns, 'linearGradient');
    lg.setAttribute('id', 'cookFill'); lg.setAttribute('x1', '0'); lg.setAttribute('y1', '0'); lg.setAttribute('x2', '0'); lg.setAttribute('y2', '1');
    [['0', 'rgba(255,90,31,.32)'], ['1', 'rgba(255,90,31,0)']].forEach(([o, c]) => { const s = document.createElementNS(ns, 'stop'); s.setAttribute('offset', o); s.setAttribute('stop-color', c); lg.append(s); });
    defs.append(lg); svg.append(defs);
    el('rect', { class: 'stall', x: X(450), y: PT, width: X(560) - X(450), height: H - PT - PB });
    const sl = el('text', { class: 'stall-l', x: X(505), y: PT + 18, 'text-anchor': 'middle' }); sl.textContent = 'THE STALL';
    for (let v = 50; v <= 200; v += 50) {
      el('line', { class: 'grid', x1: PL, x2: W - PR, y1: Y(v), y2: Y(v) });
      const tx = el('text', { class: 'axis', x: PL - 10, y: Y(v) + 4, 'text-anchor': 'end' }); tx.textContent = v + '°';
    }
    for (let t = 140; t <= 860; t += 120) {
      const tx = el('text', { class: 'axis', x: X(t), y: H - 12, 'text-anchor': 'middle' }); tx.textContent = clockText(t).replace(':00', '');
    }
    let d = '';
    for (let t = T0; t <= T1; t += 4) d += (t === T0 ? 'M' : 'L') + X(t).toFixed(1) + ',' + Y(tempAt(t)).toFixed(1);
    el('path', { class: 'area', d: d + `L${X(T1)},${Y(0)}L${X(T0)},${Y(0)}Z` });
    el('path', { class: 'line', d });
    const cursor = el('line', { class: 'cursor', y1: PT, y2: H - PB });
    const dot = el('circle', { class: 'dot', r: 7 });
    const NOTE = t => t < 185 ? 'Fire up, brisket resting' : t < 380 ? 'Taking smoke' : t < 450 ? 'Bark setting' : t < 560 ? 'The stall: moisture cools the surface' : t < 830 ? 'Wrapped in pink paper' : 'Probe tender, rest it';
    const tipT = $('#tipT'), tipV = $('#tipV'), tipN = $('#tipN');
    const set = () => {
      const t = lerp(T0, T1, +range.value / 1000), v = tempAt(t);
      cursor.setAttribute('x1', X(t)); cursor.setAttribute('x2', X(t));
      dot.setAttribute('cx', X(t)); dot.setAttribute('cy', Y(v));
      tipT.textContent = clockText(t); tipV.textContent = Math.round(v) + '°'; tipN.textContent = NOTE(t);
      range.setAttribute('aria-valuetext', `${clockText(t)}, ${Math.round(v)} degrees`);
      const box = svg.getBoundingClientRect(), outer = chartBox.getBoundingClientRect();
      const px = box.left - outer.left + X(t) / W * box.width, py = box.top - outer.top + Y(v) / H * box.height;
      const tw = tip.offsetWidth || 160;
      tip.style.setProperty('--tx', clamp(px - tw / 2, 8, outer.width - tw - 8) + 'px');
      tip.style.setProperty('--ty', Math.max(0, py - 110) + 'px');
    };
    range.addEventListener('input', set);
    addEventListener('resize', set);
    set();
  }

  /* ---------- Catering estimator ---------- */
  const est = $('#est'), guests = $('#guests'), gOut = $('#guestsOut');
  const totalEl = $('#estTotal'), linesEl = $('#estLines'), note = $('#estNote');
  const MEAT = { brisket: ['Brisket', 30], ribs: ['Pork ribs', 24], sausage: ['Sausage', 18], turkey: ['Turkey', 24] };
  const SIDES = { 2: 4, 3: 5.5, 4: 7 };
  let shown = 0, raf = 0;
  const money = n => '$' + Math.round(n).toLocaleString('en-US');
  function calc() {
    const g = +guests.value;
    gOut.textContent = String(g);
    const meats = $$('input[name="meat"]:checked', est).map(i => i.value);
    const lbs = g * 0.5, each = lbs / Math.max(1, meats.length);
    const lines = meats.map(m => [`${MEAT[m][0]}, ${Math.round(each)} lb`, each * MEAT[m][1]]);
    const sides = +($('input[name="sides"]:checked', est) || { value: 2 }).value;
    lines.push([`${sides} sides for ${g}`, g * SIDES[sides]]);
    const pit = ($('input[name="svc"]:checked', est) || {}).value === 'pit';
    lines.push(pit ? ['Pit and pitmaster on site', 450 + g * 2] : ['Drop-off in Fort Worth', 75]);
    linesEl.textContent = '';
    lines.forEach(([l, v]) => { const li = document.createElement('li'); const a = document.createElement('span'); a.textContent = l; const b = document.createElement('span'); b.textContent = money(v); li.append(a, b); linesEl.append(li); });
    const sum = lines.reduce((s, [, v]) => s + v, 0);
    const from = shown, t0 = performance.now();
    cancelAnimationFrame(raf);
    const step = now => { const k = reduce ? 1 : ease(clamp((now - t0) / 450)); shown = lerp(from, sum, k); totalEl.textContent = Math.round(shown).toLocaleString('en-US'); if (k < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
  }
  if (est) {
    est.addEventListener('input', calc);
    est.addEventListener('change', e => {
      if (e.target.name === 'meat' && !$$('input[name="meat"]:checked', est).length) { e.target.checked = true; calc(); }
    });
    calc();
    $('#estHold').addEventListener('click', () => {
      note.textContent = `Held: ${guests.value} guests, ${totalEl.textContent ? '$' + totalEl.textContent : ''}. This is a concept site, so nothing was sent. A real build books it into the restaurant's catering calendar.`;
    });
  }
})();
