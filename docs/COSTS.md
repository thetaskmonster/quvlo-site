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

- **Stripe** — no monthly fee; standard **~2.9% + 30¢ per transaction**, charged only when a client actually pays. Deposits/Care-Plan checkout stay off until `CARE_PLAN_URL` / `DEPOSIT_URL` are set.
- **Cloudflare env vars still pending** (needed for the scanner + pricing paths): `QUVLO_ENRICH_WEBHOOK_URL`, `CARE_PLAN_URL`, `DEPOSIT_URL`, and `hello@quvlo.co` email routing.

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
