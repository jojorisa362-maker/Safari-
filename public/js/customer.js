// Safari Rescue - customer app, part 1: auth · home · SOS · roadside request · live tracking
import {
  $, $$, esc, UGX, RNG, fT, fDT, ago, ini, ic, stars, logo, tagline, veh, sceneHero, sceneWelcome, sceneSplash, mapLive, mapPaint,
  S, ui, hooks, LOAD, loadAll, api, nowS, toast, fail, sheet, closeSheet, confirmSheet, busy, applyTheme, route, later, every,
  go, goR, homePath, render, bar, nb, empty, A,
} from './core.js';

/* ---------- shared bits (also used by customer2.js) ---------- */
export const KI = { towing: 'tow', hire: 'car', mob: 'car', battery: 'battery', airport: 'plane', engine: 'engine', fuel: 'fuel', tire: 'tire', lockout: 'lock', winch: 'anchor', other: 'plus', van: 'car', hotel: 'hotel', tour: 'plane', sos: 'bell' };
export const KC = { towing: '#D94B3F', hire: '#2E7D3F', mob: '#2E7D3F', battery: '#0F6B3C', airport: '#2F6DB5', engine: '#0F4A2C', fuel: '#D98E0B', tire: '#0F4A2C', lockout: '#6b5a2e', winch: '#8a5a2b', other: '#4A6353', van: '#2E7D3F', hotel: '#2F6DB5', tour: '#2F6DB5', sos: '#D92D20' };
export const kico = (k) => `<span class="ico sq" style="--c:${KC[k] || 'var(--cta)'}">${ic(KI[k] || 'wrench')}</span>`;
export const LIVE = ['searching', 'accepted', 'arrived'];
export const isLive = (r) => !!r && LIVE.includes(r.status);
export const unread = () => S.messages.filter((m) => m.unread).length;
export const unreadN = () => S.notifs.filter((n) => n.unread).length;
export const svcOf = (id) => (S.cfg.services[id] ? Object.assign({ id }, S.cfg.services[id]) : null);
export const dist = (p) => (p.m ? `${p.m} mins away` : `${p.km} km away`);

export async function loadCustomer() {
  const d = await api('/bootstrap');
  Object.assign(S, { user: d.user, vehicles: d.vehicles, contacts: d.contacts, bookings: d.bookings, trips: d.trips, messages: d.messages, notifs: d.notifs, active: d.active, partners: d.partners });
  applyTheme(S.user.theme);
}
LOAD.customer = loadCustomer;
export async function pollActive() { const d = await api('/requests/active'); S.active = d.request; return d.request; }

const NAVI = [['home', 'home', 'Home', '/home'], ['book', 'list', 'Bookings', '/bookings'], ['help', 'phone', 'Help Now', '/sos'], ['msg', 'chat', 'Messages', '/messages'], ['me', 'user', 'Profile', '/profile']];
const MORE = [['/assist', 'tow', 'Roadside Assistance'], ['/mobility', 'car', 'Rescue Mobility'], ['/hire', 'car', 'Car Hiring'], ['/partners', 'shield', 'Trusted Partners'], ['/trips', 'clock', 'Trip History'], ['/vehicles', 'car', 'My Vehicles'], ['/contacts', 'users', 'Emergency Contacts']];
export const nav = (on) => `<nav class="nav" aria-label="Main"><div class="nv-logo">${logo(22)}</div>${NAVI.map(([k, i, l, p]) => `<button class="${k === 'help' ? 'help ' : ''}${on === k ? 'on' : ''}" data-go="${p}"${on === k ? ' aria-current="page"' : ''}>${k === 'help' ? `<span class="hb">${ic(i)}</span>` : ic(i, k === 'home' || k === 'me' ? 'fl' : '')}<span>${l}</span>${k === 'msg' ? nb(unread()) : ''}</button>`).join('')}<div class="nv-sec">More</div>${MORE.map(([p, i, l]) => `<button class="nv-more" data-go="${p}">${ic(i)}<span>${l}</span></button>`).join('')}<div class="nv-foot"><span class="av">${esc(ini(S.user.name))}</span><span class="grow"><b>${esc(S.user.name)}</b><small>Customer</small></span><button class="ib" data-act="logout" aria-label="Sign out">${ic('out')}</button></div></nav>`;

const geo = (ms = 4000) => new Promise((res) => {
  if (!navigator.geolocation) { res({}); return; }
  const t = setTimeout(() => res({}), ms + 500);
  navigator.geolocation.getCurrentPosition(
    (p) => { clearTimeout(t); res({ lat: p.coords.latitude, lng: p.coords.longitude }); },
    () => { clearTimeout(t); res({}); },
    { enableHighAccuracy: true, timeout: ms, maximumAge: 60000 },
  );
});

/* ---------- chat sheet (rescuer chat + support) ---------- */
let chat = null;
export function chatSheet(title, base) {
  const clear = () => { if (chat && chat.timer) clearInterval(chat.timer); chat = null; };
  sheet(`<div class="chh"><b>${esc(title)}</b><button class="ib" data-act="closeSheet" aria-label="Close">${ic('x')}</button></div><div class="chl" id="chl" aria-live="polite"></div><div class="chf"><input id="chi" data-enter="#chs" maxlength="300" placeholder="Type a message…" autocomplete="off"><button class="send" id="chs" data-act="chatSend" aria-label="Send">${ic('send')}</button></div>`, { cls: 'chat', label: title, onClose: clear });
  chat = { base, n: -1 };
  const load = async () => { if (!chat) return; try { paintChat((await api(chat.base)).messages); } catch (e) { /* retry on next tick */ } };
  load();
  chat.timer = setInterval(load, 3000);
}
function paintChat(list) {
  const box = $('#chl'); if (!box || !chat || list.length === chat.n) return;
  chat.n = list.length;
  box.innerHTML = list.length ? list.map((m) => `<div class="bub${m.me ? ' me' : ''}">${esc(m.t)}<small>${fT(m.at)}</small></div>`).join('') : '<p class="muted hint">Say hello — we usually reply within a few minutes.</p>';
  box.scrollTop = box.scrollHeight;
}
A.chatSend = async () => {
  const i = $('#chi'); if (!i || !chat) return;
  const t = i.value.trim(); if (!t) return;
  i.value = '';
  try { paintChat((await api(chat.base, { method: 'POST', body: { t } })).messages); } catch (e) { fail(e); i.value = t; }
};
export const openSupport = () => chatSheet('Support Team', '/support');
A.support = openSupport;
A.chat = (t) => { if (S.active && isLive(S.active) && S.active.status !== 'searching') chatSheet(t.dataset.who || 'Your rescuer', `/requests/${S.active.id}/chat`); else toast('Chat opens once a rescuer accepts your request'); };
A.call = (t) => { const n = t.dataset.tel; if (n) location.href = 'tel:+' + n; else toast('Calling is switched off in the demo'); };

/* ---------- splash + welcome ---------- */
route('/splash', () => {
  const t0 = Date.now();
  const ready = hooks.ready || Promise.resolve();
  ready.then(() => setTimeout(() => { if (location.hash === '#/splash') goR(S.user ? homePath() : '/welcome'); }, Math.max(0, 1500 - (Date.now() - t0))));
  return {
    top: 'dark',
    html: `<div class="spl"><div class="spb">${sceneSplash()}</div><div class="spc"><svg class="pinbig" viewBox="0 0 60 80" aria-hidden="true"><path d="M30 2C15 2 4 13 4 28c0 20 26 48 26 48s26-28 26-48C56 13 45 2 30 2z" fill="#8BD94B"/><circle cx="30" cy="28" r="9" fill="#0B4A2B"/></svg><div class="spw"><b>SAFARI</b><i>RESCUE</i></div><p>HELP IS ON THE WAY</p><span class="spin" role="status" aria-label="Loading"></span></div></div>`,
  };
});

route('/welcome', () => {
  if (S.user) { goR(homePath()); return { html: '' }; }
  return {
    top: 'light',
    html: `<div class="wl"><div class="wls">${sceneWelcome()}</div><div class="wlt">${logo(40)}${tagline()}<h1 class="wlp">Making every safari<br>safer, smoother, and unforgettable.</h1></div>
<div class="wlb"><button class="btn big blk" data-act="start">Get Started<span class="cir">${ic('arrow')}</span></button><button class="btn big blk out" data-act="startProv">I'm a Service Provider<span class="cir2">${ic('user')}</span></button>
<p class="al">Already have an account? <button class="link" data-act="login">Log In</button></p>
${S.cfg.demo ? `<div class="demo"><span>Just exploring? Try the demo</span><div><button data-act="demo" data-role="customer">Customer</button><button data-act="demo" data-role="provider">Rescuer</button><button data-act="demo" data-role="partner">Partner</button></div></div>` : ''}
<p class="al"><button class="link" data-act="startPartner">Own a garage, tow truck or parts shop? Join as a partner</button></p></div></div>`,
  };
});

const fld = (id, label, icon, attrs = '', pre = '') => `<label class="fl">${label}<span class="inp">${ic(icon)}${pre}<input id="${id}" ${attrs}></span></label>`;
const phoneFld = (id = 'a-p') => fld(id, 'Phone number', 'phone', 'type="tel" inputmode="tel" maxlength="16" autocomplete="tel" placeholder="0775 123 456"');
const pwFld = (id = 'a-w', ac = 'new-password') => fld(id, 'Password', 'lock', `type="password" autocomplete="${ac}" placeholder="At least 6 characters" data-enter="#a-go"`);

async function afterAuth(user) {
  S.user = user;
  applyTheme(user.theme);
  await loadAll();
  closeSheet();
  goR(homePath());
}
const authBtn = (act, label) => `<button class="btn block lg" id="a-go" data-act="${act}">${label}</button><p class="fine" id="a-err" role="alert"></p>`;
const authErr = (e) => { const el = $('#a-err'); if (el) el.textContent = e.message; else toast(e.message); };

A.start = () => sheet(`<h3>Create your account</h3><p class="muted">Get help on the road in a few taps.</p>${fld('a-n', 'Your name', 'user', 'type="text" maxlength="40" autocomplete="name" placeholder="e.g. David Otim"')}${phoneFld()}${pwFld()}${authBtn('signup', 'Create account')}<p class="al sm">Have an account? <button class="link" data-act="login">Log in</button></p>`, { label: 'Sign up' });
A.signup = (t) => busy(t, async () => {
  try { const d = await api('/auth/register', { method: 'POST', body: { role: 'customer', name: $('#a-n').value, phone: $('#a-p').value, password: $('#a-w').value } }); await afterAuth(d.user); } catch (e) { authErr(e); }
});
A.startProv = () => sheet(`<h3>Join as a rescuer</h3><p class="muted">Mechanics, tow and recovery drivers — get job requests near you.</p>${fld('a-n', 'Your name', 'user', 'type="text" maxlength="40" autocomplete="name"')}${phoneFld()}${pwFld()}${fld('a-t', 'What do you do?', 'wrench', 'type="text" maxlength="40" placeholder="e.g. Mobile mechanic, Tow truck driver"')}${fld('a-v', 'Your vehicle', 'car', 'type="text" maxlength="40" placeholder="e.g. Toyota Hilux"')}${fld('a-pl', 'Number plate', 'tag', 'type="text" maxlength="12" placeholder="UAX 123A"')}${authBtn('signupProv', 'Create rescuer account')}<p class="al sm">Have an account? <button class="link" data-act="login">Log in</button></p>`, { label: 'Rescuer sign up' });
A.signupProv = (t) => busy(t, async () => {
  try { const d = await api('/auth/register', { method: 'POST', body: { role: 'provider', name: $('#a-n').value, phone: $('#a-p').value, password: $('#a-w').value, title: $('#a-t').value, vehicle: $('#a-v').value, plate: $('#a-pl').value } }); await afterAuth(d.user); } catch (e) { authErr(e); }
});
A.startPartner = () => sheet(`<h3>Join as a partner</h3><p class="muted">Garages, tow companies, parts shops, lodges and clinics.</p>${fld('a-b', 'Business name', 'box', 'type="text" maxlength="60" placeholder="e.g. Kampala Auto Spares Ltd"')}<label class="fl">Category<span class="inp">${ic('tag')}<select id="a-c">${Object.entries(S.cfg.partnerCats).map(([k, v]) => `<option value="${k}"${k === 'parts' ? ' selected' : ''}>${esc(v.t)}</option>`).join('')}</select></span></label>${fld('a-n', 'Your name', 'user', 'type="text" maxlength="40" autocomplete="name"')}${phoneFld()}${pwFld()}${authBtn('signupPartner', 'Create partner account')}<p class="al sm">Have an account? <button class="link" data-act="login">Log in</button></p>`, { label: 'Partner sign up' });
A.signupPartner = (t) => busy(t, async () => {
  try { const d = await api('/auth/register', { method: 'POST', body: { role: 'partner', business: $('#a-b').value, cat: $('#a-c').value, name: $('#a-n').value, phone: $('#a-p').value, password: $('#a-w').value } }); await afterAuth(d.user); } catch (e) { authErr(e); }
});
A.login = () => sheet(`<h3>Welcome back</h3><p class="muted">Log in with your phone number.</p>${phoneFld()}${pwFld('a-w', 'current-password')}${authBtn('doLogin', 'Log in')}<p class="al sm">New here? <button class="link" data-act="start">Create an account</button></p>`, { label: 'Log in' });
A.doLogin = (t) => busy(t, async () => {
  try { const d = await api('/auth/login', { method: 'POST', body: { phone: $('#a-p').value, password: $('#a-w').value } }); await afterAuth(d.user); } catch (e) { authErr(e); }
});
A.demo = (t) => busy(t, async () => { const d = await api('/auth/demo', { method: 'POST', body: { role: t.dataset.role } }); await afterAuth(d.user); });
A.logout = async () => {
  try { await api('/auth/logout', { method: 'POST' }); } catch (e) { /* ignore */ }
  Object.assign(S, { user: null, vehicles: [], contacts: [], bookings: [], trips: [], messages: [], notifs: [], active: null, prov: null, portal: null });
  applyTheme('system');
  goR('/welcome');
};
hooks.unauthorized = () => { if (S.user) { S.user = null; toast('Please log in again'); goR('/welcome'); } };

/* ---------- drawer + small sheets ---------- */
A.closeSheet = () => closeSheet();
A.drawer = () => {
  const L = [['/assist', 'tow', 'Roadside Assistance'], ['/mobility', 'car', 'Rescue Mobility'], ['/hire', 'car', 'Car Hiring'], ['/partners', 'shield', 'Trusted Partners'], ['/trips', 'clock', 'Trip History'], ['/vehicles', 'car', 'My Vehicles'], ['/contacts', 'users', 'Emergency Contacts'], ['/help', 'headset', 'Help & Support']];
  sheet(`<div class="dh">${logo(24)}</div><ul>${L.map(([p, i, l]) => `<li><button class="mi" data-go="${p}">${ic(i)}<b>${l}</b></button></li>`).join('')}</ul><div class="dsep"></div><button class="mi" data-act="logout">${ic('out')}<b>Sign out</b></button>`, { drawer: true });
};
A.city = () => sheet(`<h3>Where are you?</h3><ul class="pick">${S.cfg.cities.map((c) => `<li><button class="${c === S.user.city ? 'on' : ''}" data-act="setCity" data-c="${esc(c)}">${ic('pin')}<span>${esc(c)}, Uganda</span>${c === S.user.city ? ic('check') : ''}</button></li>`).join('')}</ul>`, { label: 'Choose city' });
A.setCity = async (t) => { const d = await api('/me', { method: 'PATCH', body: { city: t.dataset.c } }); S.user = d.user; closeSheet(); render({ keep: true }); };

/* ---------- home ---------- */
route('/home', () => {
  const t = S.trips[0]; const live = isLive(S.active) || (S.active && S.active.status === 'completed');
  return {
    top: 'light', shell: 'cust',
    after: () => {
      if (!S.active) return;
      every(async () => { const b = S.active && S.active.status; try { await pollActive(); } catch (e) { return; } if ((S.active && S.active.status) !== b) render({ keep: true }); }, 6000);
    },
    html: `<header class="hero"><div class="scene">${sceneHero()}</div>
<div class="bar"><button class="ib mob-only" data-act="drawer" aria-label="Open menu">${ic('menu')}</button><span class="sp"></span><button class="ib" data-go="/messages?n" aria-label="Notifications">${ic('bell')}${nb(unreadN())}</button></div>
<div class="hl mob-only">${logo(30)}</div>
<div class="hw"><h1>Hello, ${esc(S.user.name.split(' ')[0] || 'Driver')}!</h1><p>We're here to get you back on the road safely.</p><button class="loc" data-act="city" aria-label="Change city">${ic('pin')}<span>${esc(S.user.city)}, Uganda</span>${ic('down')}</button></div>
<div class="hcar">${veh('cruiser', '#E8DFC6', true)}</div></header>
<main class="pg"><div class="hgrid"><div class="hcol">
${live ? `<button class="live" data-go="/track"><span class="dot"></span><span class="grow"><b>${S.active.status === 'completed' ? 'Job complete' : 'Help is on the way'}</b><small>${S.active.status === 'completed' ? 'Tap to rate your rescuer' : 'Tap to follow your request live'}</small></span>${ic('next')}</button>` : ''}
<button class="cta" data-go="/assist"><span class="ci">${ic('bell')}</span><span class="grow"><b>Need Help Now?</b><small>Tap to request roadside assistance</small></span><span class="go">${ic('arrow')}</span></button>
<div class="sec"><h2>Our Services</h2><button class="link" data-go="/assist">View All ${ic('next')}</button></div>
<div class="svcs">${['tire', 'battery', 'engine', 'towing', 'fuel'].map((k) => `<button class="svc" data-go="/request/${k}">${ic(S.cfg.services[k].i)}<span>${esc(S.cfg.services[k].s)}</span></button>`).join('')}<button class="svc new" data-go="/hire"><em>NEW</em>${ic('car')}<span>Car Hiring</span></button></div></div>
<div class="hcol"><section class="promo"><div class="ptop"><div class="pin"><h3>Explore Uganda in Comfort</h3><p>Hire a Toyota Land Cruiser for your tour or business trip.</p><button class="btn sm" data-go="/hire">Book a Car ${ic('next')}</button></div><div class="pcar">${veh('cruiser', '#D9CDAA', true)}</div></div><div class="feat"><span>${ic('camera')}Tourist Friendly</span><span>${ic('wheel')}Driver Option Available</span><span>${ic('shield')}Well Maintained</span><span>${ic('tag')}Affordable Rates</span></div></section>
<div class="sec"><h2>Recent Bookings</h2><button class="link" data-go="/trips">View All ${ic('next')}</button></div>
${t ? `<section class="card rb"><div class="row top">${kico(t.k)}<div class="grow"><b>${esc(t.t)}</b><small class="il">${ic('pin')}${esc(t.pl)}</small><small>${fDT(t.at)}</small></div><div class="rt"><span class="pill">Completed</span>${t.r ? stars(t.r) : ''}</div></div><button class="btn block ghost" data-go="/trips">${ic('list')} View Booking History ${ic('next')}</button></section>` : `<section class="card">${empty('clock', 'No trips yet', 'Your completed rescues and bookings will show up here.')}</section>`}</div></div></main>${nav('home')}`,
  };
});

/* ---------- SOS ---------- */
route('/sos', () => {
  const Q = [['medical', 'Medical Emergency', 'medical', '#D92D20'], ['breakdown', 'Vehicle Breakdown', 'tow', '#E57A14'], ['security', 'Security Assistance', 'shield', '#2F6DB5']];
  return {
    top: 'light', shell: 'cust',
    html: bar('Emergency SOS', { right: `<button class="ib" data-act="sosInfo" aria-label="How SOS works">${ic('info')}</button>` }) + `<main class="pg sos"><span class="chip">${ic('pin')}${esc(S.user.city)}, Uganda</span>
<div class="sosw"><i class="rg"></i><i class="rg"></i><i class="rg"></i><button class="sosb" data-act="sosGo" data-type="general" aria-label="Send SOS alert">SOS</button></div>
<h2>Tap the button to alert our rescue team</h2><p class="muted">Your location will be shared with the nearest team.</p>
<h3 class="qh">Quick Emergency Options</h3>
<div class="q3">${Q.map(([k, l, i, c]) => `<button class="q" ${k === 'breakdown' ? 'data-go="/assist"' : `data-act="sosGo" data-type="${k}"`} style="color:${c}">${ic(i, k === 'medical' ? 'f' : '')}<span>${l}</span></button>`).join('')}</div>
<div class="warnb">${ic('warn')}<span>In a life-threatening emergency, call <b>${esc(S.cfg.emergency.join(' or '))}</b> first.${S.cfg.demo ? ' <b>Demo mode:</b> no real alert is sent.' : ''}</span></div></main>${nav('help')}`,
  };
});
A.sosInfo = () => sheet(`<h3>How SOS works</h3><ol class="steps"><li><b>Tap SOS.</b> You get 5 seconds to cancel by mistake.</li><li><b>We alert the nearest rescuer</b>${S.contacts.length ? ' and your emergency contacts' : ''} with your location.</li><li><b>Follow them live</b> on the map until they arrive.</li></ol><p class="fine">For life-threatening emergencies always call ${esc(S.cfg.emergency.join(' or '))} first.</p><button class="btn block" data-act="closeSheet">Got it</button>`, { label: 'How SOS works' });
let sosGeo = null;
A.sosGo = (t) => {
  if (isLive(S.active)) { toast('You already have an active request'); go('/track'); return; }
  const type = t.dataset.type || 'general';
  sosGeo = geo(4500);
  let n = 5; let id;
  sheet(`<div class="cd"><div class="cdn" id="cdn">5</div><h3>Sending SOS…</h3><p class="muted">${S.contacts.length ? 'Your rescue team and emergency contacts will be alerted.' : 'The nearest rescue team will be alerted.'}</p><button class="btn dng block" data-act="sosCancel">Cancel</button></div>`, { label: 'Sending SOS', onClose: () => clearInterval(id) });
  id = setInterval(() => {
    n -= 1; const el = $('#cdn');
    if (!el) { clearInterval(id); return; }
    if (n <= 0) { clearInterval(id); sosSend(type); } else el.textContent = n;
  }, 1000);
};
A.sosCancel = () => { closeSheet(); toast('SOS cancelled'); };
async function sosSend(type) {
  try {
    const g = (await sosGeo) || {};
    const d = await api('/requests', { method: 'POST', body: Object.assign({ kind: 'sos', type, loc: `${S.user.city}, Uganda` }, g) });
    S.active = d.request; closeSheet(); go('/track');
  } catch (e) { closeSheet(); fail(e); }
}

/* ---------- roadside assistance ---------- */
route('/assist', () => {
  const items = ['tire', 'battery', 'engine', 'towing', 'fuel', 'lockout', 'winch', 'other'];
  return {
    top: 'light', shell: 'cust',
    html: bar('Roadside Assistance') + `<main class="pg"><p class="lead">What do you need help with?</p><ul class="menu card">${items.map((k) => { const s = S.cfg.services[k]; return `<li><button class="mi" data-go="/request/${k}"><span class="mic">${ic(s.i)}</span><span class="grow"><b>${esc(s.t)}</b><small>${esc(s.d)}</small></span>${ic('next', 'ch')}</button></li>`; }).join('')}</ul>
<div class="note247">${ic('headset')}<div><b>We're here 24/7</b><small>Our team is always ready to help you anytime, anywhere.</small></div></div>
<div class="sec"><h2>More ways we can help</h2></div><div class="g2c"><button class="tile" data-go="/mobility">${ic('car')}<b>Rescue Mobility</b><small>Replacement vehicle, safe transport, vehicle recovery</small></button><button class="tile" data-go="/partners">${ic('shield')}<b>Trusted Partners</b><small>Verified mechanics, towing, spare parts, hotels</small></button></div></main>${nav('home')}`,
  };
});

route('/request/:svc', ({ svc }) => {
  const s = svcOf(svc) || svcOf('other');
  return {
    top: 'light', shell: 'cust',
    html: bar(esc(s.t)) + `<main class="pg narrow"><div class="card row"><span class="ico">${ic(s.i)}</span><div class="grow"><b>${esc(s.t)}</b><small>${esc(s.d)}</small></div></div>
<label class="fl">Your location<span class="inp">${ic('pin')}<input id="f-loc" type="text" maxlength="120" autocomplete="off" placeholder="${esc(S.user.city)}, e.g. Kira Road"><button class="gps" data-act="gps" type="button">Use GPS</button></span></label>
${S.vehicles.length ? `<label class="fl">Vehicle<span class="inp">${ic('car')}<select id="f-veh">${S.vehicles.map((v) => `<option value="${v.id}">${esc(v.make)} · ${esc(v.plate)}</option>`).join('')}</select></span></label>` : '<p class="fine tl">Tip: <button class="link" data-go="/vehicles">add your vehicle</button> so the rescuer knows what to bring.</p>'}
<label class="fl">What's wrong? <small>(optional)</small><textarea id="f-note" rows="3" maxlength="240" placeholder="Tell us what happened"></textarea></label>
<label class="fl">Pay with<span class="inp">${ic('wallet')}<select id="f-pay">${S.cfg.pay.map((p) => `<option value="${p.id}"${S.user.pay === p.id ? ' selected' : ''}>${esc(p.n)}</option>`).join('')}</select></span></label>
<div class="card est"><span>Estimated cost</span><b>${s.p ? RNG(s.p) : 'Quoted after inspection'}</b></div>
<button class="btn block lg" data-act="sendReq" data-svc="${esc(svc)}">${ic('bell')} Request Help</button>
<p class="fine">${S.cfg.demo ? 'Demo mode: a virtual rescuer will respond. ' : ''}The final price is confirmed by your rescuer before work starts.</p></main>${nav('home')}`,
  };
});
A.gps = async (t) => {
  t.disabled = true;
  const g = await geo(7000);
  t.disabled = false;
  if (g.lat == null) { toast('Could not get your GPS location. Type where you are instead.'); return; }
  ui.gps = g; const f = $('#f-loc'); if (f) f.value = `GPS ${g.lat.toFixed(4)}, ${g.lng.toFixed(4)}`;
  toast('Location found');
};
A.sendReq = (t) => busy(t, async () => {
  const body = {
    kind: 'service', svc: t.dataset.svc, loc: $('#f-loc').value.trim() || `${S.user.city}, Uganda`, vehicleId: $('#f-veh') ? $('#f-veh').value : undefined,
    note: ($('#f-note').value.trim() + (ui.partner ? ` (Requested partner: ${ui.partner})` : '')).trim(), pay: $('#f-pay').value,
  };
  if (ui.gps) { body.lat = ui.gps.lat; body.lng = ui.gps.lng; }
  const d = await api('/requests', { method: 'POST', body });
  S.active = d.request; ui.partner = null; ui.gps = null;
  go('/track');
});

/* ---------- live tracking ---------- */
function progress(r) {
  if (r.status === 'arrived' || r.status === 'completed') return 1;
  if (r.status !== 'accepted' || !r.acceptedAt) return 0;
  return Math.max(0, Math.min(r.demo ? 1 : 0.95, (nowS() - r.acceptedAt) / r.tripMs));
}
function paint(r) {
  const p = progress(r);
  const eta = Math.max(1, Math.ceil(r.etaMin * (1 - p)));
  const km = Math.max(0.1, r.km * (1 - p)).toFixed(1);
  const set = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
  set('eta', eta + ' min'); set('dist', km + ' km'); set('arr', fT(Date.now() + eta * 60000));
  set('live', `Your ${r.kind === 'sos' ? 'rescue team' : 'mechanic'} is ${km} km away and on the way to you.`);
  mapPaint(p);
}
const techArt = (r) => (r.svc === 'towing' ? ['tow', '#F0F0EA', 'Tow Truck'] : ['cruiser', '#E8DFC6', (r.provider && r.provider.vehicle) || 'Toyota Land Cruiser']);

route('/track', () => {
  const r = S.active;
  if (!r) return { top: 'light', shell: 'cust', html: bar('Live Tracking') + `<main class="pg">${empty('map', 'No active request', 'When you ask for help you can follow your rescuer here in real time.', '<button class="btn" data-go="/assist">Request help</button>')}</main>${nav('home')}` };
  const after = () => {
    every(async () => {
      const before = S.active && S.active.status;
      try { await pollActive(); } catch (e) { return; }
      if (!S.active) { go('/home'); return; }
      if (S.active.status !== before) { render({ keep: true }); return; }
      if (S.active.status === 'accepted') paint(S.active);
    }, 2500);
    if (r.status === 'accepted') { paint(r); every(() => { if (S.active) paint(S.active); }, 500); }
    if (r.status === 'completed' && !r.rated) later(() => A.rateOpen(), 500);
    if (r.status === 'searching') later(() => { const el = $('#slow'); if (el) el.hidden = false; }, Math.max(0, 60000 - (nowS() - r.createdAt)));
  };
  const sos = r.kind === 'sos';
  const m = r.provider;
  const head = bar('Live Tracking', { right: `<button class="ib" data-act="support" aria-label="Contact support">${ic('headset')}</button>` });
  if (r.status === 'searching') {
    return { top: 'light', shell: 'cust', after, html: head + `<main class="pg narrow srch"><div class="radar"><i></i><i></i><i></i><span>${ic(sos ? 'bell' : (S.cfg.services[r.svc] || {}).i || 'wrench')}</span></div><h2>${sos ? 'Alerting the nearest rescue team…' : 'Finding the nearest mechanic…'}</h2><p class="muted">We're matching you with a verified rescuer near ${esc(r.loc)}.</p><p class="fine">Request ${esc(r.code)}</p><div class="warnb" id="slow"${sos ? '' : ' hidden'}>${ic('warn')}<span>${sos ? 'This can take a moment. ' : 'Still looking. '}If someone is in danger, call <b>${esc(S.cfg.emergency.join(' or '))}</b> now.</span></div><button class="btn dng block" data-act="cancelAsk">Cancel request</button></main>${nav('home')}` };
  }
  if (r.status === 'arrived' || r.status === 'completed') {
    const done = r.status === 'completed';
    return { top: 'light', shell: 'cust', after, html: head + `<main class="pg narrow arr"><div class="okc">${ic('check')}</div><h2>${done ? 'Job complete' : (sos ? 'Your rescue team has arrived' : 'Your mechanic has arrived')}</h2><p class="muted">${done ? `Total ${UGX(r.amount)}. Thanks for choosing Safari Rescue.` : `${esc(m.name)} is at your location. When the job is done, confirm it and leave a rating.`}</p>
<section class="card row"><span class="av lg">${esc(ini(m.name))}</span><div class="grow"><b>${esc(m.name)}</b><small>${esc(m.title || 'Rescuer')}</small></div>${done ? '' : `<button class="ib ring" data-act="call" data-tel="${esc(m.phone || '')}" aria-label="Call ${esc(m.name)}">${ic('phone')}</button>`}</section>
${done ? `<button class="btn block lg" data-act="rateOpen">${ic('star', 'f')} Rate your rescuer</button>` : `<button class="btn block lg" data-act="finish">${ic('check')} Job done — complete &amp; rate</button><button class="btn ghost block" data-act="chat" data-who="${esc(m.name)}">${ic('chat')} Chat</button>`}</main>${nav('home')}` };
  }
  const [art, col, vname] = techArt(r);
  const mech = sos
    ? `<div class="band">${ic('bell')}Rescue Team On The Way<small>We're on the way to you. Stay safe!</small></div><section class="card"><div class="stats"><div><small>ETA</small><b id="eta">–</b></div><div><small>Distance</small><b id="dist">–</b></div><div><small>Rescue unit</small><b>${esc(r.code)}</b></div></div></section>`
    : `<div class="band">${ic('pin')}A mechanic is on the way to you</div><section class="card mech"><span class="av lg">${esc(ini(m.name))}</span><div class="grow"><b>${esc(m.name)} ${ic('shield', 'vf')}</b><div class="rt2">${ic('star', 'f')}<b>${m.rating || '–'}</b> <small>(${m.reviews || 0})</small></div><small>${esc(m.title || 'Roadside technician')}</small></div><button class="ib ring" data-act="call" data-tel="${esc(m.phone || '')}" aria-label="Call ${esc(m.name)}">${ic('phone')}</button><div class="stats"><div><small>ETA</small><b id="eta">–</b></div><div><small>Distance</small><b id="dist">–</b></div><div><small>Arriving at</small><b id="arr">–</b></div></div></section>`;
  return {
    top: 'light', shell: 'cust', after,
    html: head + `<main class="pg tkgrid"><div class="tkl">${mech}<div class="mw">${mapLive()}<div class="mpl">${ic('pin')}<span>${esc(r.loc)}</span></div><div class="mlive"><small>Live Updates</small><span id="live">…</span></div></div></div>
<div class="tkr">${sos ? '' : `<section class="card row veh"><span class="vthumb">${veh(art, col, true)}</span><div class="grow"><small>Vehicle</small><b>${esc(vname)}</b>${m.plate ? `<span class="plate">${esc(m.plate)}</span>` : ''}</div></section>`}
<div class="three"><button class="btn ghost" data-act="chat" data-who="${esc(m.name)}">${ic('chat')} Chat</button><button class="btn ghost" data-act="call" data-tel="${esc(m.phone || '')}">${ic('phone')} Call</button><button class="btn dng" data-act="cancelAsk">${ic('x')} Cancel</button></div>
<div class="card safe">${ic('shield')}<span>Your safety is our priority. ${sos ? 'Share your live location with family or friends.' : 'You can share your trip details with family or friends.'}</span><button class="link" data-act="share">${sos ? 'Share My Location' : 'Share Trip'} ${ic('share')}</button></div>
<p class="fine">Request ${esc(r.code)}${r.demo ? ' · demo rescuer' : ''}</p></div></main>${nav('home')}`,
  };
});

A.cancelAsk = () => confirmSheet('Cancel this request?', 'Your rescuer will be told you no longer need help.', 'Yes, cancel', 'cancelDo');
A.cancelDo = (t) => busy(t, async () => {
  await api(`/requests/${S.active.id}/cancel`, { method: 'POST' });
  S.active = null; closeSheet(); toast('Request cancelled'); go('/home');
});
A.finish = (t) => busy(t, async () => { const d = await api(`/requests/${S.active.id}/complete`, { method: 'POST' }); S.active = d.request; render({ keep: true }); });
A.share = async () => {
  const txt = `I need roadside help — Safari Rescue is on the way. I'm near ${S.active ? S.active.loc : S.user.city + ', Uganda'}.`;
  try { if (navigator.share) { await navigator.share({ title: 'My location', text: txt }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
  try { await navigator.clipboard.writeText(txt); toast('Copied — paste it into WhatsApp or SMS'); } catch (e) { toast('Sharing is not available on this device'); }
};
let stars5 = 0;
A.rateOpen = () => {
  stars5 = 0;
  sheet(`<h3>How was ${esc(S.active && S.active.provider ? S.active.provider.name : 'your rescuer')}?</h3><div class="rate" role="radiogroup" aria-label="Rating">${[1, 2, 3, 4, 5].map((i) => `<button data-act="star" data-n="${i}" role="radio" aria-checked="false" aria-label="${i} star${i > 1 ? 's' : ''}">${ic('star', 'f off')}</button>`).join('')}</div><label class="fl"><textarea id="rv" rows="2" maxlength="300" placeholder="Anything to add? (optional)"></textarea></label><div class="two"><button class="btn ghost" data-act="rateSkip">Skip</button><button class="btn" data-act="rateSend">Submit</button></div>`, { label: 'Rate your rescuer' });
};
A.star = (t) => { stars5 = +t.dataset.n; $$('.rate button').forEach((b, i) => { b.setAttribute('aria-checked', String(i + 1 === stars5)); $('.ic', b).classList.toggle('off', i + 1 > stars5); }); };
async function sendRating(n) {
  if (!S.active) { closeSheet(); return; }
  await api(`/requests/${S.active.id}/rate`, { method: 'POST', body: { rating: n, review: $('#rv') ? $('#rv').value : '' } });
  S.active = null; closeSheet();
  await loadCustomer();
  toast(n ? 'Thanks for your rating!' : 'Done'); go('/home');
}
A.rateSend = (t) => { if (!stars5) { toast('Tap a star to rate'); return; } return busy(t, () => sendRating(stars5)); };
A.rateSkip = (t) => busy(t, () => sendRating(0));
