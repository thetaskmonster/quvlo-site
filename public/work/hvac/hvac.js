/* Norther Comfort Co. (concept by Quvlo). No libraries; model-viewer loads only for the 3D section. */
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

  /* ---------- Film (shared engine: film-engine.js) ---------- */
  const film = $('#film'), canvas = $('#filmCanvas');
  const svg = $('#filmLines'), spotsEl = $('#filmSpots');
  const hudTemp = $('#hudTemp'), hudClock = $('#hudClock'), hudFill = $('#hudFill');
  const rail = $('#rail'), railItems = $$('li', rail);
  const caps = $$('.cap'), book = $('#book'), loader = $('#loader'), loadPct = $('#loadPct');
  const bar = $('.bar');
  let N = 240, dpr = 1;

  let opened = false;
  function openLoader() {
    if (opened) return; opened = true;
    document.body.classList.remove('is-loading');
    if (reduce) { loader.classList.add('is-gone'); return; }
    loader.classList.add('is-open');
    setTimeout(() => loader.classList.add('is-gone'), 1300);
  }

  // Everything drawn over the footage reads the frame that is actually on screen (v).
  function onDraw(ctx, v) {
    dpr = v.dpr; N = v.N;
    const fg = v.extra('fg');
    if (fg) { drawBigTemp(ctx, v); ctx.drawImage(fg, v.rect.x, v.rect.y, v.rect.w, v.rect.h); }
    if (v.shot === THERMO.shot) drawThermostat(ctx, v);
    placeSpots(v);
  }

  // "104°" set behind the roofline at the end of the drone shot.
  function drawBigTemp(ctx, v) {
    const fg = (v.meta && v.meta.fg) || [];
    const first = fg[0] - 1;
    const k = ease(clamp((v.i - first) / 4));
    if (k <= 0) return;
    const [, top] = v.toCanvas(0.5, 0.08);
    const [, base] = v.toCanvas(0.5, 0.40);
    const [, roof] = v.toCanvas(0.5, 0.27);
    const h = base - top;
    const [cx] = v.toCanvas(0.5, 0);
    ctx.save();
    ctx.globalAlpha = k;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.font = `900 ${Math.round(h)}px Archivo`;
    if ('fontStretch' in ctx) ctx.fontStretch = 'ultra-expanded';
    const maxW = v.cw * 0.84;
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
  function drawThermostat(ctx, v) {
    const f = v.f;
    const P = uv => v.toCanvas(uv[0], uv[1]);
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
  let engine = null;
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
    // the film may be standing still, so ask for a repaint: placement runs with the drawn frame
    btn.addEventListener('click', () => { state.forced = !(state.el.classList.contains('is-open')); if (engine) engine.redraw(); });
    return state;
  });

  let capRect = null;
  function placeSpots(v) {
    const f = v.f;
    const placed = [];
    const capOn = caps.find(c => c.classList.contains('is-on'));
    capRect = capOn ? capOn.getBoundingClientRect() : null;
    const shot = Math.min(5, Math.floor(f / PER));
    const local = (f - shot * PER) / (PER - 1);
    const small = v.set === 'm';
    SPOTS.forEach((S, n) => {
      const s = spotEls[n];
      const on = S.shot === shot && local > 0.03 && local < 0.97;
      const k = ease(clamp(local));
      const [x, y] = v.toCanvas(lerp(S.a[0], S.b[0], k), lerp(S.a[1], S.b[1], k));
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
  function ui(f) {
    const shot = Math.min(5, Math.floor(f / PER));
    const local = (f - shot * PER) / PER;
    const temp = tempAt(f);
    const t = (104 - temp) / 32;
    root.style.setProperty('--t', t.toFixed(3));
    root.style.setProperty('--tc', ease(clamp((t - 0.38) / 0.24)).toFixed(3));
    const tr = Math.round(temp);
    if (tr !== lastTemp) { hudTemp.textContent = String(tr); lastTemp = tr; }
    hudFill.setAttribute('width', String(Math.max(4, 120 * (temp - 60) / 44)));
    // the clock holds the time in the caption while it is up, then runs on to the next one
    const m = lerp(CLOCK[shot], CLOCK[shot + 1], clamp((local - 0.9) / 0.1));
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
  }

  engine = window.FilmEngine.create({
    section: film, stage: $('.film__stage'), canvas, FV, range: [0.015, 0.885], rate: 9,
    lift: '.cap, .hud, .rail, .book',
    overlays: { '.cap': 'is-on', '.spot': 'is-on', '.book': 'is-on' },
    // the lighter phone-landscape set (l) shares the 16:9 framing, so it uses the 16:9 cut-outs
    extra: [{ name: 'fg', frames: null, url: (set, i) => `fg/${set === 'm' ? 'm' : 'd'}/${String(i + 1).padStart(3, '0')}.webp?v=${FV}` }],
    onGate: k => { loadPct.textContent = String(Math.round(k * 100)); },
    onReady: openLoader,
    onDraw,
    // booking opens over the last frame only once that frame is the one on screen
    onFrame: v => { ui(v.f); book.classList.toggle('is-on', v.p > 0.9 && v.i >= v.N - 5); },
  });
  setTimeout(openLoader, 9000); // never trap a visitor behind the loader on a very slow connection
  addEventListener('scroll', () => bar.classList.toggle('is-solid', film.getBoundingClientRect().bottom < 70), { passive: true });

  // "Book" links land on the dusk scene at the end of the film (data-film-at on #book). The engine loads
  // that frame before it jumps, so booking never opens over the wrong scene.

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

  /* ---------- 3D unit: model-viewer (4.6 MB with the model) loads only when the visitor asks for it ---------- */
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
