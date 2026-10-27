/**
 * The Quvlo static accessibility audit.
 *
 * This is the same set of checks used by hand on the DFW prospect batch, made
 * reusable so the teardown on the website runs the real thing rather than a
 * canned animation.
 *
 * Two rules govern everything here:
 *
 * 1. Nothing is reported that was not actually found in the served HTML. Every
 *    finding carries the count that produced it.
 * 2. Nothing is scored that cannot be measured this way. Colour contrast,
 *    keyboard order, focus visibility and real performance need a browser
 *    driving the page, so they are named in `notMeasured` rather than guessed
 *    at. A score that quietly folded in things we never checked would be the
 *    same dishonesty the pitch is against.
 */

/** Deductions are declared up front so the score is auditable, not a black box. */
export const WEIGHTS = {
  human: {
    noLang: 15,
    noTitle: 12,
    missingAlt: { each: 3, max: 21 },
    zoomBlocked: 15,
    noH1: 8,
    iframeNoTitle: { each: 6, max: 12 },
    genericLinks: { each: 1.5, max: 15 },
    emptyHeadingJump: 4,
  },
  agent: {
    unnamedField: { each: 12, max: 36 },
    genericLinks: { each: 2, max: 20 },
    unnamedControl: { each: 4, max: 20 },
    phoneNotLinked: 10,
    noLang: 5,
    noH1: 6,
    shellOnly: 25,
  },
};

const GENERIC = ['click here', 'read more', 'learn more', 'more', 'details', 'here', 'more info', 'find out more', 'view more'];

const strip = (h) => h.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

/** Collect <meta> tags into a { name-or-property: content } map, lowercased keys. */
function metaMap(head) {
  const map = Object.create(null);
  for (const m of head.matchAll(/<meta\b[^>]*>/gi)) {
    const key = (m[0].match(/\b(?:name|property)\s*=\s*["']([^"']+)["']/i) || [, ''])[1].toLowerCase();
    if (key && !(key in map)) map[key] = (m[0].match(/\bcontent\s*=\s*["']([^"']*)["']/i) || [, ''])[1];
  }
  return map;
}

/**
 * Growth checks: things that are provably absent from the served HTML and cost
 * the business reach, framed as what they cost and paired with the exact fix to
 * paste. These are DISCOVERABILITY, not accessibility, so they never touch the
 * human/agent scores — the whole point of the two gauges is that they mean one
 * honest thing. They live in their own array, and the same rule as everything
 * else applies: only report what was actually seen (or not) in the real page.
 *
 * Each item is a "quick win": a real gap the owner can close today, with the
 * snippet to close it. Giving the fix away is the funnel — it earns the trust
 * that the paid build and the monthly care plan are then sold on.
 */
export function growthChecks(html, meta = {}) {
  const head = (html.match(/<head[^>]*>([\s\S]*?)<\/head>/i) || [, html])[1];
  const m = metaMap(head);
  const wins = [];

  let host = 'yoursite.com', origin = 'https://yoursite.com';
  try { const u = new URL(meta.finalUrl); host = u.host; origin = u.origin; } catch { /* keep placeholders */ }

  const title = strip((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [, ''])[1] || '');
  const ogTitleVal = title || 'Your business name and what you do';

  // 1. Accidentally hidden from Google. Rare, but when it is set it is the whole
  //    ballgame, so it goes first.
  const robots = (m.robots || '') + ' ' + (m.googlebot || '');
  if (/\bnoindex\b/i.test(robots)) {
    wins.push({
      id: 'noindex', category: 'indexing', priority: 1, level: 'urgent',
      title: 'Your site is currently telling Google not to list it',
      impact: 'A "noindex" tag is on the page, so search engines are being asked to leave it out of results entirely. Nothing else you do for search matters while this is here.',
      effort: 'Delete one line',
      fix: { kind: 'remove', note: 'Find and delete this tag in your <head>:', code: '<meta name="robots" content="noindex">' },
    });
  }

  // 2. Not built for phones. One line, and most local searches are on a phone.
  if (!/<meta\b[^>]*name=["']viewport["']/i.test(head)) {
    wins.push({
      id: 'viewport', category: 'mobile', priority: 2, level: 'high',
      title: 'Your site is not set up for phones',
      impact: 'There is no viewport tag, so phones render the page zoomed out and Google flags it as not mobile-friendly. Most people searching for a local business are on a phone.',
      effort: 'Paste one line',
      fix: { kind: 'line', note: 'Add this inside your <head>:', code: '<meta name="viewport" content="width=device-width, initial-scale=1">' },
    });
  }

  // 3. Shared links preview blank. The most demoable one: everyone has texted
  //    their own link.
  const hasOgImg = 'og:image' in m && m['og:image'];
  const hasOgTitle = 'og:title' in m && m['og:title'];
  if (!hasOgImg || !hasOgTitle) {
    wins.push({
      id: 'social', category: 'share', priority: 3, level: 'high',
      title: 'Links to your site show a blank box when shared',
      impact: 'There are no share tags, so when someone posts your link in a text, Facebook, LinkedIn or Slack, it shows a blank box instead of a picture and headline. A preview card gets far more clicks than a bare link.',
      effort: 'Paste five lines + one image',
      fix: {
        kind: 'snippet',
        note: 'Add this inside your <head>, and make a 1200x630 image at the image URL:',
        code:
`<meta property="og:title" content="${ogTitleVal}">
<meta property="og:description" content="One clear sentence about your business.">
<meta property="og:image" content="${origin}/preview.jpg">
<meta property="og:type" content="website">
<meta name="twitter:card" content="summary_large_image">`,
      },
    });
  }

  // 4. Google cannot read the business as data. Big for the map pack.
  const ldBlocks = [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map((x) => x[1]);
  const hasLocalSchema = ldBlocks.some((b) => {
    if (/"@type"\s*:\s*["'][^"']*(LocalBusiness|Organization|Store|Dentist|Physician|MedicalBusiness|Hospital|Attorney|LegalService|Restaurant|ProfessionalService|HealthAndBeautyBusiness|DaySpa|BeautySalon|HomeAndConstructionBusiness|HVACBusiness)[^"']*["']/i.test(b)) return true;
    // an address or telephone inside any block is also machine-readable NAP
    return /"(address|telephone)"\s*:/i.test(b) && /"@type"/i.test(b);
  });
  if (!hasLocalSchema) {
    wins.push({
      id: 'schema', category: 'seo', priority: 4, level: 'high',
      title: 'Google cannot read your hours, phone or address as data',
      impact: 'There is no business schema on the page, so search engines have to guess your name, phone, address and hours from the text. With it, Google can show them directly in search and in the map pack, which is where local calls come from.',
      effort: 'Paste one block, fill in your details',
      fix: {
        kind: 'snippet',
        note: 'Add this inside your <head> and replace the placeholders:',
        code:
`<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "${title || 'Your Business Name'}",
  "telephone": "+1-000-000-0000",
  "url": "${origin}/",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "000 Example St",
    "addressLocality": "Dallas",
    "addressRegion": "TX",
    "postalCode": "75000",
    "addressCountry": "US"
  },
  "openingHours": "Mo-Fr 09:00-17:00"
}
</script>`,
      },
    });
  }

  // 5. Google is writing the search snippet for you.
  const desc = (m.description || '').trim();
  if (!desc) {
    wins.push({
      id: 'description', category: 'seo', priority: 5, level: 'medium',
      title: 'Google is writing your search-result snippet for you',
      impact: 'There is no meta description, so the grey text under your name in search results is whatever Google scrapes off the page. One sentence you control converts better than a scraped fragment.',
      effort: 'Write one sentence',
      fix: { kind: 'line', note: 'Add this inside your <head>, under ~155 characters:', code: '<meta name="description" content="What you do, where, and the one reason to choose you.">' },
    });
  } else if (desc.length > 160) {
    wins.push({
      id: 'description-long', category: 'seo', priority: 6, level: 'low',
      title: 'Your search snippet is getting cut off',
      impact: `Your meta description is ${desc.length} characters. Google truncates around 155, so the end of it is being dropped in search results.`,
      effort: 'Trim to ~155 characters',
      fix: { kind: 'guide', note: 'Shorten your existing description to under 155 characters, front-loading the important part.' },
    });
  }

  // 6. Ranking split across duplicate URLs.
  if (!/<link\b[^>]*rel=["']canonical["']/i.test(head)) {
    wins.push({
      id: 'canonical', category: 'seo', priority: 7, level: 'low',
      title: 'Google may be splitting your ranking across duplicate URLs',
      impact: 'There is no canonical tag, so the www and non-www, http and https, and trailing-slash versions of a page can be treated as separate pages, dividing the ranking signal between them.',
      effort: 'Paste one line',
      fix: { kind: 'line', note: 'Add this inside your <head>, pointing at the preferred URL:', code: `<link rel="canonical" href="${origin}/">` },
    });
  }

  // 7. Third-party script weight. Informational, no paste — a judgement call.
  const externalScripts = (html.match(/<script\b[^>]*\bsrc=/gi) || []).length;
  if (externalScripts >= 12) {
    wins.push({
      id: 'scripts', category: 'speed', priority: 8, level: 'low',
      title: `${externalScripts} third-party scripts load before your page is ready`,
      impact: `The page pulls in ${externalScripts} external scripts, usually analytics, chat widgets and marketing tags. Each one is a request that can delay the page and a tracker on your visitors. Trimming and deferring them is the cheapest speed win there is.`,
      effort: 'Audit and defer',
      fix: { kind: 'guide', note: 'Review which of these you actually use, remove the rest, and add defer to the ones you keep.' },
    });
  }

  wins.sort((a, b) => a.priority - b.priority);
  return wins;
}

/** Sum a per-item deduction with its cap. */
const ded = (n, rule) => (n <= 0 ? 0 : Math.min(n * rule.each, rule.max));

/**
 * Analyse a served HTML document.
 * @param {string} html raw response body
 * @param {{bytes?:number, ms?:number, finalUrl?:string, status?:number}} meta
 */
export function audit(html, meta = {}) {
  const findings = [];
  const add = (f) => findings.push(f);

  const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const body = bodyMatch ? bodyMatch[1] : html;

  // --- does the server actually send content, or only a shell for JS to fill? ---
  const bodyText = strip(body.replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, ''));
  // Any page that serves under ~200 characters of readable text is empty to
  // anything that does not run scripts, whether that is a JS framework shell or
  // a bot wall. The framework markers only sharpen the wording.
  const shellOnly = bodyText.length < 200;
  const framework =
    /<div[^>]+id=["'](root|app|__next)["'][^>]*>\s*<\/div>|__NEXT_DATA__|wix-warmup-data/i.test(html);
  if (shellOnly) {
    add({
      sev: 'critical', code: 'agent', level: '',
      title: 'The page sends almost no content until JavaScript runs',
      detail: framework
        ? `The served HTML carries only ${bodyText.length} characters of readable text and hands the rest to JavaScript. An agent or crawler that does not execute scripts sees an effectively empty page.`
        : `The served HTML carries only ${bodyText.length} characters of readable text. Either the content is built entirely by scripts or the server is turning away automated visitors. Either way an agent sees nothing to work with.`,
      count: 1,
    });
  }

  // --- 3.1.1 language ---
  const htmlTag = (html.match(/<html[^>]*>/i) || [''])[0];
  const noLang = !/\slang\s*=\s*["'][a-z]/i.test(htmlTag);
  if (noLang) {
    add({
      sev: 'serious', code: '3.1.1', level: 'A',
      title: 'No language set on the page',
      detail: 'The <html> element has no lang attribute, so a screen reader cannot tell which language to pronounce the page in.',
      count: 1,
    });
  }

  // --- 2.4.2 title ---
  const title = strip((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [, ''])[1] || '');
  if (!title) {
    add({
      sev: 'serious', code: '2.4.2', level: 'A',
      title: 'The page has no title',
      detail: 'Browser tabs, bookmarks and search results have nothing to show, and a screen reader announces nothing when the page loads.',
      count: 1,
    });
  }

  // --- 1.1.1 images without alt ---
  const imgs = body.match(/<img\b[^>]*>/gi) || [];
  // a 1x1 tracking pixel correctly has no alt, so do not punish it
  const realImgs = imgs.filter((t) => !/\b(width|height)\s*=\s*["']?1["']?/i.test(t));
  const noAlt = realImgs.filter((t) => !/\balt\s*=/i.test(t));
  if (noAlt.length) {
    add({
      sev: 'serious', code: '1.1.1', level: 'A',
      title: `${noAlt.length} image${noAlt.length > 1 ? 's' : ''} with no alt text`,
      detail: `Of ${realImgs.length} images on the page, ${noAlt.length} have no alt attribute, so a screen reader reads out the file name or nothing at all.`,
      count: noAlt.length,
    });
  }

  // --- 1.4.4 pinch zoom ---
  const vp = (html.match(/<meta[^>]*name=["']viewport["'][^>]*>/i) || [''])[0];
  const zoomBlocked = /user-scalable\s*=\s*(no|0)|maximum-scale\s*=\s*["']?1(\.0)?["']?[,"']/i.test(vp);
  if (zoomBlocked) {
    add({
      sev: 'serious', code: '1.4.4', level: 'AA',
      title: 'Pinch zoom is switched off',
      detail: 'The viewport tag blocks scaling, so anyone who needs to enlarge the text on a phone cannot.',
      count: 1,
    });
  }

  // --- 1.3.1 / 4.1.2 form fields with no accessible name ---
  const controls = (body.match(/<(input|select|textarea)\b[^>]*>/gi) || []).filter(
    (t) => !/type\s*=\s*["'](hidden|submit|button|image|reset)["']/i.test(t),
  );
  const labelFor = new Set(
    [...body.matchAll(/<label\b[^>]*\bfor\s*=\s*["']([^"']+)["']/gi)].map((m) => m[1]),
  );
  const unnamed = controls.filter((t) => {
    if (/aria-label\s*=|aria-labelledby\s*=|\btitle\s*=/i.test(t)) return false;
    const id = (t.match(/\bid\s*=\s*["']([^"']+)["']/i) || [, ''])[1];
    if (id && labelFor.has(id)) return false;
    // a wrapping <label> also names it, so only flag when there is no id and no placeholder either
    return !id && !/\bplaceholder\s*=/i.test(t);
  });
  if (unnamed.length) {
    add({
      sev: 'critical', code: '1.3.1 / 4.1.2', level: 'A',
      title: `${unnamed.length} form field${unnamed.length > 1 ? 's' : ''} an agent cannot name`,
      detail: `${unnamed.length} of ${controls.length} fields have no label, aria-label or title. Neither a screen reader nor an automated agent can tell what to type in them, which is where a booking attempt stops.`,
      count: unnamed.length,
    });
  }

  // --- 2.4.4 generic link text ---
  const anchors = [...body.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)];
  const generic = anchors.filter((m) => {
    if (/aria-label\s*=/i.test(m[1])) return false;
    return GENERIC.includes(strip(m[2]).toLowerCase());
  });
  if (generic.length >= 2) {
    add({
      sev: 'moderate', code: '2.4.4', level: 'A',
      title: `${generic.length} links that do not say where they go`,
      detail: `${generic.length} links use text like "read more" or "learn more". A screen reader user can pull up a list of every link on the page, and these are indistinguishable from each other.`,
      count: generic.length,
    });
  }

  // --- 4.1.2 controls with no accessible name at all ---
  const emptyControls = anchors.filter((m) => {
    const inner = m[2];
    if (strip(inner)) return false;
    if (/aria-label\s*=|\btitle\s*=/i.test(m[1])) return false;
    // an image with alt text inside the link supplies the name
    if (/<img\b[^>]*\balt\s*=\s*["'][^"']+["']/i.test(inner)) return false;
    return /<(img|svg|i|span)\b/i.test(inner);
  });
  const buttons = [...body.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/gi)].filter((m) => {
    if (strip(m[2])) return false;
    return !/aria-label\s*=|\btitle\s*=/i.test(m[1]);
  });
  const unnamedControls = emptyControls.length + buttons.length;
  if (unnamedControls) {
    add({
      sev: 'serious', code: '4.1.2', level: 'A',
      title: `${unnamedControls} control${unnamedControls > 1 ? 's' : ''} with no readable name`,
      detail: `${unnamedControls} links or buttons contain only an icon with no text or label, so they are announced as "link" or "button" and nothing more.`,
      count: unnamedControls,
    });
  }

  // --- 1.3.1 / 2.4.6 headings ---
  const h1s = body.match(/<h1\b[^>]*>[\s\S]*?<\/h1>/gi) || [];
  if (h1s.length === 0) {
    add({
      sev: 'moderate', code: '1.3.1', level: 'A',
      title: 'No main heading on the page',
      detail: 'There is no <h1>, so there is nothing that states what this page is. It weakens both screen reader navigation and search ranking.',
      count: 0,
    });
  } else if (h1s.length > 2) {
    add({
      sev: 'moderate', code: '1.3.1', level: 'A',
      title: `${h1s.length} competing main headings`,
      detail: `The page declares ${h1s.length} <h1> elements. When everything is the top heading, the outline stops telling anyone what the page is actually about.`,
      count: h1s.length,
    });
  }

  // --- 4.1.2 untitled iframes (ignore the invisible GTM noscript frame) ---
  const iframes = (body.match(/<iframe\b[^>]*>/gi) || []).filter(
    (t) => !/googletagmanager\.com\/ns\.html|ns\.html\?id=GTM/i.test(t),
  );
  const iframeNoTitle = iframes.filter((t) => !/\btitle\s*=/i.test(t));
  if (iframeNoTitle.length) {
    add({
      sev: 'serious', code: '4.1.2', level: 'A',
      title: `${iframeNoTitle.length} embedded frame${iframeNoTitle.length > 1 ? 's' : ''} with no title`,
      detail: `${iframeNoTitle.length} iframe${iframeNoTitle.length > 1 ? 's are' : ' is'} embedded with no title attribute, usually a map or a video. A screen reader announces it only as "iframe".`,
      count: iframeNoTitle.length,
    });
  }

  // --- phone number present but not callable ---
  // 555 is never assignable as a North American area code, and 555-01xx is the
  // range reserved for fiction, so mockups and placeholder copy are not reported
  // as a real contact number the business failed to link.
  const fictional = (n) => {
    const d = n.replace(/\D/g, '');
    const ten = d.length === 11 && d[0] === '1' ? d.slice(1) : d;
    if (ten.length !== 10) return false;
    return ten.slice(0, 3) === '555' || ten.slice(3, 6) === '555';
  };
  const phones = (strip(body).match(/\(?\b\d{3}\)?[\s.\-]\d{3}[\s.\-]\d{4}\b/g) || []).filter((n) => !fictional(n));
  const telLinks = (body.match(/<a\b[^>]*href\s*=\s*["']tel:/gi) || []).length;
  const phoneNotLinked = phones.length > 0 && telLinks === 0;
  if (phoneNotLinked) {
    add({
      sev: 'moderate', code: 'agent', level: '',
      title: 'The phone number cannot be tapped',
      detail: `A phone number appears on the page (${phones[0]}) but there is no tel: link anywhere. On a phone the visitor has to memorise it and retype it into the dialler, and an agent cannot place the call at all.`,
      count: phones.length,
    });
  }

  // --- informational: weight and render-blocking scripts ---
  const scripts = (html.match(/<script\b[^>]*\bsrc=/gi) || []).length;
  const bytes = meta.bytes ?? html.length;

  // ---------------- scores ----------------
  const W = WEIGHTS;
  let human = 100;
  human -= noLang ? W.human.noLang : 0;
  human -= !title ? W.human.noTitle : 0;
  human -= ded(noAlt.length, W.human.missingAlt);
  human -= zoomBlocked ? W.human.zoomBlocked : 0;
  human -= h1s.length === 0 ? W.human.noH1 : 0;
  human -= ded(iframeNoTitle.length, W.human.iframeNoTitle);
  human -= ded(generic.length >= 2 ? generic.length : 0, W.human.genericLinks);

  let agent = 100;
  agent -= ded(unnamed.length, W.agent.unnamedField);
  agent -= ded(generic.length >= 2 ? generic.length : 0, W.agent.genericLinks);
  agent -= ded(unnamedControls, W.agent.unnamedControl);
  agent -= phoneNotLinked ? W.agent.phoneNotLinked : 0;
  agent -= noLang ? W.agent.noLang : 0;
  agent -= h1s.length === 0 ? W.agent.noH1 : 0;
  agent -= shellOnly ? W.agent.shellOnly : 0;

  const order = { critical: 0, serious: 1, moderate: 2 };
  findings.sort((a, b) => order[a.sev] - order[b.sev]);

  // A page that sent us nothing cannot be scored. Some sites serve an empty body
  // to anything that is not a browser, and publishing a number derived from that
  // would be reporting our own blocked request as the business's failing.
  const unreadable = shellOnly;

  return {
    ok: true,
    unreadable,
    finalUrl: meta.finalUrl,
    status: meta.status,
    ms: meta.ms,
    bytes,
    stats: {
      images: realImgs.length,
      imagesNoAlt: noAlt.length,
      links: anchors.length,
      genericLinks: generic.length,
      fields: controls.length,
      unnamedFields: unnamed.length,
      iframes: iframes.length,
      iframesNoTitle: iframeNoTitle.length,
      h1: h1s.length,
      externalScripts: scripts,
      telLinks,
      title,
    },
    findings,
    // Discoverability wins, kept entirely separate from the two scores so the
    // gauges stay honest. Suppressed on an unreadable page, because absent tags
    // on a page we never really saw would be a false finding.
    quickWins: unreadable ? [] : growthChecks(html, meta),
    scores: unreadable
      ? null
      : { human: Math.round(clamp(human, 0, 100)), agent: Math.round(clamp(agent, 0, 100)) },
    notMeasured: [
      'colour contrast',
      'keyboard order and focus visibility',
      'anything the page builds with JavaScript after load',
      'real load speed on a phone',
    ],
  };
}
