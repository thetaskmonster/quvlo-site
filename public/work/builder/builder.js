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
  const FV = '2026102803';
  // The build days each shot covers. The counter runs through them with the footage, so it always sits
  // inside the range the caption names. One build length everywhere: 330 days, stakes to keys
  // (the schedule chart, the estimate for The Bluebonnet with Designer finishes, the FAQ). The dry-in and
  // exterior time-lapse runs to Day 210, when the stone, siding and metal roof are done; the counter then
  // jumps at the hard cut into the finished interior, late in the finishes phase.
  const SPANS = [[1, 1], [1, 30], [30, 75], [75, 210], [230, 305], [315, 330]];
  const TOTAL = 330;
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
    { pts: [[0.835, 0.262], [0.835, 0.72]], ticks: true, t: "31'-6\"", at: [0.85, 0.49], up: true }
  ];

  /* ---------- Film (shared engine: film-engine.js) ---------- */
  const film = $('#film'), canvas = $('#filmCanvas'), stage = $('.film__stage');
  const print = $('#print');
  const caps = $$('.cap'), loader = $('#loader'), loadPct = $('#loadPct'), bar = $('.bar');
  const schedDay = $('#schedDay'), schedFill = $('#schedFill'), phases = $$('#schedPhases li');

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
    // a mask with a hole where the caption sits (placed by knockOut)
    const defs = svgEl('defs', {}, print);
    const mask = svgEl('mask', { id: 'capMask', maskUnits: 'userSpaceOnUse', x: '-20000', y: '-20000', width: '60000', height: '60000' }, defs);
    svgEl('rect', { x: '-20000', y: '-20000', width: '60000', height: '60000', fill: '#fff' }, mask);
    svgEl('rect', { id: 'capHole', x: '0', y: '0', width: '0', height: '0', fill: '#000' }, mask);
    const art = svgEl('g', { mask: 'url(#capMask)' }, print);
    ELEV.forEach(p => {
      lines.push(svgEl('polyline', { points: p.pts.map(pt).join(' '), class: p.cls, pathLength: '1', 'stroke-dasharray': '1 1', 'stroke-dashoffset': '1' }, art));
    });
    const dimG = svgEl('g', { class: 'dimg' }, art);
    DIMS.forEach(d => {
      lines.push(svgEl('polyline', { points: d.pts.map(pt).join(' '), class: 'dim', pathLength: '1', 'stroke-dasharray': '1 1', 'stroke-dashoffset': '1' }, dimG));
      if (d.ticks) d.pts.forEach(([u, v]) => {
        const x = u * SRC_W, y = v * SRC_H, t = 16;
        svgEl('line', { x1: x - t, y1: y + t, x2: x + t, y2: y - t, class: 'dim' }, dimG);
      });
      // a vertical dimension reads along its line, as on a drawing, so it never runs off a narrow crop
      const ax = d.at[0] * SRC_W, ay = d.at[1] * SRC_H;
      const tx = svgEl('text', { x: ax, y: ay, class: 'dimt', 'text-anchor': 'middle' }, dimG);
      if (d.up) tx.setAttribute('transform', `rotate(-90 ${ax.toFixed(1)} ${ay.toFixed(1)})`);
      tx.textContent = d.t;
    });
    // Centred under the house, so it fits every crop (phones, the phone-landscape panel, tablets).
    const lab = svgEl('text', { x: 0.546 * SRC_W, y: 0.835 * SRC_H, class: 'lab', 'text-anchor': 'middle' }, dimG);
    lab.textContent = 'FRONT ELEVATION · THE BLUEBONNET';
  }
  const dimG = () => print.querySelector('.dimg');

  let lastView = '';
  function placePrint(v) {
    // Draw from the bare lot to the slab, hold, then let the real framing take over.
    const f = v.f;
    const drawP = reduce ? 1 : ease(clamp((f - 30) / 48));
    const fadeIn = clamp((f - 28) / 6);
    // gone by frame 110, before the dry-in, where the footage drifts from the drawing
    const fadeOut = 1 - ease(clamp((f - 92) / 18));
    const op = fadeIn * fadeOut;
    print.style.opacity = op.toFixed(3);
    if (op <= 0.001) { holeLoop(false); return; }
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
    if (view !== lastView) {
      print.setAttribute('viewBox', view); lastView = view;
      // labels never smaller than 12 px on screen (k is source units per CSS pixel)
      print.style.setProperty('--dimt', Math.max(30, 13 * k).toFixed(1) + 'px');
      print.style.setProperty('--lab', Math.max(24, 12 * k).toFixed(1) + 'px');
    }
    holeAt = [-r.x * k, -r.y * k, k];
    knockOut();
    holeLoop(true);
  }
  // While the drawing is on screen the hole is re-checked every animation frame, so it follows a caption
  // as it fades in or out, a phone crop that pans, and Safari's toolbar lifting the caption.
  let holeAt = null, holeRaf = 0;
  function holeLoop(on) {
    if (!on) { cancelAnimationFrame(holeRaf); holeRaf = 0; return; }
    if (holeRaf) return;
    const tick = () => { knockOut(); holeRaf = +print.style.opacity > 0.001 ? requestAnimationFrame(tick) : 0; };
    holeRaf = requestAnimationFrame(tick);
  }
  // The caption on screen is cut out of the drawing, so linework never runs through its text.
  let capMaskRect = null, lastHole = '';
  function knockOut() {
    capMaskRect = capMaskRect || print.querySelector('#capHole');
    if (!capMaskRect || !holeAt) return;
    const [x0, y0, k] = holeAt;
    const pr = print.getBoundingClientRect();
    let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity;
    caps.forEach(cap => {
      // a caption still fading out keeps its hole until it is gone
      if (!cap.classList.contains('is-on') && !(parseFloat(getComputedStyle(cap).opacity) > 0.02)) return;
      Array.from(cap.children).forEach(el => {
        const q = el.getBoundingClientRect();
        if (!q.width || !q.height) return;
        a = Math.min(a, q.left); b = Math.min(b, q.top); c = Math.max(c, q.right); d = Math.max(d, q.bottom);
      });
    });
    const pad = 14;
    const sig = (a === Infinity ? 'none' : [a, b, c, d, pr.left, pr.top].map(n => Math.round(n)).join(',')) + '|' + lastView;
    if (sig === lastHole) return;
    lastHole = sig;
    if (a === Infinity) { capMaskRect.setAttribute('width', '0'); return; }
    capMaskRect.setAttribute('x', (x0 + (a - pr.left - pad) * k).toFixed(1));
    capMaskRect.setAttribute('y', (y0 + (b - pr.top - pad) * k).toFixed(1));
    capMaskRect.setAttribute('width', ((c - a + 2 * pad) * k).toFixed(1));
    capMaskRect.setAttribute('height', ((d - b + 2 * pad) * k).toFixed(1));
    capMaskRect.setAttribute('rx', (12 * k).toFixed(1));
  }

  let lastDay = -1, lastShot = -1;
  function ui(f, vLocal) {
    const shot = Math.min(5, Math.floor(f / PER));
    // the engine's local position knows each shot's real length (shot 6 has 31 frames, "lens" in frames.json)
    const local = typeof vLocal === 'number' ? vLocal : clamp((f - shot * PER) / (PER - 1));
    // The counter runs through the days the shot covers, in step with the time-lapse on screen. The last
    // shot reaches Day 330 before its caption ("Day 330 · Keys") comes up, then holds.
    const [d0, d1] = SPANS[shot];
    const k = shot === 5 ? clamp(local / 0.28) : local;
    const day = Math.round(lerp(d0, d1, k));
    if (day !== lastDay) { schedDay.textContent = String(day).padStart(3, '0'); lastDay = day; }
    schedFill.style.setProperty('--p', ((day - 1) / (TOTAL - 1)).toFixed(4));
    if (shot !== lastShot) {
      phases.forEach((li, n) => { li.classList.toggle('is-on', n === shot); li.classList.toggle('is-done', n < shot); });
      lastShot = shot;
    }
    caps.forEach(cap => {
      const s = +cap.dataset.shot;
      let on;
      if (s === 0) on = f < 22;
      else if (s === 5) on = shot === 5 && local >= 0.3;
      else on = shot === s && local > 0.08 && local < 0.9;
      cap.classList.toggle('is-on', on);
    });
    if (holeRaf === 0 && +print.style.opacity > 0.001) knockOut();
    stage.classList.toggle('is-hero', caps[0].classList.contains('is-on'));
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
    onFrame: v => ui(v.f, v.local),
  });
  setTimeout(openLoader, 9000); // never trap a visitor behind the loader on a very slow connection
  const solid = () => bar.classList.toggle('is-solid', film.getBoundingClientRect().bottom < 90);
  addEventListener('scroll', solid, { passive: true }); solid();
  ui(0);

  /* ---------- Plans ---------- */
  // Rooms in feet: [key, name, x, y, w, h, short name for phones]. Rooms with a key can be tapped; the rest
  // are drawn only.
  const PLANS = {
    pecan: {
      name: 'The Pecan', sqft: 2700, w: 72, h: 46,
      up: 'One story. The study has a closet, so it works as bedroom 3.',
      rooms: [
        ['primary', 'Primary', 0, 0, 20, 18], ['bath', 'Primary bath', 0, 18, 20, 12], [null, 'Bedroom 2', 0, 30, 20, 16],
        ['great', 'Great room', 20, 0, 26, 26], [null, 'Bath 2 · hall', 20, 26, 26, 8, 'Bath 2'], [null, 'Foyer', 20, 34, 10, 12],
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
    mesquite: {
      name: 'The Mesquite', sqft: 3600, w: 70, h: 44,
      up: 'Upstairs: three bedrooms, two baths and a game room, 1,050 sq ft.',
      rooms: [
        ['study', 'Study', 0, 0, 20, 12], ['primary', 'Primary', 0, 12, 20, 18], ['bath', 'Primary bath', 0, 30, 20, 14],
        ['great', 'Great room', 20, 0, 26, 24], [null, 'Dining', 20, 24, 26, 10], [null, 'Foyer', 20, 34, 10, 10],
        [null, 'Stair · powder', 30, 34, 16, 10, 'Stair'], ['kitchen', 'Kitchen', 46, 0, 24, 16], [null, 'Utility', 46, 16, 24, 6],
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
      up: 'Upstairs: two bedrooms and a shared bath, 670 sq ft. This is the house in the film.',
      rooms: [
        ['kitchen', 'Kitchen', 0, 0, 26, 20], [null, 'Dining', 0, 20, 26, 14], [null, 'Utility', 0, 34, 26, 8],
        [null, 'Guest suite', 0, 42, 26, 14, 'Guest'], ['great', 'Great room', 26, 0, 32, 30], [null, 'Two-story foyer', 26, 30, 14, 26, 'Foyer'],
        [null, 'Stair · powder', 40, 30, 18, 12, 'Stair'], ['study', 'Study', 40, 42, 18, 14], ['primary', 'Primary', 58, 0, 26, 20],
        ['bath', 'Primary bath', 58, 20, 26, 14], [null, 'Garage', 58, 34, 26, 22], ['porch', 'Porch', 0, 56, 40, 8]
      ],
      door: [26, 56],
      fin: {
        great: [['Floor', 'Wide-plank white oak'], ['Ceiling', '18 ft, cedar beams'], ['Fireplace', 'Cut limestone, up to the beams']],
        kitchen: [['Cabinets', 'Rift white oak'], ['Counters', 'Honed quartzite'], ['Hood', 'Plaster, over a gas range']],
        primary: [['Floor', 'Wide-plank white oak'], ['Ceiling', 'Vaulted, cedar beams'], ['Wall', 'Cut limestone behind the bed']],
        bath: [['Shower', 'Walk-in, glass panel'], ['Stone', 'Honed limestone'], ['Tub', 'Freestanding soaking tub']],
        study: [['Shelves', 'Built in, floor to ceiling'], ['Ceiling', 'Vaulted, cedar beams'], ['Wiring', 'Data, sound damping']],
        porch: [['Ceiling', 'Cedar tongue and groove'], ['Posts', 'Cedar 10 x 10'], ['Floor', 'Limestone pavers']]
      }
    }
  };
  // Every photo is of The Bluebonnet (the house in the film), so each says so; on the other plans the
  // finishes list is that plan's own.
  const PHOTOS = {
    great: ['img/room-great.webp', 'The Bluebonnet great room seen from the foyer: an 18-foot ceiling with cedar beams, a limestone fireplace wall and the kitchen beyond'],
    kitchen: ['img/room-kitchen.webp', 'The Bluebonnet kitchen with white oak cabinets, a plaster hood and a long island'],
    primary: ['img/room-primary.webp', 'The Bluebonnet primary bedroom with a vaulted beamed ceiling, a limestone wall and a wall of black-framed windows'],
    bath: ['img/room-bath.webp', 'The Bluebonnet primary bath with a freestanding tub, a glass-panel shower and limestone walls'],
    study: ['img/room-study.webp', 'The Bluebonnet study with built-in shelves floor to ceiling'],
    porch: ['img/room-porch.webp', 'The Bluebonnet back porch with an outdoor fireplace, cedar posts and a cedar ceiling']
  };
  const photoNote = (k, p) => k === 'porch'
    ? `Photo: The Bluebonnet's back porch. ${p.name === 'The Bluebonnet' ? 'The front porch has' : 'This porch has'} the same cedar ceiling and posts.`
    : p.name === 'The Bluebonnet' ? 'Photo: The Bluebonnet, Designer finishes' : `Photo: the same room in The Bluebonnet. Sizes and finishes here are ${p.name}'s.`;
  const ORDER = ['great', 'kitchen', 'primary', 'bath', 'study', 'porch'];

  const planSvg = $('#planSvg'), planCap = $('#planCap'), planUp = $('#planUp');
  const roomImgs = $$('.room__img'), roomSrc = $('#roomSrc'), roomStatus = $('#roomStatus'), roomK = $('#roomK'), roomH = $('#roomH'), roomDim = $('#roomDim'), roomFin = $('#roomFin');
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

    p.rooms.forEach(([k, name, x, y, w, h, short], i) => {
      const g = svgEl('g', { class: k ? 'tap' : 'dull' }, planSvg);
      const isPorch = k === 'porch';
      // the porch is only 8 ft deep: its tap area runs on past the plan so it is at least 44 px on a phone
      if (isPorch) svgEl('rect', { x: x * S, y: y * S, width: w * S, height: (h + 6) * S, class: 'hit' }, g);
      svgEl('rect', { x: x * S, y: y * S, width: w * S, height: h * S, class: 'rm' }, g);
      svgEl('path', {
        d: `M${x * S} ${y * S} h${w * S} v${h * S} h${-w * S} Z`,
        class: isPorch ? 'wall porch-ln' : 'wall', pathLength: '1',
        style: `animation-delay:${(i * 0.05).toFixed(2)}s`
      }, g);
      const cx = (x + w / 2) * S, cy = (y + h / 2) * S;
      if (k === 'bath') short = 'Bath';
      const nm = svgEl('text', { x: cx, y: k ? cy - 2 : cy + 4, class: short ? 'nm nm--long' : 'nm' }, g); nm.textContent = name;
      if (short) { const ns = svgEl('text', { x: cx, y: k ? cy - 2 : cy + 4, class: 'nm nm--short' }, g); ns.textContent = short; }
      if (k) {
        const sz = svgEl('text', { x: cx, y: cy + 17, class: 'sz' }, g); sz.textContent = `${w}' × ${h}'`;
        g.setAttribute('role', 'button');
        g.setAttribute('tabindex', '0');
        g.setAttribute('aria-label', `${name}, ${w} by ${h} feet`);
        g.dataset.room = k;
        g.addEventListener('click', () => selectRoom(k, true));
        g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectRoom(k, true); } });
      }
    });
    // Outline over the rooms, heavier, plus the front door swing
    svgEl('path', { d: `M0 0 h${p.w * S} v${p.h * S} h${-p.w * S} Z`, class: 'wall outline', pathLength: '1' }, planSvg);
    const [dx, dy] = p.door;
    svgEl('path', { d: `M${dx * S + 6} ${dy * S} a30 30 0 0 1 30 -30 v30`, class: 'door' }, planSvg);
    planCap.textContent = `${p.name} · ${p.sqft.toLocaleString('en-US')} sq ft living · ground floor shown`;
    planUp.textContent = p.up;
  }

  function selectRoom(k, announce) {
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
    roomSrc.textContent = photoNote(k, p);
    showPhoto(k);
    if (announce) {
      roomStatus.textContent = `${r[1]}, ${r[4]} by ${r[5]} feet, ${p.name}`;
      // where the card sits under the plan (phones, short screens), bring it into view after a tap
      const rc = roomCard.getBoundingClientRect();
      if (rc.top > innerHeight - 140 || rc.bottom > innerHeight - 8) {
        roomCard.scrollIntoView({ block: rc.height < innerHeight - 80 ? 'nearest' : 'start', behavior: reduce ? 'auto' : 'smooth' });
      }
    }
  }

  /* Room photo: two stacked images cross-fade. Only the latest tap wins: an older photo that finishes
     loading late is ignored, so fast taps can never leave the wrong room on screen. */
  const loaded = new Map(); // src -> Promise of a decoded image
  function load(src) {
    if (!loaded.has(src)) {
      const im = new Image();
      im.decoding = 'async';
      if ('fetchPriority' in im) im.fetchPriority = 'high';
      im.src = src;
      loaded.set(src, (im.decode ? im.decode() : new Promise((res, rej) => { im.onload = res; im.onerror = rej; })).then(() => src, () => { loaded.delete(src); return src; }));
    }
    return loaded.get(src);
  }
  let photoToken = 0, front = 0, busyT = 0;
  const roomPh = $('.room__ph'), roomCard = $('#room');
  const hideImg = im => { im.classList.remove('is-on'); im.alt = ''; im.setAttribute('aria-hidden', 'true'); };
  const showImg = (im, alt) => { im.classList.add('is-on'); im.alt = alt; im.removeAttribute('aria-hidden'); };
  // A slow photo shows a loading cue on the old one, so new room text over an old photo never looks final.
  const busy = on => {
    clearTimeout(busyT);
    if (on) busyT = setTimeout(() => { roomPh.classList.add('is-loading'); roomPh.setAttribute('aria-busy', 'true'); }, 120);
    else { roomPh.classList.remove('is-loading'); roomPh.removeAttribute('aria-busy'); }
  };
  function showPhoto(k) {
    const [src, alt] = PHOTOS[k];
    const cur = roomImgs[front], back = roomImgs[1 - front];
    const token = ++photoToken;
    // the room already showing: cancel any swap on its way and make sure only this photo is read out
    if (cur.getAttribute('src') === src) { busy(false); showImg(cur, alt); hideImg(back); return; }
    busy(true);
    load(src).then(() => {
      if (token !== photoToken) return;
      back.src = src;
      const swap = () => {
        if (token !== photoToken) return;
        busy(false);
        showImg(back, alt); hideImg(cur);
        front = 1 - front;
      };
      if (back.decode) back.decode().then(swap, swap); else swap();
    });
  }
  // Fetch all six photos once the plans are close, so a tap shows its room straight away.
  const plansSec = $('#plans');
  const warm = () => Object.values(PHOTOS).forEach(([src]) => load(src));
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((es, o) => { if (es.some(e => e.isIntersecting)) { warm(); o.disconnect(); } }, { rootMargin: '600px 0px' }).observe(plansSec);
  } else warm();

  function choosePlan(k, fromUser) {
    plan = k;
    tabs.forEach(t => {
      const on = t.dataset.plan === k;
      t.setAttribute('aria-checked', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
    });
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
  const RATE = { builder: 265, designer: 330, custom: 425 };
  const SITE = 60000; // site work, engineering, permits and city fees ("from $60,000")
  const size$ = $('#estSize'), sizeOut = $('#estSizeOut'), hint = $('#estPlanHint');
  const lo$ = $('#estLo'), hi$ = $('#estHi'), rowA = $('#estRowA'), rowAv = $('#estRowAv'), days$ = $('#estDays'), lotNote = $('#estLotNote');
  const lotRow = $('#estLotRow'), estStatus = $('#estStatus');
  // Days from the survey stakes to keys: 220 at 1,800 sq ft plus 11 per 300 sq ft, then finish level
  // (Builder -5, Designer 0, Custom +30). That runs 215 to 420 days, the FAQ's seven to fourteen months,
  // and The Bluebonnet with Designer finishes is the film's 330.
  const SCHED = { builder: -5, designer: 0, custom: 30 };
  const schedDays = (sz, fin) => Math.round((220 + (sz - 1800) * 11 / 300 + (SCHED[fin] || 0)) / 5) * 5;
  let statusT = 0;
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
    const days = schedDays(sz, fin);
    days$.textContent = `about ${days} days`;
    lotRow.hidden = lot === 'own';
    lotNote.textContent = lot === 'own'
      ? 'Lot not included. We assess your lot for free before you sign.'
      : 'Plus a lot. Lots we build on run about $140,000 to $280,000, and we help you find one before you buy.';
    roll(lo, hi, animate && !reduce);
    // Screen readers hear the result once, after the input settles, not every step of the count.
    clearTimeout(statusT);
    statusT = setTimeout(() => {
      estStatus.textContent = `Estimated build cost ${money(lo)} to ${money(hi)}, about ${days} days from stakes to keys.${lot === 'own' ? '' : ' Plus a lot, and one to three months to find and close on it before design starts.'}`;
    }, 700);
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
  const pickChip = b => {
    $$('.chip', daysEl).forEach(x => { const on = x === b; x.setAttribute('aria-checked', on ? 'true' : 'false'); x.tabIndex = on ? 0 : -1; });
  };
  picks.forEach((day, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'chip';
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', i === 0 ? 'true' : 'false');
    b.tabIndex = i === 0 ? 0 : -1;
    b.textContent = `${fmt.format(day)}, 9 am`;
    b.addEventListener('click', () => pickChip(b));
    daysEl.appendChild(b);
  });
  // Arrow keys move the choice, like any radio group.
  daysEl.addEventListener('keydown', e => {
    const all = $$('.chip', daysEl), i = all.indexOf(document.activeElement);
    if (i < 0) return;
    let j = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') j = (i + 1) % all.length;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') j = (i + all.length - 1) % all.length;
    if (e.key === 'Home') j = 0;
    if (e.key === 'End') j = all.length - 1;
    if (j < 0) return;
    e.preventDefault(); pickChip(all[j]); all[j].focus();
  });
  const form = $('#walkForm'), msg = $('#walkMsg');
  form.addEventListener('submit', e => {
    e.preventDefault();
    const nameEl = $('#wName'), emailEl = $('#wEmail');
    const name = nameEl.value.trim(), email = emailEl.value.trim();
    msg.classList.remove('is-err');
    nameEl.removeAttribute('aria-invalid'); emailEl.removeAttribute('aria-invalid');
    const bad = (el, text) => { msg.classList.add('is-err'); msg.textContent = text; el.setAttribute('aria-invalid', 'true'); el.focus(); };
    if (!name || name.length > 80) return bad(nameEl, 'Please add your name.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 120) return bad(emailEl, 'Please check your email address.');
    msg.textContent = 'This is a concept site, so nothing was sent. On a real site, the builder confirms your lot walk by email the same day.';
  });
})();
