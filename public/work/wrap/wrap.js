/* Satin & Shade (concept by Quvlo). No libraries. */
(() => {
  'use strict';
  // Bump when any film frame changes, so browsers fetch the new frames instead of cached ones.
  const FV = '2026102807';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const ease = k => k * k * (3 - 2 * k);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root = document.documentElement;
  const SVG = 'http://www.w3.org/2000/svg';

  /* ---------- Colors (the accent of the whole page follows the pick) ---------- */
  // base: the color without its finish, so the work order can name any finish the visitor picks
  const COLORS = [
    { k: 'charcoal', name: 'Satin Dark Gray', base: 'Dark Gray', code: '3M 2080-S261', fin: 'satin', c: '#3e4146', hi: '#9aa0a8', gl: .12 },
    { k: 'teal', name: 'Satin Dark Teal', base: 'Dark Teal', code: 'Teal, color matched', fin: 'satin', c: '#1d5560', hi: '#7cc0c8', gl: .12 },
    { k: 'olive', name: 'Matte Military Green', base: 'Military Green', code: '3M 2080-M26', fin: 'matte', c: '#5d5a41', hi: '#b5ae86', gl: 0 },
    { k: 'matte', name: 'Matte Black', base: 'Black', code: '3M 2080-M12', fin: 'matte', c: '#141415', hi: '#8d9096', gl: 0 },
    { k: 'shift', name: 'Satin Rushing Riptide', base: 'Rushing Riptide', code: 'Avery SW900 ColorFlow', fin: 'shift', c: '#5b2d91', c2: '#178a86', hi: '#b398e0', gl: .35 },
    { k: 'white', name: 'Factory White', base: 'Factory White', code: 'Paint, no film', fin: null, c: '#e8e7e3', hi: '#efece6', gl: .45 }
  ];
  const setWrap = col => { root.style.setProperty('--wrap', col.c); root.style.setProperty('--wrap-hi', col.hi); };

  /* ---------- Film (shared engine: film-engine.js) ---------- */
  const PER = 40;
  const film = $('#film'), canvas = $('#filmCanvas');
  const caps = $$('.cap'), stages = $$('#stages li'), bar = $('#bar');
  const jobPanels = $('#jobPanels'), jobTint = $('#jobTint'), job = $('.job');
  const loader = $('#loader'), loadPct = $('#loadPct'), hexSvg = $('#loaderHex');

  // Loader hexes: a small honeycomb, one cell per slice of the coarse first pass
  const cells = [];
  (() => {
    const r = 22, w = Math.sqrt(3) * r, rows = [3, 4, 5, 4, 3];
    rows.forEach((n, ri) => {
      for (let i = 0; i < n; i++) {
        const cx = 120 + (i - (n - 1) / 2) * w, cy = 105 + (ri - 2) * r * 1.5;
        const p = document.createElementNS(SVG, 'polygon');
        const pts = [];
        for (let a = 0; a < 6; a++) { const t = Math.PI / 180 * (60 * a - 30); pts.push(`${(cx + (r - 2) * Math.cos(t)).toFixed(1)},${(cy + (r - 2) * Math.sin(t)).toFixed(1)}`); }
        p.setAttribute('points', pts.join(' '));
        hexSvg.append(p); cells.push(p);
      }
    });
    // cells light row by row, the way a bay's ceiling circuits come on (they were made in row order)
  })();

  let opened = false;
  function openLoader() {
    if (opened) return; opened = true;
    document.body.classList.remove('is-loading');
    setTimeout(() => loader.classList.add('is-gone'), reduce ? 0 : 350);
    // once faded, take the loader out of the page entirely: iPhone Safari tints its toolbars from fixed elements, even invisible ones
    setTimeout(() => { loader.style.display = 'none'; }, reduce ? 50 : 1300);
  }

  // Shots can hold fewer than 40 distinct frames (frames.json "lens"); a shot's progress is measured
  // over its distinct frames, so captions and the job card follow the picture.
  let LENS = [PER, PER, PER, PER, PER, PER];
  // Story beats, changing only at cuts, so the card never counts what the picture isn't doing: the hood is
  // the panel going on in Lay; by Edges most panels are on but the bumper is still white; by the tint day
  // all 23 are done.
  const TOTAL_PANELS = 23;
  let lastPanels = -1, lastTint = '';
  function ui(f) {
    const shot = Math.min(5, Math.floor(f / PER));
    const len = LENS[shot] || PER;
    const local = clamp((f - shot * PER) / Math.max(1, len - 1));
    stages.forEach((li, n) => {
      li.style.setProperty('--f', n < shot ? 1 : n === shot ? local.toFixed(3) : 0);
      li.classList.toggle('is-on', n <= shot);
    });
    const panels = [0, 0, 1, 16, TOTAL_PANELS, TOTAL_PANELS][shot];
    if (panels !== lastPanels) { jobPanels.textContent = String(panels); job.style.setProperty('--panels', (panels / TOTAL_PANELS).toFixed(3)); lastPanels = panels; }
    const tint = shot < 4 ? 'Factory' : shot === 4 ? 'Doors, 35%' : '35% front, 20% rear';
    if (tint !== lastTint) { jobTint.textContent = tint; lastTint = tint; }
    caps.forEach(c => {
      const s = +c.dataset.shot;
      let on;
      if (s === 0) on = shot === 0 && local < 0.7;
      else if (s === 5) on = shot === 5 && local > 0.2;
      else on = shot === s && local > 0.08 && local < 0.92;
      c.classList.toggle('is-on', on);
    });
  }
  window.FilmEngine.create({
    section: film, stage: $('.film__stage'), canvas, FV, range: [0.01, 0.93], rate: 10,
    lift: '.cap, .job, .stages',
    overlays: { '.cap': 'is-on' },
    onGate: k => {
      loadPct.textContent = String(Math.round(k * 100));
      const on = Math.round(k * cells.length);
      cells.forEach((c, n) => c.classList.toggle('is-on', n < on));
    },
    onReady: openLoader,
    onFrame: v => {
      if (v.meta && Array.isArray(v.meta.lens) && v.meta.lens !== LENS) LENS = v.meta.lens;
      ui(v.f);
    },
  });
  setTimeout(openLoader, 9000); // never trap a visitor behind the loader on a very slow connection
  const solid = () => bar.classList.toggle('is-solid', film.getBoundingClientRect().bottom < bar.offsetHeight + 48);
  addEventListener('scroll', solid, { passive: true }); solid();

  /* ---------- Configurator: new color is laid across the car like film ---------- */
  // Fixed stacking roles (wrap.css): color on screen 1, color sweeping in 2, held factory white 3,
  // clear glass 4, tint 5. Nothing climbs, however many swaps.
  const layers = $('#cfgLayers'), sweep = $('#cfgSweep'), sw = $('#swatches');
  const nameEl = $('#cfgName'), codeEl = $('#cfgCode');
  const res = innerWidth * Math.min(window.devicePixelRatio || 1, 2) > 1700 ? 2560 : 1600;
  const colorImg = {};
  let current = COLORS[0], shownCol = COLORS[0], busy = false, queued = null;
  function img(src, cls, alt) {
    const im = document.createElement('img');
    im.src = src; im.className = cls; im.alt = alt || ''; im.decoding = 'async';
    if (!alt) im.setAttribute('aria-hidden', 'true');
    return im;
  }
  function colorLayer(col) {
    if (!colorImg[col.k]) {
      const alt = col.k === 'white' ? 'The Porsche 911 in its factory white paint, under the studio\'s hexagon lights.' : `The Porsche 911 wrapped in ${col.name}, under the studio's hexagon lights.`;
      let el;
      if (col.k === 'shift') {
        // two stills of the same film from the same angle; crossfading them is the "shift"
        el = document.createElement('div');
        el.className = 'c c--shift'; el.setAttribute('role', 'img'); el.setAttribute('aria-label', alt);
        el.append(img(`img/c/shift-p-${res}.webp`, 'c__a'), img(`img/c/shift-t-${res}.webp`, 'c__b'));
      } else {
        el = img(`img/c/${col.k}-${res}.webp`, 'c', alt);
      }
      layers.insertBefore(el, layers.querySelector('.g-clear'));
      colorImg[col.k] = el;
    }
    return colorImg[col.k];
  }
  const ready = el => {
    const im = el.tagName === 'IMG' ? el : el.querySelector('img');
    return im.complete && im.naturalWidth ? Promise.resolve() : new Promise(r => { im.addEventListener('load', r, { once: true }); im.addEventListener('error', r, { once: true }); });
  };
  layers.append(img(`img/c/glass-clear-${res}.webp`, 'g-clear'), img(`img/c/tint-front-${res}.webp`, 'g-tint g-front'), img(`img/c/tint-rear-${res}.webp`, 'g-tint g-rear'));
  colorLayer(current).classList.add('is-base');
  const tFront = $('.g-front', layers), tRear = $('.g-rear', layers);

  // One name for the pick everywhere (configurator, work order, booking): the film's color with the finish
  // chosen in the estimator, which a swatch resets to that film's own finish.
  const FIN = { gloss: 'Gloss', satin: 'Satin', matte: 'Matte', shift: 'Color-Shift' };
  const finOf = () => { const r = $('input[name="fin"]:checked', est); return r ? r.dataset.fin : current.fin; };
  // the color-shift film comes in one finish only, so it keeps its own name
  const pickName = () => current.k === 'white' || current.k === 'shift' ? current.name : `${FIN[finOf()]} ${current.base}`;
  // the full film code only when the chosen finish is that film's own; otherwise just the series
  function showName() { nameEl.textContent = pickName(); codeEl.textContent = current.k === 'white' || finOf() === current.fin ? current.code : current.code.split('-')[0]; }
  function apply(col) {
    if (col === current && !busy) return;
    current = col;
    if (col.k === 'white') up();
    hold.disabled = col.k === 'white';
    setWrap(col);
    syncFinish(col);
    showName();
    renderTicket();
    if (busy) { queued = col; return; }
    lay(col);
  }
  // the picture catches up with the pick; a pick made mid-sweep is laid once the sweep ends
  function lay(col) {
    if (col === shownCol) return;
    busy = true;
    const prev = colorImg[shownCol.k];
    const next = colorLayer(col);
    ready(next).then(() => {
      next.classList.remove('is-base');
      void next.offsetWidth;
      next.classList.add('is-in');
      if (!reduce) { sweep.classList.remove('is-go'); void sweep.offsetWidth; sweep.classList.add('is-go'); }
      setTimeout(() => {
        prev.classList.remove('is-base');
        next.classList.remove('is-in'); next.classList.add('is-base');
        shownCol = col; busy = false;
        if (queued) { const q = queued; queued = null; lay(q); }
      }, reduce ? 20 : 980);
    });
  }
  const swBtns = [];
  COLORS.forEach((col, n) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'sw'; b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', n === 0 ? 'true' : 'false');
    b.tabIndex = n === 0 ? 0 : -1;
    b.setAttribute('aria-label', col.name);
    b.title = col.name;
    b.style.setProperty('--c', col.c); b.style.setProperty('--c2', col.c2 || col.c); b.style.setProperty('--gl', col.gl);
    if (col.k === 'shift') b.classList.add('sw--shift');
    b.addEventListener('click', () => pickSwatch(n));
    b.addEventListener('pointerenter', () => colorLayer(col), { once: true });
    sw.append(b); swBtns.push(b);
  });
  function pickSwatch(n, focus) {
    swBtns.forEach((x, i) => { x.setAttribute('aria-checked', i === n ? 'true' : 'false'); x.tabIndex = i === n ? 0 : -1; });
    if (focus) swBtns[n].focus();
    apply(COLORS[n]);
  }
  // radio groups move with the arrow keys, one tab stop per group
  function arrows(group, items, pick) {
    group.addEventListener('keydown', e => {
      const i = items().indexOf(document.activeElement);
      if (i < 0) return;
      const n = items().length;
      const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      let j = d ? (i + d + n) % n : e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : -1;
      if (j < 0) return;
      e.preventDefault(); pick(j, true);
    });
  }
  arrows(sw, () => swBtns, pickSwatch);
  setWrap(current);
  // preload the other colors once the configurator is near
  new IntersectionObserver((es, o) => { if (es[0].isIntersecting) { COLORS.forEach(colorLayer); o.disconnect(); } }, { rootMargin: '800px 0px' }).observe(layers);

  // Hold to compare with the factory paint
  const WHITE = COLORS.find(c => c.k === 'white');
  const hold = $('#cfgHold');
  let held = false;
  const down = () => {
    if (current.k === 'white' || held) return;
    held = true; colorLayer(WHITE).classList.add('is-hold'); hold.setAttribute('aria-pressed', 'true');
  };
  const up = () => {
    if (!held) return;
    held = false; colorImg.white.classList.remove('is-hold'); hold.setAttribute('aria-pressed', 'false');
  };
  hold.addEventListener('pointerdown', down);
  ['pointerup', 'pointerleave', 'pointercancel', 'blur'].forEach(e => hold.addEventListener(e, up));
  hold.addEventListener('keydown', e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); down(); } });
  hold.addEventListener('keyup', e => { if (e.key === ' ' || e.key === 'Enter') up(); });
  hold.addEventListener('contextmenu', e => e.preventDefault());

  // Tint: front door glass and rear glass are set apart, as Texas law treats them. The layer darkens the
  // cabin seen through the glass; the outside reflections stay (the film sits on the inside).
  const FRONT = [70, 50, 35], REAR = [70, 50, 35, 20, 5];
  const rFront = $('#tintFront'), rRear = $('#tintRear');
  const oFront = $('#tintFrontOut'), oRear = $('#tintRearOut');
  let tint = { front: 35, rear: 20 };
  const shade = v => clamp((80 - v) / 80 * 1.05, 0, 0.95).toFixed(3);
  function setTint() {
    tint = { front: FRONT[+rFront.value], rear: REAR[+rRear.value] };
    oFront.textContent = `${tint.front}%`; oRear.textContent = `${tint.rear}%`;
    rFront.setAttribute('aria-valuetext', `${tint.front} percent light through`);
    rRear.setAttribute('aria-valuetext', `${tint.rear} percent light through`);
    tFront.style.opacity = shade(tint.front); tRear.style.opacity = shade(tint.rear);
    renderTicket();
  }
  rFront.addEventListener('input', setTint); rRear.addEventListener('input', setTint);

  /* ---------- Estimator as a work order ---------- */
  const est = $('#est'), total = $('#estTotal'), lines = $('#ticketLines'), live = $('#estLive');
  const estWhite = $('#estWhite'), fsCov = $('#estCov'), fsFin = $('#estFin'), ppfLabel = $('#ppfLabel');
  const fmt = n => n.toLocaleString('en-US');
  // The color-shift film only comes as color-shift, and color-shift is only that film: the finishes that
  // don't go with the pick are switched off, so the surcharge always matches the film.
  function syncFinish(col) {
    const white = col.k === 'white';
    fsCov.disabled = fsFin.disabled = white;
    estWhite.hidden = !white;
    // PPF goes over the wrap; on factory white it goes straight on the paint
    ppfLabel.textContent = white ? 'Front PPF' : 'Front PPF (over the wrap)';
    if (white) return;
    $$('input[name="fin"]', est).forEach(r => { r.disabled = (r.dataset.fin === 'shift') !== (col.k === 'shift'); });
    const r = $(`input[name="fin"][data-fin="${col.fin}"]`, est);
    if (r && !r.checked) r.checked = true;
  }
  let shown = 0, raf = 0, liveT = 0;
  function renderTicket() {
    const cov = $('input[name="cov"]:checked', est), fin = $('input[name="fin"]:checked', est);
    const adds = $$('input[name="add"]:checked', est);
    const label = el => el.nextElementSibling.textContent;
    const rows = current.k === 'white'
      ? [['Factory White: paint kept, no color film', 0]]
      : [[label(cov), +cov.value], [`${label(fin)} film · ${current.base}`, +fin.value]];
    adds.forEach(a => rows.push([a.dataset.add === 'tint' ? `${label(a)} · ${tint.front}% front, ${tint.rear}% rear` : label(a), +a.value]));
    lines.textContent = '';
    rows.forEach(([t, v]) => {
      const li = document.createElement('li');
      const a = document.createElement('span'); a.textContent = t;
      const b = document.createElement('span'); b.textContent = v ? `$${fmt(v)}` : '$0';
      li.append(a, b); lines.append(li);
    });
    const sum = rows.reduce((s, r) => s + r[1], 0);
    est.dataset.total = String(sum);
    const from = shown, t0 = performance.now();
    cancelAnimationFrame(raf);
    const step = now => {
      const k = reduce ? 1 : ease(clamp((now - t0) / 450));
      shown = Math.round(from + (sum - from) * k);
      total.textContent = fmt(shown);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    // screen readers hear the settled total once, not the count-up
    clearTimeout(liveT);
    liveT = setTimeout(() => { live.textContent = `Estimate $${fmt(sum)}.`; }, 600);
  }
  est.addEventListener('change', () => { showName(); renderTicket(); });
  shown = 6695;
  syncFinish(current); showName();
  setTint();

  /* ---------- Booking (concept: nothing is sent) ---------- */
  const days = $('#bookDays'), times = $('#bookTimes'), bnote = $('#bookNote');
  let selDay = '', selTime = '';
  function chip(label, small, group, onPick, on) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'chip'; b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', on ? 'true' : 'false');
    b.tabIndex = on ? 0 : -1;
    if (small) { const s = document.createElement('small'); s.textContent = small; b.append(s); }
    b.append(document.createTextNode(label));
    const pick = () => { $$('.chip', group).forEach(x => { x.setAttribute('aria-checked', 'false'); x.tabIndex = -1; }); b.setAttribute('aria-checked', 'true'); b.tabIndex = 0; onPick(); };
    b.addEventListener('click', pick);
    b._pick = pick;
    group.append(b);
  }
  [days, times].forEach(g => arrows(g, () => $$('.chip', g), (j, focus) => { const c = $$('.chip', g)[j]; c._pick(); if (focus) c.focus(); }));
  const wk = new Intl.DateTimeFormat('en-US', { weekday: 'short' });
  const md = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
  const full = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const today = new Date();
  for (let n = 1, added = 0; added < 5 && n < 10; n++) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + n);
    if (d.getDay() === 0) continue; // closed Sundays
    const text = full.format(d);
    if (!added) selDay = text;
    chip(md.format(d), wk.format(d), days, () => { selDay = text; }, !added);
    added++;
  }
  ['9:00 am', '11:00 am', '1:30 pm', '4:00 pm'].forEach((t, n) => { if (!n) selTime = t; chip(t, null, times, () => { selTime = t; }, !n); });
  $('#bookForm').addEventListener('submit', e => {
    e.preventDefault();
    const sum = +est.dataset.total || 0;
    const tinted = !!$('input[data-add="tint"]:checked', est);
    const pick = current.k === 'white' ? 'factory white' : pickName();
    const glass = tinted ? `, ${tint.front}% front and ${tint.rear}% rear tint` : '';
    bnote.textContent = `Held: ${selDay} at ${selTime}, with ${pick}${glass} and a $${fmt(sum)} sample estimate. This is a concept site, so nothing was sent.`;
  });
})();
