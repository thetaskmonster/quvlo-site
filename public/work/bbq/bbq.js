/* Post Oak & Pepper (concept by Quvlo). One clock drives the film: the scroll position is the time of the
   cook. Fire at 9:00 pm, brisket on at 10:00 pm, off at 9:00 am, sliced at 11:00 am. The gauge, the cook
   log and the captions read that clock from the frame actually on screen. No libraries, no innerHTML. */
(() => {
  'use strict';
  // Bump when any film frame changes, so browsers fetch the new frames instead of cached ones.
  const FV = '2026102901';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const ease = k => k * k * (3 - 2 * k);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- The cook ---------- */
  // Minutes since 8:40 pm at the start and end of each shot. Shot 6 (the slicing) is two hours after
  // shot 5 (the wrap at sunrise): the film cuts across the end of the cook and the rest.
  const SPAN = [[0, 20], [20, 65], [65, 80], [80, 580], [580, 600], [860, 862]];
  const START_MIN = 20 * 60 + 40;
  // Brisket internal temperature (°F) against minutes since 8:40 pm: a 14 lb prime packer at 275°. On at
  // 10:00 pm from the cooler, 150° by 2:30 am, stalls near 160° until it is wrapped at 6:20 am, 203° at
  // 9:00 am, then rests (held warm) and settles to about 168° by 11:00 am.
  const TEMP_KEYS = [[0, 38], [80, 38], [150, 70], [230, 112], [350, 150], [410, 160], [500, 163], [580, 165], [660, 186], [740, 203], [800, 182], [860, 168], [900, 166]];
  // Monotone cubic (Fritsch-Carlson): smooth, and never overshoots or invents plateaus between the keys.
  const tempAt = (() => {
    const xs = TEMP_KEYS.map(k => k[0]), ys = TEMP_KEYS.map(k => k[1]), n = xs.length;
    const d = [], m = new Array(n).fill(0);
    for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
    m[0] = d[0]; m[n - 1] = d[n - 2];
    for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
    for (let i = 0; i < n - 1; i++) {
      if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
      const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b;
      if (s > 9) { const t = 3 / Math.sqrt(s); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i]; }
    }
    return t => {
      if (t <= xs[0]) return ys[0];
      if (t >= xs[n - 1]) return ys[n - 1];
      let i = 0; while (t > xs[i + 1]) i++;
      const h = xs[i + 1] - xs[i], u = (t - xs[i]) / h, u2 = u * u, u3 = u2 * u;
      return (2 * u3 - 3 * u2 + 1) * ys[i] + (u3 - 2 * u2 + u) * h * m[i] + (-2 * u3 + 3 * u2) * ys[i + 1] + (u3 - u2) * h * m[i + 1];
    };
  })();
  function pitAt(t) {
    if (t < 20) return 0;
    if (t < 70) return lerp(90, 275, ease((t - 20) / 50));
    return 275 + Math.sin(t / 37) * 4;
  }
  function stateAt(t) {
    if (t < 65) return ['In the cooler', false];
    if (t < 80) return ['Rubbed, pit warming', false];
    if (t < 230) return ['Taking smoke', false];
    if (t < 410) return ['Bark setting', false];
    if (t < 580) return ['The stall. Hold steady.', true];
    if (t < 740) return ['Wrapped. Off when probe-tender.', false];
    if (t < 855) return ['Off the pit, resting', false];
    return ['Rested. Slice.', false];
  }
  const clockText = t => {
    const m = Math.round(START_MIN + t) % 1440, h = Math.floor(m / 60), mm = m % 60;
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${String(mm).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
  };

  /* ---------- Film (shared engine: film-engine.js) ---------- */
  const PER = 40;
  let LENS = [PER, PER, PER, PER, PER, PER], META = null;
  const film = $('#film'), canvas = $('#filmCanvas'), stage = $('.film__stage');
  const fx = $('#fxCanvas'), fctx = fx.getContext('2d');
  const caps = $$('.cap'), logItems = $$('#log li'), logEl = $('#log'), hud = $('#hud');
  const loader = $('#loader'), loadPct = $('#loadPct'), loadBar = $('#loadBar');
  const bar = $('.bar'), safe = $('.film__safe');
  const gTemp = $('#gTemp'), gState = $('#gState'), gPit = $('#gPit'), gPitU = $('#gPitU'), gClock = $('#gClock');
  const gNeedle = $('#gNeedle'), gFill = $('#gFill');
  let filmVisible = true;

  let opened = false;
  function openLoader() {
    if (opened) return; opened = true;
    document.body.classList.remove('is-loading');
    loader.classList.add('is-open');
    // once faded, take the loader out of the page entirely: iPhone Safari tints its toolbars from fixed elements, even invisible ones
    setTimeout(() => { loader.style.display = 'none'; }, 900);
  }
  // Shot and progress through its real frames (frames.json "lens") for a fractional frame index
  function at(f) {
    const shot = Math.min(5, Math.max(0, Math.floor(f / PER)));
    const len = LENS[shot] || PER;
    return { shot, local: clamp((f - shot * PER) / Math.max(1, len - 1)), len };
  }
  const timeOf = (shot, local) => lerp(SPAN[shot][0], SPAN[shot][1], local);

  /* ---------- Gauge ---------- */
  const G_MIN = 0, G_MAX = 250, A0 = -135, A1 = 135; // degrees clockwise from 12 o'clock; the gap sits at the bottom
  const angFor = v => lerp(A0, A1, clamp((v - G_MIN) / (G_MAX - G_MIN)));
  const pt = (a, r) => { const rad = (a - 90) * Math.PI / 180; return [100 + r * Math.cos(rad), 100 + r * Math.sin(rad)]; };
  const arc = (a0, a1, r) => { const [x0, y0] = pt(a0, r), [x1, y1] = pt(a1, r); return `M${x0.toFixed(2)},${y0.toFixed(2)} A${r},${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1.toFixed(2)},${y1.toFixed(2)}`; };
  (function buildGauge() {
    $('#gArc').setAttribute('d', arc(A0, A1, 74));
    $('#gStall').setAttribute('d', arc(angFor(150), angFor(170), 74));
    const ns = 'http://www.w3.org/2000/svg', g = $('#gTicks');
    for (let v = 0; v <= 250; v += 25) {
      const a = angFor(v), major = v % 50 === 0;
      const [x0, y0] = pt(a, major ? 62 : 65), [x1, y1] = pt(a, 69);
      const l = document.createElementNS(ns, 'line');
      l.setAttribute('x1', x0); l.setAttribute('y1', y0); l.setAttribute('x2', x1); l.setAttribute('y2', y1);
      g.append(l);
    }
  })();
  let lastTempTxt = '', lastClock = '', lastState = '', lastPit = '';
  function gauge(t) {
    const temp = tempAt(t);
    const a = angFor(temp);
    gNeedle.style.transform = `rotate(${a}deg)`;
    gFill.setAttribute('d', a - A0 > 0.5 ? arc(A0, a, 74) : '');
    const tt = String(Math.round(temp));
    if (tt !== lastTempTxt) { gTemp.textContent = tt; lastTempTxt = tt; }
    const [st, stall] = stateAt(t);
    if (st !== lastState) { gState.textContent = st; gState.classList.toggle('is-stall', stall); lastState = st; }
    const p = pitAt(t), pt2 = p < 1 ? 'cold' : String(Math.round(p));
    if (pt2 !== lastPit) { gPit.textContent = pt2; gPitU.hidden = p < 1; lastPit = pt2; }
    const c = clockText(t);
    if (c !== lastClock) { gClock.textContent = c; lastClock = c; }
  }

  /* ---------- Where things sit on the picture ---------- */
  // Source frame (u, v from 0 to 1) to stage CSS pixels for frame slot i, in whatever set and fit the engine
  // is drawing. Phone frames are crops of the source and a tablet's band follows the phone crop's center,
  // so both depend on the slot.
  function toScr(v, i, u, w) {
    const R = v.rect, dpr = v.dpr, m = META && META.m;
    if (v.set === 'm' && m && m.crop) return [(R.x + ((u - m.crop[i]) / m.cropW) * R.w) / dpr, (R.y + w * R.h) / dpr];
    let x = R.x;
    if (v.fit === 'band' && m && m.crop) { const u0 = m.crop[i] + (m.cropW || 0.31) / 2; x = Math.min(0, Math.max(v.cw - R.w, v.cw / 2 - u0 * R.w)); }
    return [(x + u * R.w) / dpr, (R.y + w * R.h) / dpr];
  }
  // What each shot is about, as boxes on the source frame at the start and end of the shot, with how much
  // covering it matters (1 = the subject, lower = context). Captions are placed to stay off them.
  const SUBJ = [
    [[1, [0.20, 0.26, 0.82, 0.89], [0.15, 0.22, 0.87, 0.95]], [0.3, [0.23, 0, 0.31, 0.26], [0.21, 0, 0.30, 0.22]]],
    [[1, [0.37, 0.36, 0.63, 0.99], [0.37, 0.36, 0.63, 0.99]], [0.3, [0.62, 0.36, 0.82, 0.99], [0.62, 0.36, 0.82, 0.99]], [0.2, [0, 0, 0.37, 0.55], [0, 0, 0.02, 0.1]]],
    [[1, [0.30, 0.55, 0.85, 0.83], [0.30, 0.56, 0.85, 0.84]], [1, [0.05, 0, 0.56, 0.62], [0, 0.35, 0.76, 0.75]], [0.3, [0.30, 0, 1, 0.50], [0.30, 0, 1, 0.50]]],
    [[1, [0.15, 0.20, 0.75, 0.68], [0.15, 0.20, 0.75, 0.68]], [0.4, [0.73, 0.48, 0.92, 0.75], [0.73, 0.48, 0.92, 0.75]], [0.2, [0.13, 0, 0.40, 0.20], [0.13, 0, 0.40, 0.20]]],
    // shot 5 is three held stills with hard cuts, so its boxes cover the hands and the meat in all three
    [[1, [0.13, 0.50, 0.77, 0.86], [0.13, 0.50, 0.77, 0.86]], [0.3, [0.30, 0, 0.88, 0.50], [0.30, 0, 0.88, 0.50]]],
    [[1, [0.12, 0.42, 0.78, 0.74], [0.12, 0.42, 0.78, 0.74]], [0.6, [0.38, 0.15, 0.72, 0.75], [0.38, 0.15, 0.72, 0.75]], [1, [0.52, 0.50, 0.80, 0.80], [0.52, 0.50, 0.80, 0.80]]],
  ];
  // When each caption shows, as progress through its shot
  // shot 4 (overnight): the caption shows only while the lid is shut (local 0.17-0.88), so it never covers the
  // open chamber and the brisket at 10 pm or before dawn, whatever the screen
  const WIN = [[0, 0.7], [0.08, 0.92], [0.08, 0.92], [0.17, 0.88], [0.08, 0.92], [0.2, 1]];
  let layout = '', placeKey = '';
  function insets() {
    const cs = getComputedStyle(safe);
    return { t: parseFloat(cs.paddingTop) || 0, r: parseFloat(cs.paddingRight) || 0, b: parseFloat(cs.paddingBottom) || 0, l: parseFloat(cs.paddingLeft) || 0 };
  }
  function layoutFor(v) {
    const W = stage.clientWidth, H = stage.clientHeight;
    if (v ? v.set === 'm' : W < H && Math.min(W, H) < 600) return 'tall';
    if (v ? v.fit === 'band' : W < H) return 'band';
    return H < 560 ? 'short' : 'wide';
  }
  function setLayout(v) {
    const L = layoutFor(v);
    const fullLog = L === 'wide' && stage.clientHeight >= 860;
    if (L !== layout) { layout = L; stage.dataset.layout = L; placeKey = ''; }
    if (stage.classList.contains('is-fulllog') !== fullLog) { stage.classList.toggle('is-fulllog', fullLog); placeKey = ''; }
  }
  const box = el => ({ l: el.offsetLeft, t: el.offsetTop, r: el.offsetLeft + el.offsetWidth, b: el.offsetTop + el.offsetHeight });
  const overlap = (a, b) => Math.max(0, Math.min(a.r, b.r) - Math.max(a.l, b.l)) * Math.max(0, Math.min(a.b, b.b) - Math.max(a.t, b.t));
  // Put every caption where it covers the least of its shot's subject over the time it shows, clear of the
  // pit card and the top bar. Done once per layout and size, so captions never wander while they show.
  // Subject rectangles on screen for shot s at five moments between progress a and b
  function subjects(v, s, a, b) {
    const rects = [], len = LENS[s] || PER;
    for (let k = 0; k <= 4; k++) {
      const loc = lerp(a, b, k / 4), i = s * PER + Math.round(loc * (len - 1));
      SUBJ[s].forEach(([w, p, q]) => {
        const bx = p.map((x, n) => lerp(x, q[n], loc));
        const [x0, y0] = toScr(v, i, bx[0], bx[1]), [x1, y1] = toScr(v, i, bx[2], bx[3]);
        rects.push({ w, l: x0, t: y0, r: x1, b: y1 });
      });
    }
    return rects;
  }
  // On landscape screens the pit card takes, for each shot, the corner that covers the least of that shot's
  // subject (top right first); on phones upright and tablets upright it has a fixed place (bbq.css).
  let HUDS = null, hudShot = -1, hudFade = 0;
  function applyHud(shot) {
    if (!HUDS || shot === hudShot) return;
    hudShot = shot;
    const h = HUDS[shot];
    if (!h) { hud.style.left = hud.style.top = hud.style.right = ''; hud.style.removeProperty('--low'); hud.dataset.corner = ''; return; }
    // a move to another corner happens at a cut: the card leaves at once and fades in at its new corner
    const moved = hud.dataset.corner && hud.dataset.corner !== h.corner && !reduce;
    if (moved) hud.classList.add('is-moving');
    hud.style.right = 'auto'; hud.style.left = h.l + 'px'; hud.style.top = h.t + 'px';
    hud.style.setProperty('--low', h.low ? '1' : '0'); hud.dataset.corner = h.corner;
    if (moved) { const tok = ++hudFade; requestAnimationFrame(() => requestAnimationFrame(() => { if (tok === hudFade) hud.classList.remove('is-moving'); })); }
  }
  function placeCaps(v) {
    const W = stage.clientWidth, H = stage.clientHeight;
    // the pit card's height is in the key too: if it ever changes, the captions are placed again around it
    const key = [layout, W, H, v.set, v.fit, Math.round(v.rect.w), Math.round(v.rect.h), stage.classList.contains('is-fulllog'), hud.offsetHeight].join(':');
    if (key === placeKey) return;
    placeKey = key;
    const ins = insets(), gut = layout === 'tall' ? 12 : Math.max(16, Math.min(56, W * 0.04));
    const top = bar.offsetHeight + 8;
    // the pit card's place per shot
    hud.style.left = hud.style.top = hud.style.right = ''; hudShot = -1;
    const fixed = box(hud), hw = hud.offsetWidth, hh = hud.offsetHeight;
    HUDS = [0, 1, 2, 3, 4, 5].map(s => {
      if (layout !== 'wide' && layout !== 'short') return null;
      // short screens (phones on their side): during the rub the meat fills the lower band, so the card goes top left
      // (over the shed) and the caption top right, and the brisket stays clear
      if (layout === 'short' && s === 2) return { corner: 'tl', l: Math.round(gut + ins.l), t: Math.round(top + 4), low: false, score: 0 };
      const rects = subjects(v, s, 0, 1), tY = top + 4, bY = H - 16 - ins.b - hh;
      const opts = [['tr', W - gut - ins.r - hw, tY], ['tl', gut + ins.l, tY], ['br', W - gut - ins.r - hw, bY], ['bl', gut + ins.l, bY]];
      let best = null;
      opts.forEach(([corner, l, t], k) => {
        const c = { l, t, r: l + hw, b: t + hh };
        let score = k * 0.03;
        rects.forEach(r => { score += r.w * overlap(c, r) / (hw * hh) / 5; });
        if (!best || score < best.score) best = { corner, l: Math.round(l), t: Math.round(t), low: t > H / 2, score };
      });
      return best;
    });
    const bottom = layout === 'tall' ? fixed.t - 10 : H - 14 - ins.b;
    const band = v.fit === 'band' ? { t: v.rect.y / v.dpr, b: (v.rect.y + v.rect.h) / v.dpr } : null;
    caps.forEach(cap => {
      const s = +cap.dataset.shot, cw = cap.offsetWidth, ch = cap.offsetHeight;
      const hr = HUDS[s] ? { l: HUDS[s].l, t: HUDS[s].t, r: HUDS[s].l + hw, b: HUDS[s].t + hh } : fixed;
      const hudPad = { l: hr.l - 10, t: hr.t - 10, r: hr.r + 10, b: hr.b + 10 };
      const L = gut + ins.l, Rr = W - cw - gut - ins.r;
      const xs = Rr - L < 4 ? [(L + Rr) / 2] : [L, Rr, (W - cw) / 2];
      const ys = [bottom - ch, top, hr.b + 12, hr.t - ch - 12, (top + bottom - ch) / 2];
      if (band) ys.push(band.b + 12, band.t - ch - 12);
      const rects = subjects(v, s, WIN[s][0], WIN[s][1]);
      let best = null;
      ys.forEach((y, yi) => xs.forEach((x, xi) => {
        if (y < top - 0.5 || y + ch > bottom + 0.5) return;
        const c = { l: x, t: y, r: x + cw, b: y + ch };
        let score = yi * 0.02 + xi * 0.01;
        if (overlap(c, hudPad) > 0) score += 50;
        rects.forEach(r => { score += r.w * overlap(c, r) / (cw * ch) / 5; });
        if (!best || score < best.score) best = { x, y, score };
      }));
      if (!best) best = { x: xs[0], y: Math.max(top, bottom - ch), score: 99 };
      if (layout === 'short' && s === 2) best = { x: Rr, y: top, score: 0 };
      cap.style.left = Math.round(best.x) + 'px';
      cap.style.top = Math.round(best.y) + 'px';
      // captions in the lower half rise with Safari's toolbar (the engine sets --film-hide on the stage)
      cap.style.setProperty('--low', best.y + ch / 2 > H / 2 ? '1' : '0');
      cap.dataset.cover = best.score.toFixed(3);
    });
    applyHud(at(v.f).shot);
  }

  /* ---------- Notes pinned to the meat ---------- */
  // Anchor points tracked through each distinct frame of shots 3 and 6 (phase B reshoot frames), with whether the
  // point is clear of the hands on that frame (scratchpad realism/reshoot/bbq/track_pins.py)
  const TRACK = {
    salt: [[0.53,0.635,1],[0.5299,0.635,1],[0.5299,0.635,1],[0.5299,0.635,1],[0.5299,0.635,1],[0.5299,0.635,1],[0.5299,0.6349,1],[0.5299,0.635,1],[0.5299,0.6349,1],[0.5299,0.6349,1],[0.5298,0.6349,1],[0.5298,0.6349,1],[0.5298,0.6349,1],[0.5299,0.6349,1],[0.5299,0.6349,1],[0.5299,0.6349,1],[0.5299,0.6349,1],[0.5299,0.6349,1],[0.5316,0.6241,1],[0.5316,0.6242,1],[0.5316,0.6242,1],[0.5315,0.6243,1],[0.5315,0.6244,1],[0.5315,0.6244,1],[0.5315,0.6244,1],[0.5315,0.6244,1],[0.5315,0.6244,1],[0.5315,0.6244,1],[0.5315,0.6244,1],[0.5315,0.6244,1],[0.5315,0.6244,1],[0.5315,0.6244,1],[0.5315,0.6244,1],[0.5315,0.6244,1],[0.5315,0.6244,0],[0.5315,0.6243,0],[0.5315,0.6241,0],[0.5314,0.625,0],[0.5314,0.6244,0],[0.5314,0.6245,0]],
    cap: [[0.46,0.68,1],[0.4599,0.68,1],[0.4599,0.68,1],[0.4599,0.68,1],[0.4599,0.68,1],[0.4599,0.68,1],[0.4599,0.6799,1],[0.4599,0.68,1],[0.4599,0.6799,1],[0.4599,0.6799,1],[0.4598,0.6799,1],[0.4598,0.6799,1],[0.4598,0.6799,1],[0.4599,0.6799,1],[0.4599,0.6799,1],[0.4599,0.6799,1],[0.4599,0.6799,1],[0.4599,0.6799,1],[0.4616,0.6691,1],[0.4616,0.6692,1],[0.4616,0.6692,1],[0.4615,0.6693,1],[0.4615,0.6694,1],[0.4615,0.6694,1],[0.4615,0.6694,1],[0.4615,0.6694,1],[0.4615,0.6694,1],[0.4615,0.6694,1],[0.4615,0.6694,1],[0.4615,0.6694,1],[0.4615,0.6694,1],[0.4615,0.6694,1],[0.4615,0.6694,1],[0.4615,0.6694,1],[0.4615,0.6694,0],[0.4615,0.6693,0],[0.4615,0.6691,0],[0.4614,0.67,0],[0.4614,0.6694,0],[0.4614,0.6695,0]],
    ring: [[0.665,0.6,1],[0.665,0.6001,1],[0.6649,0.6007,1],[0.665,0.5999,1],[0.6652,0.5979,1],[0.665,0.5993,1],[0.6649,0.5997,1],[0.6649,0.6006,1],[0.665,0.6,1],[0.665,0.5991,1],[0.6649,0.5993,1],[0.6649,0.5995,1],[0.6649,0.5999,1],[0.6649,0.5996,1],[0.665,0.5984,1],[0.665,0.5991,1],[0.6649,0.5997,1],[0.6649,0.6002,1],[0.6649,0.6001,1],[0.665,0.5986,1],[0.665,0.5992,1],[0.6649,0.5995,1],[0.6649,0.5999,1],[0.6649,0.5999,1],[0.6649,0.5999,1],[0.6649,0.5991,1],[0.6649,0.5995,1],[0.665,0.5998,1],[0.6651,0.5962,1],[0.665,0.5971,1],[0.665,0.5972,1],[0.665,0.5972,1],[0.665,0.5976,1],[0.665,0.598,1],[0.665,0.5972,1],[0.665,0.5966,1],[0.665,0.5975,1],[0.665,0.5978,1],[0.6649,0.598,1],[0.665,0.597,1]],
    bark: [[0.41,0.56,1],[0.41,0.5601,1],[0.4099,0.5607,1],[0.41,0.5599,1],[0.4102,0.5579,1],[0.41,0.5593,1],[0.4099,0.5597,1],[0.4099,0.5606,1],[0.41,0.56,1],[0.41,0.5591,1],[0.4099,0.5593,1],[0.4099,0.5595,1],[0.4099,0.5599,1],[0.4099,0.5596,1],[0.41,0.5584,1],[0.41,0.5591,1],[0.4099,0.5597,1],[0.4099,0.5602,1],[0.4099,0.5601,1],[0.41,0.5586,1],[0.41,0.5592,1],[0.4099,0.5595,1],[0.4099,0.5599,1],[0.4099,0.5599,1],[0.4099,0.5599,1],[0.4099,0.5591,1],[0.4099,0.5595,1],[0.41,0.5598,1],[0.4101,0.5562,1],[0.41,0.5571,1],[0.41,0.5572,1],[0.41,0.5572,1],[0.41,0.5576,1],[0.41,0.558,1],[0.41,0.5572,1],[0.41,0.5566,1],[0.41,0.5575,1],[0.41,0.5578,1],[0.4099,0.558,1],[0.41,0.557,1]],
  };
  const NOTES = [
    { shot: 2, key: 'salt', win: [0.04, 0.98], at: 0.12, t: 'Salt and pepper, 1:1', d: 'Kosher salt and 16-mesh black pepper, half and half. Nothing else.', rot: -2 },
    { shot: 2, key: 'cap', win: [0.08, 0.98], at: 0.40, t: 'Trimmed, fat side up', d: 'About a quarter inch of fat cap stays on top and renders down overnight.', rot: 1.5 },
    // the slices exist only after the cut at slot 29 of shot 6 (local 0.718); the pin sits on the far slices, so its
    // card has room beside them instead of over the knife
    { shot: 5, key: 'ring', win: [0.73, 1], at: 0.76, side: 'right', t: 'Smoke ring', d: 'The pink band under the bark, from a clean post oak fire.', rot: 1.5 },
    { shot: 5, key: 'bark', win: [0.3, 1], at: 0.55, side: 'left', t: 'Bark', d: 'Pepper, salt, smoke and rendered fat. Nothing else.', rot: -2 },
  ];
  const notesEl = $('#filmSpots'), tapHint = $('.cap__tap');
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
    pin.addEventListener('click', () => {
      const opening = !el.classList.contains('is-open');
      // on a phone one card at a time: opening a pin closes the others, and the tapped card is placed first
      if (opening && (stage.clientWidth < 600 || layout === 'short')) noteEls.forEach(o => { if (o !== st) o.forced = false; });
      st.forced = opening; if (opening) lastTap = st;
    });
    return st;
  });
  let lastTap = null;
  const inflate = (r, k) => ({ l: r.l - k, t: r.t - k, r: r.r + k, b: r.b + k });
  function notes(v) {
    if (!v || !v.rect) return;
    // phones, upright or on their side: a card opens only when its pin is tapped, so no card covers the meat
    const W = stage.clientWidth, H = stage.clientHeight, small = W < 600 || layout === 'short';
    const { shot, local, len } = at(v.f);
    const hide = parseFloat(stage.style.getPropertyValue('--film-hide')) || 0;
    const obst = [{ l: 0, t: 0, r: W, b: bar.offsetHeight + 6 }, inflate(box(hud), 8)];
    const capOn = caps.find(c => c.classList.contains('is-on'));
    if (capOn) { const r = box(capOn), lift = capOn.style.getPropertyValue('--low') === '1' ? hide : 0; obst.push(inflate({ l: r.l, t: r.t - lift, r: r.r, b: r.b - lift }, 8)); }
    const limB = H - hide - 8;
    const placed = [];
    const ok = r => r.l >= 8 && r.r <= W - 8 && r.t >= 8 && r.b <= limB && !obst.some(o => overlap(r, o) > 0) && !placed.some(q => overlap(r, inflate(q, 8)) > 0);
    // a card would rather sit off the shot's main subject (the hands, the meat) when there is room
    const subj = (shot === 2 || shot === 5) ? subjects(v, shot, local, local).slice(0, SUBJ[shot].length).filter(r => r.w >= 1) : [];
    const clear = r => ok(r) && !subj.some(q => overlap(r, q) > 0.15 * (r.r - r.l) * (r.b - r.t));
    // the card tapped last is placed first, so it gets the room
    const order = NOTES.map((n, j) => j).sort((a, b) => (noteEls[b] === lastTap) - (noteEls[a] === lastTap));
    order.forEach(j => {
      const n = NOTES[j], s = noteEls[j];
      // (with reduced motion the shot's still sits at its middle, so the same windows apply)
      const on = n.shot === shot && local >= n.win[0] && local <= n.win[1];
      let vis = false, X = 0, Y = 0;
      if (on) {
        const tr = TRACK[n.key], q = clamp(local * (len - 1), 0, tr.length - 1), i0 = Math.floor(q), i1 = Math.min(tr.length - 1, i0 + 1), k = q - i0;
        const u = lerp(tr[i0][0], tr[i1][0], k), w = lerp(tr[i0][1], tr[i1][1], k), clear = tr[Math.round(q)][2];
        [X, Y] = toScr(v, v.i, u, w);
        const pinBox = { l: X - 22, t: Y - 22, r: X + 22, b: Y + 22 };
        vis = !!clear && X > 24 && X < W - 24 && Y > 24 && Y < limB - 16 && !obst.some(o => overlap(pinBox, o) > 0);
      }
      s.el.classList.toggle('is-on', vis);
      if (!on) s.forced = null;
      // on phones a card opens only when its pin is tapped, so no card sits over the hands or the meat on its own
      let open = vis && (s.forced !== null ? s.forced : (!small && (reduce || local >= n.at)));
      if (vis) {
        s.el.style.transform = `translate3d(${X.toFixed(1)}px, ${Y.toFixed(1)}px, 0)`;
        const w = s.card.offsetWidth || 200, h = s.card.offsetHeight || 60, gap = small ? 26 : 48;
        let tries = [[gap, -h - gap], [-gap - w, -h - gap], [-gap - w, -h / 2], [gap, -h / 2], [gap, gap], [-gap - w, gap], [-w / 2, -h - gap], [-w / 2, gap]];
        // a note with a side keeps its card on that side of its pin when it can, so on the slicing shot neither card
        // covers the knife between the bark (card left) and the slices (card right)
        const pref = n.side === 'right' ? [[gap, -h / 2], [gap, gap], [gap, -h - gap]] : n.side === 'left' ? [[-gap - w, -h - gap], [-gap - w, -h / 2], [-gap - w, gap]] : [];
        if (pref.length) tries = pref.concat(tries.filter(t => !pref.some(q => q[0] === t[0] && q[1] === t[1])));
        const rect = ([dx, dy]) => ({ l: X + dx, t: Y + dy, r: X + dx + w, b: Y + dy + h });
        const inside = r => r.l >= 8 && r.r <= W - 8 && r.t >= 8 && r.b <= limB;
        let pick = open ? (pref.length ? pref.find(t => ok(rect(t))) : null) || (tries.find(t => clear(rect(t))) || tries.find(t => ok(rect(t)))) : null;
        // a card someone tapped always opens: if nothing is free, take the first spot that fits on screen
        if (open && !pick && s.forced) pick = tries.find(t => inside(rect(t))) || [clamp(-w / 2, 8 - X, W - 8 - w - X), clamp(-h - gap, 8 - Y, limB - h - Y)];
        if (open && !pick) open = false;
        if (pick) {
          const [dx, dy] = pick;
          placed.push({ l: X + dx, t: Y + dy, r: X + dx + w, b: Y + dy + h });
          s.card.style.left = dx + 'px'; s.card.style.top = dy + 'px';
          const ax = dx > 0 ? dx : dx + w, ay = dy > 0 ? dy : dy + h;
          s.line.style.width = Math.hypot(ax, ay) + 'px';
          s.line.style.transform = `rotate(${Math.atan2(ay, ax)}rad)`;
        }
      }
      s.el.classList.toggle('is-open', open);
      s.pin.setAttribute('aria-expanded', String(open));
    });
    // "Tap a pin" shows only while a pin is actually on screen
    const anyPin = noteEls.some(n => n.el.classList.contains('is-on'));
    if (tapHint && tapHint.classList.contains('is-on') !== anyPin) tapHint.classList.toggle('is-on', anyPin);
  }

  /* ---------- Embers: only while the firebox is on screen, harder when you scroll ---------- */
  // Sparks rise from the firebox mouth in shot 2 and nowhere else; scrolling fast is stoking the fire.
  const embers = [];
  let vel = 0, lastScrollP = 0, fxClear = true;
  function particles(dt, v) {
    const W = fx.width, H = fx.height;
    const fire = v && v.rect && v.shot === 1 && !reduce && filmVisible;
    if (!fire && !embers.length) { if (!fxClear) { fctx.clearRect(0, 0, W, H); fxClear = true; } return; }
    fctx.clearRect(0, 0, W, H); fxClear = false;
    if (fire) {
      const boost = clamp(Math.abs(vel) * 60, 0, 2);
      const [x0, y0] = toScr(v, v.i, 0.41, 0.50), [x1] = toScr(v, v.i, 0.59, 0.50);
      if (embers.length < 40 && Math.random() < 0.35 + boost * 0.4) {
        embers.push({ x: lerp(x0, x1, Math.random()), y: y0, vx: (Math.random() - 0.5) * 16, vy: -(50 + Math.random() * 80) * (1 + boost * 0.5), life: 0, max: 1.2 + Math.random() * 1.6, r: 0.8 + Math.random() * 1.4, wob: Math.random() * 6.28 });
      }
    }
    fctx.globalCompositeOperation = 'lighter';
    for (let i = embers.length - 1; i >= 0; i--) {
      const p = embers[i];
      p.life += dt; p.wob += dt * 3;
      p.x += (p.vx + Math.sin(p.wob) * 12) * dt; p.y += p.vy * dt;
      if (p.life > p.max || p.y < -20) { embers.splice(i, 1); continue; }
      const k = 1 - p.life / p.max;
      const g = fctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 5);
      g.addColorStop(0, `rgba(255,214,140,${0.9 * k})`); g.addColorStop(0.3, `rgba(255,110,40,${0.5 * k})`); g.addColorStop(1, 'rgba(255,80,20,0)');
      fctx.fillStyle = g; fctx.beginPath(); fctx.arc(p.x, p.y, p.r * 5, 0, 6.283); fctx.fill();
    }
    fctx.globalCompositeOperation = 'source-over';
  }

  /* ---------- Captions, log, letterbox ---------- */
  let lastNow = -2;
  function ui(v) {
    const { shot, local } = at(v ? v.f : 0);
    const t = timeOf(shot, local);
    gauge(t);
    caps.forEach(cap => {
      const s = +cap.dataset.shot;
      cap.classList.toggle('is-on', shot === s && (reduce || (local >= WIN[s][0] && local <= WIN[s][1])));
    });
    let now = -1;
    logItems.forEach((li, n) => { if (t >= +li.dataset.t) now = n; });
    if (now !== lastNow) {
      logItems.forEach((li, n) => { li.classList.toggle('is-done', n < now); li.classList.toggle('is-now', n === now); });
      logEl.classList.toggle('is-empty', now < 0);
      lastNow = now;
    }
    const lb = shot === 0 && !reduce ? 1 - ease(clamp(local / 0.35)) : 0;
    stage.style.setProperty('--lb', lb.toFixed(3));
    if (v && v.rect) { setLayout(v); placeCaps(v); applyHud(shot); }
  }

  // The gauge, log and captions follow the picture on screen; the notes and embers run every frame.
  let lastView = null;
  new IntersectionObserver(es => { filmVisible = es[0].isIntersecting; }).observe(film);
  window.FilmEngine.create({
    section: film, stage, canvas, FV, range: [0.01, 0.9], rate: 8,
    lift: '.no-lift', // captions and the pit card rise with Safari's toolbar through --film-hide (bbq.css)
    overlays: { '.cap': 'is-on', '.note': 'is-on' },
    onGate: k => { loadPct.textContent = String(Math.round(40 + k * 235)); loadBar.style.width = Math.round(k * 100) + '%'; },
    onReady: openLoader,
    onFrame: v => {
      if (v.meta && v.meta !== META) { META = v.meta; if (Array.isArray(META.lens)) LENS = META.lens; placeKey = ''; }
      lastView = v; ui(v);
      vel = v.p - lastScrollP; lastScrollP = v.p;
    },
    onTick: (v, dt) => {
      if (filmVisible) { notes(v || lastView); particles(dt, v || lastView); }
      vel *= 0.9;
      bar.classList.toggle('is-solid', film.getBoundingClientRect().bottom < bar.offsetHeight + 40);
    },
  });
  setTimeout(openLoader, 9000); // never trap a visitor behind the loader on a very slow connection
  function size() {
    const r = canvas.getBoundingClientRect();
    fx.width = Math.round(r.width); fx.height = Math.round(r.height);
    setLayout(lastView); placeKey = '';
    if (lastView && lastView.rect) placeCaps(lastView);
  }
  addEventListener('resize', size);
  size();
  ui(null);

  /* ---------- The probe chart ---------- */
  const chart = $('#chart'), svg = $('#chartSvg'), tip = $('#chartTip'), knob = $('#chartKnob');
  if (chart && svg && knob) {
    const ns = 'http://www.w3.org/2000/svg';
    const T0 = 80, T1 = 860; // 10:00 pm to 11:00 am
    let tNow = 380, G = null, dragging = null;
    const NOTE = t => t < 230 ? 'Taking smoke' : t < 410 ? 'Bark setting' : t < 580 ? 'The stall: moisture cools the surface' : t < 740 ? 'Wrapped in pink paper' : t < 855 ? 'Off the pit, resting' : 'Rested, ready to slice';
    const el = (n, a, parent = svg) => { const e = document.createElementNS(ns, n); for (const k in a) e.setAttribute(k, a[k]); parent.append(e); return e; };
    // Drawn at the chart's real size (no stretching), so the labels keep their shape on every screen.
    function draw() {
      const w = Math.round(svg.clientWidth), h = Math.round(svg.clientHeight);
      if (!w || !h) return;
      svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
      svg.textContent = '';
      const narrow = w < 560, PL = narrow ? 40 : 52, PR = 10, PT = 14, PB = 30;
      const X = t => PL + (t - T0) / (T1 - T0) * (w - PL - PR);
      const Y = v => PT + (1 - v / 220) * (h - PT - PB);
      const defs = el('defs', {}), lg = el('linearGradient', { id: 'cookFill', x1: '0', y1: '0', x2: '0', y2: '1' }, defs);
      el('stop', { offset: '0', 'stop-color': 'rgba(255,90,31,.32)' }, lg); el('stop', { offset: '1', 'stop-color': 'rgba(255,90,31,0)' }, lg);
      el('rect', { class: 'stall', x: X(410), y: PT, width: X(580) - X(410), height: h - PT - PB });
      el('rect', { class: 'rest', x: X(740), y: PT, width: X(860) - X(740), height: h - PT - PB });
      // band labels sit at the foot of their bands, clear of the line and the tooltip
      const sl = el('text', { class: 'band-l', x: X(495), y: h - PB - 10, 'text-anchor': 'middle' }); sl.textContent = narrow ? 'STALL' : 'THE STALL';
      const rl = el('text', { class: 'band-l band-l--rest', x: X(800), y: h - PB - 10, 'text-anchor': 'middle' }); rl.textContent = narrow ? 'REST' : 'RESTING';
      for (let v = 50; v <= 200; v += 50) {
        el('line', { class: 'grid', x1: PL, x2: w - PR, y1: Y(v), y2: Y(v) });
        const tx = el('text', { class: 'axis', x: PL - 8, y: Y(v) + 4, 'text-anchor': 'end' }); tx.textContent = v + '°';
      }
      for (let t = T0; t <= T1; t += narrow ? 240 : 120) {
        const tx = el('text', { class: 'axis', x: X(t), y: h - 9, 'text-anchor': t === T0 ? 'start' : 'middle' }); tx.textContent = clockText(t).replace(':00', '').replace(' ', '');
      }
      let d = '';
      for (let t = T0; t <= T1; t += 4) d += (t === T0 ? 'M' : 'L') + X(t).toFixed(1) + ',' + Y(tempAt(t)).toFixed(1);
      el('path', { class: 'area', d: d + `L${X(T1)},${Y(0)}L${X(T0)},${Y(0)}Z` });
      el('path', { class: 'line', d });
      G = { X, Y, w, h, PL, PR, cursor: el('line', { class: 'cursor', y1: PT, y2: h - PB }), dot: el('circle', { class: 'dot', r: 7 }) };
      set(tNow);
    }
    function set(t) {
      tNow = Math.round(clamp(t, T0, T1) / 5) * 5;
      const v = tempAt(tNow);
      knob.setAttribute('aria-valuenow', String(tNow));
      knob.setAttribute('aria-valuetext', `${clockText(tNow)}, ${Math.round(v)} degrees, ${NOTE(tNow)}`);
      $('#tipT').textContent = clockText(tNow); $('#tipV').textContent = Math.round(v) + '°'; $('#tipN').textContent = NOTE(tNow);
      if (!G) return;
      const x = G.X(tNow), y = G.Y(v);
      G.cursor.setAttribute('x1', x); G.cursor.setAttribute('x2', x);
      G.dot.setAttribute('cx', x); G.dot.setAttribute('cy', y);
      // the svg's place inside the chart box (SVG elements have no offsetLeft/offsetTop)
      const cr = chart.getBoundingClientRect(), sr = svg.getBoundingClientRect(), ox = sr.left - cr.left, oy = sr.top - cr.top;
      knob.style.transform = `translate(${(ox + x - 22).toFixed(1)}px, ${(oy + y - 22).toFixed(1)}px)`;
      const tw = tip.offsetWidth || 170, th = tip.offsetHeight || 80, cw = chart.clientWidth;
      const above = oy + y - th - 22 >= 0;
      tip.style.setProperty('--tx', clamp(ox + x - tw / 2, 8, cw - tw - 8) + 'px');
      tip.style.setProperty('--ty', (above ? oy + y - th - 22 : oy + y + 22) + 'px');
    }
    const tFromX = cx => { const r = svg.getBoundingClientRect(); return T0 + (cx - r.left - G.PL) / (G.w - G.PL - G.PR) * (T1 - T0); };
    // Mouse and pen drag straight away; a finger drags once it moves sideways (an upward or downward
    // swipe still scrolls the page, as touch-action: pan-y in bbq.css allows), and a tap jumps.
    chart.addEventListener('pointerdown', e => {
      if (!G || (e.pointerType === 'mouse' && e.button !== 0)) return;
      dragging = { id: e.pointerId, x: e.clientX, y: e.clientY, live: e.pointerType !== 'touch' };
      if (dragging.live) { chart.setPointerCapture(e.pointerId); set(tFromX(e.clientX)); }
    });
    chart.addEventListener('pointermove', e => {
      if (!dragging || e.pointerId !== dragging.id) return;
      if (!dragging.live) {
        const dx = Math.abs(e.clientX - dragging.x), dy = Math.abs(e.clientY - dragging.y);
        if (dx > 6 && dx > dy) { dragging.live = true; chart.setPointerCapture(e.pointerId); } else return;
      }
      set(tFromX(e.clientX));
    });
    const end = e => {
      if (!dragging || e.pointerId !== dragging.id) return;
      if (e.type === 'pointerup' && !dragging.live) set(tFromX(e.clientX));
      dragging = null;
    };
    chart.addEventListener('pointerup', end);
    chart.addEventListener('pointercancel', e => { if (dragging && e.pointerId === dragging.id) dragging = null; });
    knob.addEventListener('keydown', e => {
      const step = { ArrowLeft: -15, ArrowDown: -15, ArrowRight: 15, ArrowUp: 15, PageDown: -60, PageUp: 60 }[e.key];
      if (step) set(tNow + step);
      else if (e.key === 'Home') set(T0);
      else if (e.key === 'End') set(T1);
      else return;
      e.preventDefault();
    });
    let rq = 0;
    addEventListener('resize', () => { cancelAnimationFrame(rq); rq = requestAnimationFrame(draw); });
    draw();
  }

  /* ---------- Catering estimator: a scale ticket ---------- */
  const est = $('#est'), guests = $('#guests'), gOut = $('#guestsOut');
  const totalEl = $('#estTotal'), linesEl = $('#estLines'), note = $('#estNote');
  const svcPit = $('#svcPit'), svcNote = $('#svcNote'), evDate = $('#evDate'), dateErr = $('#dateErr');
  // Menu prices: meats by the pound (sausage: $7 links of about a quarter pound), sides by the quart
  const MEAT = { brisket: ['Brisket', 36], ribs: ['Pork ribs', 28], sausage: ['Sausage', 28], turkey: ['Turkey', 28] };
  const QUART = 18, PER_QUART = 8; // a quart of each side feeds about eight guests (a 4 oz scoop each)
  const PIT_MIN = 75;
  // Delivery: a flat fee on at least $500 of food. Pit on site: a base plus a per-guest rate.
  const DELIVERY = 50, DELIVERY_MIN = 500, PIT_BASE = 650, PIT_PER = 4;
  const PIT_INCL = 'with a pitmaster to slice, serving tables, chafing pans and two hours of service';
  const NOTE0 = note ? note.textContent : '';
  let shownTotal = 0, raf = 0, total = 0, held = false;
  const money = n => '$' + n.toLocaleString('en-US', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });
  const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const fmt = d => d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
  const earliest = g => { const d = today(); d.setDate(d.getDate() + (g > 100 ? 14 : 7)); return d; };
  const latest = () => { const d = today(); d.setFullYear(d.getFullYear() + 2); return d; };
  function quote() {
    const g = +guests.value;
    const meats = $$('input[name="meat"]:checked', est).map(i => i.value);
    const each = g * 0.5 / Math.max(1, meats.length);
    const lines = meats.map(m => { const lb = Math.ceil(each - 1e-9), [name, rate] = MEAT[m]; return [name, `${lb} lb`, `$${rate}/lb`, lb * rate]; });
    const sides = +($('input[name="sides"]:checked', est) || { value: 2 }).value, qt = Math.ceil(g / PER_QUART);
    lines.push([`${sides} sides, ${qt} qt each`, `${sides * qt} qt`, `$${QUART}/qt`, sides * qt * QUART]);
    const pit = !svcPit.disabled && svcPit.checked;
    if (pit) lines.push(['Pit and pitmaster', '', `$${PIT_BASE} + $${PIT_PER}/guest`, PIT_BASE + PIT_PER * g]);
    else {
      // below the delivery minimum the food is brought up to it
      const food = lines.reduce((s, l) => s + l[3], 0);
      if (food < DELIVERY_MIN) lines.push(['Delivery minimum', '', `$${DELIVERY_MIN} food`, DELIVERY_MIN - food]);
      lines.push(['Delivery, Fort Worth', '', '', DELIVERY]);
    }
    return { g, lines, total: lines.reduce((s, l) => s + l[3], 0) };
  }
  // The date field's problem, if any, for this many guests
  function dateProblem(g) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(evDate.value);
    if (!m) return { msg: 'Pick the date of your event.', note: 'Nothing held yet: pick a date first.' };
    const day = new Date(+m[1], +m[2] - 1, +m[3]), min = earliest(g), max = latest();
    if (!(day >= min)) return { msg: `The earliest date we can hold for ${g} guests is ${fmt(min)}.`, note: 'Nothing held yet: that date is too soon.' };
    if (day > max) return { msg: `We hold dates up to two years out, so ${fmt(max)} at the latest.`, note: 'Nothing held yet: that date is too far out.' };
    return { day };
  }
  function fieldError(msg) {
    dateErr.textContent = msg;
    evDate.setAttribute('aria-invalid', msg ? 'true' : 'false');
  }
  function calc() {
    const g = +guests.value;
    gOut.textContent = String(g);
    // the pit only goes out for larger events (FAQ); below that the order falls back to drop-off
    const pitOk = g >= PIT_MIN;
    if (!pitOk && svcPit.checked) { svcPit.checked = false; $('input[name="svc"][value="drop"]', est).checked = true; }
    svcPit.disabled = !pitOk;
    svcNote.textContent = `Delivery minimum $${DELIVERY_MIN} before tax. ` + (pitOk ? `The pit comes out for ${PIT_MIN} guests or more, ${PIT_INCL}.` : `The pit comes out for ${PIT_MIN} guests or more, so this order is drop-off.`);
    evDate.min = iso(earliest(g)); evDate.max = iso(latest());
    // a change after a hold makes the held note stale: drop it, and re-check the date for the new order
    if (held) { held = false; note.textContent = 'The order changed, so nothing is held now. Hold the date again to keep it.'; }
    if (evDate.value) { const p = dateProblem(g); fieldError(p.msg || ''); } else fieldError('');
    const q = quote();
    total = q.total;
    linesEl.textContent = '';
    q.lines.forEach(([name, qty, rate, amt]) => {
      const tr = document.createElement('tr');
      const th = document.createElement('th'); th.scope = 'row'; th.textContent = name; tr.append(th);
      [qty, rate, money(amt)].forEach(x => { const td = document.createElement('td'); td.className = 'num'; td.textContent = x; tr.append(td); });
      linesEl.append(tr);
    });
    const from = shownTotal, t0 = performance.now();
    cancelAnimationFrame(raf);
    const step = now => {
      const k = reduce ? 1 : ease(clamp((now - t0) / 450));
      shownTotal = k >= 1 ? total : lerp(from, total, k);
      totalEl.textContent = money(k >= 1 ? total : Math.round(shownTotal));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }
  if (est) {
    est.addEventListener('input', calc);
    est.addEventListener('change', e => {
      // at least one meat stays picked
      if (e.target.name === 'meat' && !$$('input[name="meat"]:checked', est).length) { e.target.checked = true; calc(); }
    });
    est.addEventListener('submit', e => e.preventDefault());
    calc();
    if (note) note.textContent = NOTE0;
    $('#estHold').addEventListener('click', () => {
      const g = +guests.value, p = dateProblem(g);
      if (p.msg) { fieldError(p.msg); note.textContent = p.note; held = false; evDate.focus(); return; }
      fieldError('');
      note.textContent = `Held ${fmt(p.day)} for ${g} guests, ${money(quote().total)} before tax. This is a concept site, so nothing was sent. A real build puts it on the restaurant's catering calendar.`;
      held = true;
    });
  }
})();
