/* Keyroom (concept by Quvlo). Scroll drives the garage film and a rev counter that follows the car. One
   bay over, the showroom: three fixed views of each car, with one spec pinned to each view. The quote
   below follows whichever car is in the showroom. No libraries, no innerHTML. */
(() => {
  'use strict';
  // Bump when any film frame or showroom picture changes, so browsers fetch the new files instead of cached ones.
  const FV = '2026103103';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const money = n => '$' + Math.round(n).toLocaleString('en-US');
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

  /* =========================================================== Fleet (sample prices, approximate published specs)
     One spec per view. a: the part it points at, as fractions of the picture's width and height.
     box: the car's outline in that picture, so the card is placed on empty wall or floor, never on the car.
     Both measured on the showroom pictures (show/<car>/<view>-2400.webp). */
  const CARS = {
    escalade: { name: 'Cadillac Escalade', rate: 499, deposit: 2500, mile: 4.0, views: {
      front34: { v: '420 hp', k: '6.2L V8', a: [0.60, 0.42], box: [0.25, 0.29, 0.75, 0.75] },
      side: { v: '7 seats', k: 'Three full rows', a: [0.27, 0.345], box: [0.17, 0.27, 0.82, 0.72] },
      rear34: { v: '22 in', k: 'Wheels', a: [0.495, 0.66], box: [0.21, 0.27, 0.74, 0.75] } } },
    tahoe: { name: 'Chevrolet Tahoe High Country', rate: 379, deposit: 2000, mile: 3.0, views: {
      front34: { v: '420 hp', k: '6.2L V8', a: [0.60, 0.44], box: [0.26, 0.31, 0.75, 0.78] },
      side: { v: '7 seats', k: 'Third row that fits adults', a: [0.27, 0.36], box: [0.18, 0.29, 0.82, 0.73] },
      rear34: { v: '22 in', k: 'Wheels', a: [0.52, 0.66], box: [0.23, 0.27, 0.74, 0.75] } } },
    e53: { name: 'Mercedes-AMG E 53 Hybrid', rate: 349, deposit: 2500, mile: 3.0, views: {
      front34: { v: '577 hp', k: 'Combined output', a: [0.61, 0.455], box: [0.25, 0.32, 0.80, 0.75] },
      side: { v: '20 in', k: 'AMG wheels', a: [0.30, 0.64], box: [0.15, 0.34, 0.84, 0.73] },
      rear34: { v: '3.8 s', k: '0 to 60 with Race Start', a: [0.415, 0.675], box: [0.22, 0.34, 0.75, 0.75] } } },
    i5: { name: 'BMW i5 eDrive40', rate: 249, deposit: 1500, mile: 2.0, views: {
      front34: { v: 'Up to 295 mi', k: 'EPA range, eDrive40', a: [0.49, 0.655], box: [0.26, 0.34, 0.79, 0.75] },
      side: { v: '335 hp', k: 'Electric, rear drive', a: [0.30, 0.645], box: [0.14, 0.33, 0.85, 0.73] },
      rear34: { v: '5.7 s', k: '0 to 60 mph', a: [0.51, 0.66], box: [0.21, 0.34, 0.77, 0.75] } } },
    bronco: { name: 'Ford Bronco 4-door', rate: 219, deposit: 1500, mile: 2.0, views: {
      front34: { v: '300 hp', k: '2.3L turbo', a: [0.62, 0.44], box: [0.26, 0.30, 0.75, 0.79] },
      side: { v: '5 seats', k: 'Room for the gear', a: [0.40, 0.36], box: [0.17, 0.28, 0.80, 0.75] },
      rear34: { v: '4x4', k: 'Low range, for ranch roads', a: [0.49, 0.65], box: [0.25, 0.27, 0.76, 0.75] } } },
    modely: { name: 'Tesla Model Y', rate: 139, deposit: 1000, mile: 1.5, views: {
      front34: { v: 'Dual motor', k: 'All-wheel drive', a: [0.505, 0.665], box: [0.28, 0.34, 0.77, 0.75] },
      side: { v: '19 in', k: 'Wheels', a: [0.30, 0.655], box: [0.19, 0.32, 0.80, 0.74] },
      rear34: { v: 'Up to 327 mi', k: 'Range, EPA estimate', a: [0.62, 0.62], box: [0.23, 0.32, 0.75, 0.75] } } },
  };
  const SHORT = { escalade: 'Cadillac Escalade', tahoe: 'Tahoe High Country', e53: 'AMG E 53 Hybrid', i5: 'BMW i5', bronco: 'Ford Bronco', modely: 'Tesla Model Y' };
  const VIEWS = ['front34', 'side', 'rear34'];
  const VIEW_NAME = { front34: 'front three-quarter view', side: 'side view', rear34: 'rear three-quarter view' };

  /* =========================================================== Film (shared engine: film-engine.js)
     4 shots of 40 frames (frames.json): 0 garage lights, 1 the Escalade lit in its bay, 2 the drive,
     3 parked at the jet. Everything below is keyed to view.f, the frame actually on screen. */
  const film = $('#film'), canvas = $('#filmCanvas');
  const loader = $('#loader'), loadPct = $('#loadPct'), loadBar = $('#loadBar');
  const bar = $('.bar'), hero = $('#hero'), caps = $$('.cap');
  const stageEl = $('.film__stage');
  let opened = false;
  function openLoader() { if (opened) return; opened = true; document.body.classList.remove('is-loading'); loader.classList.add('is-open'); }

  /* Rev counter: off while the car is parked in the garage (shots 0 and 1). In the drive (shot 2) the car
     cruises at a steady city speed; the counter follows the street's measured slide past the car, damped,
     because the buildings also change distance as the street passes (so their slide is not pure speed).
     At the jet (shot 3) the engine idles. The 6.2 V8 redlines near 5,800; this never gets close. */
  const tach = $('.tach'), tachRpm = $('#tachRpm'), tachFill = $('#tachFill'), MAX = 7000, IDLE = 650;
  const DRIVE = [1340, 1360, 1370, 1380, 1400, 1410, 1420, 1430, 1450, 1460, 1470, 1480, 1480, 1490, 1500, 1510,
    1520, 1520, 1530, 1530, 1540, 1540, 1550, 1550, 1550, 1550, 1560, 1560, 1560, 1560, 1560, 1560,
    1550, 1550, 1550, 1550, 1540, 1540, 1530, 1530]; // one value per drive frame (source frames 0-117, every 3rd)
  function rpmAt(shot, local) {
    if (shot < 2) return 0;
    if (shot === 3) return IDLE;
    const k = clamp(local, 0, DRIVE.length - 1), i = Math.min(DRIVE.length - 2, Math.floor(k)), t = k - i;
    return DRIVE[i] + (DRIVE[i + 1] - DRIVE[i]) * t;
  }
  let lastRpm = -1;
  function ui(v) {
    const f = v.f, shot = v.shot, PER = v.PER, local = f - shot * PER;
    // Under reduced motion each shot is one still, so the first caption shows with the headline
    hero.classList.toggle('is-off', reduce ? shot > 0 : f > 12);
    caps.forEach(cap => {
      const s = +cap.dataset.shot;
      let on;
      if (reduce) on = s === shot;
      else if (s === 0) on = shot === 0 && local > 16 && local < PER - 2;
      else if (s === 3) on = shot === 3 && local > 3;
      else on = shot === s && local > 2 && local < PER - 3;
      cap.classList.toggle('is-on', on);
    });
    const raw = rpmAt(shot, local), rpm = Math.round(raw / 10) * 10;
    if (rpm !== lastRpm) {
      lastRpm = rpm;
      tach.classList.toggle('is-on', rpm > 0);
      tachRpm.textContent = rpm.toLocaleString('en-US');
      tachFill.style.width = (rpm / MAX * 100).toFixed(2) + '%';
    }
  }
  if (reduce) stageEl.classList.add('is-still');
  window.FilmEngine.create({
    // band: on portrait tablets the 16:9 film fills half the screen height, wide enough to keep the car and the jet
    section: film, stage: stageEl, canvas, FV, range: [0.01, 0.94], rate: 8, band: 0.5, bandY: 0.42,
    lift: '.cap, .hero, .tach',
    overlays: { '.cap': 'is-on' },
    onGate: k => { const p = Math.round(k * 100); loadPct.textContent = String(p); loadBar.style.width = p + '%'; },
    onReady: () => { openLoader(); show.warm(); },
    onFrame: ui,
  });
  setTimeout(openLoader, 9000); // never trap a visitor behind the loader on a very slow connection

  /* =========================================================== Showroom: fixed views
     Swaps are race-safe: every pick gets a token, the new picture is fetched and decoded off screen,
     and it replaces the old one (with the name, price and spec) only if it is still the latest pick.
     Until then the old car stays up with its own label, so the screen is never blank and never wrong. */
  const showSec = $('#showroom'), pic = $('#showPic'), coWrap = $('#callouts');
  const carName = $('#carName'), carPrice = $('#carPrice'), carSpecs = $('#carSpecs'), showSr = $('#showSr');
  const show = (() => {
    // car/view: what is on screen. want: the latest pick, which may still be loading.
    let car = 'escalade', view = 'front34', seq = 0, width = 0, shownImg = $('#showImg'), warmed = false;
    const want = { car, view };
    const pool = new Map(); // url -> Image, kept so a picture fetched once is never fetched again
    const WIDTHS = [960, 1600, 2400];
    // Picture width for this screen: the drawn width times the pixel density, from 960, 1600 and 2400.
    // Phones stop at 1600 (about 3x their drawn width), tablets and desktops go to 2400.
    function pickWidth() {
      const r = pic.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 3);
      const drawn = Math.max(r.width, r.height * 2400 / 1340) * dpr;
      const list = Math.min(innerWidth, innerHeight) < 600 ? WIDTHS.slice(0, 2) : WIDTHS;
      return list.find(w => w >= drawn * 0.92) || list[list.length - 1];
    }
    const url = (id, v, w) => `show/${id}/${v}-${w}.webp?v=${FV}`;
    // The first picture is the one already in the page (its srcset picks the size); it loads lazily until warm()
    const first = shownImg;
    first.ready = new Promise(res => { if (first.complete && first.naturalWidth) res(true); else { first.addEventListener('load', () => res(true), { once: true }); first.addEventListener('error', () => res(false), { once: true }); } });
    function get(id, v) {
      if (id === 'escalade' && v === 'front34' && !first.dataset.dropped) { first.loading = 'eager'; return first; }
      const u = url(id, v, width || (width = pickWidth()));
      let im = pool.get(u);
      if (!im) {
        im = new Image(); im.decoding = 'async'; im.className = 'show__img'; im.width = 2400; im.height = 1340;
        im.ready = new Promise(res => { im.onload = () => res(true); im.onerror = () => res(false); });
        im.src = u; pool.set(u, im);
      }
      return im;
    }
    // Fetch in the background: this car's other views, then every car's front view
    let queue = [], busy = 0;
    function prefetch(list) {
      queue.push(...list);
      const next = () => { while (busy < 2 && queue.length) { const [id, v] = queue.shift(); busy++; get(id, v).ready.then(() => { busy--; next(); }); } };
      next();
    }
    function warm() {
      if (warmed) return; warmed = true;
      set(car, view);
      prefetch(VIEWS.map(v => [car, v]).concat(Object.keys(CARS).map(id => [id, 'front34'])));
    }

    /* Spec callout: a dot on the part, a card on the empty wall or floor beside the car, a line between */
    const co = el('div', 'co'), coLine = el('span', 'co__line'), coDot = el('span', 'co__dot'), coCard = el('span', 'co__card');
    const coV = el('span', 'co__v'), coK = el('span', 'co__k');
    coCard.append(coV, coK); co.append(coLine, coDot, coCard); coWrap.appendChild(co);
    function imgRect() {
      // the picture is cover-fitted into the box, centered
      const bw = pic.clientWidth, bh = pic.clientHeight, s = Math.max(bw / 2400, bh / 1340);
      const w = 2400 * s, h = 1340 * s;
      return { x: (bw - w) / 2, y: (bh - h) / 2, w, h, bw, bh };
    }
    function placeCallout() {
      const spec = CARS[car].views[view], R = imgRect();
      coV.textContent = spec.v; coK.textContent = spec.k;
      const P = (u, v) => [R.x + u * R.w, R.y + v * R.h];
      const [dx, dy] = P(spec.a[0], spec.a[1]);
      const [bx0, by0] = P(spec.box[0], spec.box[1]), [bx1, by1] = P(spec.box[2], spec.box[3]);
      const cw = coCard.offsetWidth, ch = coCard.offsetHeight, small = R.bw < 600, m = small ? 4 : 10, gap = small ? 8 : 18;
      const fits = (x, y) => x >= m && y >= m && x + cw <= R.bw - m && y + ch <= R.bh - m;
      const leftFirst = dx < (bx0 + bx1) / 2;
      const cy = clamp(dy - ch / 2, m, R.bh - m - ch), cx = clamp(dx - cw / 2, m, R.bw - m - cw);
      // the near side first, then above or below the part, and the far side last (its line would cross the car)
      const sides = leftFirst ? [[bx0 - gap - cw, cy], [bx1 + gap, cy]] : [[bx1 + gap, cy], [bx0 - gap - cw, cy]];
      const vert = dy < (by0 + by1) / 2 ? [[cx, by0 - gap - ch], [cx, by1 + gap]] : [[cx, by1 + gap], [cx, by0 - gap - ch]];
      const cands = [sides[0], ...vert, sides[1]];
      const pick = cands.find(c => fits(c[0], c[1]));
      if (!pick) { co.classList.remove('is-on'); return; }
      const [x, y] = pick;
      // the line runs from the dot to the nearest point of the card
      const nx = clamp(dx, x, x + cw), ny = clamp(dy, y, y + ch), lx = nx - dx, ly = ny - dy;
      co.style.transform = `translate(${dx}px, ${dy}px)`;
      coLine.style.width = Math.hypot(lx, ly) + 'px';
      coLine.style.transform = `rotate(${Math.atan2(ly, lx)}rad)`;
      coCard.style.transform = `translate(${x - dx}px, ${y - dy}px)`;
      co.classList.add('is-on');
    }
    function label() {
      const c = CARS[car];
      carName.textContent = SHORT[car]; carPrice.textContent = money(c.rate);
      carSpecs.textContent = 'Specs: ' + VIEWS.map(v => `${c.views[v].v}, ${c.views[v].k}`).join('. ') + '.';
      shownImg.alt = `${c.name} from the ${VIEW_NAME[view]}, in the garage`;
    }
    // Show car id in view v once its picture is decoded; a newer pick cancels this one
    async function set(id, v, onSwap, force) {
      if (!CARS[id] || !VIEWS.includes(v)) return;
      const token = ++seq;
      want.car = id; want.view = v;
      if (!force && id === car && v === view && shownImg.isConnected && shownImg.complete && shownImg.naturalWidth) { if (onSwap) onSwap(); return; }
      const im = get(id, v);
      pic.setAttribute('aria-busy', 'true');
      const ok = await im.ready;
      if (ok && im.decode) await im.decode().catch(() => {});
      if (token !== seq) return; // a newer pick won
      pic.removeAttribute('aria-busy');
      if (!ok) { showSr.textContent = 'That picture did not load. Please try again.'; return; }
      car = id; view = v;
      if (im !== shownImg) { shownImg.replaceWith(im); shownImg = im; }
      label(); placeCallout();
      if (onSwap) onSwap();
      if (warmed) prefetch(VIEWS.filter(x => x !== v).map(x => [id, x]));
    }
    function resize() {
      const w = pickWidth();
      // a bigger screen than the pictures were chosen for: move up a size (never down)
      if (w > width) { width = w; first.dataset.dropped = '1'; set(car, view, null, true); }
      placeCallout();
    }
    return {
      set, warm, resize,
      init() { width = pickWidth(); label(); placeCallout(); },
      get car() { return car; }, get view() { return view; }, want,
    };
  })();

  /* Controls: the car keys and the three views are radio groups (arrow keys move, Tab leaves) */
  const kbtns = $$('.kbtn'), vbtns = $$('.vbtn');
  function check(btns, attr, val, focus) {
    btns.forEach(b => { const on = b.dataset[attr] === val; b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1; if (on && focus) b.focus(); });
  }
  function chooseCar(id, focus) {
    if (!CARS[id]) return;
    check(kbtns, 'car', id, focus);
    show.set(id, show.want.view, () => { showSr.textContent = `${CARS[id].name}, ${money(CARS[id].rate)} a day.`; });
    qCar.value = id; $('#rCar').value = id; quote();
  }
  function chooseView(v, focus) {
    check(vbtns, 'view', v, focus);
    show.set(show.want.car, v, () => { showSr.textContent = `${VIEW_NAME[v][0].toUpperCase()}${VIEW_NAME[v].slice(1)}.`; });
  }
  kbtns.forEach(b => b.addEventListener('click', () => chooseCar(b.dataset.car)));
  vbtns.forEach(b => b.addEventListener('click', () => chooseView(b.dataset.view)));
  function arrows(group, btns, attr, choose) {
    group.addEventListener('keydown', e => {
      const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      if (!d) return;
      e.preventDefault();
      const i = btns.findIndex(b => b.getAttribute('aria-checked') === 'true');
      choose(btns[(i + d + btns.length) % btns.length].dataset[attr], true);
    });
  }
  arrows($('.keyrow'), kbtns, 'car', chooseCar);
  arrows($('.views'), vbtns, 'view', chooseView);
  // Swipe the picture sideways to change the view (vertical swipes still scroll the page)
  let sx = null, sy = 0;
  pic.addEventListener('pointerdown', e => { sx = e.clientX; sy = e.clientY; });
  pic.addEventListener('pointerup', e => {
    if (sx == null) return;
    const dx = e.clientX - sx, dy = e.clientY - sy; sx = null;
    if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    const i = VIEWS.indexOf(show.want.view), n = VIEWS[clamp(i + (dx < 0 ? 1 : -1), 0, VIEWS.length - 1)];
    if (n !== show.want.view) chooseView(n);
  });
  pic.addEventListener('pointercancel', () => { sx = null; });
  let rz = 0;
  addEventListener('resize', () => { cancelAnimationFrame(rz); rz = requestAnimationFrame(() => show.resize()); });
  // The showroom pictures load when the showroom is close, if the film hasn't asked for them already
  new IntersectionObserver(es => { if (es[0].isIntersecting) show.warm(); }, { rootMargin: '100% 0px' }).observe(showSec);

  // The top bar turns solid once the film is behind it
  const solid = () => bar.classList.toggle('is-solid', film.getBoundingClientRect().bottom < 90);
  addEventListener('scroll', solid, { passive: true });
  solid();

  /* =========================================================== Quote */
  const qCar = $('#qCar'), qDays = $('#qDays'), qDaysOut = $('#qDaysOut'), qTotal = $('#qTotal'), qLines = $('#qLines'), qTerms = $('#qTerms');
  const WHERE = { home: ['Home or office delivery and collection', 150], hotel: ['Hotel delivery and collection', 150], fbo: ['Private terminal delivery and collection', 250] };
  // A damage waiver, not insurance. In Texas it is part of the taxable rental price.
  const COVER = { own: ['Your own policy', 0], std: ['Damage waiver, $1,000 max', 39], plus: ['Full damage waiver', 69] };
  // Texas motor vehicle rental tax: 10% of the rent, delivery and any damage waiver
  const TAX = 0.1, MILES_DAY = 100;
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
      row('Texas motor vehicle rental tax (10%)', money(tax)),
    );
    qTerms.replaceChildren(
      row('Security deposit, refundable hold, not in the total', money(c.deposit)),
      row('Miles included', `${(MILES_DAY * days).toLocaleString('en-US')} total`),
      row('Each extra mile', '$' + c.mile.toFixed(2)),
      row('Driver age', '25 or older'),
    );
  }
  $('#qform').addEventListener('input', quote);
  $('#qform').addEventListener('change', quote);
  // Picking a car in the quote puts it in the showroom too
  qCar.addEventListener('change', () => chooseCar(qCar.value));
  $('#qReserve').addEventListener('click', () => { $('#rCar').value = qCar.value; });
  $('#carQuote').addEventListener('click', () => { qCar.value = show.want.car; quote(); });

  /* =========================================================== Reserve: validate, send nothing */
  const rform = $('#rform'), rMsg = $('#rMsg'), rDate = $('#rDate');
  const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  rDate.min = iso(new Date());
  // Each rule is set on its own field, with its own message under it (aria-describedby), so the red
  // outline, the screen reader and the text all agree
  const RULES = {
    name: [v => v.length >= 2, 'your name', 'Add your name, at least 2 letters.'],
    phone: [v => v.replace(/\D/g, '').length >= 7, 'a mobile number', 'Add a mobile number, at least 7 digits.'],
    email: [v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), 'a valid email', 'Add an email like name@example.com.'],
    date: [v => { if (!v) return false; const t = new Date(); t.setHours(0, 0, 0, 0); return new Date(v + 'T00:00') >= t; }, 'a start date from today on', 'Pick a start date from today on.'],
    meet: [v => v.length >= 3, 'where to meet you', 'Tell us where to meet you.'],
  };
  const listOf = a => a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1];
  function validate(field) {
    const r = RULES[field.name]; if (!r) return true;
    const ok = r[0](String(field.value || '').trim());
    field.setCustomValidity(ok ? '' : r[2]);
    field.setAttribute('aria-invalid', String(!ok));
    const err = document.getElementById(`err-${field.name}`);
    if (err) err.textContent = ok ? '' : r[2];
    return ok;
  }
  rform.querySelectorAll('input, select').forEach(f => {
    f.addEventListener('blur', () => { if (f.value) { f.classList.add('is-touched'); validate(f); } });
    f.addEventListener('input', () => { if (f.classList.contains('is-touched')) validate(f); });
  });
  rform.addEventListener('submit', e => {
    e.preventDefault();
    const bad = [];
    rform.querySelectorAll('input, select').forEach(f => { f.classList.add('is-touched'); if (!validate(f)) bad.push(f); });
    rMsg.classList.toggle('is-err', bad.length > 0); rMsg.classList.toggle('is-ok', bad.length === 0);
    if (bad.length) { rMsg.textContent = 'Please check ' + listOf(bad.map(f => RULES[f.name][1])) + '.'; bad[0].focus(); return; }
    const id = rform.elements.car.value, car = CARS[id] ? CARS[id].name : 'your car';
    rMsg.textContent = `Looks good. On a real site, the ${car} would now be held for you and we would text to confirm the handover. This is a concept, so nothing was sent.`;
  });

  quote();
  show.init();
})();
