/* Brightside Home Cleaning (concept by Quvlo). No libraries. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const ease = k => k * k * (3 - 2 * k);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Bar ---------- */
  const bar = $('#bar');
  addEventListener('scroll', () => bar.classList.toggle('is-scrolled', scrollY > 10), { passive: true });

  /* ---------- Wipe: the visitor cleans the kitchen ---------- */
  const wipe = $('#wipe'), canvas = $('#wipeCanvas'), ctx = canvas.getContext('2d');
  const meterN = $('#meterN'), meterFill = $('#meterFill');
  const autoBtn = $('#wipeAuto'), resetBtn = $('#wipeReset');
  const heroLine = $('#heroLine'), heroP = $('#heroP');
  const cursor = document.createElement('div');
  cursor.className = 'wipe__cursor';
  wipe.append(cursor);

  const GX = 40, GY = 25;            // coverage grid over the visible kitchen
  let grid = new Uint8Array(GX * GY), covered = 0, done = false, started = false;
  let mess = null, cw = 0, ch = 0, dpr = 1, last = null, autoRaf = 0;

  function cover(iw, ih) {
    const s = Math.max(cw / iw, ch / ih);
    return { x: (cw - iw * s) / 2, y: (ch - ih * s) / 2, w: iw * s, h: ih * s };
  }
  function paintMess() {
    if (!mess) return;
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, cw, ch);
    const r = cover(mess.naturalWidth, mess.naturalHeight);
    ctx.drawImage(mess, r.x, r.y, r.w, r.h);
  }
  function sizeWipe() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    const b = canvas.getBoundingClientRect();
    const w = Math.round(b.width * dpr), h = Math.round(b.height * dpr);
    if (w === cw && h === ch) return;
    cw = w; ch = h; canvas.width = w; canvas.height = h;
    grid = new Uint8Array(GX * GY); covered = 0;
    if (done) ctx.clearRect(0, 0, cw, ch); else paintMess();
    setMeter();
  }
  const radius = () => Math.max(cw, ch) * (matchMedia('(hover: none)').matches ? 0.085 : 0.062);

  function dab(x, y, r) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(0,0,0,1)');
    g.addColorStop(0.55, 'rgba(0,0,0,.9)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    // mark grid cells inside ~70% of the brush as clean
    const rr = r * 0.7, cx0 = Math.floor((x - rr) / cw * GX), cx1 = Math.ceil((x + rr) / cw * GX);
    const cy0 = Math.floor((y - rr) / ch * GY), cy1 = Math.ceil((y + rr) / ch * GY);
    for (let gy = Math.max(0, cy0); gy < Math.min(GY, cy1); gy++) {
      for (let gx = Math.max(0, cx0); gx < Math.min(GX, cx1); gx++) {
        const px = (gx + 0.5) / GX * cw, py = (gy + 0.5) / GY * ch;
        if (Math.hypot(px - x, py - y) <= rr && !grid[gy * GX + gx]) { grid[gy * GX + gx] = 1; covered++; }
      }
    }
  }
  function stroke(a, b, r) {
    const d = Math.hypot(b.x - a.x, b.y - a.y), n = Math.max(1, Math.ceil(d / (r * 0.25)));
    for (let i = 1; i <= n; i++) dab(lerp(a.x, b.x, i / n), lerp(a.y, b.y, i / n), r);
  }
  function pct() { return Math.round(covered / grid.length * 100); }
  function setMeter() {
    const p = done ? 100 : pct();
    meterN.textContent = String(p);
    meterFill.style.strokeDashoffset = String(100 - p);
  }
  function sparkle(n) {
    for (let i = 0; i < n; i++) {
      const s = document.createElement('span');
      s.className = 'sparkle';
      s.style.left = (10 + Math.random() * 80) + '%';
      s.style.top = (12 + Math.random() * 70) + '%';
      s.style.animationDelay = (i * 70) + 'ms';
      wipe.append(s);
      setTimeout(() => s.remove(), 1400 + i * 70);
    }
  }
  function setHeadline(cleanState) {
    heroLine.classList.add('is-swap');
    setTimeout(() => {
      heroLine.textContent = '';
      const em = document.createElement('em');
      if (cleanState) { heroLine.append('Like nobody '); em.textContent = 'lives here.'; }
      else { heroLine.append('Wipe Monday '); em.textContent = 'away.'; }
      heroLine.append(em);
      heroP.textContent = cleanState
        ? 'That took you seconds. A whole house takes us about four hours, and it looks like this in every room.'
        : 'Drag across the kitchen. That is what we do on every visit, to every room.';
      heroLine.classList.remove('is-swap');
    }, 320);
  }
  function finish() {
    if (done) return;
    done = true;
    cancelAnimationFrame(autoRaf);
    // a quick sweep across whatever is left, then the room is fully clean
    const r = radius() * 1.6, rows = 4, t0 = performance.now(), dur = reduce ? 0 : 650;
    const path = [];
    for (let i = 0; i <= rows; i++) { const y = (i / rows) * ch; path.push({ x: i % 2 ? cw + r : -r, y }, { x: i % 2 ? -r : cw + r, y }); }
    let prev = path[0];
    const step = now => {
      const k = dur ? clamp((now - t0) / dur) : 1;
      const at = k * (path.length - 1), i = Math.floor(at), f = at - i;
      const a = path[Math.min(i, path.length - 1)], b = path[Math.min(i + 1, path.length - 1)];
      const p = { x: lerp(a.x, b.x, f), y: lerp(a.y, b.y, f) };
      stroke(prev, p, r); prev = p;
      if (k < 1) requestAnimationFrame(step);
      else {
        ctx.clearRect(0, 0, cw, ch);
        wipe.classList.add('is-done');
        setMeter(); sparkle(reduce ? 0 : 7);
        setHeadline(true);
        resetBtn.hidden = false;
      }
    };
    requestAnimationFrame(step);
  }
  function afterStroke() {
    if (!started) { started = true; wipe.classList.add('is-started'); }
    setMeter();
    if (pct() >= 85) finish();
  }

  const pos = e => { const b = canvas.getBoundingClientRect(); return { x: (e.clientX - b.left) * dpr, y: (e.clientY - b.top) * dpr }; };
  canvas.addEventListener('pointerdown', e => {
    if (done) return;
    last = pos(e); dab(last.x, last.y, radius()); afterStroke();
    if (e.pointerType === 'mouse') canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', e => {
    const b = wipe.getBoundingClientRect();
    cursor.style.transform = `translate3d(${e.clientX - b.left}px, ${e.clientY - b.top}px, 0)`;
    if (done) return;
    // A mouse wipes on hover; touch and pen wipe while pressed. Vertical touch drags scroll the page (touch-action: pan-y).
    if (e.pointerType === 'mouse' || e.buttons) {
      const p = pos(e);
      if (last) stroke(last, p, radius()); else dab(p.x, p.y, radius());
      last = p; afterStroke();
    }
  });
  const lift = () => { last = null; };
  canvas.addEventListener('pointerup', lift);
  canvas.addEventListener('pointercancel', lift);
  canvas.addEventListener('pointerleave', () => { last = null; wipe.classList.remove('is-hover'); });
  canvas.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse' && !done) wipe.classList.add('is-hover'); });

  // "Do it for me": an automatic zigzag wipe, good for screen recordings too
  autoBtn.addEventListener('click', () => {
    if (done) return;
    const r = radius() * 1.15, rows = 7, t0 = performance.now(), dur = reduce ? 0 : 2400;
    const pts = [];
    for (let i = 0; i <= rows; i++) { const y = ((i + 0.5) / (rows + 1)) * ch; pts.push({ x: i % 2 ? cw * 0.95 : cw * 0.05, y }); }
    let prev = pts[0];
    const step = now => {
      const k = dur ? ease(clamp((now - t0) / dur)) : 1;
      const at = k * (pts.length - 1), i = Math.floor(at), f = at - i;
      const a = pts[Math.min(i, pts.length - 1)], b = pts[Math.min(i + 1, pts.length - 1)];
      const p = { x: lerp(a.x, b.x, f), y: lerp(a.y, b.y, f) + Math.sin(now / 90) * r * 0.25 };
      stroke(prev, p, r); prev = p; afterStroke();
      if (!done && k < 1) autoRaf = requestAnimationFrame(step);
      else if (!done) finish();
    };
    autoRaf = requestAnimationFrame(step);
  });

  resetBtn.addEventListener('click', () => {
    done = false; started = false; covered = 0; grid = new Uint8Array(GX * GY);
    wipe.classList.remove('is-done', 'is-started');
    paintMess(); setMeter(); setHeadline(false);
    resetBtn.hidden = true;
  });

  mess = new Image();
  mess.decoding = 'async';
  mess.onload = () => { cw = 0; sizeWipe(); };
  mess.src = 'img/kitchen-mess.webp';
  addEventListener('resize', sizeWipe);

  /* ---------- Film: one visit, scrubbed by scroll ---------- */
  const PER = 40;
  const film = $('#film'), fc = $('#filmCanvas'), fctx = fc.getContext('2d', { alpha: false });
  const frame = $('#frame'), caps = $$('.cap'), list = $('#list'), items = $$('#list li');
  const listTime = $('#listTime'), listAmPm = $('#listAmPm'), filmBar = $('#filmBar');
  // Clock (minutes after midnight) at the start of each shot and at the end
  const CLOCK = [510, 522, 550, 605, 680, 820, 835];
  let M = null, kind = 'd', N = 0, imgs = [], fw = 0, fh = 0, lastDrawn = -1, dirtyF = true, cur = 0;
  const pick = () => (innerWidth / innerHeight < 0.85 || innerWidth < 760) ? 'm' : 'd';
  const url = i => `f/${kind}/${String(i + 1).padStart(3, '0')}.webp`;
  const load = u => new Promise(res => { const im = new Image(); im.decoding = 'async'; im.onload = () => res(im); im.onerror = () => res(null); im.src = u; });

  async function bootFilm() {
    try { M = await (await fetch('frames.json', { cache: 'force-cache' })).json(); } catch { M = null; }
    if (!M) return;
    kind = pick(); N = M.count;
    // first frame of every shot first, so a fast scroll never shows a blank
    const order = [];
    for (let s = 0; s < M.shots; s++) order.push(s * PER);
    for (let i = 0; i < N; i++) if (i % PER) order.push(i);
    let next = 0;
    const worker = async () => { while (next < order.length) { const i = order[next++]; imgs[i] = await load(url(i)); dirtyF = true; } };
    await Promise.all([worker(), worker(), worker(), worker()]);
  }
  function sizeFilm() {
    const d = Math.min(devicePixelRatio || 1, 2), b = fc.getBoundingClientRect();
    const w = Math.round(b.width * d), h = Math.round(b.height * d);
    if (w !== fw || h !== fh) { fw = w; fh = h; fc.width = w; fc.height = h; dirtyF = true; }
    if (M && pick() !== kind) location.reload();
  }
  function nearest(i) {
    if (imgs[i]) return i;
    for (let d = 1; d < N; d++) { if (imgs[i - d]) return i - d; if (imgs[i + d]) return i + d; }
    return -1;
  }
  function drawFilm(f) {
    const i0 = Math.floor(f), k = f - i0, a = nearest(i0);
    if (a < 0) return;
    const A = imgs[a], s = Math.max(fw / A.naturalWidth, fh / A.naturalHeight);
    const w = A.naturalWidth * s, h = A.naturalHeight * s, x = (fw - w) / 2, y = (fh - h) / 2;
    fctx.globalAlpha = 1; fctx.drawImage(A, x, y, w, h);
    const B = imgs[i0 + 1];
    if (k > 0.02 && B && a === i0) { fctx.globalAlpha = k; fctx.drawImage(B, x, y, w, h); fctx.globalAlpha = 1; }
  }
  const fmt = m => { const h = Math.floor(m / 60), mm = Math.round(m % 60); return [`${h > 12 ? h - 12 : h}:${String(mm).padStart(2, '0')}`, h >= 12 ? 'pm' : 'am']; };
  function filmUi(p, f) {
    // the frame opens from a card to full screen as the section arrives
    const open = ease(clamp(p / 0.06));
    frame.style.setProperty('--inset', `${lerp(9, 0, open)}%`);
    frame.style.setProperty('--inset-x', `${lerp(6, 0, open)}%`);
    frame.style.setProperty('--r', `${lerp(28, 0, open)}px`);
    const shot = Math.min(5, Math.floor(f / PER)), local = (f - shot * PER) / PER;
    caps.forEach(c => { const s = +c.dataset.shot; c.classList.toggle('is-on', open > 0.9 && s === shot && local > 0.08 && local < 0.92); });
    list.classList.toggle('is-on', open > 0.9);
    const q = f / Math.max(1, N - 1);
    let currentSet = false;
    for (let n = items.length - 1; n >= 0; n--) {
      const li = items[n], isDone = q >= +li.dataset.at;
      li.classList.toggle('is-done', isDone);
      const isCur = !currentSet && (isDone || n === 0);
      li.classList.toggle('is-current', isCur);
      if (isCur) currentSet = true;
    }
    const [t, ap] = fmt(lerp(CLOCK[shot], CLOCK[shot + 1], clamp(local)));
    if (listTime.textContent !== t) listTime.textContent = t;
    if (listAmPm.textContent !== ap) listAmPm.textContent = ap;
    filmBar.parentElement.style.setProperty('--p', q.toFixed(3));
  }
  function filmProgress() {
    const r = film.getBoundingClientRect(), span = film.offsetHeight - innerHeight;
    return clamp(-r.top / span);
  }
  let lastT = performance.now(), filmVisible = false;
  new IntersectionObserver(es => { filmVisible = es[0].isIntersecting; if (filmVisible) dirtyF = true; }).observe(film);
  function loop(now) {
    const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
    if (filmVisible && N) {
      const target = filmProgress();
      cur = reduce ? target : cur + (target - cur) * (1 - Math.exp(-dt * 10));
      const f = clamp((cur - 0.05) / 0.92) * (N - 1);
      if (dirtyF || Math.abs(f - lastDrawn) > 0.001) { drawFilm(f); lastDrawn = f; dirtyF = false; }
      filmUi(cur, f);
    }
    requestAnimationFrame(loop);
  }
  addEventListener('resize', sizeFilm);
  sizeFilm(); requestAnimationFrame(loop); bootFilm();

  /* ---------- Estimator with a 30-second clock ---------- */
  const est = $('#est'), totalEl = $('#total'), totalU = $('#totalU');
  const clockEl = $('#clock'), clockK = $('#clockK'), clockDot = $('#clockDot');
  const counts = { beds: 3, baths: 2 };
  const LIMITS = { beds: [1, 6], baths: [1, 5] };
  let shown = 0, raf = 0, t0 = 0, tick = 0, stopT = 0, stopped = false;
  function price() {
    const freq = +(est.querySelector('input[name="freq"]:checked') || { value: 0 }).value;
    const extras = $$('input[name="extra"]:checked', est).reduce((a, i) => a + +i.value, 0);
    const base = 79 + counts.beds * 28 + counts.baths * 22;
    // positive freq is a recurring discount, negative is the move-out surcharge
    return { total: Math.round(base * (1 - freq) + extras), freq };
  }
  function roll() {
    const { total, freq } = price();
    totalU.textContent = freq < 0 ? 'one deep clean, inside cabinets included' : freq > 0 ? 'per visit, supplies included' : 'one visit, supplies included';
    const from = shown, start = performance.now();
    cancelAnimationFrame(raf);
    const step = now => {
      const k = reduce ? 1 : ease(clamp((now - start) / 380));
      shown = Math.round(lerp(from, total, k));
      totalEl.textContent = String(shown);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }
  const fmtClock = ms => { const s = Math.floor(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  function touchClock() {
    if (stopped) return;
    if (!t0) {
      t0 = performance.now();
      clockDot.classList.add('is-run');
      clockK.textContent = 'Clock is running';
      tick = setInterval(() => { clockEl.textContent = fmtClock(performance.now() - t0); }, 250);
    }
    clearTimeout(stopT);
    stopT = setTimeout(() => {
      stopped = true; clearInterval(tick);
      const ms = performance.now() - t0;
      clockEl.textContent = fmtClock(ms);
      clockDot.classList.remove('is-run'); clockDot.classList.add('is-done');
      clockK.textContent = ms <= 30000 ? 'Priced. Under thirty seconds, as promised.' : 'Priced. Take all the time you need.';
    }, 2600);
  }
  $$('.step__b', est).forEach(b => b.addEventListener('click', () => {
    const k = b.dataset.step, [lo, hi] = LIMITS[k];
    counts[k] = clamp(counts[k] + +b.dataset.d, lo, hi);
    $('#' + k).textContent = String(counts[k]);
    roll(); touchClock();
  }));
  est.addEventListener('change', () => { roll(); touchClock(); });
  shown = price().total; totalEl.textContent = String(shown);

  /* ---------- Checklist tabs ---------- */
  const tabs = $$('[role="tab"]');
  function selectTab(t, focus) {
    tabs.forEach(x => {
      const on = x === t;
      x.setAttribute('aria-selected', String(on));
      x.tabIndex = on ? 0 : -1;
      const p = document.getElementById(x.getAttribute('aria-controls'));
      p.hidden = !on;
      if (on) { p.classList.remove('is-seen'); requestAnimationFrame(() => requestAnimationFrame(() => p.classList.add('is-seen'))); }
    });
    if (focus) t.focus();
  }
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => selectTab(t));
    t.addEventListener('keydown', e => {
      let j = -1;
      if (e.key === 'ArrowRight') j = (i + 1) % tabs.length;
      else if (e.key === 'ArrowLeft') j = (i - 1 + tabs.length) % tabs.length;
      else if (e.key === 'Home') j = 0;
      else if (e.key === 'End') j = tabs.length - 1;
      if (j >= 0) { e.preventDefault(); selectTab(tabs[j], true); }
    });
  });
  $$('.ticks').forEach(ul => $$('li', ul).forEach((li, n) => li.style.setProperty('--i', n)));
  new IntersectionObserver((es, o) => { if (es[0].isIntersecting) { $$('.panel:not([hidden])').forEach(p => p.classList.add('is-seen')); o.disconnect(); } }, { threshold: 0.3 }).observe($('.panels'));

  /* ---------- Booking (concept: nothing is sent) ---------- */
  const days = $('#bookDays'), times = $('#bookTimes'), note = $('#bookNote');
  let selDay = '', selTime = '';
  function chip(label, small, group, onPick) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'chip'; b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', 'false');
    if (small) { const s = document.createElement('small'); s.textContent = small; b.append(s); }
    b.append(document.createTextNode(label));
    b.addEventListener('click', () => { $$('.chip', group).forEach(x => x.setAttribute('aria-checked', 'false')); b.setAttribute('aria-checked', 'true'); onPick(); });
    group.append(b);
    return b;
  }
  const wd = new Intl.DateTimeFormat('en-US', { weekday: 'short' }), d0 = new Date();
  for (let n = 1, added = 0; added < 5 && n < 10; n++) {
    const d = new Date(d0.getFullYear(), d0.getMonth(), d0.getDate() + n);
    if (d.getDay() === 0) continue;
    const label = n === 1 ? 'Tomorrow' : wd.format(d), text = `${label} ${d.getDate()}`;
    const b = chip(String(d.getDate()), label, days, () => { selDay = text; });
    if (added === 0) { b.setAttribute('aria-checked', 'true'); selDay = text; }
    added++;
  }
  ['8 am', '10 am', '12 pm', '2 pm'].forEach((t, n) => { const b = chip(t, null, times, () => { selTime = t; }); if (n === 1) { b.setAttribute('aria-checked', 'true'); selTime = t; } });
  $('#bookGo').addEventListener('click', () => {
    note.textContent = `Held: ${selDay}, ${selTime}. This is a concept site, so nothing was sent. A real build books it straight into the company's calendar.`;
  });
  $$('a[href="#book"]').forEach(a => a.addEventListener('click', () => setTimeout(() => $('#book').focus({ preventScroll: true }), 600)));
})();
