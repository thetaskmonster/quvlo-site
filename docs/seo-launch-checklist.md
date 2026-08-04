# SEO Launch Checklist — quvlo.co

Getting quvlo.co found on Google. Work top to bottom; the order is by impact.

**Reality check:** as of this writing the site is **not yet indexed** — a `site:quvlo.co`
search on Google returns nothing. Nothing is *blocking* indexing (see "Already done"
below); Google simply hasn't crawled a brand-new domain yet. Steps 1 and 2 are what
change that. Expect **days to get indexed, weeks-to-months to rank** for anything
competitive. There is no switch that ranks you overnight.

---

## Already done (the site side — no action needed)

- [x] `robots.txt` allows crawling, and points at the sitemap
- [x] `sitemap.xml` is live and valid (`/`, `/privacy`, `/terms`)
- [x] No accidental `noindex` anywhere (`/thank-you` is intentionally `noindex`)
- [x] `LocalBusiness` JSON-LD on the homepage (name, area served, the five real prices)
- [x] Title ≤ 60 chars, meta description ~140 chars (not truncated)
- [x] Open Graph / Twitter image renders (shared links show a real preview card)
- [x] Mobile viewport, fast load, clean semantics

So the technical foundation is in place. Everything below is **off-page** and can
only be done by Kyle (they need Google account access).

---

## 1. Google Search Console — this is what gets you crawled (~15 min, do first)

This is the single highest-value action. Without it, a new domain can sit uncrawled
for weeks.

- [ ] Go to **search.google.com/search-console** → **Add property** → choose **Domain** → enter `quvlo.co`
- [ ] Google shows a **TXT record**. In **Cloudflare → your domain → DNS → Records**, add it:
      - Type: `TXT`, Name: `@`, Content: (paste the value Google gave)
- [ ] Back in Search Console, click **Verify** (may take a few minutes for DNS to propagate)
- [ ] Left menu → **Sitemaps** → enter `sitemap.xml` → **Submit**
- [ ] Left menu → **URL Inspection** → paste `https://quvlo.co/` → **Request Indexing**
      - Repeat for `https://quvlo.co/privacy` and `https://quvlo.co/terms`
- [ ] Check back in 3–7 days: the **Pages** (Coverage) report should show pages as "Indexed"

---

## 2. Google Business Profile — the biggest lever for *local* visibility (free)

For a local Dallas business this is often more important than the website itself —
it's what puts you in the map pack and "web designer near me" results.

- [ ] Go to **google.com/business** → **Add your business** → "Quvlo"
- [ ] Primary category: **Website designer**. Add a secondary: **Marketing agency**
- [ ] No storefront? Choose **"I deliver goods and services to my customers"** →
      set it up as a **service-area business** covering **Dallas–Fort Worth**, and
      **hide the street address** (you only show the service area)
- [ ] Add website `https://quvlo.co`, contact `hello@quvlo.co`, hours, and a short description
- [ ] **Verify** — Google will ask for **video** or phone/postcard verification.
      This can take several days. Nothing else on GBP goes live until it clears.
- [ ] Once verified: add a few photos and a first "post" so the profile looks active

---

## 3. A handful of backlinks — gives a brand-new domain some authority

A new domain has zero authority. Even five real inbound links move it from
"unknown" to "crawlable and mildly trusted."

- [ ] Link `quvlo.co` from your **LinkedIn** profile / company page
- [ ] Add it to **Bing Places** (bing.com/business — Bing indexes fast and it's free)
- [ ] List on 2–3 relevant directories (e.g. **Clutch**, a **Dallas / DFW business directory**)
- [ ] Any personal site, GitHub profile, or social bio you control → add the link

---

## 4. Ongoing — once you have traffic

- [ ] Watch the Search Console **Performance** report for which queries bring impressions
- [ ] Add one or two pages targeting **long-tail, low-competition** terms you see there
      (e.g. "ADA compliant website Dallas", "accessible web design for dentists")
- [ ] Keep the sitemap current when you add pages

---

## Things to know

- **Name collision:** `quvlo.com` is an established dating site, so branded "quvlo"
  searches may surface them. Lead with `quvlo.co` everywhere, and consider always
  pairing the name with "Dallas web studio" in listings and bios.
- **How to check indexing progress at any time:** search Google for `site:quvlo.co`.
  Nothing = not indexed yet. Pages appearing = indexed. This is the fastest pulse check.
- **This is separate from the lead pipeline.** The scan-enrichment pipeline has no
  inputs until real visitors run scans — which is exactly what steps 1–3 produce. SEO
  first, then the funnel has something to work with.
