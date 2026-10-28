(() => {
  requestAnimationFrame(() => document.documentElement.classList.add('drawn'));

  const LAPELS = {
    notch: 'M200 300 Q152 205 112 122 L131 113 L125 101 L150 56 Z',
    peak: 'M200 300 Q150 196 100 98 L136 111 L150 56 Z',
    shawl: 'M200 300 C162 232 118 150 128 92 C133 72 142 61 150 56 Z'
  };
  const CLOTH = {
    navy: ['Navy worsted', 'Year-round and endlessly useful. The one to start with.'],
    flannel: ['Charcoal flannel', 'Soft, warm and quietly serious. Best from November to February.'],
    tropical: ['Gray tropical', 'An open weave that breathes. Built for Texas summers.'],
    linen: ['Olive linen', 'Relaxed and textured. Outdoor weddings and long lunches.']
  };
  const LINING = { claret: ['Claret', '#5e1f2b'], bottle: ['Bottle green', '#1f4a39'], sky: ['Sky', '#8fb0d3'], dove: ['Dove gray', '#b9b6ae'] };
  const state = { cloth: 'navy', lapel: 'notch', lining: 'claret' };
  const lapels = document.getElementById('lapels');

  function drawLapels() {
    const d = LAPELS[state.lapel];
    lapels.innerHTML =
      `<path d="${d}" fill="url(#clothfill)"/><path d="${d}" fill="#fff" fill-opacity=".06"/>` +
      `<g transform="translate(400 0) scale(-1 1)"><path d="${d}" fill="url(#clothfill)"/><path d="${d}" fill="#000" fill-opacity=".08"/></g>` +
      `<g fill="none" stroke="#ece9e1" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" filter="url(#chalk2)" opacity=".9">` +
      `<path d="${d}"/><path d="${d}" transform="translate(400 0) scale(-1 1)"/></g>`;
  }
  function render() {
    document.getElementById('clothimg').setAttribute('href', `img/cloth-${state.cloth}.jpg`);
    document.getElementById('lining').setAttribute('fill', LINING[state.lining][1]);
    drawLapels();
    document.getElementById('why').textContent = CLOTH[state.cloth][1];
    document.getElementById('sumtxt').textContent = `${CLOTH[state.cloth][0]}, ${state.lapel === 'shawl' ? 'shawl collar' : `${state.lapel} lapel`}, ${LINING[state.lining][0].toLowerCase()} lining.`;
  }
  for (const [id, key] of [['o-cloth', 'cloth'], ['o-lapel', 'lapel'], ['o-lining', 'lining']]) {
    document.getElementById(id).addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      state[key] = b.dataset.v;
      b.parentElement.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b));
      render();
    });
  }
  render();

  document.getElementById('carryBtn').addEventListener('click', () => {
    const c = document.getElementById('carry');
    c.textContent = `Bringing: ${document.getElementById('sumtxt').textContent}`;
    c.hidden = false;
  });
  document.querySelector('.for').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    b.parentElement.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b));
  });
  document.getElementById('f').addEventListener('submit', e => {
    e.preventDefault();
    const nm = document.getElementById('nm'), em = document.getElementById('em');
    const name = nm.value.trim(), email = em.value.trim();
    const okEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    nm.setAttribute('aria-invalid', !name); em.setAttribute('aria-invalid', !okEmail);
    const err = document.getElementById('ferr');
    err.textContent = !name && !okEmail ? 'Add your name and an email address.' : !name ? 'Add your name.' : !okEmail ? 'That email address doesn’t look right.' : '';
    if (!name) return nm.focus();
    if (!okEmail) return em.focus();
    document.getElementById('formWrap').classList.add('sent');
    document.querySelector('#formWrap .ok').focus();
  });
})();
