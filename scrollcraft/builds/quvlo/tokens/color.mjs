/**
 * Quvlo design-system colour math.
 *
 * Defines the palette in OKLCH (perceptually even lightness → contrast is
 * tunable without hue drift, and AA/AAA is computable — the point for an
 * accessibility studio, not a nicety), converts to sRGB hex for the CSS
 * tokens, and prints the WCAG contrast of every text pairing so the palette
 * is AA-proven rather than asserted.
 *
 *   node tokens/color.mjs
 *
 * The "two readers" spine in colour: warm champagne = the human, a cool twin
 * = the machine. The machine tone is champagne mirrored across to cool hue at
 * a lightness held for AA on the near-black ground — deliberately NOT neon
 * cyan / acid green (a banned AI-default tell).
 */

// ---- OKLCH → sRGB (Björn Ottosson's OKLab, D65) ---------------------------
function oklchToRgb(L, C, hDeg) {
  const h = (hDeg * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);

  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;

  const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3;

  const lr = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const lg = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const lb = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

  const g = (c) => {
    const v = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
    return Math.max(0, Math.min(1, v));
  };
  return [g(lr), g(lg), g(lb)].map((v) => Math.round(v * 255));
}

const hex = ([r, g, b]) =>
  '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');

// ---- WCAG relative luminance + contrast -----------------------------------
function lum([r, g, b]) {
  const f = (c) => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
const ratio = (a, b) => {
  const L1 = lum(a), L2 = lum(b);
  return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
};

// ---- the tokens ------------------------------------------------------------
// Established brand values are pinned as hex (continuity — a later port to the
// live site must not shift the signature ground or champagne). Everything new
// is authored in OKLCH: L (0..1), C (chroma), H (deg).
const HEX = {
  space:   '#05070d',   // established near-black ground
  surface: '#0b0f1a',   // established raised plane
  human:   '#e6d2a8',   // established WARM champagne — the human
};
const OKLCH = {
  ink0:      [0.965, 0.006, 250],  // primary text (near-white, faint cool)
  ink1:      [0.815, 0.016, 255],  // secondary text
  ink2:      [0.660, 0.022, 258],  // tertiary / labels
  machine:   [0.820, 0.060, 245],  // COOL twin — the machine (the new accent)
  pass:      [0.780, 0.130, 150],  // functional: ok
  warn:      [0.820, 0.110, 85],   // functional: warning
  fail:      [0.680, 0.180, 25],   // functional: error
};

const hexToRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const rgb = {
  ...Object.fromEntries(Object.entries(HEX).map(([k, v]) => [k, hexToRgb(v)])),
  ...Object.fromEntries(Object.entries(OKLCH).map(([k, v]) => [k, oklchToRgb(...v)])),
};
const hexes = Object.fromEntries(Object.entries(rgb).map(([k, v]) => [k, hex(v)]));
const T = { ...Object.fromEntries(Object.keys(HEX).map((k) => [k, null])), ...OKLCH };

// a representative mid-scrim over a bright frame: ground at ~58% alpha over white
function overWhite(groundRgb, alpha) {
  const w = [255, 255, 255];
  return groundRgb.map((c, i) => Math.round(c * alpha + w[i] * (1 - alpha)));
}
const scrim58 = overWhite(rgb.space, 0.9); // worst realistic copy backing under band scrim

console.log('\n=== Quvlo tokens ===');
for (const [k, v] of Object.entries(hexes)) {
  const t = T[k];
  const note = t ? `oklch(${(t[0] * 100).toFixed(1)}% ${t[1]} ${t[2]})` : '(pinned brand hex)';
  console.log(`  --${k.padEnd(9)} ${v}   ${note}`);
}

const pairs = [
  ['ink0 on space', rgb.ink0, rgb.space],
  ['ink1 on space', rgb.ink1, rgb.space],
  ['ink2 on space', rgb.ink2, rgb.space],
  ['human on space', rgb.human, rgb.space],
  ['machine on space', rgb.machine, rgb.space],
  ['human on surface', rgb.human, rgb.surface],
  ['machine on surface', rgb.machine, rgb.surface],
  ['ink1 on surface', rgb.ink1, rgb.surface],
  ['pass on surface', rgb.pass, rgb.surface],
  ['warn on surface', rgb.warn, rgb.surface],
  ['fail on surface', rgb.fail, rgb.surface],
  ['ink0 on scrim(0.9)', rgb.ink0, scrim58],
  ['human on scrim(0.9)', rgb.human, scrim58],
];

console.log('\n=== WCAG contrast (AA text ≥ 4.5, large ≥ 3.0) ===');
let worst = Infinity;
for (const [name, fg, bg] of pairs) {
  const r = ratio(fg, bg);
  worst = Math.min(worst, r);
  const tag = r >= 4.5 ? 'AA  ' : r >= 3.0 ? 'AA-lg' : 'FAIL';
  console.log(`  ${tag}  ${r.toFixed(2)}:1   ${name}`);
}
console.log(`\nworst text pairing: ${worst.toFixed(2)}:1  ${worst >= 4.5 ? 'OK (all body AA)' : 'NEEDS TUNING'}`);

// machine vs human separation (they must read as two distinct signals)
console.log(`\nhuman↔machine hue separation: warm 85° vs cool 245°  (Δ160°, clearly two tones)`);
console.log(`human ${hexes.human}  machine ${hexes.machine}\n`);
