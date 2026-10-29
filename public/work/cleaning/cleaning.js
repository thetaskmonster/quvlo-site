/* Brightside Home Cleaning (concept by Quvlo). No libraries. */
(() => {
  'use strict';
  // Bump when any film frame changes, so browsers fetch the new frames instead of cached ones.
  const FV = '2026102823';
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
  const meterN = $('#meterN'), meterFill = $('#meterFill'), wipeStatus = $('#wipeStatus');
  const autoBtn = $('#wipeAuto'), resetBtn = $('#wipeReset');
  const heroLine = $('#heroLine'), heroP = $('#heroP');
  const cursor = document.createElement('div');
  cursor.className = 'wipe__cursor';
  wipe.append(cursor);

  // Coverage grid over the visible kitchen. Only the cells where the messy photo differs from the clean
  // one (the clutter, plus a cell around it) count, so the meter measures the mess that was wiped, not
  // the whole picture.
  const GX = 64, GY = 40;
  const cleanImg = $('#wipeClean');
  let grid = new Uint8Array(GX * GY), clutter = null, nClutter = 0, covered = 0, coveredMess = 0, done = false, started = false;
  let mess = null, cw = 0, ch = 0, dpr = 1, last = null, autoRaf = 0;

  // Phones show a narrow slice of the kitchen: it leans left, onto the cluttered counter and stove, and the
  // clean photo underneath uses the same framing (object-position in cleaning.css)
  const narrowWipe = matchMedia('(max-width: 600px)');
  function cover(iw, ih) {
    const s = Math.max(cw / iw, ch / ih), fx = narrowWipe.matches ? 0.25 : 0.5;
    return { x: (cw - iw * s) * fx, y: (ch - ih * s) / 2, w: iw * s, h: ih * s };
  }
  function paintMess() {
    if (!mess) return;
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, cw, ch);
    const r = cover(mess.naturalWidth, mess.naturalHeight);
    ctx.drawImage(mess, r.x, r.y, r.w, r.h);
  }
  function buildClutter() {
    clutter = null; nClutter = 0;
    if (!mess || !mess.naturalWidth || !cleanImg.complete || !cleanImg.naturalWidth || !cw || !ch) return;
    const S = 4, w = GX * S, h = GY * S, oc = document.createElement('canvas');
    oc.width = w; oc.height = h;
    const o = oc.getContext('2d', { willReadFrequently: true }), kx = w / cw, ky = h / ch;
    const pixels = im => {
      const r = cover(im.naturalWidth, im.naturalHeight);
      o.clearRect(0, 0, w, h); o.drawImage(im, r.x * kx, r.y * ky, r.w * kx, r.h * ky);
      return o.getImageData(0, 0, w, h).data;
    };
    let a, b;
    try { a = pixels(mess); b = pixels(cleanImg); } catch { return; }
    const raw = new Uint8Array(GX * GY);
    for (let gy = 0; gy < GY; gy++) for (let gx = 0; gx < GX; gx++) {
      let d = 0;
      for (let y = gy * S; y < gy * S + S; y++) for (let x = gx * S; x < gx * S + S; x++) {
        const i = (y * w + x) * 4;
        d += Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]);
      }
      if (d / (S * S * 3) > 10) raw[gy * GX + gx] = 1;
    }
    const c = new Uint8Array(GX * GY);
    for (let gy = 0; gy < GY; gy++) for (let gx = 0; gx < GX; gx++) {
      if (!raw[gy * GX + gx]) continue;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const x = gx + dx, y = gy + dy;
        if (x >= 0 && y >= 0 && x < GX && y < GY) c[y * GX + x] = 1;
      }
    }
    let n = 0, m = 0;
    for (let i = 0; i < c.length; i++) if (c[i]) { n++; if (grid[i]) m++; }
    if (n < 20) return;
    clutter = c; nClutter = n; coveredMess = m;
  }
  function sizeWipe() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    const b = canvas.getBoundingClientRect();
    const w = Math.round(b.width * dpr), h = Math.round(b.height * dpr);
    if (w === cw && h === ch) return;
    cw = w; ch = h; canvas.width = w; canvas.height = h;
    grid = new Uint8Array(GX * GY); covered = 0; coveredMess = 0;
    if (done) ctx.clearRect(0, 0, cw, ch); else paintMess();
    buildClutter();
    setMeter();
  }
  // a fingertip covers more than a mouse pointer, so touch gets a wider cloth
  const radius = () => Math.max(cw, ch) * (matchMedia('(hover: none)').matches ? 0.12 : 0.062);
  // percent wiped before the rest is swept for you: of the clutter, or of the whole picture as a fallback
  const doneAt = () => (clutter ? 85 : 70);

  function dab(x, y, r) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(0,0,0,1)');
    g.addColorStop(0.55, 'rgba(0,0,0,.9)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    // mark grid cells the cloth actually cleared (the solid part of the brush) as clean
    const rr = r * 0.85, cx0 = Math.floor((x - rr) / cw * GX), cx1 = Math.ceil((x + rr) / cw * GX);
    const cy0 = Math.floor((y - rr) / ch * GY), cy1 = Math.ceil((y + rr) / ch * GY);
    for (let gy = Math.max(0, cy0); gy < Math.min(GY, cy1); gy++) {
      for (let gx = Math.max(0, cx0); gx < Math.min(GX, cx1); gx++) {
        const px = (gx + 0.5) / GX * cw, py = (gy + 0.5) / GY * ch;
        const i = gy * GX + gx;
        if (Math.hypot(px - x, py - y) <= rr && !grid[i]) { grid[i] = 1; covered++; if (clutter && clutter[i]) coveredMess++; }
      }
    }
  }
  function stroke(a, b, r) {
    const d = Math.hypot(b.x - a.x, b.y - a.y), n = Math.max(1, Math.ceil(d / (r * 0.25)));
    for (let i = 1; i <= n; i++) dab(lerp(a.x, b.x, i / n), lerp(a.y, b.y, i / n), r);
  }
  function pct() { return clutter ? Math.floor(coveredMess / nClutter * 100) : Math.round(covered / grid.length * 100); }
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
      heroLine.textContent = cleanState ? 'One kitchen down.' : 'Wipe Monday away.';
      heroP.textContent = cleanState
        ? 'That took you seconds. A team of two does a typical three-bedroom home in about three hours, and every room ends up like this.'
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
        wipeStatus.textContent = 'Kitchen clean.';
        setHeadline(true);
        resetBtn.hidden = false;
      }
    };
    requestAnimationFrame(step);
  }
  function afterStroke() {
    if (!started) { started = true; wipe.classList.add('is-started'); }
    setMeter();
    if (pct() >= doneAt()) finish();
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
    done = false; started = false; covered = 0; coveredMess = 0; grid = new Uint8Array(GX * GY);
    wipe.classList.remove('is-done', 'is-started');
    paintMess(); setMeter(); setHeadline(false);
    wipeStatus.textContent = '';
    resetBtn.hidden = true;
  });

  mess = new Image();
  mess.decoding = 'async';
  mess.onload = () => { cw = 0; sizeWipe(); };
  if (!cleanImg.complete) cleanImg.addEventListener('load', () => { buildClutter(); setMeter(); }, { once: true });
  mess.src = 'img/kitchen-mess.webp';
  addEventListener('resize', sizeWipe);

  /* ---------- Film: one visit, scrubbed by scroll (shared engine: film-engine.js) ---------- */
  const film = $('#film'), fc = $('#filmCanvas');
  const frame = $('#frame'), caps = $$('.cap'), list = $('#list'), items = $$('#list li');
  const listTime = $('#listTime'), listAmPm = $('#listAmPm'), filmBar = $('#filmBar');
  // Clock (minutes after midnight) at the start of each shot and at the end. The visit is the crew's
  // second home of the day: in at 1:00 pm, done at 3:45 pm, a team of two.
  const CLOCK = [780, 790, 820, 855, 895, 945, 945];
  let N = 240;
  const phonePortrait = matchMedia('(max-width: 600px) and (orientation: portrait)');
  // on phones the checklist card sits over the top of the shower glass, so it steps aside for the whole bathroom shot
  const phoneSmall = matchMedia('(max-width: 600px) and (orientation: portrait), (orientation: landscape) and (max-height: 500px)');
  const fmt = m => { const h = Math.floor(m / 60), mm = Math.round(m % 60); return [`${h > 12 ? h - 12 : h}:${String(mm).padStart(2, '0')}`, h >= 12 ? 'pm' : 'am']; };
  function filmUi(p, f, shot, local) {
    const r = film.getBoundingClientRect();
    if (r.bottom < -50 || r.top > innerHeight + 50) return;
    // the frame opens from a card to full screen as the section arrives
    const open = ease(clamp(p / 0.06));
    frame.style.setProperty('--inset', `${lerp(9, 0, open)}%`);
    frame.style.setProperty('--inset-x', `${lerp(6, 0, open)}%`);
    frame.style.setProperty('--r', `${lerp(28, 0, open)}px`);
    // a caption can wait for its shot's action to move out of its way on phones (data-from-s, a 0-1 point)
    const phoneUp = phonePortrait.matches;
    caps.forEach(c => { const s = +c.dataset.shot, from = phoneUp && c.dataset.fromS && !reduce ? +c.dataset.fromS : 0.08; c.classList.toggle('is-on', open > 0.9 && s === shot && local > from && local < 0.92); });
    list.classList.toggle('is-on', open > 0.9);
    // with a margin either side of the shot, so the card is already gone when the blade first shows, scrolling down or up
    list.classList.toggle('is-tuck', phoneSmall.matches && (shot === 3 || (shot === 2 && local > 0.9) || (shot === 4 && local < 0.1)));
    const q = f / Math.max(1, N - 1);
    // one checklist line per scene: the line for the scene on screen is current, earlier ones are done
    items.forEach((li, n) => {
      li.classList.toggle('is-done', n < shot || (n === shot && local > 0.85));
      li.classList.toggle('is-current', n === shot);
    });
    // the clock holds the time in the caption while it is up, then runs on to the next one
    const [t, ap] = fmt(lerp(CLOCK[shot], CLOCK[shot + 1], clamp((local - 0.92) / 0.08)));
    if (listTime.textContent !== t) listTime.textContent = t;
    if (listAmPm.textContent !== ap) listAmPm.textContent = ap;
    filmBar.parentElement.style.setProperty('--p', q.toFixed(3));
  }
  // The card opens with scroll every frame; captions, checklist and clock follow the picture on screen.
  let lastF = null;
  window.FilmEngine.create({
    section: film, stage: $('.film__stage'), canvas: fc, FV, range: [0.05, 0.92], rate: 10, bg: getComputedStyle($('#frame')).backgroundColor,
    lift: '.cap, .list, .film__bar',
    overlays: { '.cap': 'is-on', '.list': 'is-on' },
    onFrame: v => { N = v.N; lastF = v; },
    // p (scroll) only opens the card frame; everything over the picture reads the drawn frame
    onTick: (v, dt, p) => { const d = v || lastF; if (d) filmUi(p, d.f, d.shot, d.local); else filmUi(p, 0, 0, 0); },
  });

  /* ---------- Estimator, with a clock that times how long pricing took ---------- */
  const est = $('#est'), totalEl = $('#total'), totalU = $('#totalU'), totalSay = $('#totalSay');
  const clockEl = $('#clock'), clockK = $('#clockK'), clockDot = $('#clockDot');
  const counts = { beds: 3, baths: 2 };
  const LIMITS = { beds: [0, 6], baths: [1, 5] };
  const deepBoxes = $$('input[data-deep]', est);
  let shown = 0, raf = 0, sayT = 0;
  // the chosen type of clean: its value multiplies the standard price; data-kind is deep, rec (recurring) or move
  const kindOf = () => { const r = est.querySelector('input[name="freq"]:checked'); return { mult: r ? +r.value : 1.5, kind: r ? r.dataset.kind : 'deep' }; };
  function price() {
    const { mult, kind } = kindOf();
    // a deep or move-out clean already includes the inside of the oven and fridge, so they are not charged twice
    const extras = $$('input[name="extra"]:checked', est).reduce((a, i) => a + (kind !== 'rec' && i.dataset.deep ? 0 : +i.value), 0);
    const base = 95 + counts.beds * 22 + counts.baths * 28;
    // every visit has a $120 minimum before extras, so ticking an extra always moves the price
    return { total: Math.max(120, Math.round(base * mult)) + extras, kind };
  }
  function syncDeep(kind) {
    const incl = kind !== 'rec';
    deepBoxes.forEach(i => {
      if (incl) { if (!i.disabled) { i.dataset.was = i.checked ? '1' : ''; i.checked = true; i.disabled = true; } }
      else if (i.disabled) { i.disabled = false; i.checked = i.dataset.was === '1'; }
      i.nextElementSibling.querySelector('.incl').hidden = !incl;
    });
  }
  function roll() {
    // the oven and fridge boxes are put right for the type of clean first, so the price reads them as shown
    syncDeep(kindOf().kind);
    const { total, kind } = price();
    const unit = kind === 'move' ? 'one move-out clean, inside the oven, fridge and cabinets included'
      : kind === 'rec' ? 'per visit after a first deep clean, supplies included'
      : 'one deep clean: baseboards, inside oven and fridge, supplies included';
    totalU.textContent = unit;
    const from = shown, start = performance.now();
    cancelAnimationFrame(raf);
    const step = now => {
      const k = reduce ? 1 : ease(clamp((now - start) / 380));
      shown = Math.round(lerp(from, total, k));
      totalEl.textContent = String(shown);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    // screen readers hear the settled price once, not every number of the count-up
    clearTimeout(sayT);
    sayT = setTimeout(() => { totalSay.textContent = `$${total}, ${unit}.`; }, 450);
  }
  // The clock times how long pricing took. It ticks while you choose and stops a moment after your latest
  // change (so it never runs back), settles when "Book this clean" is pressed or after a few quiet seconds,
  // and the next change after that starts a fresh count.
  const HOLD = 1500;
  const fmtClock = ms => { const sec = Math.floor(ms / 1000); return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`; };
  let t0 = 0, lastChange = 0, active = false, idleT = 0, tick = 0;
  const elapsed = () => Math.min(performance.now(), lastChange + HOLD) - t0;
  function settle() {
    if (!active) return;
    active = false; clearTimeout(idleT); clearInterval(tick);
    const ms = Math.max(1000, elapsed());
    clockEl.textContent = fmtClock(ms);
    clockDot.classList.remove('is-run'); clockDot.classList.add('is-done');
    clockK.textContent = ms <= 30000 ? 'to your price. Under 30 seconds.' : 'to your price. No rush.';
  }
  function touchClock() {
    const now = performance.now();
    if (!active) {
      active = true; t0 = now;
      clockDot.classList.remove('is-done'); clockDot.classList.add('is-run');
      clockK.textContent = 'and counting';
      clearInterval(tick);
      tick = setInterval(() => { clockEl.textContent = fmtClock(elapsed()); }, 200);
    }
    lastChange = now;
    clockEl.textContent = fmtClock(elapsed());
    clearTimeout(idleT);
    idleT = setTimeout(settle, 5000);
  }
  // bathrooms a home of this size can sensibly have: a studio has one, then up to one more than bedrooms
  const bathMax = () => Math.min(LIMITS.baths[1], counts.beds === 0 ? 1 : counts.beds + 1);
  function showCount(k) {
    const el = $('#' + k), word = k === 'beds' && counts[k] === 0;
    el.textContent = word ? 'Studio' : String(counts[k]);
    el.classList.toggle('is-word', word);
    $$(`.step__b[data-step="${k}"]`, est).forEach(b => {
      const lo = LIMITS[k][0], hi = k === 'baths' ? bathMax() : LIMITS[k][1], d = +b.dataset.d;
      b.disabled = d < 0 ? counts[k] <= lo : counts[k] >= hi;
    });
  }
  $$('.step__b', est).forEach(b => b.addEventListener('click', () => {
    const k = b.dataset.step, lo = LIMITS[k][0], hi = k === 'baths' ? bathMax() : LIMITS[k][1];
    counts[k] = clamp(counts[k] + +b.dataset.d, lo, hi);
    // fewer bedrooms can bring the bathrooms down with them
    counts.baths = clamp(counts.baths, LIMITS.baths[0], bathMax());
    showCount('beds'); showCount('baths');
    // a button that just became disabled would drop focus to the page: keep it on the group
    if (b.disabled) (b.parentElement.querySelector('.step__b:not(:disabled)') || b).focus();
    roll(); touchClock();
  }));
  est.addEventListener('change', () => { roll(); touchClock(); });
  $('#estBook').addEventListener('click', settle);
  showCount('beds'); showCount('baths');
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
  // arrival windows, not exact times: traffic and the home before yours vary
  [['8 to 9 am', '8 and 9 am'], ['10 to 11 am', '10 and 11 am'], ['12 to 1 pm', '12 and 1 pm']].forEach(([t, say], n) => { const b = chip(t, null, times, () => { selTime = say; }); if (n === 1) { b.setAttribute('aria-checked', 'true'); selTime = say; } });
  $('#bookGo').addEventListener('click', () => {
    note.textContent = `Held: ${selDay}, arriving between ${selTime}. Demo only: nothing was sent. A real build books it straight into the company's calendar.`;
  });
  $$('a[href="#book"]').forEach(a => a.addEventListener('click', () => setTimeout(() => $('#book').focus({ preventScroll: true }), 600)));
})();
