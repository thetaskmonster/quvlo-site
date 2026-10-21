(() => {
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cl = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const $ = id => document.getElementById(id);

  // ---- one made-up member, weeks 0 to 12: [lean mass lb, fat lb, waist in]. Illustrative only.
  const DATA = [
    [138.0, 62.0, 37.0], [138.6, 61.4, 36.9], [139.1, 60.5, 36.7], [139.5, 59.9, 36.4], [140.0, 59.0, 36.2],
    [140.2, 58.6, 36.1], [140.3, 58.4, 36.0], [140.9, 57.4, 35.7], [141.4, 56.5, 35.4], [141.7, 55.6, 35.2],
    [142.1, 54.6, 34.9], [142.5, 53.5, 34.7], [142.8, 52.6, 34.5]
  ];
  const NOTES = [
    'First scan. Baseline set. Three lifting sessions a week and a protein target. Nothing extreme.',
    'Form week. Squat, hinge and press, with a coach on every set.',
    'Loads going up. Sleep is the next thing to fix.',
    'Waist is down a little. The scale has barely moved. That is the point.',
    'Plan rebuilt. A fourth session added: a short conditioning block.',
    'A flat week. Travel and a cold. Scans dip and come back, and the trend is what counts.',
    'Still flat. No changes. Hold the plan.',
    'Back on the line. Lean mass is moving again.',
    'Plan rebuilt. Heavier lower body, calories nudged down.',
    'Top sets heavier than at any point so far.',
    'The old belt needs a new notch.',
    'Deload week. Lighter loads so the next block lands.',
    'Twelve-week scan. The next block gets planned around what this one showed.'
  ];
  const at = w => { const i = Math.min(11, Math.floor(w)), t = w - i, a = DATA[i], b = DATA[i + 1]; return a.map((v, k) => v + (b[k] - v) * t); };

  // ---- body contour, right half: [y, half-width of lean tissue, how much fat sits here, how much muscle grows here]
  const OUT = [[74,11,.05,.1],[90,13,.15,.2],[102,30,.3,.6],[114,52,.4,1],[140,50,.5,.8],[168,47,.8,.7],[205,41,1.2,.3],[238,39,1.5,.2],[268,45,1.3,.3],[298,51,1.1,.5],[330,49,1,.9],[380,42,.7,.9],[428,33,.3,.4],[470,35,.3,.6],[520,26,.15,.3],[560,20,.05,.1],[582,28,.02,0],[594,24,0,0]];
  const INN = [[594,7,0,0],[560,9,.05,.1],[515,9,.1,.3],[470,8,.2,.5],[430,10,.2,.3],[385,10,.5,.6],[340,7,.6,.5],[322,1.5,.2,.1]];
  // arm stations along the line from shoulder to fingertips: [t, half-width, fat weight, muscle weight]
  const ARM = [[0,9,.2,.4],[.06,14,.5,1],[.3,12,.8,1],[.5,8.5,.35,.3],[.68,9.5,.3,.7],[.9,5.5,.05,0],[.96,7.5,0,0],[1,4,0,0]];
  const A0 = [56, 122], A1 = [104, 350];

  function smooth(p, closed) {
    const n = p.length, g = i => closed ? p[(i + n) % n] : p[Math.max(0, Math.min(n - 1, i))];
    let d = `M${p[0][0].toFixed(1)} ${p[0][1].toFixed(1)}`;
    for (let i = 0; i < (closed ? n : n - 1); i++) {
      const p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2);
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += `C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
    }
    return d + (closed ? 'Z' : '');
  }
  function shapes(lg, F) {
    const o = OUT.map(([y, x, f, m]) => [x * (1 + lg * m) + F * f, y]);
    const i = INN.map(([y, x, f, m]) => [Math.max(1.2, x - x * lg * m * .5 - F * f), y]);
    const half = o.concat(i), waistX = o[7][0];
    const body = half.map(([x, y]) => [150 + x, y]).concat(half.slice().reverse().map(([x, y]) => [150 - x, y]));
    const dx = A1[0] - A0[0], dy = A1[1] - A0[1], len = Math.hypot(dx, dy), nx = dy / len, ny = -dx / len;
    const st = ARM.map(([t, w, f, m]) => [A0[0] + dx * t, A0[1] + dy * t, w * (1 + lg * m) + F * .55 * f]);
    const outer = st.map(([x, y, w]) => [x + nx * w, y + ny * w]), inner = st.map(([x, y, w]) => [x - nx * w, y - ny * w]).reverse();
    const arm = outer.concat(inner);
    const R = arm.map(([x, y]) => [150 + x, y]), L = arm.map(([x, y]) => [150 - x, y]).reverse();
    const rx = 20 + F * .1, ry = 26 + F * .06, H = `M150 ${(50 - ry).toFixed(1)}a${rx.toFixed(1)} ${ry.toFixed(1)} 0 1 1 0 ${(2 * ry).toFixed(1)}a${rx.toFixed(1)} ${ry.toFixed(1)} 0 1 1 0 ${(-2 * ry).toFixed(1)}Z`;
    return { H, B: smooth(body, true), L: smooth(L, true), R: smooth(R, true), waistX };
  }
  const P = {}; ['fH','fB','fL','fR','lH','lB','lL','lR'].forEach(k => P[k] = $(k));
  const wl = $('wl'), wt1 = $('wt1'), wt2 = $('wt2');

  const fmt = v => v.toFixed(1), sgn = v => (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(1);
  const base = DATA[0], baseBF = base[1] / (base[0] + base[1]) * 100, baseW = base[0] + base[1];
  const range = $('wkr'), track = document.querySelector('.track');
  let cur = 0, lastWk = -1;

  // phone sparklines: both lines rise when things improve (fat is drawn inverted)
  const spark = (k, wk, inv) => {
    const vals = DATA.map(r => r[k]), lo = Math.min(...vals), hi = Math.max(...vals);
    return DATA.slice(0, wk + 1).map((r, i) => { const q = (r[k] - lo) / (hi - lo); return `${i ? 'L' : 'M'}${(i * 20).toFixed(1)} ${(inv ? 25 + q * 16 : 19 - q * 16).toFixed(1)}`; }).join('');
  };
  const rail = document.querySelector('.rail b');

  function render(w) {
    const [lean, fat, waist] = at(w), wk = Math.round(w);
    // the drawing: lean tissue grows a little, the fat layer thins. Exaggerated so the change is visible.
    const lg = (lean - 138) / 138 * 3.5, F = 3 + (fat - 50) * 1.1;
    const f = shapes(lg, F), l = shapes(lg, 0);
    P.fH.setAttribute('d', f.H); P.fB.setAttribute('d', f.B); P.fL.setAttribute('d', f.L); P.fR.setAttribute('d', f.R);
    P.lH.setAttribute('d', l.H); P.lB.setAttribute('d', l.B); P.lL.setAttribute('d', l.L); P.lR.setAttribute('d', l.R);
    const x1 = (150 - f.waistX - 4).toFixed(1), x2 = (150 + f.waistX + 4).toFixed(1);
    wl.setAttribute('x1', x1); wl.setAttribute('x2', x2);
    wt1.setAttribute('x1', x1); wt1.setAttribute('x2', x1); wt2.setAttribute('x1', x2); wt2.setAttribute('x2', x2);
    const bf = fat / (lean + fat) * 100, sc = lean + fat;
    $('rl').textContent = fmt(lean); $('rf').textContent = fmt(bf); $('rw').textContent = fmt(waist); $('rs').textContent = fmt(sc);
    const z = w < .05;
    $('dl').textContent = z ? 'Baseline' : `${sgn(lean - base[0])} lb since week 0`;
    $('df').textContent = z ? 'Baseline' : `${sgn(bf - baseBF)} points since week 0`;
    $('dw').textContent = z ? 'Baseline' : `${sgn(waist - base[2])} in since week 0`;
    $('ds').textContent = z ? 'Baseline' : `Only ${Math.abs(sc - baseW).toFixed(1)} lb lighter`;
    rail.style.width = (w / 12 * 100).toFixed(2) + '%';
    if (wk !== lastWk) {
      lastWk = wk;
      $('nwk').textContent = wk; $('swk').textContent = wk; $('awk').textContent = wk;
      $('notetxt').textContent = NOTES[wk]; $('pwk').textContent = wk;
      const r = DATA[wk];
      $('al').textContent = wk ? `${sgn(r[0] - base[0])} lb` : 'Baseline'; $('af').textContent = wk ? `${sgn(r[1] - base[1])} lb` : 'Baseline';
      $('spl').setAttribute('d', spark(0, wk, false)); $('spf').setAttribute('d', spark(1, wk, true));
      range.setAttribute('aria-valuetext', `Week ${wk} of 12. Lean mass ${fmt(r[0])} pounds, body fat ${fmt(r[1] / (r[0] + r[1]) * 100)} percent, waist ${fmt(r[2])} inches. Example numbers.`);
    }
  }

  // tick labels under the bar; weeks 0, 4, 8 and 12 are when the coach rebuilds the plan
  const ticks = $('ticks');
  for (let i = 0; i <= 12; i++) { const s = document.createElement('span'); s.style.left = (i / 12 * 100) + '%'; s.textContent = i % 4 ? String(i) : 'Wk ' + i; if (i % 4 === 0) s.className = 'r'; ticks.appendChild(s); }

  // moving between weeks: the body eases from one scan to the next
  let anim = 0;
  function go(target) {
    target = cl(target, 0, 12); cancelAnimationFrame(anim);
    range.value = target;
    if (calm) { cur = target; render(cur); return; }
    const from = cur, t0 = performance.now(), dur = 260 + Math.abs(target - from) * 70;
    const step = now => { const q = cl((now - t0) / dur), e = 1 - Math.pow(1 - q, 3); cur = from + (target - from) * e; render(cur); if (q < 1) anim = requestAnimationFrame(step); };
    anim = requestAnimationFrame(step);
  }
  range.addEventListener('input', () => { cancelAnimationFrame(anim); cur = +range.value; render(cur); });
  range.addEventListener('change', () => go(Math.round(+range.value)));
  range.addEventListener('keydown', e => {
    const k = e.key, w = Math.round(cur);
    const t = k === 'ArrowRight' || k === 'ArrowUp' ? w + 1 : k === 'ArrowLeft' || k === 'ArrowDown' ? w - 1 : k === 'PageUp' ? w + 4 : k === 'PageDown' ? w - 4 : k === 'Home' ? 0 : k === 'End' ? 12 : null;
    if (t === null) return; e.preventDefault(); go(t);
  });
  render(0);

  // scrolling: while the scan is pinned, scrolling moves through the twelve weeks
  const pin = document.querySelector('.pin');
  let lastY = scrollY;
  function onScroll() {
    const y = scrollY; if (y === lastY) return; lastY = y;
    const b = pin.getBoundingClientRect(), span = b.height - innerHeight;
    if (span <= 0 || b.top > innerHeight * .2 || b.bottom < innerHeight * .8) return;
    const w = cl(-b.top / span) * 12;
    cancelAnimationFrame(anim); cur = w; range.value = w; render(w);
  }
  if (!calm) { addEventListener('scroll', onScroll, { passive: true }); }

  // the studio pill appears once the hero is gone
  const pill = document.querySelector('.quvlo');
  const heroEl = document.querySelector('.hero');
  const pillState = () => { const h = heroEl.getBoundingClientRect(), b = pin.getBoundingClientRect(); const hide = h.bottom > innerHeight * .2 || (b.top < innerHeight * .5 && b.bottom > innerHeight * .5); pill.style.opacity = hide ? 0 : 1; pill.style.pointerEvents = hide ? 'none' : ''; };
  addEventListener('scroll', pillState, { passive: true }); addEventListener('resize', pillState); pillState();

  // booking: checked in the browser, then a success state. Nothing is sent anywhere.
  const f = $('f'), err = $('err');
  f.addEventListener('submit', e => {
    e.preventDefault();
    const nm = $('nm'), em = $('em');
    const okName = nm.value.trim().length > 0, okEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em.value.trim());
    nm.setAttribute('aria-invalid', String(!okName)); em.setAttribute('aria-invalid', String(!okEmail));
    if (!okName) { err.textContent = 'Add your name so we know who to expect.'; nm.focus(); return; }
    if (!okEmail) { err.textContent = 'That email doesn\'t look right. Check it and try again.'; em.focus(); return; }
    err.textContent = '';
    $('formWrap').classList.add('sent'); $('ok').focus();
  });
})();
