/**
 * POST /api/scan  { "url": "example.com" }
 *
 * Fetches a public web page and runs the Quvlo static accessibility audit over
 * the HTML the server actually sent. Runs as a Cloudflare Pages Function on the
 * same project, so there is no extra service and no API key anywhere.
 *
 * This endpoint takes a URL from an anonymous visitor and asks our own
 * infrastructure to fetch it, so it is a server side request forgery surface by
 * definition. Everything below exists to keep it from becoming one: only public
 * http(s), no credentials, no redirects followed blindly, a hard timeout, and a
 * cap on how much of the response is read.
 */
import { audit } from '../../lib/audit.js';

const TIMEOUT_MS = 8000;
const MAX_BYTES = 2_500_000;
const MAX_REDIRECTS = 3;

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    },
  });

const fail = (message, status = 400) => json({ ok: false, error: message }, status);

/** Hostnames that must never be fetched: loopback, link local, private ranges, internal names. */
export function isBlockedHost(host) {
  const h = host.toLowerCase().replace(/\.$/, '');
  if (!h) return true;
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal') || h.endsWith('.home.arpa')) return true;
  if (h === 'metadata.google.internal') return true;
  // bare IPv6 / IPv4-mapped loopback
  if (h.startsWith('[')) {
    const v6 = h.slice(1, -1);
    if (v6 === '::1' || v6 === '::' || /^f[cd]/i.test(v6) || /^fe80/i.test(v6)) return true;
    return false;
  }
  const v4 = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    if (v4.slice(1).some((n) => Number(n) > 255)) return true;
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true;            // cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;  // carrier grade NAT
    if (a >= 224) return true;                          // multicast and reserved
  }
  return false;
}

/** Accept what a normal person types: "example.com", "www.example.com/path", a full URL. */
export function normalise(raw) {
  let s = String(raw || '').trim();
  if (!s) throw new Error('Enter a website address.');
  if (s.length > 300) throw new Error('That address is too long.');
  if (!/^https?:\/\//i.test(s)) s = 'https://' + s;
  let u;
  try { u = new URL(s); } catch { throw new Error('That does not look like a web address.'); }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error('Only http and https addresses can be scanned.');
  if (u.username || u.password) throw new Error('Addresses with credentials in them cannot be scanned.');
  if (!u.hostname.includes('.') && !u.hostname.startsWith('[')) throw new Error('That does not look like a public web address.');
  if (isBlockedHost(u.hostname)) throw new Error('That address is not publicly reachable.');
  u.hash = '';
  return u;
}

/** Follow redirects by hand so every hop is re-validated against the block list. */
async function fetchPage(startUrl, signal) {
  let url = startUrl;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const res = await fetch(url.toString(), {
      signal,
      redirect: 'manual',
      headers: {
        // identify honestly; some hosts serve a different page to unknown agents
        'user-agent': 'QuvloTeardownBot/1.0 (+https://quvlo.co/; accessibility check)',
        accept: 'text/html,application/xhtml+xml',
        'accept-language': 'en-US,en;q=0.9',
      },
    });
    if ([301, 302, 303, 307, 308].includes(res.status)) {
      const loc = res.headers.get('location');
      if (!loc) return { res, url };
      let next;
      try { next = new URL(loc, url); } catch { throw new Error('That site sent a redirect we could not follow.'); }
      if (next.protocol !== 'http:' && next.protocol !== 'https:') throw new Error('That site redirected somewhere we will not follow.');
      if (isBlockedHost(next.hostname)) throw new Error('That site redirected to a private address.');
      url = next;
      continue;
    }
    return { res, url };
  }
  throw new Error('That site redirected too many times.');
}

/** Read at most MAX_BYTES so a huge or endless response cannot tie up the worker. */
async function readCapped(res) {
  const reader = res.body?.getReader();
  if (!reader) return { text: await res.text(), truncated: false };
  const chunks = [];
  let total = 0, truncated = false;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > MAX_BYTES) { chunks.push(value.slice(0, value.length - (total - MAX_BYTES))); truncated = true; break; }
    chunks.push(value);
  }
  try { await reader.cancel(); } catch { /* already closed */ }
  const buf = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
  let off = 0;
  for (const c of chunks) { buf.set(c, off); off += c.length; }
  return { text: new TextDecoder('utf-8', { fatal: false }).decode(buf), truncated, bytes: total };
}

export async function onRequestPost({ request }) {
  let target;
  try {
    const ct = request.headers.get('content-type') || '';
    const body = ct.includes('application/json') ? await request.json() : Object.fromEntries(await request.formData());
    target = normalise(body.url);
  } catch (e) {
    return fail(e.message || 'That does not look like a web address.');
  }

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);
  const started = Date.now();
  try {
    const { res, url } = await fetchPage(target, ac.signal);
    const ms = Date.now() - started;

    if (res.status >= 400) {
      return json({ ok: false, error: `That site answered with an error (HTTP ${res.status}), so there was nothing to scan.`, status: res.status }, 200);
    }
    const type = res.headers.get('content-type') || '';
    if (type && !/text\/html|application\/xhtml/i.test(type)) {
      return json({ ok: false, error: `That address returned ${type.split(';')[0]} rather than a web page.` }, 200);
    }

    const { text, truncated, bytes } = await readCapped(res);
    if (!text.trim()) return json({ ok: false, error: 'That site returned an empty response.' }, 200);

    const result = audit(text, { bytes: bytes ?? text.length, ms, finalUrl: url.toString(), status: res.status });
    result.truncated = !!truncated;
    result.scannedAt = new Date().toISOString();
    return json(result);
  } catch (e) {
    const aborted = e?.name === 'AbortError';
    return json({
      ok: false,
      error: aborted
        ? 'That site took too long to answer, so the scan timed out.'
        : (/fetch failed|Failed to fetch|ENOTFOUND|getaddrinfo/i.test(e?.message || '')
            ? 'That site could not be reached. Check the address and try again.'
            : (e?.message || 'That site could not be reached.')),
    }, 200);
  } finally {
    clearTimeout(timer);
  }
}

/** Anything other than POST gets a clear answer rather than a stack trace. */
export const onRequestGet = () => fail('Send a POST with { "url": "example.com" } to run a scan.', 405);
