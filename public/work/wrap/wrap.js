/* Satin & Shade (concept by Quvlo). No libraries. */
(() => {
  'use strict';
  // Bump when any film frame changes, so browsers fetch the new frames instead of cached ones.
  const FV = '2026102608';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const ease = k => k * k * (3 - 2 * k);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root = document.documentElement;
  const SVG = 'http://www.w3.org/2000/svg';

  /* ---------- Colors (the accent of the whole page follows the pick) ---------- */
  const COLORS = [
    { k: 'charcoal', name: 'Satin Charcoal', code: 'SC-2080', fin: 'satin', c: '#3e4146', hi: '#9aa0a8', gl: .12 },
    { k: 'teal', name: 'Satin Dark Teal', code: 'ST-4060', fin: 'satin', c: '#1d5560', hi: '#7cc0c8', gl: .12 },
    { k: 'olive', name: 'Matte Olive Drab', code: 'MO-3350', fin: 'matte', c: '#5d5a41', hi: '#b5ae86', gl: 0 },
    { k: 'matte', name: 'Matte Black', code: 'MB-0010', fin: 'matte', c: '#141415', hi: '#8d9096', gl: 0 },
    { k: 'shift', name: 'Color-Shift Purple to Teal', code: 'CS-7020', fin: 'shift', c: '#5b2d91', c2: '#178a86', hi: '#b398e0', gl: .35 },
    { k: 'white', name: 'Factory White', code: 'Paint, no film', fin: 'gloss', c: '#e8e7e3', hi: '#efece6', gl: .45 }
  ];
  const setWrap = col => { root.style.setProperty('--wrap', col.c); root.style.setProperty('--wrap-hi', col.hi); };

  /* ---------- Film ---------- */
  const PER = 40;
  const film = $('#film'), canvas = $('#filmCanvas'), ctx = canvas.getContext('2d', { alpha: false });
  const caps = $$('.cap'), stages = $$('#stages li'), bar = $('#bar');
  const jobPanels = $('#jobPanels'), jobTint = $('#jobTint'), job = $('.job');
  const loader = $('#loader'), loadPct = $('#loadPct'), hexSvg = $('#loaderHex');
  let M = null, kind = 'd', N = 0;
  const imgs = [];
  let target = 0, cur = 0, lastDrawn = -1, lastP = -1, dirty = true, visible = true;
  const pick = () => (innerWidth / innerHeight < 0.85 || innerWidth < 760) ? 'm' : 'd';
  const url = i => `f/${kind}/${String(i + 1).padStart(3, '0')}.webp?v=${FV}`;

  // Loader hexes: a small honeycomb, one cell per slice of the first shot
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
    // light in a scattered order, like real tubes warming up
    for (let i = cells.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [cells[i], cells[j]] = [cells[j], cells[i]]; }
  })();

  function load(src) {
    return new Promise(res => {
      const im = new Image();
      im.decoding = 'async';
      im.onload = () => { (im.decode ? im.decode() : Promise.resolve()).catch(() => {}).then(() => res(im)); };
      im.onerror = () => res(null);
      im.src = src;
    });
  }

  async function boot() {
    try { M = await (await fetch(`frames.json?v=${FV}`, { cache: 'no-cache' })).json(); } catch { M = null; }
    if (!M) { openLoader(); return; }
    kind = pick(); N = M.count;
    let done = 0;
    await Promise.all(Array.from({ length: PER }, (_, i) => load(url(i)).then(im => {
      imgs[i] = im; dirty = true; done++;
      loadPct.textContent = String(Math.round(done / PER * 100));
      const on = Math.round(done / PER * cells.length);
      cells.forEach((c, n) => c.classList.toggle('is-on', n < on));
    })));
    openLoader();
    let next = PER;
    const worker = async () => { while (next < N) { const i = next++; imgs[i] = await load(url(i)); dirty = true; } };
    await Promise.all([worker(), worker(), worker(), worker(), worker()]);
  }
  function openLoader() {
    document.body.classList.remove('is-loading');
    setTimeout(() => loader.classList.add('is-gone'), reduce ? 0 : 350);
  }

  let cw = 0, ch = 0;
  function size() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = canvas.getBoundingClientRect();
    cw = Math.round(r.width * dpr); ch = Math.round(r.height * dpr);
    if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
    if (M && pick() !== kind) location.reload();
    dirty = true;
  }
  function nearest(i) {
    if (imgs[i]) return i;
    for (let d = 1; d < N; d++) { if (imgs[i - d]) return i - d; if (imgs[i + d]) return i + d; }
    return -1;
  }
  function draw(f) {
    if (!N) return;
    const i0 = Math.floor(f), i1 = Math.min(N - 1, i0 + 1), k = f - i0;
    const a = nearest(i0);
    if (a < 0) return;
    const A = imgs[a];
    const s = Math.max(cw / A.naturalWidth, ch / A.naturalHeight);
    const w = A.naturalWidth * s, h = A.naturalHeight * s, x = (cw - w) / 2, y = (ch - h) / 2;
    ctx.globalAlpha = 1; ctx.drawImage(A, x, y, w, h);
    // shot boundaries cut cleanly, inside a shot neighbouring frames blend
    const sameShot = Math.floor(i0 / PER) === Math.floor(i1 / PER);
    if (k > 0.02 && sameShot && imgs[i1] && a === i0) { ctx.globalAlpha = k; ctx.drawImage(imgs[i1], x, y, w, h); ctx.globalAlpha = 1; }
  }

  // Story beats: panels wrapped during the lay and edge shots, glass during the tint shot
  const TOTAL_PANELS = 23;
  let lastPanels = -1, lastTint = '';
  function ui(f) {
    const shot = Math.min(5, Math.floor(f / PER));
    const local = clamp((f - shot * PER) / (PER - 1));
    stages.forEach((li, n) => {
      li.style.setProperty('--f', n < shot ? 1 : n === shot ? local.toFixed(3) : 0);
      li.classList.toggle('is-on', n <= shot);
    });
    const panels = Math.round(TOTAL_PANELS * ease(clamp((f - 2 * PER) / (2 * PER))));
    if (panels !== lastPanels) { jobPanels.textContent = String(panels); job.style.setProperty('--panels', (panels / TOTAL_PANELS).toFixed(3)); lastPanels = panels; }
    const tint = f < 4 * PER + 6 ? 'Factory' : f < 5 * PER ? 'Tinting 20%' : '20% rear, 35% front';
    if (tint !== lastTint) { jobTint.textContent = tint; lastTint = tint; }
    caps.forEach(c => {
      const s = +c.dataset.shot;
      let on;
      if (s === 0) on = f < 26;
      else if (s === 5) on = f > 5 * PER + 8;
      else on = shot === s && local > 0.08 && local < 0.92;
      c.classList.toggle('is-on', on);
    });
  }
  function progress() {
    const r = film.getBoundingClientRect();
    return clamp(-r.top / (film.offsetHeight - innerHeight));
  }
  const frameAt = p => clamp((p - 0.01) / 0.93) * (N - 1);

  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    target = progress();
    if (reduce) cur = target;
    else { cur += (target - cur) * (1 - Math.exp(-dt * 10)); if (Math.abs(target - cur) < 0.00005) cur = target; }
    const f = frameAt(cur);
    if (visible && N && (dirty || Math.abs(f - lastDrawn) > 0.001)) { draw(f); lastDrawn = f; dirty = false; }
    if (N && Math.abs(cur - lastP) > 0.00005) { ui(f); lastP = cur; }
    bar.classList.toggle('is-solid', film.getBoundingClientRect().bottom < bar.offsetHeight + 48);
    requestAnimationFrame(loop);
  }
  new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) dirty = true; }).observe(film);
  addEventListener('resize', size);
  size();
  requestAnimationFrame(loop);
  boot();

  /* ---------- Configurator: new color is laid across the car like film ---------- */
  const layers = $('#cfgLayers'), sweep = $('#cfgSweep'), sw = $('#swatches');
  const nameEl = $('#cfgName'), codeEl = $('#cfgCode');
  const res = innerWidth * Math.min(window.devicePixelRatio || 1, 2) > 1700 ? 2560 : 1600;
  const colorImg = {};
  let current = COLORS[0], busy = false, queued = null, z = 1;
  function img(src, cls, alt) {
    const im = document.createElement('img');
    im.src = src; im.className = cls; im.alt = alt || ''; im.decoding = 'async';
    if (!alt) im.setAttribute('aria-hidden', 'true');
    return im;
  }
  function colorLayer(col) {
    if (!colorImg[col.k]) {
      const alt = `The Porsche 911 wrapped in ${col.name}, under the studio's hexagon lights.`;
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
  layers.append(img(`img/c/glass-clear-${res}.webp`, 'g-clear'), img(`img/c/glass-dark-${res}.webp`, 'g-dark'));
  const first = colorLayer(current); first.classList.add('is-base'); first.style.zIndex = '1';
  const clear = $('.g-clear', layers), dark = $('.g-dark', layers);
  clear.style.zIndex = dark.style.zIndex = '50';

  function apply(col) {
    if (col === current) return;
    if (busy) { queued = col; return; }
    busy = true;
    const prev = colorImg[current.k];
    const next = colorLayer(col);
    const go = () => {
      next.classList.remove('is-in', 'is-base');
      next.style.zIndex = String(++z);
      void next.offsetWidth;
      next.classList.add('is-in');
      if (!reduce) { sweep.classList.remove('is-go'); void sweep.offsetWidth; sweep.classList.add('is-go'); }
      setTimeout(() => {
        prev.classList.remove('is-base', 'is-in');
        next.classList.remove('is-in'); next.classList.add('is-base');
        busy = false;
        if (queued) { const q = queued; queued = null; apply(q); }
      }, reduce ? 20 : 980);
    };
    current = col;
    nameEl.textContent = col.name; codeEl.textContent = col.code;
    setWrap(col);
    syncFinish(col.fin);
    ready(next).then(go);
  }
  COLORS.forEach((col, n) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'sw'; b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', n === 0 ? 'true' : 'false');
    b.setAttribute('aria-label', col.name);
    b.title = col.name;
    b.style.setProperty('--c', col.c); b.style.setProperty('--c2', col.c2 || col.c); b.style.setProperty('--gl', col.gl);
    if (col.k === 'shift') b.classList.add('sw--shift');
    b.addEventListener('click', () => { $$('.sw', sw).forEach(x => x.setAttribute('aria-checked', 'false')); b.setAttribute('aria-checked', 'true'); apply(col); });
    b.addEventListener('pointerenter', () => colorLayer(col), { once: true });
    sw.append(b);
  });
  setWrap(current);
  // preload the other colors once the configurator is near
  new IntersectionObserver((es, o) => { if (es[0].isIntersecting) { COLORS.forEach(colorLayer); o.disconnect(); } }, { rootMargin: '800px 0px' }).observe(layers);

  // Hold to compare with the factory paint
  const WHITE = COLORS.find(c => c.k === 'white');
  const hold = $('#cfgHold');
  let held = null;
  const down = () => { if (current.k === 'white') return; held = current; const w = colorLayer(WHITE); w.style.zIndex = '49'; w.style.clipPath = 'inset(0 0 0 0)'; };
  const up = () => { if (!held) return; const w = colorImg.white; if (w) { w.style.zIndex = ''; w.style.clipPath = ''; } held = null; };
  hold.addEventListener('pointerdown', down);
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(e => hold.addEventListener(e, up));
  hold.addEventListener('keydown', e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); down(); } });
  hold.addEventListener('keyup', up);

  // Tint: darkness of the side glass follows visible light transmission
  const VLT = [70, 50, 35, 20, 5];
  const range = $('#tintRange'), out = $('#tintOut'), note = $('#tintNote');
  function setTint() {
    const v = VLT[+range.value];
    out.textContent = `${v}%`;
    range.setAttribute('aria-valuetext', `${v} percent light through`);
    dark.style.setProperty('--dark', Math.pow((70 - v) / 65, 0.85).toFixed(3));
    const legal = v >= 25;
    note.textContent = legal ? 'Legal on every window in Texas.' : 'Rear glass only in Texas. Front side windows need 25% or lighter.';
    note.classList.toggle('is-warn', !legal);
    tintChoice = v;
    renderTicket();
  }
  let tintChoice = 35;
  range.addEventListener('input', setTint);

  /* ---------- Estimator as a work order ---------- */
  const est = $('#est'), total = $('#estTotal'), lines = $('#ticketLines');
  const fmt = n => n.toLocaleString('en-US');
  function syncFinish(fin) {
    const r = $(`input[name="fin"][data-fin="${fin}"]`, est);
    if (r && !r.checked) { r.checked = true; renderTicket(); }
  }
  let shown = 0, raf = 0;
  function renderTicket() {
    const cov = $('input[name="cov"]:checked', est), fin = $('input[name="fin"]:checked', est);
    const adds = $$('input[name="add"]:checked', est);
    const rows = [
      [cov.nextElementSibling.textContent, +cov.value],
      [`${fin.nextElementSibling.textContent} finish · ${current.k === 'white' ? 'film to match' : current.name}`, +fin.value],
      ...adds.map(a => [a.value === '450' ? `${a.nextElementSibling.textContent} · ${tintChoice}%` : a.nextElementSibling.textContent, +a.value])
    ];
    lines.textContent = '';
    rows.forEach(([t, v]) => {
      const li = document.createElement('li');
      const a = document.createElement('span'); a.textContent = t;
      const b = document.createElement('span'); b.textContent = v ? `$${fmt(v)}` : 'incl.';
      li.append(a, b); lines.append(li);
    });
    const sum = rows.reduce((s, r) => s + r[1], 0);
    const from = shown, t0 = performance.now();
    cancelAnimationFrame(raf);
    const step = now => {
      const k = reduce ? 1 : ease(clamp((now - t0) / 450));
      shown = Math.round(from + (sum - from) * k);
      total.textContent = fmt(shown);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }
  est.addEventListener('change', renderTicket);
  setTint();

  /* ---------- Booking (concept: nothing is sent) ---------- */
  const days = $('#bookDays'), times = $('#bookTimes'), bnote = $('#bookNote');
  let selDay = '', selTime = '';
  function chip(label, small, group, onPick, on) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'chip'; b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', on ? 'true' : 'false');
    if (small) { const s = document.createElement('small'); s.textContent = small; b.append(s); }
    b.append(document.createTextNode(label));
    b.addEventListener('click', () => { $$('.chip', group).forEach(x => x.setAttribute('aria-checked', 'false')); b.setAttribute('aria-checked', 'true'); onPick(); });
    group.append(b);
  }
  const wk = new Intl.DateTimeFormat('en-US', { weekday: 'short' });
  const today = new Date();
  for (let n = 1, added = 0; added < 5 && n < 10; n++) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + n);
    if (d.getDay() === 0) continue;
    const text = `${wk.format(d)} ${d.getDate()}`;
    if (!added) selDay = text;
    chip(String(d.getDate()), wk.format(d), days, () => { selDay = text; }, !added);
    added++;
  }
  ['9:00', '11:00', '1:30', '4:00'].forEach((t, n) => { if (!n) selTime = t; chip(t, null, times, () => { selTime = t; }, !n); });
  $('#bookForm').addEventListener('submit', e => {
    e.preventDefault();
    bnote.textContent = `Held: ${selDay} at ${selTime}, with ${current.name} and ${tintChoice}% tint. This is a concept site, so nothing was sent.`;
  });
})();
