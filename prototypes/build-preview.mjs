/**
 * Generates the self-contained review copy of the Agent Teardown page.
 *
 * agent-teardown-site.html is the source of truth and references real files
 * under /images/concepts, which is what production wants. The Claude artifact
 * preview runs under a CSP that blocks every external request, so this script
 * re-inlines the photographs as base64 and emits the body-only fragment the
 * artifact publisher expects. Run it after editing the page; never hand-edit
 * the generated file.
 *
 *   node prototypes/build-preview.mjs [outfile]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = process.argv[2] ?? resolve(root, 'prototypes/.preview-body.html');

let html = readFileSync(resolve(root, 'prototypes/agent-teardown-site.html'), 'utf8');

// body-only fragment: the artifact publisher supplies its own document shell
html = html.slice(html.indexOf('<body>') + '<body>'.length, html.lastIndexOf('</body>'));

// the JS-off fallback only makes sense when files can be fetched
html = html.replace(/\s*<noscript>[\s\S]*?<\/noscript>/, '');

// webp overrides are pointless once every rule carries its own data URI
html = html.replace(/\s*@supports \(background-image:image-set[\s\S]*?\n {2}\}/, '');

// fonts are shared files in production; the preview has to carry them
let fonts = 0;
html = html.replace(/url\(\/fonts\/([\w.-]+\.woff2)\)/g, (_m, name) => {
  const buf = readFileSync(resolve(root, `public/fonts/${name}`));
  fonts++;
  return `url(data:font/woff2;base64,${buf.toString('base64')})`;
});
if (fonts !== 2) throw new Error(`expected 2 fonts, inlined ${fonts}`);

// inline each photograph, preferring webp for size
let count = 0;
html = html.replace(
  /url\(\/images\/concepts\/([a-z]+-\d)\.jpg\)/g,
  (_m, name) => {
    const buf = readFileSync(resolve(root, `public/images/concepts/${name}.webp`));
    count++;
    return `url(data:image/webp;base64,${buf.toString('base64')})`;
  },
);

if (count !== 12) throw new Error(`expected 12 photographs, inlined ${count}`);
if (html.includes('/images/concepts/')) throw new Error('an external image reference survived');
if (html.includes('/fonts/')) throw new Error('an external font reference survived');

writeFileSync(out, html);
console.log(`inlined ${count} photographs -> ${out} (${Math.round(html.length / 1024)}KB)`);
