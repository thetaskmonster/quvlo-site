/**
 * POST /api/lead
 *
 * Captures an email AFTER a scan has already run and shown its findings, along
 * with those findings, so the follow-up can quote the person's own site instead
 * of reading like a template.
 *
 * The scan itself never asks for an email and never will. The page says "No
 * email needed" and that has to stay true, so this endpoint exists only for the
 * offer that appears underneath a completed result.
 *
 * ENVIRONMENT (Cloudflare Pages, Settings, Environment variables, Encrypt):
 *   AIRTABLE_TOKEN     personal access token with data.records:write on the base
 *   AIRTABLE_BASE      defaults to the Quvlo Pipeline base
 *   AIRTABLE_TABLE     defaults to the Scan Leads table
 *   QUVLO_NOTIFY_URL   optional fallback notification, defaults to Formspree
 *
 * If Airtable is not configured the lead is still captured, by falling back to
 * the same Formspree inbox the rest of the site uses. Losing a lead because a
 * token was missing would be the worst possible failure here.
 */

const AIRTABLE_BASE_DEFAULT = 'apphN1nIEYNfA5hr0';
const AIRTABLE_TABLE_DEFAULT = 'tblJnfVRmNYttm6MU';
const DEFAULT_NOTIFY = 'https://formspree.io/f/mzdlnbkj';

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    },
  });

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const clean = (v, max) => String(v ?? '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, max);

/** Findings arrive from our own scanner, but treat them as untrusted anyway. */
function tidyFindings(list) {
  if (!Array.isArray(list)) return [];
  return list.slice(0, 12).map((f) => ({
    sev: clean(f?.sev, 12),
    code: clean(f?.code, 24),
    level: clean(f?.level, 4),
    title: clean(f?.title, 200),
  }));
}

export async function onRequestPost({ request, env, waitUntil }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'Malformed request.' }, 400);
  }

  // Bots fill in everything, including fields nobody can see.
  if (clean(body.company, 100)) return json({ ok: true, skipped: true });

  const email = clean(body.email, 200);
  if (!EMAIL.test(email)) {
    return json({ ok: false, error: 'Please check that email address so we can send the teardown to it.' }, 400);
  }

  const site = clean(body.site, 300);
  const findings = tidyFindings(body.findings);
  const human = Number.isFinite(+body.human) ? Math.round(+body.human) : null;
  const agent = Number.isFinite(+body.agent) ? Math.round(+body.agent) : null;
  const kb = Number.isFinite(+body.kb) ? Math.round(+body.kb) : null;
  const criticals = findings.filter((f) => f.sev === 'critical').length;

  const findingText = findings.length
    ? findings.map((f) => `${f.sev.toUpperCase()}: ${f.title}${f.level ? ` (WCAG ${f.code} ${f.level})` : ''}`).join('\n')
    : 'No blocking issues were found in the served HTML.';

  const token = env.AIRTABLE_TOKEN;
  const baseId = env.AIRTABLE_BASE || AIRTABLE_BASE_DEFAULT;
  const tableId = env.AIRTABLE_TABLE || AIRTABLE_TABLE_DEFAULT;

  const work = (async () => {
    if (token) {
      try {
        const res = await fetch(`https://api.airtable.com/v0/${baseId}/${tableId}`, {
          method: 'POST',
          headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
          body: JSON.stringify({
            records: [{
              fields: {
                Email: email,
                'Site scanned': site || undefined,
                'Scanned at': new Date().toISOString(),
                'Human score': human ?? undefined,
                'Agent score': agent ?? undefined,
                'Critical findings': criticals,
                'Page KB': kb ?? undefined,
                Findings: findingText,
                Stage: 'New',
              },
            }],
            typecast: true,
          }),
          signal: AbortSignal.timeout(10000),
        });
        if (res.ok) return;
        console.error('airtable write failed', res.status, (await res.text()).slice(0, 300));
      } catch (e) {
        console.error('airtable unreachable', e?.message);
      }
    }
    // Either no token, or Airtable refused. Never drop the lead.
    try {
      await fetch(env.QUVLO_NOTIFY_URL || DEFAULT_NOTIFY, {
        method: 'POST',
        headers: { accept: 'application/json', 'content-type': 'application/json' },
        body: JSON.stringify({
          _subject: `Scan lead: ${site || email}`,
          name: 'Quvlo scan lead',
          email,
          message: [
            `${email} asked for the full teardown after scanning their site.`,
            '',
            `Site:          ${site || 'not recorded'}`,
            `Human score:   ${human ?? 'n/a'}`,
            `Agent score:   ${agent ?? 'n/a'}`,
            `Page weight:   ${kb ?? 'n/a'} KB`,
            '',
            'What the scanner found:',
            findingText,
            '',
            token ? 'NOTE: the Airtable write failed, so this arrived by email instead.' : 'NOTE: Airtable is not configured yet, so this arrived by email.',
          ].join('\n'),
        }),
      });
    } catch (e) {
      console.error('lead fallback notification failed', e?.message);
    }
  })();

  if (typeof waitUntil === 'function') waitUntil(work); else await work;

  return json({ ok: true });
}

export const onRequestGet = () =>
  json({ ok: false, error: 'POST only.' }, 405);
