'use strict';
const path = require('path');
const crypto = require('crypto');
const cfg = require('./config');
const auth = require('./auth');
const seed = require('./seed');
const buildApi = require('./api');
const H = require('./http');

async function createApp(store) {
  // Session secret: from SESSION_SECRET, otherwise generated once and kept in the store.
  let secret = cfg.sessionSecret;
  if (!secret) {
    const m = await store.get('meta', 'secret');
    if (m) secret = m.v;
    else { secret = crypto.randomBytes(32).toString('hex'); await store.put('meta', 'secret', { id: 'secret', v: secret }); }
    if (cfg.prod) console.warn('[auth] SESSION_SECRET is not set - using a generated one. Set SESSION_SECRET so logins survive restarts.');
  }

  await seed.seedPartners(store);
  const purge = () => seed.purgeDemo(store).catch((e) => console.warn('[demo] cleanup failed:', e.message));
  purge();
  setInterval(purge, 3600e3).unref();

  const router = buildApi(store, secret);
  const files = H.loadStatic(path.join(__dirname, '..', 'public'));

  async function api(req, res, url, secure) {
    const m = router.match(req.method, url.pathname);
    if (!m) throw new H.HttpError(404, 'Not found');
    if (m === 'method') throw new H.HttpError(405, 'Method not allowed');
    const unsafe = !['GET', 'HEAD'].includes(req.method);
    if (unsafe && req.headers.origin) {
      let host = '';
      try { host = new URL(req.headers.origin).host; } catch (e) { /* ignore */ }
      if (host !== req.headers.host) throw new H.HttpError(403, 'Cross-origin request blocked');
    }
    const ip = H.clientIp(req);
    const rl = m.route.opts.limit;
    if (rl) {
      if (!H.limit(m.route.method + m.route.pattern + ip, rl[0], rl[1])) throw new H.HttpError(429, 'Too many attempts. Please try again in a few minutes.');
    } else if (!H.limit('api:' + ip, 600, 60000)) throw new H.HttpError(429, 'Too many requests. Please slow down.');

    const ctx = { req, res, params: m.params, query: Object.fromEntries(url.searchParams), headers: {}, ip, secure, user: null, body: {} };
    const tok = H.parseCookies(req.headers.cookie).sr_session;
    const sess = tok && auth.unsign(tok, secret);
    if (sess) ctx.user = await store.get('users', sess.uid);
    if (unsafe) ctx.body = await H.readJson(req);
    const out = await m.route.handler(ctx);
    H.json(res, 200, out === undefined ? { ok: true } : out, ctx.headers);
  }

  async function handle(req, res) {
    const t0 = Date.now();
    const secure = H.isSecure(req);
    H.secHeaders(res, secure);
    let url;
    try { url = new URL(req.url, 'http://localhost'); } catch (e) { res.writeHead(400); res.end(); return; }
    try {
      if (url.pathname === '/healthz') { res.writeHead(200, { 'Content-Type': 'text/plain' }); res.end('ok'); return; }
      if (url.pathname.startsWith('/api/')) await api(req, res, url, secure);
      else if (req.method === 'GET' || req.method === 'HEAD') {
        if (!H.serveStatic(files, req, res)) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('Not found'); }
      } else { res.writeHead(405, { Allow: 'GET, HEAD' }); res.end(); }
    } catch (e) {
      req.resume();
      if (res.headersSent) { try { res.end(); } catch (_) { /* ignore */ } return; }
      const status = e instanceof H.HttpError ? e.status : 500;
      if (status === 500) console.error('[error]', req.method, url.pathname, e);
      H.json(res, status, { error: status === 500 ? 'Something went wrong on our side. Please try again.' : e.message });
    } finally {
      if (url.pathname.startsWith('/api/') && url.pathname !== '/api/health') console.log(`${req.method} ${url.pathname} ${res.statusCode} ${Date.now() - t0}ms`);
    }
  }

  return { handle };
}

module.exports = { createApp };
