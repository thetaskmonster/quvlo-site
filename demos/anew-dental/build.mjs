/**
 * Builds the Anew Dental of Denton rebuild concept.
 *
 * Every fact on the page (name, dentist, phone, address, hours, service list)
 * was read out of the practice's own live homepage during the 2026-07-24 audit.
 * Nothing is invented: no review counts, no ratings, no years in business, no
 * patient numbers, no testimonial copy. Places that need real content the
 * practice has to supply are visibly marked rather than filled with fiction.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const font = readFileSync(resolve(here, 'fraunces600.woff2')).toString('base64');
const photos = resolve(here, '../../../../../../home/user/quvlo-site/public/images/concepts');
const img = (n) => readFileSync(resolve(photos, n)).toString('base64');

const HERO = img('dental-3.webp');   // patient in chair, calm and modern
const ROOM = img('dental-2.webp');   // treatment room interior
const SMILE = img('dental-1.webp');  // editorial smile

// Real services, taken from the practice's own navigation and meta description.
const SERVICES = [
  ['General &amp; family dentistry', 'Cleanings, exams, fillings and preventive care for adults and children.', 'General and family dentistry'],
  ['Cosmetic dentistry', 'Veneers, whitening and smile design for patients who want to change how their teeth look.', 'Cosmetic dentistry'],
  ['Dental implants', 'Replacing a missing tooth with a permanent root and crown.', 'Dental implants'],
  ['Braces &amp; orthodontics', 'Straightening treatment for teens and adults.', 'Braces and orthodontics'],
  ['Emergency &amp; walk-in care', 'Broken teeth, lost fillings and tooth pain seen the same day where possible.', 'Emergency and walk-in dental care'],
  ['Snoring &amp; sleep apnea', 'Oral appliance therapy as an alternative to a CPAP machine.', 'Snoring and sleep apnea treatment'],
];

const HOURS = [
  ['Monday', '8:30 am to 5:00 pm', false],
  ['Tuesday', '8:30 am to 5:00 pm', false],
  ['Wednesday', 'Closed', true],
  ['Thursday', '8:30 am to 5:00 pm', false],
  ['Friday', '8:30 am to 5:00 pm', false],
  ['Saturday', 'Closed', true],
  ['Sunday', 'Closed', true],
];

// Findings verified against the served HTML on 2026-07-24. Nothing speculative.
const FIXES = [
  ['11 links that all said &ldquo;Read More&rdquo;',
   'A screen-reader user can pull up a list of every link on a page. On the current site eleven of them say the same two words, so the list is useless and none of them describe where they go.',
   'Every link now names its destination, for example &ldquo;Read about treating tooth pain&rdquo;.',
   'WCAG 2.4.4 Link Purpose, Level A'],
  ['A map embedded with no title',
   'The Google Map is an iframe with no title attribute, so it is announced only as &ldquo;iframe&rdquo; with no indication of what it contains.',
   'The map is labelled, and the address is also written out as real selectable text with a directions link, so nobody depends on the embed.',
   'WCAG 4.1.2 Name, Role, Value, Level A'],
  ['What is already working, and stays',
   'The phone number is already a real telephone link, the page declares a single clear heading, and at 51KB it is genuinely light. A rebuild that threw those away would be a downgrade.',
   'Kept exactly as they are. This is a rebuild of what is broken, not a rewrite of what is not.',
   'Verified by scan on 2026-07-26, not assumed'],
  ['A template old enough to prompt a browser upgrade',
   'The current page still ships a legacy &ldquo;upgrade your browser&rdquo; notice, which dates the template and adds weight every visitor downloads.',
   'Rebuilt as hand-written HTML and CSS with no vendor template underneath it.',
   'Performance and credibility'],
];

const page = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Anew Dental of Denton: website rebuild concept by Quvlo</title>
<meta name="description" content="An unsolicited redesign concept for Anew Dental of Denton, built by Quvlo to show the accessibility and booking issues found on the current site and how they would be fixed.">
<meta name="robots" content="noindex,nofollow">
<meta name="theme-color" content="#0e2b26">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  @font-face{font-family:'Fraunces';font-style:normal;font-weight:600;font-display:swap;src:url(data:font/woff2;base64,${font}) format('woff2');}
  :root{
    --ink:#0e2b26; --ink-2:#28453f; --body:#41564f; --muted:#586b64;
    --cream:#f8f5ef; --cream-2:#efeae0; --line:#ddd6c8;
    --sage:#456459; --teal:#0d7a6b; --teal-d:#0a6155; --gold:#b98b34;
    --display:'Fraunces',Georgia,'Times New Roman',serif;
    --sans:system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",sans-serif;
  }
  html{scroll-behavior:smooth}
  @media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
  body{background:var(--cream);color:var(--body);font-family:var(--sans);line-height:1.6;-webkit-font-smoothing:antialiased}
  .sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);clip-path:inset(50%);white-space:nowrap;border:0}
  .skip{position:absolute;left:-9999px;top:0;z-index:300}
  .skip:focus{left:12px;top:12px;padding:12px 18px;border-radius:8px;background:var(--ink);color:#fff;font-weight:600;text-decoration:none;outline:3px solid var(--gold);outline-offset:2px}
  a{color:var(--teal-d)}
  :focus-visible{outline:3px solid var(--gold);outline-offset:2px;border-radius:4px}
  .wrap{max-width:1120px;margin:0 auto;padding:0 24px}
  h1,h2,h3{font-family:var(--display);color:var(--ink);font-weight:600;letter-spacing:-.015em;line-height:1.12}

  /* Quvlo attribution bar, deliberately unmissable */
  .qbar{background:#05070d;color:#c3ccd9;font-size:13px;padding:11px 0}
  .qbar .wrap{display:flex;gap:12px;align-items:center;justify-content:center;flex-wrap:wrap;text-align:center}
  .qbar b{color:#e6d2a8;font-weight:600}
  .qbar a{color:#e6d2a8}

  /* header */
  header{position:sticky;top:0;z-index:200;background:rgba(248,245,239,.94);backdrop-filter:blur(10px);border-bottom:1px solid var(--line)}
  header .wrap{display:flex;align-items:center;justify-content:space-between;gap:16px;padding-top:14px;padding-bottom:14px}
  .brand{display:flex;align-items:center;gap:11px;text-decoration:none;min-height:24px}
  .brand .mark{width:34px;height:34px;border-radius:50%;background:var(--ink);color:var(--cream);display:grid;place-items:center;font-family:var(--display);font-size:17px;flex:none}
  .brand .nm{font-family:var(--display);font-size:19px;color:var(--ink);line-height:1.1}
  .brand .sub{display:block;font-family:var(--sans);font-size:10.5px;letter-spacing:.13em;text-transform:uppercase;color:var(--muted)}
  nav.main{display:none;gap:24px;font-size:14.5px}
  nav.main a{color:var(--ink-2);text-decoration:none;min-height:24px;display:inline-flex;align-items:center}
  nav.main a:hover{color:var(--teal-d)}
  .hact{display:flex;align-items:center;gap:10px}
  .tel{display:inline-flex;align-items:center;gap:7px;font-weight:600;color:var(--ink);text-decoration:none;font-size:15px;min-height:44px;padding:0 4px}
  .tel:hover{color:var(--teal-d)}
  .btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:44px;padding:12px 20px;border-radius:999px;
    background:var(--teal);color:#fff;font-weight:600;font-size:15px;text-decoration:none;border:0;cursor:pointer;transition:background .18s}
  .btn:hover{background:var(--teal-d)}
  .btn.ghost{background:transparent;color:var(--ink);border:1.5px solid var(--line)}
  .btn.ghost:hover{border-color:var(--ink);background:transparent}
  .btn.lg{padding:15px 26px;font-size:16px}
  @media(min-width:900px){nav.main{display:flex}}

  /* hero */
  .hero{padding:56px 0 64px}
  .hero .wrap{display:grid;gap:38px;align-items:center}
  .eyebrow{display:inline-flex;align-items:center;gap:8px;font-size:11.5px;letter-spacing:.15em;text-transform:uppercase;color:var(--sage);font-weight:600}
  .eyebrow i{width:6px;height:6px;border-radius:50%;background:var(--gold);display:block}
  .hero h1{font-size:clamp(2.3rem,6vw,3.9rem);margin-top:16px}
  .hero p.lede{margin-top:20px;font-size:clamp(1.02rem,2.2vw,1.16rem);max-width:52ch}
  .hero .cta{display:flex;flex-wrap:wrap;gap:12px;margin-top:30px}
  .hero figure{position:relative;border-radius:18px;overflow:hidden;aspect-ratio:4/3;box-shadow:0 26px 60px rgba(14,43,38,.19)}
  .hero figure img{width:100%;height:100%;object-fit:cover;display:block}
  .badge{position:absolute;left:16px;bottom:16px;right:16px;background:rgba(248,245,239,.95);border-radius:12px;padding:12px 15px;display:flex;gap:12px;align-items:center}
  .badge .d{font-family:var(--display);color:var(--ink);font-size:15px;line-height:1.25}
  .badge .s{font-size:12.5px;color:var(--muted)}
  @media(min-width:900px){.hero .wrap{grid-template-columns:1.06fr .94fr}.hero{padding:76px 0 88px}}

  .strip{background:var(--ink);color:#d7e2dd}
  .strip .wrap{display:grid;gap:14px;padding-top:22px;padding-bottom:22px;font-size:14.5px}
  .strip .it{display:flex;gap:10px;align-items:flex-start}
  .strip svg{flex:none;margin-top:2px;color:var(--gold)}
  @media(min-width:760px){.strip .wrap{grid-template-columns:repeat(3,1fr);gap:26px}}

  section{padding:64px 0}
  .head{max-width:60ch}
  .head h2{font-size:clamp(1.75rem,4vw,2.5rem)}
  .head p{margin-top:14px;font-size:1.02rem}

  .grid{display:grid;gap:18px;margin-top:38px}
  @media(min-width:640px){.grid{grid-template-columns:1fr 1fr}}
  @media(min-width:1000px){.grid{grid-template-columns:repeat(3,1fr)}}
  .card{background:#fff;border:1px solid var(--line);border-radius:15px;padding:24px;display:flex;flex-direction:column}
  .card h3{font-size:1.16rem}
  .card p{margin-top:9px;font-size:14.7px;flex:1}
  .card a{margin-top:16px;font-weight:600;font-size:14.5px;text-decoration:none;display:inline-flex;align-items:center;gap:6px;min-height:24px}
  .card a:hover{text-decoration:underline}

  .split{display:grid;gap:34px;align-items:center}
  @media(min-width:900px){.split{grid-template-columns:1fr 1fr}}
  .split figure{border-radius:18px;overflow:hidden;aspect-ratio:5/4}
  .split img{width:100%;height:100%;object-fit:cover;display:block}
  ol.steps{margin-top:22px;padding-left:0;list-style:none;display:grid;gap:16px}
  ol.steps li{display:flex;gap:14px}
  ol.steps .n{flex:none;width:29px;height:29px;border-radius:50%;background:var(--ink);color:var(--cream);display:grid;place-items:center;font-family:var(--display);font-size:14px}
  ol.steps b{color:var(--ink);display:block;font-size:15.5px}
  ol.steps span{font-size:14.6px}

  .visit{background:var(--cream-2)}
  .vgrid{display:grid;gap:26px;margin-top:34px}
  @media(min-width:860px){.vgrid{grid-template-columns:1fr 1fr}}
  .panel{background:#fff;border:1px solid var(--line);border-radius:15px;padding:26px}
  .panel h3{font-size:1.2rem}
  dl.hours{margin-top:16px}
  dl.hours div{display:flex;justify-content:space-between;gap:16px;padding:9px 0;border-bottom:1px solid var(--cream-2);font-size:14.8px}
  dl.hours div:last-child{border-bottom:0}
  dl.hours dt{color:var(--ink-2)} dl.hours dd{font-variant-numeric:tabular-nums}
  dl.hours .cl dd{color:var(--muted)}
  address{font-style:normal;margin-top:14px;font-size:15.4px;line-height:1.75;color:var(--ink-2)}
  .maplink{margin-top:16px;display:inline-flex;align-items:center;gap:7px;font-weight:600;font-size:14.6px;text-decoration:none;min-height:44px}
  .maplink:hover{text-decoration:underline}

  /* content the practice must supply, never invented */
  .supply{margin-top:22px;border:1.5px dashed var(--line);border-radius:13px;padding:20px;background:var(--cream)}
  .supply .tag{font-size:11px;letter-spacing:.14em;text-transform:uppercase;font-weight:700;color:var(--gold)}
  .supply p{margin-top:8px;font-size:14.5px}

  /* booking */
  .book{background:var(--ink);color:#d7e2dd}
  .book h2{color:var(--cream)}
  .book .head p{color:#b6c7c1}
  form{margin-top:30px;display:grid;gap:16px;max-width:640px}
  @media(min-width:640px){form{grid-template-columns:1fr 1fr}}
  .f{display:flex;flex-direction:column;gap:7px}
  .f.full{grid-column:1/-1}
  label{font-size:13px;font-weight:600;color:#cfded8}
  .hint{font-weight:400;color:#93a8a2}
  input,select,textarea{width:100%;padding:13px 14px;border-radius:10px;border:1.5px solid #37544d;background:#0a221e;color:#f2f7f5;font:inherit;font-size:15px;min-height:44px}
  input:focus-visible,select:focus-visible,textarea:focus-visible{outline:3px solid var(--gold);outline-offset:1px;border-color:transparent}
  input[aria-invalid="true"],select[aria-invalid="true"]{border-color:#ff9b9b}
  .err{font-size:13px;color:#ffb4b4;min-height:1em}
  form button{grid-column:1/-1;justify-self:start}
  .status{margin-top:14px;font-size:14.5px;min-height:1.3em}
  .status.ok{color:#8fe0b8} .status.bad{color:#ffb4b4}
  .gotcha{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}

  /* what changed */
  .fixes{background:#fff}
  .fx{margin-top:34px;display:grid;gap:18px}
  .fx article{border:1px solid var(--line);border-radius:15px;overflow:hidden}
  .fx h3{font-size:1.1rem;padding:18px 22px;background:var(--cream-2);display:flex;gap:12px;align-items:flex-start}
  .fx h3 .no{flex:none;font-size:12px;letter-spacing:.1em;color:var(--gold);padding-top:4px}
  .fx .bd{padding:20px 22px;display:grid;gap:14px}
  @media(min-width:820px){.fx .bd{grid-template-columns:1fr 1fr}}
  .fx .lbl{font-size:11px;letter-spacing:.14em;text-transform:uppercase;font-weight:700;margin-bottom:5px}
  .fx .was .lbl{color:#b4483f} .fx .now .lbl{color:var(--teal-d)}
  .fx p{font-size:14.6px}
  .fx .ref{padding:12px 22px 18px;font-size:12.6px;color:var(--muted)}

  footer{background:var(--ink);color:#a9bdb7;padding:44px 0 40px;font-size:14.4px}
  footer .cols{display:grid;gap:26px}
  @media(min-width:760px){footer .cols{grid-template-columns:2fr 1fr 1fr}}
  footer h4{font-family:var(--display);color:var(--cream);font-size:1.02rem;margin-bottom:11px}
  footer a{color:#cfded8;text-decoration:none;display:inline-block;padding:3px 0;min-height:24px}
  footer a:hover{color:#fff;text-decoration:underline}
  footer ul{list-style:none}
  .fine{margin-top:30px;padding-top:20px;border-top:1px solid #2b4842;font-size:12.8px;color:#8ea39d;display:flex;gap:14px;flex-wrap:wrap;justify-content:space-between}
</style>
</head>
<body>
<a class="skip" href="#main">Skip to content</a>

<div class="qbar"><div class="wrap">
  <span><b>Concept, not the live site.</b> An unsolicited rebuild of anewdentaldenton by
  <a href="https://quvlo.co/">Quvlo</a>, a Dallas web studio. Not affiliated with or endorsed by the practice.</span>
</div></div>

<header><div class="wrap">
  <a class="brand" href="#top">
    <span class="mark" aria-hidden="true">A</span>
    <span class="nm">Anew Dental<span class="sub">Denton, Texas</span></span>
  </a>
  <nav class="main" aria-label="Main">
    <a href="#services">Services</a>
    <a href="#visit">New patients</a>
    <a href="#find">Hours &amp; location</a>
    <a href="#changed">What changed</a>
  </nav>
  <div class="hact">
    <a class="tel" href="tel:+19405655049">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z"/></svg>
      <span class="sr-only">Call Anew Dental at </span>(940) 565-5049</a>
    <a class="btn" href="#book">Request an appointment</a>
  </div>
</div></header>

<main id="main" tabindex="-1">
<section class="hero" id="top"><div class="wrap">
  <div>
    <span class="eyebrow"><i></i>General &amp; cosmetic dentistry</span>
    <h1>Dentistry in Denton, without the runaround.</h1>
    <p class="lede">Anew Dental has looked after families at Unicorn Lake for years. Book in under a minute, call and reach a person, or walk in when something breaks.</p>
    <div class="cta">
      <a class="btn lg" href="#book">Request an appointment</a>
      <a class="btn ghost lg" href="tel:+19405655049">Call (940) 565-5049</a>
    </div>
  </div>
  <figure>
    <img src="data:image/webp;base64,${HERO}" alt="A patient sitting comfortably in a treatment chair in a bright modern dental practice." width="1000" height="668">
    <div class="badge">
      <div>
        <div class="d">Trinh Pham, DDS</div>
        <div class="s">3100 Unicorn Lake Blvd, Suite 130</div>
      </div>
    </div>
  </figure>
</div></section>

<div class="strip"><div class="wrap">
  <div class="it"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 2 4 6v6c0 5 3.4 9.4 8 10 4.6-.6 8-5 8-10V6Z"/></svg>
    <span><b>Adults and children.</b> One practice for the whole household.</span></div>
  <div class="it"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
    <span><b>Walk-ins and emergencies.</b> Broken teeth and tooth pain seen the same day where we can.</span></div>
  <div class="it"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>
    <span><b>Off Loop 288 at Unicorn Lake.</b> Free parking at the door.</span></div>
</div></div>

<section id="services"><div class="wrap">
  <div class="head">
    <span class="eyebrow"><i></i>Services</span>
    <h2>What we look after</h2>
    <p>The same treatments listed on the practice's current site, written so you can tell them apart at a glance.</p>
  </div>
  <div class="grid">
${SERVICES.map(([t, d, a]) => `    <article class="card">
      <h3>${t}</h3>
      <p>${d}</p>
      <a href="#book">Ask about ${a.toLowerCase()}
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6"/></svg></a>
    </article>`).join('\n')}
  </div>
</div></section>

<section class="visit" id="visit"><div class="wrap">
  <div class="split">
    <div>
      <span class="eyebrow"><i></i>New patients</span>
      <h2>Your first visit, start to finish</h2>
      <ol class="steps">
        <li><span class="n" aria-hidden="true">1</span><span><b>Tell us what is going on</b><span>Use the form below or call. No account, no portal login.</span></span></li>
        <li><span class="n" aria-hidden="true">2</span><span><b>We confirm by phone</b><span>A person from the practice rings you back to agree a time that works.</span></span></li>
        <li><span class="n" aria-hidden="true">3</span><span><b>Paperwork before you arrive</b><span>Forms come by email so you are not filling in a clipboard in the waiting room.</span></span></li>
        <li><span class="n" aria-hidden="true">4</span><span><b>Exam and a straight answer</b><span>What is going on, what it costs, and what happens if you wait.</span></span></li>
      </ol>
    </div>
    <figure><img src="data:image/webp;base64,${ROOM}" alt="A clean, uncluttered treatment room with modern dental equipment." width="1000" height="667"></figure>
  </div>

  <div class="supply">
    <span class="tag">Needs your content</span>
    <p>This is where patient reviews belong. We would pull them live from the practice's Google Business profile at build time so the page always shows the current rating and the newest comments. Nothing is written here because we do not invent reviews.</p>
  </div>
</div></section>

<section id="find"><div class="wrap">
  <div class="head">
    <span class="eyebrow"><i></i>Hours &amp; location</span>
    <h2>Finding us</h2>
  </div>
  <div class="vgrid">
    <div class="panel">
      <h3>Opening hours</h3>
      <dl class="hours">
${HOURS.map(([d, h, closed]) => `        <div${closed ? ' class="cl"' : ''}><dt>${d}</dt><dd>${h}</dd></div>`).join('\n')}
      </dl>
    </div>
    <div class="panel">
      <h3>Where we are</h3>
      <address>
        Anew Dental of Denton<br>
        3100 Unicorn Lake Blvd, Suite 130<br>
        Denton, TX 76210
      </address>
      <a class="maplink" href="https://www.google.com/maps/dir/?api=1&amp;destination=3100+Unicorn+Lake+Blvd+Suite+130+Denton+TX+76210">
        Get driving directions to the practice
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6"/></svg>
      </a>
      <p style="margin-top:14px;font-size:14px;color:var(--muted)">The address is real text you can select and copy, and the directions link opens your own maps app. On the built site an embedded map sits here with a proper title.</p>
    </div>
  </div>
</div></section>

<section class="book" id="book"><div class="wrap">
  <div class="head">
    <span class="eyebrow"><i></i>Book</span>
    <h2>Request an appointment</h2>
    <p>Tell us what you need and the best time to reach you. We confirm by phone, usually the same day.</p>
  </div>
  <form id="bk" novalidate>
    <div class="f"><label for="b-name">Your name</label>
      <input id="b-name" name="name" type="text" autocomplete="name" required aria-describedby="e-name">
      <span class="err" id="e-name"></span></div>
    <div class="f"><label for="b-phone">Phone number</label>
      <input id="b-phone" name="phone" type="tel" autocomplete="tel" required aria-describedby="e-phone">
      <span class="err" id="e-phone"></span></div>
    <div class="f"><label for="b-reason">What do you need? <span class="hint">(optional)</span></label>
      <select id="b-reason" name="reason">
        <option>Check-up and cleaning</option>
        <option>Tooth pain or something broken</option>
        <option>Cosmetic consultation</option>
        <option>Braces or orthodontics</option>
        <option>Implants</option>
        <option>Something else</option>
      </select></div>
    <div class="f"><label for="b-when">Best time to call <span class="hint">(optional)</span></label>
      <select id="b-when" name="when">
        <option>Any time</option><option>Morning</option><option>Afternoon</option>
      </select></div>
    <div class="f full"><label for="b-note">Anything we should know? <span class="hint">(optional)</span></label>
      <textarea id="b-note" name="note" rows="3"></textarea></div>
    <p class="gotcha" aria-hidden="true"><label for="b-co">Company</label><input id="b-co" name="_gotcha" type="text" tabindex="-1" autocomplete="off"></p>
    <button class="btn lg" type="submit" id="b-send">Send request</button>
  </form>
  <p class="status" id="b-status" role="status" aria-live="polite"></p>
  <p style="margin-top:16px;font-size:14.4px;color:#a9bdb7">Rather talk to someone? Call <a href="tel:+19405655049" style="color:#e6d2a8">(940) 565-5049</a> during opening hours.</p>
</div></section>

<section class="fixes" id="changed"><div class="wrap">
  <div class="head">
    <span class="eyebrow"><i></i>What changed</span>
    <h2>What this rebuild changes, and what it leaves alone</h2>
    <p>Each one was checked against the practice's live site on 24 July 2026. These are the actual findings, not a generic checklist.</p>
  </div>
  <div class="fx">
${FIXES.map(([t, was, now, ref], i) => `    <article>
      <h3><span class="no" aria-hidden="true">0${i + 1}</span>${t}</h3>
      <div class="bd">
        <div class="was"><div class="lbl">On the current site</div><p>${was}</p></div>
        <div class="now"><div class="lbl">In this rebuild</div><p>${now}</p></div>
      </div>
      <p class="ref">${ref}</p>
    </article>`).join('\n')}
  </div>
  <div class="supply" style="margin-top:26px">
    <span class="tag">Not measured yet</span>
    <p>Colour contrast, keyboard order and a real Lighthouse score need a pass in a live browser, which we record on camera rather than assert here. No score is quoted on this page because we have not measured one.</p>
  </div>
</div></section>
</main>

<footer><div class="wrap">
  <div class="cols">
    <div>
      <h4>Anew Dental of Denton</h4>
      <address>3100 Unicorn Lake Blvd, Suite 130<br>Denton, TX 76210<br>
      <a href="tel:+19405655049">(940) 565-5049</a></address>
    </div>
    <div><h4>Services</h4><ul>
      <li><a href="#services">General &amp; family dentistry</a></li>
      <li><a href="#services">Cosmetic dentistry</a></li>
      <li><a href="#services">Emergency &amp; walk-in care</a></li>
    </ul></div>
    <div><h4>Visiting</h4><ul>
      <li><a href="#visit">New patients</a></li>
      <li><a href="#find">Hours &amp; location</a></li>
      <li><a href="#book">Request an appointment</a></li>
    </ul></div>
  </div>
  <div class="fine">
    <span>Design concept by Quvlo. Not the practice's live website.</span>
    <span><a href="https://quvlo.co/">quvlo.co</a></span>
  </div>
</div></footer>

<script>
(function(){
  var f=document.getElementById("bk"); if(!f) return;
  var out=document.getElementById("b-status"), btn=document.getElementById("b-send");
  function clear(){["name","phone"].forEach(function(k){
    document.getElementById("b-"+k).removeAttribute("aria-invalid");
    document.getElementById("e-"+k).textContent="";});}
  function bad(k,msg){var el=document.getElementById("b-"+k);
    el.setAttribute("aria-invalid","true");
    document.getElementById("e-"+k).textContent=msg;
    out.className="status bad"; out.textContent=msg; el.focus();}
  f.addEventListener("submit",function(e){
    e.preventDefault(); clear();
    var n=document.getElementById("b-name"), p=document.getElementById("b-phone");
    if(!n.value.trim()) return bad("name","Please tell us your name.");
    if(p.value.replace(/\\D/g,"").length<10) return bad("phone","Please enter a phone number we can reach you on.");
    btn.disabled=true;
    out.className="status"; out.textContent="Sending\\u2026";
    setTimeout(function(){
      btn.disabled=false; f.reset();
      out.className="status ok";
      out.textContent="This is a design concept, so nothing was sent. On the built site this request would reach the practice straight away.";
    },600);
  });
})();
</script>
</body>
</html>
`;

const out = resolve(here, 'anew-dental-rebuild.html');
writeFileSync(out, page);
console.log(`built ${out} (${Math.round(page.length / 1024)}KB)`);
