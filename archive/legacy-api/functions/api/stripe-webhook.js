/**
 * POST /api/stripe-webhook
 *
 * Stripe tells us when a deposit actually cleared. Until this existed the only
 * evidence a payment happened was that the buyer's browser landed on the
 * thank-you page, which is not evidence at all: anyone can visit that URL, and a
 * buyer who closes the tab during the redirect leaves no trace.
 *
 * This endpoint is public, so the signature check below is the entire security
 * model. Without it anyone could POST a fake "deposit received" and we would
 * cheerfully believe it. Every request must carry a stripe-signature header we
 * can reproduce with STRIPE_WEBHOOK_SECRET, over the exact raw bytes Stripe
 * sent, within a five minute window.
 *
 * ENVIRONMENT (Cloudflare Pages, Settings, Environment variables, Encrypt):
 *   STRIPE_WEBHOOK_SECRET   whsec_... from the Stripe webhook endpoint screen
 *   QUVLO_NOTIFY_URL        optional, the Formspree endpoint to notify. Falls
 *                           back to the same form the site already uses, so no
 *                           new service and no new cost.
 *
 * KV BINDING (Cloudflare Pages, Settings, Functions, KV namespace bindings):
 *   QUVLO_EVENTS            optional but recommended. Remembers which Stripe
 *                           event ids have already been acted on, so the
 *                           retries Stripe sends after any hiccup do not send
 *                           the same deposit alert twice. With no binding the
 *                           webhook still works and simply loses that
 *                           protection, because a duplicate email is a far
 *                           smaller problem than a missed deposit.
 */

/** Stripe retries a failing endpoint for about three days. Thirty covers that
 *  comfortably and an event id is a few dozen bytes. */
const SEEN_TTL_SECONDS = 60 * 60 * 24 * 30;

/**
 * Claim an event id before acting on it.
 *
 * Claiming first, rather than recording after, is what stops two retries that
 * arrive at the same moment from both sending. The caller MUST release the
 * claim if the work then fails, otherwise a delivery that failed to notify
 * would be permanently marked as handled and the deposit would go unnoticed.
 */
async function claimEvent(kv, id) {
  if (!kv) return { claimed: true, tracked: false };
  const key = `evt:${id}`;
  try {
    if (await kv.get(key)) return { claimed: false, tracked: true };
    await kv.put(key, new Date().toISOString(), { expirationTtl: SEEN_TTL_SECONDS });
    return { claimed: true, tracked: true };
  } catch (e) {
    // Storage trouble must not cost us a real deposit alert.
    console.error('event store unavailable, proceeding without duplicate protection', e?.message);
    return { claimed: true, tracked: false };
  }
}

async function releaseEvent(kv, id) {
  if (!kv) return;
  try { await kv.delete(`evt:${id}`); }
  catch (e) { console.error('could not release event claim', id, e?.message); }
}

const TOLERANCE_SECONDS = 300;
const DEFAULT_NOTIFY = 'https://formspree.io/f/mzdlnbkj';

const text = (body, status = 200) =>
  new Response(body, { status, headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' } });

/** Constant time compare so a timing side channel cannot leak the signature. */
function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

async function hmacHex(secret, payload) {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  return hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload)));
}

/**
 * Verify Stripe's signature header against the raw body.
 * Header shape: t=<unix>,v1=<hex>[,v1=<hex>...]
 */
export async function verify(rawBody, header, secret, nowSeconds = Math.floor(Date.now() / 1000)) {
  if (!header) return { ok: false, reason: 'no signature header' };
  const parts = Object.create(null);
  const v1 = [];
  for (const piece of header.split(',')) {
    const [k, v] = piece.split('=');
    if (k === 'v1') v1.push((v || '').trim());
    else if (k) parts[k.trim()] = (v || '').trim();
  }
  const t = Number(parts.t);
  if (!Number.isFinite(t)) return { ok: false, reason: 'no timestamp' };
  if (!v1.length) return { ok: false, reason: 'no v1 signature' };
  // A captured request must not be replayable tomorrow.
  if (Math.abs(nowSeconds - t) > TOLERANCE_SECONDS) return { ok: false, reason: 'timestamp outside tolerance' };

  const expected = await hmacHex(secret, `${t}.${rawBody}`);
  return v1.some((sig) => safeEqual(sig, expected))
    ? { ok: true }
    : { ok: false, reason: 'signature mismatch' };
}

/** Turn a paid checkout session into the note Kyle actually wants to read. */
export function describe(session) {
  const m = session.metadata || {};
  const paid = ((session.amount_total ?? 0) / 100).toLocaleString('en-US', { style: 'currency', currency: (session.currency || 'usd').toUpperCase() });
  return {
    subject: `Deposit received: ${m.business || 'a new client'}`,
    lines: [
      `${m.business || 'Unknown business'} just paid a deposit on quvlo.co.`,
      '',
      `Package:            ${m.package || 'unknown'}`,
      `Paid now:           ${paid}`,
      `Project total:      ${m.total || 'see Stripe'}`,
      `Balance on launch:  ${m.balance_due_on_completion || 'see Stripe'}`,
      `Email:              ${session.customer_details?.email || session.customer_email || 'not given'}`,
      `Current website:    ${m.website || 'not given'}`,
      '',
      `Stripe session:     ${session.id}`,
      '',
      'Next: email them within one business day, ask for logo, services and domain access.',
    ],
  };
}

export async function onRequestPost({ request, env, waitUntil }) {
  const secret = env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    // Cannot verify, so must not trust. 500 makes Stripe retry once this is fixed.
    console.error('stripe webhook called but STRIPE_WEBHOOK_SECRET is not set');
    return text('webhook not configured', 500);
  }

  // The signature covers the exact bytes sent, so read the body as text first
  // and never re-serialise it before checking.
  const raw = await request.text();
  const check = await verify(raw, request.headers.get('stripe-signature'), secret);
  if (!check.ok) {
    console.error('stripe webhook rejected:', check.reason);
    return text('invalid signature', 400);
  }

  let event;
  try {
    event = JSON.parse(raw);
  } catch {
    return text('malformed payload', 400);
  }

  // Anything we do not handle still gets a 200, or Stripe retries it forever.
  if (event.type !== 'checkout.session.completed') {
    return text(`ignored ${event.type}`, 200);
  }

  const session = event.data?.object || {};
  // completed can fire before an async method settles, so only act on paid.
  if (session.payment_status !== 'paid') {
    return text(`session ${session.id} not paid yet (${session.payment_status})`, 200);
  }

  // Stripe retries on any hiccup, so the same paid event can arrive more than
  // once. Claim it before doing anything with side effects.
  const kv = env.QUVLO_EVENTS;
  const { claimed, tracked } = await claimEvent(kv, event.id);
  if (!claimed) {
    return text(`duplicate ${event.id} already handled`, 200);
  }

  const note = describe(session);
  const notifyUrl = env.QUVLO_NOTIFY_URL || DEFAULT_NOTIFY;

  const deliver = (async () => {
    try {
      const res = await fetch(notifyUrl, {
        method: 'POST',
        headers: { accept: 'application/json', 'content-type': 'application/json' },
        body: JSON.stringify({
          _subject: note.subject,
          name: 'Quvlo deposit alert',
          email: session.customer_details?.email || session.customer_email || 'hello@quvlo.co',
          message: note.lines.join('\n'),
          stripe_event: event.id,
        }),
      });
      if (!res.ok) throw new Error(`notify returned ${res.status}`);
    } catch (e) {
      // Hand the id back so Stripe's next retry is allowed to try again.
      // Without this a failed send would sit marked as handled forever.
      console.error('deposit notification failed, releasing claim', event.id, e?.message);
      await releaseEvent(kv, event.id);
    }
  })();

  // Answer Stripe immediately; let the notification finish in the background.
  if (typeof waitUntil === 'function') waitUntil(deliver); else await deliver;

  return text(`ok ${session.id}${tracked ? '' : ' (untracked)'}`, 200);
}

/** A browser hitting this by hand should get an explanation, not a stack trace. */
export const onRequestGet = () =>
  text('This endpoint receives Stripe webhooks. POST only, and it must be signed.', 405);
