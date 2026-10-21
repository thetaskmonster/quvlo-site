/**
 * POST /api/concierge
 *
 * The AI concierge on quvlo.co. A visitor picks a door ("I need a website",
 * "an app", ...), gets a fixed opening line, then has a short scoping chat with
 * Claude Opus 5.5 that ends in a three line brief and the booking button.
 *
 * The model key never reaches the browser. The chat history never comes from
 * the browser either: the server issues a random session id and keeps the
 * conversation in Workers KV, so a visitor cannot rewrite what "was said" to
 * steer the model.
 *
 * PRIVACY (for the privacy policy): chat transcripts are stored in Cloudflare
 * Workers KV for 90 days after the last message in that chat, then deleted
 * automatically. A brief the visitor confirms is also copied, with the
 * transcript, to Quvlo's Airtable (or emailed via Formspree as a fallback).
 * The visitor's IP address is never stored: rate limits use a salted SHA-256
 * hash of it that expires within the hour. Messages are processed by
 * Anthropic to generate replies.
 *
 * -------------------------------------------------------------------------
 * WIRE FORMAT (what the page sends and receives)
 * -------------------------------------------------------------------------
 *
 * Request: POST, Content-Type: application/json, body at most 8 KB:
 *   { "sessionId"?: string, "choice"?: string, "message"?: string }
 *
 *   - Start from a door:   { "choice": "website" }          (no model call)
 *     choice is one of: website | app | crm | automation | unsure
 *   - Door plus first message at once: { "choice": "app", "message": "..." }
 *   - Start with no door:  { "message": "..." }
 *   - Continue a chat:     { "sessionId": "<from the session event>", "message": "..." }
 *   message: up to 1,200 characters. Never send history; it is ignored.
 *
 * Response, case 1: Content-Type application/json. The request was not
 * answered. Shape:
 *   { "ok": false, "fallback": boolean, "reason": string }
 *   fallback: true  -> show the short contact form and the booking button
 *                      instead of the chat. reasons: unavailable,
 *                      chat_rate_limit, message_rate_limit, chat_turn_limit,
 *                      daily_cap, monthly_cap, declined
 *   fallback: false -> a request problem the page should handle itself.
 *                      reasons: forbidden, bad_request, too_large,
 *                      message_too_long (also carries "max": 1200), empty,
 *                      session_not_found (start a new chat)
 *
 * Response, case 2: Content-Type text/event-stream (Server-Sent Events). The
 * reply streams. Every event is a standard SSE frame:
 *
 *   event: <name>\n
 *   data: <one line of JSON>\n
 *   \n
 *
 * Read it with fetch() and a stream reader (EventSource cannot POST). Split on
 * blank lines, take the "event:" and "data:" lines, JSON.parse the data.
 * Events, in order:
 *
 *   session  { "sessionId": "uuid", "turnsLeft": 14 }
 *            Always first. Keep sessionId for the next request.
 *   delta    { "text": "..." }
 *            A piece of the concierge's reply. Append it to the current
 *            message bubble with textContent (it is plain text, never HTML).
 *   replace  { "text": "..." }
 *            Replace the current bubble's whole text with this. Sent when a
 *            reply had to be withdrawn part way through.
 *   brief    { "making": "...", "because": "...", "works_when": "...",
 *              "ruled_out"?: "...", "updated": boolean }
 *            Show the "Here's what I heard" card (You're making / Because /
 *            It works when). If updated is true, replace the card already on
 *            screen. Any delta after a brief starts a NEW message bubble
 *            below the card. Show the booking button with the card.
 *   done     { "turnsLeft": n, "briefSaved": boolean }
 *            The reply is complete. Re-enable the input. turnsLeft 0 means the
 *            chat is full: show the booking button and short form.
 *   error    { "fallback": true, "reason": "upstream_error" | "busy" | "unavailable" }
 *            The reply failed part way. Show the short form and booking
 *            button. Terminal, no done follows.
 *
 * Exactly one terminal event (done or error) ends every stream. Send one
 * message at a time and keep the input disabled until it arrives.
 *
 * -------------------------------------------------------------------------
 * ENVIRONMENT (Cloudflare Pages, Settings, Environment variables, Encrypt)
 * -------------------------------------------------------------------------
 *   ANTHROPIC_API_KEY          required. Without it every request returns
 *                              { ok:false, fallback:true, reason:"unavailable" }
 *   RATE_SALT                  random string, salts the IP hash
 *   CONCIERGE_DAILY_CAP_USD    default 5
 *   CONCIERGE_MONTHLY_CAP_USD  default 50
 *   AIRTABLE_TOKEN             personal access token, data.records:write
 *   AIRTABLE_BASE              defaults to the Quvlo Pipeline base
 *   AIRTABLE_BRIEFS_TABLE      table name or id, defaults to "Briefs"
 *   QUVLO_NOTIFY_URL           optional, defaults to the site's Formspree form
 *   ALLOWED_ORIGINS            optional comma list, replaces the default
 *                              allow list (see functions/_lib/limits.js)
 *   PAGES_PROJECT              optional, Pages project name for preview
 *                              origins, default "quvlo"
 *
 * KV BINDING (Settings, Functions, KV namespace bindings):
 *   CONCIERGE                  chats, rate limit counters, monthly spend.
 *                              Without it the function runs on in-memory
 *                              storage, which is for local development only.
 *
 * Full setup steps: docs/CONCIERGE.md
 */
import Anthropic from '@anthropic-ai/sdk';
import {
  LIMITS, SESSION_ID, EMAIL, cleanText, cleanLine, readCappedBody, originAllowed,
  storeFor, visitorKey, hitWindow, budgetStatus, recordSpend, usageCostUsd,
} from '../_lib/limits.js';
import {
  OPENING_LINES, DOOR_LABELS, HANDOFF_LINES, WRAP_UP_NOTE, SAVE_BRIEF_TOOL, SYSTEM_PROMPT, doorNote,
} from '../_lib/concierge-playbook.js';

const MODEL = 'claude-opus-5-5';
// Replies are one to three sentences, but thinking counts toward max_tokens
// too, so leave real room. At $20 per million output tokens the worst case
// for one call is about 8 cents, and the daily cap bounds the total.
const MAX_TOKENS = 4000;
// One reply can take a model call, a save_brief call, and the follow-up line.
const MAX_MODEL_ROUNDS = 3;
const SESSION_TTL_SECONDS = 90 * 24 * 60 * 60; // 90 days, see PRIVACY above
const WRAP_UP_AT_TURNS_LEFT = 3;
const MAX_REFUSALS_PER_CHAT = 2;

const AIRTABLE_BASE_DEFAULT = 'apphN1nIEYNfA5hr0';
const AIRTABLE_BRIEFS_DEFAULT = 'Briefs';
const DEFAULT_NOTIFY = 'https://formspree.io/f/mzdlnbkj';

const BASE_HEADERS = {
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer',
};

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { ...BASE_HEADERS, 'content-type': 'application/json; charset=utf-8' },
  });

/** The page should switch to the short form and the booking button. */
const fallback = (reason, status) => json({ ok: false, fallback: true, reason }, status);
/** A problem with the request itself; the chat can carry on. */
const reject = (reason, status, extra = {}) => json({ ok: false, fallback: false, reason, ...extra }, status);

const DOORS = Object.keys(OPENING_LINES);
const turnsLeftOf = (session) => Math.max(0, LIMITS.visitorTurnsPerChat - session.turns);
const chatKey = (id) => `chat:${id}`;

// ---------------------------------------------------------------------------
// Output scrubbing: nothing the visitor sees contains an em dash
// ---------------------------------------------------------------------------

const noEmDash = (s) => s.replace(/[ \t]*\u2014[ \t]*/g, ', ').replace(/, ,/g, ',');

/**
 * Streams arrive in small pieces, so a spaced em dash can be split across two of them.
 * Hold back trailing spaces and dashes until the next piece shows up.
 */
function makeScrubber() {
  let carry = '';
  return {
    push(piece) {
      let s = carry + piece;
      carry = '';
      const tail = s.match(/[ \t\u2014]+$/);
      if (tail) { carry = tail[0]; s = s.slice(0, -tail[0].length); }
      return noEmDash(s);
    },
    flush() {
      const s = noEmDash(carry).replace(/[ \t,]+$/, '');
      carry = '';
      return s;
    },
  };
}

// ---------------------------------------------------------------------------
// Request parsing
// ---------------------------------------------------------------------------

/** Validate the body. Returns { error } or { sessionId, choice, message }. */
export function parseBody(raw) {
  let body;
  try { body = JSON.parse(raw); } catch { return { error: reject('bad_request', 400) }; }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { error: reject('bad_request', 400) };

  const { sessionId, choice, message } = body;
  if (sessionId !== undefined && sessionId !== null && (typeof sessionId !== 'string' || !SESSION_ID.test(sessionId))) {
    return { error: reject('bad_request', 400) };
  }
  if (choice !== undefined && choice !== null && (typeof choice !== 'string' || !DOORS.includes(choice))) {
    return { error: reject('bad_request', 400) };
  }
  if (message !== undefined && message !== null && typeof message !== 'string') {
    return { error: reject('bad_request', 400) };
  }

  const text = cleanText(message);
  if (text.length > LIMITS.maxMessageChars) {
    return { error: reject('message_too_long', 400, { max: LIMITS.maxMessageChars }) };
  }
  const sid = sessionId || null;
  if (sid && !text) return { error: reject('empty', 400) };
  if (!sid && !choice && !text) return { error: reject('empty', 400) };

  return { sessionId: sid, choice: sid ? null : (choice || null), message: text || null };
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

function newSession(door) {
  const now = new Date().toISOString();
  return {
    v: 1,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    door: door || null,
    // Exactly what the model is sent, append only. Never edited after the
    // fact: Opus 5.5 ties its reasoning to the exact history, and edits also
    // throw away the prompt cache.
    messages: [],
    // What the visitor actually saw, for Airtable and for Kyle to read.
    transcript: [],
    turns: 0,
    refusals: 0,
    wrapUpSent: false,
    brief: null,
    briefRecordId: null,
  };
}

async function loadSession(kv, id) {
  const raw = await kv.get(chatKey(id));
  if (!raw) return null;
  try {
    const s = JSON.parse(raw);
    return s && s.v === 1 && Array.isArray(s.messages) ? s : null;
  } catch {
    return null;
  }
}

async function saveSession(kv, session) {
  session.updatedAt = new Date().toISOString();
  await kv.put(chatKey(session.id), JSON.stringify(session), { expirationTtl: SESSION_TTL_SECONDS });
}

// ---------------------------------------------------------------------------
// The brief
// ---------------------------------------------------------------------------

/** The model's tool input is untrusted too. Clean and cap every field. */
export function tidyBrief(input, previous) {
  const field = (v, max) => noEmDash(cleanLine(v, max));
  const brief = {
    making: field(input?.making, 300),
    because: field(input?.because, 300),
    works_when: field(input?.works_when, 300),
  };
  const ruledOut = field(input?.ruled_out, 300);
  if (ruledOut) brief.ruled_out = ruledOut;
  // Contact details given earlier are kept when a correction leaves them out.
  const name = field(input?.name, 100) || previous?.name || '';
  const email = cleanLine(input?.email, 200) || previous?.email || '';
  const pref = field(input?.contact_preference, 200) || previous?.contact_preference || '';
  if (name) brief.name = name;
  if (email && EMAIL.test(email)) brief.email = email;
  if (pref) brief.contact_preference = pref;
  return brief;
}

function transcriptText(session) {
  const lines = session.transcript.map((t) => `${t.role === 'visitor' ? 'Visitor' : 'Concierge'}: ${t.text}`);
  const text = lines.join('\n\n');
  return text.length > 90_000 ? `${text.slice(0, 90_000)}\n\n[transcript truncated]` : text;
}

/**
 * Save to Airtable, or email the team through Formspree if Airtable is not
 * configured or refuses. A corrected brief updates the same Airtable record.
 * Returns true if the brief reached the team by either route.
 */
async function deliverBrief(env, session, brief, isUpdate) {
  const token = env.AIRTABLE_TOKEN;
  const baseId = env.AIRTABLE_BASE || AIRTABLE_BASE_DEFAULT;
  const table = encodeURIComponent(env.AIRTABLE_BRIEFS_TABLE || AIRTABLE_BRIEFS_DEFAULT);
  const door = session.door ? DOOR_LABELS[session.door] : 'No door chosen';
  const transcript = transcriptText(session);

  if (token) {
    const fields = {
      Making: brief.making,
      Because: brief.because,
      'Works when': brief.works_when,
      'Ruled out': brief.ruled_out || '',
      Name: brief.name || '',
      Email: brief.email || '',
      'Contact preference': brief.contact_preference || '',
      Door: door,
      Transcript: transcript,
      Session: session.id,
      'Saved at': new Date().toISOString(),
    };
    const headers = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
    const url = `https://api.airtable.com/v0/${baseId}/${table}`;
    try {
      if (session.briefRecordId) {
        const res = await fetch(`${url}/${session.briefRecordId}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ fields, typecast: true }),
          signal: AbortSignal.timeout(10000),
        });
        if (res.ok) return true;
        console.error('concierge: airtable update failed', res.status, (await res.text()).slice(0, 300));
      } else {
        const res = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify({ records: [{ fields: { ...fields, Stage: 'New' } }], typecast: true }),
          signal: AbortSignal.timeout(10000),
        });
        if (res.ok) {
          const data = await res.json().catch(() => null);
          const id = data?.records?.[0]?.id;
          if (typeof id === 'string' && /^rec[A-Za-z0-9]{14}$/.test(id)) session.briefRecordId = id;
          return true;
        }
        console.error('concierge: airtable write failed', res.status, (await res.text()).slice(0, 300));
      }
    } catch (e) {
      console.error('concierge: airtable unreachable', e?.message);
    }
  }

  // No token, or Airtable refused. Never drop a brief.
  try {
    const res = await fetch(env.QUVLO_NOTIFY_URL || DEFAULT_NOTIFY, {
      method: 'POST',
      headers: { accept: 'application/json', 'content-type': 'application/json' },
      body: JSON.stringify({
        _subject: `Concierge brief${isUpdate ? ' (updated)' : ''}: ${brief.making.slice(0, 80)}`,
        name: brief.name || 'Quvlo concierge visitor',
        ...(brief.email ? { email: brief.email } : {}),
        message: [
          `A visitor finished a brief with the AI concierge${isUpdate ? ' and then corrected it' : ''}.`,
          '',
          `Door:               ${door}`,
          `You're making:      ${brief.making}`,
          `Because:            ${brief.because}`,
          `It works when:      ${brief.works_when}`,
          `Ruled out:          ${brief.ruled_out || 'nothing mentioned'}`,
          `Name:               ${brief.name || 'not given'}`,
          `Email:              ${brief.email || 'not given'}`,
          `Contact preference: ${brief.contact_preference || 'not given'}`,
          `Session:            ${session.id}`,
          '',
          'Transcript:',
          transcript,
          '',
          token ? 'NOTE: the Airtable write failed, so this arrived by email instead.' : 'NOTE: Airtable is not configured for briefs yet, so this arrived by email.',
        ].join('\n'),
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) return true;
    console.error('concierge: brief fallback notification refused', res.status);
  } catch (e) {
    console.error('concierge: brief fallback notification failed', e?.message);
  }
  return false;
}

// ---------------------------------------------------------------------------
// The model turn
// ---------------------------------------------------------------------------

/**
 * What to store from a response so it can be sent back next turn.
 * After a server-side fallback the API asks callers to drop the declined
 * model's thinking and tool calls that come before the last fallback marker;
 * everything else is kept exactly as returned.
 */
export function forReplay(content) {
  let boundary = -1;
  content.forEach((b, i) => { if (b.type === 'fallback') boundary = i; });
  if (boundary < 0) return content;
  const dropBefore = new Set(['thinking', 'redacted_thinking', 'tool_use', 'server_tool_use']);
  return content.filter((b, i) => i >= boundary || !dropBefore.has(b.type));
}

function requestParams(session) {
  return {
    model: MODEL,
    max_tokens: MAX_TOKENS,
    // Thinking stays on (Opus 5.5 cannot turn it off); low effort keeps it
    // brief, which is right for a short conversational reply.
    output_config: { effort: 'low' },
    // Stable prefix, cached: the tool definition and the system prompt.
    system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
    tools: [SAVE_BRIEF_TOOL],
    // Forced tool choice is not allowed on Opus 5.5; the prompt says when to
    // call save_brief and the tool is strict so its arguments match.
    tool_choice: { type: 'auto' },
    // Cache the growing conversation as well.
    cache_control: { type: 'ephemeral' },
    // If a safety classifier declines a benign message, Anthropic re-runs it
    // on its recommended fallback model instead of failing the chat.
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    messages: session.messages,
  };
}

function errorReason(err) {
  if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) return 'unavailable';
  if (err instanceof Anthropic.RateLimitError) return 'busy';
  if (err instanceof Anthropic.APIError && err.status === 529) return 'busy';
  return 'upstream_error';
}

/**
 * Runs one visitor message through the model and streams the reply.
 * Mutates `session` (append only) and returns { spentUsd, failed }.
 */
async function runModel(env, session, send) {
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, maxRetries: 1, timeout: 60_000 });
  let spentUsd = 0;

  for (let round = 0; round < MAX_MODEL_ROUNDS; round++) {
    const scrub = makeScrubber();
    let shown = '';
    let message;
    try {
      const stream = client.beta.messages.stream(requestParams(session));
      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          const piece = scrub.push(event.delta.text);
          if (piece) { shown += piece; await send('delta', { text: piece }); }
        }
      }
      message = await stream.finalMessage();
    } catch (err) {
      console.error('concierge: model call failed', err?.constructor?.name, err?.status ?? '', err?.message?.slice?.(0, 200));
      if (shown) session.transcript.push({ role: 'concierge', text: shown, at: new Date().toISOString(), incomplete: true });
      await send('error', { fallback: true, reason: errorReason(err) });
      return { spentUsd, failed: true };
    }

    const tail = scrub.flush();
    if (tail) { shown += tail; await send('delta', { text: tail }); }
    spentUsd += usageCostUsd(message.usage, MODEL);

    // Check the stop reason before using the content. A refusal here means
    // the requested model and its fallback both declined.
    if (message.stop_reason === 'refusal') {
      console.error('concierge: reply declined', message.stop_details?.category ?? 'no category');
      session.refusals += 1;
      const line = HANDOFF_LINES.sensitive;
      await send('replace', { text: line });
      session.messages.push({ role: 'assistant', content: line });
      session.transcript.push({ role: 'concierge', text: line, at: new Date().toISOString() });
      return { spentUsd, failed: false };
    }

    const content = forReplay(message.content);
    const toolUses = content.filter((b) => b.type === 'tool_use');

    if (toolUses.length && message.stop_reason === 'max_tokens') {
      // A tool call cut off mid-way. Do not run it, and do not store a
      // tool call that will never get an answer.
      const line = HANDOFF_LINES.default;
      await send('replace', { text: line });
      session.messages.push({ role: 'assistant', content: line });
      session.transcript.push({ role: 'concierge', text: line, at: new Date().toISOString() });
      return { spentUsd, failed: false };
    }

    session.messages.push({ role: 'assistant', content });
    if (shown.trim()) session.transcript.push({ role: 'concierge', text: shown.trim(), at: new Date().toISOString() });

    if (!toolUses.length) return { spentUsd, failed: false };

    const results = [];
    for (const call of toolUses) {
      if (call.name !== 'save_brief') {
        results.push({ type: 'tool_result', tool_use_id: call.id, is_error: true, content: 'Unknown tool. The only tool is save_brief.' });
        continue;
      }
      const brief = tidyBrief(call.input, session.brief);
      if (!brief.making || !brief.because || !brief.works_when) {
        results.push({ type: 'tool_result', tool_use_id: call.id, is_error: true, content: 'making, because and works_when are all required and must not be empty.' });
        continue;
      }
      const isUpdate = Boolean(session.brief);
      session.brief = brief;
      const delivered = await deliverBrief(env, session, brief, isUpdate);
      await send('brief', {
        making: brief.making,
        because: brief.because,
        works_when: brief.works_when,
        ...(brief.ruled_out ? { ruled_out: brief.ruled_out } : {}),
        updated: isUpdate,
      });
      session.transcript.push({
        role: 'concierge',
        text: `[Brief card] You're making: ${brief.making} | Because: ${brief.because} | It works when: ${brief.works_when}`,
        at: new Date().toISOString(),
      });
      results.push({
        type: 'tool_result',
        tool_use_id: call.id,
        content: delivered
          ? 'Saved and sent to the team. The visitor can now see the summary card. Reply in one or two sentences: if this is the first version, ask whether anything is wrong and say they can fix it and you will update the brief; if they have already confirmed it, point them to the booking button on the page.'
          : 'The visitor can see the summary card, but it could not be sent to the team automatically. Ask whether anything is wrong with it, and ask them to use the booking button on the page so nothing gets lost.',
      });
    }
    session.messages.push({ role: 'user', content: results });
  }
  return { spentUsd, failed: false };
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function onRequestPost({ request, env, waitUntil }) {
  // 1. Our own pages only.
  if (!originAllowed(request.headers.get('origin'), env)) return reject('forbidden', 403);

  // 2. JSON only, small bodies only.
  const type = (request.headers.get('content-type') || '').toLowerCase();
  if (!type.startsWith('application/json')) return reject('bad_request', 415);
  let raw;
  try { raw = await readCappedBody(request, LIMITS.maxBodyBytes); } catch { return reject('bad_request', 400); }
  if (raw === null) return reject('too_large', 413);

  const parsed = parseBody(raw);
  if (parsed.error) return parsed.error;

  // 3. No key, no chat. The page shows the short form instead.
  if (!env.ANTHROPIC_API_KEY) return fallback('unavailable', 503);

  const { kv } = storeFor(env);
  let session;
  let isNew = false;
  try {
    const who = await visitorKey(request, env);

    if (parsed.sessionId) {
      session = await loadSession(kv, parsed.sessionId);
      if (!session) return reject('session_not_found', 404);
    }

    if (parsed.message) {
      if (session && session.turns >= LIMITS.visitorTurnsPerChat) return fallback('chat_turn_limit', 429);
      if (session && session.refusals >= MAX_REFUSALS_PER_CHAT) return fallback('declined', 409);
      const budget = await budgetStatus(kv, env);
      if (!budget.ok) return fallback(budget.reason, 503);
    }

    if (!session) {
      const chats = await hitWindow(kv, 'c', who, LIMITS.chatsPerWindow, LIMITS.chatWindowSeconds);
      if (!chats.allowed) return fallback('chat_rate_limit', 429);
      session = newSession(parsed.choice);
      isNew = true;
    }

    if (parsed.message) {
      const msgs = await hitWindow(kv, 'm', who, LIMITS.messagesPerWindow, LIMITS.messageWindowSeconds);
      if (!msgs.allowed) return fallback('message_rate_limit', 429);
    }
  } catch (e) {
    console.error('concierge: storage unavailable', e?.message);
    return fallback('unavailable', 503);
  }

  if (isNew) openChat(session);

  // 4. Stream the reply.
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();
  let clientGone = false;
  const send = async (event, data) => {
    if (clientGone) return;
    try {
      await writer.write(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
    } catch {
      clientGone = true; // the visitor closed the tab; finish the work anyway
    }
  };

  const work = (async () => {
    let failed = false;
    try {
      await send('session', { sessionId: session.id, turnsLeft: turnsLeftOf(session) });
      if (isNew && session.door && parsed.message === null) {
        await send('delta', { text: OPENING_LINES[session.door] });
      }

      if (parsed.message) {
        const historyBefore = session.messages.length;
        const wrapUpBefore = session.wrapUpSent;
        session.turns += 1;
        session.messages.push({ role: 'user', content: parsed.message });
        session.transcript.push({ role: 'visitor', text: parsed.message, at: new Date().toISOString() });
        if (!session.wrapUpSent && turnsLeftOf(session) <= WRAP_UP_AT_TURNS_LEFT) {
          // Appended after the history (never edited in), so the cached
          // prefix and earlier reasoning stay valid.
          session.messages.push({ role: 'system', content: WRAP_UP_NOTE });
          session.wrapUpSent = true;
        }
        const result = await runModel(env, session, send);
        failed = result.failed;
        if (failed && session.messages.length === historyBefore + (session.wrapUpSent && !wrapUpBefore ? 2 : 1)) {
          // Nothing was answered. Take the unanswered message (and any
          // operator note) back out so the stored history stays valid; the
          // visitor can simply send it again. The turn still counts.
          session.messages.length = historyBefore;
          session.wrapUpSent = wrapUpBefore;
        }
        try { await recordSpend(kv, result.spentUsd); } catch (e) { console.error('concierge: could not record spend', e?.message); }
      }

      try { await saveSession(kv, session); } catch (e) { console.error('concierge: could not save chat', e?.message); }
      if (!failed) await send('done', { turnsLeft: turnsLeftOf(session), briefSaved: Boolean(session.brief) });
    } catch (e) {
      console.error('concierge: unexpected failure', e?.message);
      await send('error', { fallback: true, reason: 'upstream_error' });
    } finally {
      try { await writer.close(); } catch { /* already closed */ }
    }
  })();

  if (typeof waitUntil === 'function') waitUntil(work);

  return new Response(readable, {
    status: 200,
    headers: { ...BASE_HEADERS, 'content-type': 'text/event-stream; charset=utf-8' },
  });
}

/** First messages of a new chat. A door chat opens with its fixed line. */
function openChat(session) {
  if (session.messages.length) return session;
  if (session.door) {
    const line = OPENING_LINES[session.door];
    session.messages.push({ role: 'user', content: doorNote(session.door) });
    session.messages.push({ role: 'assistant', content: line });
    session.transcript.push({ role: 'concierge', text: line, at: new Date().toISOString() });
  }
  return session;
}

export const onRequestGet = () => json({ ok: false, fallback: false, reason: 'bad_request' }, 405);
