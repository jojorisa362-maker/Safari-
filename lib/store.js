'use strict';
// Tiny document store with two interchangeable drivers:
//   - FileStore : one JSON file on disk (zero setup, great for a VPS or local dev)
//   - PgStore   : Postgres via DATABASE_URL (use this on Render / Heroku / Railway,
//                 whose free disks are wiped on every restart or redeploy)
// Documents are plain objects grouped in collections. Any doc with a `uid` field is
// indexed by owner so byUid() stays fast.
const fs = require('fs');
const path = require('path');
const cfg = require('./config');

const clone = (o) => JSON.parse(JSON.stringify(o));

class FileStore {
  constructor(dir) {
    this.kind = 'file';
    this.dir = dir;
    this.file = path.join(dir, 'safari-rescue.json');
    this.data = {};
    this.timer = null;
  }
  async init() {
    fs.mkdirSync(this.dir, { recursive: true });
    try { this.data = JSON.parse(fs.readFileSync(this.file, 'utf8')); } catch (e) { this.data = {}; }
  }
  _c(c) { return this.data[c] || (this.data[c] = {}); }
  async get(c, id) { const d = this._c(c)[id]; return d ? clone(d) : null; }
  async put(c, id, doc) { this._c(c)[id] = clone(doc); this._dirty(); return doc; }
  async del(c, id) { delete this._c(c)[id]; this._dirty(); }
  async all(c) { return Object.values(this._c(c)).map(clone); }
  async byUid(c, uid) { return Object.values(this._c(c)).filter((d) => d.uid === uid).map(clone); }
  // Atomic read-modify-write. fn(doc) returns the new doc, or a falsy value to abort.
  async update(c, id, fn) {
    const cur = this._c(c)[id];
    if (!cur) return null;
    const next = fn(clone(cur));
    if (!next) return null;
    this._c(c)[id] = clone(next);
    this._dirty();
    return clone(next);
  }
  async ping() { return true; }
  _dirty() {
    if (this.timer) return;
    this.timer = setTimeout(() => { this.timer = null; this.flush(); }, 300);
  }
  flush() {
    try {
      const tmp = this.file + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(this.data));
      fs.renameSync(tmp, this.file);
    } catch (e) { console.error('[store] could not write data file:', e.message); }
  }
  async close() {
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    this.flush();
  }
}

class PgStore {
  constructor(url) { this.kind = 'postgres'; this.url = url; }
  async init() {
    let Pool;
    try { ({ Pool } = require('pg')); } catch (e) {
      throw new Error('DATABASE_URL is set but the "pg" package is missing. Run: npm install');
    }
    // Strip sslmode/ssl from the URL so our explicit ssl option always wins
    let conn = this.url;
    try { const u = new URL(this.url); u.searchParams.delete('sslmode'); u.searchParams.delete('ssl'); conn = u.toString(); } catch (e) { /* keep as is */ }
    const local = /(@|\/\/)(localhost|127\.0\.0\.1|\[::1\])([:/]|$)/.test(this.url);
    const ssl = cfg.pgSsl === 'disable' || local ? false : { rejectUnauthorized: false };
    this.pool = new Pool({ connectionString: conn, ssl, max: 5, idleTimeoutMillis: 30000, connectionTimeoutMillis: 10000 });
    this.pool.on('error', (e) => console.error('[pg] idle client error:', e.message));
    await this.pool.query('CREATE TABLE IF NOT EXISTS docs (col text NOT NULL, id text NOT NULL, owner text, doc jsonb NOT NULL, PRIMARY KEY (col, id))');
    await this.pool.query('CREATE INDEX IF NOT EXISTS docs_owner_idx ON docs (col, owner)');
  }
  async get(c, id) {
    const r = await this.pool.query('SELECT doc FROM docs WHERE col = $1 AND id = $2', [c, id]);
    return r.rows[0] ? r.rows[0].doc : null;
  }
  async put(c, id, doc) {
    await this.pool.query(
      'INSERT INTO docs (col, id, owner, doc) VALUES ($1, $2, $3, $4::jsonb) ON CONFLICT (col, id) DO UPDATE SET owner = EXCLUDED.owner, doc = EXCLUDED.doc',
      [c, id, doc.uid || null, JSON.stringify(doc)]
    );
    return doc;
  }
  async del(c, id) { await this.pool.query('DELETE FROM docs WHERE col = $1 AND id = $2', [c, id]); }
  async all(c) { const r = await this.pool.query('SELECT doc FROM docs WHERE col = $1', [c]); return r.rows.map((x) => x.doc); }
  async byUid(c, uid) { const r = await this.pool.query('SELECT doc FROM docs WHERE col = $1 AND owner = $2', [c, uid]); return r.rows.map((x) => x.doc); }
  async update(c, id, fn) {
    const cl = await this.pool.connect();
    try {
      await cl.query('BEGIN');
      const r = await cl.query('SELECT doc FROM docs WHERE col = $1 AND id = $2 FOR UPDATE', [c, id]);
      if (!r.rows[0]) { await cl.query('ROLLBACK'); return null; }
      const next = fn(r.rows[0].doc);
      if (!next) { await cl.query('ROLLBACK'); return null; }
      await cl.query('UPDATE docs SET owner = $3, doc = $4::jsonb WHERE col = $1 AND id = $2', [c, id, next.uid || null, JSON.stringify(next)]);
      await cl.query('COMMIT');
      return next;
    } catch (e) {
      try { await cl.query('ROLLBACK'); } catch (_) { /* ignore */ }
      throw e;
    } finally { cl.release(); }
  }
  async ping() { await this.pool.query('SELECT 1'); return true; }
  async close() { await this.pool.end(); }
}

async function createStore() {
  const s = cfg.databaseUrl ? new PgStore(cfg.databaseUrl) : new FileStore(cfg.dataDir);
  await s.init();
  if (s.kind === 'file' && cfg.prod) {
    console.warn('[store] Using a local JSON file. On Render free / Heroku the disk is wiped on every restart - set DATABASE_URL (Postgres) to keep your data.');
  }
  return s;
}

module.exports = { createStore, FileStore, PgStore };
