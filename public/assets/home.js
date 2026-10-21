/* Quvlo homepage runtime. Vanilla, no dependencies.
   1. The door: one pinned stage. Scroll position (in viewport heights, "u") drives the camera, the roof lift and the
      night clock. Frames are drawn onto a canvas from WebP sequences that load in the background, nearest frame first.
   2. Studio Work: the photo behind the list follows the name you point at (or the one in the middle of a phone screen).
   3. The question and the AI concierge (server side: /api/concierge, see docs/CONCIERGE.md).
   4. The close: the brief card, and the call request form (Formspree) until a booking calendar is set up.
   Reduced motion or no canvas: the page stays a still picture followed by the same story as plain text. */
(() => {
  'use strict';
  const doc = document.documentElement; doc.classList.add('js');
  const $ = (s, r) => (r || document).querySelector(s), $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v)), seg = (t, a, b) => clamp((t - a) / (b - a)), lerp = (a, b, p) => a + (b - a) * p;
  const ease = p => p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2, smooth = p => p * p * (3 - 2 * p), out = p => 1 - Math.pow(1 - p, 3);
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* =============================== 1. the door =============================== */
  // Scroll script, in viewport heights from the top of the page. Captions swap out-then-in: never two on screen.
  const U = {
    heroOut: [0, .12], pull: [.05, 1.15], roofIn: [.3, .48], lift: [1.15, 1.65], still: [1.65, 1.75], settle: [1.75, 2.15], roofOut: [1.92, 2.04],
    clockIn: [2.05, 2.18], stop0: 2.12, rolls: [2.95, 3.8, 4.65], rollLen: .3, turn: 5.5, end: 6.6,
  };
  const STOPS = [4, 342, 557, 835];  // minutes after 6:00 pm: 6:04 pm, 11:42 pm, 3:17 am, 7:55 am
  const act = $('#door'), cv = $('#model'), rain = $('#rain'), tvHost = $('#tv'), glowHost = $('#glows');
  const say = k => $(`[data-say="${k}"]`, act), stopsEls = $$('[data-stop]', act), roomEls = $$('.room', act), clockEl = $('.clock', act);
  let M = null, wide = false, vw = 0, vh = 0, dpr = 1, ctx = null, rctx = null;
  const frames = { pull: [], lift: [] }, stills = {};
  const t0 = performance.now();

  function img(src) { const im = new Image(); im.decoding = 'async'; im.src = src; im.ok = false; im.onload = () => { im.ok = true; lastKey = ''; }; return im; }
  // nearest decoded frame to f (sequences load in the background; never draw a hole)
  function nearest(arr, f) { const n = arr.length; f = clamp(Math.round(f), 0, n - 1); for (let d = 0; d < n; d++) { if (arr[f - d] && arr[f - d].ok) return arr[f - d]; if (arr[f + d] && arr[f + d].ok) return arr[f + d]; } return null; }
  // load a sequence coarse to fine (every 8th, then 4th, 2nd, all) so scrubbing works early
  function loadSeq(list, out) { const order = []; for (const step of [8, 4, 2, 1]) for (let i = 0; i < list.length; i += step) if (!order.includes(i)) order.push(i);
    let k = 0; const next = () => { if (k >= order.length) return; const i = order[k++]; const im = img(list[i]); out[i] = im; im.addEventListener('load', next, { once: true }); im.addEventListener('error', next, { once: true }); };
    for (let c = 0; c < 4; c++) next(); }

  // camera: cam px -> screen px. A framing is {fx, fy, s, sx, sy}: point (fx,fy) lands on (sx,sy), s screen px per cam px.
  const toScreen = ([x, y], c) => [c.sx + (x - c.fx) * c.s, c.sy + (y - c.fy) * c.s];
  function fitPhone(f) { const k = Math.max(vh / 844, vw / 390); return { fx: f.fx, fy: f.fy, s: f.s * k, sx: vw / 2, sy: vh * (f.sy / 844) }; }
  function fitWide(f) { const k = Math.min(vw / 1440, vh / 900); return { fx: f.fx, fy: f.fy, s: f.s * k, sx: vw - (1440 - f.sx) * k, sy: vh / 2 + (f.sy - 450) * k }; }
  // zoom about the move's fixed point, so the pull-back reads as one dolly move
  function camBetween(a, b, p) {
    const ta = [a.sx - a.s * a.fx, a.sy - a.s * a.fy], tb = [b.sx - b.s * b.fx, b.sy - b.s * b.fy];
    if (Math.abs(a.s - b.s) < 1e-6) return { fx: lerp(a.fx, b.fx, p), fy: lerp(a.fy, b.fy, p), s: a.s, sx: lerp(a.sx, b.sx, p), sy: lerp(a.sy, b.sy, p) };
    const P = [(tb[0] - ta[0]) / (a.s - b.s), (tb[1] - ta[1]) / (a.s - b.s)], Q = [a.s * P[0] + ta[0], a.s * P[1] + ta[1]];
    const s = a.s * Math.pow(b.s / a.s, p); return { fx: P[0], fy: P[1], s, sx: Q[0], sy: Q[1] };
  }
  function drawImg(im, c, rect, alpha = 1) { // rect = [x, y, w, h] in cam px
    if (!im || !im.ok || alpha <= 0) return; const [x, y] = toScreen([rect[0], rect[1]], c);
    ctx.globalAlpha = alpha; ctx.drawImage(im, x * dpr, y * dpr, rect[2] * c.s * dpr, rect[3] * c.s * dpr); ctx.globalAlpha = 1;
  }

  // TV: the real Basalt hero mapped onto the storefront screen with a projective transform
  let tvEl = null;
  function quadCSS(w, h, q) {
    const src = [[0, 0], [w, 0], [w, h], [0, h]], A = [], b = [];
    for (let i = 0; i < 4; i++) { const [x, y] = src[i], [X, Y] = q[i]; A.push([x, y, 1, 0, 0, 0, -x * X, -y * X]); b.push(X); A.push([0, 0, 0, x, y, 1, -x * Y, -y * Y]); b.push(Y); }
    for (let c = 0; c < 8; c++) { let p = c; for (let r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
      [A[c], A[p]] = [A[p], A[c]]; [b[c], b[p]] = [b[p], b[c]];
      for (let r = 0; r < 8; r++) if (r !== c) { const f = A[r][c] / A[c][c]; for (let k = c; k < 8; k++) A[r][k] -= f * A[c][k]; b[r] -= f * b[c]; } }
    const m = b.map((v, i) => v / A[i][i]);
    return `matrix3d(${m[0]},${m[3]},0,${m[6]},${m[1]},${m[4]},0,${m[7]},0,0,1,0,${m[2]},${m[5]},0,1)`;
  }
  const qlerp = (a, b, p) => a.map((pt, i) => [lerp(pt[0], b[i][0], p), lerp(pt[1], b[i][1], p)]);
  const qAt = (arr, f) => { f = clamp(f, 0, arr.length - 1); const i = Math.floor(f); return i + 1 < arr.length ? qlerp(arr[i], arr[i + 1], f - i) : arr[i]; };
  function setTV(q, c, bright) {
    if (!tvEl) return; if (!q) { tvEl.style.display = 'none'; return; }
    const sq = q.map(p => toScreen(p, c)); tvEl.style.display = 'block';
    tvEl.style.transform = quadCSS(M.tv.w, M.tv.h, sq); tvEl.style.filter = `brightness(${bright.toFixed(3)}) blur(.5px)`;
  }

  // rain on the street and rings on the wet pavement while the storefront holds (in screen space, deterministic)
  function rnd(i) { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
  function drawRain(t, a) {
    rctx.setTransform(dpr, 0, 0, dpr, 0, 0); rctx.clearRect(0, 0, vw, vh); if (a <= 0) return;
    const n = wide ? 300 : 140, sp = wide ? 1150 : 1050, lw = wide ? 1.4 : 1.05, x0 = wide ? vw * .32 : 0; rctx.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const v = sp * (.8 + .45 * rnd(i * 3 + 1)), len = v / 60, span = vh + len + 40, y = ((rnd(i * 3 + 2) * span + v * t) % span) - len - 20, x = x0 + rnd(i * 3) * (vw - x0 + 60) - 30, dx = -.14 * len, al = (.13 + .24 * rnd(i * 7 + 5)) * a;
      const g = rctx.createLinearGradient(x, y, x + dx, y + len); g.addColorStop(0, 'rgba(255,236,210,0)'); g.addColorStop(1, `rgba(255,236,210,${al.toFixed(3)})`);
      rctx.strokeStyle = g; rctx.lineWidth = lw * (.7 + .6 * rnd(i * 11)); rctx.beginPath(); rctx.moveTo(x, y); rctx.lineTo(x + dx, y + len); rctx.stroke();
    }
    const ry0 = vh * (wide ? .78 : .71), ry1 = vh * .99, rx0 = wide ? vw * .4 : 10, rx1 = vw - 10;
    for (let i = 0; i < (wide ? 30 : 20); i++) {
      const P = .9 + .8 * rnd(i * 5 + 900), ph = rnd(i * 5 + 901) * P, cyc = Math.floor((t + ph) / P), tau = ((t + ph) % P) / P, k = i * 97 + cyc * 13;
      const yy = ry0 + (ry1 - ry0) * rnd(k + 2), depth = (yy - ry0) / (ry1 - ry0), r = (2 + (wide ? 22 : 16) * tau) * (.55 + .45 * depth);
      rctx.strokeStyle = `rgba(255,214,160,${(.45 * Math.pow(1 - tau, 1.4) * a).toFixed(3)})`; rctx.lineWidth = 1.1; rctx.beginPath(); rctx.ellipse(rx0 + (rx1 - rx0) * rnd(k + 1), yy, r, r * .26, 0, 0, Math.PI * 2); rctx.stroke();
    }
    rctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  function clockText(m) { const total = (18 * 60 + m) % 1440; let h = Math.floor(total / 60); const mi = total % 60, ap = h >= 12 ? 'pm' : 'am'; h %= 12; if (!h) h = 12; return [`${h}:${String(mi).padStart(2, '0')}`, ap]; }
  const show = (el, q, dy = 12) => { el.style.opacity = q.toFixed(3); el.style.transform = `translateY(${((1 - q) * dy).toFixed(1)}px)`; };

  let uNow = 0, lastKey = '';
  function render(now) {
    const u = uNow, t = (now - t0) / 1000;
    const pPull = smooth(seg(u, ...U.pull)), pLift = .5 * seg(u, ...U.lift) + .5 * smooth(seg(u, ...U.lift)), toN = ease(seg(u, ...U.settle));
    const after = u >= U.lift[1], am = seg(u, ...U.still);
    const r = U.rolls.map(a => ease(seg(u, a, a + U.rollLen)));
    const r1 = r[0], r2 = r[1], r3 = r[2], dk = .3 * r1 * (1 - r2);
    // camera
    let c, drift = 1 + .045 * Math.pow(1 - clamp(t / 5), 2) * (1 - seg(u, 0, .25));
    if (wide) {
      const H = fitWide(M.wide.hook), Mo = fitWide(M.wide.model);
      c = camBetween(H, Mo, u < U.pull[0] ? 0 : smooth(seg(u, ...U.pull)));
    } else {
      const C = fitPhone(M.phone.cover), N = fitPhone(M.phone.night);
      c = { fx: lerp(C.fx, N.fx, toN), fy: lerp(C.fy, N.fy, toN), s: lerp(C.s, N.s, toN), sx: vw / 2, sy: lerp(C.sy, N.sy, toN) };
    }
    c = { ...c, s: c.s * drift, sx: c.sx, sy: c.sy };
    // draw
    const key = [vw, vh, u.toFixed(4), drift.toFixed(4), loadedCount].join();
    if (key !== lastKey) {
      lastKey = key; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, cv.width, cv.height);
      const CAM = [0, 0, M.cam.w, M.cam.h], W = M.wideRect;
      if (!after && u < U.lift[0]) {
        if (wide) drawImg(stills.hook, c, M.wide.hookRect);
        else { const pf = nearest(frames.pull, pPull * (frames.pull.length - 1)); drawImg(pf || stills.shop, c, CAM); }
      } else if (!after) {
        const lf = nearest(frames.lift, pLift * (frames.lift.length - 1)); drawImg(lf || stills.hook, c, CAM);
      } else {
        if (am < 1) drawImg(nearest(frames.lift, frames.lift.length - 1), c, CAM);
        drawImg(stills.roofOff, c, W, am); drawImg(stills.night, c, W, r2); drawImg(stills.predawn, c, W, r3);
        if (dk > 0) { ctx.globalAlpha = dk; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, cv.width, cv.height); ctx.globalAlpha = 1; }
      }
      act.classList.add('drawn');
    }
    // TV on the storefront screen
    let q = null, tvB = .9;
    if (u < U.lift[0]) q = wide ? null : (u < U.pull[0] ? M.tvq.shop : qAt(M.tvq.pull, pPull * (M.tvq.pull.length - 1)));
    else if (!after) q = qAt(M.tvq.lift, pLift * (M.tvq.lift.length - 1));
    else { q = qlerp(M.tvq.lift[M.tvq.lift.length - 1], M.tvq.roofOff, am); tvB = .9 * (1 - .12 * r1 * (1 - r2)) * (1 - .22 * r2 * (1 - r3)) * (1 - .1 * r3); }
    setTV(q, c, tvB);
    // rain and the shades
    const ra = 1 - seg(u, .05, .6); drawRain(t, ra);
    $('.bottom-s', act).style.opacity = (seg(u, 1.7, 2.1) * (wide ? .55 : 1)).toFixed(3);
    // words: the headline leaves before the next line arrives
    const ho = ease(seg(u, ...U.heroOut)); $('.hero-copy', act).style.opacity = (1 - ho).toFixed(3); $('.hero-copy', act).style.transform = `translateY(${wide ? 'calc(-50% + ' + (-ho * 24).toFixed(1) + 'px)' : (-ho * 24).toFixed(1) + 'px'})`;
    show(say('roof'), out(seg(u, ...U.roofIn)) * (1 - seg(u, ...U.roofOut)));
    let m = STOPS[0]; U.rolls.forEach((a, i) => { if (u >= a) m = lerp(STOPS[i], STOPS[i + 1], smooth(seg(u, a, a + U.rollLen))); });
    const [hm, ap] = clockText(Math.round(m)); $('.time', clockEl).textContent = hm; $('.ap', clockEl).textContent = ap;
    clockEl.style.opacity = (seg(u, ...U.clockIn) * (1 - seg(u, U.end - .15, U.end))).toFixed(3);
    const allOn = out(seg(u, U.turn, U.turn + .3));
    stopsEls.forEach((el, i) => {
      const a = i ? U.rolls[i - 1] + .12 : U.stop0, b = i < 3 ? U.rolls[i] : U.turn;
      show(el, out(seg(u, a, a + .18)) * (1 - seg(u, b, b + .1)));
      const lit = after ? out(seg(u, a, a + .18)) * (1 - seg(u, b, b + .1)) : 0, v = Math.max(lit, allOn);
      const [x, y] = toScreen(M.rooms[i], c), lab = roomEls[i], [ox, oy] = M.labels[i];
      lab.style.transform = `translate(${(x + ox).toFixed(1)}px,${(y + oy).toFixed(1)}px) translateY(-50%)`; lab.style.opacity = v.toFixed(3);
      const g = glowHost.children[i], gs = 640 * c.s; g.style.width = g.style.height = gs + 'px'; g.style.left = (x - gs / 2) + 'px'; g.style.top = (y - gs / 2) + 'px'; g.style.opacity = (Math.max(lit, allOn * .6)).toFixed(3);
    });
    show(say('turn'), out(seg(u, U.turn + .12, U.turn + .32)));
  }

  let actTop = 0;
  function measure() {
    vw = innerWidth; vh = innerHeight; dpr = Math.min(2, devicePixelRatio || 1);
    wide = vw >= 900 && vw / vh >= 4 / 3;
    cv.width = Math.round(vw * dpr); cv.height = Math.round(vh * dpr); rain.width = cv.width; rain.height = cv.height;
    act.style.height = ((U.end + 1) * vh) + 'px'; actTop = act.offsetTop; lastKey = '';
  }
  let loadedCount = 0;
  function startDoor(man) {
    M = man; ctx = cv.getContext('2d'); rctx = rain.getContext('2d'); if (!ctx || !rctx) return;
    act.classList.add('live'); measure();
    const v = wide ? 'd' : 'p', base = '';
    // stills first (the picture on screen at each stage), then the footage, coarse to fine
    stills.shop = img(base + M.files.shop[v]); stills.roofOff = img(base + M.files.roofOff[v]); stills.night = img(base + M.files.night[v]); stills.predawn = img(base + M.files.predawn[v]);
    if (wide) stills.hook = img(base + M.files.hook);
    const seqUrls = (k) => Array.from({ length: M.seq[k].n }, (_, i) => M.seq[k].pattern[v].replace('{i}', String(i + 1).padStart(3, '0')));
    const go = () => { if (!wide) loadSeq(seqUrls('pull'), frames.pull); loadSeq(seqUrls('lift'), frames.lift); };
    if ('requestIdleCallback' in window) requestIdleCallback(go, { timeout: 1500 }); else setTimeout(go, 600);
    const countLoads = () => { loadedCount = [...frames.pull, ...frames.lift].filter(f => f && f.ok).length; };
    setInterval(countLoads, 400);
    // TV element and glows
    tvEl = document.createElement('div'); tvEl.className = 'q'; tvEl.style.width = M.tv.w + 'px'; tvEl.style.height = M.tv.h + 'px';
    const ti = new Image(); ti.alt = ''; ti.src = base + M.files.tv; tvEl.appendChild(ti); tvHost.appendChild(tvEl);
    ['', '', 'cool', 'cool'].forEach(k => { const g = document.createElement('i'); if (k) g.className = k; glowHost.appendChild(g); });
    addEventListener('resize', measure);
    const loop = now => { const y = scrollY - actTop; uNow = Math.max(0, y / vh); if (y < (U.end + 1) * vh) render(now); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }

  if (act && !calm && document.createElement('canvas').getContext) {
    fetch('/model/scene.json').then(r => r.ok ? r.json() : Promise.reject(r.status)).then(startDoor).catch(() => {});
  }

  /* ============================ 2. Studio Work ============================ */
  {
    const links = $$('.index a'), photos = $$('.work .photos img');
    const light = k => { links.forEach(a => a.classList.toggle('on', a.dataset.piece === k)); photos.forEach(p => p.classList.toggle('on', p.dataset.for === k)); };
    links.forEach(a => { a.addEventListener('pointerenter', () => light(a.dataset.piece)); a.addEventListener('focus', () => light(a.dataset.piece)); });
    // phones: the name in the middle of the screen lights up as you scroll past it
    if ('IntersectionObserver' in window && matchMedia('(hover: none)').matches) {
      const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) light(e.target.dataset.piece); }), { rootMargin: '-45% 0px -45% 0px' });
      links.forEach(a => io.observe(a));
    }
  }

  /* ===================== thumb bar (phones, after the hero) ===================== */
  {
    const bar = $('#thumb'), close = $('#close');
    if (bar && close) {
    const tick = () => { const past = scrollY > innerHeight * .9, atClose = close.getBoundingClientRect().top < innerHeight * .6; bar.classList.toggle('on', past && !atClose); };
    addEventListener('scroll', tick, { passive: true }); tick();
    }
  }

  /* ========================= 4. the call request form ========================= */
  const reach = $('#reach'), reachMsg = $('#reach-msg');
  if (reach) reach.addEventListener('submit', async e => {
    e.preventDefault();
    if (!reach.checkValidity()) { reach.reportValidity(); return; }
    const btn = $('button', reach); btn.disabled = true; reachMsg.className = 'form-msg'; reachMsg.textContent = 'Sending...';
    try {
      const res = await fetch(reach.action, { method: 'POST', body: new FormData(reach), headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(String(res.status));
      reach.reset(); reachMsg.textContent = 'Got it. You will get an email to set the time.';
    } catch { reachMsg.className = 'form-msg err'; reachMsg.textContent = 'That did not send. Please try again in a moment.'; }
    btn.disabled = false;
  });

  /* ============================ 3. the AI concierge ============================ */
  // POST /api/concierge. JSON back = not answered ({ok:false, fallback, reason}). Otherwise Server-Sent Events:
  // session {sessionId, turnsLeft} | delta {text} | replace {text} | brief {making, because, works_when, updated} | done {turnsLeft} | error {fallback}.
  // Replies are plain text and only ever written with textContent. One message in flight at a time.
  {
    const pick = $('#pick'), chat = $('#chat'), log = $('#log'), compose = $('#compose'), msg = $('#msg');
    if (pick && chat && log && compose && msg) {
      const sendBtn = $('button', compose);
      let sid = null, busy = false, bubble = null, started = false, ended = false, finished = false;
      const add = (cls, text) => { const p = document.createElement('p'); p.className = cls; p.textContent = text; log.appendChild(p); log.scrollTop = log.scrollHeight; return p; };
      const settle = () => { if (bubble) { bubble.classList.remove('wait'); if (!bubble.textContent) bubble.remove(); } bubble = null; };
      const lock = on => { busy = on; sendBtn.disabled = on || ended; msg.disabled = on || ended; if (!on && !ended && started) msg.focus({ preventScroll: true }); };
      function showBrief(b) {
        const dl = $('#brief'); if (!dl) return;
        ['making', 'because', 'works_when'].forEach(k => { $(`[data-k="${k}"]`, dl).textContent = typeof b[k] === 'string' ? b[k] : ''; });
        dl.hidden = false; $('#brief-fix').hidden = false; $('#close-h').textContent = 'Here’s what I heard.';
        $('#reach-brief').value = [`Making: ${b.making || ''}`, `Because: ${b.because || ''}`, `Works when: ${b.works_when || ''}`].join('\n').slice(0, 1500);
      }
      function fallback() {
        ended = true; settle();
        add('ai', 'The concierge can’t take more questions right now. Leave your name and email below and someone from the team will reach out.');
        compose.hidden = true; lock(false);
      }
      function handle(frame) {
        let ev = 'message', data = '';
        for (const line of frame.split('\n')) { if (line.startsWith('event:')) ev = line.slice(6).trim(); else if (line.startsWith('data:')) data += line.slice(5).trim(); }
        let d; try { d = JSON.parse(data || '{}'); } catch { return; }
        if (ev === 'session') { if (typeof d.sessionId === 'string') sid = d.sessionId; }
        else if (ev === 'delta' || ev === 'replace') { if (!bubble) bubble = add('ai', ''); bubble.classList.remove('wait'); const t = typeof d.text === 'string' ? d.text : ''; bubble.textContent = ev === 'delta' ? bubble.textContent + t : t; log.scrollTop = log.scrollHeight; }
        else if (ev === 'brief') { settle(); showBrief(d); add('ai note', 'I’ve written up the brief below, next to the booking form.'); }
        else if (ev === 'done') { finished = true; settle(); if (d.turnsLeft === 0) { ended = true; compose.hidden = true; } }
        else if (ev === 'error') { finished = true; fallback(); }
      }
      async function send(body) {
        lock(true); bubble = add('ai wait', '');
        try {
          const res = await fetch('/api/concierge', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
          if ((res.headers.get('content-type') || '').startsWith('application/json')) {
            const j = await res.json().catch(() => ({})); settle();
            if (j.reason === 'session_not_found') { sid = null; add('ai', 'That chat timed out. Send your last message again and we’ll pick it back up.'); }
            else if (j.reason === 'message_too_long') add('ai', 'That one is a little long for the chat. Could you say it in fewer words?');
            else fallback();
            return;
          }
          if (!res.ok || !res.body) throw new Error('no stream');
          finished = false;
          const rd = res.body.getReader(), dec = new TextDecoder(); let buf = '';
          for (;;) {
            const { value, done } = await rd.read(); if (done) break;
            buf += dec.decode(value, { stream: true }); let i;
            while ((i = buf.indexOf('\n\n')) >= 0) { handle(buf.slice(0, i)); buf = buf.slice(i + 2); }
          }
          if (!finished) throw new Error('stream ended early');
          settle();
        } catch { fallback(); }
        finally { lock(false); }
      }
      pick.addEventListener('change', e => {
        const r = e.target; if (started || !(r instanceof HTMLInputElement)) return;
        started = true; chat.hidden = false; $$('input', pick).forEach(i => { i.disabled = i !== r; });
        send({ choice: r.value });
        if (matchMedia('(max-width: 899px)').matches) chat.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start' });
      });
      compose.addEventListener('submit', e => {
        e.preventDefault(); const text = msg.value.trim(); if (!text || busy || ended) return;
        add('me', text); msg.value = ''; msg.style.height = '';
        send(sid ? { sessionId: sid, message: text } : { message: text });
      });
      msg.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); compose.requestSubmit(); } });
      msg.addEventListener('input', () => { msg.style.height = 'auto'; msg.style.height = Math.min(140, msg.scrollHeight) + 'px'; });
    }
  }
})();
