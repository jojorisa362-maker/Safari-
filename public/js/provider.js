// Safari Rescue - rescuer app: job requests · dashboard · map · earnings · profile
import {
  $, esc, UGX, RNG, fT, fDT, fShort, since, ini, phoneFmt, ic, stars, logo, veh, mapPark, S, ui, api, toast, sheet, closeSheet, busy,
  applyTheme, route, every, go, render, bar, nb, empty, A, LOAD,
} from './core.js';
import { chatSheet } from './customer.js';

export async function loadProvider() {
  const d = await api('/provider/bootstrap');
  S.prov = d; S.user = d.user; applyTheme(S.user.theme);
}
LOAD.provider = loadProvider;

const PN = [['dash', 'gauge', 'Dashboard', '/provider/dash'], ['jobs', 'list', 'Jobs', '/provider'], ['map', 'map', 'Map', '/provider/map'], ['earn', 'wallet', 'Earnings', '/provider/earn'], ['me', 'user', 'Profile', '/provider/me']];
const pnav = (on) => `<nav class="nav pnav" aria-label="Rescuer"><div class="nv-logo">${logo(22)}<small>Rescuer</small></div>${PN.map(([k, i, l, p]) => `<button class="${on === k ? 'on' : ''}" data-go="${p}"${on === k ? ' aria-current="page"' : ''}>${ic(i, k === 'dash' || k === 'me' ? 'fl' : '')}<span>${l}</span>${k === 'jobs' ? nb(S.prov.jobs.length) : ''}</button>`).join('')}<div class="nv-foot"><span class="av">${esc(ini(S.user.name))}</span><span class="grow"><b>${esc(S.user.name)}</b><small>${S.prov.user.provider.online ? 'Online' : 'Offline'}</small></span><button class="ib" data-act="logout" aria-label="Sign out">${ic('out')}</button></div></nav>`;
const pbar = (title) => `<div class="bar"><span class="ib"></span><h1>${title}</h1><button class="sosm" data-act="provSOS" aria-label="Alert Safari Rescue operations">SOS</button></div>`;

const sig = (p) => JSON.stringify([p.pending, p.current && [p.current.id, p.current.status], p.jobs.map((j) => j.id), p.user.provider.online]);
const watch = () => every(async () => {
  const a = sig(S.prov);
  try { await loadProvider(); } catch (e) { return; }
  if (sig(S.prov) !== a) render({ keep: true });
}, 5000);
const post = async (path, body) => { const d = await api(path, { method: 'POST', body }); S.prov = d; S.user = d.user; render({ keep: true }); };

A.provSOS = () => toast(S.cfg.demo ? 'Demo: the operations centre would be alerted now' : 'Operations centre alerted');
A.provOnline = (t) => busy(t, () => post('/provider/online', { online: t.dataset.on === '1' }));

/* ---------- jobs (the designed "Job Request" screen) ---------- */
const kvRow = (l, v) => `<div><small>${l}</small><b>${v}</b></div>`;
function jobCard(j, mine) {
  const v = j.vehicle;
  const pins = [{ x: 74, y: 128, l: j.loc.split(',')[0].slice(0, 22) }];
  return `<section class="jhead"><div class="jpills"><span class="pill lime">${mine ? 'Current Job' : 'New Request'}</span>${j.urgent ? '<span class="pill hot">Urgent</span>' : ''}</div><h2>${esc(j.title)}</h2><small>${since(j.createdAt)} · ${esc(j.code)}</small></section>
<section class="card"><div class="row top"><span class="ico">${ic('pin')}</span><div class="grow"><small>Pickup Location</small><b>${esc(j.loc)}</b>${j.region ? `<small>${esc(j.region)}</small>` : ''}${mine && j.lat != null ? `<a class="link" target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&destination=${j.lat},${j.lng}">${ic('nav')} Navigate in Google Maps</a>` : `<button class="link" data-act="viewMap">${ic('map')} View on Map</button>`}</div><div class="dbox"><b>${j.km} km</b><small>away from you</small></div></div></section>
<section class="card"><small>Customer Details</small><div class="row"><span class="av lg">${esc(ini(j.customer.name))}</span><div class="grow"><b>${esc(j.customer.name)} <span class="vfy">${ic('check')}Verified</span></b>${j.customer.rating ? `<div class="rt2">${ic('star', 'f')}<b>${j.customer.rating}</b><small>(${j.customer.reviews} reviews)</small></div>` : '<small>New customer</small>'}<small>${mine ? (j.customer.phone ? esc(phoneFmt(j.customer.phone)) : 'Phone hidden in demo') : 'Phone number shared after you accept'}</small></div></div>
<div class="two"><button class="btn ghost" data-act="provChat" data-id="${j.id}" data-who="${esc(j.customer.name)}"${mine ? '' : ' disabled'}>${ic('chat')} Chat</button><button class="btn ghost" data-act="call" data-tel="${esc(j.customer.phone || '')}"${mine ? '' : ' disabled'}>${ic('phone')} Call</button></div></section>
${v ? `<section class="card"><small>Vehicle Details</small><div class="row"><span class="vthumb">${veh('suv', '#F4F4F0')}</span><div class="grow"><b>${esc(v.make)} ${esc(v.model)}</b><span class="plate">${esc(v.plate)}</span><small>${esc(v.color)} • ${esc(v.fuel)} • ${esc(v.type)}</small></div></div></section>` : ''}
<section class="card"><small>Problem Description</small><div class="row top"><span class="ico warnic">${ic('warn')}</span><p class="grow">${esc(j.note || 'No description provided.')}</p></div></section>
<section class="card"><small>Customer Location</small><div class="mw sm">${mapPark(pins)}</div><div class="stats">${kvRow('Requested', fT(j.createdAt))}${kvRow('Distance', j.km + ' km')}${kvRow('Est. arrival', j.etaMin + ' mins')}</div></section>
${j.price ? `<section class="card est"><span>Estimated job value</span><b>${RNG(j.price)}</b></section>` : ''}`;
}
route('/provider', () => {
  const p = S.prov; const cur = p.current;
  const online = p.user.provider.online;
  const jobs = p.jobs; if (ui.pj >= jobs.length) ui.pj = 0;
  const j = jobs[ui.pj];
  let body; let acts = '';
  if (p.pending) {
    body = empty('shield', 'Waiting for approval', "Safari Rescue is checking your details. You'll be able to go online and receive jobs as soon as you're approved.");
  } else if (cur) {
    body = `<div class="band">${ic('nav')}${cur.status === 'accepted' ? 'Job accepted — head to the pickup point' : 'You have arrived — complete the job when done'}<small>Customer has been notified</small></div>${jobCard(cur, true)}`;
    acts = cur.status === 'accepted'
      ? `<button class="btn block lg" data-act="jobArrive" data-id="${cur.id}">${ic('pin')} I've arrived</button>`
      : `<button class="btn block lg" data-act="jobDoneAsk" data-id="${cur.id}" data-min="${cur.price ? cur.price[0] : 0}" data-max="${cur.price ? cur.price[1] : 0}">${ic('check')} Complete job</button>`;
  } else if (!online) {
    body = empty('gauge', "You're offline", "Go online to receive job requests near you.", `<button class="btn" data-act="provOnline" data-on="1">Go online</button>`);
  } else if (!j) {
    body = empty('check', 'No new requests', "You're online. We'll show new jobs here the moment they come in.");
  } else {
    body = `${jobs.length > 1 ? `<div class="jq">${jobs.map((x, i) => `<button class="${i === ui.pj ? 'on' : ''}" data-act="pickJob" data-i="${i}">${esc(x.title.replace('Breakdown – ', ''))}<small>${x.km} km</small></button>`).join('')}</div>` : ''}${jobCard(j, false)}`;
    acts = `<div class="two"><button class="btn ghost" data-act="jobDecline" data-id="${j.id}"><span>Decline<small>Skip this job</small></span></button><button class="btn" data-act="jobAccept" data-id="${j.id}"><span>Accept Job<small>I'm on my way</small></span></button></div>`;
  }
  return { top: 'light', shell: 'prov', after: watch, html: `${pbar('Job Request')}<main class="pg jobs${acts ? ' hasact' : ''}">${body}</main>${acts ? `<div class="jact">${acts}</div>` : ''}${pnav('jobs')}` };
});
A.pickJob = (t) => { ui.pj = +t.dataset.i; render({ keep: true }); window.scrollTo(0, 0); };
A.viewMap = () => go('/provider/map');
A.provChat = (t) => chatSheet(t.dataset.who || 'Customer', `/requests/${t.dataset.id}/chat`);
A.jobAccept = (t) => busy(t, async () => { await post(`/provider/jobs/${t.dataset.id}/accept`); toast('Job accepted — customer notified'); });
A.jobDecline = (t) => busy(t, async () => { await post(`/provider/jobs/${t.dataset.id}/decline`); toast('Job skipped'); });
A.jobArrive = (t) => busy(t, async () => { await post(`/provider/jobs/${t.dataset.id}/arrive`); toast('Customer told you have arrived'); });
A.jobDoneAsk = (t) => sheet(`<h3>Complete this job</h3><p class="muted">Enter the final amount you charged the customer.</p><label class="fl">Amount (UGX)<span class="inp">${ic('dollar')}<input id="j-amt" type="number" inputmode="numeric" min="0" max="5000000" step="1000" value="${Math.round((+t.dataset.min + +t.dataset.max) / 2000) * 1000 || ''}" data-enter="#j-go"></span></label><button class="btn block lg" id="j-go" data-act="jobDone" data-id="${t.dataset.id}">Mark complete</button>`, { label: 'Complete job' });
A.jobDone = (t) => busy(t, async () => { await post(`/provider/jobs/${t.dataset.id}/complete`, { amount: +$('#j-amt').value || 0 }); closeSheet(); toast('Job complete — payment recorded'); });

/* ---------- dashboard ---------- */
route('/provider/dash', () => {
  const p = S.prov; const on = p.user.provider.online; const st = p.stats;
  return { top: 'light', shell: 'prov', after: watch, html: `${pbar('Dashboard')}<main class="pg"><section class="card onl"><div class="row"><span class="ico${on ? ' on' : ''}">${ic('gauge')}</span><div class="grow"><b>${p.pending ? 'Account waiting for approval' : on ? "You're online" : "You're offline"}</b><small>${p.pending ? "We'll notify you once you're approved" : on ? 'New jobs appear on the Jobs tab' : 'Go online to receive job requests'}</small></div>${p.pending ? '<span class="pill pend">Pending approval</span>' : `<button class="btn sm${on ? ' ghost' : ''}" data-act="provOnline" data-on="${on ? 0 : 1}">${on ? 'Go offline' : 'Go online'}</button>`}</div></section>
<div class="kpis k3"><div class="kpi">${ic('wallet')}<small>Today</small><b>${UGX(st.today)}</b></div><div class="kpi">${ic('check')}<small>Jobs done</small><b>${st.done}</b></div><div class="kpi">${ic('star')}<small>Rating</small><b>${st.rating || '–'}</b></div></div>
${p.current ? `<button class="live" data-go="/provider"><span class="dot"></span><span class="grow"><b>Job in progress</b><small>${esc(p.current.title)} · ${esc(p.current.code)}</small></span>${ic('next')}</button>` : p.jobs.length ? `<button class="cta" data-go="/provider"><span class="ci">${ic('bell')}</span><span class="grow"><b>${p.jobs.length} new request${p.jobs.length > 1 ? 's' : ''}</b><small>Tap to review and accept</small></span><span class="go">${ic('arrow')}</span></button>` : `<section class="card">${empty('check', 'All caught up', on ? 'We will alert you when a job comes in.' : 'Go online to start receiving jobs.')}</section>`}
<section class="card"><h3>Tips</h3><ul class="chk"><li>${ic('check')}Reply quickly — nearby rescuers get the same alert.</li><li>${ic('check')}Share your arrival with the customer before you set off.</li><li>${ic('check')}Confirm the price on site before starting work.</li></ul></section></main>${pnav('dash')}` };
});

/* ---------- map ---------- */
route('/provider/map', () => {
  const pos = [{ x: 74, y: 128 }, { x: 330, y: 70 }, { x: 150, y: 186 }];
  const pins = S.prov.jobs.slice(0, 3).map((j, i) => Object.assign({ l: `${j.km} km` }, pos[i]));
  return { top: 'light', shell: 'prov', after: watch, html: `${pbar('Nearby Jobs')}<main class="pg"><div class="mw big">${mapPark(pins)}</div>${S.prov.jobs.length ? `<ul class="blist">${S.prov.jobs.map((j) => `<li><button class="bk" data-act="pickJob" data-i="${S.prov.jobs.indexOf(j)}" data-go="/provider"><span class="ico">${ic('pin')}</span><span class="grow"><b>${esc(j.title)}</b><small>${esc(j.loc)}</small></span><span class="rt"><small>${j.km} km</small></span></button></li>`).join('')}</ul>` : `<section class="card">${empty('map', 'No jobs nearby', 'Open requests will be pinned here.')}</section>`}<p class="fine">The map is a simple preview. Connect Google Maps or OpenStreetMap to show real streets.</p></main>${pnav('map')}` };
});

/* ---------- earnings ---------- */
route('/provider/earn', () => {
  const st = S.prov.stats; const days = [];
  for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0); days.push({ t: d.getTime(), label: fShort(d.getTime()).split(' ')[1], v: 0 }); }
  for (const e of S.prov.earnings) { const d = days.slice().reverse().find((x) => e.at >= x.t); if (d) d.v += e.amount; }
  const max = Math.max(1, ...days.map((d) => d.v));
  return { top: 'light', shell: 'prov', after: watch, html: `${pbar('Earnings')}<main class="pg"><div class="kpis k3"><div class="kpi"><small>Today</small><b>${UGX(st.today)}</b></div><div class="kpi"><small>Last 7 days</small><b>${UGX(st.week)}</b></div><div class="kpi"><small>All time</small><b>${UGX(st.total)}</b></div></div>
<section class="card"><h3>Last 7 days</h3><div class="bars">${days.map((d) => `<div><i style="height:${Math.max(3, Math.round(d.v / max * 100))}%" title="${UGX(d.v)}"></i><small>${d.label}</small></div>`).join('')}</div></section>
<div class="sec"><h2>Recent payouts</h2></div>${S.prov.earnings.length ? `<ul class="blist">${S.prov.earnings.slice(0, 12).map((e) => `<li class="nt"><span class="ico">${ic('dollar')}</span><span class="grow"><b>${esc(e.title)}</b><small>${fDT(e.at)}</small></span><b>${UGX(e.amount)}</b></li>`).join('')}</ul>` : `<section class="card">${empty('wallet', 'No earnings yet', 'Completed jobs show up here.')}</section>`}</main>${pnav('earn')}` };
});

/* ---------- profile ---------- */
route('/provider/me', () => {
  const u = S.prov.user; const p = u.provider;
  return { top: 'dark', shell: 'prov', html: `<header class="phead"><div class="bar dk"><span class="ib"></span><h1>Profile</h1><span class="ib"></span></div><div class="pav"><span class="av xl">${esc(ini(u.name))}</span><h2>${esc(u.name)}</h2><p>${esc(p.title)}</p><div class="rt2 lt">${p.reviews ? `${stars(p.rating)}<b>${p.rating}</b><small>(${p.reviews})</small>` : '<small>No ratings yet</small>'}</div></div></header>
<main class="pg"><ul class="menu card"><li class="mi"><span class="mic">${ic('shield')}</span><span class="grow"><b>${p.verified ? 'Verified rescuer' : 'Verification pending'}</b><small>${p.verified ? 'Customers see a verified badge' : 'Safari Rescue will verify your documents'}</small></span></li><li class="mi"><span class="mic">${ic('car')}</span><span class="grow"><b>${esc(p.vehicle || 'Vehicle not set')}</b><small>${esc(p.plate || '')}</small></span></li><li class="mi"><span class="mic">${ic('phone')}</span><span class="grow"><b>${u.phone ? esc(phoneFmt(u.phone)) : 'Demo account'}</b></span></li></ul>
<section class="card"><h3>Appearance</h3><div class="seg">${[['system', 'Auto'], ['light', 'Light'], ['dark', 'Dark']].map(([v, l]) => `<button class="${u.theme === v ? 'on' : ''}" data-act="provTheme" data-v="${v}">${l}</button>`).join('')}</div></section>
<button class="btn block ghost dngt" data-act="logout">${ic('out')} Sign out</button></main>${pnav('me')}` };
});
A.provTheme = async (t) => { const d = await api('/me', { method: 'PATCH', body: { theme: t.dataset.v } }); S.user = d.user; S.prov.user = d.user; applyTheme(d.user.theme); render({ keep: true }); };
