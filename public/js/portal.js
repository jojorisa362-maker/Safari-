// Safari Rescue - partner portal: dashboard · service requests · inventory · reviews · messages · earnings
import {
  $, esc, UGX, fT, fD, fShort, since, ago, ini, ic, stars, logo, S, ui, api, toast, sheet, closeSheet, confirmSheet, busy,
  applyTheme, route, render, empty, A, INPUT, LOAD,
} from './core.js';

export async function loadPortal() {
  const d = await api('/portal');
  S.portal = d.portal; S.user = d.user; applyTheme(S.user.theme);
}
LOAD.partner = loadPortal;

const money = (n) => (n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? Math.round(n / 1e3) + 'K' : String(n));
const MENU = [['dash', 'gauge', 'Dashboard'], ['req', 'list', 'Service Requests', 'n'], ['ord', 'box', 'Orders & Bookings'], ['svc', 'wrench', 'My Services'], ['inv', 'box', 'Inventory'], ['off', 'tag', 'Special Offers'], ['earn', 'dollar', 'Earnings'], ['rev', 'star', 'Reviews & Ratings'], ['msg', 'chat', 'Messages', 'm'], ['prof', 'user', 'Business Profile'], ['set', 'gear', 'Settings']];
const reqIcon = (t) => (/tyre|tire/i.test(t) ? 'tire' : /battery/i.test(t) ? 'battery' : /oil|filter|fuel/i.test(t) ? 'fuel' : /engine/i.test(t) ? 'engine' : 'wrench');

function chart(series) {
  if (!series.length) return '<p class="muted hint">Earnings will chart here as orders come in.</p>';
  const W = 400; const H = 150; const L = 38; const B = 20; const T = 8;
  const max = Math.max(...series); const top = Math.ceil(max / 200000) * 200000 || 1;
  const x = (i) => L + (i * (W - L - 6)) / (series.length - 1);
  const y = (v) => T + (H - B - T) * (1 - v / top);
  const line = series.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join('');
  const grid = [0, 1, 2, 3].map((i) => { const v = (top * i) / 3; return `<line x1="${L}" x2="${W - 6}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)" stroke-width="1"/><text x="${L - 6}" y="${y(v) + 3}" text-anchor="end" class="ml">${money(v)}</text>`; }).join('');
  const lab = [0, 7, 14, 21, series.length - 1].map((i) => { const d = Date.now() - (series.length - 1 - i) * 864e5; return `<text x="${x(i)}" y="${H - 4}" text-anchor="middle" class="ml">${fShort(d)}</text>`; }).join('');
  return `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="Earnings over the last ${series.length} days"><defs><linearGradient id="eg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4C9A2A" stop-opacity=".28"/><stop offset="1" stop-color="#4C9A2A" stop-opacity="0"/></linearGradient></defs>${grid}${lab}<path d="${line}L${x(series.length - 1)} ${y(0)}L${x(0)} ${y(0)}z" fill="url(#eg)"/><path d="${line}" fill="none" stroke="#4C9A2A" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
}
function donut(inv) {
  const seg = [['In Stock', inv.in, '#4C9A2A'], ['Low Stock', inv.low, '#F2B01E'], ['Out of Stock', inv.out, '#EF8A1F'], ['Unavailable', inv.off, '#9AA39B']];
  const T = inv.total || 1; const R = 40; const C = 2 * Math.PI * R; let off = 0;
  const arcs = inv.total ? seg.map(([, v, c]) => { const len = (C * v) / T; const el = `<circle cx="50" cy="50" r="${R}" fill="none" stroke="${c}" stroke-width="14" stroke-dasharray="${len} ${C - len}" stroke-dashoffset="${-off}" transform="rotate(-90 50 50)"/>`; off += len; return el; }).join('') : `<circle cx="50" cy="50" r="${R}" fill="none" stroke="var(--line)" stroke-width="14"/>`;
  return `<div class="dn"><svg viewBox="0 0 100 100" class="donut" role="img" aria-label="Inventory overview">${arcs}<text x="50" y="52" text-anchor="middle" class="dnn">${inv.total}</text><text x="50" y="64" text-anchor="middle" class="dnl">Total Items</text></svg><ul class="legend">${seg.map(([l, v, c]) => `<li><i style="background:${c}"></i>${l}<b>${v}</b><small>${inv.total ? Math.round((v / inv.total) * 100) : 0}%</small></li>`).join('')}</ul></div>`;
}
const reqItem = (r, actions) => `<li class="prq"><span class="ico">${ic(reqIcon(r.title))}</span><span class="grow"><b>${esc(r.title)}</b><small>${esc(r.place)} · ${r.km} km away</small><small>${esc(r.vehicle)}</small></span><span class="rt"><small>${since(r.at)}</small>${r.status !== 'new' ? `<span class="pill${r.status === 'declined' ? ' pend' : ''}">${r.status === 'quoted' ? 'Quoted' : 'Declined'}</span>` : actions ? `<button class="btn sm ghost" data-act="pReq" data-id="${r.id}">View Details</button>` : ''}</span></li>`;

function dash(p) {
  const st = p.stats;
  const kpi = (i, l, v, sub) => `<div class="kpi">${ic(i)}<small>${l}</small><b>${v}</b>${sub ? `<em>${sub}</em>` : ''}</div>`;
  const newReqs = p.requests.filter((r) => r.status === 'new');
  const topMax = Math.max(1, ...p.top.map((t) => t[1]));
  return `<div class="kpis">${kpi('list', 'New Requests', st.newRequests, 'Needs your attention')}${kpi('box', 'Active Orders', st.active, 'In progress')}${kpi('check', 'Completed Orders', st.completed, 'All time')}${kpi('dollar', 'Total Earnings', 'UGX ' + money(st.earnings), st.change ? `↑ ${st.change}% this month` : '')}</div>
<div class="pgrid g21"><section class="card"><div class="sec"><h2>Recent Service Requests</h2><button class="link" data-act="pv" data-v="req">View all ${ic('next')}</button></div>${newReqs.length ? `<ul class="plist2">${newReqs.slice(0, 4).map((r) => reqItem(r, true)).join('')}</ul>` : empty('check', 'No new requests', 'New parts requests from rescuers and drivers appear here.')}</section>
<section class="card"><div class="sec"><h2>Earnings Overview</h2></div><div class="big">UGX ${st.earnings.toLocaleString('en-US')}${st.change ? `<em>↑ ${st.change}%</em>` : ''}</div><small>Last ${p.series.length || 28} days</small>${chart(p.series)}</section></div>
<div class="pgrid g3"><section class="card"><div class="sec"><h2>Top Services</h2></div>${p.top.length ? `<ul class="tops">${p.top.map(([n, v]) => `<li><span>${esc(n)}</span><i><u style="width:${Math.round((v / topMax) * 100)}%"></u></i><b>${v}</b></li>`).join('')}</ul>` : '<p class="muted hint">Your best-selling items will rank here.</p>'}</section>
<section class="card"><div class="sec"><h2>Inventory Overview</h2><button class="link" data-act="pv" data-v="inv">Manage ${ic('next')}</button></div>${donut(p.inv)}</section>
<section class="card"><div class="sec"><h2>Recent Reviews</h2><button class="link" data-act="pv" data-v="rev">View all ${ic('next')}</button></div>${p.reviews.length ? `<ul class="plist2">${p.reviews.slice(0, 3).map((r) => `<li class="prv"><span class="av">${esc(ini(r.name))}</span><span class="grow"><b>${esc(r.name)}</b>${stars(r.stars)}<small>${esc(r.txt)}</small></span><small>${since(r.at)}</small></li>`).join('')}</ul>` : '<p class="muted hint">Customer reviews appear here.</p>'}</section></div>
<section class="card thanks">${ic('shield')}<div class="grow"><b>Thank you for being a Trusted Partner</b><small>Together we keep Uganda moving.</small></div><button class="btn sm" data-act="pv" data-v="prof">Update Business Profile</button></section>`;
}
function requests(p) {
  return `<section class="card"><div class="sec"><h2>Service Requests</h2><span class="pill">${p.stats.newRequests} new</span></div>${p.requests.length ? `<ul class="plist2">${p.requests.map((r) => reqItem(r, true)).join('')}</ul>` : empty('list', 'No requests yet', 'When a rescuer or driver needs a part from you, it shows up here.')}</section>`;
}
const invStatus = (i) => (i.off ? ['Unavailable', 'pend'] : i.qty === 0 ? ['Out of stock', 'pend'] : i.qty <= i.min ? ['Low stock', 'pend'] : ['In stock', '']);
function invRows() {
  const q = (ui.iq || '').toLowerCase(); const items = S.portal.inventory.filter((i) => !q || i.name.toLowerCase().includes(q));
  return items.length ? items.slice(0, 40).map((i) => { const [l, c] = invStatus(i); return `<li class="trow"><b>${esc(i.name)}</b><span>${UGX(i.price)}</span><span class="qty"><button data-act="invQty" data-id="${i.id}" data-d="-1" aria-label="Less">−</button><b>${i.qty}</b><button data-act="invQty" data-id="${i.id}" data-d="1" aria-label="More">+</button></span><span class="pill ${c}">${l}</span><button class="ib" data-act="invDel" data-id="${i.id}" aria-label="Delete ${esc(i.name)}">${ic('trash')}</button></li>`; }).join('') + (items.length > 40 ? `<li class="muted hint">Showing 40 of ${items.length}. Search to narrow down.</li>` : '') : '<li class="muted hint">No items match.</li>';
}
function inventory(p) {
  return `<section class="card"><div class="sec"><h2>Inventory</h2><button class="btn sm" data-act="invAdd">${ic('plus')} Add item</button></div>${donut(p.inv)}<label class="search">${ic('search')}<input id="iq" type="search" placeholder="Search ${p.inv.total} items" value="${esc(ui.iq || '')}" autocomplete="off" aria-label="Search inventory"></label><ul class="tbl" id="irows"><li class="thead"><b>Item</b><span>Price</span><span>Stock</span><span>Status</span><span></span></li>${invRows()}</ul></section>`;
}
INPUT.iq = (el) => { ui.iq = el.value; const u = $('#irows'); if (u) u.innerHTML = '<li class="thead"><b>Item</b><span>Price</span><span>Stock</span><span>Status</span><span></span></li>' + invRows(); };
const reviews = (p) => `<section class="card"><div class="sec"><h2>Reviews & Ratings</h2></div>${p.reviews.length ? `<ul class="plist2">${p.reviews.map((r) => `<li class="prv"><span class="av">${esc(ini(r.name))}</span><span class="grow"><b>${esc(r.name)}</b>${stars(r.stars)}<small>${esc(r.txt)}</small></span><small>${since(r.at)}</small></li>`).join('')}</ul>` : empty('star', 'No reviews yet', 'Happy customers can rate your service after each order.')}</section>`;
const messages = (p) => `<section class="card"><div class="sec"><h2>Messages</h2></div>${p.messages.length ? `<ul class="plist2">${p.messages.map((m) => `<li class="prv"><span class="av">${esc(ini(m.who))}</span><span class="grow"><b>${esc(m.who)}</b><small>${esc(m.txt)}</small></span><small>${ago(m.at)}</small></li>`).join('')}</ul>` : empty('chat', 'No messages', 'Messages from drivers and rescuers appear here.')}</section>`;
const earnings = (p) => `<section class="card"><div class="sec"><h2>Earnings</h2></div><div class="big">UGX ${p.stats.earnings.toLocaleString('en-US')}</div><small>Last ${p.series.length || 28} days</small>${chart(p.series)}</section>`;
const profile = () => `<section class="card"><div class="sec"><h2>Business Profile</h2></div><ul class="kv"><li><span>Business</span><b>${esc(S.user.partner.business)}</b></li><li><span>Category</span><b>${esc((S.cfg.partnerCats[S.user.partner.cat] || {}).t || '')}</b></li><li><span>Tagline</span><b>${esc(S.user.partner.tagline || '—')}</b></li><li><span>Contact</span><b>${esc(S.user.name)}</b></li></ul><p class="fine">Editing your public listing is the next feature on the roadmap.</p></section>`;
const soon = (t) => `<section class="card">${empty('gear', t, 'This section is coming next. Requests, inventory, reviews and earnings already work.')}</section>`;
const settings = () => `<section class="card"><div class="sec"><h2>Settings</h2></div><h3>Appearance</h3><div class="seg">${[['system', 'Auto'], ['light', 'Light'], ['dark', 'Dark']].map(([v, l]) => `<button class="${S.user.theme === v ? 'on' : ''}" data-act="pTheme" data-v="${v}">${l}</button>`).join('')}</div><button class="btn ghost dngt" data-act="logout">${ic('out')} Sign out</button></section>`;

route('/portal', () => {
  const p = S.portal; const v = ui.pv; const u = S.user;
  const titles = { ord: 'Orders & Bookings', svc: 'My Services', off: 'Special Offers' };
  const view = { dash, req: requests, inv: inventory, rev: reviews, msg: messages, earn: earnings }[v];
  const inner = view ? view(p) : v === 'prof' ? profile() : v === 'set' ? settings() : soon(titles[v] || 'Coming soon');
  const badge = (k) => (k === 'n' ? p.stats.newRequests : k === 'm' ? p.messages.length : 0);
  return {
    top: 'light', shell: 'port', wide: true,
    html: `<div class="pt"><aside class="side" id="side"><div class="sl">${logo(24, true)}<small>Partner Portal</small></div><nav>${MENU.map(([k, i, l, b]) => `<button class="${v === k ? 'on' : ''}" data-act="pv" data-v="${k}">${ic(i)}<span>${l}</span>${b && badge(b) ? `<em class="bdg">${badge(b)}</em>` : ''}</button>`).join('')}</nav><div class="sf"><span class="av">${esc(ini(u.partner.business))}</span><span class="grow"><b>${esc(u.partner.business)}</b><small>${esc(u.name)}</small></span><button class="ib" data-act="logout" aria-label="Sign out">${ic('out')}</button></div></aside><div class="pscrim" id="pscrim" data-act="pmenu"></div>
<div class="pmain"><header class="ptop"><button class="ib pmb" data-act="pmenu" aria-label="Open menu">${ic('menu')}</button><div class="grow"><h1>Welcome back, ${esc(u.partner.business)} <span class="vfy">${ic('check')}Verified</span></h1><small>${esc(u.partner.tagline || 'Trusted Partner')}</small></div><span class="datec">${ic('cal')}${fD(Date.now())}</span></header><main class="pcont">${inner}</main></div></div>`,
  };
});
A.pv = (t) => { ui.pv = t.dataset.v; const s = $('#side'); if (s) s.classList.remove('open'); render({ keep: true }); window.scrollTo(0, 0); };
A.pmenu = () => { $('#side').classList.toggle('open'); $('#pscrim').classList.toggle('show'); };
A.pTheme = async (t) => { const d = await api('/me', { method: 'PATCH', body: { theme: t.dataset.v } }); S.user = d.user; applyTheme(d.user.theme); render({ keep: true }); };

A.pReq = (t) => {
  const r = S.portal.requests.find((x) => x.id === t.dataset.id); if (!r) return;
  sheet(`<h3>${esc(r.title)}</h3><ul class="kv"><li><span>Location</span><b>${esc(r.place)}</b></li><li><span>Distance</span><b>${r.km} km</b></li><li><span>Vehicle</span><b>${esc(r.vehicle)}</b></li><li><span>Requested</span><b>${since(r.at)}</b></li></ul><label class="fl">Your quote (UGX)<span class="inp">${ic('dollar')}<input id="q-amt" type="number" inputmode="numeric" min="0" step="1000" placeholder="e.g. 150000" data-enter="#q-go"></span></label><div class="two"><button class="btn ghost" data-act="pDecline" data-id="${r.id}">Decline</button><button class="btn" id="q-go" data-act="pQuote" data-id="${r.id}">Send quote</button></div>`, { label: 'Request details' });
};
A.pQuote = (t) => busy(t, async () => { const amt = +$('#q-amt').value; if (!amt) { toast('Enter your quote amount'); return; } const d = await api(`/portal/requests/${t.dataset.id}`, { method: 'POST', body: { action: 'quote', amount: amt } }); S.portal = d.portal; closeSheet(); toast('Quote sent'); render({ keep: true }); });
A.pDecline = (t) => busy(t, async () => { const d = await api(`/portal/requests/${t.dataset.id}`, { method: 'POST', body: { action: 'decline' } }); S.portal = d.portal; closeSheet(); toast('Request declined'); render({ keep: true }); });

A.invQty = async (t) => {
  const i = S.portal.inventory.find((x) => x.id === t.dataset.id); if (!i) return;
  const d = await api(`/portal/inventory/${i.id}`, { method: 'PATCH', body: { qty: Math.max(0, i.qty + +t.dataset.d) } });
  S.portal = d.portal; render({ keep: true });
};
A.invDel = (t) => confirmSheet('Delete this item?', 'It will be removed from your inventory.', 'Delete', 'invDelOk', { id: t.dataset.id });
A.invDelOk = (t) => busy(t, async () => { const d = await api(`/portal/inventory/${t.dataset.id}`, { method: 'DELETE' }); S.portal = d.portal; closeSheet(); render({ keep: true }); });
A.invAdd = () => sheet(`<h3>Add inventory item</h3><label class="fl">Item name<span class="inp">${ic('box')}<input id="i-n" maxlength="80" placeholder="e.g. Brake Pads – Land Cruiser"></span></label><div class="two"><label class="fl">Quantity<span class="inp"><input id="i-q" type="number" inputmode="numeric" min="0" value="1"></span></label><label class="fl">Price (UGX)<span class="inp"><input id="i-p" type="number" inputmode="numeric" min="0" step="1000" placeholder="45000" data-enter="#i-go"></span></label></div><button class="btn block lg" id="i-go" data-act="invSave">Add to inventory</button>`, { label: 'Add item' });
A.invSave = (t) => busy(t, async () => { const d = await api('/portal/inventory', { method: 'POST', body: { name: $('#i-n').value, qty: $('#i-q').value, price: $('#i-p').value } }); S.portal = d.portal; closeSheet(); toast('Item added'); render({ keep: true }); });
