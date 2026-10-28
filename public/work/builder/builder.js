/* Limestone Ridge Homes (concept by Quvlo). No libraries. Nothing is sent anywhere. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const ease = k => k * k * (3 - 2 * k);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SVGNS = 'http://www.w3.org/2000/svg';
  const svgEl = (tag, attrs, parent) => {
    const el = document.createElementNS(SVGNS, tag);
    for (const k in attrs) el.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(el);
    return el;
  };
  const money = n => '$' + Math.round(n).toLocaleString('en-US');
  const ft = n => `${n}'-0"`;

  /* ---------- Story data ---------- */
  const PER = 40;
  // Bump when any film frame changes, so browsers fetch the new frames instead of cached ones.
  const FV = '2026102801';
  // Build day at the first frame of each shot, and at the very end.
  const DAYS = [1, 15, 46, 111, 161, 270, 270];
  const SRC_W = 3840, SRC_H = 2160;

  // Blueprint of the front elevation, traced from the finished house in the locked street shot.
  // Points are fractions of the source frame (u across, v down).
  const P = (pts, cls) => ({ pts, cls: cls || 'ln' });
  const R = (u0, v0, u1, v1, cls) => P([[u0, v0], [u1, v0], [u1, v1], [u0, v1], [u0, v0]], cls);
  const ELEV = [
    P([[0.276, 0.72], [0.816, 0.72]]),                                    // slab
    P([[0.34, 0.72], [0.34, 0.40]]),                                      // left wall
    P([[0.798, 0.72], [0.798, 0.527]]),                                   // right wall
    P([[0.283, 0.524], [0.365, 0.496], [0.548, 0.496]]),                  // porch roof
    P([[0.283, 0.524], [0.548, 0.524]], 'ln ln--thin'),                   // porch eave
    P([[0.34, 0.40], [0.38, 0.40], [0.456, 0.315], [0.548, 0.315]]),      // left wing roof
    P([[0.535, 0.396], [0.607, 0.262], [0.679, 0.39]]),                   // central gable
    P([[0.548, 0.40], [0.548, 0.72]]),
    P([[0.668, 0.40], [0.668, 0.72]]),
    P([[0.64, 0.312], [0.733, 0.312], [0.765, 0.402], [0.668, 0.402]]),   // right wing roof
    P([[0.754, 0.402], [0.754, 0.48]]),
    P([[0.637, 0.50], [0.754, 0.48], [0.81, 0.527], [0.668, 0.527]]),     // right lower roof
    R(0.581, 0.406, 0.637, 0.71),                                         // two-story glass entry
    P([[0.609, 0.406], [0.609, 0.71]], 'ln ln--thin'),
    R(0.374, 0.418, 0.415, 0.49, 'ln ln--thin'),
    R(0.469, 0.418, 0.52, 0.458, 'ln ln--thin'),
    R(0.674, 0.424, 0.698, 0.477, 'ln ln--thin'),
    R(0.71, 0.424, 0.733, 0.477, 'ln ln--thin'),
    R(0.358, 0.555, 0.42, 0.676, 'ln ln--thin'),
    R(0.467, 0.555, 0.525, 0.707, 'ln ln--thin'),                        // front doors
    R(0.705, 0.57, 0.756, 0.682, 'ln ln--thin'),
    P([[0.29, 0.524], [0.29, 0.72]], 'ln ln--thin'),                      // porch posts
    P([[0.315, 0.524], [0.315, 0.72]], 'ln ln--thin'),
    P([[0.43, 0.524], [0.43, 0.72]], 'ln ln--thin')
  ];
  const DIMS = [
    { pts: [[0.283, 0.752], [0.81, 0.752]], ticks: true, t: "84'-0\"", at: [0.546, 0.79] },
    { pts: [[0.835, 0.262], [0.835, 0.72]], ticks: true, t: "31'-6\"", at: [0.85, 0.49], left: true }
  ];

  /* ---------- Film (shared engine: film-engine.js) ---------- */
  const film = $('#film'), canvas = $('#filmCanvas');
  const print = $('#print');
  const caps = $$('.cap'), loader = $('#loader'), loadPct = $('#loadPct'), bar = $('.bar');
  const schedDay = $('#schedDay'), schedFill = $('#schedFill'), phases = $$('#schedPhases li');
  const isPhone = () => innerWidth / innerHeight < 1 && Math.min(innerWidth, innerHeight) < 600;

  let opened = false;
  function openLoader() {
    if (opened) return; opened = true;
    document.body.classList.remove('is-loading');
    if (reduce) { loader.classList.add('is-gone'); return; }
    loader.classList.add('is-open');
    setTimeout(() => loader.classList.add('is-gone'), 1200);
  }

  /* Blueprint overlay: built once, then drawn by scroll */
  const lines = [];
  function buildPrint() {
    const pt = ([u, v]) => `${(u * SRC_W).toFixed(1)},${(v * SRC_H).toFixed(1)}`;
    ELEV.forEach(p => {
      lines.push(svgEl('polyline', { points: p.pts.map(pt).join(' '), class: p.cls, pathLength: '1', 'stroke-dasharray': '1 1', 'stroke-dashoffset': '1' }, print));
    });
    const dimG = svgEl('g', { class: 'dimg' }, print);
    DIMS.forEach(d => {
      lines.push(svgEl('polyline', { points: d.pts.map(pt).join(' '), class: 'dim', pathLength: '1', 'stroke-dasharray': '1 1', 'stroke-dashoffset': '1' }, dimG));
      if (d.ticks) d.pts.forEach(([u, v]) => {
        const x = u * SRC_W, y = v * SRC_H, t = 16;
        svgEl('line', { x1: x - t, y1: y + t, x2: x + t, y2: y - t, class: 'dim' }, dimG);
      });
      const tx = svgEl('text', { x: d.at[0] * SRC_W, y: d.at[1] * SRC_H, class: 'dimt', 'text-anchor': d.left ? 'start' : 'middle' }, dimG);
      tx.textContent = d.t;
    });
    // Phones see a narrow crop of the lot, so the label centres on the house there.
    const lab = isPhone()
      ? svgEl('text', { x: 0.553 * SRC_W, y: 0.835 * SRC_H, class: 'lab', 'text-anchor': 'middle' }, dimG)
      : svgEl('text', { x: 0.283 * SRC_W, y: 0.835 * SRC_H, class: 'lab' }, dimG);
    lab.textContent = 'FRONT ELEVATION · THE BLUEBONNET';
  }
  const dimG = () => print.querySelector('.dimg');

  let lastView = '';
  function placePrint(v) {
    // Draw from the bare lot to the slab, hold, then let the real framing take over.
    const f = v.f;
    const drawP = reduce ? 1 : ease(clamp((f - 30) / 48));
    const fadeIn = clamp((f - 28) / 6);
    const fadeOut = 1 - ease(clamp((f - 98) / 46));
    const op = fadeIn * fadeOut;
    print.style.opacity = op.toFixed(3);
    if (op <= 0.001) return;
    const n = lines.length;
    lines.forEach((el, i) => {
      const start = (i / n) * 0.55;
      const p = clamp((drawP - start) / 0.45);
      el.setAttribute('stroke-dashoffset', (1 - p).toFixed(4));
    });
    const g = dimG();
    if (g) g.style.opacity = clamp((drawP - 0.7) / 0.3).toFixed(3);
    // Map the drawing onto the footage exactly as the engine placed it (cover, phone crop or tablet band)
    const r = v.srcRect(), W = print.clientWidth || 1, H = print.clientHeight || 1, k = SRC_W / r.w;
    const view = `${(-r.x * k).toFixed(1)} ${(-r.y * k).toFixed(1)} ${(W * k).toFixed(1)} ${(H * k).toFixed(1)}`;
    if (view !== lastView) { print.setAttribute('viewBox', view); lastView = view; }
  }

  let lastDay = -1, lastShot = -1;
  function ui(f) {
    const shot = Math.min(5, Math.floor(f / PER));
    const local = (f - shot * PER) / (PER - 1);
    // the counter holds the day in the caption while it is up, then runs on to the next one
    const day = Math.round(lerp(DAYS[shot], DAYS[shot + 1], clamp((local - 0.9) / 0.1)));
    if (day !== lastDay) { schedDay.textContent = String(day).padStart(3, '0'); lastDay = day; }
    schedFill.style.setProperty('--p', ((day - 1) / 269).toFixed(4));
    if (shot !== lastShot) {
      phases.forEach((li, n) => { li.classList.toggle('is-on', n === shot); li.classList.toggle('is-done', n < shot); });
      lastShot = shot;
    }
    caps.forEach(cap => {
      const s = +cap.dataset.shot;
      let on;
      if (s === 0) on = f < 22;
      else if (s === 5) on = f >= 212;
      else on = shot === s && local > 0.08 && local < 0.9;
      cap.classList.toggle('is-on', on);
    });
  }

  buildPrint();
  print.setAttribute('preserveAspectRatio', 'none');
  window.FilmEngine.create({
    section: film, stage: $('.film__stage'), canvas, FV, range: [0.01, 0.9], rate: 9,
    lift: '.cap, .sched',
    overlays: { '.cap': 'is-on' },
    onGate: k => { loadPct.textContent = String(Math.round(k * 100)); },
    onReady: openLoader,
    onDraw: (ctx, v) => placePrint(v),
    onFrame: v => ui(v.f),
  });
  setTimeout(openLoader, 9000); // never trap a visitor behind the loader on a very slow connection
  const solid = () => bar.classList.toggle('is-solid', film.getBoundingClientRect().bottom < 90);
  addEventListener('scroll', solid, { passive: true }); solid();
  ui(0);

  /* ---------- Plans ---------- */
  // Rooms in feet: [key, name, x, y, w, h]. Rooms with a key can be tapped; the rest are drawn only.
  const PLANS = {
    pecan: {
      name: 'The Pecan', sqft: 2700, w: 72, h: 46,
      up: 'One story. The study has a closet, so it works as bedroom 3.',
      rooms: [
        ['primary', 'Primary', 0, 0, 20, 18], ['bath', 'Primary bath', 0, 18, 20, 12], [null, 'Bedroom 2', 0, 30, 20, 16],
        ['great', 'Great room', 20, 0, 26, 26], [null, 'Bath 2 · hall', 20, 26, 26, 8], [null, 'Foyer', 20, 34, 10, 12],
        ['study', 'Study', 30, 34, 16, 12], ['kitchen', 'Kitchen', 46, 0, 26, 16], [null, 'Utility', 46, 16, 26, 6],
        [null, 'Garage', 46, 22, 26, 24], ['porch', 'Porch', 16, 46, 30, 8]
      ],
      door: [20, 46],
      fin: {
        great: [['Floor', 'Engineered white oak'], ['Ceiling', '10 ft, one cedar beam'], ['Fireplace', 'Gas, limestone surround']],
        kitchen: [['Cabinets', 'Painted shaker'], ['Counters', 'Quartz'], ['Range', '36-inch gas']],
        primary: [['Floor', 'Engineered white oak'], ['Ceiling', 'Tray, 10 ft'], ['Light', 'Two east windows']],
        bath: [['Shower', 'Walk-in, glass panel'], ['Tile', 'Matte porcelain'], ['Vanity', 'Double, 72-inch']],
        study: [['Doors', 'Glass French pair'], ['Shelves', 'Built-in, one wall'], ['Wiring', 'Two data drops']],
        porch: [['Ceiling', 'Stained cedar'], ['Posts', 'Cedar 8 x 8'], ['Floor', 'Broom-finish concrete']]
      }
    },
    caliche: {
      name: 'The Caliche', sqft: 3600, w: 70, h: 44,
      up: 'Upstairs: three bedrooms, two baths and a game room, 1,050 sq ft.',
      rooms: [
        ['study', 'Study', 0, 0, 20, 12], ['primary', 'Primary', 0, 12, 20, 18], ['bath', 'Primary bath', 0, 30, 20, 14],
        ['great', 'Great room', 20, 0, 26, 24], [null, 'Dining', 20, 24, 26, 10], [null, 'Foyer', 20, 34, 10, 10],
        [null, 'Stair · powder', 30, 34, 16, 10], ['kitchen', 'Kitchen', 46, 0, 24, 16], [null, 'Utility', 46, 16, 24, 6],
        [null, 'Garage', 46, 22, 24, 22], ['porch', 'Porch', 20, 44, 26, 8]
      ],
      door: [20, 44],
      fin: {
        great: [['Floor', 'Site-finished white oak'], ['Ceiling', 'Vaulted, cedar beams'], ['Fireplace', 'Wood-burning, limestone']],
        kitchen: [['Cabinets', 'Rift white oak'], ['Counters', 'Quartzite'], ['Range', '48-inch gas']],
        primary: [['Floor', 'White oak'], ['Ceiling', 'Vaulted'], ['Light', 'Corner windows']],
        bath: [['Shower', 'Curbless, two heads'], ['Tile', 'Zellige accent wall'], ['Tub', 'Freestanding']],
        study: [['Doors', 'Steel and glass'], ['Shelves', 'Two walls, with ladder'], ['Wiring', 'Data, sound damping']],
        porch: [['Ceiling', 'Cedar tongue and groove'], ['Posts', 'Cedar 10 x 10'], ['Floor', 'Limestone pavers']]
      }
    },
    bluebonnet: {
      name: 'The Bluebonnet', sqft: 4800, w: 84, h: 56,
      up: 'Upstairs: two bedrooms and a shared bath over the garage, 670 sq ft. This is the house in the film.',
      rooms: [
        ['kitchen', 'Kitchen', 0, 0, 26, 20], [null, 'Dining', 0, 20, 26, 14], [null, 'Utility', 0, 34, 26, 8],
        [null, 'Guest suite', 0, 42, 26, 14], ['great', 'Great room', 26, 0, 32, 30], [null, 'Two-story foyer', 26, 30, 14, 26],
        [null, 'Stair · powder', 40, 30, 18, 12], ['study', 'Study', 40, 42, 18, 14], ['primary', 'Primary', 58, 0, 26, 20],
        ['bath', 'Primary bath', 58, 20, 26, 14], [null, 'Garage', 58, 34, 26, 22], ['porch', 'Porch', 0, 56, 40, 8]
      ],
      door: [26, 56],
      fin: {
        great: [['Floor', 'Wide-plank white oak'], ['Ceiling', '18 ft, cedar beams'], ['Fireplace', 'Cut limestone, floor to ceiling']],
        kitchen: [['Cabinets', 'Rift white oak'], ['Counters', 'Honed quartzite'], ['Range', '48-inch, two ovens']],
        primary: [['Floor', 'Wide-plank white oak'], ['Ceiling', 'Vaulted, 14 ft'], ['Doors', 'Steel, out to the pool']],
        bath: [['Shower', 'Curbless, steam'], ['Stone', 'Honed limestone'], ['Tub', 'Freestanding soaking tub']],
        study: [['Doors', 'Steel and glass pivot'], ['Shelves', 'Floor to ceiling oak'], ['Wiring', 'Data, sound damping']],
        porch: [['Ceiling', 'Cedar tongue and groove'], ['Posts', 'Cedar 10 x 10'], ['Floor', 'Limestone pavers']]
      }
    }
  };
  const PHOTOS = {
    great: ['img/room-great.webp', 'Great room with a limestone fireplace, oak beams and the kitchen beyond'],
    kitchen: ['img/room-kitchen.webp', 'Kitchen with white oak cabinets and a long island'],
    primary: ['img/room-primary.webp', 'Primary bedroom with oak floors and tall windows'],
    bath: ['img/room-bath.webp', 'Primary bath with a freestanding tub and stone walls'],
    study: ['img/room-study.webp', 'Study with built-in oak shelves'],
    porch: ['img/room-porch.webp', 'Front porch with cedar posts and a cedar ceiling']
  };
  const ORDER = ['great', 'kitchen', 'primary', 'bath', 'study', 'porch'];

  const planSvg = $('#planSvg'), planCap = $('#planCap'), planUp = $('#planUp');
  const roomImg = $('#roomImg'), roomK = $('#roomK'), roomH = $('#roomH'), roomDim = $('#roomDim'), roomFin = $('#roomFin');
  const tabs = $$('.plan-tab');
  const S = 10; // SVG units per foot
  let plan = 'bluebonnet', roomKey = 'great';

  function drawPlan(key) {
    const p = PLANS[key];
    while (planSvg.firstChild) planSvg.removeChild(planSvg.firstChild);
    const depth = p.h + 8;
    planSvg.setAttribute('viewBox', `${-9 * S} ${-9 * S} ${(p.w + 18) * S} ${(depth + 16) * S}`);
    planSvg.setAttribute('aria-label', `${p.name}, ground floor plan. Rooms with a photo can be selected.`);
    // Overall dimensions
    const dg = svgEl('g', {}, planSvg);
    const yT = -5 * S, xL = -5 * S;
    svgEl('line', { x1: 0, y1: yT, x2: p.w * S, y2: yT, class: 'dimln' }, dg);
    [0, p.w * S].forEach(x => svgEl('line', { x1: x - 8, y1: yT + 8, x2: x + 8, y2: yT - 8, class: 'dimln' }, dg));
    const t1 = svgEl('text', { x: p.w * S / 2, y: yT - 10, class: 'dimtx' }, dg); t1.textContent = ft(p.w);
    svgEl('line', { x1: xL, y1: 0, x2: xL, y2: p.h * S, class: 'dimln' }, dg);
    [0, p.h * S].forEach(y => svgEl('line', { x1: xL - 8, y1: y + 8, x2: xL + 8, y2: y - 8, class: 'dimln' }, dg));
    const t2 = svgEl('text', { x: xL - 12, y: p.h * S / 2, class: 'dimtx', transform: `rotate(-90 ${xL - 12} ${p.h * S / 2})` }, dg); t2.textContent = ft(p.h);
    // North arrow
    const nx = (p.w + 4.5) * S, ny = (p.h + 4) * S;
    svgEl('path', { d: `M${nx} ${ny - 28} L${nx + 9} ${ny} L${nx} ${ny - 7} L${nx - 9} ${ny} Z`, class: 'north' }, planSvg);
    const nt = svgEl('text', { x: nx, y: ny - 36, class: 'northt' }, planSvg); nt.textContent = 'N';

    p.rooms.forEach(([k, name, x, y, w, h], i) => {
      const g = svgEl('g', { class: k ? 'tap' : 'dull' }, planSvg);
      const isPorch = k === 'porch';
      svgEl('rect', { x: x * S, y: y * S, width: w * S, height: h * S, class: 'rm' }, g);
      svgEl('path', {
        d: `M${x * S} ${y * S} h${w * S} v${h * S} h${-w * S} Z`,
        class: isPorch ? 'wall porch-ln' : 'wall', pathLength: '1',
        style: `animation-delay:${(i * 0.05).toFixed(2)}s`
      }, g);
      const cx = (x + w / 2) * S, cy = (y + h / 2) * S;
      const nm = svgEl('text', { x: cx, y: k ? cy - 2 : cy + 4, class: 'nm' }, g); nm.textContent = name;
      if (k) {
        const sz = svgEl('text', { x: cx, y: cy + 17, class: 'sz' }, g); sz.textContent = `${w}' × ${h}'`;
        g.setAttribute('role', 'button');
        g.setAttribute('tabindex', '0');
        g.setAttribute('aria-label', `${name}, ${w} by ${h} feet`);
        g.dataset.room = k;
        g.addEventListener('click', () => selectRoom(k));
        g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectRoom(k); } });
      }
    });
    // Outline over the rooms, heavier, plus the front door swing
    svgEl('path', { d: `M0 0 h${p.w * S} v${p.h * S} h${-p.w * S} Z`, class: 'wall outline', pathLength: '1' }, planSvg);
    const [dx, dy] = p.door;
    svgEl('path', { d: `M${dx * S + 6} ${dy * S} a30 30 0 0 1 30 -30 v30`, class: 'door' }, planSvg);
    planCap.textContent = `${p.name} · ground floor · ${p.sqft.toLocaleString('en-US')} sq ft`;
    planUp.textContent = p.up;
  }

  function selectRoom(k) {
    roomKey = k;
    const p = PLANS[plan];
    const r = p.rooms.find(x => x[0] === k);
    $$('.tap', planSvg).forEach(g => {
      const on = g.dataset.room === k;
      g.classList.toggle('is-on', on);
      g.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    roomK.textContent = `Room ${101 + ORDER.indexOf(k)} · ${p.name}`;
    roomH.textContent = r[1];
    roomDim.textContent = `${ft(r[4])} × ${ft(r[5])} · ${(r[4] * r[5]).toLocaleString('en-US')} sq ft`;
    while (roomFin.firstChild) roomFin.removeChild(roomFin.firstChild);
    p.fin[k].forEach(([a, b]) => {
      const li = document.createElement('li');
      const bb = document.createElement('b'); bb.textContent = a;
      const sp = document.createElement('span'); sp.textContent = b;
      li.append(bb, sp); roomFin.appendChild(li);
    });
    const [src, alt] = PHOTOS[k];
    if (!roomImg.src.endsWith(src)) {
      roomImg.classList.add('is-swap');
      const pre = new Image();
      pre.onload = () => { roomImg.src = src; roomImg.alt = alt; requestAnimationFrame(() => roomImg.classList.remove('is-swap')); };
      pre.src = src;
    } else roomImg.alt = alt;
  }

  function choosePlan(k, fromUser) {
    plan = k;
    tabs.forEach(t => t.setAttribute('aria-checked', t.dataset.plan === k ? 'true' : 'false'));
    drawPlan(k);
    selectRoom(PLANS[k].rooms.some(r => r[0] === roomKey) ? roomKey : 'great');
    setSize(PLANS[k].sqft, fromUser);
  }
  tabs.forEach(t => t.addEventListener('click', () => choosePlan(t.dataset.plan, true)));
  // Arrow keys move between plans, like a radio group.
  $('#planTabs').addEventListener('keydown', e => {
    const i = tabs.findIndex(t => t.dataset.plan === plan);
    let j = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') j = (i + 1) % tabs.length;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') j = (i + tabs.length - 1) % tabs.length;
    if (j < 0) return;
    e.preventDefault(); tabs[j].focus(); choosePlan(tabs[j].dataset.plan, true);
  });

  /* ---------- Estimator ---------- */
  const RATE = { builder: 205, designer: 245, custom: 310 };
  const SITE = 28000;
  const size$ = $('#estSize'), sizeOut = $('#estSizeOut'), hint = $('#estPlanHint');
  const lo$ = $('#estLo'), hi$ = $('#estHi'), rowA = $('#estRowA'), rowAv = $('#estRowAv'), days$ = $('#estDays'), lotNote = $('#estLotNote');
  const round5k = n => Math.round(n / 5000) * 5000;
  let shownLo = 0, shownHi = 0, raf = 0;

  function setSize(v, animate) {
    size$.value = String(v);
    hint.textContent = `Starting from ${PLANS[plan].name}`;
    est(animate);
  }

  function est(animate) {
    const sz = +size$.value;
    const fin = ($('input[name="finish"]:checked') || {}).value || 'designer';
    const lot = ($('input[name="lot"]:checked') || {}).value || 'own';
    const rate = RATE[fin] || RATE.designer;
    const base = sz * rate, total = base + SITE;
    const lo = round5k(total * 0.95), hi = round5k(total * 1.06);
    sizeOut.textContent = sz.toLocaleString('en-US');
    size$.style.setProperty('--fill', ((sz - 1800) / (6400 - 1800) * 100).toFixed(1) + '%');
    rowA.textContent = `${sz.toLocaleString('en-US')} sq ft × $${rate}`;
    rowAv.textContent = money(base);
    days$.textContent = `about ${Math.round((200 + (sz - 1800) / 4600 * 100) / 5) * 5} days`;
    lotNote.textContent = lot === 'own'
      ? 'Lot not included. We assess your lot for free before you sign.'
      : 'Plus a lot. Lots we build on run about $140,000 to $280,000, and we help you find one before you buy.';
    roll(lo, hi, animate && !reduce);
  }

  function roll(lo, hi, animate) {
    cancelAnimationFrame(raf);
    if (!animate || !shownLo) { shownLo = lo; shownHi = hi; lo$.textContent = money(lo); hi$.textContent = money(hi); return; }
    const a0 = shownLo, b0 = shownHi, t0 = performance.now();
    const step = now => {
      const k = ease(clamp((now - t0) / 500));
      shownLo = lerp(a0, lo, k); shownHi = lerp(b0, hi, k);
      lo$.textContent = money(round5k(shownLo)); hi$.textContent = money(round5k(shownHi));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }
  size$.addEventListener('input', () => est(false));
  $('#estForm').addEventListener('change', e => { if (e.target !== size$) est(true); });
  $('#estForm').addEventListener('submit', e => e.preventDefault());

  choosePlan('bluebonnet', false);

  /* ---------- Warranty bars grow when seen ---------- */
  const war = $('#warChart');
  if (reduce || !('IntersectionObserver' in window)) war.classList.add('is-in');
  else new IntersectionObserver((es, o) => { if (es[0].isIntersecting) { war.classList.add('is-in'); o.disconnect(); } }, { threshold: 0.4 }).observe(war);

  /* ---------- Book a lot walk (concept only: nothing is sent) ---------- */
  const daysEl = $('#walkDays');
  const fmt = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const d = new Date(); d.setHours(9, 0, 0, 0);
  const picks = [];
  while (picks.length < 5) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0) picks.push(new Date(d)); // no Sundays
  }
  picks.forEach((day, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'chip';
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', i === 0 ? 'true' : 'false');
    b.textContent = `${fmt.format(day)}, 9 am`;
    b.addEventListener('click', () => { $$('.chip', daysEl).forEach(x => x.setAttribute('aria-checked', 'false')); b.setAttribute('aria-checked', 'true'); });
    daysEl.appendChild(b);
  });
  const form = $('#walkForm'), msg = $('#walkMsg');
  form.addEventListener('submit', e => {
    e.preventDefault();
    const name = $('#wName').value.trim(), email = $('#wEmail').value.trim();
    msg.classList.remove('is-err');
    if (!name || name.length > 80) { msg.classList.add('is-err'); msg.textContent = 'Please add your name.'; $('#wName').focus(); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 120) { msg.classList.add('is-err'); msg.textContent = 'Please check your email address.'; $('#wEmail').focus(); return; }
    msg.textContent = 'This is a concept site, so nothing was sent. On a real site, the builder confirms your lot walk by email the same day.';
  });
})();
