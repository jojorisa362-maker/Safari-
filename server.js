'use strict';
const http = require('http');
const cfg = require('./lib/config');
const { createStore } = require('./lib/store');
const { createApp } = require('./lib/app');

async function start() {
  const store = await createStore();
  const app = await createApp(store);
  const server = http.createServer((req, res) => { app.handle(req, res); });
  // Longer than the 60s idle timeout used by most proxies (Render, Heroku, Railway, nginx)
  server.keepAliveTimeout = 65000;
  server.headersTimeout = 66000;
  server.requestTimeout = 30000;
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(cfg.port, cfg.host, resolve); });
  const port = server.address().port;
  console.log(`Safari Rescue ${cfg.version} listening on ${cfg.host}:${port}  (storage: ${store.kind}, demo mode: ${cfg.demo ? 'on' : 'off'})`);

  async function stop(sig, exit) {
    if (sig) console.log(`${sig} received - shutting down`);
    await new Promise((resolve) => { const t = setTimeout(resolve, 8000); server.close(() => { clearTimeout(t); resolve(); }); if (server.closeIdleConnections) server.closeIdleConnections(); });
    await store.close();
    if (exit) process.exit(0);
  }
  return { server, store, port, stop };
}

module.exports = { start };

if (require.main === module) {
  start().then(({ stop }) => {
    process.on('SIGTERM', () => stop('SIGTERM', true));
    process.on('SIGINT', () => stop('SIGINT', true));
  }).catch((e) => { console.error('Failed to start:', e.message); process.exit(1); });
}
