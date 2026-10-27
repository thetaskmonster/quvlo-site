/* Quvlo scroll-film engine. One copy lives in each scroll-film site (film-engine.js) so every site stays
   self-contained; the source of truth is tools/scrollfilm/film-engine.js.

   What it guarantees:
   - The scene on screen gets its first frames before anything else, then a coarse pass over every shot
     loads, so any scene has frames within a second or two. The rest fills outward from where the visitor
     is, a few requests at a time. Requests for scenes the visitor has left are cancelled, and nothing
     downloads while the film is out of view, so the rest of the page gets the bandwidth.
   - The picture never jumps to another shot: if the exact frame is not ready, the nearest ready frame of
     the same shot is drawn, otherwise the last picture is held. Captions follow the picture on screen.
   - One frame is drawn at a time, never two blended, so moving subjects never double up.
   - Optional per-shot time maps and scroll weights in frames.json ("tm", "weights") keep on-screen motion
     even (tools/scrollfilm/timemap.py measures them).
   - The frame set follows the screen's shape and size: landscape gets the 16:9 set (the lighter "l" set
     on phones, when the site has one), phones in portrait the portrait set, tablets in portrait the 16:9
     set in a wide band. Rotating swaps sets in place, no reload, and keeps the visitor at the same point.
   - Decoded pictures are kept only near the playhead, and let go when the film leaves the screen.
   - The sticky stage is sized to the large viewport, and visible bottom-anchored overlays are lifted above
     Safari's toolbar while it shows, so nothing jumps or leaves a dark band when the toolbar collapses.
   - With reduced motion, each shot is a still: the picture changes only at shot boundaries, and only the
     stills download.
   - Overlays read the frame actually drawn (view.i, view.shot, view.f), never the raw scroll position, and
     hidden overlays are made inert so they can't be tapped or tabbed to ("overlays" option).
   - In-page links that land inside the film load and decode their frame first, then jump straight there
     (jumpTo). A target inside the sticky stage says where it sits with data-film-at="0.96".
   - If frames.json or the frames can't load, captions and overlays still follow the scroll, so the page
     stays readable and every link and form in the film still works.
   No libraries, no innerHTML, no inline code: safe under a strict CSP (fetch needs connect-src 'self'). */
(() => {
  'use strict';
  if (window.FilmEngine) return;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const interp = (arr, x) => {
    const n = arr.length - 1, k = clamp(x, 0, n), i = Math.min(n - 1, Math.floor(k)), t = k - i;
    return arr[i] + (arr[i + 1] - arr[i]) * t;
  };
  // a closed ImageBitmap reports width 0; drawing one throws, so every draw checks first
  const alive = b => !!(b && (b.width || b.naturalWidth));
  const closeB = b => { try { if (b && b.close) b.close(); } catch { /* already closed */ } };
  const instances = [];

  function create(o) {
    const section = o.section, stage = o.stage || o.canvas.parentElement, canvas = o.canvas;
    const FV = o.FV || '', base = o.base || '';
    const p0 = o.range ? o.range[0] : 0, span = o.range ? o.range[1] : 1;
    const rate = o.rate || 8;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ctx = canvas.getContext('2d', { alpha: false });
    const canBitmap = typeof createImageBitmap === 'function' && typeof fetch === 'function';
    const BAND = o.band || 0.62, BAND_Y = o.bandY == null ? 0.42 : o.bandY;
    // the band's surround matches the section, so a portrait tablet sees the film set into the page
    const BG = o.bg || [section, stage].map(el => getComputedStyle(el).backgroundColor).find(c => c && c !== 'transparent' && !/rgba\([^)]*,\s*0\)/.test(c)) || '#0b0b0b';
    const MAX_FETCH = 6, MAX_DECODE = 3;

    let M = null, PER = 40, SHOTS = 6, N = 0, W = null, TM = null, ready = false, failed = false;
    let store = null, prevStore = null, mode = null;
    let cw = 0, ch = 0, dpr = 1, visible = true, near = true, dirty = true;
    let target = 0, cur = 0, dir = 1, lastCur = 0, lastShot = -1;
    let shown = null;          // { st, i, bmp } on screen now
    let view = null, lastSig = '';
    let hide = 0, liftEls = null, lastHide = -1;
    let jumpT = -1, jumpSeq = 0;   // frame a jump is waiting for
    const stats = { draws: 0, holds: 0, crossShot: 0, blends: 0, sameShotFallback: 0, errors: 0 };

    // A site callback that throws must never stop the film: report it once and carry on.
    const reported = new Set();
    function call(name, ...a) {
      const fn = o[name];
      if (!fn) return undefined;
      try { return fn(...a); } catch (e) {
        stats.errors++;
        if (!reported.has(name)) { reported.add(name); console.error(`FilmEngine ${name}:`, e); }
        return undefined;
      }
    }

    const url = (set, i) => `${base}f/${set}/${String(i + 1).padStart(3, '0')}.webp${FV ? '?v=' + FV : ''}`;
    const shotOf = i => Math.min(SHOTS - 1, Math.floor(i / PER));
    const repFrame = s => s === 0 ? 8 : s === SHOTS - 1 ? s * PER + PER - 6 : s * PER + Math.round(PER / 2);

    /* ---------- Which frame set and fit this screen gets ---------- */
    function pickMode() {
      const w = innerWidth, h = innerHeight, hasM = !!(M && M.m), hasL = !!(M && M.l);
      // Phones in landscape (and short windows) get the lighter 16:9 set, but only where it is close to 1:1
      // on the screen: the width the canvas needs is at most 1.3x the set's width (every iPhone in landscape
      // fits; a short desktop window at 2x does not).
      if (w / h >= 1) {
        const need = hasL ? Math.max(w, h * M.l.w / M.l.h) * Math.min(window.devicePixelRatio || 1, 2) : 1e9;
        return { set: hasL && Math.min(w, h) < 600 && need <= M.l.w * 1.3 ? 'l' : 'd', fit: 'cover' };
      }
      if (!hasM || Math.min(w, h) >= 600) return { set: 'd', fit: 'band' };
      return { set: 'm', fit: 'cover' };
    }

    /* ---------- Frame stores: encoded bytes for everything, decoded pictures only near the playhead ---------- */
    function makeStore(set) {
      const stride = set === 'm' ? ((M.m && M.m.stride) || o.mStride || 1) : 1;
      const st = { set, stride, blobs: new Array(N), tries: new Uint8Array(N), inflight: new Map(), bmp: new Map(), decoding: new Set(),
        thumbs: new Map(), thumbBusy: 0, thumbPending: new Set(), extra: {}, dead: false, frameBytes: 0 };
      (o.extra || []).forEach(x => { st.extra[x.name] = { has: new Set((x.frames || (M && M[x.name]) || []).map(n => n - 1)), blobs: new Map(), bmp: new Map(), inflight: new Map(), decoding: new Set() }; });
      // reduced motion: only the stills ever download, in every set
      if (reduce) { st.tries.fill(2); for (let s = 0; s < SHOTS; s++) st.tries[snap(st, repFrame(s))] = 0; }
      return st;
    }
    // Let go of a set: cancel its downloads and close every decoded picture except the one on screen,
    // which is closed as soon as another picture replaces it.
    function destroy(st) {
      if (!st || st.dead) return;
      st.dead = true;
      const keep = shown && shown.st === st ? shown.bmp : null;
      st.inflight.forEach(ac => ac.abort()); st.inflight.clear();
      st.bmp.forEach(b => { if (b !== keep) closeB(b); }); st.bmp.clear();
      st.thumbs.forEach(b => { if (b !== keep) closeB(b); }); st.thumbs.clear();
      Object.values(st.extra).forEach(x => { x.inflight.forEach(ac => ac.abort()); x.inflight.clear(); x.bmp.forEach(closeB); x.bmp.clear(); x.blobs.clear(); });
      st.blobs = new Array(N);
    }
    // Off screen: keep the encoded bytes and the small stand-ins, close the full-size pictures.
    function releaseBitmaps(st) {
      if (!st || st.dead) return;
      for (const [i, b] of st.bmp) { if (!(shown && shown.bmp === b)) { closeB(b); st.bmp.delete(i); } }
      Object.values(st.extra).forEach(x => { x.bmp.forEach(closeB); x.bmp.clear(); });
    }
    const avail = (st, i) => i % st.stride === 0;
    function snap(st, f) {
      const s = shotOf(Math.max(0, Math.min(N - 1, Math.round(f)))), lo = s * PER, hi = Math.min(N - 1, lo + PER - 1);
      let j = lo + Math.round((f - lo) / st.stride) * st.stride;
      const hiAvail = hi - ((hi - lo) % st.stride);
      return Math.max(lo, Math.min(hiAvail, j));
    }
    // Next frame to fetch: a jump's target, then the scene on screen (every 8th), every 8th of every shot,
    // every 4th, then outward from the playhead.
    function nextFetch(st, t) {
      const want = i => i >= 0 && i < N && avail(st, i) && !st.blobs[i] && !st.inflight.has(i) && st.tries[i] < 2;
      if (jumpT >= 0) for (let k = 0; k <= 3; k++) for (const j of [jumpT + k * st.stride, jumpT - k * st.stride]) if (shotOf(j) === shotOf(jumpT) && want(j)) return j;
      const ts = shotOf(t);
      for (let i = ts * PER; i < ts * PER + PER; i += 8) { const j = i - (i % st.stride); if (want(j)) return j; }
      for (const step of [8, 4]) for (let i = 0; i < N; i += step) { const j = i - (i % st.stride); if (want(j)) return j; }
      let best = -1, bs = 1e9;
      for (let i = 0; i < N; i++) {
        if (!want(i)) continue;
        const d = i - t, score = Math.abs(d) + (shotOf(i) !== ts ? 50 : 0) + (d * dir < 0 ? 3 : 0);
        if (score < bs) { bs = score; best = i; }
      }
      return best;
    }
    // After the loader, frames go out at low priority, so the page's own images and requests come first.
    function fetchBlob(u, ac) { return fetch(u, { signal: ac.signal, priority: ready ? 'low' : 'auto' }).then(r => { if (!r.ok) throw new Error(String(r.status)); return r.blob(); }); }
    function loadImage(u) { return new Promise(res => { const im = new Image(); im.decoding = 'async'; im.onload = () => { (im.decode ? im.decode() : Promise.resolve()).catch(() => {}).then(() => res(im)); }; im.onerror = () => res(null); im.src = u; }); }
    function pump() {
      const st = store;
      if (!st || st.dead) return;
      // Out of view, only the coarse frames every scene needs download (once they are in, nothing does).
      buildGate();
      const offscreen = !near && jumpT < 0;
      if (offscreen && gated) return;
      const t = jumpT >= 0 ? jumpT : snap(st, frameAt(cur));
      // extra layers (cut-outs) go first: they are few and small
      if (!offscreen) for (const name in st.extra) {
        const x = st.extra[name];
        for (const i of x.has) {
          if (st.inflight.size + x.inflight.size >= MAX_FETCH) break;
          if (x.blobs.has(i) || x.inflight.has(i)) continue;
          const ac = new AbortController(); x.inflight.set(i, ac);
          const u = o.extra.find(e => e.name === name).url(st.set, i);
          const done = canBitmap ? fetchBlob(u, ac).then(b => { if (!st.dead) x.blobs.set(i, b); }) : loadImage(u).then(im => { if (im && !st.dead) { x.blobs.set(i, im); x.bmp.set(i, im); } });
          done.catch(() => { if (!ac.signal.aborted && !st.dead) x.blobs.set(i, null); }).finally(() => { if (x.inflight.get(i) === ac) x.inflight.delete(i); dirty = true; pump(); });
        }
      }
      // When nothing within 3 frames of the playhead has loaded, its frame goes first, at most three requests
      // run so it gets most of the bandwidth, and background requests far from it give way (the every-8th
      // frames every scene needs always finish).
      const close = k => { for (let d = -3; d <= 3; d++) { const j = k + d; if (j >= 0 && j < N && shotOf(j) === shotOf(k) && st.blobs[j]) return true; } return false; };
      const urgent = !offscreen && ready && avail(st, t) && !st.blobs[t] && st.tries[t] < 2 && !close(t);
      const cap = urgent ? 3 : MAX_FETCH;
      if (urgent && !st.inflight.has(t)) {
        const far = [...st.inflight.keys()].filter(i => i % 8 && Math.abs(i - t) > 4).sort((x, y) => Math.abs(y - t) - Math.abs(x - t));
        for (const i of far) { if (st.inflight.size < cap) break; const ac = st.inflight.get(i); st.inflight.delete(i); st.tries[i] = Math.max(0, st.tries[i] - 1); ac.abort(); }
      }
      while (st.inflight.size < cap) {
        const i = offscreen ? (gateList.find(j => avail(st, j) && !st.blobs[j] && !st.inflight.has(j) && st.tries[j] < 2) ?? -1)
          : urgent && !st.inflight.has(t) ? t : nextFetch(st, t);
        if (i < 0) break;
        const ac = new AbortController(); st.inflight.set(i, ac); st.tries[i]++;
        const p = canBitmap
          ? fetchBlob(url(st.set, i), ac).then(b => { if (!st.dead) st.blobs[i] = b; })
          : loadImage(url(st.set, i)).then(im => { if (im && !st.dead) { st.blobs[i] = im; st.bmp.set(i, im); } });
        p.catch(() => {}).finally(() => {
          // a cancelled request is not a failed one: it can be asked for again later
          if (st.inflight.get(i) === ac) {
            if (ac.signal.aborted && !st.dead) st.tries[i] = Math.max(0, st.tries[i] - 1);
            st.inflight.delete(i);
          }
          dirty = true; gateCheck(); pump();
        });
      }
    }
    // Cancel downloads for scenes the visitor has left (more than one shot away), so the scene on screen
    // gets the bandwidth.
    // The coarse frames (every 4th) and reduced-motion stills are never cancelled: every scene needs them.
    function cancelStale(st, ts) {
      if (!st || !ready || reduce) return;
      st.inflight.forEach((ac, i) => { if (i % 4 && Math.abs(shotOf(i) - ts) > 1 && i !== jumpT) ac.abort(); });
    }
    // Decode the frames around the playhead; let go of the far ones.
    function budget(st) {
      const bytes = st.frameBytes || (st.set === 'm' ? 1080 * 1920 * 4 : st.set === 'l' ? 1440 * 810 * 4 : 2560 * 1440 * 4);
      return Math.max(8, Math.min(32, Math.floor(230e6 / bytes)));
    }
    // Priority: the exact frame, then the frame across the next cut when the playhead is near it, then
    // the rest of this shot by distance (ahead of the playhead first).
    function wanted(st, t) {
      const s = shotOf(t), lo = s * PER, hi = Math.min(N - 1, lo + PER - 1), list = [];
      for (let i = lo; i <= hi; i++) if (avail(st, i) && st.blobs[i]) list.push(i);
      list.sort((a, b) => (Math.abs(a - t) + ((a - t) * dir < 0 ? 0.5 : 0)) - (Math.abs(b - t) + ((b - t) * dir < 0 ? 0.5 : 0)));
      const K = budget(st), out = list.slice(0, K - 2);
      const nx = (s + 1) * PER, pv = s * PER - 1;
      const across = [];
      if (nx < N) { const j = snap(st, nx); if (st.blobs[j]) across.push([j, dir > 0 ? hi - t : 99]); }
      if (pv >= 0) { const j = snap(st, pv); if (st.blobs[j]) across.push([j, dir < 0 ? t - lo : 99]); }
      across.sort((a, b) => a[1] - b[1]).forEach(([j, d]) => { if (d < 14) out.splice(Math.min(1, out.length), 0, j); else out.push(j); });
      return out;
    }
    function manageDecode(st, t) {
      if (!canBitmap || !st || st.dead) return;
      const want = wanted(st, t), ws = new Set(want);
      for (const i of want) {
        if (st.decoding.size >= MAX_DECODE) break;
        if (st.bmp.has(i) || st.decoding.has(i)) continue;
        st.decoding.add(i);
        createImageBitmap(st.blobs[i]).then(b => {
          if (st.dead || st.bmp.has(i)) { closeB(b); return; }
          st.frameBytes = b.width * b.height * 4;
          st.bmp.set(i, b); dirty = true;
        }).catch(() => {}).finally(() => st.decoding.delete(i));
      }
      const K = budget(st);
      if (st.bmp.size > K) {
        for (const [i, b] of st.bmp) {
          if (ws.has(i) || (shown && shown.bmp === b)) continue;
          closeB(b); st.bmp.delete(i);
          if (st.bmp.size <= K) break;
        }
      }
      for (const name in st.extra) {
        const x = st.extra[name];
        for (const i of x.has) {
          const isNear = Math.abs(i - t) <= PER / 2;
          if (isNear && x.blobs.get(i) && !x.bmp.has(i) && !x.decoding.has(i) && x.decoding.size < 1) {
            x.decoding.add(i);
            createImageBitmap(x.blobs.get(i)).then(b => { if (st.dead || x.bmp.has(i)) { closeB(b); return; } x.bmp.set(i, b); dirty = true; }).catch(() => {}).finally(() => x.decoding.delete(i));
          } else if (!isNear && x.bmp.has(i)) { closeB(x.bmp.get(i)); x.bmp.delete(i); }
        }
      }
    }
    // Small stand-ins for every 8th frame of every shot, kept for the whole visit (about 15 MB), so a fast
    // scroll always shows the right scene, briefly soft, while the sharp frame decodes. They are built
    // whether or not the film is on screen: the loader's gate needs them.
    function manageThumbs(st) {
      if (!canBitmap || !st || st.dead || reduce) return;
      for (let i = 0; i < N && st.thumbBusy < 2; i += 8) {
        const j = i - (i % st.stride);
        if (st.thumbs.has(j) || st.thumbPending.has(j) || !st.blobs[j]) continue;
        st.thumbBusy++; st.thumbPending.add(j);
        createImageBitmap(st.blobs[j], { resizeWidth: st.set === 'm' ? 360 : 640, resizeQuality: 'medium' })
          .then(b => { if (st.dead) { closeB(b); return; } st.thumbs.set(j, b); dirty = true; })
          .catch(() => { if (!st.dead) st.thumbs.set(j, null); }).finally(() => { st.thumbBusy--; st.thumbPending.delete(j); gateCheck(); });
      }
    }
    // The picture to draw for target t: the exact frame, else the nearest sharp frame of the same shot,
    // else the nearest stand-in of the same shot. Never anything from another shot.
    function drawable(st, t) {
      if (!st || st.dead) return null;
      if (alive(st.bmp.get(t))) return { i: t, bmp: st.bmp.get(t) };
      const s = shotOf(t), lo = s * PER, hi = lo + PER - 1;
      let best = -1, bd = 1e9;
      for (const [i, b] of st.bmp) {
        if (i < lo || i > hi || !alive(b)) continue;
        const d = Math.abs(i - t) + ((i - t) * dir < 0 ? 0.25 : 0);
        if (d < bd) { bd = d; best = i; }
      }
      // a sharp frame more than 4 frames away loses to a stand-in that is closer
      let tb = -1, td = 1e9;
      for (const [i, b] of st.thumbs) {
        if (!alive(b) || i < lo || i > hi) continue;
        const d = Math.abs(i - t);
        if (d < td) { td = d; tb = i; }
      }
      if (best >= 0 && (bd <= 4 || tb < 0 || bd <= td)) return { i: best, bmp: st.bmp.get(best) };
      if (tb >= 0) return { i: tb, bmp: st.thumbs.get(tb), thumb: true };
      return best >= 0 ? { i: best, bmp: st.bmp.get(best) } : null;
    }

    /* ---------- Gate: the loader waits for the coarse pass of every shot ---------- */
    let gateList = null, gateSet = null, gated = false;
    function buildGate() {
      if (gateList || !store || !N) return;
      gateList = [];
      if (reduce) for (let s = 0; s < SHOTS; s++) gateList.push(snap(store, repFrame(s)));
      else for (let i = 0; i < N; i += 8) gateList.push(i - (i % store.stride));
      gateSet = new Set(gateList);
    }
    // The loader opens once the gate is through, or straight away when the film is not on screen (a reload
    // or a link below it): nobody waits on frames they can't see.
    function release() {
      if (ready) return;
      ready = true; dirty = true;
      call('onReady', failed ? new Error('frames.json') : undefined);
    }
    function gateCheck() {
      if (gated || !store) return;
      buildGate();
      // ready once every gate frame is in and its stand-in is decoded, so no scene is ever missing
      const done = gateList.filter(i => store.blobs[i] || store.tries[i] >= 2).length;
      const thumbs = canBitmap && !reduce ? gateList.filter(i => store.thumbs.has(i) || store.tries[i] >= 2).length : gateList.length;
      if (!ready) call('onGate', (done + thumbs) / (2 * gateList.length));
      if (done >= gateList.length && thumbs >= gateList.length) { gated = true; release(); }
    }

    /* ---------- Progress, time maps and shot weights ---------- */
    const stageH = () => stage.offsetHeight || innerHeight;
    const filmTop = () => section.getBoundingClientRect().top + scrollY;
    const filmLen = () => Math.max(1, section.offsetHeight - stageH());
    function progress() {
      const r = section.getBoundingClientRect();
      return clamp(-r.top / filmLen());
    }
    function frameAt(p) {
      if (!N) return 0;
      const pos = clamp((p - p0) / span);
      let acc = 0, s = SHOTS - 1, t = 1;
      const sum = W.reduce((a, b) => a + b, 0);
      for (let k = 0; k < SHOTS; k++) {
        const w = W[k] / sum;
        if (pos <= acc + w || k === SHOTS - 1) { s = k; t = clamp((pos - acc) / w); break; }
        acc += w;
      }
      const local = TM && TM[s] ? interp(TM[s], t * (TM[s].length - 1)) : t * (PER - 1);
      return Math.min(N - 1, s * PER + local);
    }
    // Scroll without animation, whatever the page's scroll-behavior says.
    function scrollInstant(y) {
      const html = document.documentElement, sb = html.style.scrollBehavior;
      html.style.scrollBehavior = 'auto';
      scrollTo(scrollX, y);
      html.style.scrollBehavior = sb;
    }

    /* ---------- Drawing ---------- */
    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const r = canvas.getBoundingClientRect();
      const w = Math.round(r.width * dpr), h = Math.round(r.height * dpr);
      if (w && h && (w !== cw || h !== ch)) { cw = w; ch = h; canvas.width = w; canvas.height = h; dirty = true; }
      liftEls = null; lastHide = -1;
      if (M && store) {
        const m = pickMode();
        if (!mode || m.set !== mode.set || m.fit !== mode.fit) {
          if (m.set !== mode.set) {
            // Swap in place. The set on screen stays until the new one has drawn this shot; a set that
            // already matches the new shape (turning straight back) is reused instead of fetched again.
            const onScreen = shown && !shown.st.dead ? shown.st : null;
            const next = [store, prevStore].find(s => s && !s.dead && s.set === m.set) || null;
            [store, prevStore].forEach(s => { if (s && s !== next && s !== onScreen) destroy(s); });
            prevStore = onScreen && onScreen !== next ? onScreen : null;
            store = next || makeStore(m.set);
            pump();
          }
          mode = m; dirty = true;
        }
      }
    }
    function fitRect(st, i, im) {
      const iw = im.width || im.naturalWidth, ih = im.height || im.naturalHeight;
      const fit = st.set !== 'm' && mode && mode.fit === 'band' ? 'band' : 'cover';
      if (fit === 'cover') {
        const s = Math.max(cw / iw, ch / ih);
        return { x: (cw - iw * s) / 2, y: (ch - ih * s) / 2, w: iw * s, h: ih * s, fit };
      }
      const s = Math.max(cw / iw, (ch * BAND) / ih);
      const u0 = M.m && M.m.crop ? M.m.crop[i] + (M.m.cropW || 0.31) / 2 : 0.5;
      let x = cw / 2 - u0 * iw * s;
      x = Math.min(0, Math.max(cw - iw * s, x));
      const y = (ch - ih * s) * BAND_Y;
      return { x, y, w: iw * s, h: ih * s, fit };
    }
    function paint(st, i, im) {
      const R = fitRect(st, i, im);
      if (R.fit === 'band') {
        ctx.fillStyle = BG; ctx.fillRect(0, 0, cw, ch);
        ctx.drawImage(im, R.x, R.y, R.w, R.h);
        const fade = Math.round(R.h * 0.07);
        const g1 = ctx.createLinearGradient(0, R.y, 0, R.y + fade);
        g1.addColorStop(0, BG); g1.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g1; ctx.fillRect(0, R.y - 1, cw, fade + 1);
        const g2 = ctx.createLinearGradient(0, R.y + R.h - fade, 0, R.y + R.h);
        g2.addColorStop(0, 'rgba(0,0,0,0)'); g2.addColorStop(1, BG);
        ctx.fillStyle = g2; ctx.fillRect(0, R.y + R.h - fade, cw, fade + 1);
      } else {
        ctx.drawImage(im, R.x, R.y, R.w, R.h);
      }
      return R;
    }
    function makeView(st, i, R, fFloat, p) {
      const set = st.set, crop = set === 'm' && M.m && M.m.crop ? M.m.crop[i] : 0, cropW = set === 'm' && M.m ? (M.m.cropW || 1) : 1;
      const toCanvas = (u, v) => [R.x + ((u - crop) / cropW) * R.w, R.y + v * R.h];
      const shot = shotOf(i);
      fFloat = clamp(fFloat, shot * PER, shot * PER + PER - 1);
      return {
        f: fFloat, i, shot, local: clamp((fFloat - shot * PER) / (PER - 1)), p, set, fit: R.fit, dpr, cw, ch, PER, SHOTS, N,
        rect: R, toCanvas, toScreen: (u, v) => { const c = toCanvas(u, v); return [c[0] / dpr, c[1] / dpr]; },
        // the whole source frame, in CSS pixels relative to the canvas
        srcRect: () => { const x0 = R.x - (crop / cropW) * R.w, w = R.w / cropW; return { x: x0 / dpr, y: R.y / dpr, w: w / dpr, h: R.h / dpr }; },
        extra: name => { const x = st.extra[name], b = x && x.bmp.get(i); return alive(b) ? b : null; },
        meta: M, drawn: !!R.drawn,
      };
    }

    /* ---------- Lift visible bottom-anchored overlays above Safari's toolbar ---------- */
    // Overlays to lift: the site names them (captions, gauges, trackers), default every .cap in the stage.
    // Only the ones in the lower half of the stage are lifted, and only while they show: a hidden one is
    // parked off the picture and must not rise into the toolbar strip.
    function findLift() {
      const out = [], sr = stage.getBoundingClientRect();
      stage.querySelectorAll(o.lift || '.cap').forEach(el => {
        if (out.some(p => p.contains(el))) return;
        const r = el.getBoundingClientRect();
        if (r.height && r.top + r.height / 2 > sr.top + sr.height / 2) out.push(el);
      });
      return out;
    }
    function updateLift() {
      const r = stage.getBoundingClientRect(), vv = window.visualViewport;
      const visBottom = vv ? vv.offsetTop + vv.height : innerHeight;
      const h = r.top <= 1 ? Math.round(clamp(r.bottom - visBottom, 0, r.height * 0.25)) : 0;
      if (h === lastHide) return;
      lastHide = h; hide = h;
      if (!liftEls) { stage.querySelectorAll(o.lift || '.cap').forEach(el => { el.style.translate = ''; }); liftEls = findLift(); }
      liftEls.forEach(el => {
        const off = el.inert ? el : el.closest('[inert]');
        el.style.translate = h && (!off || fading.has(off)) ? `0 ${-h}px` : '';
      });
      stage.style.setProperty('--film-hide', h + 'px');
    }

    /* ---------- Main loop ---------- */
    let last = performance.now();
    function frame(now) {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (M && N && store) {
        const tgt = progress();
        // a jump of more than a shot's worth (scrollbar drag, Home/End) goes straight there instead of
        // sweeping every scene in between
        if (reduce || Math.abs(tgt - cur) > 0.2) cur = tgt;
        else { cur += (tgt - cur) * (1 - Math.exp(-dt * rate)); if (Math.abs(tgt - cur) < 0.00004) cur = tgt; }
        if (cur !== lastCur) { dir = cur > lastCur ? 1 : -1; lastCur = cur; }
        target = tgt;
        const fFloat = reduce ? repFrame(shotOf(frameAt(cur))) : frameAt(cur);
        const st = store, t = snap(st, fFloat), ts = shotOf(t);
        if (ts !== lastShot) { cancelStale(st, ts); lastShot = ts; pump(); }
        manageThumbs(st);
        if (visible) {
          manageDecode(st, jumpT >= 0 ? jumpT : t);
          if (prevStore) manageDecode(prevStore, snap(prevStore, fFloat));
          // draw as soon as the scene on screen has any frame, loader or not
          let use = st, pick = drawable(st, t);
          if (!pick && prevStore) { const q = drawable(prevStore, snap(prevStore, fFloat)); if (q) { use = prevStore; pick = q; } }
          if (pick) {
            const i = pick.i, bmp = pick.bmp;
            if (dirty || !shown || shown.st !== use || shown.i !== i || shown.bmp !== bmp) {
              if (shown && shotOf(shown.i) !== shotOf(i) && shotOf(i) !== shotOf(t)) stats.crossShot++;
              const R = paint(use, i, bmp); R.drawn = true;
              stats.draws++; if (i !== t) stats.sameShotFallback++; if (pick.thumb) stats.thumbs = (stats.thumbs || 0) + 1;
              const old = shown;
              shown = { st: use, i, bmp, R };
              // the last picture of a set that was let go is closed once something else is on screen
              if (old && old.st.dead && old.bmp !== bmp) closeB(old.bmp);
              view = makeView(use, i, R, i === t ? fFloat : i, cur);
              dirty = false;
              call('onDraw', ctx, view);
            }
            if (use === st && prevStore) { destroy(prevStore); prevStore = null; }
          } else if (shown) {
            stats.holds++;
            if (dirty && alive(shown.bmp)) {
              const R = paint(shown.st, shown.i, shown.bmp); R.drawn = true;
              shown.R = R;
              view = makeView(shown.st, shown.i, R, shown.i, cur);
              dirty = false;
              call('onDraw', ctx, view);
            }
          } else if (gated || failed) {
            // Nothing can be drawn (frames missing or still on their way after the loader gave up). The
            // overlays follow the scroll instead, so captions, booking and links keep working.
            if (dirty) { ctx.fillStyle = BG; ctx.fillRect(0, 0, cw, ch); dirty = false; }
            const fake = { width: 1920, height: 1080 };
            view = makeView(st, t, fitRect(st, t, fake), fFloat, cur);
          }
          if (view) {
            // smooth counters while the exact frame is on screen; f never leaves the drawn shot, so
            // anything keyed to f agrees with the picture
            if (shown && shown.i === t && view.i === t) { const fc = clamp(fFloat, view.shot * PER, view.shot * PER + PER - 1); if (view.f !== fc) { view.f = fc; view.local = clamp((fc - view.shot * PER) / (PER - 1)); } }
            // p is the scroll position: use it only for things tied to scrolling itself, never to the picture
            view.p = cur; view.target = t;
            const sig = view.i + ':' + view.f.toFixed(3) + ':' + cur.toFixed(5);
            if (sig !== lastSig) { lastSig = sig; call('onFrame', view); }
          }
        }
        updateLift();
      }
      call('onTick', view, dt, cur);
    }
    function tick(now) {
      // schedule first, so nothing that goes wrong in a frame can stop the film
      requestAnimationFrame(tick);
      try { frame(now); } catch (e) {
        stats.errors++;
        if (!reported.has('frame')) { reported.add('frame'); console.error('FilmEngine:', e); }
        dirty = true;
      }
    }

    /* ---------- Hidden overlays can't be reached ---------- */
    // o.overlays maps a selector to the class that shows it ('is-on'), or '!class' for the class that hides
    // it ('!is-off'). Whatever is hidden is inert: no taps pass to it, no tab stop, nothing read aloud.
    const OVER = Object.entries(o.overlays || { '.cap': 'is-on' });
    // An overlay that has just been hidden is still fading out: it keeps its toolbar lift until the fade ends,
    // so it doesn't drop while still visible.
    const fading = new WeakSet();
    let inertReady = false;
    function fadeDone(el) { if (fading.has(el)) { fading.delete(el); lastHide = -1; } }
    function syncInert() {
      let changed = false;
      OVER.forEach(([sel, cls]) => {
        const neg = cls[0] === '!', c = neg ? cls.slice(1) : cls;
        stage.querySelectorAll(sel).forEach(el => {
          const off = neg ? el.classList.contains(c) : !el.classList.contains(c);
          if (el.inert === off) return;
          if (off && inertReady) {
            fading.add(el);
            const end = e => { if (e.target === el) { el.removeEventListener('transitionend', end); fadeDone(el); } };
            el.addEventListener('transitionend', end);
            setTimeout(() => { el.removeEventListener('transitionend', end); fadeDone(el); }, 1200);
          } else if (!off) fading.delete(el);
          el.inert = off; changed = true;
        });
      });
      inertReady = true;
      if (changed) lastHide = -1; // re-apply the toolbar lift to what is visible now
    }
    let inertQ = false;
    new MutationObserver(() => { if (!inertQ) { inertQ = true; queueMicrotask(() => { inertQ = false; syncInert(); }); } })
      .observe(stage, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
    syncInert();

    /* ---------- Jumps: load the target frame, then go straight there ---------- */
    function jumpTo(p, opt = {}) {
      p = clamp(p);
      const token = ++jumpSeq;
      return new Promise(res => {
        const go = () => {
          if (token !== jumpSeq) return res(false);
          jumpT = -1;
          scrollInstant(filmTop() + p * filmLen());
          cur = target = p; dirty = true;
          res(true);
        };
        if (!M || !store || !N || failed) return go();
        const st = store;
        jumpT = snap(st, reduce ? repFrame(shotOf(frameAt(p))) : frameAt(p));
        pump();
        const t0 = performance.now(), limit = opt.timeout || 3000;
        const wait = () => {
          if (token !== jumpSeq) return res(false);
          if (st !== store || alive(st.bmp.get(jumpT)) || performance.now() - t0 > limit) return go();
          // decode the target even while the film is off screen
          manageDecode(st, jumpT);
          requestAnimationFrame(wait);
        };
        wait();
      });
    }
    // In-page links whose target lands inside the film's scroll range use jumpTo.
    document.addEventListener('click', e => {
      if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = e.target.closest && e.target.closest('a[href^="#"]');
      if (!a) return;
      let id;
      try { id = decodeURIComponent(a.getAttribute('href').slice(1)); } catch { return; }
      const el = id ? document.getElementById(id) : null;
      if (id && !el) return;
      let p;
      if (el && el.dataset.filmAt != null && section.contains(el)) p = +el.dataset.filmAt;
      else {
        if (el && stage.contains(el)) return;
        const y = el ? el.getBoundingClientRect().top + scrollY - (parseFloat(getComputedStyle(el).scrollMarginTop) || 0) : 0;
        const top = filmTop();
        if (y < top - 2 || y > top + filmLen() + 2) return;
        p = (y - top) / filmLen();
      }
      if (!Number.isFinite(p)) return;
      e.preventDefault();
      // a visible cue while the target frame loads
      a.setAttribute('aria-busy', 'true');
      const prevCursor = a.style.cursor, prevOpacity = a.style.opacity;
      a.style.cursor = 'progress'; a.style.opacity = '0.6';
      jumpTo(p).then(ok => {
        a.removeAttribute('aria-busy');
        a.style.cursor = prevCursor; a.style.opacity = prevOpacity;
        if (!ok || !el) return;
        // focus lands once the overlays have caught up with the new picture (a hidden target is inert)
        const t0 = performance.now();
        const focus = () => {
          if (el.inert || (el.closest('[inert]'))) { if (performance.now() - t0 < 2000) requestAnimationFrame(focus); return; }
          if (!el.matches('a, button, input, select, textarea, [tabindex]')) el.setAttribute('tabindex', '-1');
          el.focus({ preventScroll: true });
        };
        requestAnimationFrame(focus);
      });
    });

    /* ---------- Boot ---------- */
    async function loadMeta() {
      // a dropped request or a bad deploy of frames.json gets two more tries before falling back
      for (const wait of [0, 700, 2000]) {
        if (wait) await new Promise(r => setTimeout(r, wait));
        try {
          const r = await fetch(`${base}frames.json${FV ? '?v=' + FV : ''}`, { cache: 'no-cache' });
          if (r.ok) { const j = await r.json(); if (j && Number.isFinite(j.count)) return j; }
        } catch { /* try again */ }
      }
      return null;
    }
    async function boot() {
      M = await loadMeta();
      if (!M) {
        // Without frames.json, play the standard 6 x 40 layout from the 16:9 set. If the frames are missing
        // too, the overlays still follow the scroll (see "Nothing can be drawn" above).
        failed = true;
        M = { count: o.count || 240, per: o.per || 40, shots: o.shots || 6 };
      }
      PER = M.per || 40; SHOTS = M.shots || Math.ceil(M.count / PER); N = Math.min(M.count, PER * SHOTS);
      W = Array.isArray(M.weights) && M.weights.length === SHOTS ? M.weights.slice() : new Array(SHOTS).fill(1);
      TM = Array.isArray(M.tm) && M.tm.length === SHOTS ? M.tm : null;
      // Reduced motion: one still per shot, no scrub, and a shorter section
      if (reduce) section.style.height = `${SHOTS * 60 + 100}vh`;
      mode = pickMode();
      store = makeStore(mode.set);
      resize(); gateCheck(); pump();
    }

    new IntersectionObserver(es => {
      visible = es[0].isIntersecting;
      if (visible) dirty = true;
    }, { rootMargin: '200px 0px' }).observe(section);
    // Downloads and decoded pictures follow whether the film is actually on screen.
    new IntersectionObserver(es => {
      near = es[0].isIntersecting;
      if (near) { dirty = true; pump(); return; }
      release();
      // the coarse frames keep coming (until they are in); everything else stops, and decoded pictures go
      [store, prevStore].forEach(st => { if (st && !st.dead) { st.inflight.forEach((ac, i) => { if (i !== jumpT && !(gateSet && gateSet.has(i))) ac.abort(); }); releaseBitmaps(st); } });
    }).observe(section);

    // Turning the device changes every vh-based height, so keep the visitor at the same point in the film
    // instead of letting the page drop them into another section. This runs inside the resize event,
    // before the next frame is drawn, so no frame is drawn from the old scroll position.
    let rsz = 0, lastW = innerWidth, restoreP = null;
    const onResize = () => {
      if (innerWidth !== lastW && restoreP == null && target > 0.001 && target < 0.999) restoreP = target;
      lastW = innerWidth;
      if (restoreP != null) { scrollInstant(filmTop() + restoreP * filmLen()); cur = target = restoreP; lastCur = cur; }
      resize();
      cancelAnimationFrame(rsz);
      rsz = requestAnimationFrame(() => {
        // once more after the browser has settled the new layout
        if (restoreP != null) { scrollInstant(filmTop() + restoreP * filmLen()); cur = target = restoreP; lastCur = cur; restoreP = null; }
        resize();
      });
    };
    addEventListener('resize', onResize);
    if (window.visualViewport) visualViewport.addEventListener('resize', () => { lastHide = -1; });
    resize();
    requestAnimationFrame(tick);
    boot();

    const api = {
      get ready() { return ready; }, get failed() { return failed; }, get meta() { return M; }, get view() { return view; },
      get mode() { return mode; }, get progress() { return cur; }, get target() { return target; }, get hide() { return hide; },
      frameAt, stats, jumpTo, redraw() { dirty = true; },
      debug() {
        const st = store;
        return { mode, set: st && st.set, blobs: st ? st.blobs.filter(Boolean).length : 0, decoded: st ? st.bmp.size : 0, inflight: st ? st.inflight.size : 0,
          prevDecoded: prevStore ? prevStore.bmp.size : 0, shown: shown ? shown.i : -1, shownShot: shown ? shotOf(shown.i) : -1, jumping: jumpT >= 0,
          targetFrame: st ? snap(st, frameAt(cur)) : -1, stats: { ...stats }, ready, failed, near, hide };
      },
    };
    instances.push(api);
    return api;
  }
  window.FilmEngine = { create, instances };
})();
