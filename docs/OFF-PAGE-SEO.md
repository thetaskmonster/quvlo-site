# Off-page SEO — paste-ready pack (quvlo.co)

Companion to `docs/seo-launch-checklist.md`. That file is the **steps**; this file is the
**copy** to paste into each surface so you are not writing from scratch. Everything here is
honest: no invented clients, counts, or results. `docs/` is not a Vite build input, so nothing
here ships on the live site.

All the actions below are Kyle-only (they need Google / LinkedIn / registrar logins).
Dates are ISO `YYYY-MM-DD` (UTC).

---

## 1. Google Search Console + Bing (gets you crawled)

**Google Search Console** — search.google.com/search-console → Add property → **Domain** → `quvlo.co`.
Google returns a TXT record. Add it in Cloudflare → DNS → Records:
- Type: `TXT` · Name: `@` · Content: *(paste the exact value Google shows — it is per-account, so I cannot pre-fill it)*.
Then Verify → Sitemaps → submit `sitemap.xml` → URL Inspection → Request Indexing for `/`, `/privacy`, `/terms`.

**Bing Webmaster / Places** — bing.com/webmasters. You can **import from Search Console** in one click
once GSC is verified, which saves re-doing the TXT step. Bing indexes fast and it is free.

> Alternative to a DNS TXT record: this repo can serve a Google verification HTML file instead.
> If you prefer that route, paste me the filename Google gives you (looks like
> `google1234abcd.html`) and I will add it to `public/` so it deploys at `quvlo.co/google1234abcd.html`.

---

## 2. Google Business Profile (biggest local lever)

google.com/business → Add business → **Quvlo**. Service-area business (no storefront):
choose "I deliver goods and services to my customers", set the area to **Dallas–Fort Worth**,
hide the street address.

- Primary category: **Website designer**
- Secondary category: **Marketing agency**
- Website: `https://quvlo.co`
- Contact: `hello@quvlo.co`

**Business description (paste as-is, ~660 chars — under Google's 750 limit):**

> Quvlo is a Dallas–Fort Worth web studio that builds fast, accessible sites engineered to convert.
> Every build ships to WCAG 2.1 AA and is structured to be read cleanly by both people and AI agents,
> so your business shows up and reads correctly wherever customers and assistants look for it. We design
> and build landing pages, multi-page business sites, and ongoing care plans, and you own the code and
> the content at the end. Run a free instant scan of your current site at quvlo.co to see how it scores
> for human and agent readability before you commit to anything. Based in DFW, working with local
> service businesses that want a site that earns the call.

**First GBP post (paste as-is):**

> New in DFW: run a free, instant readability scan of your website at quvlo.co. It scores how well your
> site works for both human visitors and AI agents, and shows the exact issues costing you calls. No
> signup to see your score.

Verify (video or postcard) — nothing on GBP goes live until it clears, which can take several days.

---

## 3. Backlinks (a new domain has zero authority)

Even a handful of real inbound links move `quvlo.co` from "unknown" to "crawlable and trusted."

**LinkedIn** — add `quvlo.co` to your profile's Contact info and Featured section, and to any company page.
Suggested line for the profile / about:

> Founder at Quvlo — a Dallas–Fort Worth web studio building fast, accessible, agent-ready sites. Free site scan at quvlo.co.

**Directory blurb (paste into Clutch, a DFW business directory, or any listing that asks for a short description):**

> Quvlo builds fast, accessible websites for Dallas–Fort Worth businesses. WCAG 2.1 AA and agent-ready by
> default, engineered to turn visitors into calls. Free instant site scan at quvlo.co.

**One-line bio (for GitHub profile, social bios, email signatures):**

> Quvlo — DFW web studio. Fast, accessible, agent-ready sites. quvlo.co

**Targets to place these (2–3 is enough to start):**
- LinkedIn profile + company page
- Bing Places (from section 1)
- 1–2 relevant directories (Clutch, a Dallas / DFW small-business directory)
- Any personal site, GitHub profile, or social bio you control

---

## Things to know

- **Name collision:** `quvlo.com` is an established dating site. Lead with `quvlo.co` everywhere, and
  pair the name with "Dallas web studio" in listings and bios so branded searches resolve to you.
- **Pulse check any time:** search Google for `site:quvlo.co`. Nothing = not indexed yet. Pages appearing = indexed.
- **Timeline:** days to get indexed after GSC, weeks-to-months to rank on anything competitive. There is
  no overnight switch.

---

_Last updated: 2026-09-02._
