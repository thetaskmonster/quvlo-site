# Retired API endpoints (2026-10-27)

These Pages Functions belonged to the old Agent Teardown site and were still being deployed:

- `functions/api/scan.js`: fetched any public URL for any caller, with no origin check or rate limit, and could fire a paid enrichment webhook.
- `functions/api/lead.js`: unauthenticated Airtable and Formspree writes with no rate limit.
- `functions/api/stripe-webhook.js`: payment handling for packages the site no longer sells.
- `lib/audit.js`: the scanner used by `scan.js`.

They were moved here (not deleted) after the 2026-10-27 audit (docs/audits/2026-10-27/studio-home-devices.md, issue 5), because they broke CLAUDE.md rules 1 and 8. Nothing under `functions/` imports them any more. Cloudflare only deploys `functions/`, so files here are never served.
