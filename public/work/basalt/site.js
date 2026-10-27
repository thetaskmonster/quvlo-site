(() => {
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const tnum = document.getElementById('tnum'), twhere = document.getElementById('twhere');
  const nav = document.getElementById('nav'), cbar = document.getElementById('cbar'), dock = document.getElementById('dock');
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
    es.forEach(e => { if (e.isIntersecting) { goTo(+e.target.dataset.temp, e.target.dataset.where); const light = e.target.dataset.tone === 'light'; document.getElementById('temp').classList.toggle('light', light); if (dock) dock.classList.toggle('light', light); } });
  }, { rootMargin: '-45% 0px -45% 0px' });
  document.querySelectorAll('[data-temp]').forEach(s => io.observe(s));
  // The fixed nav sits under the concept strip until the strip scrolls away.
  const onScroll = () => { nav.classList.toggle('solid', scrollY > 40); root.style.setProperty('--cbar-off', Math.max(0, (cbar ? cbar.offsetHeight : 0) - scrollY) + 'px'); };
  addEventListener('scroll', onScroll, { passive: true }); addEventListener('resize', onScroll); onScroll();

  // play one round: 15 heat, 3 cold, 10 rest, compressed into ten seconds
  // Screen readers hear each phase once (#said), not every minute of the countdown.
  // With reduced motion the cursor steps from phase to phase instead of sliding.
  const play = document.getElementById('play'), cursor = document.getElementById('cursor'), now = document.getElementById('now'), said = document.getElementById('said');
  const PH = [['Heat', 15, 190, 'Cedar room'], ['Cold', 3, 39, 'The plunge'], ['Rest', 10, 72, 'The lounge']];
  const DONE = 'Round done. Most people go again.';
  play.addEventListener('click', () => {
    override = true; play.disabled = true;
    const total = 28, ms = 10000, t0 = performance.now(); let last = -1;
    const finish = () => { now.textContent = DONE; said.textContent = DONE; play.disabled = false; play.textContent = 'Play again'; setTimeout(() => { override = false; }, 1200); };
    if (reduce) {
      let i = 0, acc = 0;
      const stepPhase = () => {
        if (i >= PH.length) { cursor.style.left = 'calc(100% - 1px)'; finish(); return; }
        cursor.style.left = `calc(${acc / total * 100}% - 1px)`; now.textContent = `${PH[i][0]}, ${PH[i][1]} min`; said.textContent = now.textContent; goTo(PH[i][2], PH[i][3]);
        acc += PH[i][1]; i++; setTimeout(stepPhase, 2500);
      };
      stepPhase(); return;
    }
    const tick = n => {
      const p = Math.min(1, (n - t0) / ms), m = p * total;
      cursor.style.left = `calc(${p * 100}% - 1px)`;
      let acc = 0, i = 0; for (; i < PH.length; i++) { if (m < acc + PH[i][1] || i === 2) break; acc += PH[i][1]; }
      const left = Math.max(0, Math.ceil(acc + PH[i][1] - m));
      if (p < 1) now.textContent = `${PH[i][0]}, ${left} min left`;
      if (i !== last) { last = i; goTo(PH[i][2], PH[i][3]); said.textContent = `${PH[i][0]}, ${PH[i][1]} minutes`; }
      if (p < 1) requestAnimationFrame(tick); else finish();
    };
    requestAnimationFrame(tick);
  });

  // Next open: half-hour slots from now, inside opening hours (6 am to 10 pm, last start 9:30 pm).
  // A few are already taken, never the very first one. Booking is a demo: nothing is sent.
  const slots = document.getElementById('slots'), go = document.getElementById('go'), len = document.getElementById('len'), done = document.getElementById('done');
  let room = 'Cedar room', roomLen = '60 min', pick = null;
  const fmt = d => { let h = d.getHours(), m = d.getMinutes(); const ap = h >= 12 ? 'pm' : 'am'; h = h % 12 || 12; return `${h}:${String(m).padStart(2, '0')} ${ap}`; };
  const OPEN = 6, LAST = 21.5;
  function nextSlot(d) {
    const t = d.getHours() + d.getMinutes() / 60;
    if (t < OPEN) d.setHours(OPEN, 0, 0, 0);
    else if (t > LAST) { d.setDate(d.getDate() + 1); d.setHours(OPEN, 0, 0, 0); }
    return d;
  }
  function render() {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    let d = new Date(); d.setSeconds(0, 0); d.setMinutes(d.getMinutes() < 30 ? 30 : 60); d = nextSlot(d);
    const seed = room.length; slots.textContent = ''; pick = null; done.textContent = '';
    for (let i = 0; i < 6; i++) {
      const at = new Date(d), day = Math.round((new Date(at).setHours(0, 0, 0, 0) - today) / 864e5);
      const taken = i > 0 && (i * 7 + seed) % 5 === 0;
      const when = day === 0 ? '' : day === 1 ? 'Tomorrow' : at.toLocaleDateString('en-US', { weekday: 'short' });
      const b = document.createElement('button'); b.type = 'button'; b.disabled = taken; b.setAttribute('aria-pressed', 'false');
      const small = document.createElement('small'); small.textContent = taken ? 'Taken' : when || (i === 0 ? 'Next' : 'Open');
      b.append(fmt(at), small);
      const label_ = `${when ? when.toLowerCase() + ' at ' : ''}${fmt(at)}`;
      b.setAttribute('aria-label', `${label_}, ${taken ? 'taken' : 'open'}`);
      b.addEventListener('click', () => { slots.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', 'false')); b.setAttribute('aria-pressed', 'true'); pick = label_; done.textContent = ''; label(); });
      slots.appendChild(b);
      if (!taken && pick === null) { pick = label_; b.setAttribute('aria-pressed', 'true'); }
      d = nextSlot(new Date(at.getTime() + 30 * 60000));
    }
    label();
  }
  function label() { go.textContent = `Book ${pick}`; len.textContent = `${room}, ${roomLen}. Robe, towels and water are on us.`; }
  go.addEventListener('click', () => { done.textContent = `Demo only: nothing was booked or sent. A real Basalt would now hold ${pick} in the ${room.toLowerCase()} for you.`; });
  document.querySelectorAll('.tabs button').forEach(b => b.addEventListener('click', () => {
    document.querySelectorAll('.tabs button').forEach(x => x.setAttribute('aria-pressed', 'false'));
    b.setAttribute('aria-pressed', 'true'); room = b.dataset.room; roomLen = b.dataset.len; render();
  }));
  render();
})();
