/* Keyroom (concept by Quvlo). Scroll is the engine: the footage, the chapter captions and the
   tachometer all read one number, and the gauge hits redline as the car leaves. Below it, a key wall
   that rolls a garage door up on each car, and a quote that shows every cost before booking.
   No libraries, no innerHTML. */
(() => {
  'use strict';
  // Bump when any film frame changes, so browsers fetch the new frames instead of cached ones.
  const FV = '2026102701';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SVGNS = 'http://www.w3.org/2000/svg';
  const money = n => '$' + Math.round(n).toLocaleString('en-US');
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

  /* =========================================================== Fleet (sample prices, approximate specs) */
  const CARS = {
    escalade: { name: 'Cadillac Escalade', kind: 'Full-size luxury SUV', img: 'car-escalade', alt: 'Black Cadillac Escalade in a lit garage bay',
      rate: 289, deposit: 2500, mile: 1.0,
      specs: [['0 to 60', '5.9 s'], ['Power', '420 hp'], ['Seats', '7'], ['Bags', '4 large'], ['Economy', '16 mpg'], ['Engine', '6.2L V8']] },
    tahoe: { name: 'Chevrolet Tahoe High Country', kind: 'Full-size SUV', img: 'car-tahoe', alt: 'White Chevrolet Tahoe High Country in a lit garage bay',
      rate: 219, deposit: 2000, mile: 0.75,
      specs: [['0 to 60', '6.1 s'], ['Power', '420 hp'], ['Seats', '7'], ['Bags', '4 large'], ['Economy', '16 mpg'], ['Engine', '6.2L V8']] },
    i5: { name: 'BMW i5', kind: 'Electric executive sedan', img: 'car-i5', alt: 'Grey BMW i5 sedan in a lit garage bay',
      rate: 179, deposit: 1500, mile: 0.75,
      specs: [['0 to 60', '5.7 s'], ['Power', '335 hp'], ['Seats', '5'], ['Bags', '3 large'], ['Range', '290 mi'], ['Drive', 'Electric']] },
    modely: { name: 'Tesla Model Y', kind: 'Electric SUV', img: 'car-modely', alt: 'Red Tesla Model Y in a lit garage bay',
      rate: 149, deposit: 1000, mile: 0.75,
      specs: [['0 to 60', '4.6 s'], ['Motors', 'Dual'], ['Seats', '5'], ['Bags', '4 large'], ['Range', '320 mi'], ['Drive', 'Electric AWD']] },
    bronco: { name: 'Ford Bronco 4-door', kind: 'Off-road SUV', img: 'car-bronco', alt: 'Grey Ford Bronco four-door with a black hardtop in a lit garage bay',
      rate: 189, deposit: 1500, mile: 0.75,
      specs: [['0 to 60', '6.9 s'], ['Power', '300 hp'], ['Seats', '5'], ['Bags', '3 large'], ['Economy', '20 mpg'], ['Drive', '4x4']] },
    e53: { name: 'Mercedes-AMG E 53 Hybrid', kind: 'Performance hybrid sedan', img: 'car-e53', alt: 'Blue Mercedes-AMG E 53 Hybrid sedan in a lit garage bay',
      rate: 239, deposit: 2500, mile: 1.0,
      specs: [['0 to 60', '3.7 s'], ['Power', '577 hp'], ['Seats', '5'], ['Bags', '2 large'], ['Engine', '3.0L I6 hybrid'], ['Drive', 'AWD']] },
  };

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

  function load(url) {
    return new Promise(res => {
      const im = new Image();
      im.decoding = 'async';
      im.onload = () => { (im.decode ? im.decode() : Promise.resolve()).catch(() => {}).then(() => res(im)); };
      im.onerror = () => res(null);
      im.src = url;
    });
  }
  async function boot() {
    try { M = await (await fetch(`frames.json?v=${FV}`, { cache: 'no-cache' })).json(); } catch { M = null; }
    if (!M || !Number.isFinite(M.count)) { openLoader(); return; }
    kind = pick(); N = Math.min(M.count, PER * SHOTS);
    STRIDE = kind === 'm' ? (M.m && M.m.stride) || 2 : 1;
    // Open once a sketch of the first shot is in, then fill in behind the viewer
    const first = [];
    for (let i = 0; i < PER; i += 4) first.push(i - (i % STRIDE));
    let done = 0;
    const tick = () => { done++; const p = Math.min(100, Math.round(done / first.length * 100)); loadPct.textContent = String(p); loadBar.style.width = p + '%'; };
    await Promise.all(first.map(i => load(frameUrl(i)).then(im => { imgs[i] = im; dirty = true; tick(); })));
    openLoader();
    const queue = [];
    for (let i = 0; i < N; i += STRIDE) if (!first.includes(i)) queue.push(i);
    let next = 0;
    const worker = async () => { while (next < queue.length) { const i = queue[next++]; imgs[i] = await load(frameUrl(i)); dirty = true; } };
    await Promise.all([worker(), worker(), worker(), worker(), worker()]);
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
  }
  function nearestLoaded(i) {
    if (imgs[i]) return i;
    for (let d = 1; d < N; d++) { if (imgs[i - d]) return i - d; if (imgs[i + d]) return i + d; }
    return -1;
  }
  const frameFromProgress = p => clamp((p - 0.01) / 0.94) * Math.max(0, N - 1);

  function draw(f) {
    if (!N) return;
    const fs = f / STRIDE, i0 = Math.floor(fs) * STRIDE, k = fs - Math.floor(fs);
    const i1 = Math.min(N - 1 - ((N - 1) % STRIDE), i0 + STRIDE);
    const a = nearestLoaded(i0);
    if (a < 0) return;
    const A = imgs[a];
    const s = Math.max(cw / A.naturalWidth, ch / A.naturalHeight);
    const w = A.naturalWidth * s, h = A.naturalHeight * s, x = (cw - w) / 2, y = (ch - h) / 2;
    ctx.globalAlpha = 1;
    ctx.drawImage(A, x, y, w, h);
    // Blend toward the next frame only inside a shot, so cuts stay clean
    if (k > 0.02 && imgs[i1] && a === i0 && Math.floor(i0 / PER) === Math.floor(i1 / PER)) { ctx.globalAlpha = k; ctx.drawImage(imgs[i1], x, y, w, h); ctx.globalAlpha = 1; }
  }

  /* =========================================================== Tachometer */
  // Each chapter owns an rpm band; the last one runs into the redline as the car pulls away.
  const MAX_RPM = 8000, RED = 6500;
  const BANDS = [[800, 1400], [1400, 2400], [2400, 3400], [3400, 4800], [4800, 5800], [5800, 7600]];
  const CHAPTERS = ['01 · Idle', '02 · Uncovered', '03 · Ignition', '04 · On its way', '05 · Arrival', '06 · Redline'];
  const tachSvg = $('#tachSvg'), tachRpm = $('#tachRpm'), tachCh = $('#tachCh'), tachSr = $('#tachSr');
  const svgEl = (tag, attrs) => { const e = document.createElementNS(SVGNS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
  const X = rpm => 2 + (rpm / MAX_RPM) * 396;
  let fillRect, needle;
  (function buildTach() {
    const defs = svgEl('defs', {}), g = svgEl('linearGradient', { id: 'tachGrad', x1: '0', x2: '1', y1: '0', y2: '0' });
    [['0', '#a8afba'], ['0.7', '#d39256'], ['0.86', '#c8432f'], ['1', '#e0482f']].forEach(([o, c]) => g.appendChild(svgEl('stop', { offset: o, 'stop-color': c })));
    defs.appendChild(g); tachSvg.appendChild(defs);
    tachSvg.appendChild(svgEl('rect', { class: 'track', x: X(0), y: 30, width: X(MAX_RPM) - X(0), height: 5 }));
    fillRect = svgEl('rect', { class: 'fill', x: X(0), y: 30, width: 0, height: 5 });
    tachSvg.appendChild(fillRect);
    for (let r = 0; r <= MAX_RPM; r += 500) {
      const maj = r % 1000 === 0, red = r >= RED;
      tachSvg.appendChild(svgEl('line', { class: 'tk' + (maj ? ' tk--maj' : '') + (red ? ' tk--red' : ''), x1: X(r), x2: X(r), y1: maj ? 18 : 23, y2: 28 }));
      if (maj) { const t = svgEl('text', { class: 'num' + (red ? ' num--red' : ''), x: X(r), y: 13, 'text-anchor': r === 0 ? 'start' : r === MAX_RPM ? 'end' : 'middle' }); t.textContent = String(r / 1000); tachSvg.appendChild(t); }
    }
    needle = svgEl('rect', { class: 'needle', x: X(800) - 1, y: 16, width: 2, height: 22 });
    tachSvg.appendChild(needle);
  })();

  let lastShot = -1, lastRpm = -1;
  function ui(f) {
    const shot = Math.min(SHOTS - 1, Math.floor(f / PER)), local = clamp((f - shot * PER) / (PER - 1));
    hero.classList.toggle('is-off', f > 14);
    caps.forEach(cap => {
      const s = +cap.dataset.shot;
      const on = s === SHOTS - 1 ? f >= (SHOTS - 1) * PER + 6 : (s === 0 ? f > 18 && f < PER - 2 : shot === s && local > 0.06 && local < 0.94);
      cap.classList.toggle('is-on', on);
    });
    const [a, b] = BANDS[shot];
    const rpm = Math.round((a + (b - a) * local) / 10) * 10;
    if (rpm !== lastRpm) {
      lastRpm = rpm;
      fillRect.setAttribute('width', String(X(rpm) - X(0)));
      needle.setAttribute('x', String(X(rpm) - 1));
      tachRpm.textContent = rpm.toLocaleString('en-US');
      tachRpm.parentElement.classList.toggle('is-red', rpm >= RED);
    }
    if (shot !== lastShot) { lastShot = shot; tachCh.textContent = CHAPTERS[shot]; tachSr.textContent = `Chapter ${CHAPTERS[shot].replace(' · ', ', ')}`; }
  }

  function filmProgress() { const r = film.getBoundingClientRect(); return clamp(-r.top / (film.offsetHeight - innerHeight)); }
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
    bar.classList.toggle('is-solid', film.getBoundingClientRect().bottom < 90);
    requestAnimationFrame(loop);
  }
  new IntersectionObserver(es => { filmVisible = es[0].isIntersecting; if (filmVisible) dirty = true; }).observe(film);
  addEventListener('resize', size);
  size();
  requestAnimationFrame(loop);
  boot();

  /* =========================================================== Key wall: roll the bay door */
  const hots = $$('.hot'), door = $('#door'), bayImg = $('#bayImg');
  const bayName = $('#bayName'), bayKind = $('#bayKind'), baySpecs = $('#baySpecs'), bayPrice = $('#bayPrice'), bayQuote = $('#bayQuote');
  let bayCar = 'escalade', doorTimer = 0;
  // Warm the fleet photos so the door never opens on an empty bay
  Object.values(CARS).forEach(c => { const im = new Image(); im.src = `img/${c.img}.webp`; });

  function fillBay(id) {
    const c = CARS[id];
    bayImg.src = `img/${c.img}.webp`; bayImg.alt = c.alt;
    bayName.textContent = c.name; bayKind.textContent = c.kind; bayPrice.textContent = money(c.rate);
    baySpecs.replaceChildren(...c.specs.map(([k, v]) => { const d = el('div'); d.append(el('dt', null, k), el('dd', null, v)); return d; }));
  }
  function openBay(id) {
    if (id === bayCar) return;
    bayCar = id;
    hots.forEach(h => h.setAttribute('aria-pressed', String(h.dataset.car === id)));
    clearTimeout(doorTimer);
    if (reduce) { fillBay(id); return; }
    door.classList.add('is-down');
    doorTimer = setTimeout(() => { fillBay(id); requestAnimationFrame(() => door.classList.remove('is-down')); }, 640);
  }
  const bay = $('#bay');
  hots.forEach(h => h.addEventListener('click', () => {
    openBay(h.dataset.car);
    // Phones stack the bay under the wall: bring it into view so the door is seen opening
    const r = bay.getBoundingClientRect();
    if (innerWidth < 980 && r.top > innerHeight * 0.55) bay.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }));
  // Arrow keys move along the wall, like the hooks are in a row
  $('.wall__keys').addEventListener('keydown', e => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const i = hots.indexOf(document.activeElement); if (i < 0) return;
    e.preventDefault();
    const n = hots[(i + (e.key === 'ArrowRight' ? 1 : hots.length - 1)) % hots.length];
    n.focus(); openBay(n.dataset.car);
  });
  fillBay('escalade');
  bayQuote.addEventListener('click', () => { qCar.value = bayCar; quote(); });

  /* =========================================================== Honest quote */
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
  $('#qReserve').addEventListener('click', () => { $('#rCar').value = qCar.value; });
  quote();

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
    rMsg.textContent = `Looks good. On a real site, ${car} would now be held for you and a driver would text to confirm. This is a concept, so nothing was sent.`;
  });
})();
