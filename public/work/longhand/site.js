(() => {
  const root = document.documentElement;
  root.classList.add('js');
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cl = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const sm = q => q * q * (3 - 2 * q);
  const lerp = (a, b, t) => a + (b - a) * t;

  // Ink draws pencil strokes in writing order: q = 0 is a blank page, q = 1 is fully written.
  // Every stroke has pathLength="1", so its dash offset runs from 1 (hidden) to 0 (drawn).
  function Ink(paths, groupOf) {
    const segs = []; let total = 0, last = null;
    const lens = paths.map(p => p.getTotalLength());
    const lift = lens.reduce((a, b) => a + b, 0) / Math.max(1, lens.length) * 1.4; // the pen lifts between words
    paths.forEach((p, i) => { const g = groupOf(p); if (last && g !== last) total += lift; last = g; segs.push({ p, at: total, len: lens[i] || 1, v: -1 }); total += lens[i]; });
    return q => { const d = q * total; for (const s of segs) { const v = cl((d - s.at) / s.len); if (v !== s.v) { s.v = v; s.p.style.strokeDashoffset = (1 - v).toFixed(4); } } };
  }

  // ---- hero: the client's first lines write themselves onto the notebook page
  const heroInk = Ink([...document.querySelectorAll('svg.ink path')], p => p.parentNode);
  const h1mark = document.querySelector('.hero h1 .hi');
  if (calm) { heroInk(1); }
  else {
    const t0 = performance.now() + 500, dur = 4200;
    const tick = now => {
      const q = cl((now - t0) / dur);
      heroInk(q);
      h1mark.style.setProperty('--m', sm(cl((now - t0 - dur - 150) / 650)).toFixed(3)); // the words that matter get marked once they're written
      if (q < 1 || now - t0 < dur + 900) requestAnimationFrame(tick);
    };
    heroInk(0); requestAnimationFrame(tick);
  }

  // ---- signature: the check-in becomes the plan
  const sec = document.getElementById('checkin'), pin = sec.querySelector('.pin');
  const card = sec.querySelector('.card');
  const noteInk = Ink([...card.querySelectorAll('svg.w path')], p => p.closest('svg'));
  const rows = [...sec.querySelectorAll('.row')];
  const marks = rows.map(r => card.querySelector(`.hl[data-k="${r.dataset.k}"]`));
  const quotes = rows.map(r => r.querySelector('.q'));
  // the plan quotes the client's own strokes: copies of the highlighted words, not retyped text
  marks.forEach((m, i) => m.querySelectorAll('svg.w').forEach((w, j) => { if (j) quotes[i].append(' '); quotes[i].append(w.cloneNode(true)); }));
  quotes.forEach(q => q.querySelectorAll('path').forEach(p => p.removeAttribute('style')));
  const travellers = quotes.map(q => { const t = document.createElement('div'); t.className = 'traveller'; t.setAttribute('aria-hidden', 'true'); t.append(...[...q.childNodes].map(n => n.cloneNode(true))); document.body.append(t); return t; });
  const stages = [...document.querySelectorAll('#stages li')];
  const status = document.getElementById('status'), fu = sec.querySelector('.fu');
  const play = document.getElementById('play'), playLabel = play.querySelector('span');
  const STATUS = ['Waiting for your check-in', 'Noor is reading', 'Ready Monday by noon'];
  let stage = 0;

  function render(p, live) {
    noteInk(cl(p / .32));
    marks.forEach((m, i) => m.querySelector('.mark').style.setProperty('--m', sm(cl((p - .35 - i * .035) / .06)).toFixed(3)));
    rows.forEach((r, i) => {
      const ts = .5 + i * .1, t = cl((p - ts) / .075), rv = sm(cl((p - ts - .055) / .045));
      r.style.setProperty('--r', rv.toFixed(3));
      const tr = travellers[i];
      if (live && t > 0 && rv < 1) {
        // lift the highlighted words off the card and set them into their line of the plan
        const a = marks[i].querySelector('svg').getBoundingClientRect(), b = quotes[i].querySelector('svg').getBoundingClientRect();
        const e = sm(t), s = lerp(a.height / b.height, 1, e);
        const x = lerp(a.left, b.left, e), y = lerp(a.top, b.top, e) - Math.sin(Math.PI * e) * 36;
        tr.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) scale(${s.toFixed(4)})`;
        tr.style.opacity = (1 - rv).toFixed(3);
      } else if (tr.style.opacity !== '0') tr.style.opacity = '0';
    });
    fu.style.setProperty('--f', sm(cl((p - .92) / .05)).toFixed(3));
    const st = p < .34 ? 0 : p < .49 ? 1 : 2;
    stages.forEach((li, i) => li.style.setProperty('--s', cl(i === 0 ? p / .34 : i === 1 ? (p - .34) / .15 : (p - .49) / .48).toFixed(3)));
    if (st !== stage) {
      stage = st;
      stages.forEach((li, i) => i === st ? li.setAttribute('aria-current', 'step') : li.removeAttribute('aria-current'));
      status.textContent = STATUS[st]; status.classList.toggle('ready', st === 2);
    }
    const lbl = p > .985 ? 'Play it again' : 'Play it through';
    if (playLabel.textContent !== lbl) { playLabel.textContent = lbl; play.setAttribute('aria-label', lbl); }
  }
  // progress starts while the card rises into view, and finishes as the pinned stage lets go
  const lead = () => innerHeight * .5;
  function progress() { const r = pin.getBoundingClientRect(); return cl((lead() - r.top) / Math.max(1, r.height - innerHeight + lead())); }

  if (calm) { stage = -1; render(1, false); }
  else {
    stage = -1;
    let queued = false;
    const frame = () => { queued = false; const r = pin.getBoundingClientRect(); render(progress(), r.top < innerHeight && r.bottom > 0); };
    const ask = () => { if (!queued) { queued = true; requestAnimationFrame(frame); } };
    addEventListener('scroll', ask, { passive: true }); addEventListener('resize', ask); frame();

    // play: drives the same scroll, so scrolling and the button always agree
    let auto = 0;
    const stop = () => { if (auto) { cancelAnimationFrame(auto); auto = 0; } };
    ['wheel', 'touchstart', 'keydown'].forEach(ev => addEventListener(ev, e => { if (e.target !== play) stop(); }, { passive: true }));
    play.addEventListener('click', () => {
      stop();
      const top = scrollY + pin.getBoundingClientRect().top, end = top + pin.offsetHeight - innerHeight, start0 = top - lead();
      let from = scrollY;
      if (progress() > .985 || from < start0) { from = Math.max(0, start0); scrollTo(0, from); }
      const dist = end - from, dur = Math.max(1200, 8000 * dist / (end - start0)), t0 = performance.now();
      const step = now => { const k = cl((now - t0) / dur); scrollTo(0, from + dist * (k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2)); auto = k < 1 ? requestAnimationFrame(step) : 0; };
      auto = requestAnimationFrame(step);
    });
  }

  // ---- intro call form: validates, shows a success state, sends nothing
  const f = document.getElementById('f'), err = document.getElementById('err');
  f.addEventListener('submit', e => {
    e.preventDefault();
    const nm = f.elements.name, em = f.elements.email;
    const name = nm.value.trim().slice(0, 60), email = em.value.trim();
    const okEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    nm.setAttribute('aria-invalid', String(!name)); em.setAttribute('aria-invalid', String(!okEmail));
    if (!name) { err.textContent = 'Please add your name.'; return nm.focus(); }
    if (!okEmail) { err.textContent = 'Please check your email address.'; return em.focus(); }
    err.textContent = '';
    document.getElementById('dn').textContent = name.split(/\s+/)[0];
    const line = f.elements.line.value.trim().slice(0, 400), dq = document.getElementById('dq');
    if (line) { dq.textContent = `In your words: “${line}”`; dq.hidden = false; }
    document.getElementById('formWrap').classList.add('sent');
    document.getElementById('done').focus();
  });
})();
