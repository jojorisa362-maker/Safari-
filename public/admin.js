// Safari Rescue - minimal operations console: approve rescuers and watch live requests/SOS.
const root = document.getElementById('root');
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ago = (t) => { const m = Math.max(0, Math.floor((Date.now() - t) / 60000)); return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.floor(m / 60)} h ago` : `${Math.floor(m / 1440)} d ago`; };
const tel = (p) => (p ? `<a href="tel:+${esc(p)}">+${esc(p)}</a>` : '—');
let token = sessionStorage.getItem('sr-admin') || '';
let timer = null;

async function call(path, body) {
  const r = await fetch('/api/admin' + path, { method: body ? 'POST' : 'GET', headers: Object.assign({ Authorization: 'Bearer ' + token }, body ? { 'Content-Type': 'application/json' } : {}), body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'Request failed');
  return j;
}
function login(msg) {
  clearInterval(timer);
  root.innerHTML = `<main class="pg narrow"><section class="card"><h3>Admin sign-in</h3><p class="muted">Enter the ADMIN_TOKEN you set on the server.</p><label class="fl">Admin token<span class="inp"><input id="t" type="password" autocomplete="current-password"></span></label><button class="btn block lg" id="go">Open console</button><p class="fine" style="color:var(--red)">${esc(msg || '')}</p></section></main>`;
  const go = () => { token = document.getElementById('t').value.trim(); sessionStorage.setItem('sr-admin', token); load(); };
  document.getElementById('go').onclick = go;
  document.getElementById('t').onkeydown = (e) => { if (e.key === 'Enter') go(); };
}
function view(d) {
  const maps = (r) => (r.lat != null && r.lng != null ? ` · <a target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${r.lat},${r.lng}">map</a>` : '');
  root.innerHTML = `<main class="pg"><div class="sec"><h2>Operations console</h2><small>${d.counts.customers} customers · ${d.counts.providers} rescuers · ${d.counts.partners} partners · ${d.counts.requests} requests</small></div>
<h3 class="qh">Live requests (${d.active.length})</h3>${d.active.length ? `<ul class="blist">${d.active.map((r) => `<li class="nt" style="align-items:flex-start"><span class="grow"><b>${esc(r.title)} · ${esc(r.code)} ${r.kind === 'sos' ? '<span class="pill hot">SOS</span>' : ''}</b><small>${esc(r.status)} · ${ago(r.createdAt)}</small><small>${esc(r.loc)}${maps(r)}</small><small>${esc((r.customer || {}).name)} · ${tel((r.customer || {}).phone)}${r.vehicle ? ' · ' + esc(r.vehicle.make) + ' ' + esc(r.vehicle.plate) : ''}</small>${r.note ? `<small>“${esc(r.note)}”</small>` : ''}${r.provider ? `<small>Rescuer: ${esc(r.provider.name)} · ${tel(r.provider.phone)}</small>` : '<small style="color:var(--red)">No rescuer yet</small>'}</span><button class="btn sm ghost" data-cancel="${esc(r.id)}">Close</button></li>`).join('')}</ul>` : '<section class="card"><p class="muted">No live requests right now.</p></section>'}
<h3 class="qh">Rescuers (${d.providers.length})</h3>${d.providers.length ? `<ul class="blist">${d.providers.map((p) => `<li class="nt"><span class="grow"><b>${esc(p.name)} ${p.verified ? '<span class="pill">Approved</span>' : '<span class="pill pend">Waiting</span>'} ${p.online ? '<span class="pill sch">Online</span>' : ''}</b><small>${esc(p.title)} · ${esc(p.vehicle)} ${esc(p.plate)}</small><small>${tel(p.phone)} · joined ${ago(p.created)}</small></span><button class="btn sm${p.verified ? ' ghost' : ''}" data-verify="${esc(p.id)}" data-to="${p.verified ? 0 : 1}">${p.verified ? 'Suspend' : 'Approve'}</button></li>`).join('')}</ul>` : '<section class="card"><p class="muted">No rescuers have signed up yet.</p></section>'}
<button class="btn block ghost" id="out" style="margin-top:18px">Sign out</button></main>`;
  document.getElementById('out').onclick = () => { sessionStorage.removeItem('sr-admin'); token = ''; login(); };
  root.querySelectorAll('[data-verify]').forEach((b) => { b.onclick = async () => { b.disabled = true; try { await call(`/providers/${b.dataset.verify}/verify`, { verified: b.dataset.to === '1' }); load(); } catch (e) { alert(e.message); b.disabled = false; } }; });
  root.querySelectorAll('[data-cancel]').forEach((b) => { b.onclick = async () => { if (!confirm('Close this request? The customer will be told.')) return; b.disabled = true; try { await call(`/requests/${b.dataset.cancel}/cancel`, {}); load(); } catch (e) { alert(e.message); b.disabled = false; } }; });
}
async function load() {
  try { view(await call('/overview')); clearInterval(timer); timer = setInterval(() => load().catch(() => {}), 10000); } catch (e) { login(e.message === 'Not found' ? 'Admin console is switched off (set ADMIN_TOKEN on the server).' : e.message); }
}
if (token) load(); else login();
