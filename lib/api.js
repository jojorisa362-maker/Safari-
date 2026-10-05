'use strict';
// REST API. Every route is JSON in / JSON out and lives under /api.
const crypto = require('crypto');
const cfg = require('./config');
const auth = require('./auth');
const cat = require('./catalog');
const seed = require('./seed');
const notify = require('./notify');
const { HttpError, createRouter, limit } = require('./http');

const uid = () => crypto.randomBytes(8).toString('hex');
const rint = (a, b) => crypto.randomInt(a, b + 1);
const now = () => Date.now();
const r1 = (n) => Math.round(n * 10) / 10;
const DAY = 864e5;
const ACTIVE = ['searching', 'accepted', 'arrived'];
const UPCOMING = ['Pending', 'Confirmed', 'Scheduled'];

const str = (v, max = 200) => String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
const intIn = (v, lo, hi, d) => { const n = parseInt(v, 10); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d; };
const pickOf = (v, list, d) => (list.includes(v) ? v : d);
const coord = (v, lim) => { const n = Number(v); return v !== '' && v != null && Number.isFinite(n) && Math.abs(n) <= lim ? n : null; };
const mid = (p) => (p ? Math.round((p[0] + p[1]) / 2 / 1000) * 1000 : 0);
const byNewest = (a, b) => (b.at || b.createdAt || 0) - (a.at || a.createdAt || 0);

const DEMO_PROVIDER = { id: 'demo', name: 'Brian Okello', title: 'Experienced Mechanic', rating: 4.9, reviews: 128, vehicle: 'Toyota Land Cruiser', plate: 'UAY 456B', phone: null };
const REPLIES = ["Got it, I'm on my way.", "I'll be there shortly. Please stay near your vehicle.", 'Thanks for the update. Keep your hazard lights on.', 'Understood. See you in a few minutes.'];

const pub = (u) => ({
  id: u.id, role: u.role, name: u.name, phone: u.phone || '', city: u.city, pay: u.pay, theme: u.theme,
  demo: !!u.demo, provider: u.provider || undefined, partner: u.partner || undefined, created: u.created,
});

module.exports = function buildApi(store, secret) {
  const R = createRouter();
  const add = (m, p, h, o) => R.add(m, p, h, o);

  // ---------- helpers ----------
  const needUser = (c, ...roles) => {
    if (!c.user) throw new HttpError(401, 'Please log in');
    if (roles.length && !roles.includes(c.user.role)) throw new HttpError(403, 'This is not available for your account type');
    return c.user;
  };
  const setSession = (c, user) => {
    const token = auth.sign({ uid: user.id, role: user.role, exp: now() + 30 * DAY }, secret);
    c.headers['Set-Cookie'] = `sr_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${30 * 86400}${c.secure ? '; Secure' : ''}`;
  };
  const inboxDoc = async (userId, who, ic, txt) => { const id = uid(); await store.put('messages', id, { id, uid: userId, who, ic, txt, at: now(), unread: 1 }); };
  const noteDoc = async (userId, txt) => { const id = uid(); await store.put('notifs', id, { id, uid: userId, txt, at: now(), unread: 1 }); };

  const reqView = (r) => ({
    id: r.id, code: r.code, kind: r.kind, svc: r.svc, type: r.type || null, title: r.title, loc: r.loc, vehicle: r.vehicle || null,
    note: r.note || '', pay: r.pay, status: r.status, createdAt: r.createdAt, acceptedAt: r.acceptedAt || null,
    arrivedAt: r.arrivedAt || null, completedAt: r.completedAt || null, km: r.km, etaMin: r.etaMin,
    tripMs: r.demo ? cfg.demoTripMs : r.etaMin * 60000, price: r.price || null, amount: r.amount || null,
    provider: r.provider || null, rated: !!r.rated, rating: r.rating || 0, demo: !!r.demo, now: now(),
  });
  const jobView = (r, mine) => ({
    id: r.id, code: r.code, kind: r.kind, svc: r.svc, title: r.title, urgent: r.kind === 'sos' || r.svc === 'engine',
    loc: r.loc, region: r.region || '', km: r.km, etaMin: r.etaMin, price: r.price || null, createdAt: r.createdAt,
    status: r.status, acceptedAt: r.acceptedAt || null, arrivedAt: r.arrivedAt || null, vehicle: r.vehicle || null,
    note: r.note || '', demo: !!(r.demoJob || r.demo), amount: r.amount || null,
    lat: mine && Number.isFinite(r.lat) ? r.lat : null, lng: mine && Number.isFinite(r.lng) ? r.lng : null,
    customer: {
      name: (r.customer && r.customer.name) || 'Customer', verified: true,
      rating: (r.customer && r.customer.rating) || null, reviews: (r.customer && r.customer.reviews) || 0,
      phone: mine && !r.demoJob && r.customer ? r.customer.phone : null,
    },
    now: now(),
  });
  const bookingView = (b) => ({ id: b.id, code: b.code, k: b.k, t: b.title, at: b.at, pl: b.place, st: b.status });
  const tripFromBooking = (b) => ({ id: b.id, code: b.code, k: b.k, t: b.title, pl: b.place, at: b.at, st: 'Completed', r: b.r || 0, cat: b.cat || (b.k === 'hire' || b.k === 'mob' ? 'mobility' : 'other') });
  const tripFromRequest = (r) => ({ id: r.id, code: r.code, k: r.kind === 'sos' ? 'sos' : r.svc, t: r.title, pl: r.loc, at: r.completedAt || r.createdAt, st: 'Completed', r: r.rating || 0, cat: 'rescue' });

  // ---------- demo auto-dispatch ----------
  // In demo mode a virtual rescuer accepts a request and "drives" to you. State is derived from
  // timestamps whenever the request is read, so it survives restarts and needs no timers.
  async function onStatus(r, to) {
    if (to === 'accepted') {
      await inboxDoc(r.uid, 'Safari Rescue Team', 'logo', `${r.provider.name} accepted your request ${r.code} and is on the way.`);
      await noteDoc(r.uid, `${r.provider.name} is heading to ${r.loc}.`);
    } else if (to === 'arrived') {
      await inboxDoc(r.uid, 'Safari Rescue Team', 'logo', `${r.provider.name} has arrived at your location.`);
    }
  }
  async function advance(r) {
    for (let i = 0; i < 2; i++) {
      const t = now();
      let to = null;
      if (r.demo && r.status === 'searching' && t - r.createdAt >= cfg.demoSearchMs) to = 'accepted';
      else if (r.demo && r.status === 'accepted' && t - r.acceptedAt >= cfg.demoTripMs) to = 'arrived';
      if (!to) break;
      const from = r.status;
      const saved = await store.update('requests', r.id, (cur) => {
        if (cur.status !== from) return null;
        if (to === 'accepted') return Object.assign(cur, { status: 'accepted', acceptedAt: cur.createdAt + cfg.demoSearchMs, providerId: 'demo', provider: DEMO_PROVIDER });
        return Object.assign(cur, { status: 'arrived', arrivedAt: cur.acceptedAt + cfg.demoTripMs });
      });
      if (saved) { r = saved; await onStatus(r, to); } else { r = (await store.get('requests', r.id)) || r; }
    }
    return r;
  }
  async function tickBookings(list, u) {
    if (!cfg.demo) return;
    for (const b of list) {
      if (b.status === 'Pending' && !b.noAuto && now() - b.createdAt > 15000) {
        const saved = await store.update('bookings', b.id, (cur) => (cur.status === 'Pending' ? Object.assign(cur, { status: 'Confirmed' }) : null));
        if (saved) { b.status = 'Confirmed'; await inboxDoc(u.id, 'Booking Updates', 'list', `Your ${b.title} (${b.code}) is confirmed.`); }
      }
    }
  }

  const ownRequest = async (id, u) => {
    const r = await store.get('requests', id);
    if (!r || r.uid !== u.id) throw new HttpError(404, 'Request not found');
    return advance(r);
  };
  const creditProvider = async (r) => {
    if (!r.providerId || r.providerId === 'demo' || !r.amount) return;
    const id = uid();
    await store.put('earnings', id, { id, uid: r.providerId, rid: r.id, title: r.title, amount: r.amount, at: now() });
  };
  const realProviderOnline = async () => (await store.all('users')).some((x) => x.role === 'provider' && !x.demo && x.provider && x.provider.online && x.provider.verified);

  // ---------- public ----------
  add('GET', '/api/health', async () => {
    await store.ping();
    return { ok: true, store: store.kind, demo: cfg.demo, version: cfg.version, uptime: Math.round(process.uptime()) };
  });
  add('GET', '/api/config', async () => ({
    demo: cfg.demo, version: cfg.version, cities: cat.CITIES, pay: cat.PAY, services: cat.SERVICES, sosTypes: cat.SOS_TYPES,
    cars: cat.CARS, driverFee: cat.DRIVER_FEE, mobility: cat.MOBILITY, partnerCats: cat.PARTNER_CATS,
    emergency: cfg.emergency, supportPhone: cfg.supportPhone,
  }));

  // ---------- auth ----------
  add('POST', '/api/auth/register', async (c) => {
    const b = c.body;
    const role = pickOf(b.role, ['customer', 'provider', 'partner'], 'customer');
    const name = str(b.name, 40);
    const phone = auth.normPhone(b.phone);
    const password = String(b.password || '');
    if (name.length < 2) throw new HttpError(400, 'Please enter your name');
    if (!phone) throw new HttpError(400, 'Enter a valid Uganda phone number, e.g. 0775 123 456');
    if (password.length < 6) throw new HttpError(400, 'Password must be at least 6 characters');
    if (password.length > 100) throw new HttpError(400, 'Password is too long');
    if (await store.get('phones', phone)) throw new HttpError(409, 'That phone number already has an account. Please log in.');
    const user = { id: uid(), role, name, phone, pwd: await auth.hash(password), created: now(), city: 'Kampala', pay: 'mtn', theme: 'system' };
    if (role === 'provider') {
      user.provider = { title: str(b.title, 40) || 'Roadside Technician', vehicle: str(b.vehicle, 40), plate: str(b.plate, 12).toUpperCase(), rating: 0, reviews: 0, online: false, verified: cfg.providerApproval === 'auto' };
    }
    if (role === 'partner') {
      user.partner = { business: str(b.business, 60) || name, tagline: str(b.tagline, 80), cat: pickOf(b.cat, Object.keys(cat.PARTNER_CATS), 'parts') };
      await store.put('portals', user.id, seed.emptyPortal(user.id));
    }
    await store.put('users', user.id, user);
    await store.put('phones', phone, { id: user.id });
    await inboxDoc(user.id, 'Safari Rescue Team', 'logo', 'Welcome to Safari Rescue! Help is always one tap away.');
    setSession(c, user);
    return { user: pub(user) };
  }, { limit: [12, 15 * 60e3] });

  add('POST', '/api/auth/login', async (c) => {
    const phone = auth.normPhone(c.body.phone);
    const pw = String(c.body.password || '');
    if (!phone || !pw) throw new HttpError(400, 'Enter your phone number and password');
    if (!limit('login:' + phone, 8, 15 * 60e3)) throw new HttpError(429, 'Too many attempts for this number. Try again in a few minutes.');
    const ref = await store.get('phones', phone);
    const u = ref ? await store.get('users', ref.id) : null;
    if (!u || !(await auth.verify(pw, u.pwd))) throw new HttpError(401, 'Wrong phone number or password');
    setSession(c, u);
    return { user: pub(u) };
  }, { limit: [40, 15 * 60e3] });

  add('POST', '/api/auth/demo', async (c) => {
    if (!cfg.demo) throw new HttpError(404, 'Demo mode is turned off');
    const role = pickOf(c.body.role, ['customer', 'provider', 'partner'], 'customer');
    const user = await seed.createDemoUser(store, role);
    setSession(c, user);
    return { user: pub(user) };
  }, { limit: [30, 60 * 60e3] });

  add('POST', '/api/auth/logout', async (c) => {
    c.headers['Set-Cookie'] = `sr_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${c.secure ? '; Secure' : ''}`;
    return { ok: true };
  });

  add('GET', '/api/me', async (c) => ({ user: pub(needUser(c)) }));
  add('PATCH', '/api/me', async (c) => {
    const u0 = needUser(c);
    const b = c.body;
    const patch = {};
    if (b.name !== undefined) { const n = str(b.name, 40); if (n.length < 2) throw new HttpError(400, 'Please enter your name'); patch.name = n; }
    if (b.city !== undefined) { if (!cat.CITIES.includes(b.city)) throw new HttpError(400, 'Unknown city'); patch.city = b.city; }
    if (b.pay !== undefined) { if (!cat.PAY.some((p) => p.id === b.pay)) throw new HttpError(400, 'Unknown payment method'); patch.pay = b.pay; }
    if (b.theme !== undefined) { if (!['system', 'light', 'dark'].includes(b.theme)) throw new HttpError(400, 'Unknown theme'); patch.theme = b.theme; }
    const u = await store.update('users', u0.id, (cur) => Object.assign(cur, patch));
    return { user: pub(u) };
  });

  // ---------- customer ----------
  add('GET', '/api/bootstrap', async (c) => {
    const u = needUser(c, 'customer');
    const [vehicles, contacts, bks, reqsRaw, msgs, notifs, partners] = await Promise.all([
      store.byUid('vehicles', u.id), store.byUid('contacts', u.id), store.byUid('bookings', u.id), store.byUid('requests', u.id),
      store.byUid('messages', u.id), store.byUid('notifs', u.id), store.all('partners'),
    ]);
    const reqs = [];
    for (const r of reqsRaw) reqs.push(await advance(r));
    await tickBookings(bks, u);
    const live = reqs.filter((r) => ACTIVE.includes(r.status) || (r.status === 'completed' && !r.rated && !r.dismissed)).sort(byNewest)[0];
    const trips = [...bks.filter((b) => b.status === 'Completed').map(tripFromBooking), ...reqs.filter((r) => r.status === 'completed').map(tripFromRequest)].sort(byNewest);
    return {
      user: pub(u),
      vehicles: vehicles.sort((a, b) => (a.id < b.id ? -1 : 1)),
      contacts,
      bookings: bks.filter((b) => UPCOMING.includes(b.status)).sort((a, b) => a.at - b.at).map(bookingView),
      trips,
      messages: msgs.sort(byNewest),
      notifs: notifs.sort(byNewest),
      active: live ? reqView(live) : null,
      partners,
      now: now(),
    };
  });

  const artFor = (type) => ({ Sedan: 'sedan', Van: 'van', SUV: 'suv', Pickup: 'suv', Truck: 'van', Motorcycle: 'sedan' }[type] || 'suv');
  add('POST', '/api/vehicles', async (c) => {
    const u = needUser(c, 'customer');
    const b = c.body;
    const make = str(b.make, 40);
    const plate = str(b.plate, 12).toUpperCase();
    if (make.length < 2) throw new HttpError(400, 'Enter the vehicle make and model');
    if (plate.length < 3) throw new HttpError(400, 'Enter the number plate');
    if ((await store.byUid('vehicles', u.id)).length >= 10) throw new HttpError(400, 'You can save up to 10 vehicles');
    const type = pickOf(b.type, ['SUV', 'Sedan', 'Van', 'Truck', 'Pickup', 'Motorcycle'], 'SUV');
    const insTo = Date.parse(b.insTo);
    const v = {
      id: uid(), uid: u.id, make, model: str(b.model, 20), plate, color: str(b.color, 20) || '—', type,
      fuel: pickOf(b.fuel, ['Diesel', 'Petrol', 'Hybrid', 'Electric'], 'Petrol'), year: str(b.year, 4), engine: str(b.engine, 10),
      ins: str(b.ins, 40), insTo: Number.isFinite(insTo) ? insTo : null, art: artFor(type),
    };
    await store.put('vehicles', v.id, v);
    return { vehicle: v };
  });
  add('DELETE', '/api/vehicles/:id', async (c) => {
    const u = needUser(c, 'customer');
    const v = await store.get('vehicles', c.params.id);
    if (!v || v.uid !== u.id) throw new HttpError(404, 'Vehicle not found');
    await store.del('vehicles', v.id);
    return { ok: true };
  });

  add('POST', '/api/contacts', async (c) => {
    const u = needUser(c, 'customer');
    const name = str(c.body.name, 40);
    const phone = auth.normPhone(c.body.phone);
    if (name.length < 2) throw new HttpError(400, 'Enter a name');
    if (!phone) throw new HttpError(400, 'Enter a valid Uganda phone number');
    if ((await store.byUid('contacts', u.id)).length >= 5) throw new HttpError(400, 'You can add up to 5 emergency contacts');
    const ct = { id: uid(), uid: u.id, name, phone };
    await store.put('contacts', ct.id, ct);
    return { contact: ct };
  });
  add('DELETE', '/api/contacts/:id', async (c) => {
    const u = needUser(c, 'customer');
    const ct = await store.get('contacts', c.params.id);
    if (!ct || ct.uid !== u.id) throw new HttpError(404, 'Contact not found');
    await store.del('contacts', ct.id);
    return { ok: true };
  });

  // requests: roadside help + SOS
  add('POST', '/api/requests', async (c) => {
    const u = needUser(c, 'customer');
    if (!limit('req:' + u.id, 10, 60e3)) throw new HttpError(429, 'Please wait a moment before trying again');
    const b = c.body;
    for (const r of await store.byUid('requests', u.id)) {
      if (ACTIVE.includes((await advance(r)).status)) throw new HttpError(409, 'You already have an active request. Cancel it or wait for it to finish.');
    }
    const kind = b.kind === 'sos' ? 'sos' : 'service';
    const svcId = kind === 'sos' ? 'sos' : String(b.svc || 'other');
    const S = cat.SERVICES[svcId];
    if (!S) throw new HttpError(400, 'Unknown service');
    const type = kind === 'sos' ? pickOf(b.type, Object.keys(cat.SOS_TYPES), 'general') : null;
    let vehicle = null;
    if (b.vehicleId) {
      const v = await store.get('vehicles', String(b.vehicleId));
      if (v && v.uid === u.id) vehicle = { make: v.make, model: v.model, plate: v.plate, color: v.color, type: v.type, fuel: v.fuel };
    }
    const km = r1(kind === 'sos' ? 6 + Math.random() * 6 : 2 + Math.random() * 10);
    const r = {
      id: uid(), code: 'SR-' + rint(1000, 9999), uid: u.id, kind, svc: svcId, type,
      title: kind === 'sos' ? cat.SOS_TYPES[type] : S.t,
      loc: str(b.loc, 120) || `${u.city}, Uganda`, lat: coord(b.lat, 90), lng: coord(b.lng, 180), vehicle,
      note: str(b.note, 240), pay: pickOf(b.pay, cat.PAY.map((p) => p.id), u.pay || 'mtn'), status: 'searching', createdAt: now(),
      km, etaMin: Math.max(6, Math.round(km * 1.9)), price: S.p, customer: { name: u.name, phone: u.phone || null }, declinedBy: [],
      demo: cfg.demo && !(await realProviderOnline()),
    };
    await store.put('requests', r.id, r);
    await inboxDoc(u.id, 'Safari Rescue Team', 'logo', kind === 'sos' ? `SOS ${r.code} received. We are alerting the nearest rescue team.` : `Request ${r.code} (${r.title}) received. Finding the nearest rescuer.`);
    const contacts = kind === 'sos' ? (await store.byUid('contacts', u.id)).map((x) => ({ name: x.name, phone: x.phone })) : [];
    notify.emit(kind === 'sos' ? 'sos.created' : 'request.created', { code: r.code, kind, title: r.title, location: r.loc, lat: r.lat, lng: r.lng, customer: { name: u.name, phone: u.phone || null }, vehicle, note: r.note, contacts });
    return { request: reqView(r) };
  });

  add('GET', '/api/requests/active', async (c) => {
    const u = needUser(c, 'customer');
    let best = null;
    for (let r of await store.byUid('requests', u.id)) {
      r = await advance(r);
      const live = ACTIVE.includes(r.status) || (r.status === 'completed' && !r.rated && !r.dismissed);
      if (live && (!best || r.createdAt > best.createdAt)) best = r;
    }
    return { request: best ? reqView(best) : null, now: now() };
  });

  add('POST', '/api/requests/:id/cancel', async (c) => {
    const u = needUser(c, 'customer');
    const r = await ownRequest(c.params.id, u);
    const upd = await store.update('requests', r.id, (cur) => (['searching', 'accepted'].includes(cur.status) ? Object.assign(cur, { status: 'cancelled', cancelledAt: now() }) : null));
    if (!upd) throw new HttpError(409, "This request can't be cancelled any more");
    notify.emit('request.cancelled', { code: upd.code, customer: { name: u.name } });
    return { request: reqView(upd) };
  });

  add('POST', '/api/requests/:id/complete', async (c) => {
    const u = needUser(c, 'customer');
    const r = await ownRequest(c.params.id, u);
    const upd = await store.update('requests', r.id, (cur) => (cur.status === 'arrived' ? Object.assign(cur, { status: 'completed', completedAt: now(), amount: cur.amount || mid(cur.price) }) : null));
    if (!upd) throw new HttpError(409, 'The job can be completed once your rescuer has arrived');
    await creditProvider(upd);
    notify.emit('request.completed', { code: upd.code, amount: upd.amount });
    return { request: reqView(upd) };
  });

  add('POST', '/api/requests/:id/rate', async (c) => {
    const u = needUser(c, 'customer');
    const r = await ownRequest(c.params.id, u);
    const rating = intIn(c.body.rating, 0, 5, 0);
    const upd = await store.update('requests', r.id, (cur) => {
      if (cur.status !== 'completed') return null;
      return Object.assign(cur, rating ? { rated: true, rating, review: str(c.body.review, 300) } : { dismissed: true });
    });
    if (!upd) throw new HttpError(409, 'You can rate a request once it is completed');
    if (rating && upd.providerId && upd.providerId !== 'demo') {
      await store.update('users', upd.providerId, (p) => {
        const pr = p.provider || {};
        const n = pr.reviews || 0;
        pr.rating = r1(((pr.rating || 0) * n + rating) / (n + 1));
        pr.reviews = n + 1;
        p.provider = pr;
        return p;
      });
    }
    return { request: reqView(upd) };
  });

  // chat between customer and assigned rescuer
  const chatAccess = async (c) => {
    const u = needUser(c);
    const r = await store.get('requests', c.params.id);
    if (!r || (r.uid !== u.id && r.providerId !== u.id)) throw new HttpError(404, 'Not found');
    return { u, r };
  };
  const chatList = async (ownerId, rid, me) => (await store.byUid('chats', ownerId))
    .filter((m) => m.rid === rid && m.at <= now()).sort((a, b) => a.at - b.at)
    .map((m) => ({ id: m.id, me: m.from === me, t: m.t, at: m.at }));
  add('GET', '/api/requests/:id/chat', async (c) => {
    const { u, r } = await chatAccess(c);
    return { messages: await chatList(r.uid, r.id, u.id) };
  });
  add('POST', '/api/requests/:id/chat', async (c) => {
    const { u, r } = await chatAccess(c);
    const t = str(c.body.t, 300);
    if (!t) throw new HttpError(400, 'Type a message');
    if (!limit('chat:' + u.id, 30, 60e3)) throw new HttpError(429, 'Slow down a little');
    if (!['accepted', 'arrived'].includes(r.status)) throw new HttpError(409, 'Chat opens once a rescuer accepts your request');
    const id = uid();
    await store.put('chats', id, { id, uid: r.uid, rid: r.id, from: u.id, t, at: now() });
    if (r.demo && u.id === r.uid) {
      const rid2 = uid();
      await store.put('chats', rid2, { id: rid2, uid: r.uid, rid: r.id, from: 'demo', t: REPLIES[rint(0, REPLIES.length - 1)], at: now() + 1500 });
    }
    return { messages: await chatList(r.uid, r.id, u.id) };
  });

  // support chat (any signed-in user)
  add('GET', '/api/support', async (c) => {
    const u = needUser(c);
    return { messages: await chatList(u.id, 'support', u.id) };
  });
  add('POST', '/api/support', async (c) => {
    const u = needUser(c);
    const t = str(c.body.t, 300);
    if (!t) throw new HttpError(400, 'Type a message');
    if (!limit('support:' + u.id, 20, 60e3)) throw new HttpError(429, 'Slow down a little');
    const id = uid();
    await store.put('chats', id, { id, uid: u.id, rid: 'support', from: u.id, t, at: now() });
    const rid2 = uid();
    await store.put('chats', rid2, { id: rid2, uid: u.id, rid: 'support', from: 'support', t: `Thanks for contacting Safari Rescue! An agent will reply here shortly. In an emergency call ${cfg.emergency.join(' or ')}.`, at: now() + 1200 });
    notify.emit('support.message', { code: '', from: { name: u.name, phone: u.phone || null }, text: t });
    return { messages: await chatList(u.id, 'support', u.id) };
  });

  // bookings: car hire + rescue mobility
  add('POST', '/api/bookings', async (c) => {
    const u = needUser(c, 'customer');
    const b = c.body;
    if (!limit('book:' + u.id, 20, 60e3)) throw new HttpError(429, 'Please wait a moment before trying again');
    const doc = { id: uid(), uid: u.id, status: 'Pending', createdAt: now() };
    let price = 0;
    if (b.k === 'hire') {
      const car = cat.CARS.find((x) => x.id === b.car);
      if (!car) throw new HttpError(400, 'Choose a vehicle');
      const days = intIn(b.days, 1, 30, 1);
      const driver = !!b.driver;
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(b.date || ''));
      if (!m) throw new HttpError(400, 'Choose a pick-up date');
      const at = Date.UTC(+m[1], +m[2] - 1, +m[3], 8, 0) - 3 * 3600e3;
      if (!Number.isFinite(at) || at < seed.atDay(0, 0, 0) || at > now() + 366 * DAY) throw new HttpError(400, 'Choose a pick-up date within the next year');
      price = (car.p + (driver ? cat.DRIVER_FEE : 0)) * days;
      Object.assign(doc, { k: 'hire', code: 'CH-' + rint(10, 99), title: 'Car Hire', at, place: str(b.place, 80) || 'Kampala', meta: { car: car.n, days, driver }, price });
    } else if (b.k === 'mob') {
      const all = [...cat.MOBILITY.j, ...cat.MOBILITY.s, ...cat.MOBILITY.v];
      const item = all.find((x) => x.id === b.item);
      if (!item) throw new HttpError(400, 'Unknown option');
      Object.assign(doc, { k: 'mob', code: 'MB-' + rint(10, 99), title: item.t, at: now(), place: `${u.city}, Uganda`, meta: { item: item.id }, price: item.p });
    } else throw new HttpError(400, 'Unknown booking type');
    await store.put('bookings', doc.id, doc);
    await inboxDoc(u.id, 'Booking Updates', 'list', `We received your ${doc.title} request (${doc.code}). We'll confirm it shortly.`);
    notify.emit('booking.created', { code: doc.code, title: doc.title, at: new Date(doc.at).toISOString(), place: doc.place, price: doc.price, customer: { name: u.name, phone: u.phone || null } });
    return { booking: bookingView(doc), price };
  });
  add('POST', '/api/bookings/:id/cancel', async (c) => {
    const u = needUser(c, 'customer');
    const b = await store.get('bookings', c.params.id);
    if (!b || b.uid !== u.id) throw new HttpError(404, 'Booking not found');
    const upd = await store.update('bookings', b.id, (cur) => (UPCOMING.includes(cur.status) ? Object.assign(cur, { status: 'Cancelled' }) : null));
    if (!upd) throw new HttpError(409, "This booking can't be cancelled");
    return { ok: true };
  });

  // inbox
  add('POST', '/api/messages/:id/read', async (c) => {
    const u = needUser(c);
    const m = await store.get('messages', c.params.id);
    if (!m || m.uid !== u.id) throw new HttpError(404, 'Not found');
    if (m.unread) await store.put('messages', m.id, Object.assign(m, { unread: 0 }));
    return { ok: true };
  });
  add('POST', '/api/notifs/read', async (c) => {
    const u = needUser(c);
    for (const n of await store.byUid('notifs', u.id)) if (n.unread) await store.put('notifs', n.id, Object.assign(n, { unread: 0 }));
    return { ok: true };
  });

  add('GET', '/api/partners', async (c) => { needUser(c); return { partners: await store.all('partners') }; });

  // ---------- provider (rescuer) ----------
  async function providerState(u) {
    const all = await store.all('requests');
    const mineJobs = all.filter((r) => r.providerId === u.id && ['accepted', 'arrived'].includes(r.status)).sort((a, b) => b.acceptedAt - a.acceptedAt);
    const pending = !u.provider.verified;
    const open = pending ? [] : all.filter((r) => r.status === 'searching' && !(r.declinedBy || []).includes(u.id) && (u.demo ? r.visibleTo === u.id : (!r.visibleTo && !r.demo))).sort(byNewest);
    const earn = (await store.byUid('earnings', u.id)).sort((a, b) => b.at - a.at);
    const dayStart = Math.floor((now() + 3 * 3600e3) / DAY) * DAY - 3 * 3600e3;
    const sum = (list) => list.reduce((a, e) => a + e.amount, 0);
    return {
      user: pub(u),
      pending,
      current: mineJobs[0] ? jobView(mineJobs[0], true) : null,
      jobs: open.map((r) => jobView(r, false)),
      earnings: earn.slice(0, 40),
      stats: {
        today: sum(earn.filter((e) => e.at >= dayStart)), week: sum(earn.filter((e) => e.at >= dayStart - 6 * DAY)), total: sum(earn),
        done: all.filter((r) => r.providerId === u.id && r.status === 'completed').length + earn.filter((e) => e.rid === 'demo').length,
        rating: u.provider.rating || 0, reviews: u.provider.reviews || 0,
      },
      now: now(),
    };
  }
  add('GET', '/api/provider/bootstrap', async (c) => providerState(needUser(c, 'provider')));
  add('POST', '/api/provider/online', async (c) => {
    const u = needUser(c, 'provider');
    if (c.body.online && !u.provider.verified) throw new HttpError(403, 'Your rescuer account is waiting for approval. We will let you know as soon as it is approved.');
    await store.update('users', u.id, (cur) => { cur.provider.online = !!c.body.online; return cur; });
    return providerState(await store.get('users', u.id));
  });
  add('POST', '/api/provider/jobs/:id/accept', async (c) => {
    const u = needUser(c, 'provider');
    if (!u.provider.verified) throw new HttpError(403, 'Your rescuer account is waiting for approval');
    if (!u.provider.online) throw new HttpError(409, 'Go online first to accept jobs');
    if ((await store.all('requests')).some((r) => r.providerId === u.id && ['accepted', 'arrived'].includes(r.status))) throw new HttpError(409, 'Finish your current job first');
    const snap = { id: u.id, name: u.name, title: u.provider.title, rating: u.provider.rating || 0, reviews: u.provider.reviews || 0, vehicle: u.provider.vehicle, plate: u.provider.plate, phone: u.demo ? null : u.phone };
    const r = await store.update('requests', c.params.id, (cur) => {
      const visible = u.demo ? cur.visibleTo === u.id : (!cur.visibleTo && !cur.demo);
      if (cur.status !== 'searching' || !visible || (cur.declinedBy || []).includes(u.id)) return null;
      return Object.assign(cur, { status: 'accepted', providerId: u.id, provider: snap, acceptedAt: now() });
    });
    if (!r) throw new HttpError(409, 'Sorry, this job was just taken or cancelled');
    if (!r.demoJob) {
      await inboxDoc(r.uid, 'Safari Rescue Team', 'logo', `${u.name} accepted your request ${r.code} and is on the way.`);
      notify.emit('request.accepted', { code: r.code, provider: { name: u.name, phone: u.phone || null } });
    }
    return providerState(u);
  });
  add('POST', '/api/provider/jobs/:id/decline', async (c) => {
    const u = needUser(c, 'provider');
    await store.update('requests', c.params.id, (cur) => (cur.status === 'searching' ? Object.assign(cur, { declinedBy: [...(cur.declinedBy || []), u.id] }) : null));
    return providerState(u);
  });
  add('POST', '/api/provider/jobs/:id/arrive', async (c) => {
    const u = needUser(c, 'provider');
    const r = await store.update('requests', c.params.id, (cur) => (cur.providerId === u.id && cur.status === 'accepted' ? Object.assign(cur, { status: 'arrived', arrivedAt: now() }) : null));
    if (!r) throw new HttpError(409, 'This job is not in progress');
    if (!r.demoJob) await inboxDoc(r.uid, 'Safari Rescue Team', 'logo', `${u.name} has arrived at your location.`);
    return providerState(u);
  });
  add('POST', '/api/provider/jobs/:id/complete', async (c) => {
    const u = needUser(c, 'provider');
    const r0 = await store.get('requests', c.params.id);
    if (!r0 || r0.providerId !== u.id) throw new HttpError(404, 'Job not found');
    const amount = intIn(c.body.amount, 0, 5000000, mid(r0.price));
    const r = await store.update('requests', r0.id, (cur) => (cur.status === 'arrived' ? Object.assign(cur, { status: 'completed', completedAt: now(), amount }) : null));
    if (!r) throw new HttpError(409, 'Mark the job as arrived before completing it');
    await creditProvider(r);
    if (!r.demoJob) {
      await inboxDoc(r.uid, 'Booking Updates', 'list', `Job ${r.code} is complete. Please rate your rescuer.`);
      notify.emit('request.completed', { code: r.code, amount });
    }
    return providerState(u);
  });

  // ---------- partner portal ----------
  const portalView = (p) => {
    const inv = { total: p.inventory.length, in: 0, low: 0, out: 0, off: 0 };
    for (const i of p.inventory) { if (i.off) inv.off++; else if (i.qty === 0) inv.out++; else if (i.qty <= i.min) inv.low++; else inv.in++; }
    return {
      stats: Object.assign({}, p.stats, { newRequests: p.requests.filter((r) => r.status === 'new').length }),
      series: p.series, requests: p.requests.slice().sort((a, b) => b.at - a.at), top: p.top, reviews: p.reviews, messages: p.messages,
      inventory: p.inventory.slice(0, 300), inv,
    };
  };
  const portalOf = async (u) => (await store.get('portals', u.id)) || seed.emptyPortal(u.id);
  add('GET', '/api/portal', async (c) => { const u = needUser(c, 'partner'); return { user: pub(u), portal: portalView(await portalOf(u)), now: now() }; });
  add('POST', '/api/portal/requests/:id', async (c) => {
    const u = needUser(c, 'partner');
    const act = c.body.action;
    if (!['quote', 'decline'].includes(act)) throw new HttpError(400, 'Unknown action');
    await portalOf(u);
    const p = await store.update('portals', u.id, (cur) => {
      const r = cur.requests.find((x) => x.id === c.params.id);
      if (!r || r.status !== 'new') return null;
      r.status = act === 'quote' ? 'quoted' : 'declined';
      if (act === 'quote') r.amount = intIn(c.body.amount, 0, 100000000, 0);
      return cur;
    });
    if (!p) throw new HttpError(409, 'Request not found or already handled');
    return { portal: portalView(p) };
  });
  add('POST', '/api/portal/inventory', async (c) => {
    const u = needUser(c, 'partner');
    const name = str(c.body.name, 80);
    if (name.length < 2) throw new HttpError(400, 'Enter an item name');
    const item = { id: uid(), name, qty: intIn(c.body.qty, 0, 100000, 0), price: intIn(c.body.price, 0, 1e9, 0), min: 5, off: false };
    if (!(await store.get('portals', u.id))) await store.put('portals', u.id, seed.emptyPortal(u.id));
    const p = await store.update('portals', u.id, (cur) => (cur.inventory.length >= 500 ? null : (cur.inventory.unshift(item), cur)));
    if (!p) throw new HttpError(400, 'Inventory is full (500 items)');
    return { portal: portalView(p) };
  });
  add('PATCH', '/api/portal/inventory/:id', async (c) => {
    const u = needUser(c, 'partner');
    await portalOf(u);
    const p = await store.update('portals', u.id, (cur) => {
      const i = cur.inventory.find((x) => x.id === c.params.id);
      if (!i) return null;
      if (c.body.qty !== undefined) i.qty = intIn(c.body.qty, 0, 100000, i.qty);
      if (c.body.price !== undefined) i.price = intIn(c.body.price, 0, 1e9, i.price);
      if (c.body.off !== undefined) i.off = !!c.body.off;
      return cur;
    });
    if (!p) throw new HttpError(404, 'Item not found');
    return { portal: portalView(p) };
  });
  add('DELETE', '/api/portal/inventory/:id', async (c) => {
    const u = needUser(c, 'partner');
    await portalOf(u);
    const p = await store.update('portals', u.id, (cur) => { cur.inventory = cur.inventory.filter((x) => x.id !== c.params.id); return cur; });
    if (!p) throw new HttpError(404, 'Not found');
    return { portal: portalView(p) };
  });

  // ---------- admin (token protected; used by /admin) ----------
  const adminOnly = (c) => {
    if (!cfg.adminToken) throw new HttpError(404, 'Not found');
    const h = String(c.req.headers.authorization || '');
    const tok = h.startsWith('Bearer ') ? h.slice(7) : '';
    const a = Buffer.from(tok); const b = Buffer.from(cfg.adminToken);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      if (!limit('adminfail:' + c.ip, 15, 15 * 60e3)) throw new HttpError(429, 'Too many attempts. Try again later.');
      throw new HttpError(401, 'Wrong admin token');
    }
  };
  add('GET', '/api/admin/overview', async (c) => {
    adminOnly(c);
    const users = (await store.all('users')).filter((u) => !u.demo);
    const reqs = await store.all('requests');
    const providers = users.filter((u) => u.role === 'provider').sort((a, b) => b.created - a.created).map((u) => ({
      id: u.id, name: u.name, phone: u.phone, title: u.provider.title, vehicle: u.provider.vehicle, plate: u.provider.plate,
      verified: !!u.provider.verified, online: !!u.provider.online, rating: u.provider.rating, reviews: u.provider.reviews, created: u.created,
    }));
    const active = reqs.filter((r) => ACTIVE.includes(r.status) && !r.demoJob && !r.demo).sort(byNewest).map((r) => ({
      id: r.id, code: r.code, kind: r.kind, title: r.title, status: r.status, loc: r.loc, lat: r.lat, lng: r.lng, note: r.note,
      createdAt: r.createdAt, customer: r.customer, vehicle: r.vehicle, provider: r.provider ? { name: r.provider.name, phone: r.provider.phone } : null,
    }));
    return {
      providers, active, now: now(),
      counts: { customers: users.filter((u) => u.role === 'customer').length, providers: providers.length, partners: users.filter((u) => u.role === 'partner').length, requests: reqs.filter((r) => !r.demoJob && !r.demo).length },
    };
  });
  add('POST', '/api/admin/providers/:id/verify', async (c) => {
    adminOnly(c);
    const verified = !!c.body.verified;
    const u = await store.update('users', c.params.id, (cur) => {
      if (cur.role !== 'provider') return null;
      cur.provider.verified = verified;
      if (!verified) cur.provider.online = false;
      return cur;
    });
    if (!u) throw new HttpError(404, 'Rescuer not found');
    if (verified) await inboxDoc(u.id, 'Safari Rescue Team', 'shield', 'Your rescuer account is approved. Go online to start receiving jobs.');
    return { ok: true };
  });
  add('POST', '/api/admin/requests/:id/cancel', async (c) => {
    adminOnly(c);
    const r = await store.update('requests', c.params.id, (cur) => (ACTIVE.includes(cur.status) ? Object.assign(cur, { status: 'cancelled', cancelledAt: now() }) : null));
    if (!r) throw new HttpError(409, 'Request not found or already finished');
    await inboxDoc(r.uid, 'Safari Rescue Team', 'logo', `Request ${r.code} was closed by our team. If you still need help, please send a new request or call ${cfg.emergency.join(' / ')}.`);
    return { ok: true };
  });

  return R;
};
