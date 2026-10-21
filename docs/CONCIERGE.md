# AI concierge: how it works and how to switch it on

_Private repo note. Nothing in `docs/` is served on the live site._

The concierge is the chat on quvlo.co that starts from a door ("I need a website", "an app", "a CRM",
"AI automation", "not sure"), asks a handful of good questions, recommends the right-sized build and hands the
visitor a three line brief plus the booking button. It runs as one Cloudflare Pages Function,
`POST /api/concierge`, talking to Claude Opus 5.5 (`claude-opus-5-5`) through Anthropic's official SDK.

## Files

| File | What it holds |
|---|---|
| `functions/api/concierge.js` | The endpoint: checks, sessions, streaming, the brief, Airtable/Formspree delivery. The wire format is documented at the top. |
| `functions/_lib/concierge-playbook.js` | The system prompt, the five opening lines, the handoff lines and the `save_brief` tool. Edit with care: it is cached, so every change costs one full-price prompt per chat. |
| `functions/_lib/limits.js` | Origin allow list, input cleaning, rate limits, spending caps, KV (or in-memory dev) storage. |
| `tools/concierge-smoke.mjs` | Local test with a mocked `fetch`. No network, no key, no spending: `node tools/concierge-smoke.mjs` |

Dependency added: `@anthropic-ai/sdk` (Anthropic's official SDK, from npm). Reason: streaming replies and prompt
caching without hand-writing the API protocol. It is bundled into the Function at deploy time; nothing new loads
in the visitor's browser.

## The flow

1. The page sends `{ "choice": "website" }`. The server creates a chat, stores it in KV, and streams back the
   fixed opening line. No model call, no cost.
2. Each visitor message is sent as `{ "sessionId": "...", "message": "..." }`. The server loads the history from
   KV (never from the browser), adds the message, calls the model and streams the reply.
3. When the model has made its recommendation it calls `save_brief`. The server cleans the fields, saves the
   brief and the transcript to Airtable (or emails it through Formspree if Airtable is not set up or fails), and
   sends a `brief` event so the page can show the "Here's what I heard" card with the booking button. The model
   then asks if anything is wrong; a correction calls `save_brief` again and updates the same Airtable record.
4. Any limit or outage returns `{ ok: false, fallback: true, reason }`, and the page shows a short form and the
   booking button instead of breaking.

## Wire format (for the front end)

### Request

`POST /api/concierge`, `Content-Type: application/json`, body at most 8 KB, sent from the page itself
(the server checks the `Origin` header).

```json
{ "choice": "website" }                                   // start from a door
{ "choice": "app", "message": "..." }                     // door and first message together
{ "message": "..." }                                      // start without a door
{ "sessionId": "uuid-from-the-session-event", "message": "..." }   // continue
```

- `choice`: `website` | `app` | `crm` | `automation` | `unsure`
- `message`: up to 1,200 characters (set `maxlength="1200"` on the input too). Control characters are stripped
  on the server.
- Never send history. Anything other than these three fields is ignored.

### Response A: JSON (`Content-Type: application/json`), the request was not answered

```json
{ "ok": false, "fallback": true,  "reason": "message_rate_limit" }
{ "ok": false, "fallback": false, "reason": "message_too_long", "max": 1200 }
```

| `fallback` | `reason` | Status | What the page should do |
|---|---|---|---|
| true | `unavailable` | 503 | Show short form + booking button (key missing, storage down) |
| true | `chat_rate_limit` | 429 | Same (more than 3 new chats in an hour) |
| true | `message_rate_limit` | 429 | Same (more than 30 messages in 15 minutes) |
| true | `chat_turn_limit` | 429 | Same (14 visitor messages used in this chat) |
| true | `daily_cap` / `monthly_cap` | 503 | Same (spending ceiling reached) |
| true | `declined` | 409 | Same (two replies in this chat were declined by safety checks) |
| false | `message_too_long` | 400 | Ask them to shorten it (`max` is included) |
| false | `empty` | 400 | Nothing to send |
| false | `session_not_found` | 404 | Chat expired or unknown: start a new chat |
| false | `bad_request` / `too_large` / `forbidden` | 400/413/415/403/405 | Bug or abuse; show the short form |

Rule of thumb for the page: if the response is JSON and `fallback` is true, switch to the form.

### Response B: a stream (`Content-Type: text/event-stream`)

Standard Server-Sent Events. Each event is:

```
event: <name>
data: <one line of JSON>

```

`EventSource` cannot send a POST, so read it with `fetch()` and a stream reader:

```js
const res = await fetch('/api/concierge', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(payload),
});
if ((res.headers.get('content-type') || '').startsWith('application/json')) {
  const info = await res.json();          // { ok:false, fallback, reason }
  return info.fallback ? showFallbackForm(info.reason) : handleProblem(info);
}
const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
let buffer = '';
for (;;) {
  const { value, done } = await reader.read();
  if (done) break;
  buffer += value;
  let cut;
  while ((cut = buffer.indexOf('\n\n')) !== -1) {
    const frame = buffer.slice(0, cut);
    buffer = buffer.slice(cut + 2);
    const name = /^event: (.*)$/m.exec(frame)?.[1];
    const data = JSON.parse(/^data: (.*)$/m.exec(frame)?.[1] ?? 'null');
    handle(name, data);                    // see the table below
  }
}
```

| Event | Data | Meaning |
|---|---|---|
| `session` | `{ "sessionId": "uuid", "turnsLeft": 14 }` | Always first. Keep `sessionId` for the next request. |
| `delta` | `{ "text": "..." }` | Append to the current concierge bubble with `textContent` (plain text, never HTML). |
| `replace` | `{ "text": "..." }` | Replace the current bubble's whole text (a reply was withdrawn part way). |
| `brief` | `{ "making", "because", "works_when", "ruled_out"?, "updated": bool }` | Show the "Here's what I heard" card (You're making / Because / It works when) and the booking button. `updated: true` replaces the card already shown. Any `delta` after it starts a new bubble below the card. |
| `done` | `{ "turnsLeft": n, "briefSaved": bool }` | Reply complete; re-enable the input. `turnsLeft: 0` means the chat is full: show the booking button and form. |
| `error` | `{ "fallback": true, "reason": "upstream_error" \| "busy" \| "unavailable" }` | Reply failed. Show the short form and booking button. |

Every stream ends with exactly one `done` or `error`. Send one message at a time and keep the input disabled
until it arrives (two messages in flight at once on the same chat can overwrite each other in storage).

When a chat starts from a door with no message, the stream is `session`, one `delta` with the opening line,
then `done`. If the door and a first message are sent together, the opening line is stored but not streamed;
the stream carries the model's reply only.

## What to set in Cloudflare

Cloudflare dashboard, Workers & Pages, the quvlo project.

### 1. KV namespace (required before launch)

1. Storage & Databases, KV, Create namespace. Name it `quvlo-concierge`.
2. The Pages project, Settings, Bindings (Functions, KV namespace bindings), Add: variable name `CONCIERGE`,
   namespace `quvlo-concierge`. Add it for both Production and Preview.

Without the binding the function falls back to in-memory storage and logs a warning. That is for local
development only: chats, limits and spending would reset whenever Cloudflare recycles the worker.

### 2. Environment variables (Settings, Variables and Secrets; use "Encrypt" for the secret ones)

| Name | Secret? | Value |
|---|---|---|
| `ANTHROPIC_API_KEY` | yes | An API key from the Claude Console. Make a dedicated key for the concierge. |
| `RATE_SALT` | yes | Any long random string (e.g. 40 characters from a password manager). Salts the IP hash. |
| `AIRTABLE_TOKEN` | yes | Already used by `/api/lead`. Needs `data.records:write` on the Quvlo Pipeline base. |
| `AIRTABLE_BRIEFS_TABLE` | no | `Briefs` (the default) or the table id `tbl...` |
| `CONCIERGE_DAILY_CAP_USD` | no | Default `5` |
| `CONCIERGE_MONTHLY_CAP_USD` | no | Default `50` |
| `AIRTABLE_BASE` | no | Only if the briefs live outside the default base `apphN1nIEYNfA5hr0` |
| `QUVLO_NOTIFY_URL` | no | Only to change the Formspree fallback (defaults to the site's form) |
| `ALLOWED_ORIGINS` | no | Only to override the allow list, comma separated, e.g. `https://quvlo.co,https://www.quvlo.co,https://*.quvlo.pages.dev` |
| `PAGES_PROJECT` | no | The Pages project name if it is not `quvlo` (used for preview origins `https://<hash>.<project>.pages.dev`) |

Check the project name: if the preview URLs look like `https://abc123.something.pages.dev`, then `something` is
the project name. If it is not `quvlo`, set `PAGES_PROJECT` or the previews will be refused.

### 3. Airtable "Briefs" table

Create a table named `Briefs` in the Quvlo Pipeline base with these fields (names must match exactly;
`typecast` is on, so single selects create their options automatically):

| Field | Type |
|---|---|
| Making | Long text |
| Because | Long text |
| Works when | Long text |
| Ruled out | Long text |
| Name | Single line text |
| Email | Email |
| Contact preference | Single line text |
| Door | Single select (or single line text) |
| Transcript | Long text |
| Session | Single line text |
| Saved at | Date with time (or single line text) |
| Stage | Single select (`New` is set on create) |

If the table or a field is missing, the write fails and the brief arrives by email through Formspree instead,
with a note saying so. A brief is never dropped silently. The transcript in Airtable is the one at the moment the
brief was saved (or last corrected); the full chat stays in KV for 90 days, keyed `chat:<session id>`.

## Hard spend limit in the Anthropic Console (do this too)

The daily and monthly caps above are tracked by this code and are soft (see "Limits" below). The real ceiling
should also be set at Anthropic, where no bug in this site can get past it:

1. Sign in to the Claude Console (platform.claude.com) with the account that owns the key.
2. Ideally create a separate workspace for the concierge (Settings, Workspaces) and create the
   `ANTHROPIC_API_KEY` inside it, so its limit covers only the concierge.
3. Under Settings, Limits (or the workspace's limits), set a monthly spend limit a little above
   `CONCIERGE_MONTHLY_CAP_USD`, e.g. $60 for a $50 cap.
4. Turn on usage email alerts if offered.

When that limit is reached Anthropic refuses requests, the endpoint answers with
`error` / `unavailable`, and the page shows the short form. Console labels change from time to time; if
these exact menu names have moved, look for "Limits" or "Spend limits".

## Limits enforced on the server

| Limit | Value | Where |
|---|---|---|
| Origin | `https://quvlo.co`, `https://www.quvlo.co`, this project's `*.pages.dev` previews | `originAllowed` |
| Body | JSON only, at most 8 KB | `readCappedBody` |
| Message | 1,200 characters after stripping control and invisible characters | `parseBody` |
| Messages | 30 per visitor per 15 minutes | KV `rl:m:<hash>:<window>` |
| New chats | 3 per visitor per hour | KV `rl:c:<hash>:<window>` |
| Chat length | 14 visitor messages; the model gets a wrap-up note with 3 left | session record |
| Spend | `CONCIERGE_DAILY_CAP_USD` (5) and `CONCIERGE_MONTHLY_CAP_USD` (50), UTC days and months | KV `cost:<YYYY-MM>` |

"Visitor" means a salted SHA-256 hash of the `CF-Connecting-IP` address; the address itself is never stored.
Spend is computed from each response's token usage at Opus 5.5 rates: $4 per million input tokens, $20 per million
output (thinking included), $0.20 per million cache reads, $5 per million cache writes. If Anthropic's safety
fallback answers a turn on another model, that turn is priced at a more conservative $5 / $25.

Honest caveats:

- KV is eventually consistent across Cloudflare locations, so the limits are soft: a burst spread across
  locations could slip a few extra requests through. The Anthropic Console limit is the hard backstop. For
  stricter per-IP limits, Cloudflare's free WAF rate limiting rule can also be pointed at `/api/concierge`.
- The windows are fixed, so a visitor can get up to twice a limit across a window boundary.
- The `Origin` check stops other websites using the concierge from their visitors' browsers. A script can fake
  the header, which is exactly why the rate and spend limits exist.

## The model call

- Model `claude-opus-5-5`, streamed, `max_tokens` 4,000, `output_config.effort: "low"`. Thinking is always on
  for this model (it cannot be turned off); low effort keeps it short. Thinking is never shown to the visitor.
- One tool, `save_brief`, with `strict: true` so its arguments always match the schema. `tool_choice` is `auto`
  (forced tool choice is not allowed on this model); the prompt says when to call it.
- Prompt caching: the tool definition and system prompt carry a cache breakpoint, and the conversation is cached
  as it grows. Keep `concierge-playbook.js` stable; do not put dates or per-visitor details in it.
- Server-side fallback is on (`fallbacks: "default"`, beta `server-side-fallback-2026-07-01`). If Anthropic's
  safety classifiers wrongly decline a benign message, the request is re-run on Anthropic's recommended fallback
  model instead of failing. If everything declines, the visitor sees the "deserves a real conversation" handoff
  line, and after two of those the chat switches to the form.
- History is append-only and stored exactly as returned, including the model's (empty, signed) thinking blocks,
  as Opus 5.5 requires.
- Every reply is checked for em dashes on the way out, as a backstop to the prompt.
- Upstream errors are logged with `console.error` (Cloudflare, the project, Functions, Real-time logs) and never
  shown to the visitor.

## Costs (flagged per CLAUDE.md rule 17)

| Item | Cost | Notes |
|---|---|---|
| Anthropic API, Claude Opus 5.5 | Usage based, capped at $5/day and $50/month by default | Rough estimate: about 1 to 2 cents per visitor message with caching, so roughly 10 to 25 cents per full chat. Measure with real traffic before raising caps. Add a row to `docs/COSTS.md` when it goes live. |
| Workers KV | Free tier: 100,000 reads and 1,000 writes per day | Each visitor message uses about 3 writes (rate counter, spend record, chat). Around 300 messages a day fits the free tier; beyond that KV writes fail, which the endpoint treats as "unavailable" and shows the form. Workers Paid ($5/month, includes 1M KV writes) removes that ceiling. |
| Cloudflare Pages Functions | Free tier: 100,000 requests per day | Far above expected volume. |
| Airtable / Formspree | Existing free tiers | Already in use for leads. |

## Privacy policy wording (suggested)

> When you use the AI concierge on our site, your messages are processed by Anthropic to generate replies and are
> stored by us on Cloudflare for 90 days after your last message, then deleted automatically. If you finish a
> brief, it and the conversation are saved to our project tracker (Airtable) so we can follow up. We do not store
> your IP address; to prevent abuse we keep a one-way scrambled version of it for up to an hour.

## Local development

1. Create `.dev.vars` in the repo root (already gitignored), with no quotes needed:
   ```
   ANTHROPIC_API_KEY=sk-ant-...
   RATE_SALT=dev-salt
   ALLOWED_ORIGINS=http://localhost:8788
   ```
2. Build the site, then run `npx wrangler pages dev dist --kv CONCIERGE` (wrangler is not a project dependency;
   `npx` fetches it for that run). Leave out `--kv CONCIERGE` to try the in-memory fallback.
3. Real messages spend real money against your key. For logic changes, run the free smoke test instead:
   `node tools/concierge-smoke.mjs`.
