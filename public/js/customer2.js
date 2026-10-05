// Safari Rescue - customer app, part 2: mobility · partners · car hire · bookings · trips · messages · profile & settings
import {
  $, $$, esc, UGX, fD, fT, fDT, ago, ini, phoneFmt, ic, stars, logo, veh, S, ui, api, toast, sheet, closeSheet, confirmSheet, busy,
  applyTheme, route, go, render, bar, nb, empty, A, INPUT,
} from './core.js';
import { KI, kico, isLive, unread, unreadN, dist, nav, chatSheet, openSupport, loadCustomer } from './customer.js';

const pillCls = (s) => ({ Pending: ' pend', Scheduled: ' sch', 'In Progress': ' prog', Cancelled: ' pend' }[s] || '');
const noPhone = () => (S.cfg.demo ? 'Calling is switched off in the demo' : 'No phone number on file yet');
A.call = (t) => { const n = t.dataset.tel; if (n) location.href = 'tel:+' + n; else toast(noPhone()); };

/* ---------- rescue mobility ---------- */
route('/mobility', () => {
  const M = S.cfg.mobility;
  const sec = (title, g, list) => `<section class="card msec"><h3>${title}</h3><ul>${list.map((m, i) => `<li><button class="mrow" data-act="mob" data-g="${g}" data-i="${i}">${m.i ? `<span class="mdot">${ic(m.i)}</span>` : '<span class="gdot"></span>'}<span class="grow"><b>${esc(m.t)}</b><small>${esc(m.d)}</small></span>${m.art ? `<span class="mthumb">${veh(m.art, m.c)}</span>` : ''}${ic('next', 'ch')}</button></li>`).join('')}</ul></section>`;
  return { top: 'light', shell: 'cust', html: bar('Rescue Mobility') + `<main class="pg"><p class="lead">How can we assist your journey?</p><div class="mgrid">${sec('Continue My Journey', 'j', M.j)}${sec('Move Me to Safety', 's', M.s)}${sec('Move My Vehicle', 'v', M.v)}</div></main>${nav('home')}` };
});
A.mob = (t) => {
  const m = S.cfg.mobility[t.dataset.g][+t.dataset.i];
  sheet(`<h3>${esc(m.t)}</h3><p class="muted">${esc(m.d)}</p>${m.art ? `<div class="mart">${veh(m.art, m.c)}</div>` : ''}<div class="card est"><span>${m.per ? 'From, per day' : 'From'}</span><b>${UGX(m.p)}</b></div><p class="fine">A Safari Rescue coordinator confirms availability and the final price.</p><div class="two"><button class="btn ghost" data-act="closeSheet">Not now</button><button class="btn" data-act="mobOk" data-id="${m.id}">Confirm request</button></div>`, { label: m.t });
};
A.mobOk = (t) => busy(t, async () => {
  await api('/bookings', { method: 'POST', body: { k: 'mob', item: t.dataset.id } });
  await loadCustomer(); closeSheet(); toast("Request sent — we'll confirm shortly"); go('/bookings');
});

/* ---------- trusted partners ---------- */
const prow = (p) => `<li class="pi"><button class="pb" data-go="/p/${esc(p.id)}"><span class="ico sq">${ic(S.cfg.partnerCats[p.cat].i)}</span><span class="grow"><b>${esc(p.n)} ${ic('shield', 'vf')}</b><span class="rt2">${ic('star', 'f')}<b>${p.r}</b><small>(${p.c})</small></span><small>${dist(p)}</small></span><span class="pill${p.tag === 'Open' ? ' sch' : ''}">${esc(p.tag)}</span></button><button class="callb" data-act="call" data-tel="${esc(p.phone || '')}" aria-label="Call ${esc(p.n)}">${ic('phone')}</button></li>`;
const searchIn = (p) => (p.n + ' ' + p.kind + ' ' + (p.services || []).join(' ')).toLowerCase();

route('/partners', () => {
  const C = S.cfg.partnerCats;
  return { top: 'light', shell: 'cust', html: bar('Trusted Partners') + `<main class="pg"><p class="lead">Verified. Reliable. At your service.</p><label class="search">${ic('search')}<input id="q" type="search" placeholder="Search services or businesses" autocomplete="off" aria-label="Search partners"></label>
<div id="cats" class="cats">${Object.entries(C).map(([k, v]) => `<button class="cat" data-go="/partners/${k}">${ic(v.i)}<b>${esc(v.t)}</b><small>${S.partners.filter((p) => p.cat === k).length} partners</small></button>`).join('')}</div><ul id="qres" class="plist" hidden></ul>
<div class="note247">${ic('shield')}<div><b>All partners are verified</b><small>Quality services you can trust.</small></div></div></main>${nav('home')}` };
});
INPUT.q = (el) => {
  const q = el.value.trim().toLowerCase(); const res = $('#qres'); const cats = $('#cats');
  if (!res) return;
  if (!q) { res.hidden = true; cats.hidden = false; return; }
  const list = S.partners.filter((p) => searchIn(p).includes(q));
  cats.hidden = true; res.hidden = false;
  res.innerHTML = list.length ? list.map(prow).join('') : '<li class="muted hint">No partners match that search.</li>';
};
route('/partners/:cat', ({ cat }) => {
  const C = S.cfg.partnerCats[cat];
  if (!C) return { top: 'light', shell: 'cust', html: bar('Partners') + `<main class="pg">${empty('search', 'Unknown category', '', '<button class="btn" data-go="/partners">All partners</button>')}</main>${nav('home')}` };
  const list = S.partners.filter((p) => p.cat === cat).sort((a, b) => b.r - a.r);
  return { top: 'light', shell: 'cust', html: bar(esc(C.t)) + `<main class="pg"><label class="search">${ic('search')}<input id="pq" data-cat="${cat}" type="search" placeholder="Search ${esc(C.t.toLowerCase())}" autocomplete="off" aria-label="Search"></label><ul id="plist" class="plist">${list.map(prow).join('')}</ul><div class="note247">${ic('shield')}<div><b>All partners are verified</b><small>Rated by drivers like you.</small></div></div></main>${nav('home')}` };
});
INPUT.pq = (el) => {
  const q = el.value.trim().toLowerCase();
  const list = S.partners.filter((p) => p.cat === el.dataset.cat && (!q || searchIn(p).includes(q))).sort((a, b) => b.r - a.r);
  $('#plist').innerHTML = list.length ? list.map(prow).join('') : '<li class="muted hint">No partners match that search.</li>';
};
route('/p/:id', ({ id }) => {
  const p = S.partners.find((x) => x.id === id);
  if (!p) return { top: 'light', shell: 'cust', html: bar('Partner') + `<main class="pg">${empty('search', 'Partner not found', '', '<button class="btn" data-go="/partners">All partners</button>')}</main>${nav('home')}` };
  const C = S.cfg.partnerCats[p.cat]; const canReq = p.cat === 'mech' || p.cat === 'tow';
  return { top: 'light', shell: 'cust', html: bar('Partner details') + `<main class="pg narrow"><section class="pdh"><span class="ico sq big">${ic(C.i)}</span><h2>${esc(p.n)} ${ic('shield', 'vf')}</h2><div class="rt2">${stars(p.r)}<b>${p.r}</b><small>(${p.c} reviews)</small></div><div class="chips"><span class="pill">Verified Partner</span><span class="pill sch">${esc(p.tag)}</span><span class="pill pend">${esc(p.kind)}</span></div></section>
<div class="card stats"><div><small>${p.m ? 'Mins away' : 'Rating'}</small><b>${p.m || p.r}</b></div><div><small>Km away</small><b>${p.km}</b></div><div><small>Service</small><b>${p.tag === 'Open' ? 'Open now' : '24/7'}</b></div></div>
<section class="card"><h3>Services</h3><ul class="chk">${(p.services || []).map((s) => `<li>${ic('check')}${esc(s)}</li>`).join('')}</ul></section>
<div class="two"><button class="btn ghost" data-act="call" data-tel="${esc(p.phone || '')}">${ic('phone')} Call Now</button><button class="btn" data-act="${canReq ? 'reqPartner' : 'askPartner'}" data-id="${esc(p.id)}">${canReq ? 'Request Service' : 'Ask us to arrange'}</button></div></main>${nav('home')}` };
});
A.reqPartner = (t) => { const p = S.partners.find((x) => x.id === t.dataset.id); ui.partner = p.n; go('/request/' + (p.cat === 'tow' ? 'towing' : 'engine')); };
A.askPartner = () => { toast('Tell us what you need — we will arrange it'); openSupport(); };

/* ---------- car hire ---------- */
function calcHire() {
  const sel = $('input[name=car]:checked'); const car = S.cfg.cars.find((c) => c.id === (sel && sel.value));
  const days = +(($('#h-days') || {}).value) || 1; const drv = !!($('#h-drv') && $('#h-drv').checked);
  if (!car || !$('#h-total')) return;
  $('#h-total').textContent = UGX((car.p + (drv ? S.cfg.driverFee : 0)) * days);
  $('#h-note').textContent = `${UGX(car.p)}/day${drv ? ` + ${UGX(S.cfg.driverFee)}/day driver` : ''} × ${days} day${days > 1 ? 's' : ''}`;
}
INPUT.hire = calcHire;
route('/hire', () => {
  const today = new Date().toISOString().slice(0, 10); const tmr = new Date(Date.now() + 864e5).toISOString().slice(0, 10);
  return {
    top: 'light', shell: 'cust', after: calcHire,
    html: bar('Car Hiring') + `<main class="pg"><p class="lead">Explore Uganda in comfort.</p>
<div class="chips c4"><span>${ic('camera')}Tourist friendly</span><span>${ic('wheel')}Driver option</span><span>${ic('shield')}Well maintained</span><span>${ic('tag')}Affordable rates</span></div>
<div class="cars">${S.cfg.cars.map((x, i) => `<label class="car"><input type="radio" name="car" value="${x.id}" data-in="hire"${i === 0 ? ' checked' : ''}><span class="cb"><span class="cart">${veh(x.art, x.c, x.id === 'cruiser')}</span><b>${esc(x.n)}</b><small>${esc(x.s)}</small><em>${UGX(x.p)}<i>/day</i></em></span></label>`).join('')}</div>
<div class="card form"><label class="fl">Pick-up date<span class="inp">${ic('cal')}<input id="h-date" type="date" min="${today}" value="${tmr}"></span></label>
<label class="fl">Number of days<span class="inp">${ic('clock')}<select id="h-days" data-in="hire">${Array.from({ length: 14 }, (_, i) => `<option value="${i + 1}">${i + 1} day${i ? 's' : ''}</option>`).join('')}</select></span></label>
<label class="fl">Pick-up place<span class="inp">${ic('pin')}<select id="h-place">${['Entebbe Airport', ...S.cfg.cities.map((c) => c + ' city centre')].map((c) => `<option>${esc(c)}</option>`).join('')}</select></span></label>
<div class="swr"><span>${ic('wheel')}<span><b>With a driver</b><small>${UGX(S.cfg.driverFee)} per day</small></span></span><label class="sw"><input id="h-drv" type="checkbox" data-in="hire" checked aria-label="With a driver"><i></i></label></div></div>
<div class="card est tot"><span>Estimated total<small id="h-note"></small></span><b id="h-total">–</b></div>
<button class="btn block lg" data-act="hireGo">Book Now</button><p class="fine">We'll call to confirm availability and the final price.</p></main>${nav('home')}`,
  };
});
A.hireGo = () => {
  const sel = $('input[name=car]:checked'); const car = S.cfg.cars.find((c) => c.id === (sel && sel.value));
  const date = $('#h-date').value;
  if (!date) { toast('Choose a pick-up date'); return; }
  const days = +$('#h-days').value; const drv = $('#h-drv').checked; const place = $('#h-place').value;
  ui.hire = { car: car.id, days, driver: drv, date, place };
  sheet(`<h3>Confirm your booking</h3><ul class="kv"><li><span>Vehicle</span><b>${esc(car.n)}</b></li><li><span>Pick-up</span><b>${esc(date)} · ${esc(place)}</b></li><li><span>Duration</span><b>${days} day${days > 1 ? 's' : ''}${drv ? ' with driver' : ''}</b></li><li><span>Estimated total</span><b>${UGX((car.p + (drv ? S.cfg.driverFee : 0)) * days)}</b></li></ul><div class="two"><button class="btn ghost" data-act="closeSheet">Back</button><button class="btn" data-act="hireOk">Confirm</button></div>`, { label: 'Confirm booking' });
};
A.hireOk = (t) => busy(t, async () => {
  await api('/bookings', { method: 'POST', body: Object.assign({ k: 'hire' }, ui.hire) });
  await loadCustomer(); closeSheet(); toast('Booking received — we will confirm shortly'); go('/bookings');
});

/* ---------- bookings + trips ---------- */
const tabs = (key, cur, list) => `<div class="tabs" role="tablist">${list.map(([v, l]) => `<button class="tab${cur === v ? ' on' : ''}" role="tab" aria-selected="${cur === v}" data-act="tab" data-k="${key}" data-v="${v}">${l}</button>`).join('')}</div>`;
A.tab = (t) => { ui[t.dataset.k] = t.dataset.v; if (t.dataset.k === 'mt') history.replaceState(null, '', '#/messages'); render({ keep: true }); };
const bkRow = (b) => `<li><button class="bk" data-act="${b.live ? 'goTrack' : 'openBooking'}" data-id="${esc(b.id)}">${kico(b.k)}<span class="grow"><b>${esc(b.t)}</b><small>${fDT(b.at)}</small><small class="il">${ic('pin')}${esc(b.pl)}</small></span><span class="rt"><small>${esc(b.code)}</small><span class="pill${pillCls(b.st)}">${esc(b.st)}</span></span></button></li>`;
A.goTrack = () => go('/track');
route('/bookings', () => {
  const up = ui.bt === 'up';
  const live = isLive(S.active) ? [{ id: S.active.id, k: S.active.kind === 'sos' ? 'sos' : S.active.svc, t: S.active.title, at: S.active.createdAt, pl: S.active.loc, code: S.active.code, st: 'In Progress', live: true }] : [];
  const list = up ? [...live, ...S.bookings] : S.trips.slice(0, 25);
  return { top: 'light', shell: 'cust', html: bar('My Bookings') + `<main class="pg">${tabs('bt', ui.bt, [['up', 'Upcoming'], ['past', 'Past']])}${list.length ? `<ul class="blist">${list.map(bkRow).join('')}</ul>` : empty('list', up ? 'Nothing booked yet' : 'No past bookings', up ? 'Book a service and it will show up here.' : 'Completed rescues and hires appear here.')}<button class="btn block lg" data-go="/assist">${ic('plus')} Book a New Service</button></main>${nav('book')}` };
});
A.openBooking = (t) => {
  const b = S.bookings.find((x) => x.id === t.dataset.id) || S.trips.find((x) => x.id === t.dataset.id);
  if (!b) return;
  const upcoming = S.bookings.some((x) => x.id === b.id);
  sheet(`<h3>${esc(b.t)}</h3><ul class="kv"><li><span>Reference</span><b>${esc(b.code)}</b></li><li><span>When</span><b>${fDT(b.at)}</b></li><li><span>Where</span><b>${esc(b.pl)}</b></li><li><span>Status</span><b>${esc(b.st)}</b></li></ul>${upcoming ? `<div class="two"><button class="btn ghost" data-act="closeSheet">Close</button><button class="btn dng" data-act="cancelBook" data-id="${esc(b.id)}">Cancel booking</button></div>` : '<button class="btn block" data-act="closeSheet">Close</button>'}`, { label: b.t });
};
A.cancelBook = (t) => busy(t, async () => { await api(`/bookings/${t.dataset.id}/cancel`, { method: 'POST' }); S.bookings = S.bookings.filter((b) => b.id !== t.dataset.id); closeSheet(); toast('Booking cancelled'); render({ keep: true }); });

route('/trips', () => {
  const all = S.trips; const rated = all.filter((t) => t.r);
  const avg = rated.length ? (rated.reduce((a, t) => a + t.r, 0) / rated.length).toFixed(1) : '–';
  const list = ui.tt === 'all' ? all : all.filter((t) => t.cat === ui.tt);
  const shown = ui.all ? list : list.slice(0, 3);
  const stat = (i, n, l) => `<div class="sum">${ic(i)}<b>${n}</b><small>${l}</small></div>`;
  return { top: 'light', shell: 'cust', html: bar('Trip History') + `<main class="pg">${tabs('tt', ui.tt, [['all', 'All Trips'], ['rescue', 'Rescue & Assistance'], ['mobility', 'Transport & Mobility'], ['other', 'Other Services']])}
<h2 class="qh">Trip Summary</h2><div class="sums">${stat('clock', all.length, 'Total Trips')}${stat('tow', all.filter((t) => t.cat === 'rescue').length, 'Rescue & Assistance')}${stat('car', all.filter((t) => t.cat === 'mobility').length, 'Mobility Trips')}${stat('star', avg, 'Avg. Rating')}</div>
<h2 class="qh">Recent Trips</h2>${shown.length ? `<ul class="blist">${shown.map((b) => `<li><button class="bk" data-act="openBooking" data-id="${esc(b.id)}">${kico(b.k)}<span class="grow"><b>${esc(b.t)}</b><small>${fDT(b.at)}</small><small class="il">${ic('pin')}${esc(b.pl)}</small></span><span class="rt"><span class="pill">Completed</span>${b.r ? stars(b.r) : ''}</span></button></li>`).join('')}</ul>` : empty('clock', 'No trips here yet', 'Completed jobs will appear in this list.')}
${list.length > 3 ? `<button class="btn block ghost" data-act="toggleAll">${ui.all ? 'Show less' : 'View All Trip History'} ${ic('next')}</button>` : ''}</main>${nav('me')}` };
});
A.toggleAll = () => { ui.all = !ui.all; render({ keep: true }); };

/* ---------- messages ---------- */
const MI = { logo: 'logo', list: 'list', tag: 'tag', shield: 'shield', headset: 'headset' };
route('/messages', (_p, q) => {
  if (q.has('n')) ui.mt = 'n';
  const inbox = ui.mt === 'in'; const nN = unreadN();
  return {
    top: 'light', shell: 'cust',
    after: () => { if (ui.mt === 'n' && nN) api('/notifs/read', { method: 'POST' }).then(() => { S.notifs.forEach((n) => { n.unread = 0; }); }).catch(() => {}); },
    html: bar('Messages') + `<main class="pg">${tabs('mt', ui.mt, [['in', 'Inbox'], ['n', 'Notifications' + (nN ? ` (${nN})` : '')]])}${inbox
      ? (S.messages.length ? `<ul class="blist">${S.messages.map((m) => `<li><button class="bk" data-act="openMsg" data-id="${esc(m.id)}"><span class="ico">${ic(MI[m.ic] || 'chat', m.ic === 'logo' ? '' : '')}</span><span class="grow"><b>${esc(m.who)}</b><small class="tx">${esc(m.txt)}</small></span><span class="rt"><small>${ago(m.at)}</small>${m.unread ? '<i class="udot"></i>' : ''}</span></button></li>`).join('')}</ul>` : empty('chat', 'No messages', 'Updates from Safari Rescue appear here.'))
      : (S.notifs.length ? `<ul class="blist">${S.notifs.map((n) => `<li class="nt"><span class="ico">${ic('bell')}</span><span class="grow"><b>${esc(n.txt)}</b><small>${ago(n.at)}</small></span>${n.unread ? '<i class="udot"></i>' : ''}</li>`).join('')}</ul>` : empty('bell', 'No notifications', 'You are all caught up.'))}
<button class="btn block ghost" data-act="support">${ic('headset')} Chat with support</button></main>${nav('msg')}`,
  };
});
A.openMsg = async (t) => {
  const m = S.messages.find((x) => x.id === t.dataset.id); if (!m) return;
  if (m.unread) { m.unread = 0; api(`/messages/${m.id}/read`, { method: 'POST' }).catch(() => {}); render({ keep: true }); }
  sheet(`<h3>${esc(m.who)}</h3><p>${esc(m.txt)}</p><small class="muted">${fDT(m.at)}</small><div class="two"><button class="btn ghost" data-act="closeSheet">Close</button><button class="btn" data-act="support">${ic('chat')} Reply to support</button></div>`, { label: m.who });
};

/* ---------- profile + account ---------- */
route('/profile', () => {
  const rows = [['/bookings', 'list', 'My Bookings'], ['/vehicles', 'car', 'My Vehicles'], ['/trips', 'clock', 'Trip History'], ['/payments', 'wallet', 'Payment Methods'], ['/contacts', 'users', 'Emergency Contacts'], ['/messages?n', 'bell', 'Notifications', unreadN()], ['/help', 'headset', 'Help & Support'], ['/settings', 'gear', 'Settings'], ['/about', 'info', 'About Safari Rescue']];
  return { top: 'dark', shell: 'cust', html: `<header class="phead"><div class="bar dk"><span class="ib"></span><h1>Profile</h1><button class="ib" data-act="editName" aria-label="Edit name">${ic('edit')}</button></div><div class="pav"><span class="av xl">${esc(ini(S.user.name))}</span><h2>${esc(S.user.name)}</h2><p>${S.user.phone ? esc(phoneFmt(S.user.phone)) : 'Driver'}</p><button class="prem" data-act="premium">${ic('crown', 'f')}Premium Member${ic('next')}</button></div></header>
<main class="pg"><ul class="menu card">${rows.map(([p, i, l, n]) => `<li><button class="mi" data-go="${p}"><span class="mic">${ic(i)}</span><span class="grow"><b>${l}</b></span>${nb(n)}${ic('next', 'ch')}</button></li>`).join('')}</ul>
<div class="sec"><h2>For businesses</h2></div><ul class="menu card"><li><button class="mi" data-act="logoutTo" data-to="/welcome"><span class="mic">${ic('wrench')}</span><span class="grow"><b>Switch to a rescuer or partner account</b><small>Sign out and log in with another account</small></span>${ic('next', 'ch')}</button></li></ul>
<button class="btn block ghost dngt" data-act="logout">${ic('out')} Sign out</button></main>${nav('me')}` };
});
A.logoutTo = () => A.logout();
A.premium = () => toast('Premium: priority dispatch and 10% off car hire (coming soon)');
A.editName = () => sheet(`<h3>Your name</h3><label class="fl"><span class="inp">${ic('user')}<input id="e-n" type="text" maxlength="40" value="${esc(S.user.name)}" autocomplete="name" data-enter="#e-go"></span></label><button class="btn block lg" id="e-go" data-act="saveName">Save</button>`, { label: 'Edit name' });
A.saveName = (t) => busy(t, async () => { const d = await api('/me', { method: 'PATCH', body: { name: $('#e-n').value } }); S.user = d.user; closeSheet(); render({ keep: true }); });

route('/vehicles', () => {
  const kv = (l, v) => `<div><small>${l}</small><b>${v || '—'}</b></div>`;
  return { top: 'light', shell: 'cust', html: bar('My Vehicles') + `<main class="pg"><div class="vgrid">${S.vehicles.map((v) => `<section class="card vc"><div class="vart">${veh(v.art || 'suv', /white/i.test(v.color) ? '#F4F4F0' : /black/i.test(v.color) ? '#2B3430' : /silver|grey|gray/i.test(v.color) ? '#C9CED0' : /red/i.test(v.color) ? '#C94F43' : /blue/i.test(v.color) ? '#5A7FB8' : '#E8DFC6', true)}</div><h2>${esc(v.make)} <small>${esc(v.model)}</small></h2><div class="kv2">${kv('Plate Number', esc(v.plate))}${kv('Color', esc(v.color))}${kv('Vehicle Type', esc(v.type))}${kv('Fuel Type', esc(v.fuel))}${kv('Year', esc(v.year))}${kv('Engine Capacity', esc(v.engine))}${kv('Insurance', v.ins ? `${esc(v.ins)}${v.insTo ? `<small>Valid until ${fD(v.insTo)}</small>` : ''}` : '')}</div><button class="link dngt" data-act="delVehAsk" data-id="${v.id}">${ic('trash')} Remove vehicle</button></section>`).join('') || `<section class="card">${empty('car', 'No vehicles yet', 'Add your vehicle so rescuers know exactly what to bring.')}</section>`}</div><button class="btn block lg" data-act="addVeh">${ic('plus')} Add ${S.vehicles.length ? 'Another' : 'a'} Vehicle</button></main>${nav('me')}` };
});
A.addVeh = () => sheet(`<h3>Add a vehicle</h3>${[['v-m', 'Make & model', 'car', 'Toyota Land Cruiser'], ['v-t', 'Trim / year (optional)', 'tag', 'TX 2018'], ['v-p', 'Number plate', 'tag', 'UBQ 123A'], ['v-c', 'Colour', 'wheel', 'White']].map(([id, l, i, ph]) => `<label class="fl">${l}<span class="inp">${ic(i)}<input id="${id}" type="text" maxlength="40" placeholder="${ph}"></span></label>`).join('')}
<div class="two"><label class="fl">Type<span class="inp"><select id="v-ty">${['SUV', 'Sedan', 'Van', 'Pickup', 'Truck', 'Motorcycle'].map((x) => `<option>${x}</option>`).join('')}</select></span></label><label class="fl">Fuel<span class="inp"><select id="v-f">${['Diesel', 'Petrol', 'Hybrid', 'Electric'].map((x) => `<option>${x}</option>`).join('')}</select></span></label></div>
<div class="two"><label class="fl">Year<span class="inp"><input id="v-y" inputmode="numeric" maxlength="4" placeholder="2018"></span></label><label class="fl">Engine<span class="inp"><input id="v-e" maxlength="10" placeholder="2.8L"></span></label></div>
<div class="two"><label class="fl">Insurer (optional)<span class="inp"><input id="v-i" maxlength="40" placeholder="UAP Insurance"></span></label><label class="fl">Valid until<span class="inp"><input id="v-d" type="date"></span></label></div>
<button class="btn block lg" data-act="saveVeh">Save vehicle</button>`, { label: 'Add vehicle' });
A.saveVeh = (t) => busy(t, async () => {
  const d = await api('/vehicles', { method: 'POST', body: { make: $('#v-m').value, model: $('#v-t').value, plate: $('#v-p').value, color: $('#v-c').value, type: $('#v-ty').value, fuel: $('#v-f').value, year: $('#v-y').value, engine: $('#v-e').value, ins: $('#v-i').value, insTo: $('#v-d').value } });
  S.vehicles.push(d.vehicle); closeSheet(); toast('Vehicle saved'); render({ keep: true });
});
A.delVehAsk = (t) => confirmSheet('Remove this vehicle?', 'You can add it again at any time.', 'Remove', 'delVeh', { id: t.dataset.id });
A.delVeh = (t) => busy(t, async () => { await api(`/vehicles/${t.dataset.id}`, { method: 'DELETE' }); S.vehicles = S.vehicles.filter((v) => v.id !== t.dataset.id); closeSheet(); render({ keep: true }); });

route('/contacts', () => ({ top: 'light', shell: 'cust', html: bar('Emergency Contacts') + `<main class="pg narrow"><p class="lead">We alert these people when you press SOS.</p>${S.contacts.length ? `<ul class="menu card">${S.contacts.map((c) => `<li class="mi"><span class="mic">${ic('user')}</span><span class="grow"><b>${esc(c.name)}</b><small>${esc(phoneFmt(c.phone))}</small></span><button class="ib" data-act="delContact" data-id="${c.id}" aria-label="Remove ${esc(c.name)}">${ic('trash')}</button></li>`).join('')}</ul>` : `<section class="card">${empty('users', 'No contacts yet', 'Add a family member or friend who should know when you need help.')}</section>`}<button class="btn block lg" data-act="addContact">${ic('plus')} Add a contact</button></main>${nav('me')}` }));
A.addContact = () => sheet(`<h3>Add emergency contact</h3><label class="fl">Name<span class="inp">${ic('user')}<input id="c-n" maxlength="40" placeholder="e.g. Mum"></span></label><label class="fl">Phone number<span class="inp">${ic('phone')}<input id="c-p" type="tel" inputmode="tel" maxlength="16" placeholder="0701 000 111" data-enter="#c-go"></span></label><button class="btn block lg" id="c-go" data-act="saveContact">Save contact</button>`, { label: 'Add contact' });
A.saveContact = (t) => busy(t, async () => { const d = await api('/contacts', { method: 'POST', body: { name: $('#c-n').value, phone: $('#c-p').value } }); S.contacts.push(d.contact); closeSheet(); toast('Contact saved'); render({ keep: true }); });
A.delContact = async (t) => { await api(`/contacts/${t.dataset.id}`, { method: 'DELETE' }); S.contacts = S.contacts.filter((c) => c.id !== t.dataset.id); render({ keep: true }); };

route('/payments', () => ({ top: 'light', shell: 'cust', html: bar('Payment Methods') + `<main class="pg narrow"><p class="lead">Choose how you usually pay your rescuer.</p><ul class="menu card">${S.cfg.pay.map((p) => `<li><button class="mi" data-act="setPay" data-id="${p.id}"><span class="mic">${ic(p.id === 'cash' ? 'dollar' : 'wallet')}</span><span class="grow"><b>${esc(p.n)}</b></span>${S.user.pay === p.id ? ic('check') : ''}</button></li>`).join('')}</ul><p class="fine">Payments are made directly to your rescuer for now. In-app Mobile Money checkout is on the roadmap.</p></main>${nav('me')}` }));
A.setPay = async (t) => { const d = await api('/me', { method: 'PATCH', body: { pay: t.dataset.id } }); S.user = d.user; render({ keep: true }); };

route('/settings', () => ({ top: 'light', shell: 'cust', html: bar('Settings') + `<main class="pg narrow"><section class="card"><h3>Appearance</h3><div class="seg" role="radiogroup" aria-label="Theme">${[['system', 'Auto'], ['light', 'Light'], ['dark', 'Dark']].map(([v, l]) => `<button class="${S.user.theme === v ? 'on' : ''}" role="radio" aria-checked="${S.user.theme === v}" data-act="theme" data-v="${v}">${l}</button>`).join('')}</div></section>
<section class="card"><h3>Your city</h3><button class="mi" data-act="city"><span class="mic">${ic('pin')}</span><span class="grow"><b>${esc(S.user.city)}, Uganda</b></span>${ic('next', 'ch')}</button></section>
<button class="btn block ghost dngt" data-act="logout">${ic('out')} Sign out</button></main>${nav('me')}` }));
A.theme = async (t) => { const d = await api('/me', { method: 'PATCH', body: { theme: t.dataset.v } }); S.user = d.user; applyTheme(d.user.theme); render({ keep: true }); };

route('/help', () => ({ top: 'light', shell: 'cust', html: bar('Help & Support') + `<main class="pg narrow"><button class="btn block lg" data-act="support">${ic('chat')} Chat with support</button>
<div class="warnb">${ic('warn')}<span>In a life-threatening emergency call <b>${esc(S.cfg.emergency.join(' or '))}</b> first.</span></div>
<div class="sec"><h2>Common questions</h2></div><div class="faq">
<details><summary>How fast will help arrive?</summary><p>Most roadside jobs get a rescuer on the way within minutes. You see the ETA and follow them live on the map.</p></details>
<details><summary>What does it cost?</summary><p>Each service shows an estimate before you confirm. Your rescuer confirms the final price on site, before work starts.</p></details>
<details><summary>How do I pay?</summary><p>Pay your rescuer directly by MTN Mobile Money, Airtel Money or cash. In-app payment is coming.</p></details>
<details><summary>Can I cancel a request?</summary><p>Yes — until your rescuer arrives, tap Cancel on the tracking screen.</p></details>
<details><summary>What does SOS do?</summary><p>It alerts the nearest rescue team and your emergency contacts with your location. You get 5 seconds to cancel a mistaken press.</p></details></div></main>${nav('me')}` }));

route('/about', () => ({ top: 'light', shell: 'cust', html: bar('About Safari Rescue') + `<main class="pg narrow"><section class="card ab">${logo(34)}<p>Safari Rescue connects drivers across Uganda with verified mechanics, tow operators, car hire and trusted local partners — so a breakdown never ruins a journey.</p><small>Version ${esc(S.cfg.version)}${S.cfg.demo ? ' · demo mode' : ''}</small></section></main>${nav('me')}` }));
