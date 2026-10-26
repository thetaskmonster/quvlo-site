/* Tollway Car Co. (concept by Quvlo). Scroll position is the delivery: the footage, the
   split-flap status board and the countdown all read from one number. Below it, a packing
   tool that picks the smallest car your bags fit in, and an all-in price. No libraries. */
(() => {
  'use strict';
  // Bump when any film frame changes, so browsers fetch the new frames instead of cached ones.
  const FV = '2026102601';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SVGNS = 'http://www.w3.org/2000/svg';
  const money = n => '$' + Math.round(n).toLocaleString('en-US');

  /* =========================================================== Cars (sample data) */
  const CARS = {
    i5:       { name: 'BMW i5',             rate: 139, seats: 5, carSeats: 2, grid: [4, 3] },
    modely:   { name: 'Tesla Model Y',      rate: 119, seats: 5, carSeats: 2, grid: [6, 3] },
    bronco:   { name: 'Ford Bronco 4-door', rate: 149, seats: 5, carSeats: 2, grid: [4, 5] },
    // Three-row SUVs: third row folded while it isn't needed, up when it is
    tahoe:    { name: 'Chevrolet Tahoe',    rate: 169, seats: 8, seatsFolded: 5, carSeats: 3, grid: [8, 5], gridUp: [7, 2] },
    escalade: { name: 'Cadillac Escalade',  rate: 249, seats: 7, seatsFolded: 4, carSeats: 3, grid: [9, 5], gridUp: [7, 2] },
  };
  const ORDER = ['i5', 'modely', 'bronco', 'tahoe', 'escalade']; // smallest to largest

  /* =========================================================== Split-flap */
  const FLAP_CHARS = ' ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:';
  function makeFlaps(el) {
    const n = +el.dataset.len, cells = [];
    for (let i = 0; i < n; i++) {
      const c = document.createElement('span');
      c.className = 'flap'; c.textContent = ' ';
      el.appendChild(c);
      cells.push({ el: c, ch: ' ', timer: 0 });
    }
    return {
      set(text) {
        const t = text.toUpperCase().padEnd(n, ' ').slice(0, n);
        cells.forEach((cell, i) => {
          const want = t[i];
          if (cell.ch === want && !cell.timer) return;
          cell.ch = want;
          clearTimeout(cell.timer); cell.timer = 0;
          if (reduce) { cell.el.textContent = want; return; }
          // Run a few letters through the flap before it settles, staggered left to right
          let steps = 2 + (i % 3);
          const step = () => {
            cell.el.classList.remove('is-flip'); void cell.el.offsetWidth; cell.el.classList.add('is-flip');
            if (steps-- > 0) {
              cell.el.textContent = FLAP_CHARS[(Math.random() * FLAP_CHARS.length) | 0];
              cell.timer = setTimeout(step, 55);
            } else { cell.el.textContent = want; cell.timer = 0; }
          };
          cell.timer = setTimeout(step, i * 22);
        });
      },
      tick(text) {
        // Digits change every frame of scroll: flip only the cells that changed, no shuffle
        const t = text.padEnd(n, ' ').slice(0, n);
        cells.forEach((cell, i) => {
          if (cell.ch === t[i] || cell.timer) return;
          cell.ch = t[i]; cell.el.textContent = t[i];
          if (!reduce) { cell.el.classList.remove('is-flip'); void cell.el.offsetWidth; cell.el.classList.add('is-flip'); }
        });
      },
    };
  }
  const flapStatus = makeFlaps($('#flapStatus')), flapTime = makeFlaps($('#flapTime'));
  const boardSr = $('#boardSr'), steps = $$('.board__steps li');
  const STATUS = ['LANDED', 'PREPPING', 'ON ROUTE', 'AT THE CURB', 'KEYS IN HAND', 'ENJOY TEXAS'];

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

  // Countdown runs from touchdown to the car stopping at the curb (end of shot 4)
  const COUNT_FROM = 18 * 60, COUNT_END = 4 * PER - 1;
  const mmss = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  let lastShot = -1;
  function ui(f) {
    const shot = Math.min(SHOTS - 1, Math.floor(f / PER)), local = clamp((f - shot * PER) / (PER - 1));
    hero.classList.toggle('is-off', f > 20);
    caps.forEach(cap => {
      const s = +cap.dataset.shot;
      const on = s === SHOTS - 1 ? f >= (SHOTS - 1) * PER + 6 : shot === s && local > 0.06 && local < 0.94;
      cap.classList.toggle('is-on', on);
    });
    const left = Math.round(COUNT_FROM * (1 - clamp(f / COUNT_END)));
    flapTime.tick(mmss(left));
    if (shot !== lastShot) {
      lastShot = shot;
      flapStatus.set(STATUS[shot]);
      steps.forEach(li => { const s = +li.dataset.shot; li.classList.toggle('is-now', s === shot); li.classList.toggle('is-done', s < shot); });
      const mins = Math.ceil(left / 60);
      boardSr.textContent = `Status: ${STATUS[shot].toLowerCase()}.` + (left > 0 ? ` Your car arrives in ${mins} minute${mins === 1 ? '' : 's'}.` : '');
    }
  }

  function filmProgress() { const r = film.getBoundingClientRect(); return clamp(-r.top / (film.offsetHeight - innerHeight)); }
  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    target = filmProgress();
    if (reduce) cur = target;
    else { cur += (target - cur) * (1 - Math.exp(-dt * 8)); if (Math.abs(target - cur) < 0.00005) cur = target; }
    const f = frameFromProgress(cur);
    if (filmVisible && (dirty || Math.abs(f - lastF) > 0.001)) { draw(f); lastF = f; dirty = false; }
    if (Math.abs(cur - lastP) > 0.00003 || lastShot < 0) { ui(f); lastP = cur; }
    bar.classList.toggle('is-solid', film.getBoundingClientRect().bottom < 70);
    requestAnimationFrame(loop);
  }
  new IntersectionObserver(es => { filmVisible = es[0].isIntersecting; if (filmVisible) dirty = true; }).observe(film);
  addEventListener('resize', size);
  size();
  requestAnimationFrame(loop);
  boot();

  /* =========================================================== Will it fit? */
  // Cargo is a grid sized so each car takes the number of suitcases it really does (a checked bag is 2x2). Bags are packed bottom-up,
  // largest first, so the drawing and the verdict always agree.
  const BAGS = { golf: { w: 3, h: 2, cls: 'g', fill: '#0e7f5a', label: 'golf bag' }, checked: { w: 2, h: 2, cls: 'k', fill: '#e7e9ea', label: 'checked bag' }, carry: { w: 2, h: 1, cls: 'c', fill: '#ffc61a', label: 'carry-on' } };
  const want = { people: 2, carry: 2, checked: 2, golf: 0, seat: 0 };
  const svg = $('#fitSvg'), verdict = $('#fitVerdict'), rec = $('#fitRec'), tabs = $$('.fit__tabs button');
  let viewCar = null;

  function config(id) {
    const c = CARS[id];
    if (c.gridUp && want.people > c.seatsFolded) return { grid: c.gridUp, seats: c.seats, third: true };
    return { grid: c.grid, seats: c.seatsFolded || c.seats, third: false };
  }
  function pack(grid) {
    const [W, H] = grid, occ = Array.from({ length: H }, () => new Array(W).fill(false));
    const list = [];
    ['golf', 'checked', 'carry'].forEach(t => { for (let i = 0; i < want[t]; i++) list.push({ t, i }); });
    const fits = (x, y, w, h) => { if (x + w > W || y + h > H) return false; for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) if (occ[yy][xx]) return false; return true; };
    const placed = [], left = [];
    list.forEach(it => {
      const b = BAGS[it.t], orients = b.w === b.h ? [[b.w, b.h]] : [[b.w, b.h], [b.h, b.w]];
      let spot = null;
      for (let y = 0; y < H && !spot; y++) for (let x = 0; x < W && !spot; x++) for (const [w, h] of orients) if (fits(x, y, w, h)) { spot = { x, y, w, h }; break; }
      if (spot) { for (let yy = spot.y; yy < spot.y + spot.h; yy++) for (let xx = spot.x; xx < spot.x + spot.w; xx++) occ[yy][xx] = true; placed.push({ ...it, ...spot }); }
      else left.push(it);
    });
    return { placed, left };
  }
  function check(id) {
    const c = CARS[id], cfg = config(id), p = pack(cfg.grid);
    const seatsOk = want.people <= c.seats && want.seat <= c.carSeats;
    return { id, cfg, ...p, seatsOk, ok: seatsOk && !p.left.length };
  }

  const nodes = new Map();
  function el(tag, attrs) { const n = document.createElementNS(SVGNS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); return n; }
  const frameG = el('g', {}), bagG = el('g', {}), curbG = el('g', {});
  svg.append(frameG, bagG, curbG);

  function render(r) {
    const [W, H] = r.cfg.grid;
    const VW = 400, VH = 300, top = 26, maxW = 300, maxH = 236;
    const cell = Math.min(maxW / W, maxH / H), gw = cell * W, gh = cell * H;
    const ox = 20 + (maxW - gw) / 2, oy = top + (maxH - gh);
    // Cargo opening outline: a liftgate shape with a slanted top corner, drawn in sign white
    frameG.replaceChildren();
    const slope = Math.min(26, cell * 1.2);
    frameG.append(
      el('path', { d: `M${ox - 8} ${oy + gh + 6} L${ox - 8} ${oy + slope} Q${ox - 8} ${oy - 8} ${ox + slope} ${oy - 8} L${ox + gw - slope} ${oy - 8} Q${ox + gw + 8} ${oy - 8} ${ox + gw + 8} ${oy + slope} L${ox + gw + 8} ${oy + gh + 6} Z`, fill: '#1c1f23', stroke: '#ffffff', 'stroke-width': 2, 'stroke-linejoin': 'round' }),
      el('line', { x1: ox - 8, y1: oy + gh + 6, x2: ox + gw + 8, y2: oy + gh + 6, stroke: '#ffc61a', 'stroke-width': 4 })
    );
    for (let i = 1; i < W; i++) frameG.append(el('line', { x1: ox + i * cell, y1: oy, x2: ox + i * cell, y2: oy + gh, stroke: 'rgba(255,255,255,.05)' }));
    for (let i = 1; i < H; i++) frameG.append(el('line', { x1: ox, y1: oy + i * cell, x2: ox + gw, y2: oy + i * cell, stroke: 'rgba(255,255,255,.05)' }));
    const cap = el('text', { x: 20, y: 16, fill: 'rgba(255,255,255,.6)', 'font-family': 'Overpass Mono, monospace', 'font-size': 10, 'letter-spacing': 1.4 });
    cap.textContent = (CARS[r.id].name + (CARS[r.id].gridUp ? (r.cfg.third ? ' · third row up' : ' · third row folded') : '')).toUpperCase();
    frameG.append(cap);

    // Bags: reuse the same node per bag, so they slide into their new spots
    const seen = new Set();
    const pad = Math.max(1.5, cell * 0.06);
    r.placed.forEach(p => {
      const key = p.t + p.i; seen.add(key);
      let n = nodes.get(key);
      const fresh = !n;
      if (fresh) { n = el('rect', { rx: Math.max(2, cell * .12), class: 'bag' }); bagG.append(n); nodes.set(key, n); }
      n.setAttribute('width', p.w * cell - pad * 2); n.setAttribute('height', p.h * cell - pad * 2);
      n.setAttribute('fill', BAGS[p.t].fill);
      n.setAttribute('x', 0); n.setAttribute('y', 0);
      const tx = ox + p.x * cell + pad, ty = oy + gh - (p.y + p.h) * cell + pad;
      if (fresh && !reduce) { n.style.transform = `translate(${tx}px, ${ty - 60}px)`; n.style.opacity = '0'; void n.getBoundingClientRect(); }
      n.style.transform = `translate(${tx}px, ${ty}px)`; n.style.opacity = '1';
    });
    nodes.forEach((n, key) => { if (!seen.has(key)) { n.remove(); nodes.delete(key); } });

    // Whatever doesn't fit waits on the curb to the right, dashed
    curbG.replaceChildren();
    if (r.left.length) {
      let y = VH - 14;
      const s = 9;
      r.left.slice(0, 8).forEach(it => {
        const b = BAGS[it.t], w = b.w * s, h = b.h * s;
        y -= h + 3;
        curbG.append(el('rect', { x: VW - 50, y, width: w, height: h, rx: 2, fill: 'none', stroke: '#ff8a6b', 'stroke-dasharray': '3 2', 'stroke-width': 1.5 }));
      });
      const t = el('text', { x: VW - 4, y: VH - 2, fill: '#ff8a6b', 'font-family': 'Overpass Mono, monospace', 'font-size': 9, 'text-anchor': 'end' });
      t.textContent = 'ON THE CURB';
      curbG.append(t);
    }
  }

  function plural(n, w) { return `${n} ${w}${n === 1 ? '' : 's'}`; }
  function update(jump) {
    const results = ORDER.map(check);
    const best = results.find(r => r.ok);
    if (jump || !viewCar) viewCar = best ? best.id : 'tahoe';
    const r = results.find(x => x.id === viewCar);
    tabs.forEach(b => {
      const id = b.dataset.car, rr = results.find(x => x.id === id);
      b.setAttribute('aria-selected', String(id === viewCar));
      b.tabIndex = id === viewCar ? 0 : -1;
      b.classList.toggle('is-fits', rr.ok);
      b.classList.toggle('is-rec', !!best && id === best.id);
    });
    render(r);
    const bags = want.carry + want.checked + want.golf;
    if (!r.seatsOk) {
      verdict.textContent = want.people > CARS[r.id].seats ? `Seats ${CARS[r.id].seats}. You need ${want.people}.` : `Room for ${CARS[r.id].carSeats} car seats, not ${want.seat}.`;
      verdict.classList.add('is-no');
    } else if (r.left.length) {
      verdict.textContent = `${plural(r.left.length, 'bag')} left on the curb.`;
      verdict.classList.add('is-no');
    } else {
      const free = r.cfg.grid[0] * r.cfg.grid[1] - r.placed.reduce((a, p) => a + p.w * p.h, 0);
      verdict.textContent = bags ? `Everything fits${free >= 4 ? ', with room to spare' : ', snug'}.` : 'Fits. Travelling light.';
      verdict.classList.remove('is-no');
    }
    rec.textContent = best
      ? `Smallest car that fits ${plural(want.people, 'person').replace('persons', 'people')} and ${plural(bags, 'bag')}: ${CARS[best.id].name}, ${money(CARS[best.id].rate)} a day.`
      : 'Nothing in the fleet fits all of that. We can send two cars to the same curb.';
  }

  $$('.stepper').forEach(s => {
    const k = s.dataset.k, min = +s.dataset.min, max = +s.dataset.max, out = $('output', s), [dn, up] = $$('button', s);
    const sync = () => {
      out.textContent = String(want[k]);
      const cap = k === 'seat' ? Math.min(max, want.people - 1) : max;
      dn.disabled = want[k] <= min; up.disabled = want[k] >= cap;
    };
    s.addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b || b.disabled) return;
      want[k] = clamp(want[k] + +b.dataset.d, min, max);
      if (k === 'people') want.seat = Math.min(want.seat, want.people - 1);
      $$('.stepper').forEach(x => x.dispatchEvent(new Event('sync')));
      update(true);
    });
    s.addEventListener('sync', sync);
    sync();
  });
  tabs.forEach((b, i) => {
    b.addEventListener('click', () => { viewCar = b.dataset.car; update(false); });
    b.addEventListener('keydown', e => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const n = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
      n.focus(); n.click();
    });
  });
  update(true);

  /* =========================================================== The price is the price */
  const priceCars = $('#priceCars'), days = $('#days'), daysOut = $('#daysOut');
  const rTotal = $('#rTotal'), rCar = $('#rCar'), rCarL = $('#rCarL'), rTax = $('#rTax'), rVs = $('#rVs');
  let priceCar = 'tahoe';
  ['modely', 'i5', 'bronco', 'tahoe', 'escalade'].forEach(id => {
    const l = document.createElement('label'), i = document.createElement('input'), s = document.createElement('span');
    i.type = 'radio'; i.name = 'pcar'; i.value = id; i.checked = id === priceCar;
    s.textContent = CARS[id].name.replace('Chevrolet ', '').replace('Cadillac ', '').replace('Tesla ', '').replace(' 4-door', '');
    l.append(i, s); priceCars.append(l);
  });
  function price() {
    const d = +days.value, c = CARS[priceCar], base = c.rate * d, tax = base * 0.10;
    daysOut.textContent = `${d} day${d === 1 ? '' : 's'}`;
    rCarL.textContent = `${c.name}, ${d} × ${money(c.rate)}`;
    rCar.textContent = money(base); rTax.textContent = money(tax); rTotal.textContent = money(base + tax);
    rVs.textContent = `At a typical rental counter, a toll service fee of $5 to $15 a day would add ${money(5 * d)} to ${money(15 * d)} on this trip, before the tolls themselves. Here it's $0.`;
  }
  priceCars.addEventListener('change', e => { priceCar = e.target.value; price(); syncRes(); });
  days.addEventListener('input', price);
  price();

  /* =========================================================== Reserve (concept: nothing is sent) */
  const form = $('#resForm'), resCar = $('#resCar'), msg = $('#resMsg');
  ORDER.forEach(id => { const o = document.createElement('option'); o.value = id; o.textContent = `${CARS[id].name}, ${money(CARS[id].rate)} a day`; resCar.append(o); });
  const syncRes = () => { resCar.value = priceCar; };
  syncRes();
  const dateIn = form.elements.date;
  const today = new Date(); today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
  dateIn.min = today.toISOString().slice(0, 10);
  form.addEventListener('submit', e => {
    e.preventDefault();
    const f = form.elements, bad = [];
    const v = n => f[n].value.trim();
    const mark = (n, ok) => { f[n].setAttribute('aria-invalid', String(!ok)); if (!ok) bad.push(n); };
    mark('name', v('name').length >= 2);
    mark('phone', /^[0-9+()\-.\s]{10,20}$/.test(v('phone')) && v('phone').replace(/\D/g, '').length >= 10);
    mark('email', /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v('email')));
    mark('flight', /^[A-Za-z0-9]{2}\s?\d{1,4}[A-Za-z]?$/.test(v('flight')));
    mark('date', !!v('date') && v('date') >= dateIn.min);
    msg.classList.remove('is-ok', 'is-err');
    if (bad.length) {
      const names = { name: 'your name', phone: 'a mobile number', email: 'an email', flight: 'a flight number like TC 1182', date: 'an arrival date from today on' };
      msg.textContent = 'Check ' + bad.map(n => names[n]).join(', ') + '.';
      msg.classList.add('is-err');
      f[bad[0]].focus();
      return;
    }
    msg.textContent = `Looks good. On the real site, your ${CARS[f.car.value].name} would be booked against your flight. This is a concept, so nothing was sent.`;
    msg.classList.add('is-ok');
  });
})();
