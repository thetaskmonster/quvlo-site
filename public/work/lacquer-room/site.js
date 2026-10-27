(() => {
  const panel = document.getElementById('panel'), range = panel.querySelector('input');
  const fifty = document.getElementById('fifty');
  const set = v => { panel.style.setProperty('--x', v + '%'); fifty.style.setProperty('--m', (100 - v) + '%'); };
  range.addEventListener('input', () => set(range.value));
  set(range.value);
  // ---- scroll story (reduced motion: everything stays in its finished, readable state)
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cl = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v)), sm = q => q * q * (3 - 2 * q);
  const heroImg = document.querySelector('.hero img'), wet = document.querySelector('.wet'), refl = document.querySelector('.wet .refl');
  const h2 = document.getElementById('why-h');
  h2.innerHTML = h2.textContent.split(' ').map(w => `<span class="w">${w.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</span>`).join(' ');
  const words = [...h2.querySelectorAll('.w')];
  const lens = document.querySelector('.loupe .lens'), clean = lens.querySelector('.clean'), swirl = lens.querySelector('.swirl');
  const c0 = document.querySelector('.loupe .c0'), c1 = document.querySelector('.loupe .c1');
  const pin = document.querySelector('.fifty-pin');
  const svcs = [...document.querySelectorAll('.svc')], beads = document.querySelector('.work figure img');
  let lastX = -1;
  function fx() {
    const vh = innerHeight, y = scrollY;
    // hero: the camera leans into the paint, the reflection under the headline goes sharp
    const hp = cl(y / (document.querySelector('.hero').offsetHeight * .9));
    heroImg.style.transform = `scale(${(1 + .16 * hp).toFixed(4)}) translateY(${(hp * 3).toFixed(2)}%)`;
    wet.style.transform = `translateY(${(-hp * 110).toFixed(1)}px)`;
    refl.style.filter = `blur(${(1.5 * (1 - hp)).toFixed(2)}px)`; refl.style.opacity = (.22 + .26 * hp).toFixed(3);
    // why: the sentence clears word by word, then the loupe polishes from swirls to a clean reflection
    const hb = h2.getBoundingClientRect(), wq = cl((vh * .88 - hb.top) / (hb.height + vh * .32));
    words.forEach((w, i) => { const o = cl(wq * words.length - i); w.style.opacity = (.14 + .86 * o).toFixed(3); w.style.transform = `translateY(${((1 - o) * 14).toFixed(1)}px)`; });
    const lb = lens.getBoundingClientRect(), lq = sm(cl((vh * .78 - lb.top) / (lb.height * 1.1)));
    swirl.style.opacity = (1 - lq).toFixed(3); clean.style.opacity = lq.toFixed(3);
    lens.style.transform = `rotate(${(-10 + 10 * lq).toFixed(2)}deg) scale(${(.94 + .06 * lq).toFixed(4)})`;
    c0.style.opacity = (1 - lq).toFixed(3); c1.style.opacity = lq.toFixed(3);
    // 50/50: while the panel is pinned, scrolling pulls the tape across and corrects the panel
    const pb = pin.getBoundingClientRect(), pq = cl(-pb.top / (pb.height - vh));
    const x = 94 - 88 * sm(pq); /* the tape travels right to left, leaving corrected paint behind it */ if (Math.abs(x - lastX) > .01 && pb.top < vh && pb.bottom > 0) { lastX = x; range.value = x.toFixed(1); set(x.toFixed(2)); }
    // services: each one settles in as it reaches the eye line; the beads drift up behind them
    svcs.forEach(el => { const b = el.getBoundingClientRect(), q = sm(cl((vh * .96 - b.top) / (vh * .3))); el.style.opacity = (.12 + .88 * q).toFixed(3); el.style.transform = `translateY(${((1 - q) * 36).toFixed(1)}px)`; });
    const bb = beads.parentElement.getBoundingClientRect(), bq = cl((vh - bb.top) / (vh + bb.height));
    beads.style.transform = `scale(${(1.14 - .14 * bq).toFixed(4)})`;
  }
  if (!calm) { addEventListener('scroll', fx, { passive: true }); addEventListener('resize', fx); fx(); window.__fx = fx; }
  const f = document.getElementById('f'), done = document.getElementById('done');
  f.addEventListener('submit', e => {
    e.preventDefault();
    if (!f.checkValidity()) { f.reportValidity(); return; }
    f.style.display = 'none'; done.style.display = 'block'; done.focus();
  });
})();
