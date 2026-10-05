'use strict';
const crypto = require('crypto');
const { promisify } = require('util');
const scrypt = promisify(crypto.scrypt);

async function hash(pw) {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(pw, salt, 64);
  return salt.toString('hex') + ':' + key.toString('hex');
}
async function verify(pw, stored) {
  const [s, h] = String(stored || '').split(':');
  if (!s || !h) return false;
  const key = await scrypt(pw, Buffer.from(s, 'hex'), 64);
  const a = Buffer.from(h, 'hex');
  return a.length === key.length && crypto.timingSafeEqual(a, key);
}

// Stateless signed session token:  base64url(json).hmac
function sign(payload, secret) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const mac = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  return body + '.' + mac;
}
function unsign(token, secret) {
  if (!token || token.indexOf('.') < 0) return null;
  const [body, mac] = token.split('.');
  const want = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  const a = Buffer.from(mac || '');
  const b = Buffer.from(want);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (p.exp && p.exp < Date.now()) return null;
    return p;
  } catch (e) { return null; }
}

// Uganda numbers: accepts 0775123456, 775123456, +256 775 123 456
function normPhone(p) {
  let d = String(p || '').replace(/\D/g, '');
  if (d.startsWith('256')) { /* ok */ } else if (d.startsWith('0')) d = '256' + d.slice(1);
  else if (d.length === 9) d = '256' + d;
  return /^256\d{9}$/.test(d) ? d : null;
}
function fmtPhone(d) {
  const s = String(d || '');
  return /^256\d{9}$/.test(s) ? `+256 ${s.slice(3, 6)} ${s.slice(6, 9)} ${s.slice(9)}` : s;
}

module.exports = { hash, verify, sign, unsign, normPhone, fmtPhone };
