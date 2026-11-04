# Quvlo studio site: homepage, /work/, studio pieces, every route (independent reviewer, 2026-10-27)

Overall: not ready to show. Homepage, Basalt, Privacy and Terms need fixes; Inlay, Ballast, Longhand close; Neap ready apart from small fixes. Evidence: scratchpad/audit/studio-home/ (start with sheets/00-top-issues.jpg; may not survive the session). 0 of 2 paid concierge messages used (endpoint returned 503).

## Passes
No console/CSP errors on 72 loads; no secrets in the front end or git history (only a placeholder in docs/CONCIERGE.md); concierge output via textContent, 1,200-char cap, 8 KB body cap, server-side history, origin allow-list, rate limits and spend caps; no em dashes; SEO basics; Lacquer Room noindex and unlinked; robots and sitemap correct (no concept pages); full security headers; forms post only to Formspree; signature widgets work on touch, mouse and keyboard; Neap is the strongest piece (disclosures, 988 line).

## Measurements
Homepage CLS 0.63-1.0 on every device (#2). Homepage at 10 Mbps on Kyle's iPad: hero arrives at 27 s. Brightside on iPad loads 39.8 MB before its load event.

## Issues (ranked)
1. BLOCKER: concierge down on Preview: ANTHROPIC_API_KEY (and RATE_SALT, CONCIERGE KV) not set for Preview (functions/api/concierge.js:573, 605-607); the client then says "can't take more questions" before any question, hides the input and disables the choices (home.js:241-245, 291). Fix: set the Preview env vars (Kyle, in Cloudflare); an honest offline fallback; re-enable the choices.
2. BLOCKER Safari: every link into / (#close, #start, #work) lands mid-story because the door section's height is set after the async scene.json fetch (home.js:160, 185; site.css:43). Fix: reserve the height synchronously; re-scroll to the hash after measure().
3. BLOCKER: og:image is the old Agent Teardown card ("ADA and EAA compliance by default... FREE TEARDOWN"), the alt text mismatches, old favicon (index.html:17-20, work/index.html:16, public/og-image.jpg, public/favicon.svg). Fix: re-render from tools/og-image/card.html; OG tags per piece.
4. BLOCKER legal: Privacy (privacy.html:73-93) and Terms (terms.html:73) describe the old business (scanner, teardowns, scraping/outreach, Stripe invoices, packages bought on site, Care Plans, Affirm); /thank-you says "Deposit received"; the chat footnote "Answers go to the team at Quvlo and nowhere else" (index.html:139) contradicts the privacy policy (Anthropic, Cloudflare KV, Airtable). Fix: rewrite both; drop thank-you.html from vite.config.ts:16; reword the footnote.
5. BLOCKER security gate: legacy endpoints still deployed. /api/scan fetches any public URL for any caller with no origin check or rate limit, and fires the paid QUVLO_ENRICH_WEBHOOK_URL if set (scan.js:150-170); /api/lead does unauthenticated Airtable and Formspree writes with no rate limit; /api/stripe-webhook handles payments no longer taken. Violates CLAUDE.md rules 1 and 8. Fix: move functions/api/{scan,lead,stripe-webhook}.js and lib/audit.js to archive/.
6. BLOCKER iPhone landscape: homepage story unreadable (clock over captions, captions under the header, cropped model, thumb bar covers a third) (home.js:158; site.css:88-91, 183). Fix: max-height:500px landscape layout or the wide camera at aspect >= 1.6.
7. BLOCKER reduced motion and slow connections (iPad, desktop): "3 am." collides with the story headline for 8-12 s at 10 Mbps (site.css:75, 100). Fix: anchor the hero copy to the bottom of the scene for .act:not(.live).
8. BLOCKER honesty: Basalt, Inlay, Ballast and Longhand aren't labelled concepts, and their forms promise follow-ups ("We'll email you within a day", "You're on the list", "Noor will email you"; Basalt's Book does nothing). Fix: Neap's pattern ("Concept" pill, footer line, "(Concept)" in the title); "Demo only: nothing was sent."
9. BLOCKER a11y: an arrow key on the homepage radios starts the chat on the wrong choice and disables the rest (home.js:289-291; WCAG 3.2.2). Fix: buttons, or start only on click or Enter; never disable the alternatives.
10. iPhone fixed bars cover text and fields: Basalt readout and Book (basalt:70, 78); the "Studio Work by Quvlo" pill covers captions, fields and the footer, and on Neap answer options (a tap opens /work/); Longhand hides it with opacity only so it still catches taps; the homepage thumb bar covers the chat footer.
11. iPad and wide: the headline sits on the lit storefront and a hard vertical seam cuts the picture (home.js:40, 117, 120; site.css:59, 99). Fix: feather the edge; cap h1 ~9ch.
12. iPad: the hero goes black while loading (home.js:126 adds `drawn` unconditionally; site.css:95). Fix: add `drawn` only after a draw; preload the hook still.
13. The Basalt TV floats off the TV during the pull-back while frames load (home.js:118 vs 130).
14. /work/ and homepage previews nearly invisible under a heavy veil (site.css:116); nothing lit on arrival.
15. One-person studio promises "the team" (chat footnote, home.js:243, concierge-playbook.js:53-54, 145) vs "You'll talk to Kyle"; "Book 15 minutes" is a request form.
16. Basalt slots offered after 10 pm and next-day 6 am unlabelled; the Cedar room's first slot is always Taken; the Book button is dead (basalt/site.js:57-67; index.html:260).
17. Inlay "Cloth" nav link dead: duplicate id="cloth" (inlay/index.html:244 vs 309).
18. Basalt med-spa copy under Texas rules: "run by licensed nurses", "reviewed with a nurse", membership including a treatment (basalt:239, 241, 265). Needs medical-director wording, no bundled treatment; attorney check before any real build.
19. Ballast weekly DXA implausible and regulated (ballast:328, 394). Fix: weekly InBody, DXA at weeks 0 and 12 under a medical director.
20. Copy contradictions: Basalt half an hour vs ~84 min; Longhand "No forms" above a form; Inlay "Four visits"; Neap "small talk therapy practice"; concierge fallback points to the next section.
21. iPhone layout: hero buttons below the fold on Inlay, Ballast, Neap; Inlay preview scrolls away while picking; Longhand portal last line clipped; homepage label collision, black bands, empty right half before a pick.
22. Ballast sticky photo crops to a rear-end close-up on iPad, with AI floor artefacts; nav hard to read (ballast:63, 182).
23. a11y: no focus ring on the concierge input (site.css:152); weak focus on Inlay and Neap inputs; Basalt skip link never visible; Inlay focus drop and no empty-submit error; contrast Inlay 3.29:1, Basalt "Heat 15" ~2:1, treatment times 4.05:1, Longhand nav 4.17:1; Basalt round player spams the screen reader and ignores reduced motion.
24. Design reads as templated: one skeleton for all five pieces; fragment headlines; hairline dividers; Basalt's Upstairs uses cream #dccfb9 + ember #e3924a (the cream + terracotta tell); Melodrama's slashed zero reads "19Ø°".
25. Rule 15: Neap's gauge labels the visitor "Restless" and "settles" them. Label the water, not the person.

## Nitpicks
Ballast "-0.0 in" and week label mismatch, slider snaps back; concierge timeout clears the message, zero-width-only message ends the chat, no empty-send feedback; type=email accepts a@b, no privacy link by the call form; many sub-44 px targets; thumb bar links focusable off-screen; UK spellings (grey, behavioural, enquiry, cancelled, honour); /work/ description ~330 chars, no og:image:alt or twitter:card, pieces lack OG tags; Lacquer Room canonical while noindex (consider a 301 to /work/); no sitemap lastmod; no caching for /assets/* or /work/*/img/*; no COOP; HSTS includeSubDomains;preload is hard to undo (rule 12: confirm with Kyle); Turnstile not configured, so rotating IPs could burn the $5/day cap; the homepage shows only the 5 oldest pieces vs 12 on /work/.

## Fix order
1. #1, #3, #4, #5. 2. #2, #7, #12 (one change). 3. #8, #9. 4. #6, #10, #11. 5. Pieces #16-#22. 6. Design and copy passes. Then re-test the concierge with the Preview key set and deep links on a real iPad.
