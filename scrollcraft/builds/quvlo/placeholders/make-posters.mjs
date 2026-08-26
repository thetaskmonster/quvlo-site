/**
 * Generates the six leg posters for the Quvlo worldflight scaffold.
 *
 * These are PLACEHOLDERS. In Route A they get replaced, leg for leg, by frames
 * pulled from the kie.ai video render (poster = first frame of each encoded
 * clip). Until then they carry the whole story on their own: with no <video>
 * mounted, the engine cross-dissolves these stills through the real seams at
 * the real scroll positions, which is exactly the reduced-motion experience.
 *
 * Aesthetic (from BRIEF.md): champagne light on near-black, matte and
 * engineered — a lit scale model / orrery / architectural section. One accent.
 * No glow, no gradients-as-decoration, no sci-fi. Line-drawing instruments.
 *
 * Node, no dependencies:  node placeholders/make-posters.mjs
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const OUT = dirname(fileURLToPath(import.meta.url));
const W = 1600, H = 900, CX = W / 2, CY = H / 2;

// Quvlo tokens — the champagne is the ONE accent; everything else is ink on space.
const SPACE = '#05070d';
const CHAMP = '#e6d2a8';
const INK   = '#8b96a8';
const INK_2 = '#4a5568';

const R = (n) => Math.round(n * 1000) / 1000;

/** A faint reference grid — the "engineered" substrate every frame shares. */
function grid() {
  let p = '';
  for (let x = 0; x <= W; x += 80) p += `<line x1="${x}" y1="0" x2="${x}" y2="${H}"/>`;
  for (let y = 0; y <= H; y += 80) p += `<line x1="0" y1="${y}" x2="${W}" y2="${y}"/>`;
  return `<g stroke="${INK_2}" stroke-width="1" opacity="0.14">${p}</g>`;
}

/** Corner registration ticks — the instrument frame. */
function ticks() {
  const m = 46, l = 26;
  const c = (x, y, dx, dy) =>
    `<path d="M${x} ${y} h${dx * l} M${x} ${y} v${dy * l}" />`;
  return `<g stroke="${CHAMP}" stroke-width="2" opacity="0.55" fill="none">
    ${c(m, m, 1, 1)}${c(W - m, m, -1, 1)}${c(m, H - m, 1, -1)}${c(W - m, H - m, -1, -1)}
  </g>`;
}

function label(x, y, text, opts = {}) {
  const { size = 20, fill = CHAMP, anchor = 'start', spacing = 3, op = 0.85 } = opts;
  return `<text x="${x}" y="${y}" font-family="'Space Mono',ui-monospace,monospace"
    font-size="${size}" letter-spacing="${spacing}" fill="${fill}" opacity="${op}"
    text-anchor="${anchor}">${text}</text>`;
}

/** Concentric aperture / orrery ring set. */
function aperture(cx, cy, r, rings = 4, op = 1) {
  let g = '';
  for (let i = 0; i < rings; i++) {
    const rr = r * (1 - i * (0.7 / rings));
    g += `<circle cx="${cx}" cy="${cy}" r="${R(rr)}" fill="none" stroke="${CHAMP}"
      stroke-width="${i === 0 ? 2.5 : 1.25}" opacity="${op * (1 - i * 0.16)}"/>`;
  }
  // aperture blades
  for (let a = 0; a < 8; a++) {
    const th = (a / 8) * Math.PI * 2;
    const x1 = cx + Math.cos(th) * r * 0.3, y1 = cy + Math.sin(th) * r * 0.3;
    const x2 = cx + Math.cos(th) * r, y2 = cy + Math.sin(th) * r;
    g += `<line x1="${R(x1)}" y1="${R(y1)}" x2="${R(x2)}" y2="${R(y2)}"
      stroke="${INK}" stroke-width="1" opacity="${op * 0.4}"/>`;
  }
  return g;
}

/** A small "web page" as a lit panel of stacked bars — the thing we fly into. */
function pagePanel(cx, cy, w, h, op = 1) {
  const x = cx - w / 2, y = cy - h / 2;
  let bars = '';
  const rows = [0.16, 0.32, 0.44, 0.56, 0.68, 0.8];
  const widths = [0.7, 0.9, 0.55, 0.85, 0.4, 0.75];
  rows.forEach((ry, i) => {
    bars += `<rect x="${R(x + w * 0.1)}" y="${R(y + h * ry)}" width="${R(w * 0.8 * widths[i])}"
      height="${R(h * 0.055)}" rx="3" fill="${CHAMP}" opacity="${op * (i === 0 ? 0.9 : 0.32)}"/>`;
  });
  return `<g>
    <rect x="${R(x)}" y="${R(y)}" width="${R(w)}" height="${R(h)}" rx="10"
      fill="none" stroke="${CHAMP}" stroke-width="2" opacity="${op}"/>
    <rect x="${R(x)}" y="${R(y)}" width="${R(w)}" height="${R(h * 0.1)}" rx="10"
      fill="${CHAMP}" opacity="${op * 0.12}"/>
    ${bars}</g>`;
}

/** Wrap the drawing into a full SVG document. */
function doc(inner, wm) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"
  role="img" aria-label="${wm}">
  <rect width="${W}" height="${H}" fill="${SPACE}"/>
  ${grid()}
  ${inner}
  ${ticks()}
  ${label(56, H - 44, 'QUVLO', { size: 22, spacing: 6 })}
  ${label(W - 56, H - 44, wm.toUpperCase(), { anchor: 'end', size: 18, fill: INK, spacing: 5, op: 0.7 })}
  ${label(56, 74, 'PLACEHOLDER · SCROLLCRAFT WORLDFLIGHT', { size: 14, fill: INK, spacing: 4, op: 0.5 })}
</svg>`;
}

// ---- perspective helper: fall toward a vanishing point ----------------------
function falling(vpY, depth) {
  let g = '';
  const spokes = 16;
  for (let i = 0; i < spokes; i++) {
    const th = (i / spokes) * Math.PI * 2;
    const x = CX + Math.cos(th) * W;
    const y = CY + Math.sin(th) * H;
    g += `<line x1="${R(CX)}" y1="${R(vpY)}" x2="${R(x)}" y2="${R(y)}"
      stroke="${INK}" stroke-width="1" opacity="0.22"/>`;
  }
  for (let i = 1; i <= depth; i++) {
    const r = i * (W * 0.06);
    g += `<circle cx="${CX}" cy="${vpY}" r="${R(r)}" fill="none"
      stroke="${CHAMP}" stroke-width="${R(2.4 - i * 0.18)}" opacity="${R(0.9 - i * 0.08)}"/>`;
  }
  return g;
}

// =============================================================== the six legs
const legs = {
  // 1 · SURFACE — a perfect instrument at rest, seen from above.
  'p1-surface': doc(`
    ${aperture(CX, CY, 300, 5, 0.85)}
    ${pagePanel(CX, CY, 300, 190, 0.9)}
    ${label(CX, CY + 250, 'SURFACE', { anchor: 'middle', size: 26, spacing: 8 })}
    ${label(CX, CY - 250, 'A PAGE, AT REST', { anchor: 'middle', size: 16, fill: INK, spacing: 5, op: 0.7 })}
  `, 'Leg 1 — Surface'),

  // 2 · DESCENT — the ground opens, we fall inward.
  'p2-descent': doc(`
    ${falling(CY, 6)}
    ${aperture(CX, CY, 130, 3, 0.6)}
    ${label(CX, H - 110, 'DESCENT', { anchor: 'middle', size: 26, spacing: 8 })}
    ${label(120, CY, '↓', { size: 40, op: 0.5 })}
    ${label(W - 120, CY, '↓', { anchor: 'end', size: 40, op: 0.5 })}
  `, 'Leg 2 — Descent'),

  // 3 · THE LATTICE — hidden order revealed. The document as a section drawing.
  'p3-lattice': doc(`
    ${(() => {
      // nested orthographic boxes = the DOM tree, drawn as a structural section
      let g = '';
      const boxes = [
        [CX - 420, CY - 220, 840, 440, 'html', 0.9],
        [CX - 380, CY - 150, 500, 300, 'main', 0.7],
        [CX + 150, CY - 150, 230, 130, 'nav', 0.7],
        [CX - 350, CY - 110, 180, 90, 'h1', 0.6],
        [CX - 150, CY - 110, 240, 90, 'section', 0.6],
        [CX - 350, CY + 10, 430, 120, 'article', 0.55],
        [CX + 150, CY + 10, 230, 130, 'button', 0.8],
      ];
      boxes.forEach(([x, y, w, h, name, op]) => {
        g += `<rect x="${R(x)}" y="${R(y)}" width="${w}" height="${h}" rx="6"
          fill="none" stroke="${CHAMP}" stroke-width="1.4" opacity="${op}"/>`;
        g += label(x + 12, y + 26, `<${name}>`, { size: 15, fill: INK, spacing: 1, op: op });
      });
      // connective spines
      g += `<line x1="${CX - 260}" y1="${CY - 150}" x2="${CX - 260}" y2="${CY + 10}"
        stroke="${INK}" stroke-width="1" opacity="0.4"/>`;
      return g;
    })()}
    ${label(CX, H - 90, 'THE LATTICE', { anchor: 'middle', size: 26, spacing: 8 })}
  `, 'Leg 3 — The Lattice'),

  // 4 · TWO READERS — two travellers on one path.
  'p4-two-readers': doc(`
    ${(() => {
      let g = '';
      // one path, two rails
      const y0 = 180, y1 = H - 200;
      [CX - 150, CX + 150].forEach((x, i) => {
        g += `<line x1="${x}" y1="${y0}" x2="${x}" y2="${y1}"
          stroke="${INK}" stroke-width="1.5" opacity="0.4"/>`;
        // traveller marker
        const my = CY - 40;
        if (i === 0) {
          // human: an eye glyph
          g += `<g transform="translate(${x} ${my})">
            <path d="M-42 0 Q0 -34 42 0 Q0 34 -42 0 Z" fill="none" stroke="${CHAMP}" stroke-width="2.2"/>
            <circle r="13" fill="none" stroke="${CHAMP}" stroke-width="2.2"/>
            <circle r="4" fill="${CHAMP}"/></g>`;
          g += label(x, y1 + 46, 'HUMAN', { anchor: 'middle', size: 16, spacing: 5 });
        } else {
          // agent: a bracketed cursor glyph
          g += `<g transform="translate(${x} ${my})" fill="none" stroke="${CHAMP}" stroke-width="2.2">
            <path d="M-40 -26 h-16 v52 h16"/><path d="M40 -26 h16 v52 h-16"/>
            <line x1="-14" y1="0" x2="14" y2="0"/><line x1="0" y1="-14" x2="0" y2="14"/></g>`;
          g += label(x, y1 + 46, 'AGENT', { anchor: 'middle', size: 16, spacing: 5 });
        }
      });
      // the held-beat marker at the bottom (authored silence)
      g += `<circle cx="${CX}" cy="${y1 - 8}" r="6" fill="${CHAMP}" opacity="0.8"/>`;
      g += label(CX, y1 + 40, '·', { anchor: 'middle', size: 30, op: 0.4 });
      return g;
    })()}
    ${label(CX, 130, 'TWO READERS', { anchor: 'middle', size: 26, spacing: 8 })}
  `, 'Leg 4 — Two Readers'),

  // 5 · THE AGENT'S EYE [PEAK] — the surface becomes what the machine reads.
  //     This still sits BEHIND the live Agent's-Eye overlay, so it stays quiet.
  'p5-agents-eye': doc(`
    ${(() => {
      let g = '';
      // left: the rendered page, dissolving to the right into tokens
      g += pagePanel(CX - 360, CY, 300, 200, 0.5);
      // scanning reticle sweeping right
      g += `<line x1="${CX - 200}" y1="${CY - 240}" x2="${CX - 200}" y2="${CY + 240}"
        stroke="${CHAMP}" stroke-width="2" opacity="0.7"/>`;
      g += `<path d="M${CX - 200} ${CY - 240} l14 10 l-14 10" fill="${CHAMP}" opacity="0.7"/>`;
      // right: the semantic reading
      const tokens = ['h1  "Can an AI use your site?"', 'nav  6 links', 'button  "Start here"',
        'main  landmark', 'img  alt: missing', 'form  label: ok'];
      tokens.forEach((t, i) => {
        const ty = CY - 150 + i * 56;
        g += `<rect x="${CX - 40}" y="${ty - 26}" width="440" height="40" rx="5"
          fill="none" stroke="${INK}" stroke-width="1" opacity="0.35"/>`;
        g += label(CX - 22, ty, t, { size: 17, fill: CHAMP, spacing: 1, op: 0.85 });
      });
      return g;
    })()}
    ${label(CX, H - 80, "THE AGENT'S EYE", { anchor: 'middle', size: 26, spacing: 8 })}
  `, "Leg 5 — The Agent's Eye"),

  // 6 · RETURN — back to the surface, now understood. One clear action.
  'p6-return': doc(`
    ${aperture(CX, CY, 260, 4, 0.7)}
    ${pagePanel(CX, CY, 280, 170, 0.85)}
    ${(() => {
      // the single target marker on the CTA
      const ty = CY + 45;
      return `<circle cx="${CX}" cy="${ty}" r="30" fill="none" stroke="${CHAMP}" stroke-width="2.5"/>
        <circle cx="${CX}" cy="${ty}" r="6" fill="${CHAMP}"/>
        <line x1="${CX}" y1="${ty - 52}" x2="${CX}" y2="${ty - 34}" stroke="${CHAMP}" stroke-width="2"/>
        <line x1="${CX}" y1="${ty + 34}" x2="${CX}" y2="${ty + 52}" stroke="${CHAMP}" stroke-width="2"/>
        <line x1="${CX - 52}" y1="${ty}" x2="${CX - 34}" y2="${ty}" stroke="${CHAMP}" stroke-width="2"/>
        <line x1="${CX + 34}" y1="${ty}" x2="${CX + 52}" y2="${ty}" stroke="${CHAMP}" stroke-width="2"/>`;
    })()}
    ${label(CX, CY - 250, 'UNDERSTOOD', { anchor: 'middle', size: 16, fill: INK, spacing: 5, op: 0.7 })}
    ${label(CX, H - 90, 'RETURN · START HERE', { anchor: 'middle', size: 26, spacing: 8 })}
  `, 'Leg 6 — Return'),
};

let n = 0;
for (const [name, svg] of Object.entries(legs)) {
  writeFileSync(join(OUT, name + '.svg'), svg.trim() + '\n');
  n++;
}
console.log(`wrote ${n} posters to ${OUT}`);
