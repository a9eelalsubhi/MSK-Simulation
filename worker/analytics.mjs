import { dashboardHTML, dashboardJS, signInHTML } from './dashboard.mjs';

export const SESSION_MS = 30 * 60 * 1000;
const COOKIE = '__Host-atlas_vid';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PRIVATE_HEADERS = {
  'Cache-Control': 'private, no-store, max-age=0',
  'Vary': 'Cookie, oai-authenticated-user-id, oai-authenticated-user-email',
  'X-Robots-Tag': 'noindex, nofollow',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'same-origin',
};

export function isOwner(request, env) {
  // These identity headers are supplied/validated by Sites dispatch, never by
  // client JS. An authenticated non-owner must fail even if they know the URL.
  const id = request.headers.get('oai-authenticated-user-id');
  const email = request.headers.get('oai-authenticated-user-email');
  return !!(id && email && env.ANALYTICS_OWNER_EMAIL &&
    email.trim().toLowerCase() === env.ANALYTICS_OWNER_EMAIL.trim().toLowerCase());
}

export function dayInRiyadh(ms) {
  return new Date(ms + 3 * 3600000).toISOString().slice(0, 10);
}

function json(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status, headers: { ...PRIVATE_HEADERS, 'Content-Type': 'application/json; charset=utf-8' },
  });
}

function html(value, status = 200) {
  return new Response(value, { status, headers: {
    ...PRIVATE_HEADERS, 'Content-Type': 'text/html; charset=utf-8',
    'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; connect-src 'self'; img-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
  } });
}

function cookieId(request) {
  const cookie = request.headers.get('cookie') || '';
  const value = cookie.split(';').map(x => x.trim()).find(x => x.startsWith(COOKIE + '='))?.slice(COOKIE.length + 1);
  return value && UUID.test(value) ? value.toLowerCase() : null;
}

export async function recordVisit(db, { visitorId, eventId, lecture }, now = Date.now()) {
  const session = crypto.randomUUID();
  // D1 batch is a transaction. Session selection happens INSIDE that transaction,
  // avoiding the read/modify/write race when two tabs enter simultaneously.
  // Composite event identity also makes network retries idempotent.
  await db.batch([
    db.prepare(`INSERT INTO analytics_visitors(id, first_seen, last_seen, last_session)
      VALUES (?, ?, 0, '') ON CONFLICT(id) DO NOTHING`).bind(visitorId, now),
    db.prepare(`INSERT INTO analytics_events(visitor_id, event_id, session_id, lecture, created_at, day)
      VALUES (?, ?, COALESCE(NULLIF((SELECT CASE WHEN last_seen >= ? THEN last_session ELSE '' END
        FROM analytics_visitors WHERE id = ?), ''), ?), ?, ?, ?)
      ON CONFLICT(visitor_id, event_id) DO NOTHING`).bind(visitorId, eventId, now - SESSION_MS, visitorId, session, lecture, now, dayInRiyadh(now)),
    db.prepare(`UPDATE analytics_visitors SET
      last_session = CASE WHEN last_seen <= (SELECT created_at FROM analytics_events WHERE visitor_id = ? AND event_id = ?)
        THEN (SELECT session_id FROM analytics_events WHERE visitor_id = ? AND event_id = ?) ELSE last_session END,
      last_seen = MAX(last_seen, (SELECT created_at FROM analytics_events WHERE visitor_id = ? AND event_id = ?))
      WHERE id = ?`).bind(visitorId, eventId, visitorId, eventId, visitorId, eventId, visitorId),
  ]);
}

export async function readStats(db, range = 'all', now = Date.now()) {
  const days = range === '7' ? 7 : range === '30' ? 30 : null;
  // Calendar days in Riyadh, including today; never a browser-dependent timezone.
  const midnight = Date.parse(dayInRiyadh(now) + 'T00:00:00+03:00');
  const since = days ? midnight - (days - 1) * 86400000 : 0;
  const trendSince = days ? since : midnight - 29 * 86400000;
  const results = await db.batch([
    db.prepare(`SELECT COUNT(*) AS pageviews, COUNT(DISTINCT visitor_id) AS visitors,
      COUNT(DISTINCT session_id) AS visits FROM analytics_events WHERE created_at >= ?`).bind(since),
    db.prepare(`SELECT MIN(created_at) AS started_at FROM analytics_events`),
    db.prepare(`SELECT day, COUNT(*) AS pageviews, COUNT(DISTINCT visitor_id) AS visitors,
      COUNT(DISTINCT session_id) AS visits FROM analytics_events WHERE created_at >= ? GROUP BY day ORDER BY day`).bind(trendSince),
    db.prepare(`SELECT lecture, COUNT(*) AS pageviews, COUNT(DISTINCT visitor_id) AS visitors,
      COUNT(DISTINCT session_id) AS visits FROM analytics_events WHERE created_at >= ? GROUP BY lecture ORDER BY pageviews DESC`).bind(since),
  ]);
  const byDay = new Map(results[2].results.map(row => [row.day, row]));
  const trend = [];
  for (let t = trendSince; t <= midnight; t += 86400000) {
    const day = dayInRiyadh(t);
    trend.push(byDay.get(day) || { day, visitors: 0, visits: 0, pageviews: 0 });
  }
  return { ...results[0].results[0], started_at: results[1].results[0].started_at,
    range, trend, lectures: results[3].results, updated_at: now, timezone: 'Asia/Riyadh' };
}

export const clientJS = config => `(() => {
  if (window.__atlasAnalyticsLoaded || navigator.webdriver) return;
  window.__atlasAnalyticsLoaded = true;
  let lastLecture = null, pending = false;
  let visitorId;
  try {
    visitorId = localStorage.getItem('atlas.analytics.visitor');
    if (!/^[0-9a-f-]{36}$/i.test(visitorId || '')) {
      visitorId = crypto.randomUUID(); localStorage.setItem('atlas.analytics.visitor', visitorId);
    }
  } catch { visitorId = crypto.randomUUID(); }
  const currentLecture = () => new URL(location.href).searchParams.get('lecture') || ${JSON.stringify(config.defaultLecture)};
  const send = () => {
    if (document.visibilityState !== 'visible' || document.prerendering) return;
    const lecture = currentLecture();
    if (lecture === lastLecture || pending) return;
    lastLecture = lecture; pending = true;
    const event_id = crypto.randomUUID();
    const body = JSON.stringify({ event_id, lecture, visitor_id: visitorId });
    const deliver = async () => {
      for (let i = 0; i < 2; i++) {
        try {
          const r = await fetch('/api/analytics/visit', { method: 'POST',
            headers: { 'Content-Type': 'application/json' }, body,
            credentials: 'same-origin', keepalive: true, cache: 'no-store' });
          if (r.ok || r.status < 500) break;
        } catch {}
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
      pending = false;
      // Catch a lecture navigation that happened during the first request.
      const current = currentLecture();
      if (current !== lastLecture) send();
    };
    void deliver();
  };
  // Query-based SPA lecture changes count once; zoom, tour steps, hashes and
  // cache-version query changes do not create fake page views.
  for (const method of ['pushState', 'replaceState']) {
    const original = history[method];
    history[method] = function (...args) { const result = original.apply(this, args); queueMicrotask(send); return result; };
  }
  addEventListener('popstate', send);
  addEventListener('pageshow', event => { if (event.persisted) lastLecture = null; send(); });
  document.addEventListener('visibilitychange', send);
  document.addEventListener('prerenderingchange', send);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', send, { once: true });
  else send();
})();`;

export async function handleAnalytics(request, env, config) {
  const url = new URL(request.url), path = url.pathname;
  if (path === '/analytics-client.js') {
    return new Response(clientJS(config), { headers: { 'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'public, max-age=3600', 'X-Content-Type-Options': 'nosniff' } });
  }
  if (path === '/admin/analytics.js') {
    if (!isOwner(request, env)) return json({ error: 'forbidden' }, 403);
    return new Response(dashboardJS(config), { headers: { ...PRIVATE_HEADERS, 'Content-Type': 'application/javascript; charset=utf-8' } });
  }
  if (path === '/admin/analytics' || path === '/admin/analytics/') {
    if (!env.ANALYTICS_OWNER_EMAIL) return html(signInHTML('الإحصاءات غير مهيأة بعد.'), 503);
    if (!request.headers.get('oai-authenticated-user-id')) return html(signInHTML());
    if (!isOwner(request, env)) return html(signInHTML('هذه اللوحة مخصصة لمالك الموقع فقط.'), 403);
    return html(dashboardHTML(config));
  }
  if (path === '/api/analytics/stats') {
    if (!isOwner(request, env)) return json({ error: 'forbidden' }, 403);
    if (request.method !== 'GET') return json({ error: 'method_not_allowed' }, 405);
    if (!env.DB) return json({ error: 'storage_unavailable' }, 503);
    const range = url.searchParams.get('range') || 'all';
    if (!['all', '7', '30'].includes(range)) return json({ error: 'invalid_range' }, 400);
    try { return json(await readStats(env.DB, range)); }
    catch (error) { console.error('Analytics read failed', error?.name); return json({ error: 'storage_unavailable' }, 503); }
  }
  if (path !== '/api/analytics/visit') return null;
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  if (request.headers.get('origin') !== url.origin || request.headers.get('sec-fetch-site') === 'cross-site')
    return json({ error: 'invalid_origin' }, 403);
  if (isOwner(request, env)) return new Response(null, { status: 204, headers: PRIVATE_HEADERS });
  if (!env.DB) return json({ error: 'storage_unavailable' }, 503);
  if (!(request.headers.get('content-type') || '').startsWith('application/json')) return json({ error: 'invalid_content_type' }, 415);
  if (Number(request.headers.get('content-length') || 0) > 512) return json({ error: 'too_large' }, 413);
  // Stream limit also covers chunked requests without Content-Length.
  let body, total = 0, chunks = [];
  const reader = request.body?.getReader();
  if (!reader) return json({ error: 'invalid_body' }, 400);
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      total += value.byteLength;
      if (total > 512) { await reader.cancel(); return json({ error: 'too_large' }, 413); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(total); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    body = JSON.parse(new TextDecoder().decode(bytes));
  } catch { return json({ error: 'invalid_body' }, 400); }
  if (!body || !UUID.test(body.event_id || '') || typeof body.lecture !== 'string') return json({ error: 'invalid_event' }, 400);
  const lecture = body.lecture || config.defaultLecture;
  if (!Object.hasOwn(config.lectures, lecture)) return json({ error: 'invalid_lecture' }, 400);
  const existing = cookieId(request), visitorId = existing ||
    (UUID.test(body.visitor_id || '') ? body.visitor_id.toLowerCase() : crypto.randomUUID());
  try { await recordVisit(env.DB, { visitorId, eventId: body.event_id.toLowerCase(), lecture }); }
  catch (error) { console.error('Analytics write failed', error?.name); return json({ error: 'storage_unavailable' }, 503); }
  const headers = new Headers(PRIVATE_HEADERS);
  if (!existing) headers.append('Set-Cookie', COOKIE + '=' + visitorId + '; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=31536000');
  return new Response(null, { status: 204, headers });
}
