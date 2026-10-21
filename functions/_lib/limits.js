/**
 * Rate, cost and input limits for the AI concierge (/api/concierge).
 *
 * Everything here runs on the server. The browser is never trusted to count
 * its own messages or spending: a visitor can edit any JavaScript we ship, so
 * a limit that lives in the page is not a limit.
 *
 * Storage is the CONCIERGE Workers KV namespace. KV is eventually consistent
 * (a write can take up to about a minute to show up at other Cloudflare
 * locations), so these are soft limits: a determined burst from several
 * locations at once could slip a few requests past them. That is acceptable
 * because the hard backstop is the monthly spend limit set in the Anthropic
 * Console (see docs/CONCIERGE.md), which no bug here can exceed.
 */

// ---------------------------------------------------------------------------
// Limits from Kyle's approved plan
// ---------------------------------------------------------------------------

export const LIMITS = Object.freeze({
  messagesPerWindow: 30,          // visitor messages per IP ...
  messageWindowSeconds: 15 * 60,  // ... per 15 minutes
  chatsPerWindow: 3,              // new chats per IP ...
  chatWindowSeconds: 60 * 60,     // ... per hour
  visitorTurnsPerChat: 14,        // visitor messages in one chat
  maxMessageChars: 1200,          // characters per visitor message
  maxBodyBytes: 8 * 1024,         // raw request body
  defaultDailyCapUsd: 5,
  defaultMonthlyCapUsd: 50,
});

/**
 * Prices in USD per million tokens. Claude Opus 5.5 is the model we ask for.
 * When Anthropic's server-side fallback answers instead (a safety classifier
 * declined the request on Opus 5.5 and another model took over), that turn is
 * billed at the fallback model's rates, which can be higher, so any model not
 * listed here is priced at the conservative FALLBACK_PRICE row.
 */
const PRICES = {
  'claude-opus-5-5': { input: 4, output: 20, cacheRead: 0.2, cacheWrite: 5 },
};
const FALLBACK_PRICE = { input: 5, output: 25, cacheRead: 0.5, cacheWrite: 6.25 };

const priceFor = (model) => {
  if (!model) return PRICES['claude-opus-5-5'];
  const key = Object.keys(PRICES).find((k) => String(model).startsWith(k));
  return key ? PRICES[key] : FALLBACK_PRICE;
};

const costOf = (u, model) => {
  const p = priceFor(model);
  const n = (v) => (Number.isFinite(v) && v > 0 ? v : 0);
  return (
    n(u.input_tokens) * p.input +
    n(u.output_tokens) * p.output +
    n(u.cache_read_input_tokens) * p.cacheRead +
    n(u.cache_creation_input_tokens) * p.cacheWrite
  ) / 1_000_000;
};

/**
 * Dollar cost of one API response, from its usage block.
 *
 * With server-side fallback the top-level usage covers only the attempt that
 * produced the message; usage.iterations lists every attempt (including a
 * declined one), each with its own model. Sum those when present.
 */
export function usageCostUsd(usage, requestedModel) {
  if (!usage) return 0;
  if (Array.isArray(usage.iterations) && usage.iterations.length) {
    return usage.iterations.reduce((sum, it) => sum + costOf(it, it.model || requestedModel), 0);
  }
  return costOf(usage, requestedModel);
}

// ---------------------------------------------------------------------------
// Input hygiene
// ---------------------------------------------------------------------------

/**
 * Strip control characters (keeping newline and tab), bidirectional override
 * and zero width characters (used to hide text from humans while a model still
 * reads it), normalise line endings and collapse runs of blank lines.
 */
export function cleanText(value) {
  return String(value ?? '')
    .replace(/\r\n?/g, '\n')
    // Matching control characters is the point of this line.
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/g, '')
    .replace(/[\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Single line, capped. For short fields such as a name. */
export const cleanLine = (value, max) =>
  cleanText(value).replace(/\s+/g, ' ').slice(0, max).trim();

export const EMAIL = /^[^\s@<>()"',;:]+@[^\s@<>()"',;:]+\.[^\s@<>()"',;:]{2,}$/;

export const SESSION_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/**
 * Read a request body without ever holding more than `max` bytes.
 * Returns null when the body is larger than allowed.
 */
export async function readCappedBody(request, max = LIMITS.maxBodyBytes) {
  const declared = Number(request.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > max) return null;
  if (!request.body) return '';
  const reader = request.body.getReader();
  const chunks = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      try { await reader.cancel(); } catch { /* already closed */ }
      return null;
    }
    chunks.push(value);
  }
  const all = new Uint8Array(size);
  let at = 0;
  for (const c of chunks) { all.set(c, at); at += c.byteLength; }
  return new TextDecoder().decode(all);
}

// ---------------------------------------------------------------------------
// Origin allow list ("answer only our own domain")
// ---------------------------------------------------------------------------

/**
 * Default: the live domains plus Cloudflare Pages preview URLs of this
 * project. PAGES_PROJECT (default "quvlo") is the project name in the
 * Cloudflare dashboard; previews look like https://<hash>.<project>.pages.dev.
 * ALLOWED_ORIGINS, when set, replaces the whole list. It is a comma separated
 * list of exact origins, and an entry may start with "https://*." to allow
 * any subdomain, e.g. "https://quvlo.co,https://*.quvlo.pages.dev".
 *
 * This blocks other websites from using the endpoint from their visitors'
 * browsers. It does not stop a script that fakes the Origin header, which is
 * why the rate and cost limits exist as well.
 */
export function originAllowed(origin, env) {
  if (!origin || origin === 'null') return false;
  let url;
  try { url = new URL(origin); } catch { return false; }
  if (url.origin !== origin) return false; // no paths, no trailing junk

  const project = (env.PAGES_PROJECT || 'quvlo').toLowerCase();
  const list = env.ALLOWED_ORIGINS
    ? env.ALLOWED_ORIGINS.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
    : ['https://quvlo.co', 'https://www.quvlo.co', `https://${project}.pages.dev`, `https://*.${project}.pages.dev`];

  const o = origin.toLowerCase();
  return list.some((entry) => {
    if (entry.includes('://*.')) {
      const [scheme, rest] = entry.split('://*.');
      if (url.protocol !== `${scheme}:`) return false;
      const host = url.host.toLowerCase();
      // exactly one extra label, e.g. "abc123.quvlo.pages.dev"
      return host.endsWith(`.${rest}`) && /^[a-z0-9-]+$/.test(host.slice(0, -rest.length - 1));
    }
    return o === entry;
  });
}

// ---------------------------------------------------------------------------
// Storage: Workers KV, or an in-memory stand-in for local development
// ---------------------------------------------------------------------------

/**
 * WARNING: in-memory fallback, for local development only.
 *
 * Used when the CONCIERGE KV binding is missing (for example a bare
 * `wrangler pages dev` with no --kv flag). It lives inside one isolate, so in
 * production it would forget chats, rate limits and spending whenever the
 * isolate restarts and would not be shared between Cloudflare locations. The
 * endpoint logs a warning every time it runs this way. Bind the KV namespace
 * in Cloudflare before going live (docs/CONCIERGE.md).
 *
 * It never falls back to history sent by the browser: the chat history only
 * ever comes from server storage.
 */
const memory = new Map();
const warned = { kv: false, salt: false }; // log each warning once per isolate
const memoryStore = {
  async get(key) {
    const hit = memory.get(key);
    if (!hit) return null;
    if (hit.expires && hit.expires < Date.now()) { memory.delete(key); return null; }
    return hit.value;
  },
  async put(key, value, opts = {}) {
    const ttl = Number(opts.expirationTtl) || 0;
    memory.set(key, { value: String(value), expires: ttl ? Date.now() + ttl * 1000 : 0 });
  },
  async delete(key) { memory.delete(key); },
};

export function storeFor(env) {
  if (env.CONCIERGE && typeof env.CONCIERGE.get === 'function') return { kv: env.CONCIERGE, persistent: true };
  if (!warned.kv) { warned.kv = true; console.warn('concierge: CONCIERGE KV binding missing, using in-memory storage (development only)'); }
  return { kv: memoryStore, persistent: false };
}

/** Test helper: forget everything held in the in-memory store. */
export const _resetMemoryStore = () => memory.clear();

// KV refuses expirationTtl below 60 seconds.
const ttl = (seconds) => Math.max(60, Math.ceil(seconds));

// ---------------------------------------------------------------------------
// Visitor key: a salted hash of the IP, never the IP itself
// ---------------------------------------------------------------------------

/**
 * The visitor's IP address is hashed with SHA-256 and a secret salt
 * (RATE_SALT) before it is used as a key, so nothing stored can be read back
 * into an address. The keys expire within the hour.
 */
export async function visitorKey(request, env) {
  const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-real-ip') || 'unknown';
  const salt = env.RATE_SALT || 'quvlo-concierge-default-salt';
  if (!env.RATE_SALT && !warned.salt) { warned.salt = true; console.warn('concierge: RATE_SALT is not set, using the built-in default salt'); }
  const data = new TextEncoder().encode(`${salt}|${ip}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].slice(0, 16).map((b) => b.toString(16).padStart(2, '0')).join('');
}

// ---------------------------------------------------------------------------
// Fixed window counters
// ---------------------------------------------------------------------------

/**
 * Count one hit against a fixed time window and say whether it is allowed.
 * A refused hit is not counted, so a blocked visitor does not keep pushing
 * their own window further away. Fixed windows can let up to twice the limit
 * through across a window boundary; fine for this purpose.
 */
export async function hitWindow(kv, name, who, limit, windowSeconds, now = Date.now()) {
  const slot = Math.floor(now / 1000 / windowSeconds);
  const key = `rl:${name}:${who}:${slot}`;
  const count = Number(await kv.get(key)) || 0;
  if (count >= limit) return { allowed: false, count };
  await kv.put(key, String(count + 1), { expirationTtl: ttl(windowSeconds + 60) });
  return { allowed: true, count: count + 1 };
}

// ---------------------------------------------------------------------------
// Spending ceilings
// ---------------------------------------------------------------------------

const capFrom = (raw, fallback) => {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};

export function caps(env) {
  return {
    daily: capFrom(env.CONCIERGE_DAILY_CAP_USD, LIMITS.defaultDailyCapUsd),
    monthly: capFrom(env.CONCIERGE_MONTHLY_CAP_USD, LIMITS.defaultMonthlyCapUsd),
  };
}

const monthKey = (d) => `cost:${d.toISOString().slice(0, 7)}`;
const dayOf = (d) => d.toISOString().slice(0, 10);

/**
 * One KV record per calendar month (UTC): { usd, day, dayUsd }. Keeping the
 * day inside the month record means one write per model call instead of two,
 * which matters on the KV free tier (1,000 writes a day).
 */
async function readSpend(kv, now) {
  const d = new Date(now);
  let rec = null;
  try { rec = JSON.parse((await kv.get(monthKey(d))) || 'null'); } catch { rec = null; }
  const today = dayOf(d);
  const usd = Number(rec?.usd) || 0;
  const dayUsd = rec?.day === today ? Number(rec?.dayUsd) || 0 : 0;
  return { usd, day: today, dayUsd };
}

/** Is there budget left today and this month? */
export async function budgetStatus(kv, env, now = Date.now()) {
  const spend = await readSpend(kv, now);
  const c = caps(env);
  if (spend.usd >= c.monthly) return { ok: false, reason: 'monthly_cap', spend, caps: c };
  if (spend.dayUsd >= c.daily) return { ok: false, reason: 'daily_cap', spend, caps: c };
  return { ok: true, spend, caps: c };
}

/** Add what a model call actually cost. */
export async function recordSpend(kv, usd, now = Date.now()) {
  if (!(usd > 0)) return;
  const spend = await readSpend(kv, now);
  const next = {
    usd: Math.round((spend.usd + usd) * 1e6) / 1e6,
    day: spend.day,
    dayUsd: Math.round((spend.dayUsd + usd) * 1e6) / 1e6,
  };
  await kv.put(monthKey(new Date(now)), JSON.stringify(next), { expirationTtl: ttl(40 * 24 * 3600) });
}
