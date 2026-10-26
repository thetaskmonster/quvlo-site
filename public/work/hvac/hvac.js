/* Norther Comfort Co. (concept by Quvlo). No libraries; model-viewer loads only for the 3D section. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const ease = k => k * k * (3 - 2 * k);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root = document.documentElement;

  /* ---------- Story data ---------- */
  const PER = 40;
  // Clock (minutes after midnight) at the first frame of each shot, and at the very end.
  const CLOCK = [940, 952, 990, 1040, 1110, 1155, 1155];
  // Inside temperature: holds at 104 until the new unit runs, then falls to 72.
  const tempAt = f => 104 - 32 * ease(clamp((f - 136) / (204 - 136)));
  // Thermostat screen in the living room shot, as fractions of the source frame.
  const THERMO = { shot: 4, tl: [0.7430, 0.2118], tr: [0.7982, 0.1993], bl: [0.7438, 0.2803] };
  // Hotspots: position at the start (a) and end (b) of their shot; "at" is when the card opens.
  const SPOTS = [
    { shot: 1, a: [0.50, 0.17], b: [0.50, 0.18], at: 0.12, t: 'Fan motor', d: 'Bearings worn. It turns at a third of its speed, so the heat stays in the coil.' },
    { shot: 1, a: [0.42, 0.52], b: [0.40, 0.55], at: 0.32, t: 'Coil', d: 'Fins crushed flat. Air cannot pass through, so the house cannot shed heat.' },
    { shot: 1, a: [0.69, 0.35], b: [0.75, 0.38], at: 0.52, t: 'Capacitor', d: 'Bulged and leaking. A twelve dollar part, but at fifteen years the unit is past saving.' },
    { shot: 3, a: [0.55, 0.52], b: [0.56, 0.53], at: 0.10, t: 'Variable-speed fan', d: 'Runs slow and quiet most of the day instead of slamming on and off.' },
    { shot: 3, a: [0.31, 0.62], b: [0.26, 0.66], at: 0.28, t: 'Line set', d: 'New copper, fully insulated, sealed where it enters the brick.' },
    { shot: 3, a: [0.47, 0.82], b: [0.45, 0.86], at: 0.46, t: 'Pad', d: 'Level composite pad, raised so rain drains away from the unit.' },
    { shot: 3, a: [0.63, 0.60], b: [0.66, 0.62], at: 0.62, t: 'Charge', d: 'Checked on gauges and written on your invoice.' }
  ];
  const HEAT2 = [255, 193, 94], COOL2 = [159, 219, 255];
  const mix = (a, b, k) => `rgb(${a.map((v, i) => Math.round(lerp(v, b[i], k))).join(',')})`;

  /* ---------- Film ---------- */
  const film = $('#film'), canvas = $('#filmCanvas'), ctx = canvas.getContext('2d', { alpha: false });
  const svg = $('#filmLines'), spotsEl = $('#filmSpots');
  const hudTemp = $('#hudTemp'), hudClock = $('#hudClock'), hudFill = $('#hudFill');
  const rail = $('#rail'), railItems = $$('li', rail);
  const caps = $$('.cap'), book = $('#book'), loader = $('#loader'), loadPct = $('#loadPct');
  const bar = $('.bar');

  let M = null, kind = 'd', N = 0;
  const imgs = [], fgs = {};
  let target = 0, cur = 0, lastDrawn = -1, lastP = -1, dirty = true, filmVisible = true;

  const pick = () => (innerWidth / innerHeight < 0.85 || innerWidth < 760) ? 'm' : 'd';

  function frameUrl(i) { return `f/${kind}/${String(i + 1).padStart(3, '0')}.webp`; }
  function fgUrl(i) { return `fg/${kind}/${String(i + 1).padStart(3, '0')}.webp`; }

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
    const fgSet = new Set(M.fg || []);
    // First shot plus its sky cut-outs gate the loader, so the opening never stutters.
    const first = [];
    for (let i = 0; i < PER; i++) first.push(i);
    const gate = first.length + fgSet.size;
    let done = 0;
    const tick = () => { done++; loadPct.textContent = String(Math.min(100, Math.round(done / gate * 100))); };
    await Promise.all([
      ...first.map(i => load(frameUrl(i)).then(im => { imgs[i] = im; dirty = true; tick(); })),
      ...[...fgSet].map(n => load(fgUrl(n - 1)).then(im => { fgs[n - 1] = im; tick(); }))
    ]);
    openLoader();
    // Then the rest, in story order, a few at a time.
    let next = PER;
    const worker = async () => { while (next < N) { const i = next++; imgs[i] = await load(frameUrl(i)); dirty = true; } };
    await Promise.all([worker(), worker(), worker(), worker(), worker()]);
  }

  function openLoader() {
    document.body.classList.remove('is-loading');
    if (reduce) { loader.classList.add('is-gone'); return; }
    loader.classList.add('is-open');
    setTimeout(() => loader.classList.add('is-gone'), 1300);
  }

  /* Canvas sizing and the source-to-screen transform */
  let cw = 0, ch = 0, dpr = 1;
  function size() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = canvas.getBoundingClientRect();
    cw = Math.round(r.width * dpr); ch = Math.round(r.height * dpr);
    if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
    if (M && pick() !== kind) location.reload();
    dirty = true;
  }

  // Where a frame sits on the canvas (cover fit).
  function fit(fw, fh) {
    const s = Math.max(cw / fw, ch / fh);
    return { s, x: (cw - fw * s) / 2, y: (ch - fh * s) / 2, fw, fh };
  }
  // Source fraction (u, v) to canvas pixels, for frame i.
  function toCanvas(u, v, i, F) {
    let x = u;
    if (kind === 'm') x = (u - M.m.crop[i]) / M.m.cropW;
    return [F.x + x * F.fw * F.s, F.y + v * F.fh * F.s];
  }

  function nearestLoaded(i) {
    if (imgs[i]) return i;
    for (let d = 1; d < N; d++) { if (imgs[i - d]) return i - d; if (imgs[i + d]) return i + d; }
    return -1;
  }

  function frameFromProgress(p) { return clamp((p - 0.015) / 0.885) * (N - 1); }

  function draw(f) {
    if (!N) return;
    const i0 = Math.floor(f), i1 = Math.min(N - 1, i0 + 1), k = f - i0;
    const a = nearestLoaded(i0);
    if (a < 0) return;
    const A = imgs[a];
    const F = fit(A.naturalWidth, A.naturalHeight);
    const useFg = fgs[Math.round(f)];
    if (useFg) {
      const j = Math.round(f), J = imgs[j] || A;
      ctx.globalAlpha = 1; ctx.drawImage(J, F.x, F.y, F.fw * F.s, F.fh * F.s);
      drawBigTemp(j, F);
      ctx.drawImage(useFg, F.x, F.y, F.fw * F.s, F.fh * F.s);
    } else {
      ctx.globalAlpha = 1; ctx.drawImage(A, F.x, F.y, F.fw * F.s, F.fh * F.s);
      if (k > 0.02 && imgs[i1] && a === i0) { ctx.globalAlpha = k; ctx.drawImage(imgs[i1], F.x, F.y, F.fw * F.s, F.fh * F.s); ctx.globalAlpha = 1; }
    }
    const shot = Math.min(5, Math.floor(f / PER));
    if (shot === THERMO.shot) drawThermostat(f, Math.round(f), F);
    placeSpots(f, F);
  }

  // "104°" set behind the roofline at the end of the drone shot.
  function drawBigTemp(j, F) {
    const fg = M.fg || [];
    const first = fg[0] - 1;
    const k = ease(clamp((j - first) / 4));
    if (k <= 0) return;
    const [, top] = toCanvas(0.5, 0.08, j, F);
    const [, base] = toCanvas(0.5, 0.40, j, F);
    const [, roof] = toCanvas(0.5, 0.27, j, F);
    const h = base - top;
    const [cx] = toCanvas(0.5, 0, j, F);
    ctx.save();
    ctx.globalAlpha = k;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.font = `900 ${Math.round(h)}px Archivo`;
    if ('fontStretch' in ctx) ctx.fontStretch = 'ultra-expanded';
    const maxW = cw * 0.84;
    const w = ctx.measureText('104°').width;
    const s = Math.min(1, maxW / w);
    const capH = h * 0.72 * s;
    const y = roof + capH * 0.4; // 60% of the figure shows above the roof
    const grad = ctx.createLinearGradient(0, y - capH, 0, y);
    grad.addColorStop(0, '#ffb347'); grad.addColorStop(1, '#ff5a0a');
    ctx.fillStyle = grad;
    ctx.translate(cx, y);
    ctx.scale(s, s);
    ctx.fillText('104°', 0, 0);
    ctx.restore();
  }

  // The live number drawn onto the thermostat in the footage.
  function drawThermostat(f, i, F) {
    const P = (uv) => toCanvas(uv[0], uv[1], i, F);
    const tl = P(THERMO.tl), tr = P(THERMO.tr), bl = P(THERMO.bl);
    const w = Math.hypot(tr[0] - tl[0], tr[1] - tl[1]), h = Math.hypot(bl[0] - tl[0], bl[1] - tl[1]);
    if (w < 4) return;
    const temp = Math.round(tempAt(f)), t = (104 - tempAt(f)) / 32;
    ctx.save();
    ctx.setTransform((tr[0] - tl[0]) / w, (tr[1] - tl[1]) / w, (bl[0] - tl[0]) / h, (bl[1] - tl[1]) / h, tl[0], tl[1]);
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#0c1a1d'); g.addColorStop(1, '#091315');
    ctx.fillStyle = g;
    ctx.fillRect(-w * 0.02, -h * 0.02, w * 1.04, h * 1.04);
    const col = mix(HEAT2, COOL2, t);
    ctx.fillStyle = col;
    ctx.shadowColor = col; ctx.shadowBlur = h * 0.35;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `500 ${h * 0.6}px "Plex Mono", monospace`;
    ctx.fillText(`${temp}°`, w * 0.52, h * 0.56);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 0.65;
    ctx.font = `500 ${h * 0.13}px "Plex Mono", monospace`;
    ctx.textAlign = 'left';
    ctx.fillText(temp > 72 ? 'COOLING' : 'HOLDING', w * 0.08, h * 0.17);
    const rg = ctx.createLinearGradient(0, 0, w, h);
    rg.addColorStop(0, 'rgba(255,255,255,0.10)'); rg.addColorStop(0.5, 'rgba(255,255,255,0)');
    ctx.globalAlpha = 1; ctx.fillStyle = rg; ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  /* Hotspots with leader lines that draw in */
  const spotEls = SPOTS.map(S => {
    const el = document.createElement('div');
    el.className = 'spot';
    const btn = document.createElement('button');
    btn.className = 'spot__dot'; btn.type = 'button';
    btn.setAttribute('aria-label', S.t);
    btn.setAttribute('aria-expanded', 'false');
    const card = document.createElement('div');
    card.className = 'spot__card';
    const b = document.createElement('b'); b.textContent = S.t;
    card.append(b, document.createTextNode(S.d));
    el.append(btn, card);
    spotsEl.append(el);
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('class', 'lead'); path.setAttribute('pathLength', '1');
    svg.append(path);
    const state = { el, card, path, btn, forced: null };
    btn.addEventListener('click', () => { state.forced = !(state.el.classList.contains('is-open')); });
    return state;
  });

  let capRect = null;
  function placeSpots(f, F) {
    const placed = [];
    const capOn = caps.find(c => c.classList.contains('is-on'));
    capRect = capOn ? capOn.getBoundingClientRect() : null;
    const shot = Math.min(5, Math.floor(f / PER));
    const local = (f - shot * PER) / (PER - 1);
    const i = Math.round(f);
    const small = kind === 'm';
    SPOTS.forEach((S, n) => {
      const s = spotEls[n];
      const on = S.shot === shot && local > 0.03 && local < 0.97;
      const k = ease(clamp(local));
      const [x, y] = toCanvas(lerp(S.a[0], S.b[0], k), lerp(S.a[1], S.b[1], k), i, F);
      const X = x / dpr, Y = y / dpr;
      const vis = on && X > 8 && X < innerWidth - 8 && Y > 60 && Y < innerHeight - 40;
      s.el.classList.toggle('is-on', vis);
      if (!on) s.forced = null;
      const open = vis && (s.forced !== null ? s.forced : local >= S.at);
      s.el.classList.toggle('is-open', open);
      s.btn.setAttribute('aria-expanded', String(open));
      s.path.classList.toggle('is-on', open);
      if (!vis) return;
      s.el.style.transform = `translate3d(${X}px, ${Y}px, 0)`;
      const cwid = s.card.offsetWidth || 220, chei = s.card.offsetHeight || 70;
      const right = X < innerWidth * (small ? 0.5 : 0.62);
      let dx = right ? (small ? 28 : 64) : -(small ? 28 : 64) - cwid;
      let dy = -chei - (small ? 26 : 46);
      const cap = capRect;
      const hits = (x, y) => cap && x < cap.right && x + cwid > cap.left && y < cap.bottom && y + chei > cap.top;
      if (Y + dy < 70 || hits(X + dx, Y + dy)) dy = small ? 26 : 40;
      if (hits(X + dx, Y + dy)) dx = right ? Math.max(dx, cap.right - X + 16) : dx;
      dx = clamp(X + dx, 10, innerWidth - 10 - cwid) - X;
      dy = clamp(Y + dy, 70, innerHeight - 20 - chei) - Y;
      for (let tries = 0; tries < 4; tries++) {
        const r = { l: X + dx, t: Y + dy, r: X + dx + cwid, b: Y + dy + chei };
        const o = placed.find(q => r.l < q.r + 8 && r.r > q.l - 8 && r.t < q.b + 8 && r.b > q.t - 8);
        if (!o) break;
        dy = (r.t < o.t ? o.t - chei - 10 : o.b + 10) - Y;
      }
      if (open) placed.push({ l: X + dx, t: Y + dy, r: X + dx + cwid, b: Y + dy + chei });
      s.card.style.left = dx + 'px'; s.card.style.top = dy + 'px';
      const below = dy > 0;
      const ax = X + dx > X ? X + dx : X + dx + cwid, ay = below ? Y + dy : Y + dy + chei;
      const ex = X + (ax > X ? 1 : -1) * Math.min(Math.abs(ay - Y) * 0.6, Math.abs(ax - X));
      s.path.setAttribute('d', `M${X},${Y} L${ex},${ay} L${ax},${ay}`);
    });
  }

  /* HUD, rail, captions, colour temperature */
  const fmtClock = m => { const h = Math.floor(m / 60), mm = Math.round(m % 60); return `${h > 12 ? h - 12 : h}:${String(mm).padStart(2, '0')} pm`; };
  let lastTemp = null, lastClock = null;
  function ui(f, p) {
    const shot = Math.min(5, Math.floor(f / PER));
    const local = (f - shot * PER) / PER;
    const temp = tempAt(f);
    const t = (104 - temp) / 32;
    root.style.setProperty('--t', t.toFixed(3));
    root.style.setProperty('--tc', ease(clamp((t - 0.38) / 0.24)).toFixed(3));
    const tr = Math.round(temp);
    if (tr !== lastTemp) { hudTemp.textContent = String(tr); lastTemp = tr; }
    hudFill.setAttribute('width', String(Math.max(4, 120 * (temp - 60) / 44)));
    const m = lerp(CLOCK[shot], CLOCK[shot + 1], clamp(local));
    const c = fmtClock(m);
    if (c !== lastClock) { hudClock.textContent = c; lastClock = c; }
    rail.style.setProperty('--p', (f / (N - 1)).toFixed(4));
    railItems.forEach((li, n) => li.classList.toggle('is-on', n <= shot));
    caps.forEach(cap => {
      const s = +cap.dataset.shot;
      let on;
      if (s === 0) on = f < 22;
      else if (s === 5) on = f >= 205;
      else on = shot === s && local > 0.06 && local < 0.9;
      cap.classList.toggle('is-on', on);
    });
    book.classList.toggle('is-on', p > 0.9);
  }

  function filmProgress() {
    const r = film.getBoundingClientRect();
    const span = film.offsetHeight - innerHeight;
    return clamp(-r.top / span);
  }

  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    target = filmProgress();
    if (reduce) cur = target;
    else { cur += (target - cur) * (1 - Math.exp(-dt * 9)); if (Math.abs(target - cur) < 0.00005) cur = target; }
    const f = frameFromProgress(cur);
    if (filmVisible && (dirty || Math.abs(f - lastDrawn) > 0.001)) { draw(f); lastDrawn = f; dirty = false; }
    if (Math.abs(cur - lastP) > 0.00005) { ui(f, cur); lastP = cur; }
    bar.classList.toggle('is-solid', film.getBoundingClientRect().bottom < 70);
    requestAnimationFrame(loop);
  }

  new IntersectionObserver(es => { filmVisible = es[0].isIntersecting; if (filmVisible) dirty = true; }).observe(film);
  addEventListener('resize', size);
  size();
  requestAnimationFrame(loop);
  boot();

  // "Book" links jump to the end of the film, where booking sits over the dusk scene.
  $$('a[href="#book"]').forEach(a => a.addEventListener('click', e => {
    e.preventDefault();
    const top = film.offsetTop + (film.offsetHeight - innerHeight) * 0.96;
    scrollTo({ top, behavior: 'auto' });
    setTimeout(() => book.focus({ preventScroll: true }), 700);
  }));

  /* ---------- Booking (concept: nothing is sent anywhere) ---------- */
  const days = $('#bookDays'), times = $('#bookTimes'), note = $('#bookNote');
  const SLOTS = ['8–10 am', '10–12', '1–3 pm', '3–5 pm', '6–8 pm'];
  const dayFmt = new Intl.DateTimeFormat('en-US', { weekday: 'short' });
  let selDay = null, selTime = null;
  function chip(label, small, group, onPick) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'chip'; b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', 'false');
    if (small) { const s = document.createElement('small'); s.textContent = small; b.append(s); }
    b.append(document.createTextNode(label));
    b.addEventListener('click', () => { $$('.chip', group).forEach(x => x.setAttribute('aria-checked', 'false')); b.setAttribute('aria-checked', 'true'); onPick(); });
    group.append(b);
    return b;
  }
  const d0 = new Date();
  for (let n = 0, added = 0; added < 5 && n < 9; n++) {
    const d = new Date(d0.getFullYear(), d0.getMonth(), d0.getDate() + n);
    if (d.getDay() === 0) continue;
    const label = n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : dayFmt.format(d);
    const text = `${label} ${d.getDate()}`;
    const b = chip(String(d.getDate()), label, days, () => { selDay = text; });
    if (added === 0) { b.setAttribute('aria-checked', 'true'); selDay = text; }
    added++;
  }
  SLOTS.forEach((s, n) => { const b = chip(s, null, times, () => { selTime = s; }); if (n === 2) { b.setAttribute('aria-checked', 'true'); selTime = s; } });
  $('#bookGo').addEventListener('click', () => {
    note.textContent = `Held: ${selDay}, ${selTime}. This is a concept site, so nothing was sent. A real build books it straight into the company's calendar.`;
  });

  /* ---------- Word-fill paragraph ---------- */
  const fillP = $('#fillP');
  if (fillP) {
    const words = fillP.textContent.trim().split(/\s+/);
    const hot = new Set(['twelve', 'dollar', 'capacitor,', 'cottonwood,', '2009.']);
    fillP.textContent = '';
    const spans = words.map((w, n) => {
      const s = document.createElement('span');
      s.className = 'w' + (hot.has(w) ? ' is-hot' : '');
      s.textContent = w;
      fillP.append(s);
      if (n < words.length - 1) fillP.append(document.createTextNode(' '));
      return s;
    });
    const sec = fillP.parentElement;
    const upd = () => {
      const r = sec.getBoundingClientRect();
      const k = clamp((innerHeight * 0.85 - r.top) / (r.height * 0.9));
      const on = reduce ? spans.length : Math.round(k * spans.length);
      spans.forEach((s, n) => s.classList.toggle('is-on', n < on));
    };
    addEventListener('scroll', upd, { passive: true }); upd();
  }

  /* ---------- Thermal slider: the heading heats and cools with it ---------- */
  const ba = $('#ba'), baRange = $('#baRange'), thermal = $('.thermal');
  if (ba && baRange) {
    const set = v => { ba.style.setProperty('--x', v + '%'); thermal.style.setProperty('--x', v + '%'); thermal.style.setProperty('--t', (1 - v / 100).toFixed(3)); thermal.style.setProperty('--tc', (1 - v / 100).toFixed(3)); };
    baRange.addEventListener('input', () => set(+baRange.value));
    set(50);
  }

  /* ---------- Estimator with a rolling total ---------- */
  const est = $('#est'), totalEl = $('#estTotal'), unitEl = $('#estUnit');
  let shown = 129, raf = 0;
  function total() {
    const v = n => +(est.querySelector(`input[name="${n}"]:checked`) || { value: 0 }).value;
    return { need: v('need'), sum: v('need') + v('size') + v('when') };
  }
  function roll() {
    const { need, sum } = total();
    if (need === 0) { cancelAnimationFrame(raf); totalEl.textContent = '0'; unitEl.textContent = 'free in-home quote for a new system'; shown = 0; return; }
    unitEl.textContent = 'flat price, parts and labor';
    const from = shown, t0 = performance.now();
    cancelAnimationFrame(raf);
    const step = now => {
      const k = reduce ? 1 : ease(clamp((now - t0) / 420));
      shown = Math.round(lerp(from, sum, k));
      totalEl.textContent = String(shown);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }
  if (est) est.addEventListener('change', roll);

  /* ---------- Service rows: a preview follows the cursor ---------- */
  const rows = $('#rows'), peek = $('#peek');
  if (rows && peek && matchMedia('(hover: hover)').matches) {
    $$('li', rows).forEach(li => {
      li.addEventListener('pointerenter', () => { peek.src = li.dataset.img; peek.classList.add('is-on'); });
      li.addEventListener('pointerleave', () => peek.classList.remove('is-on'));
    });
    rows.addEventListener('pointermove', e => {
      peek.style.setProperty('--px', (e.clientX + 24) + 'px');
      peek.style.setProperty('--py', (e.clientY - 110) + 'px');
    });
  }

  /* ---------- 3D unit: model-viewer loads only when this section is near ---------- */
  const view = $('#unitView'), loadBtn = $('#unitLoad');
  let mvLoaded = false;
  function load3d() {
    if (mvLoaded) return; mvLoaded = true;
    loadBtn.textContent = 'Loading…'; loadBtn.disabled = true;
    const s = document.createElement('script');
    s.type = 'module'; s.src = 'vendor/model-viewer-4.4.0.min.js';
    s.onload = () => {
      const mv = document.createElement('model-viewer');
      mv.setAttribute('src', 'img/unit.glb');
      mv.setAttribute('alt', 'A 3D model of the new heat pump unit that you can rotate.');
      mv.setAttribute('camera-controls', '');
      mv.setAttribute('touch-action', 'pan-y');
      mv.setAttribute('environment-image', 'neutral');
      mv.setAttribute('shadow-intensity', '1');
      mv.setAttribute('exposure', '1.05');
      mv.setAttribute('interaction-prompt', 'none');
      mv.setAttribute('camera-orbit', '35deg 72deg 105%');
      if (!reduce) { mv.setAttribute('auto-rotate', ''); mv.setAttribute('auto-rotate-delay', '0'); mv.setAttribute('rotation-per-second', '20deg'); }
      mv.addEventListener('load', () => { $('.unit__poster', view).style.opacity = '0'; loadBtn.remove(); });
      mv.addEventListener('error', () => { loadBtn.textContent = '3D unavailable'; });
      view.append(mv);
    };
    s.onerror = () => { loadBtn.textContent = '3D unavailable'; };
    document.head.append(s);
  }
  if (view && loadBtn) {
    loadBtn.addEventListener('click', load3d);
    new IntersectionObserver((es, o) => { if (es[0].isIntersecting) { load3d(); o.disconnect(); } }, { rootMargin: '600px 0px' }).observe(view);
  }

  /* ---------- Spec count-ups ---------- */
  $$('[data-count]').forEach(dd => {
    const n = +dd.dataset.count, rest = dd.textContent.replace(/^\d+/, '');
    new IntersectionObserver((es, o) => {
      if (!es[0].isIntersecting) return; o.disconnect();
      if (reduce) return;
      const t0 = performance.now();
      const step = now => { const k = ease(clamp((now - t0) / 900)); dd.textContent = Math.round(n * k) + rest; if (k < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    }).observe(dd);
  });
})();
