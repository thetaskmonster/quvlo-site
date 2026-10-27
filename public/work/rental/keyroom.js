/* Keyroom (concept by Quvlo). Scroll drives the garage film and a rev counter. One bay over, the
   showroom: scroll or drag turns the car on a turntable, and spec callouts attach to the parts facing
   you. The quote below follows whichever car is on the turntable. No libraries, no innerHTML. */
(() => {
  'use strict';
  // Bump when any film or spin frame changes, so browsers fetch the new frames instead of cached ones.
  const FV = '2026102701';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const money = n => '$' + Math.round(n).toLocaleString('en-US');
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const load = url => new Promise(res => {
    const im = new Image();
    im.decoding = 'async';
    im.onload = () => { (im.decode ? im.decode() : Promise.resolve()).catch(() => {}).then(() => res(im)); };
    im.onerror = () => res(null);
    im.src = url;
  });

  /* =========================================================== Fleet (sample prices, approximate published specs)
     Callouts: deg is the turntable angle where that part faces the camera; x/y place the anchor on the
     desktop frame (fractions of width/height), measured from the spin frames by tools/anchors. */
  const CARS = {
    escalade: { name: 'Cadillac Escalade', rate: 289, deposit: 2500, mile: 1.0, callouts: [] },
    tahoe: { name: 'Chevrolet Tahoe High Country', rate: 219, deposit: 2000, mile: 0.75, callouts: [] },
    e53: { name: 'Mercedes-AMG E 53 Hybrid', rate: 239, deposit: 2500, mile: 1.0, callouts: [] },
    i5: { name: 'BMW i5', rate: 179, deposit: 1500, mile: 0.75, callouts: [] },
    bronco: { name: 'Ford Bronco 4-door', rate: 189, deposit: 1500, mile: 0.75, callouts: [] },
    modely: { name: 'Tesla Model Y', rate: 149, deposit: 1000, mile: 0.75, callouts: [] },
  };
  const SHORT = { escalade: 'Cadillac Escalade', tahoe: 'Tahoe High Country', e53: 'AMG E 53 Hybrid', i5: 'BMW i5', bronco: 'Ford Bronco', modely: 'Tesla Model Y' };

  /* =========================================================== Film */
  const PER = 40, SHOTS = 6;
  const film = $('#film'), canvas = $('#filmCanvas'), ctx = canvas.getContext('2d', { alpha: false });
  const loader = $('#loader'), loadPct = $('#loadPct'), loadBar = $('#loadBar');
  const bar = $('.bar'), hero = $('#hero'), caps = $$('.cap');
  let M = null, kind = 'd', N = 0, STRIDE = 1;
  const imgs = [];
  let target = 0, cur = 0, lastF = -1, lastP = -1, dirty = true, filmVisible = true;
  const pick = () => (innerWidth / innerHeight < 0.85 || innerWidth < 760) ? 'm' : 'd';
  const frameUrl = i => `f/${kind}/${String(i + 1).padStart(3, '0')}.webp?v=${FV}`;

  async function boot() {
    try { M = await (await fetch(`frames.json?v=${FV}`, { cache: 'no-cache' })).json(); } catch { M = null; }
    if (!M || !Number.isFinite(M.count)) { openLoader(); return; }
    kind = pick(); N = Math.min(M.count, PER * SHOTS);
    STRIDE = kind === 'm' ? (M.m && M.m.stride) || 2 : 1;
    const first = [];
    for (let i = 0; i < PER; i += 4) first.push(i - (i % STRIDE));
    let done = 0;
    const tick = () => { done++; const p = Math.min(100, Math.round(done / first.length * 100)); loadPct.textContent = String(p); loadBar.style.width = p + '%'; };
    await Promise.all(first.map(i => load(frameUrl(i)).then(im => { imgs[i] = im; dirty = true; tick(); })));
    openLoader();
    spin.prime('escalade'); // the first showroom car loads early, behind the film
    const queue = [];
    for (let i = 0; i < N; i += STRIDE) if (!first.includes(i)) queue.push(i);
    let next = 0;
    const worker = async () => { while (next < queue.length) { const i = queue[next++]; imgs[i] = await load(frameUrl(i)); dirty = true; } };
    await Promise.all([worker(), worker(), worker(), worker()]);
  }
  function openLoader() { document.body.classList.remove('is-loading'); loader.classList.add('is-open'); }

  let cw = 0, ch = 0;
  function size() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = canvas.getBoundingClientRect();
    cw = Math.round(r.width * dpr); ch = Math.round(r.height * dpr);
    if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
    if (M && pick() !== kind) location.reload();
    dirty = true;
    spin.resize();
  }
  function nearestLoaded(arr, i, n) {
    if (arr[i]) return i;
    for (let d = 1; d < n; d++) { if (arr[i - d]) return i - d; if (arr[i + d]) return i + d; }
    return -1;
  }
  // Cover-fit an image into a canvas; returns the drawn rect so overlays can follow it
  function cover(c, W, H, im, alpha = 1) {
    const s = Math.max(W / im.naturalWidth, H / im.naturalHeight);
    const w = im.naturalWidth * s, h = im.naturalHeight * s, x = (W - w) / 2, y = (H - h) / 2;
    c.globalAlpha = alpha; c.drawImage(im, x, y, w, h); c.globalAlpha = 1;
    return { x, y, w, h };
  }
  const frameFromProgress = p => clamp((p - 0.01) / 0.94) * Math.max(0, N - 1);
  function draw(f) {
    if (!N) return;
    const fs = f / STRIDE, i0 = Math.floor(fs) * STRIDE, k = fs - Math.floor(fs);
    const i1 = Math.min(N - 1 - ((N - 1) % STRIDE), i0 + STRIDE);
    const a = nearestLoaded(imgs, i0, N);
    if (a < 0) return;
    cover(ctx, cw, ch, imgs[a]);
    if (k > 0.02 && imgs[i1] && a === i0 && Math.floor(i0 / PER) === Math.floor(i1 / PER)) cover(ctx, cw, ch, imgs[i1], k);
  }

  /* Rev counter: idle at the top, redline as the car leaves */
  const tachRpm = $('#tachRpm'), tachFill = $('#tachFill'), RED = 6500, MAX = 8000;
  let lastShot = -1, lastRpm = -1;
  function ui(f) {
    const shot = Math.min(SHOTS - 1, Math.floor(f / PER)), local = clamp((f - shot * PER) / (PER - 1));
    hero.classList.toggle('is-off', f > 14);
    caps.forEach(cap => {
      const s = +cap.dataset.shot;
      const on = s === SHOTS - 1 ? f >= (SHOTS - 1) * PER + 6 : (s === 0 ? f > 18 && f < PER - 2 : shot === s && local > 0.06 && local < 0.94);
      cap.classList.toggle('is-on', on);
    });
    const t = clamp(f / (N > 1 ? N - 1 : 1)), rpm = Math.round((800 + (7600 - 800) * t * t) / 10) * 10;
    if (rpm !== lastRpm) {
      lastRpm = rpm;
      tachRpm.textContent = rpm.toLocaleString('en-US');
      tachRpm.parentElement.classList.toggle('is-red', rpm >= RED);
      tachFill.style.width = (rpm / MAX * 100).toFixed(2) + '%';
    }
    lastShot = shot;
  }
  const filmProgress = () => { const r = film.getBoundingClientRect(); return clamp(-r.top / (film.offsetHeight - innerHeight)); };

  /* =========================================================== Showroom turntable */
  const show = $('#showroom'), stage = $('#showStage'), sc = $('#spinCanvas'), sctx = sc.getContext('2d', { alpha: false });
  const dim = $('#showDim'), coWrap = $('#callouts'), carName = $('#carName'), carPrice = $('#carPrice'), showSr = $('#showSr');
  const spin = (() => {
    let S = null; const sets = {}; let car = 'escalade', sw = 0, sh = 0, rect = null, kindS = 'd';
    let angle = 0, scrollAngle = 0, dragOff = 0, vel = 0, drawn = -1, needs = true, coEls = [], hidden = false;
    const N72 = 72;
    const url = (id, i) => `spin/${id}/${kindS}/${String(i).padStart(2, '0')}.webp?v=${FV}`;
    async function meta() { if (!S) { try { S = await (await fetch(`spin/spin.json?v=${FV}`, { cache: 'no-cache' })).json(); } catch { S = {}; } } return S; }
    function prime(id) {
      if (sets[id]) return sets[id].ready;
      kindS = innerWidth < 760 ? 'm' : 'd';
      const set = { imgs: [], ready: null };
      sets[id] = set;
      // Every 4th view first so the car can turn coarsely at once, then fill the gaps
      const order = []; for (let i = 0; i < N72; i += 4) order.push(i); for (let i = 0; i < N72; i++) if (i % 4) order.push(i);
      set.ready = Promise.all(order.slice(0, 18).map(i => load(url(id, i)).then(im => { set.imgs[i] = im; needs = true; })))
        .then(async () => { let n = 18; const w = async () => { while (n < order.length) { const i = order[n++]; set.imgs[i] = await load(url(id, i)); needs = true; } }; await Promise.all([w(), w(), w()]); });
      return set.ready;
    }
    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2), r = sc.getBoundingClientRect();
      sw = Math.round(r.width * dpr); sh = Math.round(r.height * dpr);
      if (sc.width !== sw || sc.height !== sh) { sc.width = sw; sc.height = sh; }
      needs = true;
    }
    function buildCallouts() {
      coWrap.replaceChildren();
      const list = (S && S[car] && S[car].callouts) || [];
      coEls = list.map(c => {
        const root = el('div', 'co'), line = el('span', 'co__line'), dot = el('span', 'co__dot'), card = el('span', 'co__card');
        card.append(el('span', 'co__v', c.v), el('span', 'co__k', c.k));
        root.append(line, dot, card); coWrap.appendChild(root);
        return { c, root, line, card };
      });
    }
    function placeCallouts(view) {
      if (!rect) return;
      const dpr = sw / sc.getBoundingClientRect().width || 1, deg = view * 5;
      const narrow = innerWidth < 760, vw = sc.getBoundingClientRect().width;
      const infoBottom = $('.show__info').getBoundingClientRect().bottom - sc.getBoundingClientRect().top;
      coEls.forEach(({ c, root, line, card }) => {
        const d = Math.abs(((deg - c.deg + 540) % 360) - 180);
        const on = !hidden && d <= 15;
        root.classList.toggle('is-on', on);
        if (!on) return;
        const ad = c.a.d, mc = S._m || { x0: 0.15, w: 0.7 };
        const a = kindS === 'm' ? [(ad[0] - mc.x0) / mc.w, ad[1]] : ad;
        const x = (rect.x + a[0] * rect.w) / dpr, y = (rect.y + a[1] * rect.h) / dpr;
        // Leader goes up and out, away from the car's centre; on phones it points back in so the card stays on screen,
        // and it flips downward rather than run into the car name
        let dir = a[0] < 0.5 ? -1 : 1;
        if (narrow) dir = x > vw * 0.55 ? -1 : x < vw * 0.45 ? 1 : dir;
        const len = narrow ? 40 : 70;
        let ex = dir * len * 0.7, ey = -len;
        if (y + ey - 30 < infoBottom + 8) ey = len * 0.9;
        root.style.transform = `translate(${x}px, ${y}px)`;
        line.style.width = Math.hypot(ex, ey) + 'px';
        line.style.transform = `rotate(${Math.atan2(ey, ex)}rad)`;
        card.style.left = (dir > 0 ? ex + 6 : ex - 6) + 'px';
        card.style.top = (ey < 0 ? ey - 24 : ey - 4) + 'px';
        card.style.transform = dir > 0 ? 'none' : 'translateX(-100%)';
      });
    }
    function render() {
      const set = sets[car]; if (!set) return;
      let v = ((Math.round(angle / 5) % N72) + N72) % N72;
      const i = nearestLoaded(set.imgs, v, N72); if (i < 0) return;
      if (i === drawn && !needs) return;
      const im = set.imgs[i];
      if (kindS === 'm') {
        // Phones: the whole car across the width, set a little above centre, the bay fading into night
        sctx.fillStyle = '#0b0f17'; sctx.fillRect(0, 0, sw, sh);
        const w = Math.round(sw * 1.16), h = im.naturalHeight * (w / im.naturalWidth), x = Math.round((sw - w) / 2), y = Math.round(sh * 0.53 - h / 2);
        sctx.drawImage(im, x, y, w, h);
        const fade = (y0, y1) => { const g = sctx.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, 'rgba(11,15,23,1)'); g.addColorStop(1, 'rgba(11,15,23,0)'); return g; };
        sctx.fillStyle = fade(y, y + h * 0.22); sctx.fillRect(0, y, w, h * 0.22);
        sctx.fillStyle = fade(y + h, y + h * 0.75); sctx.fillRect(0, y + h * 0.75, w, h * 0.25);
        rect = { x, y, w, h };
      } else rect = cover(sctx, sw, sh, im);
      drawn = i; needs = false;
      placeCallouts(i);
    }
    function frame(dt, inView) {
      if (!inView) return;
      if (!dragging) { dragOff += vel * dt; vel *= Math.exp(-dt * 3.2); if (Math.abs(vel) < 2) vel = 0; }
      const next = scrollAngle + dragOff;
      if (next !== angle) angle = next;
      render();
    }
    // Drag with momentum (degrees per pixel tuned so a full-width swipe is about a half turn)
    let dragging = false, lastX = 0, lastT = 0;
    stage.addEventListener('pointerdown', e => {
      if (e.target.closest('button, a')) return;
      dragging = true; lastX = e.clientX; lastT = performance.now(); vel = 0;
      stage.classList.add('is-drag'); stage.setPointerCapture(e.pointerId);
    });
    stage.addEventListener('pointermove', e => {
      if (!dragging) return;
      const now = performance.now(), dx = e.clientX - lastX, k = 180 / Math.max(320, stage.clientWidth);
      dragOff -= dx * k; vel = -dx * k / Math.max(0.008, (now - lastT) / 1000);
      lastX = e.clientX; lastT = now;
    });
    const end = () => { dragging = false; stage.classList.remove('is-drag'); };
    stage.addEventListener('pointerup', end); stage.addEventListener('pointercancel', end);
    function nudge(d) { dragOff += d * (reduce ? 45 : 30); if (reduce) render(); }
    async function select(id) {
      if (id === car || !CARS[id]) return;
      await meta();
      const go = () => { car = id; drawn = -1; needs = true; buildCallouts(); render(); };
      prime(id);
      if (reduce) { await sets[id].ready; go(); return; }
      dim.classList.add('is-on'); hidden = true; coEls.forEach(e => e.root.classList.remove('is-on'));
      await Promise.all([sets[id].ready, new Promise(r => setTimeout(r, 300))]);
      go();
      requestAnimationFrame(() => { dim.classList.remove('is-on'); setTimeout(() => { hidden = false; needs = true; render(); }, 280); });
    }
    return {
      prime, resize, frame, nudge, select,
      async init() { await meta(); buildCallouts(); prime(car); },
      setScroll(p) { scrollAngle = p * 360; },
      get car() { return car; },
    };
  })();

  function showProgress() { const r = show.getBoundingClientRect(); return clamp(-r.top / Math.max(1, show.offsetHeight - innerHeight)); }
  function showInView() { const r = show.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; }

  $$('.turn').forEach(b => b.addEventListener('click', () => spin.nudge(+b.dataset.d)));
  stage.tabIndex = 0;
  stage.addEventListener('keydown', e => {
    if (e.target.closest('.keyrow')) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); spin.nudge(e.key === 'ArrowRight' ? 1 : -1); }
  });

  /* Key row: pick a car */
  const kbtns = $$('.kbtn');
  function chooseCar(id, focus) {
    kbtns.forEach(b => { const on = b.dataset.car === id; b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1; if (on && focus) b.focus(); });
    spin.select(id);
    carName.textContent = SHORT[id]; carPrice.textContent = money(CARS[id].rate);
    showSr.textContent = `${CARS[id].name}, ${money(CARS[id].rate)} a day.`;
    $('#spinCanvas').setAttribute('aria-label', `${CARS[id].name} turning on a turntable in the garage`);
    qCar.value = id; $('#rCar').value = id; quote();
  }
  kbtns.forEach((b, i) => {
    b.tabIndex = i === 0 ? 0 : -1;
    b.addEventListener('click', () => chooseCar(b.dataset.car));
  });
  $('.keyrow').addEventListener('keydown', e => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const i = kbtns.findIndex(b => b.getAttribute('aria-checked') === 'true');
    const n = kbtns[(i + (e.key === 'ArrowRight' ? 1 : kbtns.length - 1)) % kbtns.length];
    chooseCar(n.dataset.car, true);
  });

  /* =========================================================== Main loop */
  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    target = filmProgress();
    if (reduce) cur = target;
    else { cur += (target - cur) * (1 - Math.exp(-dt * 8)); if (Math.abs(target - cur) < 0.00005) cur = target; }
    // While scrolling, blend between frames; once scrolling stops, settle on a whole frame so nothing looks doubled
    const fRaw = frameFromProgress(cur), f = cur === target ? Math.round(fRaw / STRIDE) * STRIDE : fRaw;
    if (filmVisible && (dirty || Math.abs(f - lastF) > 0.001)) { draw(f); lastF = f; dirty = false; }
    if (Math.abs(cur - lastP) > 0.00003 || lastShot < 0) { ui(f); lastP = cur; }
    if (!reduce) spin.setScroll(showProgress());
    spin.frame(dt, showInView());
    bar.classList.toggle('is-solid', film.getBoundingClientRect().bottom < 90);
    requestAnimationFrame(loop);
  }
  new IntersectionObserver(es => { filmVisible = es[0].isIntersecting; if (filmVisible) dirty = true; }).observe(film);
  addEventListener('resize', size);

  /* =========================================================== Quote */
  const qCar = $('#qCar'), qDays = $('#qDays'), qDaysOut = $('#qDaysOut'), qTotal = $('#qTotal'), qLines = $('#qLines'), qTerms = $('#qTerms');
  const WHERE = { home: ['Home or office delivery and collection', 95], hotel: ['Hotel delivery and collection', 95], fbo: ['Private terminal delivery and collection', 175] };
  const COVER = { own: ['Your own policy', 0], std: ['Keyroom cover, $1,000 deductible', 39], plus: ['Keyroom cover plus, no deductible', 69] };
  const TAX = 0.1, MILES_DAY = 150;
  const row = (k, v) => { const d = el('div'); d.append(el('dt', null, k), el('dd', null, v)); return d; };
  function quote() {
    const c = CARS[qCar.value] || CARS.escalade, days = clamp(+qDays.value || 1, 1, 14);
    const where = WHERE[($('input[name="where"]:checked') || {}).value] || WHERE.home;
    const cover = COVER[($('input[name="cover"]:checked') || {}).value] || COVER.std;
    qDaysOut.textContent = `${days} day${days === 1 ? '' : 's'}`;
    const rent = c.rate * days, ins = cover[1] * days, tax = (rent + ins + where[1]) * TAX;
    qTotal.textContent = money(rent + ins + where[1] + tax);
    qLines.replaceChildren(
      row(`${c.name}, ${days} × ${money(c.rate)}`, money(rent)),
      row(where[0], money(where[1])),
      row(cover[0] + (cover[1] ? `, ${days} × ${money(cover[1])}` : ''), cover[1] ? money(ins) : 'Included'),
      row('Estimated tax and fees (10%)', money(tax)),
    );
    qTerms.replaceChildren(
      row('Security deposit, refundable hold', money(c.deposit)),
      row('Miles included', `${(MILES_DAY * days).toLocaleString('en-US')} total`),
      row('Each extra mile', '$' + c.mile.toFixed(2)),
      row('Driver age', '25 or older'),
    );
  }
  $('#qform').addEventListener('input', quote);
  $('#qform').addEventListener('change', quote);
  // Picking a car in the quote puts it on the turntable too
  qCar.addEventListener('change', () => chooseCar(qCar.value));
  $('#qReserve').addEventListener('click', () => { $('#rCar').value = qCar.value; });
  $('#carQuote').addEventListener('click', () => { qCar.value = spin.car; quote(); });

  /* =========================================================== Reserve: validate, send nothing */
  const rform = $('#rform'), rMsg = $('#rMsg');
  rform.querySelectorAll('input, select').forEach(f => f.addEventListener('blur', () => f.classList.add('is-touched')));
  rform.addEventListener('submit', e => {
    e.preventDefault();
    const fd = new FormData(rform), v = k => String(fd.get(k) || '').trim();
    rform.querySelectorAll('input, select').forEach(f => f.classList.add('is-touched'));
    const errs = [];
    if (v('name').length < 2) errs.push('your name');
    if (v('phone').replace(/\D/g, '').length < 7) errs.push('a mobile number');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v('email'))) errs.push('a valid email');
    const d = v('date'), today = new Date(); today.setHours(0, 0, 0, 0);
    if (!d || new Date(d + 'T00:00') < today) errs.push('a start date from today on');
    if (v('where').length < 3) errs.push('where to meet you');
    rMsg.classList.toggle('is-err', errs.length > 0); rMsg.classList.toggle('is-ok', errs.length === 0);
    if (errs.length) { rMsg.textContent = 'Please add ' + errs.join(', ') + '.'; return; }
    const car = CARS[v('car')] ? CARS[v('car')].name : 'your car';
    rMsg.textContent = `Looks good. On a real site, the ${car} would now be held for you and a driver would text to confirm. This is a concept, so nothing was sent.`;
  });

  quote();
  spin.init();
  size();
  requestAnimationFrame(loop);
  boot();
})();
