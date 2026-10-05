'use strict';
// Fire-and-forget event hook. Set NOTIFY_WEBHOOK_URL and every SOS / new request /
// booking is POSTed there as JSON - point it at your WhatsApp bot, a Zapier/Make hook,
// or an SMS gateway to alert rescuers and emergency contacts.
const crypto = require('crypto');
const cfg = require('./config');

function emit(event, data) {
  console.log('[event]', event, (data && data.code) || '');
  if (!cfg.notifyWebhook) return;
  const body = JSON.stringify({ event, at: new Date().toISOString(), data });
  const headers = { 'Content-Type': 'application/json', 'User-Agent': 'SafariRescue/' + cfg.version };
  if (cfg.notifySecret) headers['X-Signature'] = 'sha256=' + crypto.createHmac('sha256', cfg.notifySecret).update(body).digest('hex');
  try {
    fetch(cfg.notifyWebhook, { method: 'POST', headers, body, signal: AbortSignal.timeout(6000) })
      .catch((e) => console.warn('[notify] webhook failed:', e.message));
  } catch (e) { console.warn('[notify] webhook failed:', e.message); }
}
module.exports = { emit };
