'use strict';
// Minimal HTTP toolkit: router, JSON helpers, static files (pre-loaded + gzip), security
// headers and a tiny in-memory rate limiter. No dependencies.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');
const cfg = require('./config');

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json', '.txt': 'text/plain; charset=utf-8', '.woff2': 'font/woff2',
};
const COMPRESSIBLE = /^(text\/|application\/(json|manifest)|image\/svg)/;

const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

function createRouter() {
  const routes = [];
  return {
    routes,
    add(method, pattern, handler, opts) {
      const keys = [];
      const re = new RegExp('^' + pattern.replace(/:([A-Za-z]+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '/?$');
      routes.push({ method, pattern, re, keys, handler, opts: opts || {} });
    },
    // -> {route, params} | 'method' (path exists, wrong verb) | null
    match(method, p) {
      let pathHit = false;
      for (const r of routes) {
        const m = r.re.exec(p);
        if (!m) continue;
        pathHit = true;
        if (r.method !== method) continue;
        const params = {};
        r.keys.forEach((k, i) => { params[k] = decodeURIComponent(m[i + 1]); });
        return { route: r, params };
      }
      return pathHit ? 'method' : null;
    },
  };
}

function readJson(req, limit = 100 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) { reject(new HttpError(413, 'Request too large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      if (!/application\/json/i.test(req.headers['content-type'] || '')) return reject(new HttpError(415, 'Content-Type must be application/json'));
      try {
        const j = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        resolve(j && typeof j === 'object' && !Array.isArray(j) ? j : {});
      } catch (e) { reject(new HttpError(400, 'Invalid JSON')); }
    });
    req.on('error', reject);
  });
}

function json(res, status, obj, headers) {
  const body = JSON.stringify(obj);
  res.writeHead(status, Object.assign({
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Content-Length': Buffer.byteLength(body),
  }, headers || {}));
  res.end(body);
}

function parseCookies(h) {
  const out = {};
  String(h || '').split(';').forEach((part) => {
    const i = part.indexOf('=');
    if (i > 0) { try { out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim()); } catch (e) { /* ignore bad cookie */ } }
  });
  return out;
}

function clientIp(req) {
  if (cfg.trustProxy) {
    const xf = req.headers['x-forwarded-for'];
    if (xf) return String(xf).split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
}

function isSecure(req) {
  if (cfg.cookieSecure === '1') return true;
  if (cfg.cookieSecure === '0') return false;
  if (req.socket.encrypted) return true;
  return cfg.trustProxy && /https/i.test(String(req.headers['x-forwarded-proto'] || '').split(',')[0]);
}

function secHeaders(res, secure) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(self), camera=(), microphone=()');
  res.setHeader('Content-Security-Policy', CSP);
  if (secure) res.setHeader('Strict-Transport-Security', 'max-age=15552000');
}

function loadStatic(dir) {
  const files = new Map();
  (function walk(d, rel) {
    for (const name of fs.readdirSync(d)) {
      const full = path.join(d, name);
      const r = rel + '/' + name;
      if (fs.statSync(full).isDirectory()) { walk(full, r); continue; }
      const buf = fs.readFileSync(full);
      const type = MIME[path.extname(name).toLowerCase()] || 'application/octet-stream';
      const etag = '"' + crypto.createHash('sha1').update(buf).digest('base64url').slice(0, 20) + '"';
      const gz = COMPRESSIBLE.test(type) && buf.length > 800 ? zlib.gzipSync(buf, { level: 9 }) : null;
      files.set(r, { buf, gz, type, etag });
    }
  })(dir, '');
  return files;
}

function serveStatic(files, req, res) {
  let p;
  try { p = decodeURIComponent(req.url.split('?')[0]); } catch (e) { return false; }
  if (p.includes('..') || p.includes('\0')) return false;
  if (p === '/') p = '/index.html';
  if (p === '/admin' || p === '/admin/') p = '/admin.html';
  let f = files.get(p);
  if (!f && !path.extname(p)) f = files.get('/index.html'); // single-page-app fallback
  if (!f) return false;
  if (req.headers['if-none-match'] === f.etag) { res.writeHead(304, { ETag: f.etag }); res.end(); return true; }
  const headers = { 'Content-Type': f.type, ETag: f.etag, 'Cache-Control': 'public, max-age=0, must-revalidate', Vary: 'Accept-Encoding' };
  let body = f.buf;
  if (f.gz && /\bgzip\b/.test(req.headers['accept-encoding'] || '')) { body = f.gz; headers['Content-Encoding'] = 'gzip'; }
  headers['Content-Length'] = body.length;
  res.writeHead(200, headers);
  res.end(req.method === 'HEAD' ? undefined : body);
  return true;
}

// Fixed-window in-memory limiter (per process). Good enough for one instance.
const buckets = new Map();
function limit(key, max, windowMs) {
  const t = Date.now();
  let b = buckets.get(key);
  if (!b || b.reset < t) { b = { n: 0, reset: t + windowMs }; buckets.set(key, b); }
  b.n += 1;
  return b.n <= max;
}
setInterval(() => { const t = Date.now(); for (const [k, b] of buckets) if (b.reset < t) buckets.delete(k); }, 60000).unref();

module.exports = { HttpError, createRouter, readJson, json, parseCookies, clientIp, isSecure, secHeaders, loadStatic, serveStatic, limit };
