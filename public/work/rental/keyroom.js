/* Keyroom (concept by Quvlo). Scroll drives the garage film and a rev counter. One bay over, the
   showroom: scroll or drag turns the car on a turntable, and spec callouts attach to the parts facing
   you. The quote below follows whichever car is on the turntable. No libraries, no innerHTML. */
(() => {
  'use strict';
  // Bump when any film or spin frame changes, so browsers fetch the new frames instead of cached ones.
  const FV = '2026102801';
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

  /* =========================================================== Film (shared engine: film-engine.js) */
  const PER = 40, SHOTS = 6;
  const film = $('#film'), canvas = $('#filmCanvas');
  const loader = $('#loader'), loadPct = $('#loadPct'), loadBar = $('#loadBar');
  const bar = $('.bar'), hero = $('#hero'), caps = $$('.cap');
  let opened = false;
  function openLoader() { if (opened) return; opened = true; document.body.classList.remove('is-loading'); loader.classList.add('is-open'); }

  /* Rev counter: follows the car in the footage. Off under the cover, idles near 700 once started,
     rises only while it moves, and stays well under the 6.2 V8's redline (about 5,800). */
  const tachRpm = $('#tachRpm'), tachFill = $('#tachFill'), RED = 5800, MAX = 7000;
  const RPM = [[0, 0], [82, 0], [85, 1250], [92, 720], [120, 700], [124, 1700], [138, 2150], [150, 2300], [159, 1900],
    [165, 1500], [180, 1100], [188, 720], [227, 700], [232, 1700], [239, 2600]];
  function rpmAt(f) {
    for (let k = 1; k < RPM.length; k++) {
      if (f <= RPM[k][0]) { const [a, ra] = RPM[k - 1], [b, rb] = RPM[k]; return ra + (rb - ra) * clamp((f - a) / Math.max(1, b - a)); }
    }
    return RPM[RPM.length - 1][1];
  }
  let lastRpm = -1;
  function ui(v) {
    const f = v.f, shot = v.shot, local = v.local;
    hero.classList.toggle('is-off', f > 14);
    caps.forEach(cap => {
      const s = +cap.dataset.shot;
      const on = s === SHOTS - 1 ? f >= (SHOTS - 1) * PER + 6 : (s === 0 ? f > 18 && f < PER - 2 : shot === s && local > 0.06 && local < 0.94);
      cap.classList.toggle('is-on', on);
    });
    const raw = rpmAt(f), rpm = raw < 50 ? 0 : Math.round(raw / 10) * 10;
    if (rpm !== lastRpm) {
      lastRpm = rpm;
      tachRpm.textContent = rpm ? rpm.toLocaleString('en-US') : '0';
      tachRpm.parentElement.classList.toggle('is-red', rpm >= RED);
      tachFill.style.width = (rpm / MAX * 100).toFixed(2) + '%';
    }
  }
  window.FilmEngine.create({
    section: film, stage: $('.film__stage'), canvas, FV, range: [0.01, 0.94], rate: 8, mStride: 2,
    lift: '.cap, .hero, .tach',
    overlays: { '.cap': 'is-on' },
    onGate: k => { const p = Math.round(k * 100); loadPct.textContent = String(p); loadBar.style.width = p + '%'; },
    onReady: () => { openLoader(); spin.prime('escalade'); },
    onFrame: ui,
  });
  setTimeout(openLoader, 9000); // never trap a visitor behind the loader on a very slow connection

  // Cover-fit an image into a canvas; returns the drawn rect so overlays can follow it
  function cover(c, W, H, im) {
    const s = Math.max(W / im.naturalWidth, H / im.naturalHeight);
    const w = im.naturalWidth * s, h = im.naturalHeight * s, x = (W - w) / 2, y = (H - h) / 2;
    c.drawImage(im, x, y, w, h);
    return { x, y, w, h };
  }
  function nearestLoaded(arr, i, n) {
    if (arr[i]) return i;
    for (let d = 1; d < n; d++) { if (arr[i - d]) return i - d; if (arr[i + d]) return i + d; }
    return -1;
  }

  /* =========================================================== Showroom turntable */
  const show = $('#showroom'), stage = $('#showStage'), sc = $('#spinCanvas'), sctx = sc.getContext('2d', { alpha: false });
  const dim = $('#showDim'), coWrap = $('#callouts'), carName = $('#carName'), carPrice = $('#carPrice'), showSr = $('#showSr');
  const spin = (() => {
    let S = null; const sets = {}; let car = 'escalade', sw = 0, sh = 0, rect = null, kindS = 'd';
    let angle = 0, scrollAngle = 0, dragOff = 0, vel = 0, nudgeLeft = 0, drawn = -1, needs = true, coEls = [], hidden = false, selSeq = 0;
    const N72 = 72;
    const url = (id, i) => `spin/${id}/${kindS}/${String(i).padStart(2, '0')}.webp?v=${FV}`;
    async function meta() { if (!S) { try { S = await (await fetch(`spin/spin.json?v=${FV}`, { cache: 'no-cache' })).json(); } catch { S = {}; } } return S; }
    function prime(id) {
      if (sets[id]) return sets[id].ready;
      kindS = innerWidth < 760 ? 'm' : 'd';
      const set = { imgs: [], ready: null, full: null };
      sets[id] = set;
      // Every 4th view first so the car can turn coarsely at once (the swap waits only for these), then fill the gaps
      const order = []; for (let i = 0; i < N72; i += 4) order.push(i); for (let i = 0; i < N72; i++) if (i % 4) order.push(i);
      set.ready = Promise.all(order.slice(0, 18).map(i => load(url(id, i)).then(im => { set.imgs[i] = im; needs = true; })));
      set.full = set.ready.then(async () => { let n = 18; const w = async () => { while (n < order.length) { const i = order[n++]; set.imgs[i] = await load(url(id, i)); needs = true; } }; await Promise.all([w(), w(), w()]); });
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
        if (a[0] < 0 || a[0] > 1) { root.classList.remove('is-on'); return; }
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
      if (kindS === 'm' || sw / sh < 1) {
        // Phones and portrait tablets: the whole car across the width, set a little above centre, the bay fading into night
        sctx.fillStyle = '#0b0f17'; sctx.fillRect(0, 0, sw, sh);
        const w = Math.round(sw * (kindS === 'm' ? 1.16 : 1)), h = im.naturalHeight * (w / im.naturalWidth), x = Math.round((sw - w) / 2), y = Math.round(sh * 0.53 - h / 2);
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
      if (nudgeLeft) { const step = Math.abs(nudgeLeft) < 0.2 ? nudgeLeft : nudgeLeft * (1 - Math.exp(-dt * 10)); dragOff += step; nudgeLeft -= step; }
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
    // A finger that stopped before lifting does not fling the car
    const end = () => { if (performance.now() - lastT > 80) vel = 0; dragging = false; stage.classList.remove('is-drag'); };
    stage.addEventListener('pointerup', end); stage.addEventListener('pointercancel', end);
    function nudge(d) { if (reduce) { dragOff += d * 45; render(); } else nudgeLeft += d * 30; }
    // Race-safe: only the latest tap swaps the car; the name and price change with the picture, not before it
    async function select(id, onSwap) {
      if (!CARS[id]) return;
      const token = ++selSeq;
      if (id === car) { if (onSwap) onSwap(); return; }
      await meta();
      if (token !== selSeq) return;
      const go = () => { car = id; drawn = -1; needs = true; buildCallouts(); render(); if (onSwap) onSwap(); };
      prime(id);
      if (reduce) { await sets[id].ready; if (token === selSeq) go(); return; }
      dim.classList.add('is-on'); hidden = true; coEls.forEach(e => e.root.classList.remove('is-on'));
      await Promise.all([sets[id].ready, new Promise(r => setTimeout(r, 280))]);
      if (token !== selSeq) return;
      go();
      requestAnimationFrame(() => { dim.classList.remove('is-on'); setTimeout(() => { if (token === selSeq) { hidden = false; needs = true; render(); } }, 280); });
    }
    return {
      prime, resize, frame, nudge, select,
      async init() { await meta(); buildCallouts(); prime(car); },
      setScroll(p) { scrollAngle = p * 360; },
      get car() { return car; },
    };
  })();

  function showProgress() { const r = show.getBoundingClientRect(); return clamp(-r.top / Math.max(1, show.offsetHeight - stage.offsetHeight)); }
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
    spin.select(id, () => {
      carName.textContent = SHORT[id]; carPrice.textContent = money(CARS[id].rate);
      showSr.textContent = `${CARS[id].name}, ${money(CARS[id].rate)} a day.`;
      $('#spinCanvas').setAttribute('aria-label', `${CARS[id].name} turning on a turntable in the garage`);
    });
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

  /* =========================================================== Main loop (the film runs in the engine) */
  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!reduce) spin.setScroll(showProgress());
    spin.frame(dt, showInView());
    bar.classList.toggle('is-solid', film.getBoundingClientRect().bottom < 90);
    requestAnimationFrame(loop);
  }
  addEventListener('resize', () => spin.resize());

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
      row(cover[0] + (cover[1] ? `, ${days} × ${money(cover[1])}` : ''), cover[1] ? money(ins) : '$0, your policy'),
      row('Estimated tax (10%)', money(tax)),
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
  const rform = $('#rform'), rMsg = $('#rMsg'), rDate = $('#rDate');
  const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  rDate.min = iso(new Date());
  // Each rule is set on its own field, so the red outline, the screen reader and the message all agree
  const RULES = {
    name: [v => v.length >= 2, 'your name'],
    phone: [v => v.replace(/\D/g, '').length >= 7, 'a mobile number'],
    email: [v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), 'a valid email'],
    date: [v => { if (!v) return false; const t = new Date(); t.setHours(0, 0, 0, 0); return new Date(v + 'T00:00') >= t; }, 'a start date from today on'],
    meet: [v => v.length >= 3, 'where to meet you'],
  };
  const listOf = a => a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1];
  function check(field) {
    const r = RULES[field.name]; if (!r) return true;
    const ok = r[0](String(field.value || '').trim());
    field.setCustomValidity(ok ? '' : `Please add ${r[1]}.`);
    field.setAttribute('aria-invalid', String(!ok));
    return ok;
  }
  rform.querySelectorAll('input, select').forEach(f => {
    f.setAttribute('aria-describedby', 'rMsg');
    f.addEventListener('blur', () => { f.classList.add('is-touched'); check(f); });
    f.addEventListener('input', () => { if (f.classList.contains('is-touched')) check(f); });
  });
  rform.addEventListener('submit', e => {
    e.preventDefault();
    const bad = [];
    rform.querySelectorAll('input, select').forEach(f => { f.classList.add('is-touched'); if (!check(f)) bad.push(f); });
    rMsg.classList.toggle('is-err', bad.length > 0); rMsg.classList.toggle('is-ok', bad.length === 0);
    if (bad.length) { rMsg.textContent = 'Please check ' + listOf(bad.map(f => RULES[f.name][1])) + '.'; bad[0].focus(); return; }
    const id = rform.elements.car.value, car = CARS[id] ? CARS[id].name : 'your car';
    rMsg.textContent = `Looks good. On a real site, the ${car} would now be held for you and we would text to confirm the handover. This is a concept, so nothing was sent.`;
  });

  quote();
  spin.init();
  spin.resize();
  requestAnimationFrame(loop);
})();
