'use strict';
// All settings come from environment variables (see .env.example).
// Every hosting platform (Render, Heroku, Railway, VPS) just sets these.
const path = require('path');
const env = process.env;

const bool = (v, d) => (v === undefined || v === '' ? d : /^(1|true|yes|on)$/i.test(String(v)));
const int = (v, d) => { const n = parseInt(v, 10); return Number.isFinite(n) ? n : d; };

module.exports = {
  prod: env.NODE_ENV === 'production',
  port: int(env.PORT, 3000),            // Render / Heroku / Railway inject PORT
  host: env.HOST || '0.0.0.0',
  dataDir: env.DATA_DIR || path.join(__dirname, '..', 'data'),
  databaseUrl: env.DATABASE_URL || '',  // Postgres connection string (optional)
  pgSsl: env.PGSSL || '',               // set to "disable" for a local Postgres without SSL
  sessionSecret: env.SESSION_SECRET || '',
  cookieSecure: env.COOKIE_SECURE || '', // "1" force Secure cookies, "0" never; empty = auto
  trustProxy: bool(env.TRUST_PROXY, true),
  demo: bool(env.DEMO_MODE, true),      // "Try the demo" buttons + virtual rescuer. Set DEMO_MODE=0 for real use.
  // manual = new rescuers must be approved before they can see jobs (default once DEMO_MODE is off)
  providerApproval: (env.PROVIDER_APPROVAL || (bool(env.DEMO_MODE, true) ? 'auto' : 'manual')).toLowerCase(),
  adminToken: env.ADMIN_TOKEN || '',    // enables /admin and /api/admin/* (leave empty to disable)
  demoSearchMs: int(env.DEMO_SEARCH_MS, 4000),
  demoTripMs: int(env.DEMO_TRIP_MS, 45000),
  notifyWebhook: env.NOTIFY_WEBHOOK_URL || '',
  notifySecret: env.NOTIFY_WEBHOOK_SECRET || '',
  supportPhone: env.SUPPORT_PHONE || '+256 700 000 999',
  emergency: String(env.EMERGENCY_NUMBERS || '999,112').split(',').map((x) => x.trim()).filter(Boolean),
  version: require('../package.json').version,
};
