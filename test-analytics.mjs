import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import vm from 'node:vm';
import { recordVisit, readStats, handleAnalytics, dayInRiyadh, clientJS, SESSION_MS } from './worker/analytics.mjs';
import { dashboardJS } from './worker/dashboard.mjs';
import config from './worker/site-config.mjs';

function database() {
  const sql = new DatabaseSync(':memory:');
  const file = readdirSync(new URL('./drizzle/', import.meta.url)).find(x => x.endsWith('.sql'));
  sql.exec(readFileSync(new URL('./drizzle/' + file, import.meta.url), 'utf8'));
  const db = { prepare(query) {
    const run = args => ({ results: sql.prepare(query).all(...args), success: true });
    return { bind: (...args) => ({ run: () => run(args) }), run: () => run([]) };
  }, async batch(statements) {
    sql.exec('BEGIN');
    try { const rows = statements.map(s => s.run()); sql.exec('COMMIT'); return rows; }
    catch (e) { sql.exec('ROLLBACK'); throw e; }
  } };
  return db;
}
const now = Date.parse('2026-10-23T10:00:00Z');
const visitorId = crypto.randomUUID();
const visit = (db, lecture = config.defaultLecture, time = now, eventId = crypto.randomUUID(), id = visitorId) => recordVisit(db, { visitorId: id, eventId, lecture }, time);
const owner = { 'oai-authenticated-user-id': 'verified-site-user', 'oai-authenticated-user-email': 'owner@example.test' };
const env = DB => ({ DB, ANALYTICS_OWNER_EMAIL: 'owner@example.test' });
const request = (path, headers = {}, body) => new Request('https://atlas.test' + path, { method: body ? 'POST' : 'GET', headers, ...(body ? { body: JSON.stringify(body) } : {}) });
const event = () => ({ event_id: crypto.randomUUID(), lecture: config.defaultLecture, visitor_id: crypto.randomUUID() });
const postHeaders = { origin: 'https://atlas.test', 'content-type': 'application/json' };

test('same browser, multiple pages, inactivity and retry deduplication', async () => {
  const db = database(), id = crypto.randomUUID();
  await visit(db, config.defaultLecture, now, id);
  await visit(db, config.defaultLecture, now + 60000);
  await visit(db, config.defaultLecture, now + SESSION_MS * 2, id); // retry must not extend activity
  let s = await readStats(db, 'all', now + SESSION_MS * 3);
  assert.deepEqual([s.visitors, s.visits, s.pageviews], [1,1,2]);
  await visit(db, config.defaultLecture, now + SESSION_MS + 60001);
  await visit(db, config.defaultLecture, now + SESSION_MS + 61000, crypto.randomUUID(), crypto.randomUUID());
  s = await readStats(db, 'all', now + SESSION_MS * 3);
  assert.deepEqual([s.visitors, s.visits, s.pageviews], [2,3,4]);
});

test('calendar ranges, lecture grouping and timezone midnight', async () => {
  const db = database(), lectures = Object.keys(config.lectures);
  await visit(db, lectures[0], now - 40 * 86400000);
  await visit(db, lectures[1], now);
  const recent = await readStats(db, '7', now);
  assert.deepEqual([recent.visitors,recent.visits,recent.pageviews], [1,1,1]);
  assert.equal(recent.lectures[0].lecture, lectures[1]);
  assert.equal(recent.trend.length, 7);
  assert.equal((await readStats(db, 'all', now)).pageviews, 2);
  assert.equal(dayInRiyadh(Date.parse('2026-10-23T21:01:00Z')), '2026-10-24');
});

test('anonymous and non-owner users cannot read any metrics or admin JS', async () => {
  const db = database();
  for (const path of ['/api/analytics/stats','/admin/analytics.js']) {
    for (const headers of [{}, { 'oai-authenticated-user-email':'owner@example.test' }, { ...owner, 'oai-authenticated-user-email':'visitor@example.test' }])
      assert.equal((await handleAnalytics(request(path, headers), env(db), config)).status, 403);
  }
  const r = await handleAnalytics(request('/admin/analytics'), env(db), config);
  assert.equal(r.status, 200); assert.match(await r.text(), /signin-with-chatgpt/);
  assert.equal(r.headers.get('cache-control'), 'private, no-store, max-age=0');
  assert.equal((await handleAnalytics(request('/api/analytics/stats', owner), env(db), config)).status, 200);
  assert.equal((await handleAnalytics(request('/api/analytics/stats?range=bad', owner), env(db), config)).status, 400);
});

test('write endpoint validates origin, size, ids and exact lecture allowlist', async () => {
  const db = database();
  const send = (headers, body) => handleAnalytics(request('/api/analytics/visit', headers, body), env(db), config);
  assert.equal((await send({...postHeaders, origin:'https://other.test'},event())).status,403);
  assert.equal((await send(postHeaders,{...event(),event_id:'bad'})).status,400);
  assert.equal((await send(postHeaders,{...event(),lecture:'999'})).status,400);
  assert.equal((await send(postHeaders,{...event(),lecture:'x'.repeat(600)})).status,413);
  assert.equal((await send({'origin':'https://atlas.test'},event())).status,415);
  assert.equal((await readStats(db, 'all', now)).pageviews,0);
});

test('cookie is secure and opaque, retries do not count twice; owner excluded', async () => {
  const db=database(), body=event();
  const send=(headers,b)=>handleAnalytics(request('/api/analytics/visit',headers,b),env(db),config);
  const r=await send(postHeaders,body); assert.equal(r.status,204);
  const cookie=r.headers.get('set-cookie'); assert.match(cookie,/^__Host-atlas_vid=/);
  for(const flag of ['Secure','HttpOnly','SameSite=Lax','Path=/']) assert.ok(cookie.includes(flag));
  await send({...postHeaders,cookie:cookie.split(';')[0]},body);
  await send({...postHeaders,...owner},event());
  const s=await readStats(db,'all'); assert.deepEqual([s.visitors,s.visits,s.pageviews],[1,1,1]);
  assert.equal((await send(postHeaders,{...event(),lecture:''})).status,204);
});

test('parallel tabs share a session and failed storage is never reported as success', async () => {
  const db=database(); await Promise.all([visit(db),visit(db),visit(db)]);
  const s=await readStats(db,'all',now); assert.deepEqual([s.visitors,s.visits,s.pageviews],[1,1,3]);
  const bad={ prepare(){return {bind(){return {}}}},batch(){throw new Error('offline')} };
  const r=await handleAnalytics(request('/api/analytics/visit',postHeaders,event()),env(bad),config);
  assert.equal(r.status,503); assert.equal(r.headers.get('set-cookie'),null);
});

test('served scripts parse and do not leak server owner configuration', () => {
  new vm.Script(clientJS(config)); new vm.Script(dashboardJS(config));
  assert.ok(!clientJS(config).includes('ANALYTICS_OWNER_EMAIL'));
});
