(() => {
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const tnum = document.getElementById('tnum'), twhere = document.getElementById('twhere');
  const nav = document.getElementById('nav');
  const heatOf = t => Math.max(0, Math.min(1, (t - 39) / (190 - 39)));
  let shown = 190, target = 190, raf = 0, override = false;

  function paint(v) {
    shown = v;
    tnum.firstChild.nodeValue = String(Math.round(v));
    root.style.setProperty('--heat', heatOf(v).toFixed(3));
  }
  function goTo(t, where) {
    target = t; twhere.textContent = where;
    if (reduce) { paint(t); return; }
    cancelAnimationFrame(raf);
    const from = shown, start = performance.now(), dur = 900;
    const step = now => {
      const p = Math.min(1, (now - start) / dur), e = 1 - Math.pow(1 - p, 3);
      paint(from + (target - from) * e);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }

  // the readout follows the room you are scrolling through
  const io = new IntersectionObserver(es => {
    if (override) return;
    es.forEach(e => { if (e.isIntersecting) { goTo(+e.target.dataset.temp, e.target.dataset.where); document.getElementById('temp').classList.toggle('light', e.target.dataset.tone === 'light'); } });
  }, { rootMargin: '-45% 0px -45% 0px' });
  document.querySelectorAll('[data-temp]').forEach(s => io.observe(s));
  addEventListener('scroll', () => nav.classList.toggle('solid', scrollY > 40), { passive: true });

  // play one round: 15 heat, 3 cold, 10 rest, compressed into ten seconds
  const play = document.getElementById('play'), cursor = document.getElementById('cursor'), now = document.getElementById('now');
  const PH = [['Heat', 15, 190, 'Cedar room'], ['Cold', 3, 39, 'The plunge'], ['Rest', 10, 72, 'The lounge']];
  play.addEventListener('click', () => {
    override = true; play.disabled = true;
    const total = 28, ms = 10000, t0 = performance.now(); let last = -1;
    const tick = n => {
      const p = Math.min(1, (n - t0) / ms), m = p * total;
      cursor.style.left = `calc(${p * 100}% - 1px)`;
      let acc = 0, i = 0; for (; i < PH.length; i++) { if (m < acc + PH[i][1] || i === 2) break; acc += PH[i][1]; }
      const left = Math.max(0, Math.ceil(acc + PH[i][1] - m));
      now.textContent = p < 1 ? `${PH[i][0]}, ${left} min left` : 'Round done. Most people go again.';
      if (i !== last) { last = i; goTo(PH[i][2], PH[i][3]); }
      if (p < 1) requestAnimationFrame(tick); else { play.disabled = false; play.textContent = 'Play again'; setTimeout(() => { override = false; }, 1200); }
    };
    requestAnimationFrame(tick);
  });

  // next open: half-hour slots from now, a few already taken
  const slots = document.getElementById('slots'), go = document.getElementById('go'), len = document.getElementById('len');
  let room = 'Cedar room', roomLen = '60 min', pick = null;
  const fmt = d => { let h = d.getHours(), m = d.getMinutes(); const ap = h >= 12 ? 'pm' : 'am'; h = h % 12 || 12; return `${h}:${String(m).padStart(2, '0')}${ap}`; };
  function render() {
    const base = new Date(); base.setSeconds(0, 0);
    base.setMinutes(base.getMinutes() < 30 ? 30 : 60);
    if (base.getHours() < 6) base.setHours(6, 0); if (base.getHours() >= 22) { base.setDate(base.getDate() + 1); base.setHours(6, 0); }
    const seed = room.length; slots.innerHTML = ''; pick = null;
    for (let i = 0; i < 6; i++) {
      const d = new Date(base.getTime() + i * 30 * 60000);
      const taken = (i * 7 + seed) % 5 === 0;
      const b = document.createElement('button'); b.type = 'button'; b.disabled = taken;
      b.setAttribute('aria-pressed', 'false');
      b.innerHTML = `${fmt(d)}<small>${taken ? 'Taken' : i === 0 ? 'Next' : 'Open'}</small>`;
      b.addEventListener('click', () => { slots.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', 'false')); b.setAttribute('aria-pressed', 'true'); pick = fmt(d); label(); });
      slots.appendChild(b);
      if (!taken && pick === null) { pick = fmt(d); b.setAttribute('aria-pressed', 'true'); }
    }
    label();
  }
  function label() { go.textContent = `Book the ${pick} ${room.toLowerCase()}`; len.textContent = `${roomLen}. Robe, towels and water are on us.`; }
  document.querySelectorAll('.tabs button').forEach(b => b.addEventListener('click', () => {
    document.querySelectorAll('.tabs button').forEach(x => x.setAttribute('aria-pressed', 'false'));
    b.setAttribute('aria-pressed', 'true'); room = b.dataset.room; roomLen = b.dataset.len; render();
  }));
  render();
})();
