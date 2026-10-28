/* Norther Comfort Co. (concept by Quvlo). No libraries. Nothing on this page is sent anywhere. */
(() => {
  'use strict';
  // Bump when any film frame changes, so browsers fetch the new frames instead of cached ones.
  const FV = '2026102804';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const ease = k => k * k * (3 - 2 * k);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root = document.documentElement;

  /* ---------- Story data: one July day in DFW (high of 104°, sunset about 8:35 pm) ---------- */
  const PER = 40;
  // Clock (minutes after midnight) for each shot: [start, end]. Each shot holds its caption's time; only the
  // living room shot runs, while its light fades from low sun to dusk.
  const CLOCK = [[760, 760], [785, 785], [855, 855], [1140, 1140], [1160, 1230], [1245, 1245]];
  const minutesAt = f => { const s = Math.min(5, Math.floor(f / PER)), k = clamp((f - s * PER) / (PER - 1)); return lerp(CLOCK[s][0], CLOCK[s][1], k); };
  const piece = (pts, m) => { if (m <= pts[0][0]) return pts[0][1]; for (let i = 1; i < pts.length; i++) if (m <= pts[i][0]) return lerp(pts[i - 1][1], pts[i][1], (m - pts[i - 1][0]) / (pts[i][0] - pts[i - 1][0])); return pts[pts.length - 1][1]; };
  // Inside: the AC quit at nine, so the house climbs into the low 90s by the time the new unit runs at 7:00,
  // then falls a little over two degrees an hour (89 at 8:45, 74 overnight). Outside: a 104° afternoon.
  const INSIDE = [[760, 88], [1140, 93], [1245, 89]];
  const OUTSIDE = [[760, 99], [785, 100], [855, 102], [1020, 104], [1140, 101], [1245, 96]];
  const tempAt = f => piece(INSIDE, minutesAt(f));
  // 0 = the hot house, 1 = cooled. It stays hot until the new unit runs at 7:00 pm, then follows the number down.
  const coolAt = f => { const m = minutesAt(f); return m < 1140 ? 0 : clamp((93 - piece(INSIDE, m)) / 4); };
  // Thermostat screen in the living room shot, as fractions of the source frame.
  const THERMO = { shot: 4, tl: [0.7430, 0.2118], tr: [0.7982, 0.1993], bl: [0.7438, 0.2803] };
  // Hotspots: position at the start (a) and end (b) of their shot; "at" is when the note opens.
  // "side" is where the card sits on tablets and desktops: r/l = right/left, t/b = above/below.
  const SPOTS = [
    { shot: 1, a: [0.50, 0.173], b: [0.50, 0.18], at: 0.08, side: 'rb', t: 'Fan motor', d: 'Bearings worn. It hums and barely turns, so the heat stays in the coil.' },
    { shot: 1, a: [0.414, 0.528], b: [0.40, 0.55], at: 0.20, side: 'rb', t: 'Coil', d: 'Fifteen summers of dirt and corrosion. Air barely gets through it now.' },
    { shot: 1, a: [0.707, 0.358], b: [0.75, 0.38], at: 0.70, side: 'lb', t: 'Capacitor', d: 'Bulged. A twelve-dollar part, so we swapped it first. The compressor still would not start.' },
    { shot: 3, a: [0.31, 0.62], b: [0.26, 0.66], at: 0.08, side: 'rt', t: 'Line set', d: 'New copper, fully insulated, sealed where it enters the brick.' },
    { shot: 3, a: [0.47, 0.775], b: [0.45, 0.80], at: 0.26, side: 'rt', t: 'Pad', d: 'Level composite pad, raised so rain drains away from the unit.' },
    { shot: 3, a: [0.55, 0.52], b: [0.56, 0.53], at: 0.44, side: 'lt', t: 'Variable-speed fan', d: 'Runs slow and quiet most of the day instead of slamming on and off.' },
    { shot: 3, a: [0.63, 0.60], b: [0.66, 0.62], at: 0.62, side: 'rt', t: 'Charge', d: 'Vacuum and refrigerant charge checked on gauges and written on your invoice.' }
  ];
  const HEAT2 = [255, 193, 94], COOL2 = [159, 219, 255];
  const mix = (a, b, k) => `rgb(${a.map((v, i) => Math.round(lerp(v, b[i], k))).join(',')})`;
  const fmtClock = m => { const h = Math.floor(m / 60) % 24, mm = Math.floor(m % 60); return `${h % 12 || 12}:${String(mm).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`; };

  /* ---------- Film (shared engine: film-engine.js) ---------- */
  const film = $('#film'), stage = $('.film__stage'), canvas = $('#filmCanvas');
  const svg = $('#filmLines'), spotsEl = $('#filmSpots');
  const hudTemp = $('#hudTemp'), hudOut = $('#hudOut'), hudClock = $('#hudClock'), hudFill = $('#hudFill');
  const rail = $('#rail'), railItems = $$('li', rail);
  const caps = $$('.cap'), loader = $('#loader'), loadClock = $('#loadClock'), loadAmPm = $('#loadAmPm');
  const sheet = $('#sheet'), sheetT = $('#sheetT'), sheetD = $('#sheetD'), hud = $('#hud');
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

  // Phones (portrait, and landscape where the screen is short) get one note at a time in a sheet at the
  // bottom instead of cards floating over the footage.
  const sheetMode = v => v.set === 'm' || innerHeight < 520 || innerWidth < 600;

  // Everything drawn over the footage reads the frame that is actually on screen (v).
  function onDraw(ctx, v) {
    dpr = v.dpr; N = v.N;
    // the captions, HUD and hero state follow this frame first, so the notes below see the right occluders
    ui(v.f);
    const fg = v.extra('fg');
    highLabel = null;
    if (fg) { drawBigTemp(ctx, v); ctx.drawImage(fg, v.rect.x, v.rect.y, v.rect.w, v.rect.h); drawHighLabel(ctx, v); }
    if (v.shot === THERMO.shot) drawThermostat(ctx, v);
    placeSpots(v);
  }

  // "104°", the day's high, set behind the roofline at the end of the drone shot.
  function drawBigTemp(ctx, v) {
    const fg = (v.meta && v.meta.fg) || [];
    const first = fg[0] - 1;
    const k = ease(clamp((v.i - first) / 4));
    if (k <= 0) return;
    const [, top] = v.toCanvas(0.5, 0.08);
    const [, base] = v.toCanvas(0.5, 0.40);
    const [, roof] = v.toCanvas(0.5, 0.27);
    const h = base - top;
    ctx.save();
    ctx.globalAlpha = k;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    // Safari's canvas has no fontStretch: the figure is then set at normal width, and it is measured after
    // the stretch is set either way, so it always fits.
    ctx.font = `900 ${Math.round(h)}px Archivo`;
    if ('fontStretch' in ctx) ctx.fontStretch = 'ultra-expanded';
    const maxW = v.cw * 0.8;
    const w = ctx.measureText('104°').width;
    let s = Math.min(1, maxW / w);
    let capH = h * 0.72 * s;
    // 60% of the figure shows above the roof, and its top stays clear of the top bar
    const room = (roof - (bar.getBoundingClientRect().bottom + 30) * v.dpr) / 0.6;
    // a phone on its side has almost no sky between the bar and the roof: the figure is left out there
    // (the hero line carries the 104°) rather than shrunk to a smudge or run under the bar
    if (room < 50 * v.dpr) { ctx.restore(); return; }
    if (capH > room) { s *= room / capH; capH = h * 0.72 * s; }
    const y = roof + capH * 0.4;
    const grad = ctx.createLinearGradient(0, y - capH, 0, y);
    grad.addColorStop(0, '#ffb347'); grad.addColorStop(1, '#ff5a0a');
    ctx.fillStyle = grad;
    ctx.translate(v.cw / 2, y);
    ctx.scale(s, s);
    ctx.fillText('104°', 0, 0);
    ctx.restore();
    // it is the day's high, not the reading now (the HUD has that): labelled after the house is drawn over it
    // just under where the figure goes behind the roof, so it never runs into the top bar
    highLabel = { x: v.cw / 2, y: roof + 24 * v.dpr, k };
  }
  let highLabel = null;
  function drawHighLabel(ctx, v) {
    if (!highLabel) return;
    const { x, y, k } = highLabel, d = v.dpr;
    ctx.save();
    ctx.globalAlpha = k;
    ctx.font = `500 ${Math.round(14 * d)}px "Plex Mono", monospace`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const w = ctx.measureText("Today's high").width + 18 * d, h = 26 * d;
    ctx.fillStyle = 'rgba(6,12,18,.72)';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x - w / 2, y - h / 2, w, h, 7 * d); else ctx.rect(x - w / 2, y - h / 2, w, h);
    ctx.fill();
    ctx.fillStyle = '#ffc15e';
    ctx.fillText("Today's high", x, y + d);
    ctx.restore();
  }

  // The live number drawn onto the thermostat in the footage.
  function drawThermostat(ctx, v) {
    const P = uv => v.toCanvas(uv[0], uv[1]);
    const tl = P(THERMO.tl), tr = P(THERMO.tr), bl = P(THERMO.bl);
    const w = Math.hypot(tr[0] - tl[0], tr[1] - tl[1]), h = Math.hypot(bl[0] - tl[0], bl[1] - tl[1]);
    if (w < 4) return;
    const tf = tempAt(v.f), temp = Math.round(tf), t = coolAt(v.f);
    // the screen's own glow dims a little with the room
    const dim = 1 - 0.25 * clamp((v.f - THERMO.shot * PER) / (PER - 1));
    ctx.save();
    ctx.setTransform((tr[0] - tl[0]) / w, (tr[1] - tl[1]) / w, (bl[0] - tl[0]) / h, (bl[1] - tl[1]) / h, tl[0], tl[1]);
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#0c1a1d'); g.addColorStop(1, '#091315');
    ctx.fillStyle = g;
    ctx.fillRect(-w * 0.02, -h * 0.02, w * 1.04, h * 1.04);
    const col = mix(HEAT2, COOL2, t);
    ctx.globalAlpha = dim;
    ctx.fillStyle = col;
    ctx.shadowColor = col; ctx.shadowBlur = h * 0.35;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `500 ${h * 0.6}px "Plex Mono", monospace`;
    ctx.fillText(`${temp}°`, w * 0.52, h * 0.56);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 0.65 * dim;
    ctx.font = `500 ${h * 0.13}px "Plex Mono", monospace`;
    ctx.textAlign = 'left';
    ctx.fillText('COOLING', w * 0.08, h * 0.17);
    ctx.textAlign = 'right';
    ctx.fillText('SET 74', w * 0.94, h * 0.17);
    const rg = ctx.createLinearGradient(0, 0, w, h);
    rg.addColorStop(0, 'rgba(255,255,255,0.10)'); rg.addColorStop(0.5, 'rgba(255,255,255,0)');
    ctx.globalAlpha = 1; ctx.fillStyle = rg; ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  /* Hotspots: cards with leader lines on larger screens, one note at a time in the sheet on phones */
  let engine = null;
  const spotEls = SPOTS.map((S, n) => {
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
    const state = { el, card, path, btn };
    // the film may be standing still, so ask for a repaint: placement runs with the drawn frame
    btn.addEventListener('click', () => { picked = n; if (engine) engine.redraw(); });
    return state;
  });

  let picked = -1, pickedShot = -1, sheetIdx = -1;
  // where the CSS hides the HUD for the hero and the end (phones)
  const hudHides = matchMedia('(max-width: 860px), (orientation: landscape) and (max-height: 520px)');
  const inRect = (r, X, Y, pad) => r && X > r.left - pad && X < r.right + pad && Y > r.top - pad && Y < r.bottom + pad;
  const overlap = (a, b) => Math.max(0, Math.min(a.r, b.right) - Math.max(a.l, b.left)) * Math.max(0, Math.min(a.b, b.bottom) - Math.max(a.t, b.top));
  // One note open at a time, on every screen: the one tapped, else the latest one due whose dot can be seen.
  // Dots under the caption, the HUD, the rail, the sheet or the top bar are hidden (they could not be tapped).
  function placeSpots(v) {
    const shot = v.shot, local = v.local, small = sheetMode(v);
    stage.classList.toggle('is-sheet', small);
    if (shot !== pickedShot) { picked = -1; pickedShot = shot; }
    const capOn = caps.find(c => c.classList.contains('is-on'));
    // read from classes and layout, not from opacity: an overlay that has just been switched on is still at
    // opacity 0 for a moment, and would not count
    const hudOff = (stage.classList.contains('is-hero') || stage.classList.contains('is-end')) && hudHides.matches;
    const box = el => { const r = el.getBoundingClientRect(); return r.width ? r : null; };
    const occ = [capOn, hudOff ? null : hud, getComputedStyle(rail).display === 'none' ? null : rail, small ? sheet : null].filter(Boolean).map(box).filter(Boolean);
    const k = ease(clamp(local));
    const pos = SPOTS.map((S, n) => {
      const on = S.shot === shot && local > 0.03 && local < 0.97;
      const [x, y] = v.toCanvas(lerp(S.a[0], S.b[0], k), lerp(S.a[1], S.b[1], k));
      const X = x / dpr, Y = y / dpr;
      const vis = on && X > 24 && X < innerWidth - 24 && Y > 76 && Y < innerHeight - 30 && !occ.some(r => inRect(r, X, Y, 22));
      return { X, Y, on, vis, n };
    });
    // with reduced motion each shot is one still, so every note in it counts as due
    const due = S => reduce || local >= S.at;
    let active = -1;
    pos.forEach(p => { if (p.vis && due(SPOTS[p.n])) active = p.n; });
    if (picked >= 0 && pos[picked].vis) active = picked;
    pos.forEach(p => {
      const s = spotEls[p.n];
      s.el.classList.toggle('is-on', p.vis);
      const open = p.n === active;
      s.el.classList.toggle('is-open', open);
      s.btn.setAttribute('aria-expanded', String(open));
      s.path.classList.toggle('is-on', open && !small);
      if (!p.vis) return;
      s.el.style.transform = `translate3d(${p.X}px, ${p.Y}px, 0)`;
      if (small || !open) return;
      // the card: its own side first, then the others; never over another dot, the caption, the HUD or the rail
      const X = p.X, Y = p.Y, cw = s.card.offsetWidth || 240, chh = s.card.offsetHeight || 80;
      const S = SPOTS[p.n], g = 34;
      const opts = { rb: [g, g], rt: [g, -g - chh], lb: [-g - cw, g], lt: [-g - cw, -g - chh], ct: [-cw / 2, -g - 10 - chh], cb: [-cw / 2, g + 10],
        rm: [g + 10, -chh / 2], lm: [-g - 10 - cw, -chh / 2], rb2: [110, g], rt2: [110, -g - chh] };
      const order = [S.side, ...Object.keys(opts).filter(o => o !== S.side)];
      const cores = pos.filter(q => q.vis && q.n !== p.n).map(q => ({ left: q.X - 24, right: q.X + 24, top: q.Y - 24, bottom: q.Y + 24 }));
      const dots = pos.filter(q => q.vis && q.n !== p.n).map(q => ({ left: q.X - 40, right: q.X + 40, top: q.Y - 40, bottom: q.Y + 40 }));
      let best = null;
      for (const o of order) {
        let [dx, dy] = opts[o];
        dx = clamp(X + dx, 12, innerWidth - 12 - cw) - X;
        dy = clamp(Y + dy, 76, innerHeight - 16 - chh) - Y;
        const r = { l: X + dx, t: Y + dy, r: X + dx + cw, b: Y + dy + chh };
        // a card must not sit on its own dot either
        const self = { left: X - 26, right: X + 26, top: Y - 26, bottom: Y + 26 };
        // the caption, HUD and rail must never be covered; the room kept around other dots gives way first
        const cost = [...occ, ...cores, self].reduce((a, q) => a + 20 * overlap(r, q), 0) + dots.reduce((a, q) => a + overlap(r, q), 0);
        if (!best || cost < best.cost) best = { dx, dy, cost };
        if (cost === 0) break;
      }
      s.card.style.left = best.dx + 'px'; s.card.style.top = best.dy + 'px';
      const cx = clamp(X, X + best.dx, X + best.dx + cw), cy = clamp(Y, Y + best.dy, Y + best.dy + chh);
      const ax = X + best.dx > X ? X + best.dx : X + best.dx + cw <= X ? X + best.dx + cw : cx;
      const ay = Y + best.dy > Y ? Y + best.dy : Y + best.dy + chh <= Y ? Y + best.dy + chh : cy;
      s.path.setAttribute('d', `M${X},${Y} L${ax},${ay}`);
    });
    const showSheet = small && active >= 0;
    if (showSheet && active !== sheetIdx) { sheetT.textContent = SPOTS[active].t; sheetD.textContent = SPOTS[active].d; sheetIdx = active; }
    sheet.classList.toggle('is-on', showSheet);
  }

  /* HUD, rail, captions, color temperature */
  let lastTemp = null, lastClock = null, lastOut = null;
  function ui(f) {
    const shot = Math.min(5, Math.floor(f / PER));
    const local = (f - shot * PER) / PER;
    const m = minutesAt(f);
    const temp = tempAt(f);
    const t = coolAt(f);
    root.style.setProperty('--t', t.toFixed(3));
    root.style.setProperty('--tc', ease(clamp((t - 0.38) / 0.24)).toFixed(3));
    const tr = Math.round(temp);
    if (tr !== lastTemp) { hudTemp.textContent = String(tr); lastTemp = tr; }
    const out = Math.round(piece(OUTSIDE, m));
    if (out !== lastOut) { hudOut.textContent = String(out); lastOut = out; }
    hudFill.setAttribute('width', String(Math.max(4, 120 * (temp - 70) / 25)));
    const c = fmtClock(m);
    if (c !== lastClock) { hudClock.textContent = c; lastClock = c; }
    rail.style.setProperty('--p', (f / (N - 1)).toFixed(4));
    railItems.forEach((li, n) => li.classList.toggle('is-on', n <= shot));
    stage.classList.toggle('is-hero', shot === 0);
    stage.classList.toggle('is-end', f >= 205);
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
    section: film, stage, canvas, FV, range: [0.015, 0.885], rate: 9,
    lift: '.cap, .hud, .rail, .sheet',
    overlays: { '.cap': 'is-on', '.spot': 'is-on', '.sheet': 'is-on' },
    // the lighter phone-landscape set (l) shares the 16:9 framing, so it uses the 16:9 cut-outs
    extra: [{ name: 'fg', frames: null, url: (set, i) => `fg/${set === 'm' ? 'm' : 'd'}/${String(i + 1).padStart(3, '0')}.webp?v=${FV}` }],
    // the loader clock runs from 9:00 am, when the AC quit, to 12:40 pm, the first shot
    onGate: k => { const m = lerp(540, 760, clamp(k)); loadClock.textContent = fmtClock(m).split(' ')[0]; loadAmPm.textContent = m < 720 ? 'am' : 'pm'; },
    onReady: openLoader,
    onDraw,
    onFrame: v => ui(v.f),
  });
  setTimeout(openLoader, 9000); // never trap a visitor behind the loader on a very slow connection
  addEventListener('scroll', () => bar.classList.toggle('is-solid', film.getBoundingClientRect().bottom < 70), { passive: true });

  /* ---------- Word-fill paragraph ---------- */
  const fillP = $('#fillP');
  if (fillP) {
    const words = fillP.textContent.trim().split(/\s+/);
    const hot = new Set(['twelve-dollar', 'capacitor,', 'cottonwood,', '2009.']);
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

  /* ---------- The unit: a still with parts you can tap (no 3D model until a real one exists) ---------- */
  const UNIT = [
    { x: 0.22, y: 0.42, t: 'Coil on two sides', d: 'More surface to shed heat, so the fan can run slow and quiet.' },
    { x: 0.55, y: 0.52, t: 'Variable-speed fan', d: 'The fan and compressor run low and steady most of the day instead of slamming on and off.' },
    { x: 0.80, y: 0.50, t: 'Service panel', d: 'Wiring and the refrigerant valves sit behind one panel, so a tune-up takes minutes.' },
    { x: 0.75, y: 0.77, t: 'Feet and pad', d: 'Bolted down on a level pad, raised so rain drains away from the unit.' }
  ];
  const unitDots = $('#unitDots'), unitNote = $('#unitNote');
  if (unitDots && unitNote) {
    const nb = document.createElement('b'), nd = document.createElement('span');
    unitNote.append(nb, nd);
    const btns = UNIT.map((u, n) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'udot';
      b.style.left = (u.x * 100) + '%'; b.style.top = (u.y * 100) + '%';
      b.setAttribute('aria-label', u.t); b.setAttribute('aria-controls', 'unitNote');
      b.addEventListener('click', () => pick(n));
      unitDots.append(b);
      return b;
    });
    const pick = n => {
      btns.forEach((b, k) => b.setAttribute('aria-pressed', String(k === n)));
      nb.textContent = UNIT[n].t; nd.textContent = UNIT[n].d;
    };
    pick(0);
  }

  /* ---------- Prices and booking: the total follows the visit and the time picked ---------- */
  const est = $('#est'), totalEl = $('#estTotal'), unitEl = $('#estUnit'), linesEl = $('#estLines'), whenEl = $('#estWhen');
  const say = $('#estSay');
  const sysSet = $('#sysSet'), sysNote = $('#sysNote'), daysEl = $('#bookDays'), timesEl = $('#bookTimes'), note = $('#bookNote'), goBtn = $('#bookGo');
  const SLOTS = [
    { t: '8–10 am', h: 8 }, { t: '10 am–12 pm', h: 10 }, { t: '1–3 pm', h: 13 }, { t: '3–5 pm', h: 15 }, { t: '6–8 pm', h: 18, eve: true }
  ];
  const FEE_TODAY = 75, FEE_AFTER = 125, TUNE = 129, TUNE_EXTRA = 89, REPAIR = 189;
  // The company is in Dallas, so "today" and the open windows follow Dallas time wherever the visitor is.
  function dallasNow() {
    const parts = {};
    new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' })
      .formatToParts(new Date()).forEach(p => { parts[p.type] = p.value; });
    return { y: +parts.year, mo: +parts.month, d: +parts.day, min: (+parts.hour % 24) * 60 + +parts.minute };
  }
  const now = dallasNow();
  const utcFmt = o => new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', ...o });
  const wdFmt = utcFmt({ weekday: 'short' }), mdFmt = utcFmt({ month: 'short', day: 'numeric' }), longFmt = utcFmt({ weekday: 'short', month: 'short', day: 'numeric' });
  // a slot today stays bookable until 90 minutes before its window opens
  const slotOpen = (day, s) => day.n > 0 || s.h * 60 >= now.min + 90;
  const DAYS = [];
  for (let n = 0; n < 7; n++) {
    const dt = new Date(Date.UTC(now.y, now.mo - 1, now.d + n));
    const wd = dt.getUTCDay();
    DAYS.push({ n, wd, weekend: wd === 0 || wd === 6, label: n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : wdFmt.format(dt), date: mdFmt.format(dt), long: longFmt.format(dt) });
  }
  DAYS.forEach(d => { d.open = SLOTS.some(s => slotOpen(d, s)); });
  const radio = (group, name, value, top, main, disabled) => {
    const l = document.createElement('label');
    const i = document.createElement('input');
    i.type = 'radio'; i.name = name; i.value = String(value); i.disabled = !!disabled;
    const s = document.createElement('span');
    const sm = document.createElement('small'); sm.textContent = top;
    s.append(sm, document.createTextNode(main));
    l.append(i, s); group.append(l);
    return i;
  };
  const dayInputs = DAYS.map(d => radio(daysEl, 'day', d.n, d.label, d.date, !d.open));
  DAYS.forEach((d, k) => { if (!d.open) dayInputs[k].nextElementSibling.firstChild.textContent = d.label + ', passed'; });
  // default: the first daytime weekday window with no extra fee
  let selDay = DAYS.find(d => d.n > 0 && !d.weekend) || DAYS[1];
  let selSlot = 0;
  const need = () => (est.querySelector('input[name="need"]:checked') || { value: 'tune' }).value;
  const systems = () => +(est.querySelector('input[name="sys"]:checked') || { value: 1 }).value;
  const feeFor = (day, s) => {
    if (need() !== 'repair') return { fee: 0, why: '' };
    if (s.eve || day.weekend) return { fee: FEE_AFTER, why: day.weekend ? 'Weekend' : 'Evening' };
    if (day.n === 0) return { fee: FEE_TODAY, why: 'Same day' };
    return { fee: 0, why: '' };
  };
  let slotInputs = [];
  function drawSlots() {
    timesEl.textContent = '';
    slotInputs = SLOTS.map((s, k) => {
      const { fee } = feeFor(selDay, s);
      const open = slotOpen(selDay, s);
      const i = radio(timesEl, 'slot', k, open ? (fee ? `+$${fee}` : 'No extra fee') : 'Gone', s.t, !open);
      i.addEventListener('change', () => { selSlot = k; update(); });
      return i;
    });
    if (!slotOpen(selDay, SLOTS[selSlot])) selSlot = SLOTS.findIndex(s => slotOpen(selDay, s));
    slotInputs[selSlot].checked = true;
  }
  dayInputs.forEach((i, k) => i.addEventListener('change', () => { selDay = DAYS[k]; drawSlots(); update(); }));
  dayInputs[selDay.n].checked = true;

  let shown = null, raf = 0;
  const li = (a, b) => { const l = document.createElement('li'), x = document.createElement('span'), y = document.createElement('span'); x.textContent = a; y.textContent = b; l.append(x, y); return l; };
  function update() {
    const nd = need(), sys = systems();
    const isTune = nd === 'tune';
    sysSet.hidden = !isTune;
    sysSet.querySelectorAll('input').forEach(i => { i.disabled = !isTune; });
    sysNote.hidden = isTune;
    sysNote.textContent = nd === 'repair' ? 'One diagnosis covers the whole house, however many systems it has.' : 'The quote is free for any size of house.';
    const slot = SLOTS[selSlot], { fee, why } = feeFor(selDay, slot);
    // refresh the fee hints on the windows for the visit type
    slotInputs.forEach((i, k) => { const f = feeFor(selDay, SLOTS[k]).fee; if (!i.disabled) i.nextElementSibling.firstChild.textContent = f ? `+$${f}` : 'No extra fee'; });
    linesEl.textContent = '';
    let sum = 0;
    if (isTune) {
      sum = TUNE + TUNE_EXTRA * (sys - 1);
      linesEl.append(li('Tune-up, first system', `$${TUNE}`));
      if (sys > 1) linesEl.append(li(sys === 2 ? 'Second system' : 'Two more systems', `+$${TUNE_EXTRA * (sys - 1)}`));
      unitEl.textContent = `Tune-up for ${sys === 1 ? 'one system' : sys === 2 ? 'two systems' : 'three systems'}, everything included.`;
    } else if (nd === 'repair') {
      sum = REPAIR + fee;
      linesEl.append(li('Repair visit: trip and diagnosis', `$${REPAIR}`));
      if (fee) linesEl.append(li(why, `+$${fee}`));
      unitEl.textContent = 'The $189 comes off the repair price if you go ahead.';
    } else {
      linesEl.append(li('In-home quote for a new system', 'Free'));
      unitEl.textContent = 'Free in-home quote, any day of the week.';
    }
    whenEl.textContent = `${selDay.long}, ${slot.t}`;
    // screen readers hear the final total once, not the count-up
    say.textContent = `${nd === 'quote' ? 'Free' : '$' + sum}, ${selDay.long}, ${slot.t}`;
    goBtn.textContent = 'Hold this time';
    note.textContent = '';
    roll(sum, nd === 'quote');
  }
  function roll(sum, free) {
    cancelAnimationFrame(raf);
    if (free) { totalEl.textContent = 'Free'; shown = 0; return; }
    const from = shown == null ? sum : shown, t0 = performance.now();
    const step = now => {
      const k = reduce ? 1 : ease(clamp((now - t0) / 420));
      shown = Math.round(lerp(from, sum, k));
      totalEl.textContent = `$${shown}`;
      if (k < 1) raf = requestAnimationFrame(step);
    };
    if (reduce || from === sum) { shown = sum; totalEl.textContent = `$${sum}`; return; }
    raf = requestAnimationFrame(step);
  }
  if (est) {
    est.addEventListener('change', e => { if (e.target.name === 'need' || e.target.name === 'sys') { if (e.target.name === 'need') drawSlots(); update(); } });
    drawSlots(); update();
    goBtn.addEventListener('click', () => {
      const what = { tune: 'tune-up', repair: 'repair visit', quote: 'new system quote' }[need()];
      note.textContent = `Held: ${what}, ${selDay.long}, ${SLOTS[selSlot].t}. This is a concept site, so nothing was sent. A real build books it straight into the company's calendar.`;
      goBtn.textContent = 'Held';
    });
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
