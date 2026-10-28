// Renders the share card and the touch icon straight into public/.
// Run from the repo root: NODE_PATH=$(npm root -g) node tools/og-image/render.mjs
// Writes public/og-image.jpg (1200x630) and public/apple-touch-icon.png (180x180).
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const here = new URL('.', import.meta.url), pub = fileURLToPath(new URL('../../public/', import.meta.url));
const b = await chromium.launch();
let p = await b.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await p.goto(new URL('card.html', here).href, { waitUntil: 'networkidle' }); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
await p.screenshot({ path: pub + 'og-image.jpg', type: 'jpeg', quality: 86 });
p = await b.newPage({ viewport: { width: 180, height: 180 }, deviceScaleFactor: 1 });
await p.goto(new URL('icon.html', here).href, { waitUntil: 'networkidle' }); await p.waitForTimeout(200);
await p.screenshot({ path: pub + 'apple-touch-icon.png' });
await b.close();
