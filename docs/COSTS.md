# quvlo.co — Running Cost & Credit Ledger

_Pinned running note. Update it whenever spend happens. Nothing in `docs/` is served on
the live site (it is not a Vite build input), so this stays private to the repo._

Standing rule (CLAUDE.md #15): **nothing recurring gets added without flagging the cost first.**

---

## Higgsfield image credits (Plus plan)

Plan allotment: **1,200 credits / cycle**. `nano_banana_pro` = **2 credits / image**.

| Date | What | Credits | Balance after |
|---|---|---:|---:|
| 2026-08-29 | Photoreal concept sample designs — 12 finals + proofs/rerolls, incl. the realism pass | 72 | 1,128 |

**Used this cycle: 72 / 1,200 (~6%).** Last checked balance: **1,128**.

---

## One-time / already spent

- **Hero descent video** (kie.ai, earlier sessions): ~$5–10 top-up, spent on the 6-leg photoreal flight.
  - TODO (Kyle): rotate the kie.ai API key. It lived only in a gitignored `.env`, never committed.

---

## Recurring — ACTIVE

| Service | Purpose | Cost |
|---|---|---|
| Cloudflare Pages | Hosting (static site) | **Free tier — $0** |
| Formspree | Free-teardown / contact form | **Free tier — $0** at current volume; paid tier only if submissions exceed the free monthly cap |
| Domain `quvlo.co` | — | Annual renewal (per your registrar) |

---

## Recurring — NOT active (flip on when ready)

- **Stripe** — no monthly fee; standard **~2.9% + 30¢ per transaction**, charged only when a client actually pays. Off until the keys below are set.

---

## Live activation status (verified 2026-09-02)

Checked against the live site, using only honest observables (endpoint probes + code paths).
The live homepage is `index.html`; its funnel calls three Cloudflare Functions.

| Path | Live state | How it was verified | Owner / action |
|---|---|---|---:|
| **Lead capture** (`/api/lead`) | **WORKS today** | `GET` → HTTP 405 (POST-only, deployed). Code has a graceful fallback: if `AIRTABLE_TOKEN` is unset it routes the lead to Formspree (`mzdlnbkj`) — **no lead is ever dropped**. | Nothing required to capture leads. |
| **Free scan** (`/api/scan`) | **WORKS today** | `GET` → HTTP 405 (POST-only, deployed). Runs and returns scores with no env vars. | Nothing required. |
| **Prices / catalogue** (`/api/checkout` GET) | **WORKS today** | `GET /api/checkout` → `{ ok:true, live:false, packages:[…] }` — the five real prices render. | Nothing required. |
| **Stripe checkout** (`/api/checkout` POST) | **OFF** | Same probe returns `"live": false` = `STRIPE_SECRET_KEY` not set in Cloudflare. | **Kyle** — set `STRIPE_SECRET_KEY` (a secret; Cloudflare env var, never in code) + `STRIPE_WEBHOOK_SECRET` and the `QUVLO_EVENTS` KV binding for `functions/api/stripe-webhook.js`. |
| **Airtable CRM write** (`/api/lead`) | **Unwired** (non-blocking) | Not externally observable; leads currently land in Formspree instead of Airtable. | **Kyle** — set `AIRTABLE_TOKEN` (secret). `AIRTABLE_BASE`/`AIRTABLE_TABLE` default in code. Optional `QUVLO_NOTIFY_URL` overrides the Formspree fallback. |
| **Scan enrichment webhook** (`/api/scan`) | **Off** (non-blocking) | Fires only if `QUVLO_ENRICH_WEBHOOK_URL` is set; scan works without it. | **Kyle** — set `QUVLO_ENRICH_WEBHOOK_URL` when the enrichment pipeline is ready. |
| **`hello@quvlo.co` routing** | Not verifiable here | Kyle's mail / Cloudflare Email Routing setting, not observable from this session. | **Kyle** — confirm mail delivery. |

**Read:** the visitor-facing funnel is already working — a visitor can scan, see scores, and hand
over an email, and that lead is captured (via Formspree today). The one real click-blocker for
**taking money** is Stripe: set `STRIPE_SECRET_KEY` (+ webhook secret + KV) and checkout goes live.
Everything else on this list improves back-office routing but does not block a lead or a sale.

> Note: `src/components/Pricing.tsx` / `ui.tsx` carry `CARE_PLAN_URL` / `DEPOSIT_URL` (empty →
> `PAYMENTS_LIVE=false`). That is an **alternate React build**, not the live-served `index.html`
> path. If that build is ever the one deployed, those two Stripe Payment Link URLs are a code edit
> (not a Cloudflare env var) — the URLs are public hosted links, not secrets.

---

## Care Plan tooling / paid APIs

Status: **none active.** These are the tools you'd use to *deliver* the Care Plans
(Essential **$150/mo**, Standard **$300/mo**, Compliance **$650/mo**). Most have a real
free tier — the open-source options cost $0 in tooling and only your time to run.
Anything paid gets flagged here before it's added.

| Capability | Feeds which plan | Free option ($0 tooling) | Paid option (only if needed) |
|---|---|---|---|
| Uptime / status monitoring | All | UptimeRobot / BetterStack free tier (a few monitors) | Higher monitor counts / SMS alerts |
| Accessibility audits (WCAG) | Standard, Compliance | axe-core / Pa11y (open-source) run on a schedule | Hosted a11y dashboards (e.g. scheduled reports, historical trends) |
| Analytics | All | Cloudflare Web Analytics (free) | Plausible / Fathom (privacy-first, paid) |
| Security / dependency scanning | Compliance | GitHub Dependabot + `npm audit` (free) | — |
| Backups / snapshots | All | Git history (free); static site, low risk | — |
| Content updates / small edits | Standard | Your time (no tooling cost) | — |
| Same-day support | Compliance | Your time | — |

**Read:** every Care Plan can be delivered today on **$0 of tooling** using the free/open-source
column; the cost is your time. Move an item to a paid tool only when volume or reporting demands it,
and log it here first.

---

_Last updated: 2026-08-29._
