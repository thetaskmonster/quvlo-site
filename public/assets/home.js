/* Quvlo homepage runtime. Vanilla, no dependencies.
   1. The door: one pinned stage. Scroll position (in viewport heights, "u") drives the camera, the roof lift and the
      night clock. Frames are drawn onto a canvas from WebP sequences: a coarse pass (every 8th frame) loads at idle, the
      rest once the visitor starts into the story, nearest the scroll position first. Nothing redraws unless it changed.
   2. Studio Work: the photo behind the list follows the name you point at (or the one in the middle of a phone screen).
   3. The question and the AI concierge (server side: /api/concierge, see docs/CONCIERGE.md).
   4. The close: the brief card, and the call request form (Formspree) until a booking calendar is set up.
   Reduced motion or no canvas: the page stays a still picture followed by the same story as plain text.
   The pages load boot.js, site.css and this file with ?v=<date+letter>; bump all three together whenever any of them
   changes, so the one-hour cache on /assets/* can never mix an old file with a new one.
   /assets/boot.js runs first, in <head>: it adds "door" to <html> when the story will run, so the layout and the
   story's height are right from the first paint. If the scene can't load, "door" comes off and the still layout returns. */
(() => {
  'use strict';
  const doc = document.documentElement; doc.classList.add('js');
  const $ = (s, r) => (r || document).querySelector(s), $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v)), seg = (t, a, b) => clamp((t - a) / (b - a)), lerp = (a, b, p) => a + (b - a) * p;
  const ease = p => p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2, smooth = p => p * p * (3 - 2 * p), out = p => 1 - Math.pow(1 - p, 3);
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Films ship as H.264 MP4 (Safari, Chrome, Edge) and VP9 WebM (browsers built without H.264, such as Chromium).
  const FILM = (() => { try { return document.createElement('video').canPlayType('video/mp4; codecs="avc1.640028"') ? 'mp4' : 'webm'; } catch { return 'mp4'; } })();

  /* =============================== 1. the door =============================== */
  // Scroll script, in viewport heights from the top of the page. A caption leaves before the clock starts to roll and
  // the next one arrives only after it has landed, so a caption never sits next to a time that isn't its own.
  // Phase B (2026-11-01): three stops instead of four and shorter holds, so the work arrives at 5.8 screens, not 7.6.
  const U = {
    heroOut: [0, .12], pull: [.05, .9], roofIn: [.25, .4], lift: [.9, 1.35], still: [1.35, 1.43], settle: [1.35, 1.65], roofOut: [1.5, 1.62],
    clockIn: [1.62, 1.72], stop0: 1.68, rolls: [2.3, 3.25], rollLen: .3, turn: 4.1, end: 4.8,
  };
  const STOPS = [4, 342, 835];  // minutes after 6:00 pm: 6:04 pm, 11:42 pm, 7:55 am
  // Each stop happens in a room: the booking at the Website, the record in the Client list, the text in Reminder texts.
  // The Automation room lights while the text waits overnight.
  const STOP_ROOM = [0, 1, 3], WAIT_ROOM = 2;
  // when each stop's caption (and its room's glow) is on: in once the clock has landed, out before it rolls on
  const stopIn = i => i ? U.rolls[i - 1] + U.rollLen + .02 : U.stop0, stopOut = i => i < U.rolls.length ? U.rolls[i] - .14 : U.turn;
  const act = $('#door'), cv = $('#model'), rain = $('#rain'), tvHost = $('#tv'), glowHost = $('#glows');
  const say = k => $(`[data-say="${k}"]`, act), stopsEls = $$('[data-stop]', act), roomEls = $$('.room', act), clockEl = $('.clock', act);
  const heroEl = $('.hero-copy', act), bottomShade = $('.bottom-s', act), roofSay = say('roof'), turnSay = say('turn');
  const timeEl = clockEl && $('.time', clockEl), apEl = clockEl && $('.ap', clockEl);
  const jobEl = $('.job', act), jobStates = jobEl ? $$('.job-in', jobEl) : [], jobSent = jobEl ? $('.job-in.sms .job-f', jobEl) : null;
  const jobFiled = jobEl ? $('.job-in[data-k="1"] .job-f', jobEl) : null;
  let M = null, wide = false, vw = 0, vh = 0, dpr = 1, cdpr = 1, rdpr = 1, ctx = null, rctx = null;
  const frames = { pull: [], lift: [] }, stills = {};
  const t0 = performance.now();

  // Style writes only when a value changes (most frames change a few numbers, not all thirty).
  const memo = new WeakMap();
  const css = (el, prop, v) => { let m = memo.get(el); if (!m) memo.set(el, m = {}); if (m[prop] !== v) { m[prop] = v; el.style[prop] = v; } };
  const txt = (el, v) => { let m = memo.get(el); if (!m) memo.set(el, m = {}); if (m.$t !== v) { m.$t = v; el.textContent = v; } };

  // The frame loop runs only when something can change: a scroll, a resize, a picture arriving, or the rain.
  let raf = 0, dirty = true, needBetter = true;
  const kick = () => { if (!raf && M) raf = requestAnimationFrame(frame); };
  // A picture is usable once it is decoded (decode() keeps that work off the scroll).
  function img(src, done) {
    const im = new Image(); im.decoding = 'async'; im.ok = false; im.src = src;
    const fin = ok => { if (ok) { im.ok = true; if (needBetter) { dirty = true; kick(); } } if (done) done(ok); };
    (im.decode ? im.decode() : new Promise((res, rej) => { im.onload = res; im.onerror = rej; }))
      .then(() => fin(true), () => fin(im.complete && im.naturalWidth > 0));
    return im;
  }
  // nearest decoded frame to f (sequences load in the background; never draw a hole)
  function nearestIdx(arr, f) { const n = arr.length; f = clamp(Math.round(f), 0, n - 1); for (let d = 0; d < n; d++) { if (arr[f - d] && arr[f - d].ok) return f - d; if (arr[f + d] && arr[f + d].ok) return f + d; } return -1; }

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
    if (!im || !im.ok || alpha <= 0) return false; const [x, y] = toScreen([rect[0], rect[1]], c);
    ctx.globalAlpha = alpha; ctx.drawImage(im, x * cdpr, y * cdpr, rect[2] * c.s * cdpr, rect[3] * c.s * cdpr); ctx.globalAlpha = 1;
    return true;
  }
  // Wide screens: the picture doesn't always reach the left edge. Fade its left edge into the black instead of a hard seam.
  function featherLeft(c, rect) {
    const x = toScreen([rect[0], rect[1]], c)[0] * cdpr; if (x <= 1) return;
    const w = Math.min(cv.width * .22, rect[2] * c.s * cdpr * .25), g = ctx.createLinearGradient(x - 1, 0, x + w, 0);
    g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(Math.max(0, x - 2), 0, w + 2, cv.height);
  }

  // TV: the real Basalt hero mapped onto the storefront screen with a projective transform
  let tvEl = null, tvFilm = null, tvPlayed = false;
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
    if (!tvEl) return; if (!q) { css(tvEl, 'display', 'none'); return; }
    const sq = q.map(p => toScreen(p, c)); css(tvEl, 'display', 'block');
    css(tvEl, 'transform', quadCSS(M.tv.w, M.tv.h, sq)); css(tvEl, 'filter', `brightness(${bright.toFixed(3)}) blur(.5px)`);
  }

  // Rain on the street and rings on the wet pavement while the storefront holds (screen space, deterministic).
  // Cheap by design: no per-streak gradients and no full-screen bitmaps. Streaks are batched into three brightness
  // buckets, each drawn as one faint tail path and one brighter head path, so a frame is six strokes plus the rings.
  function rnd(i) { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
  let rainClear = false;
  function drawRain(t, a) {
    rctx.setTransform(1, 0, 0, 1, 0, 0); rctx.clearRect(0, 0, rain.width, rain.height);
    if (a <= 0) { rainClear = true; return; } rainClear = false;
    rctx.setTransform(rdpr, 0, 0, rdpr, 0, 0); rctx.lineCap = 'round';
    const n = wide ? 300 : 140, sp = wide ? 1150 : 1050, lw = wide ? 1.4 : 1.05, x0 = wide ? vw * .32 : 0;
    for (let B = 0; B < 3; B++) for (let part = 0; part < 2; part++) {
      rctx.beginPath();
      for (let i = B; i < n; i += 3) {
        const v = sp * (.8 + .45 * rnd(i * 3 + 1)), len = v / 60, span = vh + len + 40, y = ((rnd(i * 3 + 2) * span + v * t) % span) - len - 20, x = x0 + rnd(i * 3) * (vw - x0 + 60) - 30, dx = -.14 * len;
        const f0 = part ? .5 : 0, f1 = part ? 1 : .5; rctx.moveTo(x + dx * f0, y + len * f0); rctx.lineTo(x + dx * f1, y + len * f1);
      }
      const al = (.15 + .1 * B) * a * (part ? 1 : .35);
      rctx.strokeStyle = `rgba(255,236,210,${al.toFixed(3)})`; rctx.lineWidth = lw * (part ? 1 : .8); rctx.stroke();
    }
    const ry0 = vh * (wide ? .78 : .71), ry1 = vh * .99, rx0 = wide ? vw * .4 : 10, rx1 = vw - 10; rctx.lineWidth = 1.1;
    for (let i = 0; i < (wide ? 30 : 20); i++) {
      const P = .9 + .8 * rnd(i * 5 + 900), ph = rnd(i * 5 + 901) * P, cyc = Math.floor((t + ph) / P), tau = ((t + ph) % P) / P, k = i * 97 + cyc * 13;
      const yy = ry0 + (ry1 - ry0) * rnd(k + 2), depth = (yy - ry0) / (ry1 - ry0), r = (2 + (wide ? 22 : 16) * tau) * (.55 + .45 * depth);
      rctx.strokeStyle = `rgba(255,214,160,${(.45 * Math.pow(1 - tau, 1.4) * a).toFixed(3)})`; rctx.beginPath(); rctx.ellipse(rx0 + (rx1 - rx0) * rnd(k + 1), yy, r, r * .26, 0, 0, Math.PI * 2); rctx.stroke();
    }
    rctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  function clockText(m) { const total = (18 * 60 + m) % 1440; let h = Math.floor(total / 60); const mi = total % 60, ap = h >= 12 ? 'pm' : 'am'; h %= 12; if (!h) h = 12; return [`${h}:${String(mi).padStart(2, '0')}`, ap]; }
  const show = (el, q, dy = 12) => { css(el, 'opacity', q.toFixed(3)); css(el, 'transform', `translateY(${((1 - q) * dy).toFixed(1)}px)`); };

  // The job card: one booking traveling through the house. It slides out of the storefront's screen at 6:04 pm, moves
  // to the Client list while the clock runs to 11:42 pm, then passes the Automation room (which holds the text
  // overnight) on its way to Reminder texts at 7:55 am. Its content changes only while it is between rooms.
  let jobW = 270, jobH = 120, capBox = [0, 0, 0, 0], clockBox = [0, 0, 0, 0];
  function jobSpot(x, y) {
    const g = Math.max(16, Math.min(72, vw * .05)), top = Math.max(topH, clockBox[3]) + 12, bot = vh - 12;
    const hit = (L, T, b, m) => L < b[2] + m && L + jobW > b[0] - m && T < b[3] + m && T + jobH > b[1] - m;
    const fits = ([L, T]) => L >= g && L + jobW <= vw - g && T >= top && T + jobH <= bot && !hit(L, T, capBox, 14) && !hit(L, T, clockBox, 12);
    // Next to its own room first, so the card visibly moves room to room: wide screens prefer the dark side to the
    // left of the room, tall screens above it. Only if none of the four fits does it go beside the caption.
    const left = [x - 40 - jobW, y - jobH / 2], right = [x + 40, y - jobH / 2], above = [x - jobW / 2, y - 40 - jobH], below = [x - jobW / 2, y + 40];
    const tries = wide ? [left, right, above, below] : [above, below, left, right];
    for (const c of tries) { const p = [clamp(c[0], g, vw - g - jobW), clamp(c[1], top, Math.max(top, bot - jobH))]; if (fits(p) && Math.hypot(p[0] + jobW / 2 - x, p[1] + jobH / 2 - y) < jobW) return p; }
    return [clamp(capBox[2] + 24, g, vw - g - jobW), clamp(y - jobH / 2, top, Math.max(top, bot - jobH))];
  }
  function placeJob(u, pts) {
    const a0 = stopIn(0), [ra, rb] = U.rolls, len = U.rollLen, P = i => jobSpot(...pts[i]);
    const t1 = smooth(seg(u, ra - .1, ra + len)), t2 = seg(u, rb - .1, rb + len), e2 = smooth(t2);
    // What the card shows always agrees with the clock: a state that names a time is swapped out before the clock
    // leaves that time, and the next state names its time only once the clock has landed on it.
    const k = [1 - seg(u, ra - .08, ra - .02), seg(u, ra - .02, ra + .06) * (1 - seg(u, rb - .08, rb - .02)), seg(u, rb - .02, rb + .06)];
    let pos;
    if (u < ra - .1) pos = P(0);
    else if (u < ra + len) { const A = P(0), B = P(1); pos = [lerp(A[0], B[0], t1), lerp(A[1], B[1], t1)]; }
    else if (u < rb - .1) pos = P(1);
    else {
      // via the Automation room: first half to it, second half on to Reminder texts
      const A = P(1), W = P(WAIT_ROOM), B = P(3), h = e2 < .5 ? smooth(e2 * 2) : smooth(e2 * 2 - 1);
      pos = e2 < .5 ? [lerp(A[0], W[0], h), lerp(A[1], W[1], h)] : [lerp(W[0], B[0], h), lerp(W[1], B[1], h)];
    }
    txt(jobFiled, u >= ra + len ? 'Filed on its own \u00b7 11:42 pm' : 'Filing it under Dana');
    txt(jobSent, u >= rb + len ? 'Sent 7:55 am' : 'Waiting for the morning');
    const inn = out(seg(u, a0, a0 + .18)), vis = inn * (1 - seg(u, U.turn, U.turn + .15));
    // arriving: it grows out of the storefront's screen (the Website room) into its place
    const sc = lerp(.55, 1, inn), [x0, y0] = pts[0], dx = lerp(x0 - jobW / 2 - pos[0], 0, inn), dy = lerp(y0 - jobH / 2 - pos[1], 0, inn);
    css(jobEl, 'opacity', vis.toFixed(3));
    css(jobEl, 'transform', `translate(${(pos[0] + dx).toFixed(1)}px,${(pos[1] + dy).toFixed(1)}px) scale(${sc.toFixed(3)})`);
    jobStates.forEach((el, i) => css(el, 'opacity', k[i].toFixed(3)));
    return [pos[0] + dx, pos[1] + dy, jobW * sc, jobH * sc, vis];
  }

  let uNow = 0, shown = { k: 'none' };
  function render() {
    const u = uNow;
    const pPull = smooth(seg(u, ...U.pull)), pLift = .5 * seg(u, ...U.lift) + .5 * smooth(seg(u, ...U.lift)), toN = ease(seg(u, ...U.settle));
    const after = u >= U.lift[1], am = seg(u, ...U.still);
    const r = U.rolls.map(a => ease(seg(u, a, a + U.rollLen)));
    const r1 = r[0], r2 = r[1];  // 6:04 -> 11:42 pm brings the night still, 11:42 pm -> 7:55 am the dawn
    // camera
    // No settling zoom: the first frame sits exactly where the poster does (site.css), so the handover can't be seen.
    let c;
    if (wide) {
      const H = fitWide(M.wide.hook), Mo = fitWide(M.wide.model);
      c = camBetween(H, Mo, u < U.pull[0] ? 0 : smooth(seg(u, ...U.pull)));
    } else {
      const C = fitPhone(M.phone.cover), N = fitPhone(M.phone.night);
      c = { fx: lerp(C.fx, N.fx, toN), fy: lerp(C.fy, N.fy, toN), s: lerp(C.s, N.s, toN), sx: vw / 2, sy: lerp(C.sy, N.sy, toN) };
    }
    // draw (only when the scroll moved, the size changed, or a better picture has arrived)
    if (dirty) {
      dirty = false; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, cv.width, cv.height);
      const CAM = [0, 0, M.cam.w, M.cam.h], W = M.wideRect; let drew = false, edge = CAM, exact = false;
      if (!after && u < U.lift[0]) {
        if (wide) { drew = drawImg(stills.hook, c, M.wide.hookRect); edge = M.wide.hookRect; shown = { k: 'hook' }; exact = drew; }
        else { const f = Math.round(pPull * (frames.pull.length - 1)), i = nearestIdx(frames.pull, f); drew = drawImg(i >= 0 ? frames.pull[i] : stills.shop, c, CAM); shown = i >= 0 ? { k: 'pull', i } : { k: 'shop' }; exact = i === f; }
      } else if (!after) {
        const f = Math.round(pLift * (frames.lift.length - 1)), i = nearestIdx(frames.lift, f); drew = drawImg(i >= 0 ? frames.lift[i] : stills.hook, c, CAM); shown = i >= 0 ? { k: 'lift', i } : { k: wide ? 'hook' : 'none' }; exact = i === f;
      } else {
        const last = frames.lift.length - 1, li = nearestIdx(frames.lift, last);
        if (am < 1) drew = drawImg(li >= 0 ? frames.lift[li] : null, c, CAM);
        drew = drawImg(stills.roofOff, c, W, am) || drew; drawImg(stills.night, c, W, r1); drawImg(stills.predawn, c, W, r2); edge = W; shown = { k: 'after' };
        exact = (am >= 1 || li === last) && !!(stills.roofOff && stills.roofOff.ok) && (!r1 || stills.night.ok) && (!r2 || stills.predawn.ok);
      }
      if (wide && drew) featherLeft(c, edge);
      if (!drew) shown = { k: 'none' };
      needBetter = !exact;
      // the poster stays up until a real picture is on the canvas (never a black hero while loading)
      if (drew) act.classList.add('drawn');
    }
    // TV on the storefront screen
    // It follows the frame actually on the canvas, not the scroll position, so it stays on the screen while frames load.
    let q = null, tvB = .9;
    const at = (arr, i, n) => qAt(arr, n > 1 ? i / (n - 1) * (arr.length - 1) : 0);
    if (shown.k === 'none') q = null;
    else if (shown.k === 'hook') q = M.tvq.lift[0];  // the desktop hook picture is shot from the first lift frame's camera
    else if (shown.k === 'shop') q = M.tvq.shop;
    else if (shown.k === 'pull') q = u < U.pull[0] && shown.i === 0 ? M.tvq.shop : at(M.tvq.pull, shown.i, frames.pull.length);
    else if (shown.k === 'lift') q = at(M.tvq.lift, shown.i, frames.lift.length);
    else { q = qlerp(M.tvq.lift[M.tvq.lift.length - 1], M.tvq.roofOff, am); tvB = .9 * (1 - .22 * r1 * (1 - r2)) * (1 - .1 * r2); }
    setTV(q, c, tvB);
    css(bottomShade, 'opacity', (seg(u, 1.25, 1.6) * (wide ? .55 : 1)).toFixed(3));
    // words: the headline leaves before the next line arrives
    const ho = ease(seg(u, ...U.heroOut)); css(heroEl, 'opacity', (1 - ho).toFixed(3));
    css(heroEl, 'visibility', ho > .98 ? 'hidden' : 'visible');  // gone means gone: no invisible link to tap or tab to
    css(heroEl, 'transform', `translateY(${wide ? 'calc(-50% + ' + (-ho * 24).toFixed(1) + 'px)' : (-ho * 24).toFixed(1) + 'px'})`);
    show(roofSay, out(seg(u, ...U.roofIn)) * (1 - seg(u, ...U.roofOut)));
    let m = STOPS[0]; U.rolls.forEach((a, i) => { if (u >= a) m = lerp(STOPS[i], STOPS[i + 1], smooth(seg(u, a, a + U.rollLen))); });
    const [hm, ap] = clockText(Math.round(m)); txt(timeEl, hm); txt(apEl, ap);
    css(clockEl, 'opacity', (seg(u, ...U.clockIn) * (1 - seg(u, U.end - .15, U.end))).toFixed(3));
    const allOn = out(seg(u, U.turn, U.turn + .3));
    // the story's last words and labels are gone before the next section reaches the header
    const gone = 1 - seg(u, U.end + .15, U.end + .45);
    const roomLit = [0, 0, 0, 0];
    stopsEls.forEach((el, i) => {
      const a = stopIn(i), b = stopOut(i), on = out(seg(u, a, a + .16)) * (1 - seg(u, b, b + .12));
      show(el, on);
      if (after) roomLit[STOP_ROOM[i]] = Math.max(roomLit[STOP_ROOM[i]], on);
    });
    // the automation holds the text overnight: its room glows while the clock runs from 11:42 pm to 7:55 am
    if (after) roomLit[WAIT_ROOM] = Math.sin(Math.PI * seg(u, U.rolls[1] - .1, U.rolls[1] + U.rollLen + .05));
    const pts = M.rooms.map(r => toScreen(r, c)), jr = jobEl ? placeJob(u, pts) : null;
    roomEls.forEach((lab, i) => {
      const lit = roomLit[i]; let v = Math.max(lit, allOn);
      const [x, y] = pts[i], [ox, oy] = M.labels[i], [lw, lh] = labSize[i] || [0, 0];
      // never under the header (phones held sideways put the top room right under it)
      let ly = Math.max(topH + lh / 2 + 6, y + oy);
      // ... and, while the closing caption shows, never on top of it (small phones put the lowest room right there)
      if (allOn > 0 && x + ox < turnBox[2] && x + ox + lw > turnBox[0]) ly = Math.min(ly, turnBox[1] - lh / 2 - 8);
      // a label under the job card steps back while the card is there (short screens put them on top of each other)
      if (jr && jr[4] > 0 && x + ox < jr[0] + jr[2] && x + ox + lw > jr[0] && ly + lh / 2 > jr[1] && ly - lh / 2 < jr[1] + jr[3]) v *= 1 - jr[4];
      css(lab, 'transform', `translate(${(x + ox).toFixed(1)}px,${ly.toFixed(1)}px) translateY(-50%)`); css(lab, 'opacity', (v * gone).toFixed(3));
      // the glow is a fixed 640 px disc placed and scaled with one transform (no layout)
      const g = glowHost.children[i];
      if (g) { css(g, 'transform', `translate(${(x - 320).toFixed(1)}px,${(y - 320).toFixed(1)}px) scale(${c.s.toFixed(4)})`); css(g, 'opacity', (Math.max(lit, allOn * .6)).toFixed(3)); }
    });
    show(turnSay, out(seg(u, U.turn + .12, U.turn + .32)) * gone);
  }

  // Same rule as the wide layout in site.css: wide screens, and phones held sideways (short and at least 16:10).
  const WIDE_MQ = '(min-width:900px) and (min-aspect-ratio:4/3), (max-height:500px) and (min-aspect-ratio:8/5)';
  let actTop = 0, variant = '', topH = 64, turnBox = [0, 1e9, 0], labSize = [];
  // Frame set: the 1140 px set ("d") on wide screens and on any tall screen wider than 1100 device px (tablets held
  // upright), so an iPad never gets the 760 px phone frames stretched 2.6 times. The camera maths is in cam px either way.
  const pickVariant = () => (wide || vw * dpr > 1100 ? 'd' : 'p');
  // Everything that depends on the text's size (the web fonts change it when they arrive): read once, used every frame.
  function measureText() {
    turnBox = turnSay ? [turnSay.offsetLeft, turnSay.offsetTop, turnSay.offsetLeft + turnSay.offsetWidth] : [0, 1e9, 0];
    labSize = roomEls.map(l => [l.offsetWidth, l.offsetHeight]);
    if (jobEl) { jobW = jobEl.offsetWidth; jobH = jobEl.offsetHeight; }
    capBox = stopsEls.reduce((b, el) => [Math.min(b[0], el.offsetLeft), Math.min(b[1], el.offsetTop), Math.max(b[2], el.offsetLeft + el.offsetWidth), Math.max(b[3], el.offsetTop + el.offsetHeight)], [1e9, 1e9, 0, 0]);
    if (clockEl) clockBox = [clockEl.offsetLeft, clockEl.offsetTop, clockEl.offsetLeft + clockEl.offsetWidth, clockEl.offsetTop + clockEl.offsetHeight];
  }
  function measure() {
    vw = innerWidth; vh = innerHeight; dpr = Math.min(2, devicePixelRatio || 1);
    const top = $('.top'); topH = top ? top.offsetHeight : 64;
    measureText();
    wide = matchMedia(WIDE_MQ).matches;
    // The canvas gets as many pixels as the pictures really have, never more than the screen: at the closest framing
    // of the story a source pixel covers 1/density CSS px, so backing the canvas finer than that adds raster work and
    // no detail (on an iPad held upright that is about 1.2 device px per CSS px, not 2).
    const src = pickVariant() === 'd' ? .75 : .5, density = wide
      ? Math.max(1.5 / (M.wide.hook.s * Math.min(vw / 1440, vh / 900)), src / (M.wide.model.s * Math.min(vw / 1440, vh / 900)))
      : src / (Math.min(M.phone.cover.s, M.phone.night.s) * Math.max(vh / 844, vw / 390));
    cdpr = Math.min(dpr, Math.max(1, density));
    cv.width = Math.round(vw * cdpr); cv.height = Math.round(vh * cdpr); 
    // rain is soft light: its canvas runs at 1 device px per CSS px (a quarter of the pixels to clear on a 2x tablet)
    rdpr = 1; rain.width = Math.round(vw * rdpr); rain.height = Math.round(vh * rdpr);
    act.style.height = ((U.end + 1) * vh) + 'px'; actTop = act.offsetTop; dirty = true;
    if (M && variant !== pickVariant()) loadPictures();
    kick();
  }

  // Loading. Before the visitor does anything, only the coarse pass (every 8th frame, about 30 files) loads, at idle.
  // Once they start into the story, the frames nearest the scroll position load first, then the rest, coarse to fine.
  const LD = { gen: 0, busy: 0, order: [], coarse: 0, pos: 0, full: false };
  const seqUrl = (k, i) => M.seq[k].pattern[variant].replace('{i}', String(i + 1).padStart(3, '0'));
  function want() {
    const u = uNow;
    if (!wide && u < U.lift[0]) return ['pull', smooth(seg(u, ...U.pull))];
    if (u < U.lift[1] + .3) return ['lift', .5 * seg(u, ...U.lift) + .5 * smooth(seg(u, ...U.lift))];
    return null;
  }
  function nextJob() {
    const w = LD.full && want();
    if (w) { const [k, p] = w, n = M.seq[k].n, f = Math.round(p * (n - 1)), arr = frames[k];
      for (let d = 0; d <= 12; d++) for (const i of [f + d, f - d]) if (i >= 0 && i < n && !arr[i]) return [k, i]; }
    const lim = LD.full ? LD.order.length : LD.coarse;
    while (LD.pos < lim) { const [k, i] = LD.order[LD.pos]; if (!frames[k][i]) return LD.order[LD.pos++]; LD.pos++; }
    return null;
  }
  function pump() {
    const gen = LD.gen;
    while (LD.busy < 4) {
      const j = nextJob(); if (!j) return; const [k, i] = j; LD.busy++;
      frames[k][i] = img(seqUrl(k, i), () => { if (gen !== LD.gen) return; LD.busy--; pump(); });
    }
  }
  function lateStills() { if (!stills.roofOff) { const v = variant; ['roofOff', 'night', 'predawn'].forEach(k => { stills[k] = img(M.files[k][v]); }); } }
  function goFull() { if (LD.full || !M) return; LD.full = true; lateStills(); pump(); }
  // Stills first (the picture on screen at each stage), then the footage. Runs again if the screen turns between
  // layouts that use different crops or frame sizes.
  function loadPictures() {
    const v = variant = pickVariant(); LD.gen++; LD.busy = 0; LD.pos = 0; frames.pull = []; frames.lift = []; dirty = true; needBetter = true;
    stills.shop = img(M.files.shop[v]); stills.hook = wide ? img(M.files.hook) : null; stills.roofOff = stills.night = stills.predawn = null;
    const keys = wide ? ['lift'] : ['pull', 'lift'], seen = new Set(), order = [];
    keys.forEach(k => { frames[k].length = M.seq[k].n; });
    [8, 4, 2, 1].forEach((step, lv) => {
      keys.forEach(k => { const n = M.seq[k].n; for (let i = 0; i < n; i += step) add(k, i); if (!lv) add(k, n - 1); });
      if (!lv) LD.coarse = order.length;
    });
    function add(k, i) { const id = k + i; if (!seen.has(id)) { seen.add(id); order.push([k, i]); } }
    LD.order = order;
    if (LD.full) lateStills();
    const gen = LD.gen, go = () => { if (gen === LD.gen) pump(); };
    if ('requestIdleCallback' in window) requestIdleCallback(go, { timeout: 1500 }); else setTimeout(go, 600);
  }

  let lastU = -1, inStory = false;
  function frame(now) {
    raf = 0;
    const y = scrollY - actTop; uNow = Math.max(0, y / vh); inStory = y < (U.end + 1) * vh;
    if (!inStory) { tvPlayed = false; return; }
    if (uNow !== lastU) { if (lastU >= 0 && !LD.full) goFull(); lastU = uNow; dirty = true; if (LD.full) pump(); }
    render();
    // the TV film plays once per arrival at the storefront, and rewinds once the visitor has moved on
    if (tvFilm && tvFilm.src) {
      if (!tvPlayed && uNow < 1.2 && !document.hidden) { tvPlayed = true; try { tvFilm.currentTime = 0; } catch { /* not loaded yet */ } const pr = tvFilm.play(); if (pr) pr.catch(() => { tvPlayed = false; }); }
      else if (uNow > 1.6) tvPlayed = false;
    }
    const ra = 1 - seg(uNow, .05, .6);
    if (ra > 0) { drawRain((now - t0) / 1000, ra); kick(); } else if (!rainClear) drawRain(0, 0);
  }
  function startDoor(man) {
    M = man; ctx = cv.getContext('2d'); rctx = rain.getContext('2d'); if (!ctx || !rctx) { stillLayout(); return; }
    act.classList.add('live'); measure(); landOnHash();  // measure() picks the frame set and starts loading
    // TV element and glows
    tvEl = document.createElement('div'); tvEl.className = 'q'; tvEl.style.width = M.tv.w + 'px'; tvEl.style.height = M.tv.h + 'px';
    // The screen plays the Whitlock & Sons concept site once each time the storefront comes into view: its garage
    // lights come up in about four seconds, then it holds. The first frame is baked into the stills, so no-JS and
    // reduced motion show the same screen.
    const ti = new Image(); ti.alt = ''; ti.src = M.files.tv; tvEl.appendChild(ti); tvHost.appendChild(tvEl);
    if (M.files.tvFilm) {
      tvFilm = document.createElement('video'); tvFilm.muted = true; tvFilm.playsInline = true; tvFilm.preload = 'none'; tvFilm.poster = M.files.tv;
      tvFilm.setAttribute('aria-hidden', 'true'); tvFilm.className = 'tv-film'; tvEl.appendChild(tvFilm);
      const arm = () => { tvFilm.src = M.files.tvFilm.replace('{ext}', FILM) + '?v=b3'; tvFilm.preload = 'auto'; kick(); };
      addEventListener('load', () => ('requestIdleCallback' in window ? requestIdleCallback(arm, { timeout: 2500 }) : setTimeout(arm, 1200)), { once: true });
      if (document.readyState === 'complete') setTimeout(arm, 1200);
    }
    ['', '', 'cool', 'cool'].forEach(k => { const g = document.createElement('i'); if (k) g.className = k; glowHost.appendChild(g); });
    let lastW = innerWidth;
    addEventListener('resize', () => {
      const turned = innerWidth !== lastW; lastW = innerWidth;
      const y = scrollY - actTop, inside = y >= 0 && y < (U.end + 1) * vh, u = y / vh;
      measure();
      if (turned && inside) scrollTo(0, actTop + u * vh);
    });
    addEventListener('scroll', kick, { passive: true });
    // a finger or a wheel on the story starts the full load before the first scroll event arrives
    ['touchstart', 'wheel'].forEach(t => addEventListener(t, () => { if (inStory) goFull(); }, { passive: true }));
    // fonts only change text sizes: re-read those, without resizing (and so clearing) the canvas
    if (document.fonts) document.fonts.ready.then(() => { measureText(); kick(); });
    kick();
  }

  // The scene failed to load: go back to the still picture and the story as text.
  function stillLayout() { doc.classList.remove('door'); act.style.height = ''; landOnHash(); }
  // A link straight to #work, #start or #close: once the story's exact height is set, make sure the page is still on
  // the target (Safari doesn't keep the position when the height above it changes). Skipped once the visitor scrolls.
  let touched = false;
  ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach(t => addEventListener(t, () => { touched = true; }, { once: true, passive: true }));
  function landOnHash() {
    const id = decodeURIComponent(location.hash.slice(1)); if (!id || touched) return;
    const el = document.getElementById(id); if (!el || act.contains(el)) return;
    requestAnimationFrame(() => { if (!touched && Math.abs(el.getBoundingClientRect().top - (parseFloat(getComputedStyle(doc).scrollPaddingTop) || 0)) > 2) el.scrollIntoView({ block: 'start' }); });
  }

  if (act && doc.classList.contains('door')) {
    fetch('/model/scene.json').then(r => r.ok ? r.json() : Promise.reject(r.status)).then(startDoor).catch(stillLayout);
  }

  /* ============================ 2. Studio Work ============================ */
  {
    const links = $$('.index a'), photos = $$('.work .photos img');
    // /work/ ships only the first photo; the others carry data-src (and their phone copy data-srcset) and load when
    // their name comes near the screen or lights up, then the rest quietly after the page has loaded.
    const loadPhoto = img => {
      if (!img || !img.dataset.src) return;
      const pic = img.parentElement;
      if (pic && pic.tagName === 'PICTURE') $$('source[data-srcset]', pic).forEach(src => { src.srcset = src.dataset.srcset; src.removeAttribute('data-srcset'); });
      img.src = img.dataset.src; img.removeAttribute('data-src');
    };
    const photoFor = k => photos.find(p => p.dataset.for === k);
    const light = k => { loadPhoto(photoFor(k)); links.forEach(a => a.classList.toggle('on', a.dataset.piece === k)); photos.forEach(p => p.classList.toggle('on', p.dataset.for === k)); };
    if (photos.some(p => p.dataset.src)) {
      // nothing competes with the first paint: the names near the screen get their photos once the page has loaded
      // (a name that lights up before then loads its own at once), and the rest follow a moment later
      const later = () => {
        if ('IntersectionObserver' in window) {
          const near = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { loadPhoto(photoFor(e.target.dataset.piece)); near.unobserve(e.target); } }), { rootMargin: '50% 0px' });
          links.forEach(a => near.observe(a));
        }
        setTimeout(() => photos.forEach((p, i) => setTimeout(() => loadPhoto(p), 150 * i)), 1500);
      };
      if (document.readyState === 'complete') later(); else addEventListener('load', later, { once: true });
    }
    // a finger landing on a name fires pointerenter too; on touch the scroll position decides instead
    links.forEach(a => { a.addEventListener('pointerenter', e => { if (e.pointerType !== 'touch') light(a.dataset.piece); }); a.addEventListener('focus', () => light(a.dataset.piece)); });
    // something is lit on arrival, so the section never opens on a black screen
    if (links[0]) light(links[0].dataset.piece);
    // phones: the name nearest a focus line lights up as you scroll. The line sits mid-screen, but starts at the
    // first name when the page is at the top and ends at the last name at the bottom, so every name gets its turn
    // (a fixed mid-screen band skipped the first two names, which sit above the middle at scroll 0).
    if (links.length && matchMedia('(hover: none)').matches) {
      let queued = false;
      const pick = () => {
        queued = false;
        const vh = innerHeight, mid = vh / 2, y = scrollY, max = Math.max(0, document.documentElement.scrollHeight - vh);
        const centers = links.map(a => { const r = a.getBoundingClientRect(); return r.top + r.height / 2 + y; });
        const n = centers.length, firstAt0 = centers[0], lastAtMax = centers[n - 1] - max;
        const d1 = Math.max(0, mid - firstAt0), d2 = Math.max(0, lastAtMax - mid);
        let line = mid;
        // near the top: ease the line from the first name (at scroll 0) down to mid-screen
        if (d1 > 0) line = firstAt0 + d1 * Math.min(1, y / d1);
        // near the bottom: ease it on to the last name (at the end of the page)
        if (d2 > 0 && max > 0) { const left = max - y; if (left < d2) line = Math.max(line, mid + d2 * (1 - left / d2)); }
        // a page too short for both ramps: sweep the names evenly across the whole scroll instead
        const at = max > 0 && d1 + d2 >= max ? centers[0] + (centers[n - 1] - centers[0]) * Math.min(1, Math.max(0, y / max)) : y + line;
        let best = 0;
        centers.forEach((c, i) => { if (Math.abs(c - at) < Math.abs(centers[best] - at)) best = i; });
        const k = links[best].dataset.piece;
        if (!links[best].classList.contains('on')) light(k);
      };
      const queue = () => { if (!queued) { queued = true; requestAnimationFrame(pick); } };
      addEventListener('scroll', queue, { passive: true });
      addEventListener('resize', queue);
      // web fonts swap in late and move the names; re-pick when the section's layout changes
      if ('ResizeObserver' in window) new ResizeObserver(queue).observe(links[0].closest('section') || document.body);
      if (document.fonts) document.fonts.ready.then(queue);
      queue();
    }
  }

  /* ===================== thumb bar (phones, after the story and the reel) ===================== */
  // It gets out of the way of reading: hidden while the visitor reads down the page, back as soon as they scroll up
  // (looking for something), and always there at the very end of the page (the footer leaves room for it). A pause
  // doesn't bring it back: pausing is when people read, and it would land on the lines at the bottom. It never shows during the
  // story or over the reel, the questions or the form. Phones only: from 641 px the header has the same links.
  {
    const bar = $('#thumb'), close = $('#close'), start = $('#start'), work = $('#work'), reelSec = $('.reel'), fab = $('#fab');
    if (bar && close) {
      const over = el => { if (!el) return false; const r = el.getBoundingClientRect(); return r.top < innerHeight * .75 && r.bottom > innerHeight * .25; };
      let lastY = scrollY, down = true, queued = false;
      const tick = () => {
        queued = false;
        const y = scrollY, dy = y - lastY; lastY = y;
        if (dy > 2) down = true; else if (dy < -2) down = false;
        const atEnd = y + innerHeight >= document.documentElement.scrollHeight - 40;
        const past = reelSec ? reelSec.getBoundingClientRect().bottom < innerHeight * .75 : work ? work.getBoundingClientRect().top < innerHeight * .8 : y > innerHeight * .9;
        const allowed = past && close.getBoundingClientRect().top > innerHeight * .6 && !over(start) && !over(reelSec);
        const on = atEnd || (allowed && !down);
        bar.classList.toggle('on', on); bar.inert = !on; if (on) bar.removeAttribute('aria-hidden'); else bar.setAttribute('aria-hidden', 'true');
        // The corner pill (641 px and up): shown once past the reel, hidden over the questions and from the call form down.
        if (fab) {
          const fon = past && close.getBoundingClientRect().top > innerHeight * .6 && !over(start);
          fab.classList.toggle('on', fon); fab.tabIndex = fon ? 0 : -1;
          if (fon) fab.removeAttribute('aria-hidden'); else fab.setAttribute('aria-hidden', 'true');
        }
      };
      const onScroll = () => { if (!queued) { queued = true; requestAnimationFrame(tick); } };
      addEventListener('scroll', onScroll, { passive: true }); addEventListener('resize', tick); tick();
    }
  }

  /* ============================ the reel: seven film sites ============================ */
  // Each card's film is one forward stretch of that site's own footage (2 to 4 s). It plays once when at least a
  // third of the card comes into view, then holds its last frame (the payoff: fire lit, house built, garage lit). When
  // the card leaves the screen it rewinds, so it plays again on the way back, like the storefront TV. Nothing loads
  // until a card is in view (preload none, posters first); phones get the 4:5 cut. Reduced motion keeps posters, and
  // shows each film's last frame instead of its first. One button turns the films off or on, remembered here.
  {
    const vids = $$('.reel video'), toggle = $('#reel-toggle');
    if (vids.length && calm) $$('.reel .film').forEach(f => {
      // reduced motion: the poster is the film's resting image
      $$('source, img', f).forEach(el => { const at = el.tagName === 'IMG' ? 'src' : 'srcset'; const v = el.getAttribute(at); if (v) el.setAttribute(at, v.replace(/-(d|m)\.webp/, '-$1-end.webp')); });
    });
    if (vids.length && toggle && 'IntersectionObserver' in window) {
      const small = matchMedia('(max-width:699px)'), seen = new Set();
      let stored = null; try { stored = localStorage.getItem('quvlo-films'); } catch { /* storage blocked: use the default */ }
      let paused = stored ? stored === 'off' : calm;
      const label = () => { toggle.setAttribute('aria-pressed', String(paused)); toggle.textContent = paused ? 'Play the films' : 'Pause the films'; };
      const run = v => {
        if (paused || !seen.has(v)) { if (!v.paused) v.pause(); return; }
        const src = `/model/reel/${v.dataset.film}-${small.matches ? 'm' : 'd'}.${FILM}?v=b5`;
        if (v.dataset.src !== src) { v.classList.remove('on'); v.dataset.src = src; v.src = src; v.dataset.done = ''; }
        if (v.dataset.done) return;  // played this visit: hold the last frame
        const pr = v.play(); if (pr) pr.catch(() => { /* autoplay refused: the poster stays */ });
      };
      vids.forEach(v => {
        v.loop = false;
        v.addEventListener('playing', () => v.classList.add('on'));
        v.addEventListener('ended', () => { v.dataset.done = '1'; });
      });
      const io = new IntersectionObserver(es => es.forEach(e => {
        const v = e.target;
        if (e.isIntersecting && e.intersectionRatio >= .35) seen.add(v);
        else {
          seen.delete(v);
          // gone from the screen: rewind, so it plays again when it comes back
          if (!e.isIntersecting && v.dataset.src) { v.pause(); v.dataset.done = ''; try { v.currentTime = 0; } catch { /* not loaded yet */ } }
        }
        run(v);
      }), { threshold: [0, .35, .7] });
      vids.forEach(v => io.observe(v));
      toggle.hidden = false; label();
      toggle.addEventListener('click', () => { paused = !paused; try { localStorage.setItem('quvlo-films', paused ? 'off' : 'on'); } catch { /* fine */ } label(); vids.forEach(v => { if (!paused) v.dataset.done = ''; run(v); }); });
      if (small.addEventListener) small.addEventListener('change', () => vids.forEach(run));
    }
  }

  /* ============================ process: the lamps light in turn ============================ */
  // A project's progress in the same language as the rooms at night: each step's lamp comes on as the visitor reaches
  // it (one after another across the row on wide screens, each as it scrolls up on phones), and goes off if they go back.
  {
    const steps = $$('.step');
    if (steps.length) {
      let queued = false;
      const tick = () => {
        queued = false; const vh = innerHeight, row = steps[1] && Math.abs(steps[1].getBoundingClientRect().top - steps[0].getBoundingClientRect().top) < 4;
        steps.forEach((s, i) => s.classList.toggle('lit', calm || (row ? steps[0].getBoundingClientRect().top < vh * (.78 - .1 * i) : s.getBoundingClientRect().top < vh * .72)));
      };
      addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(tick); } }, { passive: true });
      addEventListener('resize', tick); tick();
    }
  }

  /* ========================= 4. the call request form ========================= */
  // With JavaScript the form checks itself and says what's wrong next to the button (and on the field, for screen
  // readers) instead of the browser's bubble. Without JavaScript the same rules run as plain HTML validation.
  const reach = $('#reach'), reachMsg = $('#reach-msg');
  if (reach && reachMsg) {
    reach.noValidate = true; reachMsg.tabIndex = -1;
    const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;
    const fields = $$('input:not([type="hidden"]):not([name="_gotcha"])', reach);
    const problem = el => {
      const v = el.value.trim();
      if (el.required && !v) return el.name === 'email' ? 'Please add your email so Kyle can reply.' : 'Please add your name.';
      if (el.type === 'email' && v && !EMAIL.test(v)) return 'That email doesn’t look complete. Try one like name@business.com.';
      return '';
    };
    const tell = (text, err) => { reachMsg.className = err ? 'form-msg err' : 'form-msg'; reachMsg.textContent = text; };
    fields.forEach(el => el.addEventListener('input', () => { if (el.getAttribute('aria-invalid') === 'true' && !problem(el)) { el.removeAttribute('aria-invalid'); el.removeAttribute('aria-describedby'); if (!fields.some(f => f.getAttribute('aria-invalid') === 'true')) tell('', false); } }));
    reach.addEventListener('submit', async e => {
      e.preventDefault();
      let first = null, why = '';
      fields.forEach(el => { const p = problem(el); if (p) { el.setAttribute('aria-invalid', 'true'); el.setAttribute('aria-describedby', 'reach-msg'); if (!first) { first = el; why = p; } } else { el.removeAttribute('aria-invalid'); el.removeAttribute('aria-describedby'); } });
      if (first) { tell(why, true); first.focus(); return; }
      // aria-disabled, not disabled: a disabled button drops keyboard focus to the page
      const btn = $('button', reach); if (btn.getAttribute('aria-disabled') === 'true') return;
      btn.setAttribute('aria-disabled', 'true'); tell('Sending...', false);
      try {
        const res = await fetch(reach.action, { method: 'POST', body: new FormData(reach), headers: { Accept: 'application/json' } });
        if (!res.ok) throw new Error(String(res.status));
        reach.reset(); tell('Got it. Kyle will email you to set a time.', false);
      } catch { tell('That didn’t send. Please try again in a moment, or email hello@quvlo.co.', true); }
      btn.removeAttribute('aria-disabled'); reachMsg.focus();
    });
  }

  /* ============================ 3. the AI concierge ============================ */
  // POST /api/concierge. JSON back = not answered ({ok:false, fallback, reason}). Otherwise Server-Sent Events:
  // session {sessionId, turnsLeft} | delta {text} | replace {text} | brief {making, because, works_when, updated} | done {turnsLeft} | error {fallback}.
  // Replies are plain text and only ever written with textContent. One message in flight at a time.
  // The choices are buttons: a click, Enter or Space starts the chat (arrow keys never do), and none of them is ever
  // disabled. If the concierge is offline or out of budget, the page says so plainly and points to the call form.
  {
    const pick = $('#pick'), chat = $('#chat'), log = $('#log'), compose = $('#compose'), msg = $('#msg'), hint = $('#compose-hint');
    const opts = $$('.opt', pick || document);
    if (pick && chat && log && compose && msg && opts.length) {
      const sendBtn = $('button', compose);
      let sid = null, busy = false, bubble = null, ended = false, finished = false, answered = false, lastText = '', retried = false, choice = null;
      const add = (cls, text) => { const p = document.createElement('p'); p.className = cls; p.textContent = text; log.appendChild(p); log.scrollTop = log.scrollHeight; return p; };
      const settle = () => { if (bubble) { bubble.classList.remove('wait'); if (!bubble.textContent) bubble.remove(); } bubble = null; };
      const lock = on => { busy = on; sendBtn.disabled = on || ended; msg.disabled = on || ended; if (!on && !ended && !chat.hidden) msg.focus({ preventScroll: true }); };
      const say = t => { if (hint) hint.textContent = t; };
      // The same characters the server strips (functions/_lib/limits.js, cleanText), so a message that would arrive
      // empty is caught here instead.
      // eslint-disable-next-line no-control-regex
      const clean = t => t.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/g, '').replace(/[\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/g, '').trim();
      const label = k => { const b = opts.find(o => o.dataset.choice === k); return b ? b.textContent.trim() : ''; };
      function showBrief(b) {
        const dl = $('#brief'); if (!dl) return;
        ['making', 'because', 'works_when'].forEach(k => { $(`[data-k="${k}"]`, dl).textContent = typeof b[k] === 'string' ? b[k] : ''; });
        dl.hidden = false; $('#brief-fix').hidden = false; $('#close-h').textContent = 'Here’s what I heard.';
        $('#reach-brief').value = [`Making: ${b.making || ''}`, `Because: ${b.because || ''}`, `Works when: ${b.works_when || ''}`].join('\n').slice(0, 1500);
      }
      // What to say when the concierge can't answer. Honest about why, and always a way forward.
      const WHY = {
        unavailable: 'The AI concierge is offline right now, so nothing was sent to it.',
        upstream_error: 'The AI concierge lost its connection part way through.',
        busy: 'The AI concierge is busy right now.',
        daily_cap: 'The AI concierge has reached its limit for today.',
        monthly_cap: 'The AI concierge has reached its limit for this month.',
        chat_rate_limit: 'There have been a lot of chats from this connection in the last hour, so the concierge is pausing for a while.',
        message_rate_limit: 'That was a lot of messages in a short time, so the concierge is pausing for a moment.',
        chat_turn_limit: 'This chat has reached its length limit.',
        declined: 'The concierge can’t help with that one.',
        bot_check: 'The concierge couldn’t confirm the chat came from a person.',
      };
      let prefilled = '';
      // The status dot is teal only once the server has said the concierge is really set up (or a reply has
      // arrived). Until then it is grey, and when the concierge can't answer it says so in words.
      const state = $('#chat-state'), pickSay = $('#pick-say');
      const status = (k, reason) => {
        chat.classList.toggle('live', k === 'live'); chat.classList.toggle('off', k === 'off');
        const paused = k === 'off' && reason && !['unavailable', 'upstream_error', 'busy', 'bot_check'].includes(reason);
        if (state) state.textContent = k === 'off' ? (paused ? 'AI concierge (paused)' : 'AI concierge (offline)') : 'AI concierge';
      };
      function fallback(reason) {
        ended = true; settle(); status('off', reason);
        // Once the chat has started, a dropped or refused model call is a lost connection, not "nothing was sent".
        const why = answered && ['', 'unavailable', 'busy', 'upstream_error'].includes(reason) ? WHY.upstream_error : WHY[reason] || WHY.unavailable;
        const p = add('ai off', `${why} You can still request a call below and Kyle will get back to you, or email `);
        const m = document.createElement('a'); m.href = 'mailto:hello@quvlo.co'; m.textContent = 'hello@quvlo.co'; p.append(m, '.');
        const a = document.createElement('a'); a.className = 'act-link'; a.href = '#close'; a.textContent = 'Request a call'; log.appendChild(a);
        // Pre-fill the call form with the latest pick, unless the concierge already wrote a brief there.
        const brief = $('#reach-brief');
        if (choice && (!brief.value || brief.value === prefilled)) brief.value = prefilled = `Interested in: ${label(choice)}`;
        compose.hidden = true; say(''); lock(false);
      }
      function handle(frame) {
        let ev = 'message', data = '';
        for (const line of frame.split('\n')) { if (line.startsWith('event:')) ev = line.slice(6).trim(); else if (line.startsWith('data:')) data += line.slice(5).trim(); }
        let d; try { d = JSON.parse(data || '{}'); } catch { return; }
        if (ev === 'session') { if (typeof d.sessionId === 'string') sid = d.sessionId; status('live'); }
        else if (ev === 'delta' || ev === 'replace') { answered = true; if (!bubble) bubble = add('ai', ''); bubble.classList.remove('wait'); const t = typeof d.text === 'string' ? d.text : ''; bubble.textContent = ev === 'delta' ? bubble.textContent + t : t; log.scrollTop = log.scrollHeight; }
        else if (ev === 'brief') {
          settle(); showBrief(d);
          if (chat.closest('dialog')) {
            add('ai note', 'I’ve written up your brief. It’s on the page next to the call request form.');
            const a = document.createElement('a'); a.className = 'act-link'; a.href = '#close'; a.textContent = 'See your brief'; log.appendChild(a); log.scrollTop = log.scrollHeight;
          } else add('ai note', 'I’ve written up the brief below, next to the call request form.');
        }
        else if (ev === 'done') { finished = true; settle(); if (d.turnsLeft === 0) { ended = true; compose.hidden = true; add('ai off', 'That’s the end of this chat. Your brief is next to the call request form below.'); } }
        else if (ev === 'error') { finished = true; fallback(typeof d.reason === 'string' ? d.reason : ''); }
      }
      // Health check: GET /api/concierge answers {available, humanCheck} with no model call, so it spends no tokens.
      // Asked once, when the question section comes near (never on page load), or on the first pick. Anything but a
      // clear "available" counts as offline: a missing function, a network error, or a server that wants a bot-check
      // token when this page has no Turnstile site key to get one. Only a real answer is remembered, so a dropped
      // check is asked again on the next pick.
      const siteKey = ($('meta[name="quvlo-turnstile"]') || {}).content || '';
      let setUp = null;
      const isSetUp = () => setUp || (setUp = fetch('/api/concierge', { headers: { Accept: 'application/json' } })
        .then(r => (r.ok && (r.headers.get('content-type') || '').startsWith('application/json') ? r.json() : Promise.reject(r.status)))
        .then(j => !!(j && j.available === true && !(j.humanCheck === true && !siteKey)))
        .catch(() => { setUp = null; return false; }));
      const checkNow = () => isSetUp().then(ok => {
        if (ok) { if (!ended) status('live'); return; }
        status('off', 'unavailable');
        if (pickSay) pickSay.textContent = 'Pick one and we’ll start your brief for the call.';
      });
      if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver(es => { if (es.some(x => x.isIntersecting)) { io.disconnect(); checkNow(); } }, { rootMargin: '600px 0px' });
        io.observe($('#start') || pick);
      } else checkNow();
      async function send(body) {
        lock(true); bubble = add('ai wait', '');
        if (!sid && !(await isSetUp())) { fallback('unavailable'); return; }
        try {
          const res = await fetch('/api/concierge', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
          if ((res.headers.get('content-type') || '').startsWith('application/json')) {
            const j = await res.json().catch(() => ({})); settle();
            if (j.reason === 'session_not_found' && lastText && !retried) {
              // The chat timed out on the server: start a fresh one with the same message, once, without losing it.
              retried = true; sid = null; add('ai off', 'That chat had timed out, so I’ve started a fresh one.'); lock(false);
              return await send({ message: lastText });
            }
            if (j.reason === 'message_too_long') { add('ai', 'That one is a little long for the chat. Could you say it in fewer words?'); msg.value = lastText; return; }
            if (j.reason === 'empty') { say('Type an answer first.'); return; }
            fallback(typeof j.reason === 'string' ? j.reason : '');
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
          settle(); retried = false;
        } catch { if (!ended) fallback(''); }
        finally { lock(false); }
      }
      // Bot check (Cloudflare Turnstile), only when a site key is configured. Loaded on first pick, never on page load.
      const humanToken = () => new Promise(resolve => {
        if (!siteKey) { resolve(null); return; }
        const go = () => window.turnstile.render('#human', { sitekey: siteKey, appearance: 'interaction-only', callback: t => resolve(t), 'error-callback': () => resolve(null), 'expired-callback': () => resolve(null) });
        if (window.turnstile) { go(); return; }
        const sc = document.createElement('script'); sc.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'; sc.async = true;
        sc.onload = go; sc.onerror = () => resolve(null); document.head.appendChild(sc);
      });
      opts.forEach(b => b.addEventListener('click', async () => {
        if (busy) return;
        const k = b.dataset.choice; opts.forEach(o => o.setAttribute('aria-pressed', String(o === b)));
        const first = chat.hidden; chat.hidden = false; const ex = $('#example'); if (ex) ex.hidden = true;
        if (sid && !ended) {
          // Already chatting: a different choice is a message in the same chat.
          if (k === choice) return; choice = k; lastText = `Actually, I'm thinking about ${label(k).toLowerCase()}.`; add('me', lastText); send({ sessionId: sid, message: lastText }); return;
        }
        // First pick, or the last chat couldn't continue: start a new one.
        choice = k; ended = false; answered = false; sid = null; retried = false;
        if (!first) { log.textContent = ''; }
        busy = true; const live = await isSetUp(); busy = false;  // no second pick while the check is out
        if (!live) { fallback('unavailable'); if (first && matchMedia('(max-width: 899px)').matches) chat.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start' }); return; }
        compose.hidden = false; status('live');
        busy = true; const token = await humanToken(); busy = false;
        send(token ? { choice: k, turnstile: token } : { choice: k });
        if (first && matchMedia('(max-width: 899px)').matches) chat.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start' });
      }));
      compose.addEventListener('submit', e => {
        e.preventDefault(); if (busy || ended) return;
        const text = clean(msg.value);
        if (!text) { say('Type an answer first.'); msg.focus(); return; }
        say(''); lastText = text; add('me', text); msg.value = ''; msg.style.height = '';
        send(sid ? { sessionId: sid, message: text } : { message: text });
      });
      msg.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); compose.requestSubmit(); } });
      msg.addEventListener('input', () => { say(''); msg.style.height = 'auto'; msg.style.height = Math.min(140, msg.scrollHeight) + 'px'; });
    }
  }

  /* ============================ the pop-up ============================ */
  // "Start your project" (the thumb bar on phones, the corner pill from 641 px, and any link to #start) opens a dialog
  // that holds the page's own questions and chat: .start-in moves in while it is open and back to #start on close, so it
  // is one conversation in two places. Esc, the close button or a tap outside closes it. A link to the call form from
  // inside closes it first, then the page scrolls there. Without JS (or <dialog>) the links simply go to #start.
  {
    const pop = $('#pop'), body = $('.pop-body', pop || document), home = $('#start'), inner = $('.start-in', home || document);
    if (pop && body && home && inner && typeof pop.showModal === 'function') {
      let opener = null;
      const open = from => {
        if (pop.open) return;
        opener = from || document.activeElement;
        body.appendChild(inner); doc.classList.add('pop-open'); pop.showModal(); body.scrollTop = 0;
        const chat = $('#chat'), msg = $('#msg');
        const target = chat && !chat.hidden && msg && !msg.disabled ? msg : $('.opt[aria-pressed="true"]', inner) || $('.opt', inner);
        if (target) target.focus({ preventScroll: true });
      };
      pop.addEventListener('close', () => {
        home.appendChild(inner); doc.classList.remove('pop-open');
        if (opener && opener.isConnected && !opener.inert && !opener.closest('[aria-hidden="true"]')) opener.focus({ preventScroll: true });
        opener = null;
      });
      $('.pop-x', pop).addEventListener('click', () => pop.close());
      // A tap on the dimmed area outside the window (the dialog box itself, not its contents) closes it.
      pop.addEventListener('click', e => { if (e.target === pop) pop.close(); });
      // Links inside that lead to the page (the call form, "See your brief"): close first, then let the link scroll.
      pop.addEventListener('click', e => { const a = e.target.closest('a[href^="#"]'); if (a && a.getAttribute('href') !== '#start') pop.close(); });
      document.addEventListener('click', e => {
        const a = e.target.closest('[data-concierge], a[href="#start"]');
        if (!a || pop.contains(a) || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault(); open(a);
      });
    }
  }

})();
