'use strict';
// End-to-end API smoke test: boots the real server on a random port with a temp data folder.
//   npm test
const fs = require('fs');
const os = require('os');
const path = require('path');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sr-test-'));
Object.assign(process.env, { PORT: '0', DATA_DIR: dir, NODE_ENV: 'test', DEMO_MODE: '1', PROVIDER_APPROVAL: 'manual', ADMIN_TOKEN: 'test-admin', DEMO_SEARCH_MS: '250', DEMO_TRIP_MS: '700', SESSION_SECRET: 'test-secret' });
// Set TEST_DATABASE_URL (a throw-away Postgres database!) to run the same tests against Postgres.
if (process.env.TEST_DATABASE_URL) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL; else delete process.env.DATABASE_URL;

const { start } = require('../server');

let pass = 0, fail = 0;
const ok = (cond, label) => { if (cond) { pass++; console.log('  ✓', label); } else { fail++; console.log('  ✗ FAIL:', label); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class Client {
  constructor(base) { this.base = base; this.cookie = ''; }
  async call(method, url, body, headers) {
    const res = await fetch(this.base + url, {
      method,
      headers: Object.assign({}, body ? { 'Content-Type': 'application/json' } : {}, this.cookie ? { Cookie: this.cookie } : {}, headers || {}),
      body: body ? JSON.stringify(body) : undefined,
    });
    const sc = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
    for (const c of sc) { const kv = c.split(';')[0]; if (kv.startsWith('sr_session=')) this.cookie = kv.endsWith('=') ? '' : kv; }
    let json = null; try { json = await res.json(); } catch (e) { /* not json */ }
    return { status: res.status, json, headers: res.headers };
  }
  get(u) { return this.call('GET', u); }
  post(u, b) { return this.call('POST', u, b || {}); }
}

(async () => {
  const { port, stop } = await start();
  const base = `http://127.0.0.1:${port}`;
  const A = new Client(base);

  console.log('Public');
  let r = await A.get('/api/health');
  ok(r.status === 200 && r.json.ok && r.json.store === (process.env.TEST_DATABASE_URL ? 'postgres' : 'file'), 'health check');
  r = await A.get('/api/config');
  ok(r.json.services && r.json.cars.length === 4 && r.json.emergency.length >= 1, 'config catalogue');
  r = await fetch(base + '/'); ok(r.status === 200 && (await r.text()).length > 20, 'serves index.html');
  r = await fetch(base + '/some/deep/link'); ok(r.status === 200, 'SPA fallback');
  r = await fetch(base + '/%2e%2e/package.json'); ok(r.status !== 200 || (await r.text()).indexOf('"safari-rescue"') < 0, 'blocks path traversal');
  r = await fetch(base + '/healthz'); ok(r.status === 200, '/healthz');
  const sec = (await fetch(base + '/')).headers; ok(!!sec.get('content-security-policy') && sec.get('x-content-type-options') === 'nosniff', 'security headers');

  console.log('Auth');
  r = await A.get('/api/bootstrap'); ok(r.status === 401, 'bootstrap requires login');
  r = await A.post('/api/auth/register', { name: 'A', phone: '123', password: 'x' }); ok(r.status === 400, 'rejects bad signup');
  r = await A.post('/api/auth/register', { role: 'customer', name: 'Test Driver', phone: '0775 123 456', password: 'secret1' });
  ok(r.status === 200 && r.json.user.phone === '256775123456', 'customer signup (phone normalised)');
  r = await new Client(base).post('/api/auth/register', { role: 'customer', name: 'Dup', phone: '+256775123456', password: 'secret1' }); ok(r.status === 409, 'duplicate phone rejected');
  r = await A.get('/api/me'); ok(r.json.user.name === 'Test Driver', '/me works with session cookie');
  const L = new Client(base);
  r = await L.post('/api/auth/login', { phone: '0775123456', password: 'nope' }); ok(r.status === 401, 'wrong password rejected');
  r = await L.post('/api/auth/login', { phone: '0775123456', password: 'secret1' }); ok(r.status === 200, 'login works');
  r = await A.call('POST', '/api/auth/login', { phone: '0775123456', password: 'secret1' }, { Origin: 'https://evil.example' }); ok(r.status === 403, 'cross-origin POST blocked');
  r = await A.get('/api/provider/bootstrap'); ok(r.status === 403, 'customer cannot use provider API');

  console.log('Customer data');
  r = await A.get('/api/bootstrap'); ok(r.status === 200 && r.json.vehicles.length === 0 && r.json.messages.length === 1 && r.json.partners.length > 10, 'fresh account is empty + welcome message + partners');
  r = await A.post('/api/vehicles', { make: 'Toyota Prado', model: 'TX 2016', plate: 'uaz 777k', type: 'SUV', fuel: 'Diesel' }); ok(r.status === 200 && r.json.vehicle.plate === 'UAZ 777K', 'add vehicle');
  const vid = r.json.vehicle.id;
  r = await A.post('/api/contacts', { name: 'Mum', phone: '0701 000 111' }); ok(r.status === 200, 'add emergency contact');
  r = await A.call('PATCH', '/api/me', { city: 'Jinja', theme: 'dark' }); ok(r.json.user.city === 'Jinja' && r.json.user.theme === 'dark', 'update profile');
  r = await A.call('PATCH', '/api/me', { city: 'Atlantis' }); ok(r.status === 400, 'rejects unknown city');

  console.log('Roadside request (demo dispatch)');
  r = await A.post('/api/requests', { kind: 'service', svc: 'tire', loc: 'Kira Road', vehicleId: vid, note: 'Flat' });
  ok(r.status === 200 && r.json.request.status === 'searching' && r.json.request.demo === true, 'create request -> searching');
  const rid = r.json.request.id;
  r = await A.post('/api/requests', { kind: 'service', svc: 'fuel' }); ok(r.status === 409, 'only one active request');
  await sleep(450);
  r = await A.get('/api/requests/active'); ok(r.json.request.status === 'accepted' && r.json.request.provider.name === 'Brian Okello', 'virtual rescuer accepts');
  r = await A.post(`/api/requests/${rid}/chat`, { t: 'Where are you?' }); ok(r.status === 200 && r.json.messages.length === 1, 'chat message stored');
  await sleep(1900);
  r = await A.get(`/api/requests/${rid}/chat`); ok(r.json.messages.length === 2 && r.json.messages[1].me === false, 'auto-reply arrives');
  r = await A.get('/api/requests/active'); ok(r.json.request.status === 'arrived', 'rescuer arrives');
  r = await A.post(`/api/requests/${rid}/complete`); ok(r.json.request.status === 'completed' && r.json.request.amount > 0, 'complete job');
  r = await A.post(`/api/requests/${rid}/rate`, { rating: 5, review: 'Fast!' }); ok(r.json.request.rated === true, 'rate job');
  r = await A.get('/api/requests/active'); ok(r.json.request === null, 'no active request after rating');
  r = await A.get('/api/bootstrap'); ok(r.json.trips.length === 1 && r.json.trips[0].r === 5, 'trip history updated');

  console.log('SOS + booking');
  r = await A.post('/api/requests', { kind: 'sos', type: 'medical', loc: 'Jinja Road' }); ok(r.status === 200 && r.json.request.title === 'Medical Emergency', 'SOS created');
  r = await A.post(`/api/requests/${r.json.request.id}/cancel`); ok(r.json.request.status === 'cancelled', 'SOS can be cancelled');
  const day = new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10);
  r = await A.post('/api/bookings', { k: 'hire', car: 'cruiser', days: 3, driver: true, date: day, place: 'Entebbe Airport' }); ok(r.status === 200 && r.json.price === (450000 + 80000) * 3, 'car hire booking with server-side price');
  const bid = r.json.booking.id;
  r = await A.post('/api/bookings', { k: 'hire', car: 'cruiser', days: 1, date: '2001-01-01' }); ok(r.status === 400, 'rejects past date');
  r = await A.post('/api/bookings', { k: 'mob', item: 's-hotel' }); ok(r.status === 200, 'rescue-mobility booking');
  r = await A.post(`/api/bookings/${bid}/cancel`); ok(r.status === 200, 'cancel booking');
  r = await A.get('/api/bootstrap'); ok(r.json.bookings.length === 1, 'upcoming bookings list');
  r = await A.post('/api/support', { t: 'Hello' }); ok(r.status === 200, 'support chat');

  console.log('Real provider flow');
  const P = new Client(base);
  r = await P.post('/api/auth/register', { role: 'provider', name: 'Moses Mechanic', phone: '0772000111', password: 'secret1', title: 'Mechanic', vehicle: 'Hilux', plate: 'ubb 100a' });
  ok(r.status === 200 && r.json.user.provider.online === false, 'provider signup');
  r = await P.post('/api/provider/online', { online: true }); ok(r.status === 403, 'unapproved rescuer cannot go online');
  r = await P.get('/api/provider/bootstrap'); ok(r.json.pending === true && r.json.jobs.length === 0, 'unapproved rescuer sees no jobs');
  const ADM = { Authorization: 'Bearer test-admin' };
  r = await A.call('GET', '/api/admin/overview'); ok(r.status === 401, 'admin API needs the token');
  r = await A.call('GET', '/api/admin/overview', null, ADM); ok(r.status === 200 && r.json.providers.length === 1 && r.json.providers[0].verified === false, 'admin sees the waiting rescuer');
  r = await A.call('POST', `/api/admin/providers/${r.json.providers[0].id}/verify`, { verified: true }, ADM); ok(r.status === 200, 'admin approves rescuer');
  r = await P.post('/api/provider/online', { online: true }); ok(r.json.user.provider.online === true, 'approved rescuer goes online');
  r = await A.post('/api/requests', { kind: 'service', svc: 'battery', loc: 'Ntinda' });
  ok(r.json.request.demo === false, 'real provider online -> no virtual rescuer');
  const rid2 = r.json.request.id;
  r = await P.get('/api/provider/bootstrap'); ok(r.json.jobs.length === 1 && r.json.jobs[0].customer.phone === null, 'provider sees open job (phone hidden until accepted)');
  r = await P.post(`/api/provider/jobs/${rid2}/accept`); ok(r.json.current && r.json.current.customer.phone === '256775123456', 'provider accepts, sees phone');
  r = await A.call('GET', '/api/admin/overview', null, ADM); ok(r.json.active.length === 1 && r.json.active[0].provider.name === 'Moses Mechanic', 'admin sees live request with assigned rescuer');
  const P2 = new Client(base); await P2.post('/api/auth/register', { role: 'provider', name: 'Other Rescuer', phone: '0772000222', password: 'secret1' });
  const ov = await A.call('GET', '/api/admin/overview', null, ADM); await A.call('POST', `/api/admin/providers/${ov.json.providers.find((x) => x.phone === '256772000222').id}/verify`, { verified: true }, ADM); await P2.post('/api/provider/online', { online: true });
  r = await P2.post(`/api/provider/jobs/${rid2}/accept`); ok(r.status === 409, 'second provider cannot take the same job');
  r = await A.get('/api/requests/active'); ok(r.json.request.status === 'accepted' && r.json.request.provider.phone === '256772000111', 'customer sees assigned rescuer');
  r = await P.post(`/api/provider/jobs/${rid2}/complete`, { amount: 50000 }); ok(r.status === 409, 'cannot complete before arriving');
  r = await P.post(`/api/provider/jobs/${rid2}/arrive`); ok(r.json.current.status === 'arrived', 'provider marks arrived');
  r = await P.post(`/api/provider/jobs/${rid2}/complete`, { amount: 55000 }); ok(r.json.stats.total === 55000 && r.json.current === null, 'provider completes + earns');
  r = await A.post(`/api/requests/${rid2}/rate`, { rating: 4 }); ok(r.json.request.rating === 4, 'customer rates real provider');
  r = await P.get('/api/provider/bootstrap'); ok(r.json.user.provider.rating === 4 && r.json.user.provider.reviews === 1, 'provider rating updated');

  console.log('Demo accounts');
  const D = new Client(base);
  r = await D.post('/api/auth/demo', { role: 'customer' }); ok(r.status === 200 && r.json.user.demo, 'demo customer');
  r = await D.get('/api/bootstrap'); ok(r.json.trips.length === 12 && r.json.bookings.length === 4 && r.json.vehicles.length === 1 && r.json.messages.length === 5, 'demo customer has sample history');
  const DP = new Client(base);
  r = await DP.post('/api/auth/demo', { role: 'provider' }); ok(r.status === 200, 'demo provider');
  r = await DP.get('/api/provider/bootstrap'); ok(r.json.jobs.length === 3 && r.json.stats.today > 0, 'demo provider sees 3 sample jobs');
  const jid = r.json.jobs[0].id;
  r = await DP.post(`/api/provider/jobs/${jid}/accept`); ok(r.json.current && r.json.current.customer.phone === null, 'demo provider can accept a sample job');
  r = await P.get('/api/provider/bootstrap'); ok(r.json.jobs.length === 0, 'real providers never see demo jobs');
  const DT = new Client(base);
  r = await DT.post('/api/auth/demo', { role: 'partner' }); ok(r.status === 200, 'demo partner');
  r = await DT.get('/api/portal'); ok(r.json.portal.inv.total === 128 && r.json.portal.stats.newRequests === 8, 'portal seeded');
  const reqId = r.json.portal.requests[0].id;
  r = await DT.post(`/api/portal/requests/${reqId}`, { action: 'quote', amount: 120000 }); ok(r.json.portal.stats.newRequests === 7, 'quote a parts request');
  r = await DT.post('/api/portal/inventory', { name: 'Test part', qty: 3, price: 10000 }); ok(r.json.portal.inv.total === 129 && r.json.portal.inv.low >= 1, 'add inventory item');
  const T = new Client(base);
  r = await T.post('/api/auth/register', { role: 'partner', name: 'Owner', business: 'Real Parts Ltd', phone: '0701999888', password: 'secret1', cat: 'parts' });
  r = await T.get('/api/portal'); ok(r.json.portal.inv.total === 0 && r.json.portal.stats.newRequests === 0, 'real partner starts empty');
  r = await D.post('/api/auth/logout'); r = await D.get('/api/me'); ok(r.status === 401, 'logout clears session');

  console.log(`\n${pass} passed, ${fail} failed`);
  await stop(null, false);
  fs.rmSync(dir, { recursive: true, force: true });
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
