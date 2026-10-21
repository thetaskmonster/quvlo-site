(() => {
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- the tide: each answered question lowers and quiets the water
  const LEVEL = [.30, .44, .57, .69];      // waterline, as a share of the gauge height
  const SWELL = [1, .52, .24, .06];        // wave height
  const CHOP = [1, .6, .28, .04];          // short choppy ripples on top of the swell
  const PACE = [1.2, .8, .5, .26];         // how fast the water moves
  const WORD = ['Restless', 'Easing', 'Settling', 'Still'];
  const gauge = document.getElementById('gauge'), svg = document.getElementById('sea');
  const staff = [...document.querySelectorAll('#staff span')];
  const stateWord = document.getElementById('stateWord'), stateCount = document.getElementById('stateCount');
  const NS = 'http://www.w3.org/2000/svg';
  if (calm) { gauge.classList.add('calm'); gauge.querySelector('.state .k').textContent = 'Your answers so far'; }
  const el = (n, a) => { const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, a[k]); return e; };
  svg.innerHTML = '<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cbd2cd"/><stop offset=".55" stop-color="#aab5b0"/><stop offset="1" stop-color="#919e9a"/></linearGradient>' +
    '<radialGradient id="fogband" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#e8ece7" stop-opacity=".42"/><stop offset=".45" stop-color="#e8ece7" stop-opacity=".2"/><stop offset="1" stop-color="#e8ece7" stop-opacity="0"/></radialGradient>' +
    '<linearGradient id="water" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#55675f" stop-opacity=".9"/><stop offset=".3" stop-color="#34453f" stop-opacity=".94"/><stop offset="1" stop-color="#18221f"/></linearGradient>' +
    '<linearGradient id="sheen" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e2e6e1" stop-opacity=".26"/><stop offset="1" stop-color="#e2e6e1" stop-opacity="0"/></linearGradient></defs>';
  const sky = el('rect', { x: 0, y: 0, fill: 'url(#sky)' });
  const fogA = el('ellipse', { fill: 'url(#fogband)' }), fogB = el('ellipse', { fill: 'url(#fogband)' });
  const staffG = el('g', {});                      // the tide board: painted once per resize
  const wet = el('rect', { fill: '#2c3a36', 'fill-opacity': '.34' });   // the stain the water leaves as it drops
  const back = el('path', { fill: 'none', stroke: '#e2e6e1', 'stroke-opacity': '.3', 'stroke-width': '1.2' });
  const water = el('path', { fill: 'url(#water)' });
  const sheen = el('path', { fill: 'url(#sheen)' });
  const depth = [0, 1, 2].map(i => el('path', { fill: 'none', stroke: '#e2e6e1', 'stroke-opacity': (.16 - i * .04).toFixed(2), 'stroke-width': '1' }));
  const line = el('path', { fill: 'none', stroke: '#eef1ed', 'stroke-width': '1.6', 'stroke-linejoin': 'round' });
  const mark = el('line', { x1: 0, stroke: '#17201e', 'stroke-opacity': '.38', 'stroke-width': '1.2', 'stroke-dasharray': '3 6', 'stroke-linecap': 'round', opacity: '0' });
  svg.append(sky, fogA, fogB, staffG, wet, mark, back, water, sheen, ...depth, line);

  let W = 0, H = 0, n = 0, t = 0, SX = 0, SW = 0;
  const target = i => ({ l: LEVEL[i], s: SWELL[i], c: CHOP[i], p: PACE[i] });
  const cur = calm ? target(3) : target(0);   // reduced motion: the water simply sits at its final level
  let goal = target(0);

  function size() {
    const r = gauge.getBoundingClientRect(); W = Math.round(r.width); H = Math.round(r.height);
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    sky.setAttribute('width', W); sky.setAttribute('height', H);
    fogA.setAttribute('cx', W * .3); fogA.setAttribute('cy', H * .14); fogA.setAttribute('rx', W * 1.1); fogA.setAttribute('ry', H * .16);
    fogB.setAttribute('cx', W * .75); fogB.setAttribute('cy', H * .5); fogB.setAttribute('rx', W * 1.2); fogB.setAttribute('ry', H * .13);
    mark.setAttribute('x2', W); mark.setAttribute('y1', LEVEL[0] * H); mark.setAttribute('y2', LEVEL[0] * H);
    // tide board: a painted post with E-shaped marks, like the ones on harbour walls
    const phone = W < 600 && H < 300;
    SW = phone ? 16 : 26; SX = W - (phone ? 30 : 64);
    const top = phone ? -4 : H * .1, step = phone ? 9 : Math.max(12, H * .022);
    let g = `<rect x="${SX}" y="${top}" width="${SW}" height="${H - top + 4}" rx="2" fill="#e4e8e3"/>`;
    for (let y = top + step, i = 0; y < H; y += step, i++) {
      const long = i % 5 === 4;
      g += `<rect x="${SX + (long ? 0 : SW * .45)}" y="${y.toFixed(1)}" width="${(long ? SW : SW * .55).toFixed(1)}" height="${(step * .42).toFixed(1)}" fill="#1f2b28" fill-opacity="${long ? .78 : .5}"/>`;
    }
    g += `<rect x="${SX + SW - 2}" y="${top}" width="2" height="${H - top}" fill="#000" fill-opacity=".12"/>`;
    staffG.innerHTML = g;
    wet.setAttribute('x', SX); wet.setAttribute('width', SW);
    draw();
  }
  function wave(base, amp, chop, ph) {
    const pts = [];
    for (let x = 0; x <= W + 6; x += 6) {
      const y = base + amp * (.58 * Math.sin(x * .014 + ph) + .32 * Math.sin(x * .031 - ph * 1.5 + 1.3) + chop * .42 * Math.sin(x * .083 + ph * 2.6 + .4));
      pts.push(x.toFixed(1) + ' ' + y.toFixed(2));
    }
    return 'M' + pts.join(' L');
  }
  function draw() {
    if (!W) return;
    const A = Math.min(Math.max(H * .032, 9), 24) * cur.s, base = cur.l * H;
    const top = wave(base, A, cur.c, t);
    line.setAttribute('d', top);
    water.setAttribute('d', `${top} L${W + 6} ${H} L0 ${H} Z`);
    sheen.setAttribute('d', `${top} L${W + 6} ${base + 70} L0 ${base + 70} Z`);
    back.setAttribute('d', wave(base - A * 1.1 - 8, A * .55, cur.c * .5, t * .8 + 2.1));
    depth.forEach((d, i) => { d.setAttribute('d', wave(base + (i + 1) * Math.max(16, H * .045), A * (.45 - i * .1), cur.c * .3, t * .9 + i * 1.7)); d.setAttribute('stroke-opacity', ((.17 - i * .045) * (.2 + .8 * cur.s)).toFixed(3)); });
    const start = LEVEL[0] * H, wetTop = start - A * .2;
    wet.setAttribute('y', wetTop.toFixed(1)); wet.setAttribute('height', calm ? 0 : Math.max(0, base - wetTop).toFixed(1));
  }
  let last = 0, running = false, visible = false;
  function frame(now) {
    const dt = Math.min(.05, (now - (last || now)) / 1000); last = now;
    const k = 1 - Math.exp(-dt / .85);   // settles over about two and a half seconds
    for (const key in cur) cur[key] += (goal[key] - cur[key]) * k;
    t += dt * cur.p * 1.6;
    draw();
    if (visible) requestAnimationFrame(frame); else { running = false; last = 0; }
  }
  function wake() { if (!running && visible && !calm) { running = true; requestAnimationFrame(frame); } }
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; wake(); }).observe(gauge);
  new ResizeObserver(size).observe(gauge);

  // ---- the questions
  const qs = document.getElementById('qs'), live = document.getElementById('live');
  const result = document.getElementById('result');
  const PEOPLE = {
    listen: { name: 'Iris', how: 'Iris listens closely and says back what she hears, so you can hear it too. Sessions follow your lead rather than a plan, and she is comfortable letting a thought take its time.' },
    practical: { name: 'Theo', how: 'Theo is clear and structured. Most sessions end with one small thing to try before the next, and he draws on cognitive behavioural approaches when they help.' },
    direct: { name: 'Mara', how: 'Mara is warm and plain-spoken. She will gently name the thing you keep circling, then stay with you while you look at it.' },
    gentle: { name: 'Wren', how: 'Wren is unhurried and at ease with silence. Nothing is pushed before you are ready, including in the first session.' }
  };
  const FOCUS = { worry: 'Anxiety and overthinking', grief: 'Grief and loss', rel: 'Relationships, together or on your own', work: 'Burnout and work stress', change: 'Big life changes', unsure: 'People still working out what they need' };
  const HOURS = { morning: 'Weekday mornings', afternoon: 'Weekday afternoons', evening: 'Weekday evenings', saturday: 'Saturday mornings' };
  const val = name => { const c = qs.querySelector(`input[name="${name}"]:checked`); return c ? c.value : null; };

  function update(fromUser) {
    const prev = n;
    n = ['bring', 'talk', 'when'].filter(val).length;
    goal = target(n); wake();
    if (calm) draw();
    gauge.classList.toggle('started', n > 0);
    mark.setAttribute('opacity', n > 0 && !calm ? '.9' : '0');
    staff.forEach((s, i) => { s.classList.toggle('on', i === n); s.classList.toggle('past', i < n); });
    stateWord.textContent = WORD[n];
    stateCount.textContent = n === 3 ? 'All three answered' : `${n} of 3 answered`;
    if (n === 3) {
      const p = PEOPLE[val('talk')];
      document.getElementById('r-name').textContent = p.name;
      document.getElementById('r-mono').textContent = p.name[0];
      document.getElementById('r-how').textContent = p.how;
      document.getElementById('r-focus').textContent = FOCUS[val('bring')];
      document.getElementById('r-hours').textContent = HOURS[val('when')];
      const first = result.hidden; result.hidden = false;
      if (fromUser && first) live.textContent = `Still. All three answered. We'd suggest a therapist like ${p.name}; the suggestion is below the questions.`;
    } else {
      result.hidden = true;
      if (fromUser && n !== prev) live.textContent = `${WORD[n]}. ${n} of 3 answered.`;
    }
  }
  qs.addEventListener('change', () => update(true));
  document.getElementById('resetBtn').addEventListener('click', () => {
    qs.reset(); update(true);
    qs.querySelector('input').focus();
  });

  // ---- carry the suggestion into the private request
  const carry = document.getElementById('carry'), carryTxt = document.getElementById('carryTxt');
  const nm = document.getElementById('nm'), em = document.getElementById('em'), wk = document.getElementById('wk'), cb = document.getElementById('ok-cb');
  document.getElementById('carryBtn').addEventListener('click', () => {
    const p = PEOPLE[val('talk')];
    carryTxt.textContent = `${p.name}, ${HOURS[val('when')].toLowerCase()}`;
    wk.value = val('when');
    carry.hidden = false;
    document.getElementById('request').scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start' });
    setTimeout(() => nm.focus({ preventScroll: true }), calm ? 0 : 650);
  });
  document.getElementById('dropCarry').addEventListener('click', () => { carry.hidden = true; nm.focus(); });

  // ---- request form: validates, then shows a confirmation. Nothing is sent anywhere.
  const req = document.getElementById('req'), ok = document.getElementById('ok');
  const setErr = (input, id, msg) => { input.setAttribute('aria-invalid', msg ? 'true' : 'false'); document.getElementById(id).textContent = msg; };
  req.addEventListener('submit', e => {
    e.preventDefault();
    const name = nm.value.trim().replace(/\s+/g, ' ').slice(0, 40), email = em.value.trim();
    const okName = name.length > 0, okEmail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) && email.length <= 120;
    setErr(nm, 'nm-err', okName ? '' : 'Any name you like to be called.');
    setErr(em, 'em-err', okEmail ? '' : 'An email we can reply to, like name@example.com.');
    setErr(cb, 'cb-err', cb.checked ? '' : 'Please tick this so we know you have seen it.');
    if (!okName) return nm.focus();
    if (!okEmail) return em.focus();
    if (!cb.checked) return cb.focus();
    document.getElementById('okTitle').textContent = `Thank you, ${name}.`;   // textContent: the name is never parsed as HTML
    req.hidden = true; ok.hidden = false; ok.focus();
    req.reset();
  });

  // ---- studio pill appears once the hero has scrolled away
  const pill = document.querySelector('.quvlo');
  new IntersectionObserver(([e]) => { pill.style.opacity = e.isIntersecting ? 0 : 1; }).observe(document.querySelector('.hero'));

  update(false); size();
})();
